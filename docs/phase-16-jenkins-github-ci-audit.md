# Phase 16 — Jenkins + GitHub Branch Protection CI Audit

**Fecha:** 15 de junio de 2026  
**Proyecto:** Shift Control  
**Tipo:** Auditoría / Diagnóstico  
**Alcance:** Evaluación del estado actual de Jenkins local y preparación para automatización con GitHub Branch Protection  

---

## Resumen Ejecutivo

### Estado Actual

El proyecto Shift Control tiene un **pipeline Jenkins local básico funcional** que ejecuta tests del backend Java 21 + Spring Boot. El pipeline corre manualmente o mediante **Poll SCM** (cada 2 minutos), pero **no está integrado con GitHub de forma bidireccional**.

**Capacidades actuales:**
- ✅ Jenkins corre en Docker local (`http://localhost:8085`)
- ✅ Pipeline declarativo ejecuta `./mvnw test` correctamente
- ✅ Publica resultados XML de tests (Surefire)
- ✅ Soporta Testcontainers con `TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal`
- ✅ Poll SCM configurado (`H/2 * * * *` — cada ~2 minutos)

**Limitaciones críticas:**
- ❌ **NO ejecuta tests de mobile** (TypeScript, Jest, lint)
- ❌ **NO publica status checks a GitHub**
- ❌ **NO puede usarse como gate de branch protection** (Jenkins local no es público)
- ❌ **NO soporta PRs** (no es Multibranch Pipeline)
- ❌ **NO tiene webhooks configurados** (depende de Poll SCM)
- ❌ **NO reporta éxito/fallo a GitHub**
- ❌ Mobile lint actualmente **falla** debido a issue pre-existente

### Conclusión Principal

**Jenkins local no puede ser el gate de branch protection de GitHub** porque:
1. No es accesible públicamente desde GitHub
2. No publica commit status/checks a GitHub
3. No está configurado como Multibranch Pipeline para PRs

**Recomendación arquitectónica:**  
Migrar a **GitHub Actions** para CI/CD automatizado con branch protection, o exponer Jenkins localmente con ngrok/cloudflared + configurar webhooks + GitHub Checks plugin (solución frágil y no recomendada para producción).

---

## 1. Estado Actual de Jenkins

### 1.1 Jenkinsfile

| Propiedad | Estado |
|---|---|
| **Ubicación** | `Jenkinsfile` (raíz del monorepo) |
| **Tipo** | Pipeline declarativo |
| **Stages actuales** | 3: `Checkout`, `Verify environment`, `Backend tests` |
| **Comandos ejecutados** | `java -version`, `docker version`, `pwd`, `ls -la`, `cd backend && ./mvnw test` |
| **Tests backend** | ✅ Ejecuta `./mvnw test` con Testcontainers |
| **Tests mobile** | ❌ No ejecuta typecheck, tests, ni lint |
| **Artifacts** | ❌ No archiva JAR ni builds de Expo |
| **Test results** | ✅ Publica XML de Surefire (`backend/target/surefire-reports/*.xml`) |
| **GitHub status** | ❌ No publica commit status/checks |
| **Docker requerido** | ✅ Sí (Testcontainers) |
| **Credenciales** | ❌ No requiere (aún) — no hay interacción con GitHub API |

**Código actual del Jenkinsfile:**

```groovy
pipeline {
    agent any

    options {
        timestamps()
    }

    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out repository...'
            }
        }

        stage('Verify environment') {
            steps {
                sh '''
                    echo "Java version:"
                    java -version

                    echo "Docker version:"
                    docker version

                    echo "Current directory:"
                    pwd

                    echo "Repository files:"
                    ls -la
                '''
            }
        }

        stage('Backend tests') {
            steps {
                dir('backend') {
                    sh '''
                        chmod +x mvnw
                        ./mvnw test
                    '''
                }
            }
        }
    }

    post {
        always {
            junit allowEmptyResults: true, testResults: 'backend/target/surefire-reports/*.xml'
        }

        success {
            echo 'Backend CI passed successfully.'
        }

        failure {
            echo 'Backend CI failed.'
        }
    }
}
```

**Análisis:**
- ✅ Estructura limpia y declarativa
- ✅ Tests backend funcionan correctamente (205+ tests según docs)
- ❌ **Gap crítico:** No valida mobile (50% del monorepo ignorado)
- ❌ **Gap crítico:** No reporta status a GitHub

