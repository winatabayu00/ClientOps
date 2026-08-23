FROM golang:1.25-alpine AS build
WORKDIR /app/backend
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend .
RUN CGO_ENABLED=0 go build -o /api ./cmd/api
RUN CGO_ENABLED=0 go build -o /seed ./cmd/seed

FROM alpine:3.21
WORKDIR /app
COPY --from=build /api /api
COPY --from=build /seed /seed
COPY docs/api/openapi.yaml docs/api/openapi.yaml
EXPOSE 8080
CMD ["/api"]
