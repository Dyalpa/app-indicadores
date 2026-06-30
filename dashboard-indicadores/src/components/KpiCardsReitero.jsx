import React from 'react';

export default function KpiCardsReitero({ totalAverias, totalReiteros, tasaGlobal }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Averías Ingresadas (Filtro Activo)</span>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-3xl font-black text-slate-900 tracking-tight">{totalAverias.toLocaleString()}</span>
          <span className="text-xs font-medium text-slate-500">casos creados</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Casos Reiterados</span>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-3xl font-bold text-slate-900 tracking-tight">{totalReiteros.toLocaleString()}</span>
          <span className="text-xs font-medium text-slate-500">reiteraciones encontradas</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-l-4 border-l-red-500 border-slate-200 shadow-sm">
        <span className="text-xs font-bold text-red-500 uppercase tracking-wider block">Tasa Reitero Temporal</span>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-3xl font-black text-red-600 tracking-tight">{tasaGlobal}%</span>
        </div>
      </div>
    </div>
  );
}