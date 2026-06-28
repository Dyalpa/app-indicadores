import React from 'react';

export default function Header({ fuenteMetadatos }) {
  return (
    <header className="flex flex-col lg:flex-row lg:items-start lg:justify-between pb-6 border-b border-slate-200 gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">Control de Productividad</h1>
        
      </div>
      <div className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600 space-y-1 lg:text-right shadow-sm">
        <div>📋 <span className="font-semibold text-slate-700">Registros:</span> {fuenteMetadatos?.total_registros?.toLocaleString() ?? "Cargando..."}</div>
        <div>📊 <span className="font-semibold text-slate-700">Fuente:</span> {fuenteMetadatos?.archivo}</div>
        <div>⏱️ <span className="font-semibold text-slate-700">Actualizado:</span> {fuenteMetadatos?.ultima_actualizacion}</div>
      </div>
    </header>
  );
}