// src/features/Reitero/FiltrosReitero.jsx
import React from 'react';
import FilterPanelReitero from '../../components/FilterPanelReitero';
import CalendarFranjaGlobal from '../../components/CalendarFranjaGlobal'; // 👈 El nuevo calendario global único
import KpiCardsReitero from '../../components/KpiCardsReitero';
import ReiteroTable from './ReiteroTable';
import { procesarReitero } from '../../utils/dataProcessor';

export default function FiltrosReitero({ 
  reiteroData, 
  loadingReitero, 
  filters, 
  setters, 
  actions, 
  filtrosDisponibles // 👈 Esta es la data maestra inmutable que viene de App.jsx
}) {

  const reiteroProcesado = procesarReitero(reiteroData, filters);

  // 🛡️ SOLUCIÓN PARA EL 8 Y 15: Forzamos a que los días vengan SÓLO del catálogo maestro global.
  // Ignoramos por completo el calendario incompleto que devuelve el endpoint de reitero.
  const diasCalendarioReitero = reiteroData?.filtros_disponibles?.calendario_por_mes?.[filters.selectedMes] || [];

  return (
    <div className="space-y-6">
      
      {/* CONTENEDOR ÚNICO DE FILTROS SUPERIORES */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
        
        {/* Panel limpio (Ya no renderiza ninguna franja de días por dentro) */}
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

        {/* 📅 ÚNICA FRANJA DE CALENDARIO GLOBAL AUTORIZADA */}
        <div className="pt-2 border-t border-slate-100">
          <CalendarFranjaGlobal 
            diaInicio={filters.diaInicio}
            diaFin={filters.diaFin}
            selectedMes={filters.selectedMes}
            setDiaInicio={setters.setDiaInicio}
            diasCalendario={diasCalendarioReitero} // 👈 Aquí le inyectamos la data limpia del backend de Reitero
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