import os
import datetime
from typing import Optional
from functools import lru_cache
from fastapi import APIRouter, HTTPException
import pandas as pd
import numpy as np

router = APIRouter()

# 📁 Los archivos de Infancia viven en su propia subcarpeta
CARPETA_INFANCIA = "data_sources/infancia"

# 🗺️ Columnas leídas del Excel de Infancia
COLUMNAS_REQUERIDAS_INFANCIA = [
    "Tipo_de_orden", "Subtipo_de_orden", "ACCESS_ID", "Fecha_de_cierre_final",
    "Nombre_de_Cliente", "DepartamentoHomologado", "Ciudad", "provider_source",
    "REMEDY_FECHA_CREACION_TT", "REMEDY_FECHA_CIERRE", "REMEDY_ESTADO_FINAL",
    "REMEDY_TOA_CIERRE_AVERIA", "REMEDY_TOA_PROVIDER_SOURCE",
    "TIEMPO_INFANCIA", "INFANCIA_GENERAL", "EXCLUSION"
]

# 🚀 Columnas que se exponen en el detalle crudo (infancia_raw), recortadas al
# mínimo necesario para el frontend — misma optimización aplicada en Reitero.
COLUMNAS_RESPUESTA_RAW = [
    "ACCESS_ID", "Nombre_de_Cliente", "Ciudad", "DepartamentoHomologado",
    "provider_source", "REMEDY_TOA_PROVIDER_SOURCE", "REMEDY_TOA_CIERRE_AVERIA",
    "TIEMPO_INFANCIA", "INFANCIA_GENERAL", "Tipo_de_orden", "Subtipo_de_orden"
]

# 🇨🇴 ESTRUCTURA DE FESTIVOS (idéntica a Reitero)
FESTIVOS_TUPLAS = {
    (2026, 1, 1), (2026, 1, 12), (2026, 3, 23), (2026, 4, 2), (2026, 4, 3),
    (2026, 5, 1), (2026, 5, 25), (2026, 6, 8), (2026, 6, 15), (2026, 6, 29),
    (2026, 7, 13), (2026, 7, 20), (2026, 8, 7), (2026, 8, 17), (2026, 10, 12),
    (2026, 11, 2), (2026, 11, 16), (2026, 12, 8), (2026, 12, 25)
}

mapa_iniciales = {0: "L", 1: "M", 2: "M", 3: "J", 4: "V", 5: "S", 6: "D"}

numero_a_mes_nombre = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril", 5: "Mayo", 6: "Junio",
    7: "Julio", 8: "Agosto", 9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"
}
meses_mapeo = {v: k for k, v in numero_a_mes_nombre.items()}


def asignar_rango_infancia_series(series_dias):
    """
    🎯 Bins específicos de Infancia: 0-7, 8-14, 15-21, 22-30 días
    (distinto de los bins de Reitero, que son de 5 en 5).
    """
    dias_num = pd.to_numeric(series_dias, errors="coerce")
    bins = [-1, 7, 14, 21, 30]
    labels = ["0 a 7 días", "8 a 14 días", "15 a 21 días", "22 a 30 días"]
    rangos = pd.cut(dias_num, bins=bins, labels=labels)
    return rangos.astype(str).replace({"nan": "Sin Rango", "NaN": "Sin Rango"})


@lru_cache(maxsize=1)
def obtener_calendario_estatico_infancia():
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


