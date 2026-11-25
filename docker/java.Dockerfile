FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /build
ARG SERVICE
COPY services/${SERVICE}/ ./
RUN mvn -B -DskipTests package

FROM build AS database
RUN mkdir -p calculadora/db && mvn -B -ntp flyway:migrate -Dflyway.configFiles=./flyway/flyway-pro.conf
CMD ["sh", "-c", "cp calculadora/db/calculadora-pro.db /database/calculadora-pro.db && chmod 644 /database/calculadora-pro.db"]

FROM eclipse-temurin:25-jre
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /build/target/*.jar app.jar
ENV SPRING_PROFILES_ACTIVE=offline
USER 10001:10001
ENTRYPOINT ["java", "-jar", "app.jar"]
