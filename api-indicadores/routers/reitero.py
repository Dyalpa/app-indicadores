import os
import datetime
from typing import Optional
from functools import lru_cache
from fastapi import APIRouter, HTTPException, Query
import pandas as pd
import numpy as np

router = APIRouter()

# 🗺️ COLUMNAS REQUERIDAS (Incluyendo TOA_PROVIDER_SOURCE_PADRE y datos del titular)
COLUMNAS_REQUERIDAS_REITERO = [
    "VISION", "NUMERO_INCIDENTE", "FECHA_CREACION", "ACCESS_ID", 
    "OBSERVACIONES_DIAGNOSTICO", "DEPARTAMENTO", "CIUDAD", "TOA_NUMERO_DE_ORDEN", 
    "TOA_FECHA_DE_CIERRE_FINAL", "TOA_APERTURA_AVERIA", "TOA_CIERRE_AVERIA", 
    "TOA_EXTERNAL_ID", "TOA_PROVIDER_SOURCE", "TOA_PROVIDER_SOURCE_PADRE", "TOA_ESTADO_FINAL", "TOA_ARMARIO", 
    "TOA_CAJA", "EXCLUSION", "NUMERO_INCIDENTE_PADRE", "ACCESS_ID_PADRE", 
    "FECHA_CIERRE_PADRE", "ESTADO_FINAL_PADRE", "TOA_EXTERNAL_ID_PADRE", 
    "TOA_APERTURA_AVERIA_PADRE", "TOA_CIERRE_AVERIA_PADRE", "DIAS_REITERO", "AVERIA", "REITERO", "COORDENADAS",
    # 🆕 Datos del titular del servicio, para la sub-pestaña "Reiterativos"
    "NOMBRE_CLIENTE", "TELEFONO_CONTACTO_CLIENTE", "DIRECCION_DE_INSTALACION"
]

# 🚀 Columnas que el frontend realmente consume desde reiteros_raw.
COLUMNAS_RESPUESTA_RAW = [
    "ACCESS_ID", "REITERO", "AVERIA", "TOA_CIERRE_AVERIA",
    "TOA_CIERRE_AVERIA_PADRE", "OBSERVACIONES_DIAGNOSTICO", "lat", "lng",
    "DIAS_REITERO", "NUMERO_INCIDENTE", "CIUDAD", "TOA_CAJA",
    "Origen_Averia", "TOA_PROVIDER_SOURCE_PADRE", "DEPARTAMENTO"
]

# 🇨🇴 ESTRUCTURA DE FESTIVOS
FESTIVOS_TUPLAS = {
    (2026, 1, 1), (2026, 1, 12), (2026, 3, 23), (2026, 4, 2), (2026, 4, 3),
    (2026, 5, 1), (2026, 5, 25), (2026, 6, 8), (2026, 6, 15), (2026, 6, 29),
    (2026, 7, 13), (2026, 7, 20), (2026, 8, 7), (2026, 8, 17), (2026, 10, 12),
    (2026, 11, 2), (2026, 11, 16), (2026, 12, 8), (2026, 12, 25)
}

mapa_iniciales = {
    0: "L", 1: "M", 2: "M", 3: "J", 4: "V", 5: "S", 6: "D"
}

numero_a_mes_nombre = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril", 5: "Mayo", 6: "Junio",
    7: "Julio", 8: "Agosto", 9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"
}

meses_mapeo = {v: k for k, v in numero_a_mes_nombre.items()}


def extraer_origen(texto):
    if not isinstance(texto, str) or not texto:
        return "DESCONOCIDO"
    partes = texto.strip().split(":", 1)
    origen = partes[0].strip().upper()
    return origen if 0 < len(origen) <= 40 else "OTRO"


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
    labels = ["0 a 5 días", "6 a 10 días", "11 a 15 días", "16 a 20 días", "21 a 25 días", "26 a 30 días", "> 30 días"]
    rangos = pd.cut(dias_num, bins=bins, labels=labels)
    return rangos.astype(str).replace({"nan": "Sin Rango", "NaN": "Sin Rango"})