# 🚀 CARGA + CACHÉ EN PARQUET (mismo patrón que Reitero)
def _cargar_o_procesar_parquet_infancia(nombre_mes: Optional[str] = None):
    if nombre_mes:
        excel_path = f"{CARPETA_INFANCIA}/Infancia_{nombre_mes.capitalize()}.xlsx"
        parquet_path = f"{CARPETA_INFANCIA}/infancia_{nombre_mes.lower()}.parquet"
    else:
        excel_path = f"{CARPETA_INFANCIA}/Infancia_Junio.xlsx"
        parquet_path = f"{CARPETA_INFANCIA}/infancia_junio.parquet"

    # 🚨 Sin fallback silencioso a otro mes (mismo bug que corregimos en
    # Reitero) — si no existe el archivo del mes pedido, error claro.
    if not os.path.exists(parquet_path) and not os.path.exists(excel_path):
        raise HTTPException(
            status_code=404,
            detail=(
                f"No existe información de Infancia para el mes '{nombre_mes}'. "
                f"Se esperaba el archivo '{excel_path}' y no fue encontrado."
            )
        )

    reconstruir = not os.path.exists(parquet_path) or os.path.getmtime(excel_path) > os.path.getmtime(parquet_path)

    if reconstruir:
        dtypes_iniciales = {
            "ACCESS_ID": str, "EXCLUSION": str
        }
        df = pd.read_excel(excel_path, usecols=COLUMNAS_REQUERIDAS_INFANCIA, dtype=dtypes_iniciales)

        df["EXCLUSION"] = df["EXCLUSION"].fillna("").astype(str).str.strip().str.upper()
        df = df[df["EXCLUSION"] == "NO"]

        df["INFANCIA_GENERAL"] = pd.to_numeric(df["INFANCIA_GENERAL"], errors="coerce").fillna(0).astype(int)

        df["Fecha_de_cierre_final"] = pd.to_datetime(df["Fecha_de_cierre_final"], errors="coerce")
        df["REMEDY_FECHA_CREACION_TT"] = pd.to_datetime(df["REMEDY_FECHA_CREACION_TT"], errors="coerce")
        df["REMEDY_FECHA_CIERRE"] = pd.to_datetime(df["REMEDY_FECHA_CIERRE"], errors="coerce")

        for col in ["DepartamentoHomologado", "Ciudad", "provider_source", "REMEDY_TOA_PROVIDER_SOURCE", "Tipo_de_orden", "Subtipo_de_orden"]:
            if col in df.columns:
                df[col] = df[col].fillna("SIN ESPECIFICAR").astype(str).str.strip().str.upper()

        # Nombre del cliente: se limpia pero sin mayúsculas forzadas
        if "Nombre_de_Cliente" in df.columns:
            df["Nombre_de_Cliente"] = df["Nombre_de_Cliente"].fillna("SIN ESPECIFICAR").astype(str).str.strip()
            df["Nombre_de_Cliente"] = df["Nombre_de_Cliente"].replace(["nan", "NAN", "null", "NULL", "None", ""], "SIN ESPECIFICAR")

        if "ACCESS_ID" in df.columns:
            df["ACCESS_ID"] = df["ACCESS_ID"].fillna("SIN_ID").astype(str).str.strip().replace(["nan", "NAN", "null", "NULL", "None", ""], "SIN_ID")

        # Filtro/día de referencia: la fecha de CIERRE DE LA INSTALACIÓN
        df["Dia_Instalacion"] = df["Fecha_de_cierre_final"].dt.day
        df["Mes_Instalacion"] = df["Fecha_de_cierre_final"].dt.month
        df["Rango_Infancia"] = asignar_rango_infancia_series(df["TIEMPO_INFANCIA"])

        os.makedirs(CARPETA_INFANCIA, exist_ok=True)
        df.to_parquet(parquet_path, index=False)
        return df

    return pd.read_parquet(parquet_path)


@lru_cache(maxsize=12)
def obtener_infancia_optimizados(nombre_mes: Optional[str] = None):
    return _cargar_o_procesar_parquet_infancia(nombre_mes)


def _filtrar_dataframe_infancia(df_base, mes, dia_inicio, dia_fin, departamento, ciudad, tecnico):
    df_filtrado = df_base.copy()
    if mes and mes in meses_mapeo:
        df_filtrado = df_filtrado[df_filtrado["Mes_Instalacion"] == meses_mapeo[mes]]
    if dia_inicio is not None:
        df_filtrado = df_filtrado[df_filtrado["Dia_Instalacion"] >= dia_inicio]
    if dia_fin is not None:
        df_filtrado = df_filtrado[df_filtrado["Dia_Instalacion"] <= dia_fin]
    if departamento:
        df_filtrado = df_filtrado[df_filtrado["DepartamentoHomologado"] == departamento.strip().upper()]
    if ciudad:
        df_filtrado = df_filtrado[df_filtrado["Ciudad"] == ciudad.strip().upper()]
    if tecnico:
        tecnico_upper = tecnico.strip().upper()
        df_filtrado = df_filtrado[
            (df_filtrado["provider_source"] == tecnico_upper) |
            (df_filtrado["REMEDY_TOA_PROVIDER_SOURCE"] == tecnico_upper)
        ]
    return df_filtrado


