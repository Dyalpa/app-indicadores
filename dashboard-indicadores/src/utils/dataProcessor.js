export function procesarProductividad(data, filters) {
  if (!data) return { tecnicosFiltrados: [], registrosGraficoCircular: [] };

  const baseDeDatos = data.lineas_productividad_base || [];
  
  // 1. Filtrado en Cascada
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
        diasSet: new Set()
      };
    }
    acc[llave].Total_Ordenes += curr.Cantidad;
    acc[llave].diasSet.add(curr.Dia_Del_Mes);
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
      Promedio_Diario: diasTrabajados > 0 ? Number((t.Total_Ordenes / diasTrabajados).toFixed(2)) : 0
      
      // 🚀 ¡AQUÍ ES DONDE VAS A AGREGAR LAS MATEMÁTICAS DE TUS 4 NUEVOS INDICADORES!
      // Ejemplo: efectividad: ...
      // Ejemplo: horas_promedio: ...
    };
  }).sort((a, b) => b.Promedio_Diario - a.Promedio_Diario);

  return { tecnicosFiltrados, registrosGraficoCircular };
}