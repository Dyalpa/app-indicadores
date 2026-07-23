import React from 'react';

export default function KpiCardsReitero({ totalAverias, totalReiteros, tasaGlobal }) {
  const metaReitero = 7.0;
  const esSaludable = tasaGlobal <= metaReitero;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Averías Ingresadas</span>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-3xl font-black text-slate-900 tracking-tight">{totalAverias.toLocaleString()}</span>
          <span className="text-xs font-medium text-slate-500">casos creados</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Averías Reiteradas</span>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-3xl font-bold text-slate-900 tracking-tight">{totalReiteros.toLocaleString()}</span>
          <span className="text-xs font-medium text-slate-500">reiteraciones encontradas</span>
        </div>
      </div>

      <div className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 ${esSaludable ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
        <span className={`text-xs font-bold uppercase tracking-wider block ${esSaludable ? 'text-emerald-600' : 'text-red-500'}`}>
          Tasa Reitero
        </span>
        <div className="flex items-baseline gap-2 mt-2">
          <span className={`text-3xl font-black tracking-tight ${esSaludable ? 'text-emerald-600' : 'text-red-600'}`}>
            {tasaGlobal}%
          </span>
          <span className="text-xs font-medium text-slate-400">Meta: &lt; {metaReitero}%</span>
        </div>
      </div>
    </div>
  );
}