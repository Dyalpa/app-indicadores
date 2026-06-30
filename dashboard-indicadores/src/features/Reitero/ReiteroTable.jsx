import React, { useState } from 'react';

export default function ReiteroTable({ data, globalRate }) {
  const [busqueda, setBusqueda] = useState('');

  // Filtrado reactivo en UI por la caja de búsqueda por Nombre
  const filtradosPorNombre = data.filter(t => 
    t.Tecnico && t.Tecnico.toLowerCase().includes(busqueda.toLowerCase())
  );

  const exportarExcelCSV = () => {
    if (filtradosPorNombre.length === 0) return;
    const encabezados = ["Tecnico", "Departamento", "Averias Atendidas", "Reiteros Causados", "Tasa Reitero Individual (%)"];
    const filas = filtradosPorNombre.map(t => [
      `"${t.Tecnico}"`,
      `"${t.DEPARTAMENTO}"`,
      t.Averias_Atendidas,
      t.Reiteros_Causados,
      t.Tasa_Reitero_Tecnico
    ]);
    const contenidoCsv = "\uFEFF" + [encabezados.join(","), ...filas.map(f => f.join(","))].join("\n");
    const blob = new Blob([contenidoCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Analisis_Reiteros_Tecnicos.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <input 
            type="text"
            placeholder="Buscar técnico por nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-3 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 placeholder-slate-400 font-light"
          />
        </div>
        <button 
          onClick={exportarExcelCSV}
          className="flex items-center justify-center gap-2 px-4 py-2 border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-xl hover:bg-emerald-100 transition-colors"
        >
          📥 Exportar Técnicos Filtrados
        </button>
      </div>

      {/* Caja contenedora con Scroll Vertical Fijo idéntica a Productividad */}
      <div className="overflow-x-auto border border-slate-100 rounded-xl max-h-[440px] overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 bg-opacity-95 backdrop-blur-sm z-10">
              <th className="py-3 px-4">Técnico Responsable</th>
              <th className="py-3 px-4">Ubicación</th>
              <th className="py-3 px-4 text-center">Averías Atendidas</th>
              <th className="py-3 px-4 text-center">Reiteros Causados (Padre)</th>
              <th className="py-3 px-4 text-center">Tasa Reitero</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm font-light text-slate-600">
            {filtradosPorNombre.length > 0 ? (
              filtradosPorNombre.map((t, index) => {
                const esCritico = t.Tasa_Reitero_Tecnico > (globalRate || 10);
                return (
                  <tr key={index} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-normal text-slate-900 uppercase truncate max-w-[220px]">
                      {t.Tecnico || 'DESCONOCIDO'}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400 font-bold">
                      {t.DEPARTAMENTO}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {t.Averias_Atendidas}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-red-500 font-normal">
                      {t.Reiteros_Causados}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                        esCritico ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {t.Tasa_Reitero_Tecnico}%
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="text-center py-8 text-xs text-slate-400 font-light">
                  Ningún técnico coincide con los filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}