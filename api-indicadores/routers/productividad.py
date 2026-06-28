import os
from fastapi import APIRouter
import pandas as pd
from datetime import datetime
from utils.helpers import MESES_ESPANOL, festivos_set, mapa_iniciales

router = APIRouter()

# 📊 Rutas de Productividad
EXCEL_FILE = "data_sources/productividad.xlsx"
PARQUET_FILE = "data_sources/productividad.parquet"

# 💵 Rutas para el archivo de Precios (Mano de Obra)
PRECIOS_FILE = "data_sources/precios_mano_obra.xlsx"
PRECIOS_PARQUET = "data_sources/precios_mano_obra.parquet"

# 📦 Rutas para el archivo de Materiales
MATERIALES_FILE = "data_sources/materiales_ordenes.xlsx"
MATERIALES_PARQUET = "data_sources/materiales_ordenes.parquet"

# 📋 Tarifas oficiales indexadas
MATRIZ_ITEMS = {
    "291481": {"baremos": 0.48, "pago": 44898.72},
    "291451": {"baremos": 0.25, "pago": 23384.75}
}


def calcular_items_adicionales(grupo_materiales):
    """
    Analiza el set de materiales de una orden (Agrupada por appt_number) 
    y retorna la sumatoria exacta de dinero y baremos adicionales.
    """
    extra_dinero = 0.0
    extra_baremos = 0.0
    
    subtipo = str(grupo_materiales.get("SUBTIPO_DE_ORDEN", "")).upper()
    
    # Extraer listas limpias desde las filas asociadas al appt_number
    desc_equipos = [str(x).upper() for x in grupo_materiales.get("LISTA_DESC_EQUIPO", [])]
    transacciones = [str(x).lower() for x in grupo_materiales.get("LISTA_TRANSACCIONES", [])]
    cantidades = grupo_materiales.get("LISTA_CANTIDADES", [])
    familias = [str(x).upper() for x in grupo_materiales.get("LISTA_FAMILIAS", [])]

    # 🔍 1. Comprobar si la orden lleva CABLE UTP en cualquier categoría
    usa_utp = any("UTP" in desc for desc in desc_equipos)

    # --- REGLA A: ALTABA con Cable UTP ---
    if subtipo == "ALTABA" and usa_utp:
        extra_dinero += MATRIZ_ITEMS["291481"]["pago"]
        extra_baremos += MATRIZ_ITEMS["291481"]["baremos"]
        return pd.Series([extra_dinero, extra_baremos], index=["Extra_Dinero", "Extra_Baremos"])

    # --- REGLA B: ALTAIQT, SUBTIPOS CON 'IQT'/'TV' O TRASLADOS ---
    es_candidato_decos = "IQT" in subtipo or "TV" in subtipo or "TRASLADO" in subtipo

    if es_candidato_decos:
        total_decos = 0
        
        for desc, trans, cant, familia in zip(desc_equipos, transacciones, cantidades, familias):
            # Criterios para identificar un decodificador o baseport
            is_deco = "DECO" in desc or "BASEPORT" in desc or familia == "TV"
            
            if is_deco:
                # 'install' para altas, o 'customer' para traslados
                if trans == "install" or ("TRASLADO" in subtipo and trans == "customer"):
                    try:
                        total_decos += int(float(cant))
                    except (ValueError, TypeError):
                        total_decos += 1

        # Liquidar excedentes a partir del segundo decodificador
        if total_decos > 1:
            decos_adicionales = total_decos - 1
            
            if usa_utp:
                extra_dinero += decos_adicionales * MATRIZ_ITEMS["291481"]["pago"]
                extra_baremos += decos_adicionales * MATRIZ_ITEMS["291481"]["baremos"]
            else:
                extra_dinero += decos_adicionales * MATRIZ_ITEMS["291451"]["pago"]
                extra_baremos += decos_adicionales * MATRIZ_ITEMS["291451"]["baremos"]

    return pd.Series([extra_dinero, extra_baremos], index=["Extra_Dinero", "Extra_Baremos"])


