import os
import datetime
from fastapi import APIRouter
import pandas as pd
from typing import Optional

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

# 🇨🇴 ESTRUCTURA INMANIPULABLE: Tuplas numéricas directas (Año, Mes, Día)
FESTIVOS_TUPLAS = {
    # Año 2026
    (2026, 1, 1),   # Año Nuevo
    (2026, 1, 12),  # Reyes Magos
    (2026, 3, 23),  # San José
    (2026, 4, 2),   # Jueves Santo
    (2026, 4, 3),   # Viernes Santo
    (2026, 5, 1),   # Día del Trabajo
    (2026, 5, 25),  # Ascensión
    (2026, 6, 8),  # Corpus Christi
    (2026, 6, 15),  # Sagrado Corazón
    (2026, 6, 29),  # San Pedro y San Pablo
    (2026, 7, 13),  # Vírgen de Chiquinquirá
    (2026, 7, 20),  # Independencia
    (2026, 8, 7),   # Batalla de Boyacá
    (2026, 8, 17),  # Asunción
    (2026, 10, 12), # Día de la Raza
    (2026, 11, 2),  # Todos los Santos
    (2026, 11, 16), # Independencia de Cartagena
    (2026, 12, 8),  # Inmaculada Concepción
    (2026, 12, 25)  # Navidad
}

mapa_iniciales = {
    "Monday": "L", "Tuesday": "M", "Wednesday": "M", "Thursday": "J", 
    "Friday": "V", "Saturday": "S", "Sunday": "D"
}

def extraer_origen(texto):
    if pd.isna(texto) or not isinstance(texto, str):
        return "DESCONOCIDO"
    partes = texto.split(":")
    if len(partes) > 1:
        return partes[0].strip().upper()
    return "OTRO"

def asignar_rango_dias(dias):
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

    reconstruir = not os.path.exists(PARQUET_REITERO) or os.path.getmtime(EXCEL_REITERO) > os.path.getmtime(PARQUET_REITERO)

    if reconstruir:
        print("🔄 [Reitero] Actualizando caché Parquet...")
        dtypes_iniciales = {"TOA_EXTERNAL_ID": str, "TOA_EXTERNAL_ID_PADRE": str, "TOA_CAJA": str}
        df = pd.read_excel(EXCEL_REITERO, usecols=COLUMNAS_REQUERIDAS_REITERO, dtype=dtypes_iniciales)
        
        df = df[df["EXCLUSION"].astype(str).str.upper().str.strip() == "NO"]
        df["REITERO"] = pd.to_numeric(df["REITERO"], errors="coerce").fillna(0).astype(int)
        df["AVERIA"] = pd.to_numeric(df["AVERIA"], errors="coerce").fillna(1).astype(int)
        
        df["FECHA_CREACION"] = pd.to_datetime(df["FECHA_CREACION"], errors="coerce")
        df["TOA_FECHA_DE_CIERRE_FINAL"] = pd.to_datetime(df["TOA_FECHA_DE_CIERRE_FINAL"], errors="coerce")
        
        for id_col in ["TOA_EXTERNAL_ID", "TOA_EXTERNAL_ID_PADRE"]:
            if id_col in df.columns:
                df[id_col] = df[id_col].astype(str).str.strip().replace(["nan", "NAN", "null", "NULL", "None", ""], "SIN_ID")

        for col in ["VISION", "DEPARTAMENTO", "CIUDAD", "TOA_PROVIDER_SOURCE", "TOA_PROVIDER_SOURCE_PADRE", "TOA_CAJA"]:
            if col in df.columns:
                df[col] = df[col].astype(str).str.strip().str.upper()
                
        os.makedirs(os.path.dirname(PARQUET_REITERO), exist_ok=True)
        df.to_parquet(PARQUET_REITERO, index=False)
        return df
    return pd.read_parquet(PARQUET_REITERO)