---

### 1.2 Infraestructura Jenkins Local

**Archivo:** `jenkins-local/docker-compose.yml`

```yaml
services:
  jenkins:
    build: .
    container_name: shift-control-jenkins
    user: root
    ports:
      - "8085:8080"
      - "50000:50000"
    volumes:
      - jenkins_home:/var/jenkins_home
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - JAVA_OPTS=-Djenkins.install.runSetupWizard=true
      - TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal
    restart: unless-stopped

volumes:
  jenkins_home:
```

**Archivo:** `jenkins-local/Dockerfile`

```dockerfile
FROM jenkins/jenkins:lts-jdk21

USER root

RUN apt-get update \
    && apt-get install -y ca-certificates curl gnupg lsb-release \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc \
    && chmod a+r /etc/apt/keyrings/docker.asc \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian bookworm stable" > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y docker-ce-cli \
    && rm -rf /var/lib/apt/lists/*

USER jenkins
```

| Aspecto | Estado |
|---|---|
| **URL Jenkins** | `http://localhost:8085` (solo accesible localmente) |
| **Accesible desde GitHub** | ❌ No — solo local (localhost) |
| **Plugins documentados** | ❌ No hay lista explícita |
| **Credenciales documentadas** | ❌ No |
| **Volumen persistente** | ✅ `jenkins_home` (configuración y builds se preservan) |
| **Seed job / Job DSL** | ❌ No hay automatización de job creation |
| **Docker socket montado** | ✅ Permite usar Docker (Testcontainers) |
| **Configuración Testcontainers** | ✅ `TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal` correctamente configurado |

**Documentación existente:**  
`docs/jenkins-local-ci.md` — Explica configuración de Poll SCM, TESTCONTAINERS_HOST_OVERRIDE, y comandos de inicio/parada.

---

## 2. Automatización con GitHub

### 2.1 Estado Actual

| Aspecto | Estado |
|---|---|
| **Tipo de pipeline** | Pipeline normal (no Multibranch) |
| **Triggers en Jenkinsfile** | ❌ No hay bloque `triggers` explícito |
| **Poll SCM configurado** | ✅ Sí — manual, en la UI de Jenkins (`H/2 * * * *`) |
| **Soporta PRs** | ❌ No — solo builds de branch configurado manualmente |
| **Soporta push builds** | ✅ Sí — Poll SCM detecta commits nuevos cada ~2 min |
| **Reporta status a GitHub** | ❌ No |

### 2.2 Plugins Necesarios

Para habilitar integración GitHub → Jenkins bidireccional:

| Plugin | Propósito | Estado |
|---|---|---|
| **GitHub plugin** | Autenticación con GitHub, webhooks | ❌ No confirmado instalado |
| **GitHub Branch Source** | Multibranch Pipeline con auto-discovery de PRs | ❌ No confirmado instalado |
| **GitHub Checks** | Reportar status checks (moderno, recomendado) | ❌ No instalado |
| **GitHub Status Notifier** (alternativa) | Reportar commit status (legacy) | ❌ No instalado |

**Sin estos plugins, Jenkins NO puede:**
- Recibir webhooks de GitHub
- Detectar PRs automáticamente
- Publicar status checks requeridos por branch protection

### 2.3 Webhook

| Aspecto | Estado |
|---|---|
| **Webhook URL** | ❌ No documentado / no existe |
| **Webhook secret** | ❌ No documentado |
| **Jenkins accesible públicamente** | ❌ No — solo `localhost:8085` |

**Problema fundamental:**  
GitHub no puede enviar webhooks a `localhost`. Soluciones posibles:
1. **Túnel público (ngrok/cloudflared)** — frágil, no recomendado para producción
2. **Migrar a GitHub Actions** — solución nativa y recomendada
3. **Hosted Jenkins en cloud** — requiere infraestructura adicional

---

## 3. Branch Protection Readiness

### 3.1 Required Status Check

**Problema crítico:** Jenkins local NO puede publicar status checks a GitHub.

| Requisito | Estado |
|---|---|
| **Check name estable** | ❌ No existe — Jenkins no publica checks |
| **Check name único** | ❌ N/A |
| **Seleccionable en GitHub** | ❌ No — GitHub no recibe ningún check |

