import React, { useState, useEffect, useRef } from 'react';

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
  // Estado para controlar la apertura del menú desplegable personalizado
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Cierra el menú automáticamente si el usuario hace clic fuera de él
  useEffect(() => {
    function manejarClicFuera(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', manejarClicFuera);
    return () => document.removeEventListener('mousedown', manejarClicFuera);
  }, []);

  const manejarCambioCheckbox = (tipo) => {
    if (typeof setSelectedTecnico === 'function') {
      setSelectedTecnico(null);
    }
    
    if (selectedTipoOrden.includes(tipo)) {
      setSelectedTipoOrden(selectedTipoOrden.filter(t => t !== tipo));
    } else {
      setSelectedTipoOrden([...selectedTipoOrden, tipo]);
    }
  };

  const limpiarTiposOrden = () => {
    if (typeof setSelectedTecnico === 'function') {
      setSelectedTecnico(null);
    }
    setSelectedTipoOrden([]); 
  };

  // Renderiza el texto dinámico del botón según la selección
  const obtenerTextoBoton = () => {
    if (selectedTipoOrden.length === 0) return 'Todos';
    if (selectedTipoOrden.length === 1) return selectedTipoOrden[0];
    return `${selectedTipoOrden.length} Seleccionados`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. MES */}
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mes</label>
        <select value={selectedMes} onChange={(e) => manejarCambioMes(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
          {filtrosDisponibles?.meses?.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* 2. DEPARTAMENTO */}
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Departamento</label>
        <select value={selectedDepto} onChange={(e) => { setSelectedDepto(e.target.value); if (typeof setSelectedTecnico === 'function') setSelectedTecnico(null); }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
          <option value="">Todos</option>
          {filtrosDisponibles?.departamentos?.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* 3. TIPO DE ORDEN (DROPDOWN PERSONALIZADO CON CASILLAS) */}
      <div className="relative" ref={dropdownRef}>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Orden</label>
        
        {/* Botón que actúa como el select nativo */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex justify-between items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left cursor-pointer"
        >
          <span className="truncate">{obtenerTextoBoton()}</span>
          <svg className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Menú flotante desplegable */}
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg p-2.5 max-h-[220px] overflow-y-auto">
            <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-400">Opciones</span>
              <button 
                type="button"
                onClick={limpiarTiposOrden}
                className={`text-xs font-semibold px-2 py-0.5 rounded-md transition-colors ${
                  selectedTipoOrden.length === 0 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                }`}
              >
                Todos
              </button>
            </div>

            <div className="space-y-2">
              {filtrosDisponibles?.tipos_orden?.map(t => {
                const estaChequeado = selectedTipoOrden.includes(t);
                return (
                  <label key={t} className="flex items-center space-x-2 text-sm font-medium text-slate-700 hover:bg-slate-50 p-1 rounded-md cursor-pointer select-none transition-colors">
                    <input
                      type="checkbox"
                      checked={estaChequeado}
                      onChange={() => manejarCambioCheckbox(t)}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className={estaChequeado ? "text-blue-600 font-semibold" : ""}>{t}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. TIPO DE DÍA */}
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Día</label>
        <select value={selectedTipoDia} onChange={(e) => { setSelectedTipoDia(e.target.value); if (typeof setSelectedTecnico === 'function') setSelectedTecnico(null); }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
          <option value="">Todos los Días</option>
          <option value="laboral">Días Laborales (Lun - Sáb)</option>
          <option value="no_laboral">Domingos y Festivos</option>
        </select>
      </div>
    </div>
  );
}