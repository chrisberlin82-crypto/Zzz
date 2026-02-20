FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
RUN pip install --no-cache-dir flask jsonschema

COPY src/ src/

EXPOSE 5000

CMD ["python", "-m", "flask", "--app", "src.python.app", "run", "--host", "0.0.0.0", "--port", "5000"]
