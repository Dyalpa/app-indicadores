import React from 'react';

export default function FilterPanel({
  selectedMes,
  selectedDepto,
  selectedTipoOrden,
  selectedTipoDia,
  filtrosDisponibles,
  manejarCambioMes,
  setSelectedDepto,
  setSelectedTipoOrden,
  setSelectedTipoDia,
  setSelectedTecnico
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mes</label>
        <select value={selectedMes} onChange={(e) => manejarCambioMes(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
          {filtrosDisponibles.meses.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Departamento</label>
        <select value={selectedDepto} onChange={(e) => { setSelectedDepto(e.target.value); setSelectedTecnico(null); }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
          <option value="">Todos</option>
          {filtrosDisponibles.departamentos.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Orden</label>
        <select value={selectedTipoOrden} onChange={(e) => { setSelectedTipoOrden(e.target.value); setSelectedTecnico(null); }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
          <option value="">Todos</option>
          {filtrosDisponibles.tipos_orden.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Día</label>
        <select value={selectedTipoDia} onChange={(e) => { setSelectedTipoDia(e.target.value); setSelectedTecnico(null); }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
          <option value="">Todos los Días</option>
          <option value="laboral">Días Laborales (Lun - Sáb)</option>
          <option value="no_laboral">Domingos y Festivos</option>
        </select>
      </div>
    </div>
  );
}