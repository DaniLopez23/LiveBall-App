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

Script que simula la generación de eventos y estadísticas en tiempo real a partir de archivos XML de ejemplo.

### Ejecución

```bash
cd match-simulator
python src/main.py
```

## simulated-real-time-data

Carpeta donde se almacenan los archivos simulados de tiempo real generados por el simulador.