**Para habilitar esto, se requiere:**
1. Plugin GitHub Checks instalado y configurado
2. GitHub App o Personal Access Token con permisos `checks:write`
3. Jenkinsfile modificado para publicar status al inicio y al final del pipeline

### 3.2 Branch Protection Recomendada

**Branch a proteger:** `main`

**Reglas recomendadas:**
- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass before merging
  - Required check: `jenkins-ci` (o nombre que definamos)
- ✅ Require branches to be up to date before merging
- ✅ Do not allow bypassing the above settings
- ✅ Require linear history (opcional pero recomendado)
- ❌ Block direct pushes to `main` (solo merges desde PRs)

**Estado actual:** ❌ No se puede implementar porque Jenkins no reporta checks a GitHub.

---

## 4. Pipeline CI Objetivo Recomendado

### 4.1 Stages Propuestos

```groovy
pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Backend Tests') {
            steps {
                dir('backend') {
                    sh 'chmod +x mvnw'
                    sh './mvnw clean test'
                }
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'backend/target/surefire-reports/*.xml'
                }
            }
        }

        stage('Mobile Install') {
            steps {
                dir('shift-control-mobile') {
                    sh 'pnpm install --frozen-lockfile'
                }
            }
        }

        stage('Mobile Typecheck') {
            steps {
                dir('shift-control-mobile') {
                    sh 'pnpm exec tsc --noEmit'
                }
            }
        }

        stage('Mobile Tests') {
            steps {
                dir('shift-control-mobile') {
                    sh 'pnpm test -- --ci --coverage'
                }
            }
            post {
                always {
                    // Publicar resultados de Jest si están en formato JUnit XML
                    junit allowEmptyResults: true, testResults: 'shift-control-mobile/junit.xml'
                }
            }
        }

        stage('Mobile Lint') {
            steps {
                dir('shift-control-mobile') {
                    sh 'pnpm lint'
                }
            }
        }

        // Opcional: solo en branch main o tags
        stage('Backend Docker Build') {
            when {
                anyOf {
                    branch 'main'
                    tag pattern: 'v\\d+\\.\\d+\\.\\d+', comparator: 'REGEXP'
                }
            }
            steps {
                dir('backend') {
                    sh 'docker build -t shift-control-backend:${GIT_COMMIT} .'
                }
            }
        }

        // Opcional: NO en cada PR (consume créditos EAS)
        stage('EAS Build (manual trigger)') {
            when {
                expression { return false } // Deshabilitado por defecto
            }
            steps {
                dir('shift-control-mobile') {
                    sh 'pnpm exec eas build --platform android --profile preview --non-interactive'
                }
            }
        }
    }

    post {
        always {
            // Publicar GitHub status check al final
            script {
                def status = currentBuild.result ?: 'SUCCESS'
                // Requiere GitHub Checks plugin
                // publishChecks(name: 'jenkins-ci', status: status)
            }
        }

        success {
            echo '✅ CI passed — all checks green'
        }

        failure {
            echo '❌ CI failed — check logs'
        }
    }
}
```

### 4.2 Prerrequisitos Adicionales

**Para ejecutar mobile stages, Jenkins necesita:**

| Herramienta | Instalación en Dockerfile |
|---|---|
| **Node.js 20+** | `RUN curl -fsSL https://deb.nodesource.com/setup_20.x \| bash - && apt-get install -y nodejs` |
| **pnpm** | `RUN npm install -g pnpm` |

**Dockerfile actualizado sugerido:**

```dockerfile
FROM jenkins/jenkins:lts-jdk21

USER root

# Docker CLI
RUN apt-get update \
    && apt-get install -y ca-certificates curl gnupg lsb-release \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc \
    && chmod a+r /etc/apt/keyrings/docker.asc \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian bookworm stable" > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y docker-ce-cli \
    && rm -rf /var/lib/apt/lists/*

# Node.js 20 + pnpm
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g pnpm \
    && rm -rf /var/lib/apt/lists/*

USER jenkins
```

---

## 5. Blockers Actuales

### 5.1 Blockers Críticos

