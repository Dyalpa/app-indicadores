// src/components/FilterPanelReitero.jsx
import React from 'react';

export default function FilterPanelReitero({
  selectedMes,
  selectedDepto,
  visionCliente,
  visionTerreno,
  filtrosDisponibles,
  reiteroData,
  manejarCambioMes,
  setSelectedDepto,
  setVisionCliente,
  setVisionTerreno
}) {

  const fuenteFiltrosReal = filtrosDisponibles?.calendario_por_mes 
    ? filtrosDisponibles 
    : (reiteroData?.filtros_disponibles || {});

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* 1. Selector de Mes */}
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mes</label>
        <select 
          value={selectedMes} 
          onChange={(e) => manejarCambioMes(e.target.value)} 
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          {fuenteFiltrosReal?.meses?.map(m => (
            <option key={`mes-${m}`} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* 2. Selector de Departamento */}
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Departamento</label>
        <select 
          value={selectedDepto} 
          onChange={(e) => setSelectedDepto(e.target.value)} 
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          <option value="">Todos los Departamentos</option>
          {fuenteFiltrosReal?.departamentos?.map(d => (
            <option key={`depto-${d}`} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* 3. Contenedor de Checkboxes de Visión */}
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Filtrar Visión</label>
        <div className="grid grid-cols-2 bg-slate-50 border border-slate-200 rounded-xl h-[38px] items-center px-4 gap-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={visionCliente} 
              onChange={(e) => setVisionCliente(e.target.checked)} 
              className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
            Cliente
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={visionTerreno} 
              onChange={(e) => setVisionTerreno(e.target.checked)} 
              className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
            Terreno
          </label>
        </div>
      </div>
    </div>
  );
}