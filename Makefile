PROJECT_ID ?= your-gcp-project-id
REGION     ?= us-central1
SERVICE    ?= learning-progress-architect
IMAGE      = gcr.io/$(PROJECT_ID)/$(SERVICE)

.PHONY: run build push build-push deploy

run:
	npm run dev

build:
	docker build -t $(IMAGE) .

push:
	docker push $(IMAGE)

build-push: build push

deploy:
	gcloud run deploy $(SERVICE) \\
		--image $(IMAGE) \\
		--platform managed \\
		--region $(REGION) \\
		--allow-unauthenticated