| # | Blocker | Impacto | Solución |
|---|---|---|---|
| **B1** | Jenkins solo accesible en `localhost:8085` | GitHub no puede enviar webhooks ni recibir status checks | Exponer Jenkins públicamente (ngrok) o migrar a GitHub Actions |
| **B2** | No hay plugins de GitHub instalados | No se pueden recibir webhooks, detectar PRs, ni publicar checks | Instalar GitHub plugin + GitHub Branch Source + GitHub Checks |
| **B3** | No es Multibranch Pipeline | No auto-detecta PRs | Convertir a Multibranch Pipeline o migrar a GitHub Actions |
| **B4** | No publica GitHub status/checks | Branch protection no puede requerirlo | Configurar GitHub Checks plugin con GitHub App/PAT |
| **B5** | Pipeline solo corre backend tests | 50% del monorepo (mobile) no validado | Añadir stages de mobile (install, typecheck, test, lint) |

### 5.2 Blockers Menores

| # | Blocker | Impacto | Solución |
|---|---|---|---|
| **B6** | Mobile lint falla (issue pre-existente) | Build fallará hasta que se arregle | Investigar y corregir errores de lint |
| **B7** | No hay Node.js/pnpm en imagen Jenkins | No puede ejecutar mobile stages | Actualizar Dockerfile |
| **B8** | No hay credenciales GitHub configuradas | No puede autenticarse con GitHub API | Crear GitHub App o PAT con permisos `repo`, `checks:write` |
| **B9** | No hay webhook secret configurado | Webhooks no seguros (si se habilitan) | Generar secret y configurar en GitHub + Jenkins |
| **B10** | Poll SCM cada 2 min (ineficiente) | Delay hasta 2 min en detección de pushes | Migrar a webhooks o GitHub Actions |

---

## 6. Comandos Detectados

### 6.1 Backend

| Comando | Ubicación | Descripción |
|---|---|---|
| `./mvnw test` | `Jenkinsfile`, stage `Backend tests` | Ejecuta tests con Testcontainers |
| `./mvnw clean test` | Recomendado (no actual) | Limpiar target antes de tests |
| `./mvnw spring-boot:run` | `README.md` | Arrancar backend localmente |
| `docker build -t shift-control-backend .` | Propuesto (futuro) | Build Docker image |

### 6.2 Mobile

| Comando | Ubicación | Descripción |
|---|---|---|
| `pnpm install` | `shift-control-mobile/package.json` | Instalar dependencias |
| `pnpm install --frozen-lockfile` | Recomendado para CI | Instalar sin modificar lockfile |
| `pnpm exec tsc --noEmit` | Manual / propuesto | Typecheck sin emitir archivos |
| `pnpm test` | `package.json` script | Ejecuta Jest |
| `pnpm test -- --ci --coverage` | Recomendado para CI | Jest en modo CI con cobertura |
| `pnpm lint` | `package.json` script | Ejecuta ESLint (`expo lint`) |
| `pnpm start` | `package.json` script | Arrancar Expo dev server |

**Nota:** Mobile lint actualmente **falla** — debe corregirse antes de habilitarlo en CI.

### 6.3 Jenkins

| Comando | Ubicación | Descripción |
|---|---|---|
| `cd jenkins-local && docker compose up -d` | `docs/jenkins-local-ci.md` | Arrancar Jenkins |
| `cd jenkins-local && docker compose down` | `docs/jenkins-local-ci.md` | Detener Jenkins (preserva datos) |
| `cd jenkins-local && docker compose down -v` | `docs/jenkins-local-ci.md` | Detener y borrar volumen (⚠️ destructivo) |

---

## 7. Plan de Implementación

### Decisión Arquitectónica Requerida

**Opción A: GitHub Actions (RECOMENDADO)**
- ✅ Nativo a GitHub
- ✅ Branch protection funciona out-of-the-box
- ✅ No requiere infraestructura local
- ✅ Webhooks automáticos
- ✅ Status checks automáticos
- ✅ Soporte PRs nativo
- ✅ Gratis para repos privados (2000 min/mes)
- ❌ Requiere migrar de Jenkinsfile a `.github/workflows/*.yml`

**Opción B: Jenkins Local + Túnel Público (NO RECOMENDADO PARA PROD)**
- ✅ Preserva inversión en Jenkinsfile
- ❌ Requiere ngrok/cloudflared (frágil)
- ❌ Requiere configuración manual compleja
- ❌ No apto para producción (túnel puede caer)
- ❌ Requiere GitHub App/PAT + plugins + webhooks

