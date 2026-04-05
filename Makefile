PROJECT_ID ?= your-gcp-project-id
REGION     ?= us-central1
SERVICE    ?= learning-architect-service
REPOSITORY ?= learning-progress-architect
IMAGE_NAME ?= app-image
TAG        ?= latest
IMAGE      = $(REGION)-docker.pkg.dev/$(PROJECT_ID)/$(REPOSITORY)/$(IMAGE_NAME):$(TAG)
LOCAL_IMAGE ?= learning-progress-architect:local
LOCAL_PORT  ?= 3000

.PHONY: run build push build-push deploy docker-build-local docker-run-local

run:
	npm run dev

build:
	gcloud builds submit --tag $(IMAGE) .

push:
	$(MAKE) build PROJECT_ID=$(PROJECT_ID) REGION=$(REGION) SERVICE=$(SERVICE) REPOSITORY=$(REPOSITORY) IMAGE_NAME=$(IMAGE_NAME) TAG=$(TAG)

build-push: build

deploy:
	gcloud run deploy $(SERVICE) \
		--image $(IMAGE) \
		--platform managed \
		--region $(REGION) \
		--allow-unauthenticated

docker-build-local:
	docker build -t $(LOCAL_IMAGE) .

docker-run-local: docker-build-local
	docker run --rm -p $(LOCAL_PORT):3000 $(if $(wildcard .env.local),--env-file .env.local,) $(LOCAL_IMAGE)
