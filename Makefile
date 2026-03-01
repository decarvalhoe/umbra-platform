.PHONY: dev stop clean test test-auth test-player test-game-state test-payment test-cloud-profile test-security test-localization test-client lint build migrate-all install help

SERVICES = auth player game-state payment cloud-profile security localization

## Development

dev: ## Start full development stack
	docker compose up --build -d

dev-logs: ## Start stack with logs
	docker compose up --build

stop: ## Stop all services
	docker compose down

clean: ## Stop and remove volumes
	docker compose down -v

restart: ## Restart all services
	docker compose restart

logs: ## Tail logs for all services
	docker compose logs -f

## Installation

install: ## Install all service dependencies
	@for svc in $(SERVICES); do \
		echo "==> Installing $$svc..."; \
		cd services/$$svc && pip install -r requirements.txt && cd ../..; \
	done
	@echo "==> Installing client..."
	@cd client && npm ci

## Testing

test: test-backend test-client ## Run all tests

test-backend: ## Run all backend service tests
	@for svc in $(SERVICES); do \
		echo "==> Testing $$svc..."; \
		cd services/$$svc && pytest tests/ -v && cd ../..; \
	done

test-auth: ## Test auth service
	cd services/auth && pytest tests/ -v

test-player: ## Test player service
	cd services/player && pytest tests/ -v

test-game-state: ## Test game-state service
	cd services/game-state && pytest tests/ -v

test-payment: ## Test payment service
	cd services/payment && pytest tests/ -v

test-cloud-profile: ## Test cloud-profile service
	cd services/cloud-profile && pytest tests/ -v

test-security: ## Test security service
	cd services/security && pytest tests/ -v

test-localization: ## Test localization service
	cd services/localization && pytest tests/ -v

test-client: ## Test game client
	cd client && npm test

## Code Quality

lint: ## Lint all services
	@for svc in $(SERVICES); do \
		echo "==> Linting $$svc..."; \
		cd services/$$svc && flake8 src/ tests/ && cd ../..; \
	done

format: ## Format all backend code
	@for svc in $(SERVICES); do \
		echo "==> Formatting $$svc..."; \
		cd services/$$svc && black src/ tests/ && cd ../..; \
	done

## Database

migrate-all: ## Run migrations for all services (requires running postgres)
	@for svc in $(SERVICES); do \
		echo "==> Migrating $$svc..."; \
		cd services/$$svc && python -m src.migrations && cd ../..; \
	done

## Build

build: ## Build all Docker images
	docker compose build

build-auth: ## Build auth service image
	docker compose build auth-service

build-client: ## Build game client image
	docker compose build game-client

## Help

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
