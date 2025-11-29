.PHONY: help up down restart logs build clean db-shell frontend-shell backend-shell install

help: ## Mostra esta mensagem de ajuda
	@echo "TeachTune - Comandos Disponíveis:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
	@echo ""

up: ## Inicia todos os serviços
	docker-compose up

up-d: ## Inicia todos os serviços em background
	docker-compose up -d

down: ## Para todos os serviços
	docker-compose down

restart: ## Reinicia todos os serviços
	docker-compose restart

logs: ## Mostra logs de todos os serviços
	docker-compose logs -f

logs-backend: ## Mostra logs do backend
	docker-compose logs -f backend

logs-frontend: ## Mostra logs do frontend
	docker-compose logs -f frontend

logs-db: ## Mostra logs do banco de dados
	docker-compose logs -f db

build: ## Reconstrói as imagens Docker
	docker-compose build --no-cache

rebuild: ## Para, reconstrói e inicia tudo
	docker-compose down
	docker-compose build --no-cache
	docker-compose up

clean: ## Remove tudo (incluindo volumes/dados)
	docker-compose down -v
	docker system prune -f

db-shell: ## Acessa o shell do PostgreSQL
	docker-compose exec db psql -U teachtune -d teachtune

backend-shell: ## Acessa o shell do backend
	docker-compose exec backend sh

frontend-shell: ## Acessa o shell do frontend
	docker-compose exec frontend sh

install: ## Instala dependências (sem Docker)
	npm install

dev: ## Roda apenas frontend (sem Docker)
	npm run dev

dev-server: ## Roda apenas backend (sem Docker)
	npm run dev:server

dev-all: ## Roda backend + frontend (sem Docker)
	npm run dev:all

ps: ## Mostra status dos containers
	docker-compose ps

stats: ## Mostra estatísticas dos containers
	docker stats

