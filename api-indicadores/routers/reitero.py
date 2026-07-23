import os
import datetime
from typing import Optional
from fastapi import APIRouter
import pandas as pd
import numpy as np

router = APIRouter()

# 🗺️ COLUMNAS REQUERIDAS
COLUMNAS_REQUERIDAS_REITERO = [
    "VISION", "NUMERO_INCIDENTE", "FECHA_CREACION", "ACCESS_ID", 
    "OBSERVACIONES_DIAGNOSTICO", "DEPARTAMENTO", "CIUDAD", "TOA_NUMERO_DE_ORDEN", 
    "TOA_FECHA_DE_CIERRE_FINAL", "TOA_APERTURA_AVERIA", "TOA_CIERRE_AVERIA", 
    "TOA_EXTERNAL_ID", "TOA_PROVIDER_SOURCE", "TOA_ESTADO_FINAL", "TOA_ARMARIO", 
    "TOA_CAJA", "EXCLUSION", "NUMERO_INCIDENTE_PADRE", "ACCESS_ID_PADRE", 
    "FECHA_CIERRE_PADRE", "ESTADO_FINAL_PADRE", "TOA_EXTERNAL_ID_PADRE", 
    "TOA_PROVIDER_SOURCE_PADRE", "TOA_APERTURA_AVERIA_PADRE", 
    "TOA_CIERRE_AVERIA_PADRE", "DIAS_REITERO", "AVERIA", "REITERO", "COORDENADAS"
]

# 🇨🇴 ESTRUCTURA DE FESTIVOS
FESTIVOS_TUPLAS = {
    (2026, 1, 1), (2026, 1, 12), (2026, 3, 23), (2026, 4, 2), (2026, 4, 3),
    (2026, 5, 1), (2026, 5, 25), (2026, 6, 8), (2026, 6, 15), (2026, 6, 29),
    (2026, 7, 13), (2026, 7, 20), (2026, 8, 7), (2026, 8, 17), (2026, 10, 12),
    (2026, 11, 2), (2026, 11, 16), (2026, 12, 8), (2026, 12, 25)
}

mapa_iniciales = {
    "Monday": "L", "Tuesday": "M", "Wednesday": "M", "Thursday": "J", 
    "Friday": "V", "Saturday": "S", "Sunday": "D"
}

numero_a_mes_nombre = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril", 5: "Mayo", 6: "Junio",
    7: "Julio", 8: "Agosto", 9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"
}

meses_mapeo = {v: k for k, v in numero_a_mes_nombre.items()}


def extraer_origen(texto):
    if pd.isna(texto) or not isinstance(texto, str):
        return "DESCONOCIDO"
    texto_limpio = texto.strip()
    if not texto_limpio:
        return "DESCONOCIDO"
    partes = texto_limpio.split(":", 1)
    origen = partes[0].strip().upper()
    if origen == "" or len(origen) > 40:  
        return "OTRO"
    return origen


def extraer_coordenadas_vectorizada(series_coordenadas):
    coords_df = pd.DataFrame(index=series_coordenadas.index)
    coords_df["lat"] = None
    coords_df["lng"] = None
    
    series_str = series_coordenadas.astype(str)
    mask_valid = series_coordenadas.notna() & series_str.str.contains("LAT:", na=False) & series_str.str.contains("LON:", na=False)
    valid_series = series_str[mask_valid].str.upper()

    if not valid_series.empty:
        try:
            lats = valid_series.str.split("LAT:").str[1].str.split("LON:").str[0].str.strip()
            longs = valid_series.str.split("LON:").str[1].str.strip()
            coords_df.loc[mask_valid, "lat"] = pd.to_numeric(lats, errors="coerce")
            coords_df.loc[mask_valid, "lng"] = pd.to_numeric(longs, errors="coerce")
        except Exception:
            pass

    return coords_df["lat"], coords_df["lng"]


def asignar_rango_dias_series(series_dias):
    dias_num = pd.to_numeric(series_dias, errors="coerce")
    bins = [-1, 5, 10, 15, 20, 25, 30, np.inf]
    labels = [
        "0 a 5 días", 
        "6 a 10 días", 
        "11 a 15 días", 
        "16 a 20 días", 
        "21 a 25 días", 
        "26 a 30 días", 
        "> 30 días"
    ]
    rangos = pd.cut(dias_num, bins=bins, labels=labels)
    return rangos.astype(str).replace({"nan": "Sin Rango", "NaN": "Sin Rango"})


