.PHONY: up down migrate-up migrate-down migrate-fresh seed backend-test frontend-build test build

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

frontend-build:
	cd frontend && npm run build

test: backend-test frontend-build

build: test
