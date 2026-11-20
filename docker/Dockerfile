FROM eclipse-temurin:25.0.4_7-jre-alpine-3.24

WORKDIR /app

COPY target/my-app.jar app.jar

ENTRYPOINT ["java", "-jar", "app.jar"]