def _resolver_causal_nula_infancia(df_filtrado):
    """
    🎯 Igual que en Reitero: si REMEDY_TOA_CIERRE_AVERIA viene vacío, se
    sustituye según REMEDY_ESTADO_FINAL en vez de dejarlo en blanco.
    """
    if "REMEDY_TOA_CIERRE_AVERIA" not in df_filtrado.columns:
        return df_filtrado

    df_filtrado["REMEDY_TOA_CIERRE_AVERIA"] = df_filtrado["REMEDY_TOA_CIERRE_AVERIA"].replace(
        ["nan", "NAN", "null", "NULL", "None", ""], None
    )
    mask_nulo = df_filtrado["REMEDY_TOA_CIERRE_AVERIA"].isna()
    if mask_nulo.any() and "REMEDY_ESTADO_FINAL" in df_filtrado.columns:
        estado_lower = df_filtrado["REMEDY_ESTADO_FINAL"].fillna("").astype(str).str.strip().str.lower()
        df_filtrado.loc[mask_nulo & estado_lower.isin(["asignado", "agendada", "suspendida"]), "REMEDY_TOA_CIERRE_AVERIA"] = "AVERIA ABIERTA"
        df_filtrado.loc[mask_nulo & (estado_lower == "cancelada"), "REMEDY_TOA_CIERRE_AVERIA"] = "CANCELADA"
        df_filtrado.loc[mask_nulo & (estado_lower == "no realizada"), "REMEDY_TOA_CIERRE_AVERIA"] = "NO REALIZADA"

    return df_filtrado


def _calcular_causales_infancia_vectorizado(df_infancia_only):
    """
    🚀 Vectorizado desde el inicio (sin loops de Python anidados, la lección
    aprendida de Reitero). Un solo groupby global para los totales por
    causal, y otro para el desglose de CAIs.
    """
    if df_infancia_only.empty:
        return []

    total_infancias_global = len(df_infancia_only)

    agg_causales = df_infancia_only.groupby("REMEDY_TOA_CIERRE_AVERIA", as_index=False).agg(
        Infancias=("ACCESS_ID", "count")
    )
    agg_causales["Distribucion_Porcentaje"] = np.where(
        total_infancias_global > 0,
        (agg_causales["Infancias"] / total_infancias_global * 100).round(2),
        0.0
    )

    cais_global = df_infancia_only.groupby(
        ["REMEDY_TOA_CIERRE_AVERIA", "ACCESS_ID", "Nombre_de_Cliente"], as_index=False
    ).size().rename(columns={"size": "Infancias"})

    totales_por_causal = cais_global.groupby("REMEDY_TOA_CIERRE_AVERIA")["Infancias"].transform("sum")
    cais_global["Porcentaje"] = np.where(
        totales_por_causal > 0,
        (cais_global["Infancias"] / totales_por_causal * 100).round(2),
        0.0
    )
    cais_global = cais_global.rename(columns={"ACCESS_ID": "CODIGO_CAI", "Nombre_de_Cliente": "NOMBRE_CLIENTE"})

    cais_por_causal = {}
    for causal, sub in cais_global.groupby("REMEDY_TOA_CIERRE_AVERIA"):
        cais_por_causal[causal] = sub[["CODIGO_CAI", "NOMBRE_CLIENTE", "Infancias", "Porcentaje"]].to_dict(orient="records")

    causales = []
    for _, row in agg_causales.iterrows():
        causales.append({
            "REMEDY_TOA_CIERRE_AVERIA": row["REMEDY_TOA_CIERRE_AVERIA"],
            "Infancias": int(row["Infancias"]),
            "Distribucion_Porcentaje": float(row["Distribucion_Porcentaje"]),
            "cais": cais_por_causal.get(row["REMEDY_TOA_CIERRE_AVERIA"], [])
        })

    return sorted(causales, key=lambda x: x["Infancias"], reverse=True)


