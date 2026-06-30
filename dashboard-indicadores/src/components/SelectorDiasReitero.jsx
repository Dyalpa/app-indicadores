// src/components/SelectorDiasReitero.jsx
import React, { useRef } from 'react';

export default function SelectorDiasReitero({ 
  selectedMes, 
  filtrosDisponibles, 
  diaInicio, 
  diaFin, 
  setDiaInicio, 
  setDiaFin 
}) {
  
  // 🔐 CAJA FUERTE EN MEMORIA: Guardará el calendario completo de forma persistente
  const diasMesCache = useRef({});

  // Extraemos la colección de días que vienen de los filtros en este render
  const diasEntrantes = filtrosDisponibles?.calendario_por_mes?.[selectedMes] || [];

  // Si nos están llegando días reales y completos (más de 20 días en el mes),
  // actualizamos la caja fuerte para este mes específico.
  if (diasEntrantes.length > 20) {
    diasMesCache.current[selectedMes] = diasEntrantes;
  }

  // 💎 LA FUENTE REAL: Siempre intentará leer de la caja fuerte limpia.
  // Si no está ahí todavía (primer render), usa los días entrantes.
  const diasDelMes = diasMesCache.current[selectedMes] || diasEntrantes;

  // Lógica nativa e independiente que repara el click unitario sin alterar el layout
  const gestionarClickLocal = (diaNum) => {
    if (diaInicio === diaFin && diaNum > diaInicio) {
      setDiaFin(diaNum);
    } else {
      setDiaInicio(diaNum);
      setDiaFin(diaNum);
    }
  };

  const seleccionarMesCompleto = () => {
    if (diasDelMes.length > 0) {
      setDiaInicio(diasDelMes[0].Dia_Del_Mes || 1);
      setDiaFin(diasDelMes[diasDelMes.length - 1].Dia_Del_Mes || 30);
    }
  };

  // Si aún está procesando la primera carga del mes, muestra el fallback limpio
  if (!diasDelMes || diasDelMes.length === 0) {
    return (
      <div className="text-slate-400 text-xs font-normal p-2 bg-slate-50 border border-slate-100 rounded-xl">
        Cargando línea de tiempo del mes de {selectedMes}...
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {/* Encabezado del Rango */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-xs font-bold border border-blue-100">
          📅 Rango Reitero: Días del {diaInicio} al {diaFin} de {selectedMes}
        </div>
        <button 
          onClick={seleccionarMesCompleto}
          className="text-blue-600 hover:text-blue-700 text-xs font-bold flex items-center gap-1 transition-colors"
        >
          🔄 Ver Todo el Mes
        </button>
      </div>

      {/* Renderizado desde la fuente blindada retenida en memoria */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
        {diasDelMes.map((d) => {
          const diaNum = d.Dia_Del_Mes;
          const esNoLaboral = d.Es_No_Laboral || false;
          const estaSeleccionado = diaNum >= diaInicio && diaNum <= diaFin;

          return (
            <button
              key={`btn-d-${diaNum}`}
              onClick={() => gestionarClickLocal(diaNum)}
              className={`flex flex-col items-center justify-center min-w-[36px] h-[52px] rounded-xl border text-center transition-all cursor-pointer select-none
                ${estaSeleccionado 
                  ? 'bg-blue-600 border-blue-600 text-white font-bold shadow-sm' 
                  : esNoLaboral 
                    ? 'bg-amber-50/60 border-amber-200 text-amber-700 font-medium hover:bg-amber-100' 
                    : 'bg-white border-slate-200 text-slate-700 font-medium hover:bg-slate-50'
                }
              `}
            >
              <span className={`text-[9px] uppercase font-bold mb-0.5 ${estaSeleccionado ? 'text-blue-100' : 'text-slate-400'}`}>
                {d.Inicial_Es || 'M'}
              </span>
              <span className="text-sm">
                {diaNum}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}