@lru_cache(maxsize=1)
def obtener_calendario_estatico():
    calendario_por_mes = {}
    for mes_nombre, mes_num in meses_mapeo.items():
        try:
            start_date = f"2026-{str(mes_num).zfill(2)}-01"
            rango_fechas = pd.date_range(start=start_date, periods=pd.Period(start_date).days_in_month)

            dias_lista = [
                {
                    "Dia_Del_Mes": int(fecha.day),
                    "Inicial_Es": mapa_iniciales.get(fecha.dayofweek, "D"),
                    "Es_Festivo": bool((fecha.dayofweek == 6) or ((2026, mes_num, fecha.day) in FESTIVOS_TUPLAS))
                }
                for fecha in rango_fechas
            ]
            calendario_por_mes[mes_nombre] = dias_lista
        except Exception:
            calendario_por_mes[mes_nombre] = []

    return calendario_por_mes


# 🚀 LÓGICA INTERNA DE CARGA
def _cargar_o_procesar_parquet(nombre_mes: Optional[str] = None):
    if nombre_mes:
        excel_path = f"data_sources/reitero/Reitero_{nombre_mes.capitalize()}.xlsx"
        parquet_path = f"data_sources/reitero/reitero_{nombre_mes.lower()}.parquet"
    else:
        excel_path = "data_sources/reitero/Reitero_Junio.xlsx"
        parquet_path = "data_sources/reitero/reitero_junio.parquet"

    if not os.path.exists(parquet_path) and not os.path.exists(excel_path):
        raise HTTPException(
            status_code=404,
            detail=(
                f"No existe información para el mes '{nombre_mes}'. "
                f"Se esperaba el archivo '{excel_path}' en data_sources/reitero/ y no fue encontrado."
            )
        )

    reconstruir = not os.path.exists(parquet_path) or os.path.getmtime(excel_path) > os.path.getmtime(parquet_path)

    if reconstruir:
        dtypes_iniciales = {
            "TOA_EXTERNAL_ID": str, "TOA_EXTERNAL_ID_PADRE": str, "TOA_CAJA": str, 
            "COORDENADAS": str, "ACCESS_ID": str, "ACCESS_ID_PADRE": str, "EXCLUSION": str,
            # 🆕 Forzados a str para no perder ceros a la izquierda ni caer en notación científica
            "TELEFONO_CONTACTO_CLIENTE": str
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

        # 🆕 Datos del titular: se limpian pero SIN mayúsculas forzadas, para no
        # deformar nombres propios ni direcciones al mostrarlos en pantalla.
        for col in ["NOMBRE_CLIENTE", "TELEFONO_CONTACTO_CLIENTE", "DIRECCION_DE_INSTALACION"]:
            if col in df.columns:
                df[col] = df[col].fillna("SIN ESPECIFICAR").astype(str).str.strip()
                df[col] = df[col].replace(["nan", "NAN", "null", "NULL", "None", ""], "SIN ESPECIFICAR")

        df["FECHA_CREACION_DATETIME"] = pd.to_datetime(df["FECHA_CREACION"], errors="coerce")
        df["Dia_Ingreso"] = df["FECHA_CREACION_DATETIME"].dt.day
        df["Mes_Ingreso"] = df["FECHA_CREACION_DATETIME"].dt.month
        df["Origen_Averia"] = df["OBSERVACIONES_DIAGNOSTICO"].apply(extraer_origen)
        df["Rango_Dias_Reitero"] = asignar_rango_dias_series(df["DIAS_REITERO"])
        df["lat"], df["lng"] = extraer_coordenadas_vectorizada(df["COORDENADAS"])

        os.makedirs(os.path.dirname(parquet_path), exist_ok=True)
        df.to_parquet(parquet_path, index=False)
        return df

    return pd.read_parquet(parquet_path)


# 🚀 CACHÉ EN MEMORIA
@lru_cache(maxsize=12)
def obtener_reitero_optimizados(nombre_mes: Optional[str] = None):
    return _cargar_o_procesar_parquet(nombre_mes)


# 🚀 Filtros comunes reutilizados por /reitero y /reitero/reiterativos, para no
# duplicar esta lógica en dos endpoints distintos.
def _filtrar_dataframe_reitero(df_base, mes, dia_inicio, dia_fin, departamento, vision, tecnico, origen, cto):
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
    return df_filtrado


# 🚀 Sustitución de causales nulas, reutilizada por ambos endpoints.
def _resolver_causales_nulas(df_filtrado):
    columnas_causales_hijas = ["TOA_APERTURA_AVERIA", "TOA_CIERRE_AVERIA"]
    columnas_causales_padres = ["TOA_APERTURA_AVERIA_PADRE", "TOA_CIERRE_AVERIA_PADRE"]

    for col in columnas_causales_hijas:
        if col in df_filtrado.columns:
            df_filtrado[col] = df_filtrado[col].replace(["nan", "NAN", "null", "NULL", "None", ""], None)
            mask_nulo = df_filtrado[col].isna()
            if mask_nulo.any():
                estado_lower = df_filtrado["TOA_ESTADO_FINAL"].fillna("").str.strip().str.lower()
                df_filtrado.loc[mask_nulo & estado_lower.isin(["asignado", "agendada", "suspendida"]), col] = "AVERIA ABIERTA"
                df_filtrado.loc[mask_nulo & (estado_lower == "cancelada"), col] = "CANCELADA"
                df_filtrado.loc[mask_nulo & (estado_lower == "no realizada"), col] = "NO REALIZADA"

    for col in columnas_causales_padres:
        if col in df_filtrado.columns:
            df_filtrado[col] = df_filtrado[col].replace(["nan", "NAN", "null", "NULL", "None", ""], None)
            mask_nulo = df_filtrado[col].isna()
            if mask_nulo.any():
                estado_padre_lower = df_filtrado["ESTADO_FINAL_PADRE"].fillna("").str.strip().str.lower()
                df_filtrado.loc[mask_nulo & estado_padre_lower.isin(["asignado", "agendada", "suspendida"]), col] = "AVERIA ABIERTA"
                df_filtrado.loc[mask_nulo & (estado_padre_lower == "cancelada"), col] = "CANCELADA"
                df_filtrado.loc[mask_nulo & (estado_padre_lower == "no realizada"), col] = "NO REALIZADA"

    return df_filtrado


def _calcular_causales_ultimas_vectorizado(df_filtrado, df_reiteros_only):
    agg_causales = df_filtrado.groupby("TOA_CIERRE_AVERIA", as_index=False).agg(
        Averias=("AVERIA", "sum"),
        Reiteros=("REITERO", "sum")
    )
    agg_causales["Tasa_Reitero"] = np.where(
        agg_causales["Averias"] > 0,
        (agg_causales["Reiteros"] / agg_causales["Averias"] * 100).round(2),
        0.0
    )

    cais_por_causal = {}
    if not df_reiteros_only.empty:
        cais_global = df_reiteros_only.groupby(
            ["TOA_CIERRE_AVERIA", "ACCESS_ID", "OBSERVACIONES_DIAGNOSTICO"], as_index=False
        ).agg(Reiteros=("REITERO", "sum"))

        totales_por_causal = cais_global.groupby("TOA_CIERRE_AVERIA")["Reiteros"].transform("sum")
        cais_global["Porcentaje"] = np.where(
            totales_por_causal > 0,
            (cais_global["Reiteros"] / totales_por_causal * 100).round(2),
            0.0
        )
        cais_global = cais_global.rename(columns={"ACCESS_ID": "CODIGO_CAI", "OBSERVACIONES_DIAGNOSTICO": "DESCRIPCION_CAI"})

        for causal, sub in cais_global.groupby("TOA_CIERRE_AVERIA"):
            cais_por_causal[causal] = sub[["CODIGO_CAI", "DESCRIPCION_CAI", "Reiteros", "Porcentaje"]].to_dict(orient="records")

    causales_ultimas = []
    for _, row in agg_causales.iterrows():
        causales_ultimas.append({
            "TOA_CIERRE_AVERIA": row["TOA_CIERRE_AVERIA"],
            "Averias": int(row["Averias"]),
            "Reiteros": int(row["Reiteros"]),
            "Tasa_Reitero": float(row["Tasa_Reitero"]),
            "cais": cais_por_causal.get(row["TOA_CIERRE_AVERIA"], [])
        })

    return sorted(causales_ultimas, key=lambda x: x["Averias"], reverse=True)


def _calcular_causales_padres_vectorizado(df_reiteros_only):
    if df_reiteros_only.empty:
        return []

    total_reiteros_padre_global = df_reiteros_only["REITERO"].sum()

    agg_padres = df_reiteros_only.groupby("TOA_CIERRE_AVERIA_PADRE", as_index=False).agg(
        Reiteros_Causados=("REITERO", "sum")
    )
    agg_padres["Distribucion_Porcentaje"] = np.where(
        total_reiteros_padre_global > 0,
        (agg_padres["Reiteros_Causados"] / total_reiteros_padre_global * 100).round(2),
        0.0
    )

    cais_padres_global = df_reiteros_only.groupby(
        ["TOA_CIERRE_AVERIA_PADRE", "ACCESS_ID_PADRE", "OBSERVACIONES_DIAGNOSTICO"], as_index=False
    ).agg(Reiteros=("REITERO", "sum"))

    totales_por_padre = cais_padres_global.groupby("TOA_CIERRE_AVERIA_PADRE")["Reiteros"].transform("sum")
    cais_padres_global["Porcentaje"] = np.where(
        totales_por_padre > 0,
        (cais_padres_global["Reiteros"] / totales_por_padre * 100).round(2),
        0.0
    )
    cais_padres_global = cais_padres_global.rename(columns={"ACCESS_ID_PADRE": "CODIGO_CAI", "OBSERVACIONES_DIAGNOSTICO": "DESCRIPCION_CAI"})

    cais_por_padre = {}
    for padre, sub in cais_padres_global.groupby("TOA_CIERRE_AVERIA_PADRE"):
        cais_por_padre[padre] = sub[["CODIGO_CAI", "DESCRIPCION_CAI", "Reiteros", "Porcentaje"]].to_dict(orient="records")

    causales_padres = []
    for _, row in agg_padres.iterrows():
        causales_padres.append({
            "TOA_CIERRE_AVERIA_PADRE": row["TOA_CIERRE_AVERIA_PADRE"],
            "Reiteros_Causados": int(row["Reiteros_Causados"]),
            "Distribucion_Porcentaje": float(row["Distribucion_Porcentaje"]),
            "cais": cais_por_padre.get(row["TOA_CIERRE_AVERIA_PADRE"], [])
        })

    return sorted(causales_padres, key=lambda x: x["Reiteros_Causados"], reverse=True)


def _calcular_seg_rangos_vectorizado(df_reiteros_only):
    if df_reiteros_only.empty:
        return []

    conteo_por_rango = df_reiteros_only.groupby("Rango_Dias_Reitero").size()

    casos_global = df_reiteros_only.groupby(
        ["Rango_Dias_Reitero", "ACCESS_ID", "ACCESS_ID_PADRE", "TOA_CIERRE_AVERIA", "TOA_CIERRE_AVERIA_PADRE"],
        as_index=False
    ).size().rename(columns={"size": "Reiteros"})

    casos_global["ACCESS_ID"] = np.where(
        casos_global["ACCESS_ID"] != "SIN_ID",
        casos_global["ACCESS_ID"],
        casos_global["ACCESS_ID_PADRE"]
    )

    seg_rangos = []
    for rango, sub in casos_global.groupby("Rango_Dias_Reitero"):
        seg_rangos.append({
            "Rango_Dias_Reitero": rango,
            "Cantidad_Casos": int(conteo_por_rango.get(rango, 0)),
            "Casos": sub.drop(columns=["Rango_Dias_Reitero"]).to_dict(orient="records")
        })

    return seg_rangos


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

    departamentos_lista = sorted(df_base["DEPARTAMENTO"].dropna().unique().tolist())
    ciudades_lista = sorted(df_base["CIUDAD"].dropna().unique().tolist())
    origene_lista = sorted(df_base["Origen_Averia"].dropna().unique().tolist())
    ctos_lista = sorted(df_base["TOA_CAJA"].dropna().unique().tolist())
    tecnicos_lista = sorted(df_base["TOA_PROVIDER_SOURCE"].dropna().unique().tolist())

    meses_disponibles_lista = []
    if os.path.exists("data_sources/reitero/"):
        for archivo in os.listdir("data_sources/reitero/"):
            if archivo.startswith("Reitero_") and archivo.endswith(".xlsx"):
                nombre_mes_archivo = archivo.replace("Reitero_", "").replace(".xlsx", "").capitalize()
                if nombre_mes_archivo not in meses_disponibles_lista:
                    meses_disponibles_lista.append(nombre_mes_archivo)
    
    orden_meses = list(meses_mapeo.keys())
    meses_disponibles_lista = sorted(meses_disponibles_lista, key=lambda x: orden_meses.index(x) if x in orden_meses else 99)

    calendario_por_mes = obtener_calendario_estatico()

    df_filtrado = _filtrar_dataframe_reitero(df_base, mes, dia_inicio, dia_fin, departamento, vision, tecnico, origen, cto)
    df_filtrado = _resolver_causales_nulas(df_filtrado)

    total_averias = int(df_filtrado["AVERIA"].sum())
    total_reiteros = int(df_filtrado["REITERO"].sum())
    tasa_reitero_global = round((total_reiteros / total_averias * 100), 2) if total_averias > 0 else 0.0

    seg_vision = df_filtrado.groupby("VISION", as_index=False).agg(Averias=("AVERIA", "sum"), Reiteros=("REITERO", "sum"))
    if not seg_vision.empty:
        seg_vision["Tasa_Reitero"] = (seg_vision["Reiteros"] / seg_vision["Averias"] * 100).round(2)

    df_reiteros_only = df_filtrado[df_filtrado["REITERO"] == 1]

    seg_rangos = _calcular_seg_rangos_vectorizado(df_reiteros_only)

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

    causales_ultimas = _calcular_causales_ultimas_vectorizado(df_filtrado, df_reiteros_only)
    causales_padres = _calcular_causales_padres_vectorizado(df_reiteros_only)
    causales_tasa = sorted([c for c in causales_ultimas if c["Averias"] >= 3], key=lambda x: x["Tasa_Reitero"], reverse=True)

    df_filtrado_limpio = df_filtrado.copy()
    columnas_fecha = ["FECHA_CREACION", "TOA_FECHA_DE_CIERRE_FINAL", "FECHA_CREACION_DATETIME", "FECHA_CIERRE_PADRE"]
    
    for date_col in columnas_fecha:
        if date_col in df_filtrado_limpio.columns:
            df_filtrado_limpio[date_col] = pd.to_datetime(df_filtrado_limpio[date_col], errors="coerce")
            df_filtrado_limpio[date_col] = df_filtrado_limpio[date_col].dt.strftime('%Y-%m-%d %H:%M:%S')

    df_filtrado_limpio = df_filtrado_limpio.replace({np.nan: None, pd.NaT: None, np.inf: None, -np.inf: None})
    df_filtrado_limpio = df_filtrado_limpio.where(pd.notnull(df_filtrado_limpio), None)

    columnas_disponibles_raw = [c for c in COLUMNAS_RESPUESTA_RAW if c in df_filtrado_limpio.columns]
    reiteros_raw_list = df_filtrado_limpio[columnas_disponibles_raw].to_dict(orient="records")

    excel_usado = f"Reitero_{mes.capitalize()}.xlsx" if mes and mes in meses_mapeo else "Reitero_Junio.xlsx"

    # 🆕 Hasta qué día del mes hay información real cargada (no confundir con
    # el calendario estático de 1 a 30/31, que muestra TODOS los días del mes
    # sin importar si hay datos o no). Se calcula sobre df_base (el dataset
    # completo del mes seleccionado, sin los filtros de día/depto/etc. del
    # usuario) para reflejar el corte real de la fuente, no del filtro actual.
    fecha_maxima_datos = pd.to_datetime(df_base["FECHA_CREACION"], errors="coerce").max()
    ultimo_dia_con_datos = int(fecha_maxima_datos.day) if pd.notnull(fecha_maxima_datos) else None
    fecha_maxima_datos_str = fecha_maxima_datos.strftime('%Y-%m-%d') if pd.notnull(fecha_maxima_datos) else None

    fuente_metadatos = {
        "fuente": excel_usado,
        "total_registros_validos": len(df_base),
        "filtrados_en_vista": len(df_filtrado),
        "fecha_actualizacion": datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "detalles": f"Módulo Control de Reiteros | {total_averias:,} Averías",
        # 🆕 Para mostrar en metadatos: "Información actualizada hasta el día X"
        "ultimo_dia_con_datos": ultimo_dia_con_datos,
        "fecha_maxima_datos": fecha_maxima_datos_str
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
            "calendario_por_mes": calendario_por_mes,
            # 🆕 Redundante con fuente_metadatos, pero cómodo aquí para que el
            # calendario del filtro (CalendarFranjaGlobal) lo consuma directo.
            "ultimo_dia_con_datos": ultimo_dia_con_datos
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


# ========================================================
# 🆕 ENDPOINT: SERVICIOS REITERATIVOS (por cantidad exacta de reiteros)
# ========================================================
@router.get("/reitero/reiterativos")
def reitero_reiterativos(
    # 🔧 Ahora es OPCIONAL: si no se envía, el endpoint solo calcula la
    # distribución disponible (cantidades de reiteros que existen en los
    # datos actuales), sin construir la lista de servicios. Esto permite que
    # el frontend pida primero "qué cantidades hay datos" para mostrar los
    # chips seleccionables, sin tener que adivinar un valor inicial.
    veces_reitero: Optional[int] = Query(None, ge=1, description="Cantidad EXACTA de reiteros que debe tener el CAI para incluirlo"),
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
    df_filtrado = _filtrar_dataframe_reitero(df_base, mes, dia_inicio, dia_fin, departamento, vision, tecnico, origen, cto)
    df_filtrado = _resolver_causales_nulas(df_filtrado)

    df_reiteros_only = df_filtrado[df_filtrado["REITERO"] == 1].copy()

    if df_reiteros_only.empty:
        return {
            "veces_reitero_solicitado": veces_reitero,
            "total_servicios": 0,
            "servicios": [],
            "distribucion_disponible": []
        }

    # 🎯 Conteo de reiteros por CAI (ACCESS_ID = identificador único del servicio)
    conteo_por_cai = df_reiteros_only.groupby("ACCESS_ID").size()

    # Cantidades de reiteros que SÍ existen en los datos actuales, para que
    # el frontend arme los chips seleccionables sin adivinar.
    distribucion_disponible = sorted(int(v) for v in conteo_por_cai.unique().tolist())

    # Si no se pidió una cantidad específica, devolvemos solo la distribución
    # (sin hacer el trabajo de construir el detalle de servicios).
    if veces_reitero is None:
        return {
            "veces_reitero_solicitado": None,
            "total_servicios": 0,
            "servicios": [],
            "distribucion_disponible": distribucion_disponible
        }

    cais_seleccionados = conteo_por_cai[conteo_por_cai == veces_reitero].index.tolist()

    if not cais_seleccionados:
        return {
            "veces_reitero_solicitado": veces_reitero,
            "total_servicios": 0,
            "servicios": [],
            "distribucion_disponible": distribucion_disponible
        }

    df_candidatos = df_reiteros_only[df_reiteros_only["ACCESS_ID"].isin(cais_seleccionados)].copy()
    df_candidatos["FECHA_CIERRE_PADRE"] = pd.to_datetime(df_candidatos["FECHA_CIERRE_PADRE"], errors="coerce")

    # 🆕 Ya NO nos quedamos solo con la última orden: se conserva el detalle
    # de las N órdenes reiterativas de cada CAI, ordenadas de la más reciente
    # a la más antigua, para que el frontend pueda mostrar el historial
    # completo de cada servicio reiterativo.
    df_candidatos = df_candidatos.sort_values(["ACCESS_ID", "FECHA_CIERRE_PADRE"], ascending=[True, False])
    df_candidatos = df_candidatos.replace({np.nan: None, pd.NaT: None})
    df_candidatos = df_candidatos.where(pd.notnull(df_candidatos), None)

    columnas_datos_cliente = ["NOMBRE_CLIENTE", "TELEFONO_CONTACTO_CLIENTE", "DIRECCION_DE_INSTALACION", "CIUDAD", "DEPARTAMENTO", "TOA_CAJA"]
    columnas_datos_cliente = [c for c in columnas_datos_cliente if c in df_candidatos.columns]

    servicios = []
    for cai, grupo in df_candidatos.groupby("ACCESS_ID"):
        primera_fila = grupo.iloc[0]

        ordenes = []
        for _, fila in grupo.iterrows():
            fecha = fila.get("FECHA_CIERRE_PADRE")
            ordenes.append({
                "TECNICO": fila.get("TOA_PROVIDER_SOURCE_PADRE"),
                "CAUSAL": fila.get("TOA_CIERRE_AVERIA_PADRE"),
                "FECHA": fecha.strftime('%Y-%m-%d %H:%M:%S') if pd.notnull(fecha) else None,
                "DIAS_REITERO": fila.get("DIAS_REITERO")
            })

        servicio = {"CAI": cai}
        for col in columnas_datos_cliente:
            servicio[col] = primera_fila.get(col)
        servicio["veces_reitero"] = len(ordenes)
        servicio["ordenes"] = ordenes
        servicios.append(servicio)

    servicios = sorted(servicios, key=lambda s: s.get("NOMBRE_CLIENTE") or "")

    return {
        "veces_reitero_solicitado": veces_reitero,
        "total_servicios": len(servicios),
        "servicios": servicios,
        "distribucion_disponible": distribucion_disponible
    }