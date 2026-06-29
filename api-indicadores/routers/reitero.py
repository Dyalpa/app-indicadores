import os
from fastapi import APIRouter
import pandas as pd
import numpy as np

router = APIRouter()

EXCEL_REITERO = "data_sources/Reitero.xlsx"
PARQUET_REITERO = "data_sources/reitero.parquet"

COLUMNAS_REQUERIDAS_REITERO = [
    "VISION", "NUMERO_INCIDENTE", "FECHA_CREACION", "ACCESS_ID", 
    "OBSERVACIONES_DIAGNOSTICO", "DEPARTAMENTO", "CIUDAD", "TOA_NUMERO_DE_ORDEN", 
    "TOA_FECHA_DE_CIERRE_FINAL", "TOA_APERTURA_AVERIA", "TOA_CIERRE_AVERIA", 
    "TOA_EXTERNAL_ID", "TOA_PROVIDER_SOURCE", "TOA_ESTADO_FINAL", "TOA_ARMARIO", 
    "TOA_CAJA", "EXCLUSION", "NUMERO_INCIDENTE_PADRE", "ACCESS_ID_PADRE", 
    "FECHA_CIERRE_PADRE", "ESTADO_FINAL_PADRE", "TOA_EXTERNAL_ID_PADRE", 
    "TOA_PROVIDER_SOURCE_PADRE", "TOA_APERTURA_AVERIA_PADRE", 
    "TOA_CIERRE_AVERIA_PADRE", "DIAS_REITERO", "AVERIA", "REITERO"
]

def extraer_origen(texto):
    """Extrae el origen antes de los primeros ':' en OBSERVACIONES_DIAGNOSTICO"""
    if pd.isna(texto) or not isinstance(texto, str):
        return "DESCONOCIDO"
    partes = texto.split(":")
    if len(partes) > 1:
        return partes[0].strip()
    return "OTRO"

