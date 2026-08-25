import React from 'react';

// 🗓️ Formatea una fecha ISO ("2026-07-20") a texto legible en español
// ("20 de Julio de 2026"), sin depender de librerías externas.
const MESES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function formatearFechaLegible(fechaIso) {
  if (!fechaIso) return null;
  const partes = fechaIso.split('-');
  if (partes.length !== 3) return fechaIso;
  const [anio, mes, dia] = partes;
  const nombreMes = MESES_ES[parseInt(mes, 10) - 1] || mes;
  return `${parseInt(dia, 10)} de ${nombreMes} de ${anio}`;
}

// 🎯 Agregamos activeTab a las propiedades recibidas
export default function Header({ fuenteMetadatos, activeTab }) {
  
  // 🔄 Condicional para cambiar el título dinámicamente
  const tituloDinamico = activeTab === 'REITERO' 
    ? 'Control de Reiteros' 
    : 'Control de Productividad';

  const fechaLegible = formatearFechaLegible(fuenteMetadatos?.fecha_maxima_datos);

  return (
    <header className="flex flex-col lg:flex-row lg:items-start lg:justify-between pb-6 border-b border-slate-200 gap-4">
      <div>
        {/* 🌟 Pintamos el título dinámico aquí */}
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
          {tituloDinamico}
        </h1>
      </div>
      <div className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600 space-y-1 lg:text-right shadow-sm">
        <div>📋 <span className="font-semibold text-slate-700">Registros:</span> {fuenteMetadatos?.total_registros?.toLocaleString() ?? "Cargando..."}</div>
        <div>📊 <span className="font-semibold text-slate-700">Fuente:</span> {fuenteMetadatos?.archivo}</div>
        <div>⏱️ <span className="font-semibold text-slate-700">Actualizado:</span> {fuenteMetadatos?.ultima_actualizacion}</div>
        {/* 🆕 Hasta qué día hay información real cargada (distinto de
            "Actualizado", que es cuándo se generó/tocó el archivo) */}
        {fechaLegible && (
          <div className="text-emerald-700">
            ✅ <span className="font-semibold">Datos hasta:</span> {fechaLegible}
          </div>
        )}
      </div>
    </header>
  );
}