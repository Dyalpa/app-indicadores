import React from 'react';

export default function ProductivityTable({ data, onSelectTecnico, seleccionado }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <th className="p-4">Técnico</th>
            <th className="p-4">Departamento</th>
            <th className="p-4 text-center">Días Trabajados</th>
            <th className="p-4 text-center">Órdenes Realizadas</th>
            <th className="p-4 text-right">Promedio Diario</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
          {data.map((row) => {
            const isSelected = seleccionado === row.Nombre_Tecnico;
            return (
              <tr 
                key={row.id_unico} /* 👈 Solución al error de duplicados en consola */
                onClick={() => onSelectTecnico(row.Nombre_Tecnico)}
                className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/80 font-medium' : ''}`}
              >
                <td className="p-4 font-semibold text-slate-900">{row.Nombre_Tecnico}</td>
                <td className="p-4">
                  <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                    {row.Departamento}
                  </span>
                </td>
                <td className="p-4 text-center font-medium text-slate-800">{row.Dias_Trabajados}</td>
                <td className="p-4 text-center text-slate-700">{row.Total_Ordenes}</td>
                <td className="p-4 text-right font-bold">
                  <span className={`px-2.5 py-1 rounded-lg text-xs ${row.Promedio_Diario >= 4.5 ? 'text-emerald-700 bg-emerald-100' : 'text-blue-700 bg-blue-100'}`}>
                    {row.Promedio_Diario}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}