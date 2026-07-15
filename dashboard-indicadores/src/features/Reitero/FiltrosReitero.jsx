// src/features/Reitero/FiltrosReitero.jsx
import React, { useEffect } from 'react';
import FilterPanelReitero from '../../components/FilterPanelReitero';
import CalendarFranjaGlobal from '../../components/CalendarFranjaGlobal'; 
import KpiCardsReitero from '../../components/KpiCardsReitero';
import ReiteroTable from './ReiteroTable';
import { procesarReitero } from '../../utils/dataProcessor';

// 📊 COMPONENTES ANALÍTICOS Y TABLAS DE DETALLE
import BarChartRangos from './BarChartRangos';
import LineChartAcumulado from './LineChartAcumulado'; 
import ReiteroDiasTable from './ReiteroDiasTable'; // 👈 Importación de la tabla diaria

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

  const reiteroProcesado = procesarReitero(reiteroData, filters);
  const diasCalendarioReitero = reiteroData?.filtros_disponibles?.calendario_por_mes?.[filters.selectedMes] || [];

  return (
    <div className="space-y-6">
      
      {/* CONTENEDOR ÚNICO DE FILTROS SUPERIORES */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
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

          {/* 📊 SECCIÓN DE CUADROS COMPLEMENTARIOS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 📈 INYECCIÓN DE LA CURVA ACUMULADA DIARIA */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <LineChartAcumulado data={reiteroData?.curva_ingresos_diarios} />
            </div>

            {/* 📊 GRÁFICO DE BARRAS VERTICALES DE RANGOS */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <BarChartRangos data={reiteroData?.distribucion_rangos_dias} />
            </div>
          </div>

          {/* 📋 AUDITORÍA DIARIA CON REGLA DE META ESTABLECIDA (Límite: 7%) */}
          <ReiteroDiasTable data={reiteroData?.curva_ingresos_diarios} />

          {/* RANKING GENERAL DE TÉCNICOS */}
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