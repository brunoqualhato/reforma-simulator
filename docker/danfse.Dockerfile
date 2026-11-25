FROM golang:1.27-alpine AS build
WORKDIR /build
COPY services/gerador-danfse/go.mod services/gerador-danfse/go.sum ./
RUN go mod download
COPY services/gerador-danfse/ ./
RUN CGO_ENABLED=0 go build -trimpath -o /danfse ./cmd/danfse
FROM alpine:3.23
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=build /danfse /app/danfse
ENV TZ=America/Sao_Paulo SERVER_PORT=8080 OTEL_SDK_DISABLED=true
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["/app/danfse"]
