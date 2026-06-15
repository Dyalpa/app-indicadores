import React, { useState, useEffect } from 'react';
import KpiCards from './components/KpiCards';
import BarChartRanking from './components/BarChartRanking';
import OrderPieChart from './components/OrderPieChart';
import ProductivityTable from './components/ProductivityTable';

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Filtros principales
  const [selectedMes, setSelectedMes] = useState('');
  const [selectedDepto, setSelectedDepto] = useState('');
  const [selectedTecnico, setSelectedTecnico] = useState(null);
  const [selectedTipoOrden, setSelectedTipoOrden] = useState('');
  const [selectedTipoDia, setSelectedTipoDia] = useState('');

  // ⏱️ Estados para la selección en la franja lineal de días
  const [diaInicio, setDiaInicio] = useState(1);
  const [diaFin, setDiaFin] = useState(31);
  const [rangoEnSeleccion, setRangoEnSeleccion] = useState(false); 

  useEffect(() => {
    fetch('http://localhost:8000/informe')
      .then(res => res.json())
      .then(resData => {
        setData(resData);
        if (resData.filtros_disponibles?.meses?.length > 0) {
          const primerMes = resData.filtros_disponibles.meses[0];
          setSelectedMes(primerMes);
          resetearDiasPorMes(primerMes, resData);
        }
        loading(false);
        setLoading(false);
      })
      .catch(err => console.error("Error cargando la API: ", err));
  }, []);

  const resetearDiasPorMes = (mes, datosActuales = data) => {
    const infoMes = datosActuales?.filtros_disponibles?.calendario_por_mes?.[mes] || [];
    if (infoMes.length > 0) {
      setDiaInicio(infoMes[0].Dia_Del_Mes);
      setDiaFin(infoMes[infoMes.length - 1].Dia_Del_Mes);
    } else {
      setDiaInicio(1);
      setDiaFin(31);
    }
  };

  const manejarCambioMes = (mes) => {
    setSelectedMes(mes);
    setSelectedTecnico(null); // Resetea técnico al cambiar de mes
    resetearDiasPorMes(mes);
  };

  // Lógica interactiva para la Franja de Calendario Lineal
  const manejarClickDia = (dia) => {
    if (!rangoEnSeleccion) {
      setDiaInicio(dia);
      setDiaFin(dia);
      setRangoEnSeleccion(true);
    } else {
      if (dia < diaInicio) {
        setDiaInicio(dia);
        setDiaFin(dia);
      } else {
        setDiaFin(dia);
        setRangoEnSeleccion(false); // Rango completado
      }
    }
  };

  const seleccionarMesCompleto = () => {
    resetearDiasPorMes(selectedMes);
    setRangoEnSeleccion(false);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-50 gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium text-sm animate-pulse">Cargando dashboard...</p>
      </div>
    );
  }

  // ==========================================
  // ⚡ PROCESAMIENTO FILTRADO EN CALIENTE
  // ==========================================
  const baseDeDatos = data?.lineas_productividad_base || [];
  let registrosFiltrados = baseDeDatos.filter(r => r.Mes === selectedMes);

  if (selectedDepto) registrosFiltrados = registrosFiltrados.filter(r => r.Departamento === selectedDepto);
  if (selectedTipoOrden) registrosFiltrados = registrosFiltrados.filter(r => r.Tipo_de_orden === selectedTipoOrden);
  
  if (selectedTipoDia === 'laboral') {
    registrosFiltrados = registrosFiltrados.filter(r => r.Es_No_Laboral === false);
  } else if (selectedTipoDia === 'no_laboral') {
    registrosFiltrados = registrosFiltrados.filter(r => r.Es_No_Laboral === true);
  }

  registrosFiltrados = registrosFiltrados.filter(r => r.Dia_Del_Mes >= diaInicio && r.Dia_Del_Mes <= diaFin);

  let registrosGraficoCircular = registrosFiltrados;
  if (selectedTecnico) {
    registrosGraficoCircular = registrosFiltrados.filter(r => r.Nombre_Tecnico === selectedTecnico);
  }

  const mapeoTecnicos = registrosFiltrados.reduce((acc, curr) => {
    const llave = `${curr.Nombre_Tecnico}-${curr.Departamento}`;
    if (!acc[llave]) {
      acc[llave] = {
        Nombre_Tecnico: curr.Nombre_Tecnico,
        Departamento: curr.Departamento,
        Mes: selectedMes,
        Total_Ordenes: 0,
        diasSet: new Set()
      };
    }
    acc[llave].Total_Ordenes += curr.Cantidad;
    acc[llave].diasSet.add(curr.Dia_Del_Mes);
    return acc;
  }, {});

  const tecnicosFiltrados = Object.values(mapeoTecnicos).map((t, index) => {
    const diasTrabajados = t.diasSet.size;
    return {
      id_unico: `${t.Nombre_Tecnico}-${t.Departamento}-${index}`,
      Nombre_Tecnico: t.Nombre_Tecnico,
      Departamento: t.Departamento,
      Mes: t.Mes,
      Dias_Trabajados: diasTrabajados,
      Total_Ordenes: t.Total_Ordenes,
      Promedio_Diario: diasTrabajados > 0 ? Number((t.Total_Ordenes / diasTrabajados).toFixed(2)) : 0
    };
  }).sort((a, b) => b.Promedio_Diario - a.Promedio_Diario);

  const diasCalendario = data?.filtros_disponibles?.calendario_por_mes?.[selectedMes] || [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8 font-sans antialiased">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* ENCABEZADO */}
        <header className="flex flex-col lg:flex-row lg:items-start lg:justify-between pb-6 border-b border-slate-200 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">Control de Productividad</h1>
            <p className="text-sm text-slate-500 mt-0.5">Filtros dinámicos con línea de tiempo modular.</p>
          </div>
          <div className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600 space-y-1 lg:text-right shadow-sm">
            <div>📋 <span className="font-semibold text-slate-700">Registros:</span> {data.fuente_metadatos?.total_registros?.toLocaleString() ?? "Cargando..."}</div>
            <div>📊 <span className="font-semibold text-slate-700">Fuente:</span> {data.fuente_metadatos.archivo}</div>
            <div>⏱️ <span className="font-semibold text-slate-700">Actualizado:</span> {data.fuente_metadatos.ultima_actualizacion}</div>
          </div>
        </header>

        {/* PANEL DE CONTROL CENTRALIZADO */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mes</label>
              <select value={selectedMes} onChange={(e) => manejarCambioMes(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                {data.filtros_disponibles.meses.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Departamento</label>
              <select value={selectedDepto} onChange={(e) => { setSelectedDepto(e.target.value); setSelectedTecnico(null); }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                <option value="">Todos</option>
                {data.filtros_disponibles.departamentos.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Orden</label>
              <select value={selectedTipoOrden} onChange={(e) => { setSelectedTipoOrden(e.target.value); setSelectedTecnico(null); }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                <option value="">Todos</option>
                {data.filtros_disponibles.tipos_orden.map(t => <option key={t} value={t}>{t}</option>)}
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

          {/* 📅 FRANJA DE DIAS MODIFICADA (SIN SCROLL, SUAVE Y EVITA OPACAR FESTIVOS) */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs font-bold text-slate-600">
              <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-lg border border-blue-100 shadow-sm">
                📅 Rango Actual: {diaInicio === diaFin ? `Día ${diaInicio}` : `Días del ${diaInicio} al ${diaFin}`} de {selectedMes}
              </span>
              {(diaInicio !== 1 || diaFin !== diasCalendario.length) && (
                <button 
                  onClick={seleccionarMesCompleto}
                  className="text-xs text-blue-600 hover:text-blue-800 underline bg-transparent border-none cursor-pointer font-bold transition-colors"
                >
                  🔄 Ver Todo el Mes
                </button>
              )}
            </div>

            {/* 🛠️ CONTENEDOR FLEX-WRAP COMPACTO: Elimina el scroll horizontal amoldando los cuadros */}
            <div className="flex flex-wrap gap-1 w-full justify-start select-none">
              {diasCalendario.map((item) => {
                const dia = item.Dia_Del_Mes;
                const esNoLaboral = item.Es_No_Laboral;
                const estaEnRango = dia >= diaInicio && dia <= diaFin;
                const esExtremo = dia === diaInicio || dia === diaFin;

                return (
                  <div 
                    key={dia}
                    onClick={() => manejarClickDia(dia)}
                    // 🔥 RECALIBRACIÓN VISUAL: Más compactos, fondos pastel suaves y domingos respetados en rango
                    className={`flex flex-col items-center justify-center p-1 rounded-md border cursor-pointer transition-all text-center
                      w-[calc(100%/8-4px)] min-w-[30px] sm:w-auto sm:min-w-[34px] h-11 select-none outline-none
                      ${estaEnRango 
                        ? esNoLaboral 
                          ? 'bg-amber-100 border-amber-300 text-amber-950 font-bold' // Domingo dentro del rango (Naranja claro)
                          : 'bg-blue-50 border-blue-300 text-blue-700 font-bold'     // Día normal dentro del rango (Azul pastel suave)
                        : esNoLaboral 
                          ? 'bg-amber-50/60 border-amber-200 text-amber-800 hover:bg-amber-100' // Domingo fuera del rango
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'    // Día normal fuera del rango
                      }
                      ${esExtremo && estaEnRango ? 'ring-2 ring-blue-400 ring-offset-0 font-black' : ''}
                    `}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    {/* Inicial del día */}
                    <span className={`text-[9px] uppercase font-bold tracking-tight mb-0.5 
                      ${estaEnRango 
                        ? esNoLaboral ? 'text-amber-700' : 'text-blue-500' 
                        : esNoLaboral ? 'text-amber-600' : 'text-slate-400'
                      }
                    `}>
                      {item.Inicial_Es}
                    </span>
                    
                    {/* Número del día */}
                    <span className="text-xs font-extrabold tracking-tighter">{dia}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* COMPONENTES DE VISTA GRÁFICA */}
        <KpiCards filtrados={tecnicosFiltrados} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* El Ranking de Barras */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <BarChartRanking 
              data={tecnicosFiltrados} 
              onSelectTecnico={setSelectedTecnico} 
              seleccionado={selectedTecnico} 
            />
          </div>

          {/* El Gráfico Circular */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <OrderPieChart 
              tecnico={selectedTecnico} 
              todoElDetalle={registrosGraficoCircular} 
            />
          </div>
        </div>

        {/* Tabla de Productividad */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <ProductivityTable 
            data={tecnicosFiltrados} 
            onSelectTecnico={setSelectedTecnico} 
            seleccionado={selectedTecnico} 
          />
        </div>

      </div>
    </div>
  );
}