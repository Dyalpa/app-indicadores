// src/features/Reitero/FiltrosReitero.jsx
import React, { useEffect } from 'react'; // 👈 Importamos useEffect
import FilterPanelReitero from '../../components/FilterPanelReitero';
import CalendarFranjaGlobal from '../../components/CalendarFranjaGlobal'; 
import KpiCardsReitero from '../../components/KpiCardsReitero';
import ReiteroTable from './ReiteroTable';
import { procesarReitero } from '../../utils/dataProcessor';

export default function FiltrosReitero({ 
  reiteroData, 
  loadingReitero, 
  filters, 
  setters, 
  actions, 
  filtrosDisponibles 
}) {

  // 🎯 SINCRONIZACIÓN AUTOMÁTICA DEL MES INICIAL CON LA DATA REAL
  useEffect(() => {
    const mesesConData = reiteroData?.filtros_disponibles?.meses;
    
    if (mesesConData && mesesConData.length > 0) {
      // Si el mes seleccionado actualmente (ej: Enero) no tiene data real en el archivo,
      // forzamos al sistema a moverse al primer mes que sí tenga registros (ej: Junio).
      if (!mesesConData.includes(filters.selectedMes)) {
        actions.manejarCambioMes(mesesConData[0]);
      }
    }
  }, [reiteroData, filters.selectedMes, actions]);

  const reiteroProcesado = procesarReitero(reiteroData, filters);

  // Forzamos a que los días vengan de la data del backend de reitero
  const diasCalendarioReitero = reiteroData?.filtros_disponibles?.calendario_por_mes?.[filters.selectedMes] || [];

  return (
    <div className="space-y-6">
      
      {/* CONTENEDOR ÚNICO DE FILTROS SUPERIORES */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
        
        {/* Panel limpio */}
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

        {/* 📅 FRANJA DE CALENDARIO GLOBAL */}
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

      {loadingReitero ? (
        <div className="flex h-64 flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 gap-2 shadow-sm">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-light text-xs">Procesando matriz de reiteros...</p>
        </div>
      ) : reiteroData ? (
        <>
          <KpiCardsReitero 
            totalAverias={reiteroProcesado.kpis?.total_averias || 0}
            totalReiteros={reiteroProcesado.kpis?.total_reiteros || 0}
            tasaGlobal={reiteroProcesado.kpis?.tasa_reitero_global || 0}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-xs font-light text-slate-400">
              💡 Gráfico de Visión (Cliente vs Terreno) - Pendiente por inyectar.
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-xs font-light text-slate-400">
              💡 Distribución por Rango de Días - Pendiente por inyectar.
            </div>
          </div>

          <ReiteroTable 
            data={reiteroProcesado.tecnicos}
            globalRate={reiteroProcesado.kpis?.tasa_reitero_global}
          />
        </>
      ) : (
        <div className="text-center p-8 text-slate-400 font-light text-xs bg-white rounded-2xl border border-slate-200">
          No se pudieron mapear los datos analíticos de reitero.
        </div>
      )}
    </div>
  );
}