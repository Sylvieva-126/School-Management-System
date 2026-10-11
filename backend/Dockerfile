# ---------- BUILD STAGE ----------
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# cache dependencies first (faster rebuilds)
COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn clean package -DskipTests

# ---------- RUN STAGE ----------
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/school-backend-1.0-SNAPSHOT.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]