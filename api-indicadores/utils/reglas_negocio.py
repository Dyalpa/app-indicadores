import pandas as pd

# 📋 Tarifas oficiales indexadas
MATRIZ_ITEMS = {
    "291481": {"baremos": 0.48, "pago": 44898.72},
    "291451": {"baremos": 0.25, "pago": 23384.75}
}

def calcular_items_adicionales(grupo_materiales):
    """
    Analiza el set de materiales de una orden (PET_ATIS) 
    y retorna la sumatoria exacta de dinero y baremos adicionales.
    """
    extra_dinero = 0.0
    extra_baremos = 0.0
    
    subtipo = str(grupo_materiales.get("SUBTIPO_DE_ORDEN", "")).upper()
    
    # Extraer listas limpias desde las filas asociadas a la PET_ATIS
    desc_equipos = [str(x).upper() for x in grupo_materiales.get("LISTA_DESC_EQUIPO", [])]
    transacciones = [str(x).lower() for x in grupo_materiales.get("LISTA_TRANSACCIONES", [])]
    cantidades = grupo_materiales.get("LISTA_CANTIDADES", [])
    familias = [str(x).upper() for x in grupo_materiales.get("LISTA_FAMILIAS", [])]

    # 🔍 1. Comprobar si la orden lleva CABLE UTP en cualquier categoría (columna DESC_TIPO_EQUIPO)
    usa_utp = any("UTP" in desc for desc in desc_equipos)

    # --- REGLA A: ALTABA con Cable UTP ---
    if subtipo == "ALTABA" and usa_utp:
        extra_dinero += MATRIZ_ITEMS["291481"]["pago"]
        extra_baremos += MATRIZ_ITEMS["291481"]["baremos"]
        return pd.Series([extra_dinero, extra_baremos])

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

    return pd.Series([extra_dinero, extra_baremos])