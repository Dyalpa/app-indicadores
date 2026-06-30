export function procesarProductividad(data, filters) {
  if (!data) return { tecnicosFiltrados: [], registrosGraficoCircular: [] };

  const baseDeDatos = data.lineas_productividad_base || [];
  // Catalogación de tipos de orden para inicialización por técnico
  const tiposOrdenDisponibles = data.filtros_disponibles?.tipos_orden || [];
  
  // 1. Filtrado en Cascada (Productividad)
  let filtrados = baseDeDatos.filter(r => r.Mes === filters.selectedMes);

  if (filters.selectedDepto) filtrados = filtrados.filter(r => r.Departamento === filters.selectedDepto);
  if (filters.selectedTipoOrden) filtrados = filtrados.filter(r => r.Tipo_de_orden === filters.selectedTipoOrden);
  
  if (filters.selectedTipoDia === 'laboral') {
    filtrados = filtrados.filter(r => r.Es_No_Laboral === false);
  } else if (filters.selectedTipoDia === 'no_laboral') {
    filtrados = filtrados.filter(r => r.Es_No_Laboral === true);
  }

  filtrados = filtrados.filter(r => r.Dia_Del_Mes >= filters.diaInicio && r.Dia_Del_Mes <= filters.diaFin);

  // 2. Datos para Gráfico circular
  let registrosGraficoCircular = filtrados;
  if (filters.selectedTecnico) {
    registrosGraficoCircular = filtrados.filter(r => r.Nombre_Tecnico === filters.selectedTecnico);
  }

  // 3. Agrupación y Reducción por Técnico
  const mapeoTecnicos = filtrados.reduce((acc, curr) => {
    const llave = `${curr.Nombre_Tecnico}-${curr.Departamento}`;
    if (!acc[llave]) {
      acc[llave] = {
        Nombre_Tecnico: curr.Nombre_Tecnico,
        Departamento: curr.Departamento,
        Mes: filters.selectedMes,
        Total_Ordenes: 0,
        Facturacion_Total: 0, 
        Baremos_Totales: 0,   
        diasSet: new Set(),
        tipos_orden: {}
      };
      tiposOrdenDisponibles.forEach(tipo => {
        acc[llave].tipos_orden[tipo] = 0;
      });
    }
    
    acc[llave].Total_Ordenes += curr.Cantidad;
    acc[llave].Facturacion_Total += curr.Total_Dinero || 0; 
    acc[llave].Baremos_Totales += curr.Total_Baremos || 0;   
    acc[llave].diasSet.add(curr.Dia_Del_Mes);
    
    if (acc[llave].tipos_orden[curr.Tipo_de_orden] !== undefined) {
      acc[llave].tipos_orden[curr.Tipo_de_orden] += curr.Cantidad;
    } else {
      acc[llave].tipos_orden[curr.Tipo_de_orden] = curr.Cantidad;
    }
    
    return acc;
  }, {});

  const tecnicosFiltrados = Object.values(mapeoTecnicos).map((t, index) => {
    const diasTrabajados = t.diasSet.size;
    return {
      id_unico: `${t.Nombre_Tecnico}-${t.Departamento}-${index}`,
      Nombre_Tecnico: t.Nombre_Tecnico,
      Departamento: t.Departamento,
      Mes: t.Mes,
      Dias_Trabajados: diasTrabajados,
      Total_Ordenes: t.Total_Ordenes,
      Facturacion_Total: Number(t.Facturacion_Total.toFixed(2)), 
      Baremos_Totales: Number(t.Baremos_Totales.toFixed(2)),      
      Promedio_Diario: diasTrabajados > 0 ? Number((t.Total_Ordenes / diasTrabajados).toFixed(2)) : 0,
      tipos_orden: t.tipos_orden
    };
  }).sort((a, b) => b.Promedio_Diario - a.Promedio_Diario);

  return { tecnicosFiltrados, registrosGraficoCircular };
}

// ========================================================
// 🔄 FUNCIÓN AJUSTADA: PROCESAR REITERO REACTIVO
// ========================================================
export function procesarReitero(reiteroData, filters) {
  // Si no hay datos de reitero cargados aún, devolvemos la estructura limpia por defecto
  if (!reiteroData) {
    return {
      kpis: { total_averias: 0, total_reiteros: 0, tasa_reitero_global: 0 },
      tecnicos: [],
      vision: [],
      rangos: [],
      filtros: { departamentos: [], meses: [], calendario_por_mes: {} }
    };
  }

  // Retornamos directamente lo procesado por el backend reactivo
  return {
    kpis: {
      total_averias: reiteroData.kpis_globales?.total_averias || 0,
      total_reiteros: reiteroData.kpis_globales?.total_reiteros || 0,
      tasa_reitero_global: reiteroData.kpis_globales?.tasa_reitero_global || 0
    },
    tecnicos: reiteroData.analisis_tecnicos_reitero || [],
    vision: reiteroData.segmentacion_vision || [],
    rangos: reiteroData.distribucion_rangos_dias || [],
    filtros: reiteroData.filtros_disponibles || { departamentos: [], meses: [], calendario_por_mes: {} }
  };
}