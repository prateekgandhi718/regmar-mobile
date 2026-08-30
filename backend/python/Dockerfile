FROM python:3.11-slim
RUN apt-get update && apt-get install -y build-essential curl && rm -rf /var/lib/apt/lists/*
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
WORKDIR /app
COPY pyproject.toml ./
RUN /root/.local/bin/uv venv .venv && /root/.local/bin/uv pip install --python .venv/bin/python yfinance pandas numpy PyPortfolioOpt cvxpy fastapi 'uvicorn[standard]'
COPY app ./app
EXPOSE 8000
CMD [".venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
