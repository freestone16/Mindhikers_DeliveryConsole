# ============================================================
# Delivery Console - Container Management
# Standard commands (AGENTS.md ✅ authorized)
# ============================================================

.PHONY: init dev stop logs clean shell status rebuild

# Colors for output
BLUE := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(BLUE)Delivery Console - Container Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2}'

init: ## First-time build (slow, installs npm deps)
	@echo "$(BLUE)Building dev container...$(NC)"
	docker compose build
	@echo "$(GREEN)✓ Container built. Run 'make dev' to start.$(NC)"

dev: ## Start dev environment (frontend + backend)
	@echo "$(BLUE)Starting Delivery Console...$(NC)"
	@echo "$(YELLOW)Frontend: http://localhost:5173$(NC)"
	@echo "$(YELLOW)Backend:  http://localhost:3002$(NC)"
	@echo ""
	docker compose up

dev-d: ## Start dev environment (detached/background)
	@echo "$(BLUE)Starting Delivery Console (detached)...$(NC)"
	docker compose up -d
	@echo "$(GREEN)✓ Running in background$(NC)"
	@echo "$(YELLOW)Frontend: http://localhost:5173$(NC)"
	@echo "$(YELLOW)Backend:  http://localhost:3002$(NC)"

stop: ## Stop containers
	@echo "$(BLUE)Stopping containers...$(NC)"
	docker compose down
	@echo "$(GREEN)✓ Containers stopped$(NC)"

rebuild: ## Rebuild and start (use after Dockerfile or package.json changes)
	@echo "$(BLUE)Rebuilding container...$(NC)"
	docker compose down
	docker compose build --no-cache
	docker compose up -d
	@echo "$(GREEN)✓ Rebuilt and running$(NC)"

logs: ## View container logs (follow mode)
	docker compose logs -f

shell: ## Open shell inside the dev container
	docker compose exec app sh

status: ## Show container status
	@echo "$(BLUE)Container Status:$(NC)"
	docker compose ps

clean: ## Remove containers, volumes, and images
	@echo "$(RED)Cleaning up containers and volumes...$(NC)"
	docker compose down -v --rmi local
	@echo "$(GREEN)✓ Cleanup complete$(NC)"