def obtener_datos_optimizados():
    if not os.path.exists(EXCEL_FILE):
        if os.path.exists(PARQUET_FILE):
            return pd.read_parquet(PARQUET_FILE)
        raise FileNotFoundError(f"No se encontró el archivo '{EXCEL_FILE}'")

    reconstruir = False
    if not os.path.exists(PARQUET_FILE) or os.path.getmtime(EXCEL_FILE) > os.path.getmtime(PARQUET_FILE):
        reconstruir = True

    if reconstruir:
        print("🔄 [Productividad] Actualizando caché Parquet...")
        df = pd.read_excel(EXCEL_FILE, sheet_name="Base", dtype={"Pet_atis": str, "appt_number": str})
        
        if "Pet_atis" in df.columns:
            df["Pet_atis"] = df["Pet_atis"].astype(str).str.split('.').str[0].str.strip()
        if "appt_number" in df.columns:
            df["appt_number"] = df["appt_number"].astype(str).str.strip()
            
        os.makedirs(os.path.dirname(PARQUET_FILE), exist_ok=True)
        df.to_parquet(PARQUET_FILE, index=False)
        return df
    return pd.read_parquet(PARQUET_FILE)


def obtener_precios_optimizados():
    if not os.path.exists(PRECIOS_FILE):
        if os.path.exists(PRECIOS_PARQUET):
            return pd.read_parquet(PRECIOS_PARQUET)
        raise FileNotFoundError(f"No se encontró el archivo '{PRECIOS_FILE}'")

    reconstruir = False
    if not os.path.exists(PRECIOS_PARQUET) or os.path.getmtime(PRECIOS_FILE) > os.path.getmtime(PRECIOS_PARQUET):
        reconstruir = True

    if reconstruir:
        print("🔄 [Precios] Actualizando caché Parquet con calibración exacta por longitud...")
        df_precios = pd.read_excel(PRECIOS_FILE)
        
        if "Subtipo_de_orden" in df_precios.columns:
            df_precios["Subtipo_de_orden"] = df_precios["Subtipo_de_orden"].astype(str).str.strip()
        
        if "Valor_promedio_en_dinero" in df_precios.columns:
            s_dinero = df_precios["Valor_promedio_en_dinero"].astype(str).str.strip()
            s_dinero = s_dinero.str.replace("$", "", regex=False).str.replace(" ", "", regex=False)
            s_dinero = s_dinero.str.replace(".", "", regex=False).str.replace(",", ".", regex=False)
            
            valores_numericos = pd.to_numeric(s_dinero, errors="coerce").fillna(0).tolist()
            valores_calibrados = [val / 10 if val >= 500000 else val for val in valores_numericos]
            df_precios["Valor_promedio_en_dinero"] = valores_calibrados
            
        if "Valor_promedio_en_baremos" in df_precios.columns:
            s_baremos = df_precios["Valor_promedio_en_baremos"].astype(str).str.strip()
            s_baremos = s_baremos.str.replace(",", ".", regex=False)
            df_precios["Valor_promedio_en_baremos"] = pd.to_numeric(s_baremos, errors="coerce").fillna(0)

        df_precios = df_precios.drop_duplicates(subset=["Subtipo_de_orden"])
        df_precios.to_parquet(PRECIOS_PARQUET, index=False)
        return df_precios
    return pd.read_parquet(PRECIOS_PARQUET)


def obtener_materiales_optimizados():
    print(f"🔍 [Debug Materiales] Buscando archivo Excel en: {MATERIALES_FILE}")
    
    if not os.path.exists(MATERIALES_FILE):
        print(f"⚠️ [Debug Materiales] ALERTA: No se encontró el archivo '{MATERIALES_FILE}'.")
        if os.path.exists(MATERIALES_PARQUET):
            return pd.read_parquet(MATERIALES_PARQUET)
        return None

    reconstruir = False
    if not os.path.exists(MATERIALES_PARQUET) or os.path.getmtime(MATERIALES_FILE) > os.path.getmtime(MATERIALES_PARQUET):
        reconstruir = True

    if reconstruir:
        print("🔄 [Materiales] Actualizando caché Parquet...")
        try:
            df_mat = pd.read_excel(MATERIALES_FILE, dtype={"NUMERO_DE_ORDEN_DE_TOA": str, "Pet_atis": str})
            df_mat.columns = [c.strip() for c in df_mat.columns]
            
            # Dejamos guardado el parquet con el mapeo estructurado a appt_number
            if "NUMERO_DE_ORDEN_DE_TOA" in df_mat.columns:
                df_mat = df_mat.rename(columns={"NUMERO_DE_ORDEN_DE_TOA": "appt_number"})
                df_mat["appt_number"] = df_mat["appt_number"].astype(str).str.strip()
            
            if "Pet_atis" in df_mat.columns:
                df_mat["Pet_atis"] = df_mat["Pet_atis"].astype(str).str.split('.').str[0].str.strip()
                
            os.makedirs(os.path.dirname(MATERIALES_PARQUET), exist_ok=True)
            df_mat.to_parquet(MATERIALES_PARQUET, index=False)
            print(f"💾 [Debug Materiales] Caché guardada correctamente en: {MATERIALES_PARQUET}")
            return df_mat
            
        except Exception as e:
            print(f"❌ [Debug Materiales] ERROR CRÍTICO: {str(e)}")
            return None
            
    return pd.read_parquet(MATERIALES_PARQUET)


