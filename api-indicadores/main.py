from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import productividad
from routers import reitero

app = FastAPI(title="API Central de Indicadores", version="2.0")

# 🌐 Configuración de orígenes permitidos (CORS)
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://fs9xp008-5173.use.devtunnels.ms"  # Tu túnel público de React autorizado
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🗺️ Registro de Rutas Modulares
# Esto monta tu informe actual bajo el prefijo "/api", respondiendo en "/api/informe"
app.include_router(productividad.router, prefix="/api", tags=["Productividad"])
app.include_router(reitero.router, prefix="/api", tags=["Reitero"])

@app.get("/")
def home():
    return {"status": "API Central de Indicadores Operando de forma Modular"}