@router.get("/reitero")
def informe_reitero(
    mes: Optional[str] = None,
    dia_inicio: Optional[int] = None,
    dia_fin: Optional[int] = None,
    departamento: Optional[str] = None,
    vision: Optional[str] = None,
    tecnico: Optional[str] = None,
    origen: Optional[str] = None,
    cto: Optional[str] = None
):
    df_base = obtener_reitero_optimizados()
    
    df_base["FECHA_CREACION_DATETIME"] = pd.to_datetime(df_base["FECHA_CREACION"])
    df_base["Dia_Ingreso"] = df_base["FECHA_CREACION_DATETIME"].dt.day
    df_base["Mes_Ingreso"] = df_base["FECHA_CREACION_DATETIME"].dt.month
    df_base["Origen_Averia"] = df_base["OBSERVACIONES_DIAGNOSTICO"].apply(extraer_origen)
    df_base["Rango_Dias_Reitero"] = df_base["DIAS_REITERO"].apply(asignar_rango_dias)

    meses_mapeo = {
        "Enero": 1, "Febrero": 2, "Marzo": 3, "Abril": 4, "Mayo": 5, "Junio": 6, 
        "Julio": 7, "Agosto": 8, "Septiembre": 9, "Octubre": 10, "Noviembre": 11, "Diciembre": 12
    }
    
    departamentos_lista = sorted(df_base["DEPARTAMENTO"].dropna().unique().tolist())
    ciudades_lista = sorted(df_base["CIUDAD"].dropna().unique().tolist())
    origenes_lista = sorted(df_base["Origen_Averia"].dropna().unique().tolist())
    ctos_lista = sorted(df_base["TOA_CAJA"].dropna().unique().tolist())
    tecnicos_lista = sorted(df_base["TOA_PROVIDER_SOURCE"].dropna().unique().tolist())

    # --- 📅 GENERACIÓN LIMPIA DEL CALENDARIO (Garantiza 8 y 15 completos) ---
    calendario_por_mes = {}
    for mes_nombre, mes_num in meses_mapeo.items():
        try:
            start_date = f"2026-{str(mes_num).zfill(2)}-01"
            end_date = str(pd.to_datetime(start_date) + pd.offsets.MonthEnd(0).date())
            rango_fechas = pd.date_range(start=start_date, end=end_date)
            
            dias_lista = []
            for fecha in rango_fechas:
                nombre_dia_en = fecha.strftime('%A')
                
                # 🎯 COMPARACIÓN NUMÉRICA DIRECTA: (Año, Mes, Día)
                tupla_fecha_actual = (int(fecha.year), int(fecha.month), int(fecha.day))
                
                es_domingo = (fecha.dayofweek == 6)
                es_festivo_lista = tupla_fecha_actual in FESTIVOS_TUPLAS
                
                es_festivo_final = es_domingo or es_festivo_lista
                
                dias_lista.append({
                    "Dia_Del_Mes": int(fecha.day),
                    "Inicial_Es": mapa_iniciales.get(nombre_dia_en, "D"),
                    "Es_Festivo": bool(es_festivo_final)
                })
            calendario_por_mes[mes_nombre] = dias_lista
        except Exception:
            calendario_por_mes[mes_nombre] = []

    # --- 🌊 CASCADA DE FILTROS ---
    df_filtrado = df_base.copy()
    if mes and mes in meses_mapeo:
        df_filtrado = df_filtrado[df_filtrado["Mes_Ingreso"] == meses_mapeo[mes]]
    if dia_inicio is not None:
        df_filtrado = df_filtrado[df_filtrado["Dia_Ingreso"] >= dia_inicio]
    if dia_fin is not None:
        df_filtrado = df_filtrado[df_filtrado["Dia_Ingreso"] <= dia_fin]
    if departamento:
        df_filtrado = df_filtrado[df_filtrado["DEPARTAMENTO"] == departamento.strip().upper()]
    if vision:
        df_filtrado = df_filtrado[df_filtrado["VISION"] == vision.strip().upper()]
    if tecnico:
        df_filtrado = df_filtrado[(df_filtrado["TOA_PROVIDER_SOURCE"] == tecnico.strip().upper()) | (df_filtrado["TOA_PROVIDER_SOURCE_PADRE"] == tecnico.strip().upper())]
    if origen:
        df_filtrado = df_filtrado[df_filtrado["Origen_Averia"] == origen.strip().upper()]
    if cto:
        df_filtrado = df_filtrado[df_filtrado["TOA_CAJA"] == cto.strip().upper()]

    # --- 📊 MÉTRICAS ---
    total_averias = int(df_filtrado["AVERIA"].sum())
    total_reiteros = int(df_filtrado["REITERO"].sum())
    tasa_reitero_global = round((total_reiteros / total_averias * 100), 2) if total_averias > 0 else 0.0

    seg_vision = df_filtrado.groupby("VISION").agg(Averias=("AVERIA", "sum"), Reiteros=("REITERO", "sum")).reset_index()
    if not seg_vision.empty:
        seg_vision["Tasa_Reitero"] = (seg_vision["Reiteros"] / seg_vision["Averias"] * 100).round(2)

    df_reiteros_only = df_filtrado[df_filtrado["REITERO"] == 1]
    seg_rangos = df_reiteros_only.groupby("Rango_Dias_Reitero").agg(Cantidad_Casos=("NUMERO_INCIDENTE", "count")).reset_index()

    tecnicos_atendidas = df_filtrado.groupby(["TOA_PROVIDER_SOURCE", "DEPARTAMENTO"]).agg(Averias_Atendidas=("AVERIA", "sum")).reset_index().rename(columns={"TOA_PROVIDER_SOURCE": "Tecnico"})
    tecnicos_causados = df_reiteros_only.groupby(["TOA_PROVIDER_SOURCE_PADRE", "DEPARTAMENTO"]).agg(Reiteros_Causados=("REITERO", "sum")).reset_index().rename(columns={"TOA_PROVIDER_SOURCE_PADRE": "Tecnico"})

    ranking_tecnicos = pd.merge(tecnicos_atendidas, tecnicos_causados, on=["Tecnico", "DEPARTAMENTO"], how="outer").fillna(0)
    ranking_tecnicos["Averias_Atendidas"] = ranking_tecnicos["Averias_Atendidas"].astype(int)
    ranking_tecnicos["Reiteros_Causados"] = ranking_tecnicos["Reiteros_Causados"].astype(int)
    ranking_tecnicos["Tasa_Reitero_Tecnico"] = 0.0
    
    mascara_atendidas = ranking_tecnicos["Averias_Atendidas"] > 0
    ranking_tecnicos.loc[mascara_atendidas, "Tasa_Reitero_Tecnico"] = ((ranking_tecnicos.loc[mascara_atendidas, "Reiteros_Causados"] / ranking_tecnicos.loc[mascara_atendidas, "Averias_Atendidas"]) * 100).round(2)
    ranking_tecnicos = ranking_tecnicos.sort_values(by="Reiteros_Causados", ascending=False)

    ingresos_diarios = df_filtrado.groupby(["Mes_Ingreso", "Dia_Ingreso", "VISION", "DEPARTAMENTO"]).agg(Averias_Ingresadas=("AVERIA", "sum"), Reiteros_Ingresados=("REITERO", "sum")).reset_index().sort_values(["Mes_Ingreso", "Dia_Ingreso"])

    df_filtrado = df_filtrado.where(pd.notnull(df_filtrado), None)

    fuente_metadatos = {
        "fuente": os.path.basename(EXCEL_REITERO),
        "total_registros": len(df_base),
        "filtrados_en_vista": len(df_filtrado),
        "fecha_actualizacion": datetime.datetime.fromtimestamp(os.path.getmtime(EXCEL_REITERO)).strftime('%Y-%m-%d %H:%M:%S'),
        "detalles": f"Módulo Control de Reiteros | {total_averias:,} Averías"
    }

    return {
        "fuente_metadatos": fuente_metadatos,
        "kpis_globales": {"total_averias": total_averias, "total_reiteros": total_reiteros, "tasa_reitero_global": tasa_reitero_global},
        "filtros_disponibles": {
            "departamentos": departamentos_lista,
            "ciudades": ciudades_lista,
            "origenes_diagnostico": origenes_lista,
            "ctos": ctos_lista,
            "tecnicos": tecnicos_lista,
            "meses": list(calendario_por_mes.keys()),
            "calendario_por_mes": calendario_por_mes
        },
        "segmentacion_vision": seg_vision.to_dict(orient="records"),
        "distribucion_rangos_dias": seg_rangos.to_dict(orient="records"),
        "curva_ingresos_diarios": ingresos_diarios.to_dict(orient="records"),
        "analisis_tecnicos_reitero": ranking_tecnicos.head(150).to_dict(orient="records")
    }