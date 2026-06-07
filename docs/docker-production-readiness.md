# Docker production readiness

Este documento resume el entorno Docker local de LiveBall preparado para parecerse a un despliegue posterior con ECS Fargate + EFS, sin implementar infraestructura cloud.

## Servicios

- `frontend-react`: compila React + Vite y sirve los assets estaticos con Nginx. Expone `FRONTEND_PORT` en el host, por defecto `http://localhost:5173`.
- `backend-fastapi`: ejecuta FastAPI + Uvicorn, expone `BACKEND_PORT` en el host, por defecto `http://localhost:8000`, y mantiene los watchers que leen XML desde `/shared`.
- `match-simulator`: ejecuta el simulador Python. Lee XML fuente embebidos en su imagen y escribe/copias feeds en `/shared`.
- `shared-volume`: volumen Docker nombrado. Se monta en `backend-fastapi` y `match-simulator` como `/shared`.

## Volumen compartido

`shared-volume` representa localmente lo que en cloud se sustituira por EFS. El codigo no depende del tipo de almacenamiento: backend y simulador solo conocen rutas configuradas por variables de entorno.

Archivos esperados en `/shared`:

- `/shared/f24-simulated-data.xml`: eventos F24 generados por el simulador.
- `/shared/f9-simulated-data.xml`: estadisticas F9 generadas por el simulador.
- `/shared/F40-squad-23.xml`: plantilla F40 copiada por el simulador.
- `/shared/f42-23-2023-results.xml`: catalogo F42 copiado por el simulador.

## Variables de entorno

Frontend, compiladas en la imagen durante `docker compose build`:

- `VITE_API_URL`: URL HTTP publica del backend para el navegador.
- `VITE_WS_URL` / `VITE_WS_BASE_URL`: URL WebSocket publica base.

Backend:

- `ENVIRONMENT`: entorno logico, por defecto `production` en Docker Compose.
- `APP_HOST`: host de Uvicorn dentro del contenedor.
- `APP_PORT`: puerto de Uvicorn dentro del contenedor.
- `LOG_LEVEL`: nivel de logs.
- `CORS_ORIGINS`: origenes permitidos para el frontend.
- `LIVE_XML_PATH` / `F24_XML_PATH`: XML F24 leido por FastAPI.
- `F9_XML_PATH`: XML F9 leido por FastAPI.
- `F40_XML_PATH`: XML F40 leido por FastAPI.
- `F42_XML_PATH`: XML F42 leido por FastAPI.
- `XML_POLL_INTERVAL_SECONDS`: intervalo de lectura de eventos F24.
- `STATS_XML_POLL_INTERVAL_SECONDS`: intervalo de lectura de stats F9.

Simulador:

- `SOURCE_XML_PATH`: XML F24 fuente dentro del contenedor.
- `SOURCE_STATS_XML_PATH`: XML F9 fuente dentro del contenedor.
- `OUTPUT_XML_PATH`: XML F24 de salida en el volumen compartido.
- `OUTPUT_STATS_XML_PATH`: XML F9 de salida en el volumen compartido.
- `F40_SOURCE_XML_PATH` / `F40_OUTPUT_XML_PATH`: F40 fuente y destino.
- `F42_SOURCE_XML_PATH` / `F42_OUTPUT_XML_PATH`: F42 fuente y destino.
- `SIMULATION_SPEED`: multiplicador de velocidad.
- `WRITE_INTERVAL_SECONDS`: intervalo fijo de escritura de eventos F24.

Puedes copiar `.env.example` a `.env` para sobrescribir valores.

## Levantar el entorno

```bash
docker compose up --build
```

Endpoints locales:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`
- Healthcheck FastAPI: `http://localhost:8000/health`

## Comprobaciones

Comprobar FastAPI:

```bash
curl http://localhost:8000/health
```

Respuesta esperada:

```json
{"status":"ok"}
```

Comprobar que el simulador escribe XML en el volumen:

```bash
docker compose exec match-simulator ls -lh /shared
```

Comprobar que el backend ve los mismos archivos:

```bash
docker compose exec backend-fastapi ls -lh /shared
```

Comprobar logs relevantes:

```bash
docker compose logs match-simulator
docker compose logs backend-fastapi
```

En los logs del simulador deberias ver las rutas de salida F24, F9, F40 y F42. En los logs del backend deberias ver los watchers programados y mensajes `WORKER f24 received new data` / `WORKER f9 received new data` cuando detecte cambios.

Comprobar conectividad frontend-backend:

```bash
curl http://localhost:8000/api/v1/games
```

El frontend usa `VITE_API_URL` y `VITE_WS_BASE_URL` desde el navegador, asi que para Docker local deben apuntar a `localhost`, no al nombre interno `backend-fastapi`.

## Sustitucion futura en AWS

Cuando se migre a ECS Fargate + EFS, la pieza a sustituir es `shared-volume`:

- Montar EFS en ambos contenedores en la misma ruta, por ejemplo `/shared`.
- Mantener las mismas variables `F24_XML_PATH`, `F9_XML_PATH`, `F40_XML_PATH`, `F42_XML_PATH`, `OUTPUT_XML_PATH` y `OUTPUT_STATS_XML_PATH`.
- Configurar `VITE_API_URL` y `VITE_WS_BASE_URL` con el dominio publico real del backend.
- Mantener el healthcheck de FastAPI en `/health`.

No hace falta cambiar el codigo para distinguir local/cloud si las rutas y URLs se inyectan por entorno.
