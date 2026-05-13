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