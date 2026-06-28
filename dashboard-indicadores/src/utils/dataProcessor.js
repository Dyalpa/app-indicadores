export function procesarProductividad(data, filters) {
  if (!data) return { tecnicosFiltrados: [], registrosGraficoCircular: [] };

  const baseDeDatos = data.lineas_productividad_base || [];
  // 🌟 Obtenemos el catálogo de tipos de orden directamente de la API para inicializarlos
  const tiposOrdenDisponibles = data.filtros_disponibles?.tipos_orden || [];
  
  // 1. Filtrado en Cascada (Mantenido tal cual)
  let filtrados = baseDeDatos.filter(r => r.Mes === filters.selectedMes);

  if (filters.selectedDepto) filtrados = filtrados.filter(r => r.Departamento === filters.selectedDepto);
  if (filters.selectedTipoOrden) filtrados = filtrados.filter(r => r.Tipo_de_orden === filters.selectedTipoOrden);
  
  if (filters.selectedTipoDia === 'laboral') {
    filtrados = filtrados.filter(r => r.Es_No_Laboral === false);
  } else if (filters.selectedTipoDia === 'no_laboral') {
    filtrados = filtrados.filter(r => r.Es_No_Laboral === true);
  }

  filtrados = filtrados.filter(r => r.Dia_Del_Mes >= filters.diaInicio && r.Dia_Del_Mes <= filters.diaFin);

  // 2. Datos para Gráfico circular (Mantenido tal cual)
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
        Facturacion_Total: 0,  // 💵 Acumulador financiero
        Baremos_Totales: 0,    // 📊 Acumulador de esfuerzo (baremos)
        diasSet: new Set(),
        // 🌟 Inicializamos cada tipo de orden disponible en 0 para este técnico
        tipos_orden: {}
      };
      tiposOrdenDisponibles.forEach(tipo => {
        acc[llave].tipos_orden[tipo] = 0;
      });
    }
    
    acc[llave].Total_Ordenes += curr.Cantidad;
    acc[llave].Facturacion_Total += curr.Total_Dinero || 0;  // 💵 Suma el dinero calculado por la API
    acc[llave].Baremos_Totales += curr.Total_Baremos || 0;    // 📊 Suma los baremos calculados por la API
    acc[llave].diasSet.add(curr.Dia_Del_Mes);
    
    // 🌟 Sumamos las órdenes correspondientes a este tipo específico
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
      Facturacion_Total: Number(t.Facturacion_Total.toFixed(2)), // 💵 Redondeo financiero
      Baremos_Totales: Number(t.Baremos_Totales.toFixed(2)),     // 📊 Redondeo operativo
      Promedio_Diario: diasTrabajados > 0 ? Number((t.Total_Ordenes / diasTrabajados).toFixed(2)) : 0,
      
      // 🌟 Pasamos el mapa discriminado de tipos de orden listo para la tabla
      tipos_orden: t.tipos_orden
      
      // 🚀 ¡AQUÍ ES DONDE VAS A AGREGAR LAS MATEMÁTICAS DE TUS 4 NUEVOS INDICADORES!
      // Ejemplo: efectividad: ...
      // Ejemplo: horas_promedio: ...
    };
  }).sort((a, b) => b.Promedio_Diario - a.Promedio_Diario);

  return { tecnicosFiltrados, registrosGraficoCircular };
}