def obtener_reitero_optimizados(nombre_mes: Optional[str] = None):
    if nombre_mes:
        excel_path = f"data_sources/Reitero_{nombre_mes.capitalize()}.xlsx"
        parquet_path = f"data_sources/reitero_{nombre_mes.lower()}.parquet"
    else:
        excel_path = "data_sources/Reitero_Junio.xlsx"
        parquet_path = "data_sources/reitero_junio.parquet"

    # 🛡️ Protección de respaldo si el mes solicitado no existe físicamente
    if not os.path.exists(excel_path):
        if os.path.exists(parquet_path):
            return pd.read_parquet(parquet_path)
        
        excel_path = "data_sources/Reitero_Junio.xlsx"
        parquet_path = "data_sources/reitero_junio.parquet"
        
        if not os.path.exists(excel_path):
            raise FileNotFoundError(f"No se encontró ningún archivo de respaldo en data_sources/")

    reconstruir = not os.path.exists(parquet_path) or os.path.getmtime(excel_path) > os.path.getmtime(parquet_path)

    if reconstruir:
        print(f"🔄 [Reitero] Actualizando caché Parquet...")
        dtypes_iniciales = {
            "TOA_EXTERNAL_ID": str, 
            "TOA_EXTERNAL_ID_PADRE": str, 
            "TOA_CAJA": str, 
            "COORDENADAS": str,
            "ACCESS_ID": str,
            "ACCESS_ID_PADRE": str,
            "EXCLUSION": str
        }
        df = pd.read_excel(excel_path, usecols=COLUMNAS_REQUERIDAS_REITERO, dtype=dtypes_iniciales)
        
        df["EXCLUSION"] = df["EXCLUSION"].fillna("").astype(str).str.strip().str.upper()
        df = df[df["EXCLUSION"] == "NO"]
        
        df["REITERO"] = pd.to_numeric(df["REITERO"], errors="coerce").fillna(0).astype(int)
        df["AVERIA"] = pd.to_numeric(df["AVERIA"], errors="coerce").fillna(1).astype(int)
        
        df["FECHA_CREACION"] = pd.to_datetime(df["FECHA_CREACION"], errors="coerce")
        df["TOA_FECHA_DE_CIERRE_FINAL"] = pd.to_datetime(df["TOA_FECHA_DE_CIERRE_FINAL"], errors="coerce")
        
        for id_col in ["TOA_EXTERNAL_ID", "TOA_EXTERNAL_ID_PADRE", "ACCESS_ID", "ACCESS_ID_PADRE"]:
            if id_col in df.columns:
                df[id_col] = df[id_col].fillna("SIN_ID").astype(str).str.strip().replace(["nan", "NAN", "null", "NULL", "None", ""], "SIN_ID")

        for col in ["VISION", "DEPARTAMENTO", "CIUDAD", "TOA_PROVIDER_SOURCE", "TOA_PROVIDER_SOURCE_PADRE", "TOA_CAJA", "COORDENADAS"]:
            if col in df.columns:
                df[col] = df[col].fillna("SIN ESPECIFICAR").astype(str).str.strip().str.upper()
                
        os.makedirs(os.path.dirname(parquet_path), exist_ok=True)
        df.to_parquet(parquet_path, index=False)
        return df
    return pd.read_parquet(parquet_path)


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
    df_base = obtener_reitero_optimizados(mes)
    
    df_base["FECHA_CREACION_DATETIME"] = pd.to_datetime(df_base["FECHA_CREACION"], errors="coerce")
    df_base["Dia_Ingreso"] = df_base["FECHA_CREACION_DATETIME"].dt.day
    df_base["Mes_Ingreso"] = df_base["FECHA_CREACION_DATETIME"].dt.month
    df_base["Origen_Averia"] = df_base["OBSERVACIONES_DIAGNOSTICO"].apply(extraer_origen)
    df_base["Rango_Dias_Reitero"] = asignar_rango_dias_series(df_base["DIAS_REITERO"])

    # Extraer coordenadas
    df_base["lat"], df_base["lng"] = extraer_coordenadas_vectorizada(df_base["COORDENADAS"])

    departamentos_lista = sorted(df_base["DEPARTAMENTO"].dropna().unique().tolist())
    ciudades_lista = sorted(df_base["CIUDAD"].dropna().unique().tolist())
    origene_lista = sorted(df_base["Origen_Averia"].dropna().unique().tolist())
    ctos_lista = sorted(df_base["TOA_CAJA"].dropna().unique().tolist())
    tecnicos_lista = sorted(df_base["TOA_PROVIDER_SOURCE"].dropna().unique().tolist())

    # 🔍 DETECCIÓN DINÁMICA DE MESES DISPONIBLES SEGÚN LOS ARCHIVOS FÍSICOS EN data_sources/
    meses_disponibles_lista = []
    if os.path.exists("data_sources"):
        for archivo in os.listdir("data_sources/"):
            if archivo.startswith("Reitero_") and archivo.endswith(".xlsx"):
                # Extrae el nombre del mes del archivo (ej: Reitero_Junio.xlsx -> Junio)
                nombre_mes_archivo = archivo.replace("Reitero_", "").replace(".xlsx", "").capitalize()
                if nombre_mes_archivo not in meses_disponibles_lista:
                    meses_disponibles_lista.append(nombre_mes_archivo)
    
    # Ordenar los meses de forma cronológica si es posible
    orden_meses = list(meses_mapeo.keys())
    meses_disponibles_lista = sorted(meses_disponibles_lista, key=lambda x: orden_meses.index(x) if x in orden_meses else 99)

    # --- 📅 CALENDARIO ---
    calendario_por_mes = {}
    for mes_nombre, mes_num in meses_mapeo.items():
        try:
            start_date = f"2026-{str(mes_num).zfill(2)}-01"
            end_date = str(pd.to_datetime(start_date) + pd.offsets.MonthEnd(0).date())
            rango_fechas = pd.date_range(start=start_date, end=end_date)
            
            dias_lista = []
            for fecha in rango_fechas:
                nombre_dia_en = fecha.strftime('%A')
                tupla_fecha_actual = (int(fecha.year), int(fecha.month), int(fecha.day))
                es_domingo = (fecha.dayofweek == 6)
                es_festivo_final = es_domingo or (tupla_fecha_actual in FESTIVOS_TUPLAS)
                
                dias_lista.append({
                    "Dia_Del_Mes": int(fecha.day),
                    "Inicial_Es": mapa_iniciales.get(nombre_dia_en, "D"),
                    "Es_Festivo": bool(es_festivo_final)
                })
            calendario_por_mes[mes_nombre] = dias_lista
        except Exception:
            calendario_por_mes[mes_nombre] = []

    # --- 🌊 FILTROS ---
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
        tecnico_upper = tecnico.strip().upper()
        df_filtrado = df_filtrado[(df_filtrado["TOA_PROVIDER_SOURCE"] == tecnico_upper) | (df_filtrado["TOA_PROVIDER_SOURCE_PADRE"] == tecnico_upper)]
    if origen:
        df_filtrado = df_filtrado[df_filtrado["Origen_Averia"] == origen.strip().upper()]
    if cto:
        df_filtrado = df_filtrado[df_filtrado["TOA_CAJA"] == cto.strip().upper()]

    # --- 📊 MÉTRICAS GENERALES ---
    total_averias = int(df_filtrado["AVERIA"].sum())
    total_reiteros = int(df_filtrado["REITERO"].sum())
    tasa_reitero_global = round((total_reiteros / total_averias * 100), 2) if total_averias > 0 else 0.0

    seg_vision = df_filtrado.groupby("VISION", as_index=False).agg(Averias=("AVERIA", "sum"), Reiteros=("REITERO", "sum"))
    if not seg_vision.empty:
        seg_vision["Tasa_Reitero"] = (seg_vision["Reiteros"] / seg_vision["Averias"] * 100).round(2)

    # --- 🎯 PROCESAMIENTO DE DISTRIBUCIÓN POR RANGOS DE DÍAS ---
    df_reiteros_only = df_filtrado[df_filtrado["REITERO"] == 1].copy()

    df_reiteros_only["ACCESS_ID"] = df_reiteros_only["ACCESS_ID"].fillna("SIN_ID").astype(str).str.strip()
    df_reiteros_only["ACCESS_ID_PADRE"] = df_reiteros_only["ACCESS_ID_PADRE"].fillna("SIN_ID").astype(str).str.strip()
    df_reiteros_only["TOA_CIERRE_AVERIA"] = df_reiteros_only["TOA_CIERRE_AVERIA"].fillna("SIN ESPECIFICAR").astype(str).str.strip().str.upper()
    df_reiteros_only["TOA_CIERRE_AVERIA_PADRE"] = df_reiteros_only["TOA_CIERRE_AVERIA_PADRE"].fillna("SIN ESPECIFICAR").astype(str).str.strip().str.upper()

    seg_rangos = []
    if not df_reiteros_only.empty:
        for rango, grupo in df_reiteros_only.groupby("Rango_Dias_Reitero"):
            agrupado_casos = grupo.groupby(
                ["ACCESS_ID", "ACCESS_ID_PADRE", "TOA_CIERRE_AVERIA", "TOA_CIERRE_AVERIA_PADRE"],
                as_index=False
            ).size().rename(columns={"size": "Reiteros"})
            
            agrupado_casos["ACCESS_ID"] = np.where(
                agrupado_casos["ACCESS_ID"] != "SIN_ID", 
                agrupado_casos["ACCESS_ID"], 
                agrupado_casos["ACCESS_ID_PADRE"]
            )
            
            seg_rangos.append({
                "Rango_Dias_Reitero": rango,
                "Cantidad_Casos": len(grupo),
                "Casos": agrupado_casos.to_dict(orient="records")
            })

    # --- RANKING TÉCNICOS ---
    tecnicos_atendidas = df_filtrado.groupby(["TOA_PROVIDER_SOURCE", "DEPARTAMENTO"], as_index=False).agg(Averias_Atendidas=("AVERIA", "sum")).rename(columns={"TOA_PROVIDER_SOURCE": "Tecnico"})
    tecnicos_causados = df_reiteros_only.groupby(["TOA_PROVIDER_SOURCE_PADRE", "DEPARTAMENTO"], as_index=False).agg(Reiteros_Causados=("REITERO", "sum")).rename(columns={"TOA_PROVIDER_SOURCE_PADRE": "Tecnico"})

    ranking_tecnicos = pd.merge(tecnicos_atendidas, tecnicos_causados, on=["Tecnico", "DEPARTAMENTO"], how="outer").fillna(0)
    ranking_tecnicos["Averias_Atendidas"] = ranking_tecnicos["Averias_Atendidas"].astype(int)
    ranking_tecnicos["Reiteros_Causados"] = ranking_tecnicos["Reiteros_Causados"].astype(int)
    ranking_tecnicos["Tasa_Reitero_Tecnico"] = 0.0
    
    mascara_atendidas = ranking_tecnicos["Averias_Atendidas"] > 0
    ranking_tecnicos.loc[mascara_atendidas, "Tasa_Reitero_Tecnico"] = ((ranking_tecnicos.loc[mascara_atendidas, "Reiteros_Causados"] / ranking_tecnicos.loc[mascara_atendidas, "Averias_Atendidas"]) * 100).round(2)
    ranking_tecnicos = ranking_tecnicos.sort_values(by="Reiteros_Causados", ascending=False)

    ingresos_diarios = df_filtrado.groupby(["Mes_Ingreso", "Dia_Ingreso", "VISION", "DEPARTAMENTO"], as_index=False).agg(
        Averias_Ingresadas=("AVERIA", "sum"), 
        Reiteros_Ingresados=("REITERO", "sum")
    ).sort_values(["Mes_Ingreso", "Dia_Ingreso"])

    # --- 🧪 PROCESAMIENTO DE CAUSALES Y CAIs ---
    df_filtrado["TOA_CIERRE_AVERIA"] = df_filtrado["TOA_CIERRE_AVERIA"].fillna("SIN ESPECIFICAR").astype(str).str.strip().str.upper()

    causales_ultimas = []
    for nombre_causal, group in df_filtrado.groupby("TOA_CIERRE_AVERIA"):
        averias = int(group["AVERIA"].sum())
        reiteros = int(group["REITERO"].sum())
        tasa = round((reiteros / averias * 100), 2) if averias > 0 else 0.0
        
        group_reit = group[group["REITERO"] == 1]
        cais_list = []
        if not group_reit.empty:
            cais_grp = group_reit.groupby(["ACCESS_ID", "OBSERVACIONES_DIAGNOSTICO"], as_index=False).agg(Reiteros=("REITERO", "sum"))
            total_reit_causal = cais_grp["Reiteros"].sum()
            cais_grp["Porcentaje"] = (cais_grp["Reiteros"] / total_reit_causal * 100).round(2) if total_reit_causal > 0 else 0.0
            cais_grp = cais_grp.rename(columns={"ACCESS_ID": "CODIGO_CAI", "OBSERVACIONES_DIAGNOSTICO": "DESCRIPCION_CAI"})
            cais_list = cais_grp.to_dict(orient="records")

        causales_ultimas.append({
            "TOA_CIERRE_AVERIA": nombre_causal,
            "Averias": averias,
            "Reiteros": reiteros,
            "Tasa_Reitero": tasa,
            "cais": cais_list
        })
    causales_ultimas = sorted(causales_ultimas, key=lambda x: x["Averias"], reverse=True)

    causales_padres = []
    total_reiteros_padre_global = df_reiteros_only["REITERO"].sum()
    if not df_reiteros_only.empty:
        for nombre_padre, group in df_reiteros_only.groupby("TOA_CIERRE_AVERIA_PADRE"):
            reiteros_causados = int(group["REITERO"].sum())
            distribucion = round((reiteros_causados / total_reiteros_padre_global * 100), 2) if total_reiteros_padre_global > 0 else 0.0
            
            cais_grp = group.groupby(["ACCESS_ID_PADRE", "OBSERVACIONES_DIAGNOSTICO"], as_index=False).agg(Reiteros=("REITERO", "sum"))
            cais_grp["Porcentaje"] = (cais_grp["Reiteros"] / reiteros_causados * 100).round(2) if reiteros_causados > 0 else 0.0
            cais_grp = cais_grp.rename(columns={"ACCESS_ID_PADRE": "CODIGO_CAI", "OBSERVACIONES_DIAGNOSTICO": "DESCRIPCION_CAI"})
            
            causales_padres.append({
                "TOA_CIERRE_AVERIA_PADRE": nombre_padre,
                "Reiteros_Causados": reiteros_causados,
                "Distribucion_Porcentaje": distribucion,
                "cais": cais_grp.to_dict(orient="records")
            })
    causales_padres = sorted(causales_padres, key=lambda x: x["Reiteros_Causados"], reverse=True)

    causales_tasa = [c for c in causales_ultimas if c["Averias"] >= 3]
    causales_tasa = sorted(causales_tasa, key=lambda x: x["Tasa_Reitero"], reverse=True)

    # --- 🧹 CONVERSIÓN SEGURA DE FECHAS A STRINGS ---
    df_filtrado_limpio = df_filtrado.copy()

    columnas_fecha = [
        "FECHA_CREACION", "TOA_FECHA_DE_CIERRE_FINAL", 
        "FECHA_CREACION_DATETIME", "FECHA_CIERRE_PADRE"
    ]
    
    for date_col in columnas_fecha:
        if date_col in df_filtrado_limpio.columns:
            fechas_parsed = pd.to_datetime(df_filtrado_limpio[date_col], errors="coerce")
            df_filtrado_limpio[date_col] = fechas_parsed.dt.strftime('%Y-%m-%d %H:%M:%S').where(fechas_parsed.notna(), None)

    df_filtrado_limpio = df_filtrado_limpio.replace({np.nan: None})
    reiteros_raw_list = df_filtrado_limpio.to_dict(orient="records")

    excel_usado = f"Reitero_{mes.capitalize()}.xlsx" if mes and mes in meses_mapeo else "Reitero_Junio.xlsx"

    fuente_metadatos = {
        "fuente": excel_usado,
        "total_registros_validos": len(df_base),
        "filtrados_en_vista": len(df_filtrado),
        "fecha_actualizacion": datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "detalles": f"Módulo Control de Reiteros | {total_averias:,} Averías"
    }

    return {
        "fuente_metadatos": fuente_metadatos,
        "kpis_globales": {
            "total_averias": total_averias, 
            "total_reiteros": total_reiteros, 
            "tasa_reitero_global": tasa_reitero_global
        },
        "filtros_disponibles": {
            "departamentos": departamentos_lista,
            "ciudades": ciudades_lista,
            "origenes_diagnostico": origene_lista,
            "ctos": ctos_lista,
            "tecnicos": tecnicos_lista,
            "meses": meses_disponibles_lista,
            "calendario_por_mes": calendario_por_mes
        },
        "segmentacion_vision": seg_vision.to_dict(orient="records"),
        "distribucion_rangos_dias": seg_rangos,
        "curva_ingresos_diarios": ingresos_diarios.to_dict(orient="records"),
        "analisis_tecnicos_reitero": ranking_tecnicos.to_dict(orient="records"),
        "reiteros_raw": reiteros_raw_list,
        "causales_analisis": {
            "causales_ultimas": causales_ultimas,
            "causales_padres": causales_padres,
            "causales_tasa": causales_tasa
        }
    }