def _calcular_rangos_infancia_vectorizado(df_infancia_only):
    """🚀 Distribución por Rango_Infancia (0-7, 8-14, 15-21, 22-30 días), vectorizado."""
    if df_infancia_only.empty:
        return []

    conteo_por_rango = df_infancia_only.groupby("Rango_Infancia").size()

    casos_global = df_infancia_only.groupby(
        ["Rango_Infancia", "ACCESS_ID", "Nombre_de_Cliente", "REMEDY_TOA_CIERRE_AVERIA", "REMEDY_TOA_PROVIDER_SOURCE"],
        as_index=False
    ).size().rename(columns={"size": "Casos"})

    rangos = []
    for rango, sub in casos_global.groupby("Rango_Infancia"):
        rangos.append({
            "Rango_Infancia": rango,
            "Cantidad_Casos": int(conteo_por_rango.get(rango, 0)),
            "Casos": sub.drop(columns=["Rango_Infancia"]).to_dict(orient="records")
        })

    return rangos


@router.get("/infancia")
def informe_infancia(
    mes: Optional[str] = None,
    dia_inicio: Optional[int] = None,
    dia_fin: Optional[int] = None,
    departamento: Optional[str] = None,
    ciudad: Optional[str] = None,
    tecnico: Optional[str] = None
):
    df_base = obtener_infancia_optimizados(mes)

    departamentos_lista = sorted(df_base["DepartamentoHomologado"].dropna().unique().tolist())
    ciudades_lista = sorted(df_base["Ciudad"].dropna().unique().tolist())
    tecnicos_lista = sorted(df_base["provider_source"].dropna().unique().tolist())

    meses_disponibles_lista = []
    if os.path.exists(CARPETA_INFANCIA):
        for archivo in os.listdir(CARPETA_INFANCIA):
            if archivo.startswith("Infancia_") and archivo.endswith(".xlsx"):
                nombre_mes_archivo = archivo.replace("Infancia_", "").replace(".xlsx", "").capitalize()
                if nombre_mes_archivo not in meses_disponibles_lista:
                    meses_disponibles_lista.append(nombre_mes_archivo)

    orden_meses = list(meses_mapeo.keys())
    meses_disponibles_lista = sorted(meses_disponibles_lista, key=lambda x: orden_meses.index(x) if x in orden_meses else 99)

    calendario_por_mes = obtener_calendario_estatico_infancia()

    df_filtrado = _filtrar_dataframe_infancia(df_base, mes, dia_inicio, dia_fin, departamento, ciudad, tecnico)
    df_filtrado = _resolver_causal_nula_infancia(df_filtrado)

    # --- 📊 KPIs GLOBALES ---
    total_instalaciones = int(len(df_filtrado))
    total_infancias = int(df_filtrado["INFANCIA_GENERAL"].sum())
    tasa_infancia_global = round((total_infancias / total_instalaciones * 100), 2) if total_instalaciones > 0 else 0.0

    df_infancia_only = df_filtrado[df_filtrado["INFANCIA_GENERAL"] == 1].copy()

    # --- 🎯 DISTRIBUCIÓN POR RANGO DE INFANCIA ---
    seg_rangos = _calcular_rangos_infancia_vectorizado(df_infancia_only)

    # --- 🧑‍🔧 RANKING DE TÉCNICOS (un solo campo: provider_source) ---
    ranking_tecnicos = df_filtrado.groupby(["provider_source", "DepartamentoHomologado"], as_index=False).agg(
        Total_Instalaciones=("ACCESS_ID", "count"),
        Infancias=("INFANCIA_GENERAL", "sum")
    ).rename(columns={"provider_source": "Tecnico"})
    ranking_tecnicos["Infancias"] = ranking_tecnicos["Infancias"].astype(int)
    ranking_tecnicos["Tasa_Infancia_Tecnico"] = 0.0
    mascara_atendidas = ranking_tecnicos["Total_Instalaciones"] > 0
    ranking_tecnicos.loc[mascara_atendidas, "Tasa_Infancia_Tecnico"] = (
        (ranking_tecnicos.loc[mascara_atendidas, "Infancias"] / ranking_tecnicos.loc[mascara_atendidas, "Total_Instalaciones"]) * 100
    ).round(2)
    ranking_tecnicos = ranking_tecnicos.sort_values(by="Infancias", ascending=False)

    # --- 📈 CURVA DIARIA (instalaciones vs infancias por día) ---
    curva_diaria = df_filtrado.groupby(["Mes_Instalacion", "Dia_Instalacion", "DepartamentoHomologado"], as_index=False).agg(
        Instalaciones_Realizadas=("ACCESS_ID", "count"),
        Infancias_Generadas=("INFANCIA_GENERAL", "sum")
    ).sort_values(["Mes_Instalacion", "Dia_Instalacion"])

    # --- 🧪 CAUSALES DE INFANCIA ---
    causales_infancia = _calcular_causales_infancia_vectorizado(df_infancia_only)

    # --- 🧹 SERIALIZACIÓN DEL DETALLE CRUDO (recortado a columnas útiles) ---
    df_filtrado_limpio = df_filtrado.copy()
    columnas_fecha = ["Fecha_de_cierre_final", "REMEDY_FECHA_CREACION_TT", "REMEDY_FECHA_CIERRE"]
    for date_col in columnas_fecha:
        if date_col in df_filtrado_limpio.columns:
            df_filtrado_limpio[date_col] = pd.to_datetime(df_filtrado_limpio[date_col], errors="coerce")
            df_filtrado_limpio[date_col] = df_filtrado_limpio[date_col].dt.strftime('%Y-%m-%d %H:%M:%S')

    df_filtrado_limpio = df_filtrado_limpio.replace({np.nan: None, pd.NaT: None, np.inf: None, -np.inf: None})
    df_filtrado_limpio = df_filtrado_limpio.where(pd.notnull(df_filtrado_limpio), None)

    columnas_disponibles_raw = [c for c in COLUMNAS_RESPUESTA_RAW if c in df_filtrado_limpio.columns]
    infancia_raw_list = df_filtrado_limpio[columnas_disponibles_raw].to_dict(orient="records")

    # --- 🗓️ Hasta qué día hay datos reales (mismo patrón agregado en Reitero) ---
    fecha_maxima_datos = pd.to_datetime(df_base["Fecha_de_cierre_final"], errors="coerce").max()
    ultimo_dia_con_datos = int(fecha_maxima_datos.day) if pd.notnull(fecha_maxima_datos) else None
    fecha_maxima_datos_str = fecha_maxima_datos.strftime('%Y-%m-%d') if pd.notnull(fecha_maxima_datos) else None

    excel_usado = f"Infancia_{mes.capitalize()}.xlsx" if mes and mes in meses_mapeo else "Infancia_Junio.xlsx"

    fuente_metadatos = {
        "fuente": excel_usado,
        "total_registros_validos": len(df_base),
        "filtrados_en_vista": len(df_filtrado),
        "fecha_actualizacion": datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "detalles": f"Módulo Control de Infancia | {total_instalaciones:,} Instalaciones",
        "ultimo_dia_con_datos": ultimo_dia_con_datos,
        "fecha_maxima_datos": fecha_maxima_datos_str
    }

    return {
        "fuente_metadatos": fuente_metadatos,
        "kpis_globales": {
            "total_instalaciones": total_instalaciones,
            "total_infancias": total_infancias,
            "tasa_infancia_global": tasa_infancia_global
        },
        "filtros_disponibles": {
            "departamentos": departamentos_lista,
            "ciudades": ciudades_lista,
            "tecnicos": tecnicos_lista,
            "meses": meses_disponibles_lista,
            "calendario_por_mes": calendario_por_mes,
            "ultimo_dia_con_datos": ultimo_dia_con_datos
        },
        "distribucion_rangos_infancia": seg_rangos,
        "curva_diaria": curva_diaria.to_dict(orient="records"),
        "analisis_tecnicos_infancia": ranking_tecnicos.to_dict(orient="records"),
        "infancia_raw": infancia_raw_list,
        "causales_infancia": causales_infancia
    }