**Opción C: Jenkins Hosted en Cloud (OVERKILL PARA ESTE PROYECTO)**
- ✅ Estable y público
- ❌ Requiere infraestructura cloud (costos)
- ❌ Complejidad de setup
- ❌ Overhead de mantenimiento

---

### Fases de Implementación (Opción A: GitHub Actions)

#### **CI.1 — Migración a GitHub Actions**

**Goal:** Reemplazar Jenkins local con GitHub Actions workflow que ejecute backend + mobile checks.

**Archivos creados:**
- `.github/workflows/ci.yml`

**Archivos modificados:**
- Ninguno (Jenkinsfile se preserva como referencia histórica)

**Configuración manual:**
- Ninguna — GitHub Actions es nativo

**Workflow propuesto:**

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK 21
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '21'
          cache: 'maven'

      - name: Backend Tests
        working-directory: backend
        run: |
          chmod +x mvnw
          ./mvnw clean test

      - name: Publish Test Results
        if: always()
        uses: dorny/test-reporter@v1
        with:
          name: Backend Tests
          path: backend/target/surefire-reports/*.xml
          reporter: java-junit

  mobile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
          cache-dependency-path: shift-control-mobile/pnpm-lock.yaml

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install Dependencies
        working-directory: shift-control-mobile
        run: pnpm install --frozen-lockfile

      - name: Typecheck
        working-directory: shift-control-mobile
        run: pnpm exec tsc --noEmit

      - name: Run Tests
        working-directory: shift-control-mobile
        run: pnpm test -- --ci --coverage

      # DESHABILITADO hasta que lint esté arreglado
      # - name: Lint
      #   working-directory: shift-control-mobile
      #   run: pnpm lint
```

**Validación:**
1. Crear branch `ci-migration`
2. Añadir `.github/workflows/ci.yml`
3. Push y abrir PR
4. Verificar que ambos jobs (backend, mobile) pasan
5. Arreglar mobile lint antes de habilitar stage

**Riesgos:**
- Mobile lint falla → deshabilitar temporalmente en workflow
- Tests mobile pueden fallar si no están configurados para CI

---

#### **CI.2 — Habilitar Mobile Lint**

**Goal:** Corregir errores de lint y habilitar stage `mobile lint` en CI.

**Archivos modificados:**
- `shift-control-mobile/**/*.ts`
- `shift-control-mobile/**/*.tsx`
- `.github/workflows/ci.yml` (descomentar stage lint)

**Validación:**
1. Ejecutar `pnpm lint` localmente
2. Corregir todos los errores
3. Commit + push
4. Verificar que lint pasa en CI

**Riesgos:**
- Muchos archivos con errores de lint (refactor grande)

---

#### **CI.3 — Branch Protection en `main`**

**Goal:** Configurar GitHub Branch Protection para requerir CI antes de merge.

**Configuración manual en GitHub:**
1. Ir a `Settings` → `Branches` → `Branch protection rules`
2. Añadir rule para `main`:
   - ✅ Require pull request reviews before merging (min 1 approval)
   - ✅ Require status checks to pass before merging
     - Required checks: `backend`, `mobile`
   - ✅ Require branches to be up to date before merging
   - ✅ Do not allow bypassing the above settings
   - ✅ Require linear history (opcional)
3. Save

**Validación:**
1. Crear branch `test-branch-protection`
2. Hacer cambio trivial
3. Abrir PR
4. Intentar merge antes de que CI pase → debe estar bloqueado
5. Esperar a que CI pase → merge debe habilitarse

**Riesgos:**
- Si CI falla frecuentemente, puede bloquear desarrollo

---

#### **CI.4 — PR Smoke Test**

**Goal:** Validar que todo el flujo PR → CI → Merge funciona end-to-end.

**Pasos:**
1. Crear PR con cambio no-crítico
2. Verificar que CI corre automáticamente
3. Verificar que branch protection bloquea merge hasta que CI pasa
4. Hacer review y aprobar PR
5. Merge

**Validación:**
- PR no se puede hacer merge hasta que CI pasa ✅
- Status checks visibles en PR ✅
- Merge button habilitado solo después de approval + CI green ✅

**Riesgos:**
- Ninguno (prueba end-to-end)

---

### Fases de Implementación (Opción B: Jenkins Local + Túnel) — NO RECOMENDADO

#### **CI.1 — Jenkins Pipeline Hardening**

**Goal:** Añadir stages de mobile al Jenkinsfile.

**Archivos modificados:**
- `Jenkinsfile`
- `jenkins-local/Dockerfile`

**Cambios en Dockerfile:**
- Instalar Node.js 20
- Instalar pnpm

**Cambios en Jenkinsfile:**
- Añadir stages: `Mobile Install`, `Mobile Typecheck`, `Mobile Tests`, `Mobile Lint` (opcional)

**Validación:**
1. Rebuild imagen Jenkins (`docker compose build`)
2. Recrear contenedor (`docker compose up -d --force-recreate`)
3. Trigger build manual
4. Verificar que todos los stages pasan

**Riesgos:**
- Mobile lint falla → deshabilitar temporalmente
- Imagen más pesada (Node.js + Java)

---

#### **CI.2 — GitHub Webhook Integration**

**Goal:** Configurar webhooks GitHub → Jenkins.

**Prerrequisitos:**
- Jenkins públicamente accesible (ngrok/cloudflared)
- GitHub plugin instalado en Jenkins
- Webhook secret generado

**Configuración manual:**
1. Instalar plugin GitHub en Jenkins
2. Generar webhook secret
3. Configurar Jenkins URL en GitHub webhook settings
4. Configurar secret en ambos lados
5. Test webhook delivery

**Validación:**
1. Push a GitHub
2. Verificar que Jenkins recibe webhook y triggeree build
3. Verificar que no hay errores en delivery logs

**Riesgos:**
- Túnel ngrok/cloudflared puede caer
- URL pública cambia en cada restart (si usa ngrok free)

---

#### **CI.3 — GitHub Status/Check Publishing**

**Goal:** Jenkins publica status checks a GitHub.

**Prerrequisitos:**
- GitHub Checks plugin instalado
- GitHub App creada con permisos `checks:write`
- Credenciales configuradas en Jenkins

**Archivos modificados:**
- `Jenkinsfile` (añadir `publishChecks()` en post-actions)

**Validación:**
1. Trigger build
2. Verificar que check aparece en GitHub PR/commit
3. Verificar que status es correcto (success/failure)

**Riesgos:**
- Configuración de GitHub App compleja
- Permisos incorrectos → falla silenciosamente

---

#### **CI.4 — Branch Protection Rule**

**Goal:** Configurar branch protection en GitHub con Jenkins check como required.

**Configuración manual:**
- Igual que Opción A, pero check requerido es `jenkins-ci` (nombre definido en Jenkinsfile)

**Validación:**
- Igual que Opción A

**Riesgos:**
- Si Jenkins local cae, todos los PRs quedan bloqueados

---

#### **CI.5 — PR Smoke Test**

**Goal:** Validar flujo end-to-end.

**Validación:**
- Igual que Opción A

**Riesgos:**
- Jenkins local debe estar siempre activo

---

## 8. Gaps Identificados

### 8.1 Gaps Técnicos

| # | Gap | Severidad | Impacto |
|---|---|---|---|
| **G1** | Jenkins no ejecuta mobile checks | 🔴 Alta | 50% del monorepo sin validación |
| **G2** | Jenkins no publica status a GitHub | 🔴 Alta | Branch protection no funciona |
| **G3** | Jenkins solo accesible localmente | 🔴 Alta | Webhooks imposibles |
| **G4** | Mobile lint falla (pre-existente) | 🟡 Media | CI fallará hasta arreglar |
| **G5** | No es Multibranch Pipeline | 🟡 Media | No auto-detecta PRs |
| **G6** | No hay Node.js/pnpm en imagen Jenkins | 🟡 Media | Mobile stages imposibles |
| **G7** | Poll SCM cada 2 min (ineficiente) | 🟢 Baja | Delay en detección de cambios |
| **G8** | No hay documentación de plugins | 🟢 Baja | Dificulta troubleshooting |

### 8.2 Gaps de Proceso

| # | Gap | Severidad | Impacto |
|---|---|---|---|
| **P1** | No hay branch protection configurada | 🔴 Alta | `main` vulnerable a pushes directos |
| **P2** | No hay requirement de PR review | 🟡 Media | Cambios pueden mergearse sin review |
| **P3** | No hay CI automático en PRs | 🟡 Media | Bugs pueden llegar a `main` |

---

## 9. Recomendaciones Finales

### 9.1 Recomendación Principal

**Migrar a GitHub Actions** (Opción A).

**Justificación:**
- ✅ Solución nativa, estable y mantenida por GitHub
- ✅ No requiere infraestructura local
- ✅ Branch protection funciona out-of-the-box
- ✅ Gratis para repos privados (hasta 2000 min/mes — suficiente para este proyecto)
- ✅ Migración simple (Jenkinsfile → workflow YAML)
- ✅ Documentación oficial excelente
- ✅ Comunidad activa con actions pre-hechas

**Contra-argumento "pérdida de inversión en Jenkins":**
- Jenkins local sigue siendo útil para desarrollo/debug local
- Jenkinsfile se puede preservar como referencia
- Migración toma ~2-4 horas (costo bajo vs beneficio)

### 9.2 Si Se Decide Mantener Jenkins

**Entonces es obligatorio:**
1. Exponer Jenkins públicamente (cloud hosting, no ngrok)
2. Convertir a Multibranch Pipeline
3. Instalar y configurar GitHub Checks plugin
4. Configurar GitHub App con permisos correctos
5. Añadir Node.js/pnpm a imagen Jenkins
6. Arreglar mobile lint antes de habilitar en CI

**Esto requiere ~1-2 semanas de trabajo** vs ~2-4 horas de GitHub Actions.

---

## 10. Próximos Pasos

### 10.1 Decisiones Requeridas

| # | Decisión | Opciones | Stakeholder |
|---|---|---|---|
| **D1** | Arquitectura CI/CD | A: GitHub Actions, B: Jenkins local + túnel, C: Jenkins cloud | Tech lead |
| **D2** | Mobile lint fix | Arreglar ahora vs deshabilitar temporalmente | Developer |
| **D3** | Branch protection strictness | Require review + CI vs solo CI | Tech lead + team |

### 10.2 Acción Inmediata Recomendada

1. **Decisión de arquitectura** (GitHub Actions vs Jenkins) — **URGENTE**
2. **Si GitHub Actions:**
   - Crear `.github/workflows/ci.yml` con backend + mobile jobs
   - Deshabilitar mobile lint temporalmente
   - Abrir PR de prueba
   - Configurar branch protection en `main`
3. **Si Jenkins:**
   - Actualizar Dockerfile con Node.js + pnpm
   - Añadir mobile stages a Jenkinsfile
   - Investigar solución de túnel público
   - Instalar GitHub plugins

---

## 11. Anexos

### 11.1 Comparativa GitHub Actions vs Jenkins

| Aspecto | GitHub Actions | Jenkins Local |
|---|---|---|
| **Setup inicial** | ✅ ~2 horas | ⚠️ ~1-2 semanas |
| **Mantenimiento** | ✅ Ninguno | ⚠️ Alto (plugins, updates) |
| **Costo** | ✅ Gratis (límite generoso) | ✅ Gratis (pero requiere hardware local 24/7) |
| **Branch protection** | ✅ Nativo | ⚠️ Requiere configuración compleja |
| **PR auto-discovery** | ✅ Nativo | ⚠️ Requiere Multibranch Pipeline |
| **Webhooks** | ✅ Automáticos | ❌ Requiere Jenkins público |
| **Status checks** | ✅ Automáticos | ❌ Requiere GitHub Checks plugin |
| **Escalabilidad** | ✅ Ilimitada (runners de GitHub) | ⚠️ Limitada a hardware local |
| **Debugging** | ⚠️ Logs en GitHub UI | ✅ Logs en Jenkins UI (más detallados) |
| **Flexibilidad** | ⚠️ Limitada a YAML + actions | ✅ Groovy completo (pero overkill) |

**Conclusión:** GitHub Actions gana en casi todos los aspectos relevantes para este proyecto.

---

### 11.2 Referencias

- [GitHub Actions documentation](https://docs.github.com/en/actions)
- [GitHub Branch Protection rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)
- [Jenkins GitHub plugin](https://plugins.jenkins.io/github/)
- [Jenkins GitHub Checks plugin](https://plugins.jenkins.io/github-checks/)
- [Testcontainers Docker connectivity](https://java.testcontainers.org/features/networking/)

---

**Fin del reporte de auditoría.**
