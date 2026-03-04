# Real-Time Football Dashboard - Backend (FastAPI)

## Requisitos
- Python 3.9 o superior
- pip o venv

## Instalación

### 1. Crear un entorno virtual
```bash
python -m venv venv
```

### 2. Activar el entorno virtual

**En Windows:**
```bash
venv\Scripts\activate
```

**En Linux/Mac:**
```bash
source venv/bin/activate
```

### 3. Instalar dependencias
```bash
pip install -r requirements.txt
```

## Ejecución

### Iniciar el servidor en modo desarrollo
```bash
python main.py
```

O con recarga automática:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

El API estará disponible en: `http://localhost:8000`

La documentación interactiva (Swagger UI) estará en: `http://localhost:8000/docs`

## Estructura del Proyecto

```
backend/
├── main.py                 # Archivo principal de la aplicación
├── requirements.txt        # Dependencias de Python
├── .env.example           # Ejemplo de variables de entorno
├── .gitignore             # Archivo git ignore
└── README.md              # Este archivo
```

## Variables de Entorno

Copia `.env.example` a `.env` y configura las variables según tu entorno:

```bash
cp .env.example .env
```

## Desarrollo

Para más información sobre FastAPI, visita: https://fastapi.tiangolo.com/
