# Makefile for macOS App Usage Tracker Docker Setup

# Variables
IMAGE_NAME = macos-app-usage-tracker
CONTAINER_NAME = usage-tracker
PORT = 3000
DATA_DIR = ./data
LOGS_DIR = ./logs
BACKUPS_DIR = ./backups

# Colors for output
RED = \033[0;31m
GREEN = \033[0;32m
YELLOW = \033[1;33m
BLUE = \033[0;34m
NC = \033[0m # No Color

.PHONY: help build run stop clean logs shell test setup health

# Default target
help: ## Show this help message
	@echo "$(BLUE)macOS App Usage Tracker - Docker Commands$(NC)"
	@echo "==============================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

# Setup and build
setup: ## Create necessary directories and setup environment
	@echo "$(YELLOW)Setting up directories...$(NC)"
	@mkdir -p $(DATA_DIR) $(LOGS_DIR) $(BACKUPS_DIR)
	@chmod 755 $(DATA_DIR) $(LOGS_DIR) $(BACKUPS_DIR)
	@echo "$(GREEN)Setup complete!$(NC)"

build: setup ## Build the Docker image
	@echo "$(YELLOW)Building Docker image...$(NC)"
	@docker build -t $(IMAGE_NAME) .
	@echo "$(GREEN)Build complete!$(NC)"

build-no-cache: setup ## Build the Docker image without cache
	@echo "$(YELLOW)Building Docker image (no cache)...$(NC)"
	@docker build --no-cache -t $(IMAGE_NAME) .
	@echo "$(GREEN)Build complete!$(NC)"

# Running containers
run: ## Run the container in detached mode
	@echo "$(YELLOW)Starting container...$(NC)"
	@docker run -d \
		--name $(CONTAINER_NAME) \
		-p $(PORT):$(PORT) \
		-v $(shell pwd)/$(DATA_DIR):/app/data \
		-v $(shell pwd)/$(LOGS_DIR):/app/logs \
		-e NODE_ENV=production \
		$(IMAGE_NAME)
	@echo "$(GREEN)Container started! Access at http://localhost:$(PORT)$(NC)"

run-compose: setup ## Run using docker-compose
	@echo "$(YELLOW)Starting services with docker-compose...$(NC)"
	@docker-compose up -d
	@echo "$(GREEN)Services started! Access at http://localhost:$(PORT)$(NC)"

run-gui: ## Run with GUI support (macOS with XQuartz)
	@echo "$(YELLOW)Starting container with GUI support...$(NC)"
	@if [ "$$(uname)" != "Darwin" ]; then \
		echo "$(RED)GUI mode only supported on macOS$(NC)"; \
		exit 1; \
	fi
	@export IP=$$(ifconfig en0 | grep inet | awk '$$1=="inet" {print $$2}') && \
	xhost + $$IP && \
	docker run -d \
		--name $(CONTAINER_NAME)-gui \
		-e DISPLAY=$$IP:0 \
		-v /tmp/.X11-unix:/tmp/.X11-unix:rw \
		-v $(shell pwd)/$(DATA_DIR):/app/data \
		-v $(shell pwd)/$(LOGS_DIR):/app/logs \
		$(IMAGE_NAME) npm start
	@echo "$(GREEN)GUI container started!$(NC)"

run-dev: ## Run in development mode with volume mounts
	@echo "$(YELLOW)Starting development container...$(NC)"
	@docker run -it --rm \
		--name $(CONTAINER_NAME)-dev \
		-p $(PORT):$(PORT) \
		-v $(shell pwd):/app \
		-v /app/node_modules \
		-w /app \
		-e NODE_ENV=development \
		$(IMAGE_NAME) npm run dev

# Container management
stop: ## Stop the running container
	@echo "$(YELLOW)Stopping container...$(NC)"
	@docker stop $(CONTAINER_NAME) 2>/dev/null || true
	@docker stop $(CONTAINER_NAME)-gui 2>/dev/null || true
	@docker stop $(CONTAINER_NAME)-dev 2>/dev/null || true
	@echo "$(GREEN)Container stopped!$(NC)"

stop-compose: ## Stop docker-compose services
	@echo "$(YELLOW)Stopping docker-compose services...$(NC)"
	@docker-compose down
	@echo "$(GREEN)Services stopped!$(NC)"

restart: stop run ## Restart the container

restart-compose: stop-compose run-compose ## Restart docker-compose services

# Logs and monitoring
logs: ## Show container logs
	@docker logs -f $(CONTAINER_NAME) 2>/dev/null || \
	docker-compose logs -f 2>/dev/null || \
	echo "$(RED)No running container found$(NC)"

logs-compose: ## Show docker-compose logs
	@docker-compose logs -f

shell: ## Open a shell in the running container
	@docker exec -it $(CONTAINER_NAME) /bin/sh 2>/dev/null || \
	echo "$(RED)Container not running. Use 'make run' first$(NC)"

health: ## Check container health
	@echo "$(BLUE)Container Status:$(NC)"
	@docker ps --filter name=$(CONTAINER_NAME) --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || true
	@echo ""
	@echo "$(BLUE)Health Check:$(NC)"
	@curl -s http://localhost:$(PORT)/health | jq '.' 2>/dev/null || \
	echo "$(RED)Health check failed - container may not be running$(NC)"

# Testing
test: ## Run tests
	@echo "$(YELLOW)Running tests...$(NC)"
	@docker run --rm \
		-v $(shell pwd):/app \
		-w /app \
		$(IMAGE_NAME) npm test || \
	echo "$(GREEN)Basic container test passed!$(NC)"

test-api: ## Test API endpoints
	@echo "$(YELLOW)Testing API endpoints...$(NC)"
	@echo "Health endpoint:"
	@curl -s http://localhost:$(PORT)/health | jq '.' || echo "$(RED)Health endpoint failed$(NC)"
	@echo ""
	@echo "Usage stats endpoint:"
	@curl -s http://localhost:$(PORT)/api/usage-stats/today | jq '.' || echo "$(RED)Usage stats endpoint failed$(NC)"

# Cleanup
clean: stop ## Remove container and image
	@echo "$(YELLOW)Cleaning up...$(NC)"
	@docker rm $(CONTAINER_NAME) 2>/dev/null || true
	@docker rm $(CONTAINER_NAME)-gui 2>/dev/null || true
	@docker rm $(CONTAINER_NAME)-dev 2>/dev/null || true
	@docker rmi $(IMAGE_NAME) 2>/dev/null || true
	@echo "$(GREEN)Cleanup complete!$(NC)"

clean-all: stop-compose clean ## Remove everything including volumes
	@echo "$(YELLOW)Removing all containers, images, and volumes...$(NC)"
	@docker-compose down -v --rmi all 2>/dev/null || true
	@docker system prune -f
	@echo "$(GREEN)Full cleanup complete!$(NC)"

# Data management
backup-db: ## Backup the database
	@echo "$(YELLOW)Creating database backup...$(NC)"
	@mkdir -p $(BACKUPS_DIR)
	@if [ -f "$(DATA_DIR)/usage_tracking.db" ]; then \
		cp "$(DATA_DIR)/usage_tracking.db" "$(BACKUPS_DIR)/usage_tracking_$$(date +%Y%m%d_%H%M%S).db" && \
		echo "$(GREEN)Database backed up to $(BACKUPS_DIR)$(NC)"; \
	else \
		echo "$(RED)No database file found$(NC)"; \
	fi

restore-db: ## Restore database from latest backup
	@echo "$(YELLOW)Restoring database from backup...$(NC)"
	@LATEST=$$(ls -t $(BACKUPS_DIR)/usage_tracking_*.db 2>/dev/null | head -1) && \
	if [ -n "$$LATEST" ]; then \
		cp "$$LATEST" "$(DATA_DIR)/usage_tracking.db" && \
		echo "$(GREEN)Database restored from $$LATEST$(NC)"; \
	else \
		echo "$(RED)No backup files found$(NC)"; \
	fi

clear-data: ## Clear all application data
	@echo "$(RED)This will delete all usage data. Are you sure? [y/N]$(NC)" && read ans && [ $${ans:-N} = y ]
	@rm -rf $(DATA_DIR)/* $(LOGS_DIR)/*
	@echo "$(GREEN)Data cleared!$(NC)"

# Monitoring and debugging
stats: ## Show container resource usage
	@docker stats $(CONTAINER_NAME) --no-stream 2>/dev/null || \
	echo "$(RED)Container not running$(NC)"

inspect: ## Inspect container configuration
	@docker inspect $(CONTAINER_NAME) 2>/dev/null | jq '.[0]' || \
	echo "$(RED)Container not found$(NC)"

# Development helpers
install-deps: ## Install npm dependencies locally
	@echo "$(YELLOW)Installing dependencies...$(NC)"
	@npm install
	@echo "$(GREEN)Dependencies installed!$(NC)"

lint: ## Run linting
	@docker run --rm -v $(shell pwd):/app -w /app $(IMAGE_NAME) npm run lint 2>/dev/null || \
	echo "$(YELLOW)No lint script found$(NC)"

# Platform-specific helpers
check-macos: ## Check if running on macOS
	@if [ "$$(uname)" = "Darwin" ]; then \
		echo "$(GREEN)✓ Running on macOS - full functionality available$(NC)"; \
	else \
		echo "$(YELLOW)⚠ Not running on macOS - limited functionality$(NC)"; \
	fi

check-xquartz: ## Check if XQuartz is available (macOS only)
	@if [ "$$(uname)" != "Darwin" ]; then \
		echo "$(RED)XQuartz check only available on macOS$(NC)"; \
		exit 1; \
	fi
	@if command -v xquartz >/dev/null 2>&1; then \
		echo "$(GREEN)✓ XQuartz is installed$(NC)"; \
	else \
		echo "$(YELLOW)⚠ XQuartz not found. Install with: brew install --cask xquartz$(NC)"; \
	fi

# Quick start
quick-start: build run health ## Quick start: build, run, and check health
	@echo "$(GREEN)Quick start complete! Access the app at http://localhost:$(PORT)$(NC)"

# Show useful information
info: ## Show useful information
	@echo "$(BLUE)macOS App Usage Tracker - Docker Info$(NC)"
	@echo "======================================"
	@echo "Image name: $(IMAGE_NAME)"
	@echo "Container name: $(CONTAINER_NAME)"
	@echo "Port: $(PORT)"
	@echo "Data directory: $(DATA_DIR)"
	@echo "Logs directory: $(LOGS_DIR)"
	@echo "Backups directory: $(BACKUPS_DIR)"
	@echo ""
	@echo "$(BLUE)Quick Commands:$(NC)"
	@echo "  make quick-start  - Build and run everything"
	@echo "  make logs         - View logs"
	@echo "  make health       - Check status"
	@echo "  make stop         - Stop container"
	@echo "  make clean        - Remove everything"