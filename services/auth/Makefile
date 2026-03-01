.PHONY: install run dev test test-cov lint format clean help

SERVICE_NAME = umbra-auth-service
PORT = 5000

install: ## Install dependencies
	pip install -U pip
	pip install -r requirements.txt

run: ## Run the service
	python -m src.main

dev: ## Run in development mode
	FLASK_ENV=development FLASK_DEBUG=1 python -m src.main

test: ## Run tests
	pytest tests/ -v

test-cov: ## Tests with coverage
	pytest tests/ -v --cov=src --cov-report=term-missing

lint: ## Lint code
	flake8 src/ tests/

format: ## Format code
	black src/ tests/

clean: ## Clean artifacts
	find . -name "*.pyc" -delete
	find . -name "__pycache__" -delete
	rm -rf .pytest_cache/ htmlcov/ .coverage

help: ## Show help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