def asignar_rango_dias(dias):
    """Crea rangos de días agrupados cada 6 días (0-5, 6-11, 12-17, etc.)"""
    try:
        val = int(float(dias))
        if val < 0:
            return "Sin Rango"
        inicio = (val // 6) * 6
        fin = inicio + 5
        return f"De {inicio} a {fin} días"
    except (ValueError, TypeError):
        return "Sin Rango"

def obtener_reitero_optimizados():
    if not os.path.exists(EXCEL_REITERO):
        if os.path.exists(PARQUET_REITERO):
            return pd.read_parquet(PARQUET_REITERO)
        raise FileNotFoundError(f"No se encontró el archivo '{EXCEL_REITERO}'")

    reconstruir = False
    if not os.path.exists(PARQUET_REITERO) or os.path.getmtime(EXCEL_REITERO) > os.path.getmtime(PARQUET_REITERO):
        reconstruir = True

    if reconstruir:
        print("🔄 [Reitero] Actualizando caché Parquet con columnas seleccionadas...")
        df = pd.read_excel(EXCEL_REITERO, usecols=COLUMNAS_REQUERIDAS_REITERO)
        
        # 🟢 REGLA: Tomar en cuenta solo filas con EXCLUSION == "NO"
        df = df[df["EXCLUSION"].astype(str).str.upper().str.strip() == "NO"]
        
        # Formatear y asegurar tipos numéricos en marcas analíticas
        df["REITERO"] = pd.to_numeric(df["REITERO"], errors="coerce").fillna(0).astype(int)
        df["AVERIA"] = pd.to_numeric(df["AVERIA"], errors="coerce").fillna(1).astype(int)
        
        # Convertir fechas de manera segura
        df["FECHA_CREACION"] = pd.to_datetime(df["FECHA_CREACION"], errors="coerce")
        df["TOA_FECHA_DE_CIERRE_FINAL"] = pd.to_datetime(df["TOA_FECHA_DE_CIERRE_FINAL"], errors="coerce")
        
        # Limpieza de textos de control comunes
        for col in ["VISION", "DEPARTAMENTO", "CIUDAD", "TOA_PROVIDER_SOURCE", "TOA_PROVIDER_SOURCE_PADRE"]:
            if col in df.columns:
                df[col] = df[col].astype(str).str.strip().str.upper()
                
        os.makedirs(os.path.dirname(PARQUET_REITERO), exist_ok=True)
        df.to_parquet(PARQUET_REITERO, index=False)
        return df
    return pd.read_parquet(PARQUET_REITERO)


@router.get("/reitero")
def informe_reitero():
    df = obtener_reitero_optimizados()
    df = df.where(pd.notnull(df), None)
    
    # 🔍 Aplicar transformaciones al vuelo sobre los datos filtrados
    df["Origen_Averia"] = df["OBSERVACIONES_DIAGNOSTICO"].apply(extraer_origen)
    df["Rango_Dias_Reitero"] = df["DIAS_REITERO"].apply(asignar_rango_dias)
    
    # Extraer métricas de tiempo basadas en FECHA_CREACION (Ingresos)
    df["Dia_Ingreso"] = df["FECHA_CREACION"].dt.day
    df["Mes_Ingreso"] = df["FECHA_CREACION"].dt.month
    
    # --- 📊 1. KPIs GLOBALES ---
    total_averias = int(df["AVERIA"].sum())
    total_reiteros = int(df["REITERO"].sum())
    tasa_reitero_global = round((total_reiteros / total_averias * 100), 2) if total_averias > 0 else 0.0

    # --- 🏢 2. SEGMENTACIÓN POR VISIÓN (CLIENTE VS TERRENO) ---
    seg_vision = df.groupby("VISION").agg(
        Averias=("AVERIA", "sum"),
        Reiteros=("REITERO", "sum")
    ).reset_index()
    seg_vision["Tasa_Reitero"] = (seg_vision["Reiteros"] / seg_vision["Averias"] * 100).round(2)
    
    # --- ⏳ 3. COMPORTAMIENTO POR RANGOS DE DÍAS (0-5, 6-11, etc.) ---
    # Filtrar solo donde efectivamente hubo reitero para armar la distribución de días
    df_reiteros_only = df[df["REITERO"] == 1]
    seg_rangos = df_reiteros_only.groupby("Rango_Dias_Reitero").agg(
        Cantidad_Casos=("NUMERO_INCIDENTE", "count")
    ).reset_index()

    # --- 👨‍🔧 4. ATRIBUCIÓN COHORTES Y REITEROS POR TÉCNICO ---
    # Regla: Atendido = Cantidad de averías cerradas por él (TOA_PROVIDER_SOURCE)
    tecnicos_atendidas = df.groupby(["TOA_PROVIDER_SOURCE", "DEPARTAMENTO"]).agg(
        Averias_Atendidas=("AVERIA", "sum")
    ).reset_index().rename(columns={"TOA_PROVIDER_SOURCE": "Tecnico"})

    # Regla: Causante = Cantidad de reiteros cuya orden PADRE cerró él (TOA_PROVIDER_SOURCE_PADRE)
    tecnicos_causados = df_reiteros_only.groupby(["TOA_PROVIDER_SOURCE_PADRE", "DEPARTAMENTO"]).agg(
        Reiteros_Causados=("REITERO", "sum")
    ).reset_index().rename(columns={"TOA_PROVIDER_SOURCE_PADRE": "Tecnico"})

    # Fusionar ambas métricas operativas por técnico y departamento
    ranking_tecnicos = pd.merge(tecnicos_atendidas, tecnicos_causados, on=["Tecnico", "DEPARTAMENTO"], how="outer").fillna(0)
    ranking_tecnicos["Averias_Atendidas"] = ranking_tecnicos["Averias_Atendidas"].astype(int)
    ranking_tecnicos["Reiteros_Causados"] = ranking_tecnicos["Reiteros_Causados"].astype(int)
    
    # Calcular indicador individual por técnico: Reiteros Causados / Averías Atendidas
    ranking_tecnicos["Tasa_Reitero_Tecnico"] = (ranking_tecnicos["Reiteros_Causados"] / ranking_tecnicos["Averias_Atendidas"] * 100).replace([np.inf, -np.inf], 0).fillna(0).round(2)
    # Ordenar por los técnicos que más impacto negativo o reiteros causan
    ranking_tecnicos = ranking_tecnicos.sort_values(by="Reiteros_Causados", ascending=False)

    # --- 📅 5. CURVA DE INGRESOS DIARIOS (FECHA_CREACION) ---
    ingresos_diarios = df.groupby(["Mes_Ingreso", "Dia_Ingreso"]).agg(
        Averias_Ingresadas=("AVERIA", "sum"),
        Reiteros_Ingresados=("REITERO", "sum")
    ).reset_index().sort_values(["Mes_Ingreso", "Dia_Ingreso"])

    # Listas auxiliares para los filtros dinámicos en tu UI minimalista de React
    departamentos = df["DEPARTAMENTO"].dropna().unique().tolist()
    ciudades = df["CIUDAD"].dropna().unique().tolist()
    origenes = df["Origen_Averia"].dropna().unique().tolist()

    return {
        "kpis_globales": {
            "total_averias": total_averias,
            "total_reiteros": total_reiteros,
            "tasa_reitero_global": tasa_reitero_global
        },
        "filtros_disponibles": {
            "departamentos": departamentos,
            "ciudades": ciudades,
            "origenes_diagnostico": origenes
        },
        "segmentacion_vision": seg_vision.to_dict(orient="records"),
        "distribucion_rangos_dias": seg_rangos.to_dict(orient="records"),
        "curva_ingresos_diarios": ingresos_diarios.to_dict(orient="records"),
        "analisis_tecnicos_reitero": ranking_tecnicos.head(150).to_dict(orient="records") # Top 150 para optimizar peso JSON
    }