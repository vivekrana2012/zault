# ============================================================
#  Zault — Makefile
#  All commands you need, in one place.
# ============================================================

DOCKER_USER   := vivekrana2012
BACKEND_IMAGE := $(DOCKER_USER)/zault-backend
FRONTEND_IMAGE:= $(DOCKER_USER)/zault-frontend

.PHONY: help dev down logs build push clean fe-dev be-dev

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

# ---------- Local dev (Docker) ----------

dev: ## Build & run everything locally in Docker
	docker compose up --build

down: ## Stop all services
	docker compose down

logs: ## Tail logs for all services
	docker compose logs -f

build: ## Build Docker images without running
	docker compose build

# ---------- Local dev (bare-metal, hot reload) ----------

fe-dev: ## Run frontend in Vite dev mode (hot reload)
	cd frontend && npm install && npm run dev

be-dev: ## Run backend with Maven spring-boot:run
	cd backend && ./mvnw spring-boot:run

# ---------- Push images to Docker Hub ----------

push: build ## Build and push images to Docker Hub
	docker tag zault-backend  $(BACKEND_IMAGE):latest
	docker tag zault-frontend $(FRONTEND_IMAGE):latest
	docker push $(BACKEND_IMAGE):latest
	docker push $(FRONTEND_IMAGE):latest

# ---------- Cleanup ----------

clean: ## Remove stopped containers, dangling images, and volumes
	docker compose down -v --remove-orphans
	docker image prune -f

# ---------- API contract ----------

api-spec: ## Export OpenAPI spec from running backend to docs/api/openapi.yaml
	@mkdir -p docs/api
	curl -sf http://localhost:8080/v3/api-docs.yaml -o docs/api/openapi.yaml
	@echo "✓ docs/api/openapi.yaml updated"

api-types: ## Generate TypeScript types from OpenAPI spec
	cd frontend && npm run generate:api
	@echo "✓ frontend/src/api/schema.d.ts updated"
