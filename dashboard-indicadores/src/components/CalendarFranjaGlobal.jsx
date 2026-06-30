// src/components/CalendarFranjaGlobal.jsx
import React, { useEffect, useRef } from 'react'; // 👈 Importamos useRef

export default function CalendarFranjaGlobal({ 
  diaInicio, 
  diaFin, 
  selectedMes, 
  diasCalendario, 
  setDiaInicio, 
  setDiaFin 
}) {

  const mesesIndices = {
    'Enero': 0, 'Febrero': 1, 'Marzo': 2, 'Abril': 3, 'Mayo': 4, 'Junio': 5,
    'Julio': 6, 'Agosto': 7, 'Septiembre': 8, 'Octubre': 9, 'Noviembre': 10, 'Diciembre': 11
  };

  const mesesMapeo = {
    'Enero': 31, 'Febrero': 28, 'Marzo': 31, 'Abril': 30, 'Mayo': 31, 'Junio': 30,
    'Julio': 31, 'Agosto': 31, 'Septiembre': 30, 'Octubre': 31, 'Noviembre': 30, 'Diciembre': 31
  };

  // 🇨🇴 Matriz de Festivos 2026 en el Frontend
  const FESTIVOS_FRONTEND_2026 = {
    0: [1, 12],       
    2: [23],          
    3: [2, 3],        
    4: [1, 25],       
    5: [8, 15, 29],   
    6: [13, 20],      
    7: [7, 17],       
    9: [12],          
    10: [2, 16],      
    11: [8, 25]       
  };

  let diasReales = [...(diasCalendario || [])];
  
  if (diasReales.length < 28 || !diasReales.some(d => d.Dia_Del_Mes === 8)) {
    const maxDias = mesesMapeo[selectedMes] || 30;
    const mesIndex = mesesIndices[selectedMes] || 0;
    const letrasDias = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    
    diasReales = Array.from({ length: maxDias }, (_, i) => {
      const diaNum = i + 1;
      const fechaReal = new Date(2026, mesIndex, diaNum);
      const numeroDiaSemana = fechaReal.getDay();
      
      const esDomingo = numeroDiaSemana === 0;
      const diasFestivosDelMes = FESTIVOS_FRONTEND_2026[mesIndex] || [];
      const esFestivoCalendario = esDomingo || diasFestivosDelMes.includes(diaNum);
      
      return {
        Dia_Del_Mes: diaNum,
        Es_Festivo: esFestivoCalendario,
        Inicial_Es: letrasDias[numeroDiaSemana]
      };
    });
  }

  // 🎯 SOLUCCIÓN AL REBOUND: Usamos una referencia para saber qué mes se inicializó por última vez
  const mesInicializadoRef = useRef('');

  useEffect(() => {
    // Solo forzamos el rango completo si el mes cambió en comparación con la última inicialización
    if (selectedMes && mesInicializadoRef.current !== selectedMes && diasReales.length > 0) {
      mesInicializadoRef.current = selectedMes; // Registramos que este mes ya se cuadró
      setDiaInicio(1);
      setDiaFin(diasReales[diasReales.length - 1].Dia_Del_Mes);
    }
  }, [selectedMes, diasCalendario]); // Ya no depende de diaInicio, evitando bucles al hacer clic

  const gestionarClickLocal = (diaNum) => {
    if (diaInicio === diaFin && diaNum > diaInicio) {
      setDiaFin(diaNum);
    } else {
      setDiaInicio(diaNum);
      setDiaFin(diaNum);
    }
  };

  const seleccionarMesCompletoLocal = () => {
    if (diasReales.length > 0) {
      setDiaInicio(1); 
      setDiaFin(diasReales[diasReales.length - 1].Dia_Del_Mes);
    }
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs font-bold text-slate-600">
        <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-lg border border-blue-100 shadow-sm">
          📅 Rango Actual: {diaInicio === diaFin ? `Día ${diaInicio}` : `Días del ${diaInicio} al ${diaFin}`} de {selectedMes}
        </span>
        {(diaInicio !== 1 || diaFin !== diasReales.length) && (
          <button 
            type="button"
            onClick={seleccionarMesCompletoLocal}
            className="text-xs text-blue-600 hover:text-blue-800 underline bg-transparent border-none cursor-pointer font-bold transition-colors"
          >
            🔄 Ver Todo el Mes
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1 w-full justify-start select-none">
        {diasReales.map((item) => {
          const dia = item.Dia_Del_Mes;
          
          const esFestivoReitero = 
            item.Es_Festivo === true || 
            item.es_festivo === true || 
            item.Es_No_Laboral === true || 
            item.es_no_laboral === true;
          
          const estaEnRango = dia >= diaInicio && dia <= diaFin;
          const esExtremo = dia === diaInicio || dia === diaFin;

          return (
            <div 
              key={`gbl-day-${dia}`}
              onClick={() => gestionarClickLocal(dia)}
              className={`flex flex-col items-center justify-center p-1 rounded-md border cursor-pointer transition-all text-center
                w-[calc(100%/8-4px)] min-w-[30px] sm:w-auto sm:min-w-[34px] h-11 select-none outline-none
                ${estaEnRango 
                  ? esFestivoReitero 
                    ? 'bg-amber-100 border-amber-300 text-amber-950 font-bold' 
                    : 'bg-blue-50 border-blue-300 text-blue-700 font-bold'    
                  : esFestivoReitero 
                    ? 'bg-amber-50/60 border-amber-200 text-amber-800 hover:bg-amber-100' 
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'    
                }
                ${esExtremo && estaEnRango ? 'ring-2 ring-blue-400 ring-offset-0 font-black' : ''}
              `}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <span className={`text-[9px] uppercase font-bold tracking-tight mb-0.5 
                ${estaEnRango 
                  ? esFestivoReitero ? 'text-amber-700' : 'text-blue-500' 
                  : esFestivoReitero ? 'text-amber-600' : 'text-slate-400'
                }
              `}>
                {item.Inicial_Es || item.inicial_es}
              </span>
              <span className="text-xs font-extrabold tracking-tighter">{dia}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}