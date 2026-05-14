# ------ Build stage (native image) ------
FROM ghcr.io/graalvm/native-image-community:25 AS build
WORKDIR /app

COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

COPY src/ src/
RUN ./mvnw -Pnative native:compile -DskipTests -B

# ------ Runtime stage ------
FROM debian:bookworm-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends libsqlite3-0 && \
    rm -rf /var/lib/apt/lists/* && \
    mkdir -p /data

COPY --from=build /app/target/zault-backend app

EXPOSE 8080
ENTRYPOINT ["./app"]
