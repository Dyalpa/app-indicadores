import React from 'react';

export default function KpiCards({ filtrados }) {
  const totalOrdenesMes = filtrados.reduce((acc, curr) => acc + curr.Total_Ordenes, 0);
  const promedioMes = filtrados.length > 0 
    ? (filtrados.reduce((acc, curr) => acc + curr.Promedio_Diario, 0) / filtrados.length).toFixed(2)
    : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Órdenes Ejecutadas (Filtro Activo)</span>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-3xl font-black text-slate-900 tracking-tight">{totalOrdenesMes.toLocaleString()}</span>
          <span className="text-xs font-medium text-slate-500">órdenes completadas</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Productividad Promedio del Grupo</span>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-3xl font-bold text-blue-600 tracking-tight">{promedioMes}</span>
          <span className="text-xs font-medium text-slate-500">órdenes promedio / técnico / día</span>
        </div>
      </div>
    </div>
  );
}