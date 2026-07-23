import React from 'react';

export default function ReiteroDiasTable({ data = [] }) {
  
  // 📊 Consolidar datos por día y calcular tasas puntuales y acumuladas
  const procesarDatosHorizontales = () => {
    if (!data || data.length === 0) return null;

    const mapaDias = {};
    
    // 1. Agrupar por día para consolidar registros (Visiones/Departamentos)
    data.forEach(reg => {
      const dia = reg.Dia_Ingreso;
      if (!mapaDias[dia]) {
        mapaDias[dia] = { averias: 0, reiteros: 0 };
      }
      mapaDias[dia].averias += (reg.Averias_Ingresadas || 0);
      mapaDias[dia].reiteros += (reg.Reiteros_Ingresados || 0);
    });

    // 2. Ordenar días de forma ascendente
    const diasOrdenados = Object.keys(mapaDias)
      .map(Number)
      .sort((a, b) => a - b);

    let acumuladoAverias = 0;
    let acumuladoReiteros = 0;

    // 3. Mapear la información en un formato indexado por día
    const columnasDias = diasOrdenados.map(dia => {
      const { averias, reiteros } = mapaDias[dia];
      
      acumuladoAverias += averias;
      acumuladoReiteros += reiteros;

      const tasaDelDia = averias > 0 ? (reiteros / averias) * 100 : 0;
      const tasaAcumulada = acumuladoAverias > 0 ? (acumuladoReiteros / acumuladoAverias) * 100 : 0;

      return {
        numeroDia: dia,
        label: `${dia}`, // Simplificado solo al número para evitar scroll horizontal
        averias,
        reiteros,
        tasaDelDia: parseFloat(tasaDelDia.toFixed(1)), // 1 decimal para ahorrar más espacio horizontal
        tasaAcumulada: parseFloat(tasaAcumulada.toFixed(1))
      };
    });

    return columnasDias;
  };

  const columnasDias = procesarDatosHorizontales();

  if (!columnasDias || columnasDias.length === 0) {
    return (
      <div className="text-center p-6 text-slate-400 font-light text-xs bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
        Sin datos diarios mapeados para generar la tabla.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden w-full">
      {/* 🛠️ Cabecera Simplificada */}
      <div className="p-4 border-b border-slate-100 bg-white">
        <h3 className="text-sm font-semibold text-slate-800">Comportamiento Diario de Reitero</h3>
        <p className="text-[11px] text-slate-400 font-light">Seguimiento diario del mes con regla de meta (≤ 7%)</p>
      </div>

      {/* Contenedor adaptado a todo el ancho sin scroll */}
      <div className="w-full overflow-hidden">
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {/* Esquina fija sin necesidad de sticky al no haber scroll */}
              <th className="p-2 border-r border-slate-150 w-[110px] text-slate-600 bg-slate-50 pl-3">
                Día del Mes
              </th>
              {columnasDias.map((col) => (
                <th key={col.numeroDia} className="py-2 px-0.5 text-center font-mono text-slate-700 bg-slate-50 text-[10px] border-b border-slate-200">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[10px]">
            
            {/* FILA 1: AVERÍAS */}
            <tr className="hover:bg-slate-50/40 transition-colors">
              <td className="p-2 font-medium text-slate-500 bg-slate-50/50 border-r border-slate-150 pl-3">
                Averías
              </td>
              {columnasDias.map((col) => (
                <td key={col.numeroDia} className="py-2 px-0.5 text-center text-slate-600 font-mono">
                  {col.averias}
                </td>
              ))}
            </tr>

            {/* FILA 2: REITEROS */}
            <tr className="hover:bg-slate-50/40 transition-colors">
              <td className="p-2 font-medium text-slate-500 bg-slate-50/50 border-r border-slate-150 pl-3">
                Reiteros
              </td>
              {columnasDias.map((col) => (
                <td key={col.numeroDia} className="py-2 px-0.5 text-center text-slate-600 font-mono">
                  {col.reiteros}
                </td>
              ))}
            </tr>

            {/* FILA 3: TASA DIARIA (Compactada) */}
            <tr className="hover:bg-slate-50/40 transition-colors">
              <td className="p-2 font-bold text-slate-700 bg-slate-50/50 border-r border-slate-150 pl-3">
                Tasa Diaria
              </td>
              {columnasDias.map((col) => (
                <td key={col.numeroDia} className="py-1 px-0.5 text-center font-bold font-mono">
                  <span className={`inline-block w-full py-0.5 rounded text-[9px] ${
                    col.tasaDelDia > 7.0 
                      ? 'bg-red-50 text-red-700' 
                      : 'bg-green-50 text-green-700'
                  }`}>
                    {col.tasaDelDia}%
                  </span>
                </td>
              ))}
            </tr>

            {/* FILA 4: TASA ACUMULADA (Compactada) */}
            <tr className="hover:bg-slate-50/40 transition-colors">
              <td className="p-2 font-bold text-slate-700 bg-slate-50/50 border-r border-slate-150 pl-3">
                Tasa Acum.
              </td>
              {columnasDias.map((col) => (
                <td key={col.numeroDia} className="py-1 px-0.5 text-center font-bold font-mono">
                  <span className={`inline-block w-full py-0.5 rounded text-[9px] ${
                    col.tasaAcumulada > 7.0 
                      ? 'bg-red-100 text-red-850' 
                      : 'bg-green-100 text-green-850'
                  }`}>
                    {col.tasaAcumulada}%
                  </span>
                </td>
              ))}
            </tr>

          </tbody>
        </table>
      </div>
    </div>
  );
}