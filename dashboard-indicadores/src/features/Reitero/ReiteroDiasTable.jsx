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
        label: `Día ${dia}`,
        averias,
        reiteros,
        tasaDelDia: parseFloat(tasaDelDia.toFixed(2)),
        tasaAcumulada: parseFloat(tasaAcumulada.toFixed(2))
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
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Cabecera interna de la tabla */}
      <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-slate-900">📋 Auditoría de Movimiento Diario</h3>
          <p className="text-[11px] text-slate-400 font-light">Evolución e histórico de jornadas analizadas (Meta: ≤ 7%)</p>
        </div>
        <span className="text-[10px] bg-slate-200 text-slate-700 font-semibold px-2 py-1 rounded-md">
          {columnasDias.length} Columnas
        </span>
      </div>

      {/* Tabla con Scroll Horizontal */}
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        <table className="w-full text-left border-collapse min-w-max">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {/* Esquina muerta de la tabla fijada a la izquierda */}
              <th className="p-3 sticky left-0 bg-slate-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-slate-200 min-w-[140px]">
                Métricas / Jornada
              </th>
              {columnasDias.map((col) => (
                <th key={col.numeroDia} className="p-3 text-center min-w-[85px] font-mono text-slate-700 bg-slate-50">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            
            {/* FILA 1: AVERÍAS */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="p-3 font-medium text-slate-500 bg-slate-50 sticky left-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-slate-200">
                Averías
              </td>
              {columnasDias.map((col) => (
                <td key={col.numeroDia} className="p-3 text-center text-slate-600 font-mono">
                  {col.averias.toLocaleString()}
                </td>
              ))}
            </tr>

            {/* FILA 2: REITEROS */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="p-3 font-medium text-slate-500 bg-slate-50 sticky left-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-slate-200">
                Reiteros
              </td>
              {columnasDias.map((col) => (
                <td key={col.numeroDia} className="p-3 text-center text-slate-600 font-mono">
                  {col.reiteros.toLocaleString()}
                </td>
              ))}
            </tr>

            {/* FILA 3: TASA DIARIA (Semaforizada ≤ 7%) */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="p-3 font-bold text-slate-700 bg-slate-50 sticky left-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-slate-200">
                Tasa Diaria
              </td>
              {columnasDias.map((col) => (
                <td key={col.numeroDia} className="p-3 text-center font-bold font-mono">
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] ${
                    col.tasaDelDia > 7.0 
                      ? 'bg-red-50 text-red-700' 
                      : 'bg-green-50 text-green-700'
                  }`}>
                    {col.tasaDelDia}%
                  </span>
                </td>
              ))}
            </tr>

            {/* FILA 4: TASA ACUMULADA (Semaforizada ≤ 7%) */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="p-3 font-bold text-slate-700 bg-slate-50 sticky left-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-slate-200">
                Tasa Acumulada
              </td>
              {columnasDias.map((col) => (
                <td key={col.numeroDia} className="p-3 text-center font-bold font-mono">
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] ${
                    col.tasaAcumulada > 7.0 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-green-100 text-green-800'
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