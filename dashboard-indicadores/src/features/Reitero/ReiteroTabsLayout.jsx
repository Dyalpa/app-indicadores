import React, { useState } from 'react';
import FiltrosReitero from './FiltrosReitero';
import ReiteroTable from './ReiteroTable';
import CausalReitero from './CausalReitero'; 
import RankingTecnicosReitero from './RankingTecnicosReitero';
import OrigenReitero from './OrigenReitero';
import MapaOrdenes from './MapaOrdenes';
import { procesarReitero } from '../../utils/dataProcessor';

// 📊 COMPONENTES ANALÍTICOS
import KpiCardsReitero from '../../components/KpiCardsReitero';
import BarChartRangos from './BarChartRangos';
import LineChartAcumulado from './LineChartAcumulado'; 
import ReiteroDiasTable from './ReiteroDiasTable';

export default function ReiteroTabsLayout({
  reiteroData, loadingReitero, filtersReitero, settersReitero, actionsReitero, filtrosDisponibles,
  reintentandoReitero, reiteroError, reintentarReitero
}) {
  const [activeSubTab, setActiveSubTab] = useState('GENERAL');

  // 🎯 Subcategorías reordenadas
  const subTabs = [
    { id: 'GENERAL', label: 'Información General' },
    { id: 'TECNICOS', label: 'Reitero por Técnicos' },
    { id: 'CAUSALES', label: 'Causales' },
    { id: 'MAPA', label: 'Ubicación Geográfica' },
    { id: 'ORIGEN', label: 'Origen' },
    { id: 'RANGO', label: 'Rango' },
    { id: 'REITERATIVOS', label: 'Reiterativos' },
  ];

  const reiteroProcesado = procesarReitero(reiteroData, filtersReitero);

  // 🔁 Texto del spinner: distingue carga normal de reintento por
  // inestabilidad del túnel/red (viene desde useDashboardState)
  const textoReintento = '⚠️ Conexión inestable, reintentando...';

  return (
    <div className="space-y-6">
      
      {/* 🛠️ 1. SUBMENÚ DE SUBCATEGORÍAS */}
      <div className="flex flex-wrap gap-5 border-b border-slate-200 text-xs font-light px-2">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`pb-2 tracking-wide transition-all border-b-2 -mb-[2px] ${
              activeSubTab === tab.id 
                ? 'border-blue-600 font-normal text-slate-950' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 🔍 2. FILTROS GLOBALES */}
      <FiltrosReitero 
        reiteroData={reiteroData} 
        loadingReitero={loadingReitero}
        filters={filtersReitero} 
        setters={settersReitero}
        actions={actionsReitero} 
        filtrosDisponibles={filtrosDisponibles}
      />

      {/* 🚨 Aviso de datos desactualizados + botón para reintentar el MISMO
          filtro sin tener que cambiarlo y volver a cambiarlo. */}
      {reiteroError && !loadingReitero && (
        <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">
          <div className="flex items-start gap-2">
            <span>🚨</span>
            <span>{reiteroError}</span>
          </div>
          <button
            onClick={reintentarReitero}
            className="shrink-0 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors cursor-pointer"
          >
            🔄 Reintentar
          </button>
        </div>
      )}

      {/* 📊 3. CONTENIDO VARIABLE SEGÚN LA SUBCATEGORÍA SELECCIONADA */}
      <div className="mt-4">
        
        {/* === SUB-PESTAÑA: INFORMACIÓN GENERAL === */}
        {activeSubTab === 'GENERAL' && (
          <div className="space-y-6">
            {loadingReitero ? (
              <div className="flex h-64 flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 gap-2 shadow-sm">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className={`font-light text-xs ${reintentandoReitero ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
                  {reintentandoReitero ? textoReintento : 'Procesando matriz de reiteros...'}
                </p>
              </div>
            ) : reiteroData ? (
              <div className="space-y-6 animate-fadeIn">
                <KpiCardsReitero 
                  totalAverias={reiteroProcesado.kpis?.total_averias || 0}
                  totalReiteros={reiteroProcesado.kpis?.total_reiteros || 0}
                  tasaGlobal={reiteroProcesado.kpis?.tasa_reitero_global || 0}
                />
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="w-full overflow-hidden">
                    <LineChartAcumulado data={reiteroData?.curva_ingresos_diarios} />
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <ReiteroDiasTable data={reiteroData?.curva_ingresos_diarios} />
                </div>
              </div>
            ) : (
              <div className="text-center p-8 text-slate-400 font-light text-xs bg-white rounded-2xl border border-slate-200">
                No se pudieron mapear los datos analíticos de reitero.
              </div>
            )}
          </div>
        )}

        {/* === SUB-PESTAÑA: REITERO POR TÉCNICOS === */}
        {activeSubTab === 'TECNICOS' && (
          <div className="animate-fadeIn">
            {loadingReitero ? (
              <div className="flex h-64 flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 gap-2 shadow-sm">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className={`font-light text-xs ${reintentandoReitero ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
                  {reintentandoReitero ? textoReintento : 'Calculando ranking de técnicos...'}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <RankingTecnicosReitero rawData={reiteroData?.reiteros_raw || []} />
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-semibold text-slate-800">Desglose Detallado</h3>
                  <ReiteroTable data={reiteroProcesado.tecnicos} globalRate={reiteroProcesado.kpis?.tasa_reitero_global} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* === SUB-PESTAÑA: CAUSALES === */}
        {activeSubTab === 'CAUSALES' && (
          <div className="animate-fadeIn">
            {loadingReitero ? (
              <div className="flex h-64 flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 gap-2 shadow-sm">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className={`font-light text-xs ${reintentandoReitero ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
                  {reintentandoReitero ? textoReintento : 'Procesando causales...'}
                </p>
              </div>
            ) : (
              <CausalReitero causalesData={reiteroData?.causales_analisis} />
            )}
          </div>
        )}

        {/* === SUB-PESTAÑA: UBICACIÓN GEOGRÁFICA === */}
        {activeSubTab === 'MAPA' && (
          <div className="animate-fadeIn">
            {loadingReitero ? (
              <div className="flex h-64 flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 gap-2 shadow-sm">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className={`font-light text-xs ${reintentandoReitero ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
                  {reintentandoReitero ? textoReintento : 'Cargando mapa de georreferenciación...'}
                </p>
              </div>
            ) : (
              <MapaOrdenes ordenesRaw={reiteroData?.reiteros_raw || []} />
            )}
          </div>
        )}

        {/* === SUB-PESTAÑA: ORIGEN === */}
        {activeSubTab === 'ORIGEN' && (
          <div className="animate-fadeIn">
            {loadingReitero ? (
              <div className="flex h-64 flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 gap-2 shadow-sm">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className={`font-light text-xs ${reintentandoReitero ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
                  {reintentandoReitero ? textoReintento : 'Analizando orígenes de diagnóstico...'}
                </p>
              </div>
            ) : (
              <OrigenReitero reiterosRaw={reiteroData?.reiteros_raw || []} />
            )}
          </div>
        )}

        {/* === SUB-PESTAÑA: RANGO === */}
        {activeSubTab === 'RANGO' && (
          <div className="animate-fadeIn">
            {loadingReitero ? (
              <div className="flex h-64 flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 gap-2 shadow-sm">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className={`font-light text-xs ${reintentandoReitero ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
                  {reintentandoReitero ? textoReintento : 'Calculando distribución de rangos por días...'}
                </p>
              </div>
            ) : reiteroData ? (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="w-full">
                  <BarChartRangos 
                    data={reiteroData?.distribucion_rangos_dias} 
                    reiterosRaw={reiteroData?.reiteros_raw || []} 
                  />
                </div>
              </div>
            ) : (
              <div className="text-center p-8 text-slate-400 font-light text-xs bg-white rounded-2xl border border-slate-200">
                No hay datos de distribución de rangos disponibles.
              </div>
            )}
          </div>
        )}

        {/* === OTRAS PESTAÑAS (FALLBACK) === */}
        {!['GENERAL', 'TECNICOS', 'CAUSALES', 'MAPA', 'ORIGEN', 'RANGO'].includes(activeSubTab) && (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs font-light animate-fadeIn">
            Módulo <span className="font-mono text-blue-600 font-semibold">{activeSubTab}</span> en desarrollo.
          </div>
        )}
      </div>

    </div>
  );
}
