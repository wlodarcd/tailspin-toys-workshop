FROM eclipse-temurin:25.0.4_7-jre-alpine-3.24

WORKDIR /app

COPY target/my-app.jar app.jar

RUN adduser -D -u 1000 appuser && chown -R 1000:1000 /app
USER 1000

ENTRYPOINT ["java", "-jar", "app.jar"]
