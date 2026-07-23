import React, { useState, useMemo } from 'react';

export default function RankingTecnicosReitero({ rawData }) {
  const [selectedTecnico, setSelectedTecnico] = useState(null);
  const [selectedCausal, setSelectedCausal] = useState(null);

  // 1. Procesar el ranking general de técnicos basados en reiteros causados
  const rankingTecnicos = useMemo(() => {
    if (!rawData || rawData.length === 0) return [];

    const tecnicosMap = {};

    rawData.forEach((row) => {
      const tecnicoPadre = row.TOA_PROVIDER_SOURCE_PADRE;
      const esReitero = Number(row.REITERO) === 1;

      if (tecnicoPadre && tecnicoPadre !== 'SIN_ID' && esReitero) {
        if (!tecnicosMap[tecnicoPadre]) {
          tecnicosMap[tecnicoPadre] = {
            nombre: tecnicoPadre,
            totalReiteros: 0,
            departamentos: new Set(),
            registros: []
          };
        }
        tecnicosMap[tecnicoPadre].totalReiteros += 1;
        if (row.DEPARTAMENTO) {
          tecnicosMap[tecnicoPadre].departamentos.add(row.DEPARTAMENTO);
        }
        tecnicosMap[tecnicoPadre].registros.push(row);
      }
    });

    return Object.values(tecnicosMap)
      .sort((a, b) => b.totalReiteros - a.totalReiteros)
      .map(t => ({
        ...t,
        departamentos: Array.from(t.departamentos).join(', ')
      }));
  }, [rawData]);

  // Autoseleccionar el primer técnico del ranking la primera vez
  useMemo(() => {
    if (rankingTecnicos.length > 0 && !selectedTecnico) {
      setSelectedTecnico(rankingTecnicos[0]);
    }
  }, [rankingTecnicos, selectedTecnico]);

  // Al cambiar de técnico, reseteamos la causal seleccionada para evitar incongruencias
  const handleSelectTecnico = (tecnico) => {
    setSelectedTecnico(tecnico);
    setSelectedCausal(null);
  };

  // 2. Procesar las causales específicas de reitero (TOA_CIERRE_AVERIA_PADRE)
  const causalesDelTecnico = useMemo(() => {
    if (!selectedTecnico) return [];

    const causalesMap = {};

    selectedTecnico.registros.forEach((row) => {
      const causal = row.TOA_CIERRE_AVERIA_PADRE || 'SIN ESPECIFICAR';

      if (!causalesMap[causal]) {
        causalesMap[causal] = {
          causal: causal,
          cantidad: 0,
          registrosAsociados: []
        };
      }
      causalesMap[causal].cantidad += 1;
      causalesMap[causal].registrosAsociados.push(row);
    });

    return Object.values(causalesMap).sort((a, b) => b.cantidad - a.cantidad);
  }, [selectedTecnico]);

  // Autoseleccionar la primera causal del desglose al cambiar de técnico
  useMemo(() => {
    if (causalesDelTecnico.length > 0 && !selectedCausal) {
      setSelectedCausal(causalesDelTecnico[0]);
    }
  }, [causalesDelTecnico, selectedCausal]);

  // 3. Procesar únicamente los ACCESS_ID y los Días de Reitero
  const caisDeLaCausal = useMemo(() => {
    if (!selectedCausal) return [];

    return selectedCausal.registrosAsociados.map((row) => ({
      cai: row.ACCESS_ID || 'SIN CAI',
      diasReitero: row.DIAS_REITERO !== null && row.DIAS_REITERO !== undefined ? row.DIAS_REITERO : 'N/A'
    }));
  }, [selectedCausal]);

  if (!rawData || rawData.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs font-light shadow-sm">
        No hay datos crudos suficientes para computar el ranking detallado de técnicos.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      
      {/* SECCIÓN IZQUIERDA: TOP TÉCNICOS RESPONSABLES DE REITERO */}
      <div className="xl:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Top Técnicos por Reitero Causado</h3>
          <p className="text-[11px] text-slate-400 font-light">
            Ordenados por volumen de reiteros generados a partir de su orden original.
          </p>
        </div>

        <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100 pr-2 scrollbar-thin">
          {rankingTecnicos.slice(0, 20).map((tecnico, index) => {
            const isSelected = selectedTecnico?.nombre === tecnico.nombre;
            return (
              <button
                key={tecnico.nombre}
                onClick={() => handleSelectTecnico(tecnico)}
                className={`w-full text-left py-3 px-3 rounded-xl transition-all flex items-center justify-between gap-3 ${
                  isSelected 
                    ? 'bg-blue-50/70 border-l-4 border-blue-600 pl-2' 
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 font-mono">
                      #{String(index + 1).padStart(2, '0')}
                    </span>
                    <span className={`text-xs font-medium truncate ${isSelected ? 'text-blue-950 font-semibold' : 'text-slate-700'}`}>
                      {tecnico.nombre}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block font-light truncate pl-5">
                    {tecnico.departamentos}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full font-mono">
                    {tecnico.totalReiteros}
                  </span>
                  <span className="text-[9px] text-slate-400 block font-light mt-0.5">Reiteros</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECCIÓN DERECHA: DESGLOSE DE CAUSALES Y CAIs */}
      <div className="xl:col-span-7 space-y-6">
        
        {/* TABLA DE CAUSALES ESPECÍFICAS (TOA_CIERRE_AVERIA_PADRE) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div>
            <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Análisis Detallado
            </span>
            <h3 className="text-sm font-semibold text-slate-900 mt-1">
              Causales de Reitero: {selectedTecnico?.nombre || 'Ninguno seleccionado'}
            </h3>
            <p className="text-[11px] text-slate-400 font-light">
              Desglose específico por <span className="font-mono text-slate-500">TOA_CIERRE_AVERIA_PADRE</span>. Haz clic sobre la causal para ver los CAIs.
            </p>
          </div>

          <div className="overflow-hidden border border-slate-100 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-4 font-semibold">Causal Específica</th>
                  <th className="py-2.5 px-4 font-semibold text-right w-32">Cant. Casos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {causalesDelTecnico.map((item) => {
                  const isCausalSelected = selectedCausal?.causal === item.causal;
                  return (
                    <tr 
                      key={item.causal}
                      onClick={() => setSelectedCausal(item)}
                      className={`cursor-pointer transition-colors ${
                        isCausalSelected ? 'bg-blue-50/50 font-medium' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${isCausalSelected ? 'bg-blue-600' : 'bg-slate-300'}`} />
                          <span className={`truncate block max-w-md ${isCausalSelected ? 'text-blue-900 font-semibold' : 'text-slate-600'}`}>
                            {item.causal}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold font-mono text-slate-850">
                        {item.cantidad}
                      </td>
                    </tr>
                  );
                })}
                {causalesDelTecnico.length === 0 && (
                  <tr>
                    <td colSpan="2" className="py-8 text-center text-slate-400 font-light text-xs">
                      Selecciona un técnico a la izquierda para cargar sus causales.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ÁREA DE DETALLE DE ORDENES (ACCESS_IDs / CAIs Limpios) */}
        {selectedCausal && (
          <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-6 space-y-4 animate-fadeIn">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  CAIs Afectados
                </span>
                <span className="text-xs font-light text-slate-300">|</span>
                <span className="text-[11px] font-mono text-slate-500 truncate max-w-xs block">
                  {selectedCausal.causal}
                </span>
              </div>
              <h3 className="text-xs font-semibold text-slate-800 mt-1">
                CAIs Relacionadas (ACCESS_ID)
              </h3>
              <p className="text-[10px] text-slate-400 font-light">
                Cuentas de abonados vinculadas directamente a la causal seleccionada.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[240px] overflow-y-auto pr-2 scrollbar-thin">
              {caisDeLaCausal.map((item, idx) => (
                <div 
                  key={`${item.cai}-${idx}`} 
                  className="bg-white border border-slate-200/60 p-3.5 rounded-xl hover:border-slate-300 transition-colors shadow-sm flex flex-col justify-center h-[72px]"
                >
                  <span className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase leading-none">
                    ACCESS_ID (CAI)
                  </span>
                  
                  <div className="flex justify-between items-center gap-2 mt-2">
                    <span className="text-xs font-bold font-mono text-blue-900 tracking-tight truncate">
                      {item.cai}
                    </span>
                    <span className="text-[10px] font-bold font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded shrink-0">
                      {item.diasReitero} {Number(item.diasReitero) === 1 ? 'día' : 'días'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}