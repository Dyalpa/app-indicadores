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

export default function App() {
  // 🧠 Toda la lógica de estados, carga y túneles oculta en el custom Hook
  const { data, loading, filters, setters, actions } = useDashboardState();

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-50 gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium text-sm animate-pulse">Cargando dashboard...</p>
      </div>
    );
  }

  // ⚡ El procesamiento matemático ocurre en su propia función pura externa
  const { tecnicosFiltrados, registrosGraficoCircular } = procesarProductividad(data, filters);
  const diasCalendario = data?.filtros_disponibles?.calendario_por_mes?.[filters.selectedMes] || [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8 font-sans antialiased">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <Header fuenteMetadatos={data.fuente_metadatos} />

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
          <FilterPanel 
            {...filters} 
            {...setters} 
            filtrosDisponibles={data.filtros_disponibles} 
            manejarCambioMes={actions.manejarCambioMes} 
          />

          <CalendarFranja 
            diaInicio={filters.diaInicio}
            diaFin={filters.diaFin}
            selectedMes={filters.selectedMes}
            diasCalendario={diasCalendario}
            manejarClickDia={actions.manejarClickDia}
            seleccionarMesCompleto={actions.seleccionarMesCompleto}
          />
        </div>

        {/* 📈 Renderizado de Componentes de Datos */}
        <KpiCards filtrados={tecnicosFiltrados} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <BarChartRanking data={tecnicosFiltrados} onSelectTecnico={setters.setSelectedTecnico} seleccionado={filters.selectedTecnico} />
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <OrderPieChart tecnico={filters.selectedTecnico} todoElDetalle={registrosGraficoCircular} />
          </div>
        </div>

        {/* 📊 Modificación aquí: Agregamos la prop tiposOrden sacada directamente de la API */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <ProductivityTable 
            data={tecnicosFiltrados} 
            tiposOrden={data?.filtros_disponibles?.tipos_orden || []} 
            onSelectTecnico={setters.setSelectedTecnico} 
            seleccionado={filters.selectedTecnico} 
          />
        </div>

      </div>
    </div>
  );
}