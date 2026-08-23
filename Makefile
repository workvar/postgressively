.PHONY: backend agent web tidy build hashpw

# Local dev targets load the sibling .env file (see *.env.example for the keys).
backend:
	cd backend && set -a && . ./.env && set +a && go run ./cmd/server

agent:
	cd agent && set -a && . ./.env && set +a && go run ./cmd/agent

web:
	cd web && npm run dev

tidy:
	cd backend && go mod tidy
	cd agent && go mod tidy

build:
	cd backend && go build -o ../bin/postggresively-backend ./cmd/server
	cd agent && go build -o ../bin/postggresively-agent ./cmd/agent
	cd web && npm run build

hashpw:
	cd backend && go run ./cmd/server hashpw "$(PASSWORD)"
