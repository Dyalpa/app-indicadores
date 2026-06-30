import React from 'react';
import { useDashboardState } from './hooks/useDashboardState';
import { procesarProductividad } from './utils/dataProcessor';

import Header from './components/Header';
import FilterPanel from './components/FilterPanel';
import CalendarFranja from './components/CalendarFranja';
import KpiCards from './components/KpiCards';
import BarChartRanking from './features/Productividad/BarChartRanking';
import OrderPieChart from './features/Productividad/OrderPieChart';
import ProductivityTable from './features/Productividad/ProductivityTable';

// 📦 IMPORTACIÓN DEL CONTENEDOR MODULAR
import ReiteroDashboard from './features/Reitero/FiltrosReitero';

export default function App() {
  const { 
    data, 
    loading, 
    reiteroData, 
    loadingReitero, 
    activeTab, 
    setActiveTab, 
    // 🔄 Desestructuramos los nuevos objetos independientes del hook
    filtersProductividad,
    filtersReitero,
    settersReitero,
    actionsProductividad,
    actionsReitero
  } = useDashboardState();

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-50 gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium text-sm animate-pulse">Cargando dashboard...</p>
      </div>
    );
  }

  // ⚡ Procesamiento local exclusivo de Productividad (Usa sus propios filtros separados)
  // ⚡ Procesamiento local exclusivo de Productividad (CORREGIDO: Ahora usa filtersProductividad)
  const { tecnicosFiltrados, registrosGraficoCircular } = procesarProductividad(data, filtersProductividad);
  const diasCalendarioProductividad = data?.filtros_disponibles?.calendario_por_mes?.[filtersProductividad.selectedMes] || [];
  
  // 📋 Control de Metadatos del Header
  const metadataActiva = (activeTab === 'REITERO' && reiteroData?.fuente_metadatos)
    ? reiteroData.fuente_metadatos
    : data?.fuente_metadatos;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8 font-sans antialiased">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Dinámico según la pestaña activa */}
        <Header fuenteMetadatos={metadataActiva} />

        {/* 📑 MENÚ DE PESTAÑAS */}
        <div className="flex gap-6 border-b border-slate-200 text-sm font-light px-2">
          <button 
            onClick={() => setActiveTab('PRODUCTIVIDAD')}
            className={`pb-3 tracking-wide transition-all border-b-2 ${
              activeTab === 'PRODUCTIVIDAD' 
                ? 'border-blue-600 font-normal text-slate-950' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Productividad General
          </button>
          <button 
            onClick={() => setActiveTab('REITERO')}
            className={`pb-3 tracking-wide transition-all border-b-2 ${
              activeTab === 'REITERO' 
                ? 'border-blue-600 font-normal text-slate-950' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Control de Reiteros
          </button>
        </div>

        {/* ========================================================
            🟢 VISTA 1: PRODUCTIVIDAD GENERAL
           ======================================================== */}
        {activeTab === 'PRODUCTIVIDAD' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
              <FilterPanel 
                {...filtersProductividad} 
                filtrosDisponibles={data?.filtros_disponibles} 
                manejarCambioMes={actionsProductividad.manejarCambioMes} 
              />

              <CalendarFranja 
                diaInicio={filtersProductividad.diaInicio}
                diaFin={filtersProductividad.diaFin}
                selectedMes={filtersProductividad.selectedMes}
                diasCalendario={diasCalendarioProductividad}
                manejarClickDia={actionsProductividad.manejarClickDia}
                seleccionarMesCompleto={actionsProductividad.seleccionarMesCompleto}
              />
            </div>

            <KpiCards filtrados={tecnicosFiltrados} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <BarChartRanking data={tecnicosFiltrados} onSelectTecnico={filtersProductividad.setSelectedTecnico} seleccionado={filtersProductividad.selectedTecnico} />
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <OrderPieChart tecnico={filtersProductividad.selectedTecnico} todoElDetalle={registrosGraficoCircular} />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <ProductivityTable 
                data={tecnicosFiltrados} 
                tiposOrden={data?.filtros_disponibles?.tipos_orden || []} 
                onSelectTecnico={filtersProductividad.setSelectedTecnico} 
                seleccionado={filtersProductividad.selectedTecnico} 
              />
            </div>
          </div>
        )}

        {/* ========================================================
            🔄 VISTA 2: CONTROL DE REITEROS (ENCAPSULADO)
           ======================================================== */}
       {activeTab === 'REITERO' && (
  <ReiteroDashboard 
    reiteroData={reiteroData}
    loadingReitero={loadingReitero}
    filters={filtersReitero}
    setters={settersReitero}
    actions={actionsReitero}          
    // 🔥 Pasamos SIEMPRE data?.filtros_disponibles como fallback principal e inmutable
    filtrosDisponibles={data?.filtros_disponibles} 
  />
)}

      </div>
    </div>
  );
}