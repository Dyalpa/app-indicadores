import React, { useEffect } from 'react';
import FilterPanelReitero from '../../components/FilterPanelReitero';
import CalendarFranjaGlobal from '../../components/CalendarFranjaGlobal'; 

export default function FiltrosReitero({ 
  reiteroData, 
  loadingReitero, 
  filters, 
  setters, 
  actions, 
  filtrosDisponibles 
}) {

  useEffect(() => {
    const mesesConData = reiteroData?.filtros_disponibles?.meses;
    if (mesesConData && mesesConData.length > 0) {
      if (!mesesConData.includes(filters.selectedMes)) {
        actions.manejarCambioMes(mesesConData[0]);
      }
    }
  }, [reiteroData, filters.selectedMes, actions]);

  const diasCalendarioReitero = reiteroData?.filtros_disponibles?.calendario_por_mes?.[filters.selectedMes] || [];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
      {/* Selector de Mes, Departamento y Visiones */}
      <FilterPanelReitero
        selectedMes={filters.selectedMes}
        selectedDepto={filters.selectedDepto}
        visionCliente={filters.visionCliente}
        visionTerreno={filters.visionTerreno}
        filtrosDisponibles={filtrosDisponibles} 
        manejarCambioMes={actions.manejarCambioMes}
        setSelectedDepto={setters.setSelectedDepto}
        setVisionCliente={setters.setVisionCliente}
        setVisionTerreno={setters.setVisionTerreno}
        reiteroData={reiteroData} 
      />

      {/* Rango de Días (Calendario) */}
      <div className="pt-2 border-t border-slate-100">
        <CalendarFranjaGlobal 
          diaInicio={filters.diaInicio}
          diaFin={filters.diaFin}
          selectedMes={filters.selectedMes}
          setDiaInicio={setters.setDiaInicio}
          diasCalendario={diasCalendarioReitero} 
          setDiaFin={setters.setDiaFin}
        />
      </div>
    </div>
  );
}