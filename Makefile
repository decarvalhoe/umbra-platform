.PHONY: dev dev-down stop clean test lint format build seed health logs help

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev: ## Start all services in development mode
	docker compose up --build -d

stop: ## Stop all services
	docker compose down

clean: ## Stop all services and remove volumes
	docker compose down -v --remove-orphans

test: test-ai-director test-game-logic test-payment ## Run all tests
	@echo "All tests passed!"

test-ai-director: ## Run AI Director tests
	cd services/ai-director && pip install -r requirements.txt -q && pytest tests/ -v

test-game-logic: ## Run Game Logic tests
	cd services/game-logic && pip install -r requirements.txt -q && pytest tests/ -v

test-payment: ## Run Payment tests
	cd services/payment && pip install -r requirements.txt -q && pytest tests/ -v

test-nakama: ## Type-check Nakama runtime
	cd nakama/data && npm ci && npx tsc --noEmit

test-client: ## Build client
	cd client && npm ci && npm run build

lint: ## Lint all Python services
	cd services/ai-director && ruff check app/ tests/
	cd services/game-logic && ruff check app/ tests/
	cd services/payment && ruff check app/ tests/

format: ## Format all Python services
	cd services/ai-director && black app/ tests/
	cd services/game-logic && black app/ tests/
	cd services/payment && black app/ tests/

build: ## Build all Docker images
	docker compose build

logs: ## Show logs from all services
	docker compose logs -f

dev-down: stop ## Alias for stop

seed: ## Seed test data (Nakama users, gacha pools, AI content)
	python scripts/seed-data.py

health: ## Check health of all services
	@echo "=== Service Health ==="
	@echo -n "Nakama:       " && (curl -sf http://localhost:7350/healthcheck && echo " OK") || echo " FAIL"
	@echo -n "AI Director:  " && (curl -sf http://localhost:8001/health && echo " OK") || echo " FAIL"
	@echo -n "Game Logic:   " && (curl -sf http://localhost:8002/health && echo " OK") || echo " FAIL"
	@echo -n "Payment:      " && (curl -sf http://localhost:8003/health && echo " OK") || echo " FAIL"
	@echo -n "Client:       " && (curl -sf http://localhost:3000 -o /dev/null && echo "OK") || echo "FAIL"
	@echo -n "Nginx:        " && (curl -sf http://localhost:8080 -o /dev/null && echo "OK") || echo "FAIL"
	@echo "=== Done ==="
