import time
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from routers import productividad
from routers import reitero
from routers import infancia

# 📋 Configuración de logging para medir tiempos de procesamiento reales.
# Esto nos permite distinguir si el 504 lo causa el backend (lento) o el
# túnel de VS Code (se cae/timeout independientemente de tu código).
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)
logger = logging.getLogger("timing")

app = FastAPI(title="API Central de Indicadores", version="2.0")

# 🌐 Configuración de orígenes permitidos (CORS)
# ⚠️ IMPORTANTE: los "quick tunnels" de Cloudflare (trycloudflare.com) generan
# una URL nueva cada vez que reinicias `cloudflared`. Cuando levantes el túnel
# del FRONTEND (puerto 5173), reemplaza la URL de abajo con la que te entregue
# la consola en ese momento.
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://fs9xp008-5173.use.devtunnels.ms",  # Túnel de devtunnels (se deja como respaldo)
    "https://chamber-inch-plane-wealth.trycloudflare.com"  # Túnel de Cloudflare del frontend
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🗜️ Compresión GZip — reduce drásticamente el peso de las respuestas JSON grandes,
# clave para que no truene el timeout del túnel devtunnels
app.add_middleware(GZipMiddleware, minimum_size=500)


# ⏱️ MIDDLEWARE DE DIAGNÓSTICO: mide cuánto tarda tu backend en procesar
# cada request, sin contar el tiempo de red/túnel. Revisa la consola donde
# corre uvicorn cada vez que el frontend reporte lentitud o 504 — si aquí
# el tiempo es bajo (1-3s) pero el navegador ve 504, el problema es el túnel,
# no tu código.
@app.middleware("http")
async def log_tiempo_procesamiento(request, call_next):
    inicio = time.time()
    try:
        response = await call_next(request)
    except Exception as exc:
        duracion = time.time() - inicio
        logger.error(
            f"❌ ERROR {request.method} {request.url.path}?{request.url.query} "
            f"-> {duracion:.2f}s | excepción: {exc}"
        )
        raise

    duracion = time.time() - inicio

    # Marca visualmente las respuestas lentas (>3s) para detectarlas rápido en el log
    marca = "🐢 LENTO" if duracion > 3 else "✅"

    logger.info(
        f"{marca} {request.method} {request.url.path}?{request.url.query} "
        f"-> {duracion:.2f}s [status={response.status_code}]"
    )
    return response


# 🗺️ Registro de Rutas Modulares
app.include_router(productividad.router, prefix="/api", tags=["Productividad"])
app.include_router(reitero.router, prefix="/api", tags=["Reitero"])
app.include_router(infancia.router, prefix="/api", tags=["Infancia"])



@app.get("/")
def home():
    return {"status": "API Central de Indicadores Operando de forma Modular"}