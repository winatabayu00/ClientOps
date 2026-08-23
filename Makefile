.PHONY: up down migrate-up migrate-down migrate-fresh seed backend-test backend-vet frontend-build openapi-check test build

up:
	docker compose up --build

down:
	docker compose down

migrate-up:
	docker compose run --rm migrate

migrate-down:
	docker compose run --rm migrate -path=/migrations "-database=postgres://$${POSTGRES_USER:-clientops}:$${POSTGRES_PASSWORD:-clientops_dev}@postgres:5432/$${POSTGRES_DB:-clientops}?sslmode=disable" down 1

migrate-fresh:
	docker compose down -v
	docker compose up -d postgres
	docker compose run --rm migrate

seed:
	docker compose run --rm seed

backend-test:
	cd backend && go test ./...

backend-vet:
	cd backend && go vet ./...

frontend-build:
	cd frontend && npm run build

openapi-check:
	ruby -e 'require "yaml"; YAML.load_file("docs/api/openapi.yaml")'

test: backend-vet backend-test frontend-build openapi-check

build: test
