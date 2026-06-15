# Jenkins Local CI

## Descripción

Jenkins corre localmente en Docker para ejecutar los tests del backend en cada push.
El pipeline corre `./mvnw test` dentro de `backend/` y publica los resultados de Surefire.

---

## Iniciar Jenkins

```powershell
cd jenkins-local
docker compose up -d
```

## Detener Jenkins

```powershell
cd jenkins-local
docker compose down
```

> **Advertencia:** No uses `docker compose down -v` a menos que quieras borrar todos los datos de Jenkins (jobs, configuración, historial de builds).

---

## Configuración requerida

El servicio Jenkins está definido en `jenkins-local/docker-compose.yml` con las siguientes configuraciones clave:

| Parámetro | Valor |
|---|---|
| Puerto | `http://localhost:8085` |
| Contenedor | `shift-control-jenkins` |
| Usuario | `root` (necesario para acceder al socket de Docker) |
| Socket montado | `/var/run/docker.sock` |
| `TESTCONTAINERS_HOST_OVERRIDE` | `host.docker.internal` |

### Por qué `TESTCONTAINERS_HOST_OVERRIDE` es obligatorio

En Docker Desktop (Windows/Mac), el contenedor Jenkins vive en una red interna (`172.20.0.0/16`).
Testcontainers detecta automáticamente `172.17.0.1` como IP del host (gateway del bridge por defecto de Docker), pero esa IP **no es alcanzable** desde la red del contenedor Jenkins.

Sin esta variable, el build falla con:

```
java.lang.IllegalStateException: Could not connect to Ryuk at 172.17.0.1:<puerto>
```

Con `TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal`, Testcontainers usa `host.docker.internal`
(que resuelve a `192.168.65.254`, la IP del host de Docker Desktop), que sí es accesible desde cualquier contenedor.

---

## Pipeline

El pipeline está definido en [`Jenkinsfile`](../Jenkinsfile) en la raíz del repositorio.

### Stages

| Stage | Descripción |
|---|---|
| `Checkout` | Clona el repositorio desde GitHub |
| `Verify environment` | Imprime versiones de Java y Docker, lista archivos del workspace |
| `Backend tests` | Ejecuta `./mvnw test` dentro de `backend/` |

### Post-actions

- **Siempre:** publica los resultados XML de Surefire (`backend/target/surefire-reports/*.xml`).
- **Success:** imprime mensaje de CI pasado.
- **Failure:** imprime mensaje de CI fallido.

---

## Estructura de archivos

```
shift-control/
├── Jenkinsfile                     # Pipeline declarativo
├── jenkins-local/
│   ├── docker-compose.yml          # Servicio Jenkins con TESTCONTAINERS_HOST_OVERRIDE
│   └── Dockerfile                  # Imagen Jenkins con Docker CLI instalado
└── docs/
    └── jenkins-local-ci.md         # Este documento
```

---

## Commit inicial

```powershell
git add Jenkinsfile jenkins-local/docker-compose.yml jenkins-local/Dockerfile docs/jenkins-local-ci.md
git commit -m "Add Jenkins local CI pipeline"
git push
```
## Poll SCM automation

The local Jenkins job is configured with Poll SCM:

```txt
H/2 * * * *
```

This makes Jenkins check GitHub approximately every 2 minutes.

When a push is detected, Jenkins automatically runs the pipeline.

Expected build trigger message:

```
Started by an SCM change
```

---

## Jenkins Local vs GitHub Actions

### Jenkins Local — Herramienta de Aprendizaje

**Jenkins local es:**
- ✅ Herramienta de **aprendizaje** de pipelines declarativos y CI/CD
- ✅ Validación **opcional** local antes de hacer push
- ✅ Referencia de configuración Testcontainers en Docker
- ✅ Entorno de **desarrollo** para probar cambios de CI

**Jenkins local NO es:**
- ❌ Gate de branch protection de GitHub
- ❌ CI oficial del proyecto
- ❌ Requerido para contribuir al proyecto
- ❌ Accesible públicamente (solo localhost)
- ❌ Capaz de publicar status checks a GitHub

### GitHub Actions — CI Oficial

**GitHub Actions es:**
- ✅ CI oficial del proyecto
- ✅ Gate de branch protection en `main`
- ✅ Requerido para hacer merge de PRs
- ✅ Automático (webhooks nativos de GitHub)
- ✅ Publica status checks a PRs

**Workflow oficial:** `.github/workflows/ci.yml`

**Documentación:** [`docs/phase-16-github-actions-ci.md`](phase-16-github-actions-ci.md)

### Relación

- Los PRs requieren que **GitHub Actions** pase — **NO** Jenkins local
- Poll SCM de Jenkins **NO** afecta branch protection
- Jenkins local puede usarse para validación antes de push, pero es **opcional**
- GitHub Actions es la **única** fuente de verdad para CI/CD oficial