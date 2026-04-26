PROJECT_ID ?= engineering-trend-scout
REGION     ?= us-central1
SERVICE    ?= learning-architect-service
MCP_SERVICE ?= learning-architect-mcp-service
ADK_SERVICE ?= learning-architect-adk-service
REPOSITORY ?= learning-progress-architect
IMAGE_NAME ?= app-image
MCP_IMAGE_NAME ?= mcp-image
ADK_IMAGE_NAME ?= adk-image
TAG        ?= latest
IMAGE      = $(REGION)-docker.pkg.dev/$(PROJECT_ID)/$(REPOSITORY)/$(IMAGE_NAME):$(TAG)
MCP_IMAGE  = $(REGION)-docker.pkg.dev/$(PROJECT_ID)/$(REPOSITORY)/$(MCP_IMAGE_NAME):$(TAG)
ADK_IMAGE  = $(REGION)-docker.pkg.dev/$(PROJECT_ID)/$(REPOSITORY)/$(ADK_IMAGE_NAME):$(TAG)
LOCAL_IMAGE ?= learning-progress-architect:local
LOCAL_PORT  ?= 3000
INTERNAL_SERVICE_TOKEN ?= replace-with-a-shared-secret
APP_BASE_URL ?=
ADK_SERVICE_URL ?=
MCP_BASE_URL ?=
GEMINI_API_KEY ?=
GEMINI_SECRET ?=
DATABASE_SECRET ?= alloydb-database-url

.PHONY: run build build-mcp build-adk push build-push deploy deploy-mcp deploy-adk deploy-demo-web deploy-demo-web-adk deploy-alloydb-web deploy-demo-mcp deploy-demo-adk docker-build-local docker-run-local

run:
	npm run dev

build:
	gcloud builds submit --tag $(IMAGE) .

build-mcp:
	gcloud builds submit --config cloudbuild.mcp.yaml --substitutions _IMAGE=$(MCP_IMAGE) .

build-adk:
	gcloud builds submit --config cloudbuild.adk.yaml --substitutions _IMAGE=$(ADK_IMAGE) .

push:
	$(MAKE) build PROJECT_ID=$(PROJECT_ID) REGION=$(REGION) SERVICE=$(SERVICE) REPOSITORY=$(REPOSITORY) IMAGE_NAME=$(IMAGE_NAME) TAG=$(TAG)

build-push: build

SET_GEMINI_SECRET = $(if $(GEMINI_SECRET),--set-secrets GEMINI_API_KEY=$(GEMINI_SECRET):latest,)

deploy:
	gcloud run deploy $(SERVICE) \
		--image $(IMAGE) \
		--platform managed \
		--region $(REGION) \
		--port 3000 \
		--allow-unauthenticated \
		$(SET_GEMINI_SECRET)

deploy-mcp:
	gcloud run deploy $(MCP_SERVICE) \
		--image $(MCP_IMAGE) \
		--platform managed \
		--region $(REGION) \
		--port 3101 \
		--allow-unauthenticated \
		--ingress all \
		--set-env-vars NODE_ENV=production,MCP_PORT=3101,APP_BASE_URL=$(APP_BASE_URL),INTERNAL_SERVICE_TOKEN=$(INTERNAL_SERVICE_TOKEN) \
		$(SET_GEMINI_SECRET)

deploy-adk:
	gcloud run deploy $(ADK_SERVICE) \
		--image $(ADK_IMAGE) \
		--platform managed \
		--region $(REGION) \
		--port 8081 \
		--allow-unauthenticated \
		--ingress all \
		--set-env-vars MCP_BASE_URL=$(MCP_BASE_URL),INTERNAL_SERVICE_TOKEN=$(INTERNAL_SERVICE_TOKEN) \
		$(SET_GEMINI_SECRET)

deploy-demo-web:
	gcloud run deploy $(SERVICE) \
		--image $(IMAGE) \
		--platform managed \
		--region $(REGION) \
		--port 3000 \
		--allow-unauthenticated \
		--set-env-vars NODE_ENV=production,DB_PROVIDER=sqlite,AGENT_PROVIDER=legacy,DATABASE_FILE=/tmp/app.db,INTERNAL_SERVICE_TOKEN=$(INTERNAL_SERVICE_TOKEN) \
		$(SET_GEMINI_SECRET)

deploy-demo-web-adk:
	gcloud run services update $(SERVICE) \
		--region $(REGION) \
		--set-env-vars NODE_ENV=production,DB_PROVIDER=sqlite,AGENT_PROVIDER=adk,DATABASE_FILE=/tmp/app.db,ADK_SERVICE_URL=$(ADK_SERVICE_URL),INTERNAL_SERVICE_TOKEN=$(INTERNAL_SERVICE_TOKEN) \
		$(SET_GEMINI_SECRET)

deploy-alloydb-web:
	gcloud run services update $(SERVICE) \
		--region $(REGION) \
		--remove-env-vars DATABASE_FILE \
		--set-env-vars NODE_ENV=production,DB_PROVIDER=alloydb,AGENT_PROVIDER=adk,ADK_SERVICE_URL=$(ADK_SERVICE_URL),INTERNAL_SERVICE_TOKEN=$(INTERNAL_SERVICE_TOKEN) \
		--set-secrets DATABASE_URL=$(DATABASE_SECRET):latest \
		$(SET_GEMINI_SECRET)

deploy-demo-mcp:
	gcloud run deploy $(MCP_SERVICE) \
		--image $(MCP_IMAGE) \
		--platform managed \
		--region $(REGION) \
		--port 3101 \
		--allow-unauthenticated \
		--ingress all \
		--set-env-vars NODE_ENV=production,MCP_PORT=3101,APP_BASE_URL=$(APP_BASE_URL),INTERNAL_SERVICE_TOKEN=$(INTERNAL_SERVICE_TOKEN) \
		$(SET_GEMINI_SECRET)

deploy-demo-adk:
	gcloud run deploy $(ADK_SERVICE) \
		--image $(ADK_IMAGE) \
		--platform managed \
		--region $(REGION) \
		--port 8081 \
		--allow-unauthenticated \
		--ingress all \
		--set-env-vars MCP_BASE_URL=$(MCP_BASE_URL),INTERNAL_SERVICE_TOKEN=$(INTERNAL_SERVICE_TOKEN) \
		$(SET_GEMINI_SECRET)

docker-build-local:
	docker build -t $(LOCAL_IMAGE) .

docker-run-local: docker-build-local
	docker run --rm -p $(LOCAL_PORT):3000 $(if $(wildcard .env.local),--env-file .env.local,) $(LOCAL_IMAGE)
