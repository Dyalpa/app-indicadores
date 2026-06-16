import React from 'react';

export default function CalendarFranja({
  diaInicio,
  diaFin,
  selectedMes,
  diasCalendario,
  manejarClickDia,
  seleccionarMesCompleto
}) {
  return (
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
              className={`flex flex-col items-center justify-center p-1 rounded-md border cursor-pointer transition-all text-center
                w-[calc(100%/8-4px)] min-w-[30px] sm:w-auto sm:min-w-[34px] h-11 select-none outline-none
                ${estaEnRango 
                  ? esNoLaboral 
                    ? 'bg-amber-100 border-amber-300 text-amber-950 font-bold' 
                    : 'bg-blue-50 border-blue-300 text-blue-700 font-bold'    
                  : esNoLaboral 
                    ? 'bg-amber-50/60 border-amber-200 text-amber-800 hover:bg-amber-100' 
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'    
                }
                ${esExtremo && estaEnRango ? 'ring-2 ring-blue-400 ring-offset-0 font-black' : ''}
              `}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <span className={`text-[9px] uppercase font-bold tracking-tight mb-0.5 
                ${estaEnRango 
                  ? esNoLaboral ? 'text-amber-700' : 'text-blue-500' 
                  : esNoLaboral ? 'text-amber-600' : 'text-slate-400'
                }
              `}>
                {item.Inicial_Es}
              </span>
              <span className="text-xs font-extrabold tracking-tighter">{dia}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}