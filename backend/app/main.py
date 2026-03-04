from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from contextlib import asynccontextmanager
import asyncio
from dotenv import load_dotenv

from app.core.logging import setup_logging

load_dotenv()
setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("⚙️ Iniciando servidor...")
    task = asyncio.create_task(
        # watch_simulated_real_time_data(
        #     poll_interval=3,
        #     on_new_data=on_new_data_callback
        # )
    )
    print("✅ Monitoreo de datos simulados iniciado")
    
    yield
    
    # Shutdown
    print("🛑 Servidor apagándose...")
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

app = FastAPI(
    title="Real-Time Football Dashboard API",
    description="API para el dashboard de fútbol en tiempo real",
    version="1.0.0",
    lifespan=lifespan
)

# Configurar CORS
origins = [
    "http://localhost:5173",  # Vite dev server
    "http://localhost:3000",  # Alternativa
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)