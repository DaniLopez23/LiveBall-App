# LiveBall-App

Aplicación para visualizar datos de fútbol en tiempo real, con eventos del partido, redes de pase y estadísticas dinámicas.

## Frontend

Interfaz web construida con React, TypeScript, Vite, Tailwind CSS, Zustand y React Router.

### Ejecución

```bash
cd frontend
npm install
npm run dev
```

## Backend

API desarrollada con FastAPI para procesar y servir los datos del partido.

### Ejecución

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Match Simulator

Script que simula varios partidos a partir de XML de Opta. Los feeds de
`data/events` y `data/stats` se organizan en `simulate` (actualizaciones en
tiempo real) y `static` (partidos finalizados); los nombres de salida conservan
el ID de partido.

### Ejecución

```bash
cd match-simulator
python src/main.py
```

## simulated-real-time-data

Carpeta donde se almacenan los archivos simulados de tiempo real generados por el simulador.

## Docker Compose local

Para levantar frontend, backend, simulador y volumen compartido:

```bash
docker compose up --build
```

El backend queda en `http://localhost:8000`, el frontend en `http://localhost:5173` y el health check en `http://localhost:8000/health`.

Detalles de variables, rutas XML y volumen compartido: [docs/deployment-local.md](docs/deployment-local.md).
