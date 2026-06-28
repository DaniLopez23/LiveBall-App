FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY match-simulator/requirements.txt .
RUN python -m pip install --no-cache-dir -r requirements.txt

COPY match-simulator/src ./src
COPY match-simulator/data/events ./data/events
COPY match-simulator/data/stats ./data/stats
COPY match-simulator/data/players ./data/players
COPY match-simulator/data/schedule ./data/schedule

CMD ["python", "src/main.py"]
