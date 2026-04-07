FROM python:3.11-slim

WORKDIR /app

COPY adk_service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY adk_service/app ./app

ENV PYTHONUNBUFFERED=1
ENV PORT=8081
EXPOSE 8081

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
