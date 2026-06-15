import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from datetime import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

EXCEL_FILE = "productividad.xlsx"
PARQUET_FILE = "productividad.parquet"

FESTIVOS = [
    "2025-10-13", "2025-11-03", "2025-03-17", "2025-12-08", "2025-12-25",
    "2026-01-01", "2026-01-12", "2026-03-23", "2026-04-02", "2026-04-03",
    "2026-05-01", "2026-05-25", "2026-06-15", "2026-06-22", "2026-07-20",
    "2026-08-07", "2026-08-17", "2026-10-12", "2026-11-02", "2026-11-16",
    "2026-12-08", "2026-12-25"
]
festivos_set = pd.to_datetime(FESTIVOS).date

# Diccionario para traducir meses automáticamente
MESES_ESPANOL = {
    "January": "Enero", "February": "Febrero", "March": "Marzo", "April": "Abril",
    "May": "Mayo", "June": "Junio", "July": "Julio", "August": "Agosto",
    "September": "Septiembre", "October": "Octubre", "November": "Noviembre", "December": "Diciembre"
}

def obtener_datos_optimizados():
    if not os.path.exists(EXCEL_FILE):
        if os.path.exists(PARQUET_FILE):
            return pd.read_parquet(PARQUET_FILE)
        raise FileNotFoundError(f"No se encontró el archivo '{EXCEL_FILE}'")

    reconstruir = False
    if not os.path.exists(PARQUET_FILE):
        reconstruir = True
    else:
        if os.path.getmtime(EXCEL_FILE) > os.path.getmtime(PARQUET_FILE):
            reconstruir = True

    if reconstruir:
        print("🔄 Actualizando caché...")
        df = pd.read_excel(EXCEL_FILE, sheet_name="Base")
        df.to_parquet(PARQUET_FILE, index=False)
        return df
    return pd.read_parquet(PARQUET_FILE)

@app.get("/informe")
def informe():
    df = obtener_datos_optimizados()
    df = df.where(pd.notnull(df), None)
    
    df["Fecha_de_cierre_final"] = pd.to_datetime(df["Fecha_de_cierre_final"], errors="coerce")
    df = df.dropna(subset=["Fecha_de_cierre_final"])
    
    df["Mes_Ingles"] = df["Fecha_de_cierre_final"].dt.month_name()
    df["Mes"] = df["Mes_Ingles"].map(MESES_ESPANOL).fillna(df["Mes_Ingles"])
    df["Solo_Fecha"] = df["Fecha_de_cierre_final"].dt.date
    df["Dia_Del_Mes"] = df["Fecha_de_cierre_final"].dt.day

    # Identificar no laborales
    df["Es_Domingo"] = df["Fecha_de_cierre_final"].dt.dayofweek == 6
    df["Es_Festivo"] = df["Solo_Fecha"].isin(festivos_set)
    df["Es_No_Laboral"] = df["Es_Domingo"] | df["Es_Festivo"]

    # Generar un catálogo de metadatos por día para el frontend (Día -> Inicial, Es_No_Laboral)
    # Esto asegura que sepamos qué día es qué sin importar el mes seleccionado
    df["Inicial_Dia"] = df["Fecha_de_cierre_final"].dt.day_name().str[0] # M, T, W, T, F, S, S (Luego lo mapeamos)
    
    # Mapeo rápido de iniciales al español
    mapa_iniciales = {"Monday": "L", "Tuesday": "M", "Wednesday": "M", "Thursday": "J", "Friday": "V", "Saturday": "S", "Sunday": "D"}
    df["Inicial_Es"] = df["Fecha_de_cierre_final"].dt.day_name().map(mapa_iniciales)

    fecha_modificacion = datetime.fromtimestamp(os.path.getmtime(EXCEL_FILE)).strftime('%d/%m/%Y %I:%M %p')
    
    meses_disponibles = [m for m in list(MESES_ESPANOL.values()) if m in df["Mes"].unique()]
    departamentos_disponibles = df["Departamento"].dropna().unique().tolist()
    tipos_orden_disponibles = df["Tipo_de_orden"].dropna().unique().tolist()

    agrupado_por_dia = df.groupby([
        "Nombre_Tecnico", "Departamento", "Mes", "Dia_Del_Mes", "Tipo_de_orden", "Es_No_Laboral"
    ]).agg(
        Cantidad=("Pet_atis", "count")
    ).reset_index()

    # Mapeo de días del mes con sus propiedades de calendario
    df_dias = df[["Mes", "Dia_Del_Mes", "Inicial_Es", "Es_No_Laboral"]].drop_duplicates().sort_values("Dia_Del_Mes")
    calendario_meses = {}
    for m in meses_disponibles:
        df_m = df_dias[df_dias["Mes"] == m]
        calendario_meses[m] = df_m.to_dict(orient="records")

    kpis_globales = {
        "Total_Ordenes_Empresa": int(df["Pet_atis"].count()),
        "Total_Dias_Operados": int(df["Solo_Fecha"].nunique())
    }

    return {
        "fuente_metadatos": {
            "archivo": EXCEL_FILE,
            "total_registros": int(df.shape[0]),
            "ultima_actualizacion": fecha_modificacion
        },
        "filtros_disponibles": {
            "meses": meses_disponibles,
            "departamentos": departamentos_disponibles,
            "tipos_orden": tipos_orden_disponibles,
            "calendario_por_mes": calendario_meses # 👈 Enviamos los días estructurados con su inicial y si es festivo
        },
        "kpis_globales": kpis_globales,
        "lineas_productividad_base": agrupado_por_dia.to_dict(orient="records")
    }