@router.get("/informe")
def informe():
    df = obtener_datos_optimizados()
    df = df.where(pd.notnull(df), None)
    
    df_precios = obtener_precios_optimizados()
    df_materiales = obtener_materiales_optimizados()
    
    df["Fecha_de_cierre_final"] = pd.to_datetime(df["Fecha_de_cierre_final"], errors="coerce")
    df = df.dropna(subset=["Fecha_de_cierre_final"])
    
    # 🔴 FILTRADO: Exclusión de órdenes corporativas
    ordenes_a_excluir = ["CORP_MIGRAC_CR", "CORP_INST_CR", "CORP_PRUEBAS_CR", "CORP_VISITA_CR"]
    df = df[~df["Tipo_de_orden"].isin(ordenes_a_excluir)]
    
    if "Subtipo_de_orden" in df.columns:
        df["Subtipo_de_orden"] = df["Subtipo_de_orden"].astype(str).str.strip()
    
    # 1. Cruzar Mano de Obra (Precios Base)
    df = pd.merge(df, df_precios, on="Subtipo_de_orden", how="left")
    df["Valor_promedio_en_dinero"] = df["Valor_promedio_en_dinero"].fillna(0)
    df["Valor_promedio_en_baremos"] = df["Valor_promedio_en_baremos"].fillna(0)
    
    # 2. PROCESAR REGLAS DE NEGOCIO DE MATERIALES (CRUCE POR APPT_NUMBER) 📦
    df["Costo_Materiales_Total"] = 0.0
    df["Baremos_Materiales_Total"] = 0.0
    
    if df_materiales is not None and not df_materiales.empty:
        df_mat_clean = df_materiales.copy()
        
        # Limpieza de nombres de columna
        df_mat_clean.columns = [c.strip() for c in df_mat_clean.columns]
        cols_en_mayuscula = {c.upper(): c for c in df_mat_clean.columns}
        
        # Asegurar mapeo de NUMERO_DE_ORDEN_DE_TOA a appt_number en caso de lectura directa desde Parquet anterior
        col_toa_real = cols_en_mayuscula.get("NUMERO_DE_ORDEN_DE_TOA") or cols_en_mayuscula.get("NUMERO_DE_ORDEN")
        if col_toa_real:
            df_mat_clean = df_mat_clean.rename(columns={col_toa_real: "appt_number"})
        
        if "appt_number" in df_mat_clean.columns:
            df_mat_clean["appt_number"] = df_mat_clean["appt_number"].astype(str).str.strip()
        else:
            df_mat_clean["appt_number"] = df_mat_clean.iloc[:, 0].astype(str).str.strip()

        # Mapear dinámicamente columnas de datos requeridas por tu algoritmo
        col_desc = cols_en_mayuscula.get("DESC_TIPO_EQUIPO") or cols_en_mayuscula.get("DESC_TIPO_DE_EQUIPO") or cols_en_mayuscula.get("DESC_MATERIAL") or "DESC_TIPO_EQUIPO"
        col_trans = cols_en_mayuscula.get("TRANSACCION") or cols_en_mayuscula.get("TIPO_TRANSACCION") or "TRANSACCION"
        col_cant = cols_en_mayuscula.get("CANTIDAD") or cols_en_mayuscula.get("CANT_MATERIAL") or "CANTIDAD"
        col_fam = cols_en_mayuscula.get("FAMILIA") or "FAMILIA"
        col_sub = cols_en_mayuscula.get("SUBTIPO_DE_ORDEN") or "Subtipo_de_orden"

        print("⚙️ [Reglas Negocio] Agrupando materiales por 'appt_number'...")
        
        # Agrupamos las líneas de materiales bajo su identificador común de cita TOA
        ordenes_agrupadas = df_mat_clean.groupby("appt_number").agg(
            SUBTIPO_DE_ORDEN=(col_sub, "first"),
            LISTA_DESC_EQUIPO=(col_desc, list),
            LISTA_TRANSACCIONES=(col_trans, list),
            LISTA_CANTIDADES=(col_cant, list),
            LISTA_FAMILIAS=(col_fam, list)
        ).reset_index()
        
        # Aplicación con expansión explícita de columnas para prevenir desalineaciones (evita el ValueError/KeyError)
        excedentes_df = ordenes_agrupadas.apply(calcular_items_adicionales, axis=1, result_type="expand")
        ordenes_agrupadas[["Extra_Dinero", "Extra_Baremos"]] = excedentes_df
        
        # Cruzar resultados liquidados con el DataFrame maestro usando 'appt_number'
        df_excedentes = ordenes_agrupadas[["appt_number", "Extra_Dinero", "Extra_Baremos"]]
        df = pd.merge(df, df_excedentes, on="appt_number", how="left")
        
        df["Costo_Materiales_Total"] = df["Extra_Dinero"].fillna(0)
        df["Baremos_Materiales_Total"] = df["Extra_Baremos"].fillna(0)
        df = df.drop(columns=["Extra_Dinero", "Extra_Baremos"], errors="ignore")

    # Campos de tiempo y fechas
    df["Mes_Ingles"] = df["Fecha_de_cierre_final"].dt.month_name()
    df["Mes"] = df["Mes_Ingles"].map(MESES_ESPANOL).fillna(df["Mes_Ingles"])
    df["Solo_Fecha"] = df["Fecha_de_cierre_final"].dt.date
    df["Dia_Del_Mes"] = df["Fecha_de_cierre_final"].dt.day

    df["Es_Domingo"] = df["Fecha_de_cierre_final"].dt.dayofweek == 6
    df["Es_Festivo"] = df["Solo_Fecha"].isin(festivos_set)
    df["Es_No_Laboral"] = df["Es_Domingo"] | df["Es_Festivo"]

    df["Inicial_Dia"] = df["Fecha_de_cierre_final"].dt.day_name().str[0]
    df["Inicial_Es"] = df["Fecha_de_cierre_final"].dt.day_name().map(mapa_iniciales)

    fecha_modificacion = datetime.fromtimestamp(os.path.getmtime(EXCEL_FILE)).strftime('%d/%m/%Y %I:%M %p')
    
    meses_disponibles = [m for m in list(MESES_ESPANOL.values()) if m in df["Mes"].unique()]
    departamentos_disponibles = df["Departamento"].dropna().unique().tolist()
    tipos_orden_disponibles = df["Tipo_de_orden"].dropna().unique().tolist()

    # Agrupación final unificada por Técnico y Día
    agrupado_por_dia = df.groupby([
        "Nombre_Tecnico", "Departamento", "Mes", "Dia_Del_Mes", "Tipo_de_orden", "Es_No_Laboral"
    ]).agg(
        Cantidad=("appt_number", "count"),
        Total_Mano_Obra=("Valor_promedio_en_dinero", "sum"),
        Total_Materiales=("Costo_Materiales_Total", "sum"),
        Total_Baremos=("Valor_promedio_en_baremos", "sum")
    ).reset_index()
    
    # Total_Dinero combina mano de obra base + excedentes calculados por materiales para tu UI en React
    agrupado_por_dia["Total_Dinero"] = agrupado_por_dia["Total_Mano_Obra"] + agrupado_por_dia["Total_Materiales"]

    df_dias = df[["Mes", "Dia_Del_Mes", "Inicial_Es", "Es_No_Laboral"]].drop_duplicates().sort_values("Dia_Del_Mes")
    calendario_meses = {}
    for m in meses_disponibles:
        df_m = df_dias[df_dias["Mes"] == m]
        calendario_meses[m] = df_m.to_dict(orient="records")

    # KPIs Globales consolidados
    kpis_globales = {
        "Total_Ordenes_Empresa": int(df["appt_number"].count()),
        "Total_Dias_Operados": int(df["Solo_Fecha"].nunique()),
        "Total_Mano_Obra_Empresa": float(df["Valor_promedio_en_dinero"].sum()),
        "Total_Materiales_Empresa": float(df["Costo_Materiales_Total"].sum()),
        "Total_Facturado_Empresa": float(df["Valor_promedio_en_dinero"].sum() + df["Costo_Materiales_Total"].sum()),
        "Total_Baremos_Empresa": float(df["Valor_promedio_en_baremos"].sum() + df["Baremos_Materiales_Total"].sum())
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
            "calendario_por_mes": calendario_meses
        },
        "kpis_globales": kpis_globales,
        "lineas_productividad_base": agrupado_por_dia.to_dict(orient="records")
    }