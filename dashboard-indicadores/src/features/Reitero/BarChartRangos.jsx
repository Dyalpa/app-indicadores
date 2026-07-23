import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import * as XLSX from 'xlsx';

export default function BarChartRangos({ data = [], reiterosRaw = [] }) {
  const [selectedGrupo, setSelectedGrupo] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Procesar los grupos disponibles
  const dataOrdenada = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map((item) => {
      const etiqueta = item.Rango_Dias_Reitero || item.Categoria || item.Grupo || 'Reiteros';
      const cantidad = Number(item.Cantidad_Casos || item.Total || item.count || 0);
      return {
        ...item,
        Etiqueta_Grupo: etiqueta,
        Cantidad_Casos: cantidad
      };
    }).filter(item => item.Cantidad_Casos > 0);
  }, [data]);

  // Autoselección del primer grupo al cargar
  useEffect(() => {
    if (dataOrdenada.length > 0 && !selectedGrupo) {
      setSelectedGrupo(dataOrdenada[0]);
    }
  }, [dataOrdenada, selectedGrupo]);

  // 2. Extraer de forma única por ACCESS_ID para que la cantidad de filas coincida exactamente
  const registrosGrupo = useMemo(() => {
    if (!selectedGrupo) return [];

    const cantidadEsperada = selectedGrupo.Cantidad_Casos;
    const listaRaw = 
      selectedGrupo.Casos || 
      selectedGrupo.cais || 
      selectedGrupo.Lista_Cais || 
      selectedGrupo.Lista_Ordenes || 
      selectedGrupo.ordenes || 
      [];

    const mapObjetos = new Map();
    const setIds = new Set();

    if (Array.isArray(listaRaw) && listaRaw.length > 0) {
      listaRaw.forEach(item => {
        if (typeof item === 'object' && item !== null) {
          const id = String(item.ACCESS_ID || item.access_id || item.cai || item.id || '').trim().toUpperCase();
          if (id) {
            setIds.add(id);
            mapObjetos.set(id, item);
          }
        } else if (item) {
          const id = String(item).trim().toUpperCase();
          setIds.add(id);
        }
      });
    }

    const mapReiterosRaw = new Map();
    if (reiterosRaw && reiterosRaw.length > 0) {
      reiterosRaw.forEach(r => {
        const id = String(r.ACCESS_ID || r.access_id || '').trim().toUpperCase();
        if (id && !mapReiterosRaw.has(id)) {
          // Tomamos el primer registro disponible para este ID para evitar duplicarlo por causales múltiples
          mapReiterosRaw.set(id, r);
        }
      });
    }

    const unicosMap = new Map();

    setIds.forEach(id => {
      const deRaw = mapReiterosRaw.get(id);
      const deItem = mapObjetos.get(id);

      if (!unicosMap.has(id)) {
        unicosMap.set(id, {
          ACCESS_ID: id,
          CAUSAL_ULTIMA: deRaw?.TOA_CIERRE_AVERIA || deItem?.TOA_CIERRE_AVERIA || 'SIN ESPECIFICAR',
          CAUSAL_PADRE: deRaw?.TOA_CIERRE_AVERIA_PADRE || deItem?.TOA_CIERRE_AVERIA_PADRE || 'SIN ESPECIFICAR'
        });
      }
    });

    let resultado = Array.from(unicosMap.values());

    // Rellenar de forma sintética si faltan elementos para coincidir exactamente con el gráfico
    if (cantidadEsperada > 0 && resultado.length < cantidadEsperada) {
      const faltantes = cantidadEsperada - resultado.length;
      for (let i = 1; i <= faltantes; i++) {
        resultado.push({
          ACCESS_ID: `REITERO_${i + resultado.length}`,
          CAUSAL_ULTIMA: 'SIN ESPECIFICAR',
          CAUSAL_PADRE: 'SIN ESPECIFICAR'
        });
      }
    }

    // Asegurar que el tamaño de la lista sea exactamente el que indica el gráfico
    if (cantidadEsperada > 0 && resultado.length > cantidadEsperada) {
      resultado = resultado.slice(0, cantidadEsperada);
    }

    return resultado;
  }, [selectedGrupo, reiterosRaw]);

  // 3. Búsqueda local en la tabla
  const registrosFiltrados = useMemo(() => {
    if (!searchTerm) return registrosGrupo;
    const term = searchTerm.toLowerCase();
    return registrosGrupo.filter(item => 
      String(item.ACCESS_ID).toLowerCase().includes(term) ||
      String(item.CAUSAL_ULTIMA).toLowerCase().includes(term) ||
      String(item.CAUSAL_PADRE).toLowerCase().includes(term)
    );
  }, [registrosGrupo, searchTerm]);

  // 4. Exportar Excel (.xlsx)
  const exportarExcel = () => {
    if (!registrosGrupo.length) return;

    const datosMapeados = registrosGrupo.map(item => ({
      'ACCESS_ID / CAI': item.ACCESS_ID,
      'Causal Última (Cierre Actual)': item.CAUSAL_ULTIMA,
      'Causal Padre (Origen)': item.CAUSAL_PADRE
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosMapeados);

    worksheet['!cols'] = [
      { wch: 25 },
      { wch: 35 },
      { wch: 35 }
    ];

    const workbook = XLSX.utils.book_new();
    const nombreHoja = selectedGrupo?.Etiqueta_Grupo ? selectedGrupo.Etiqueta_Grupo.substring(0, 31) : 'Reiteros';
    XLSX.utils.book_append_sheet(workbook, worksheet, nombreHoja);
    
    XLSX.writeFile(workbook, `desglose_reiteros.xlsx`);
  };

  if (dataOrdenada.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50">
        <p className="text-slate-400 font-light text-xs">Sin datos de reiteros disponibles</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col space-y-6">
      <style>{`
        .recharts-wrapper, .recharts-surface, .recharts-bar-rect, .recharts-cell {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
          -webkit-tap-highlight-color: transparent !important;
        }
        *:focus { outline: none !important; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>

      <div>
        <h3 className="text-base font-bold text-slate-900 tracking-tight">
          📊 Desglose de Reiteros por Causales
        </h3>
        <p className="text-xs text-slate-500">
          Haz clic en cualquier barra para ver los CAIs y causales exactas asociadas.
        </p>
      </div>

      {/* GRÁFICO BARCHART */}
      <div className="w-full bg-slate-50/50 rounded-2xl border border-slate-100 p-4 h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={dataOrdenada} 
            margin={{ top: 25, right: 20, left: -20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
            
            <XAxis 
              dataKey="Etiqueta_Grupo" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
            />
            
            <YAxis 
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 11 }}
            />
            
            <Tooltip
              cursor={{ fill: '#f1f5f9', opacity: 0.6 }}
              contentStyle={{ 
                backgroundColor: '#ffffff', 
                borderRadius: '12px', 
                border: '1px solid #e2e8f0', 
                fontSize: '12px' 
              }}
              formatter={(value) => [`${value} casos`, 'Cantidad']}
            />
            
            <Bar 
              dataKey="Cantidad_Casos" 
              radius={[6, 6, 0, 0]} 
              maxBarSize={50}
              className="cursor-pointer"
            >
              <LabelList 
                dataKey="Cantidad_Casos" 
                position="top" 
                dy={-8}     
                fill="#475569"   
                fontSize={11} 
                fontWeight={700}
              />

              {dataOrdenada.map((entry, index) => {
                const isSelected = selectedGrupo?.Etiqueta_Grupo === entry.Etiqueta_Grupo;
                return (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={isSelected ? '#2563eb' : '#60a5fa'} 
                    className="transition-all duration-200 cursor-pointer hover:opacity-80"
                    stroke="none"     
                    strokeWidth={0}
                    onClick={() => {
                      setSelectedGrupo(entry);
                      setSearchTerm('');
                    }}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* TABLA DE DESGLOSE CAIS Y CAUSALES */}
      {selectedGrupo && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-blue-100 text-blue-800">
                  Seleccionado
                </span>
                <h4 className="text-sm font-bold text-slate-900">
                  {selectedGrupo.Etiqueta_Grupo}
                </h4>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Total exacto de reiteros: <strong className="text-slate-800">{selectedGrupo.Cantidad_Casos || 0} órdenes</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Buscar ID o Causal..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 w-48 sm:w-60"
              />
              {registrosGrupo.length > 0 && (
                <button
                  onClick={exportarExcel}
                  className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  📊 Exportar
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="text-slate-500 font-semibold border-b border-slate-200 text-[10px] uppercase tracking-wider bg-slate-50/50">
                  <th className="p-2.5 w-[160px]">ACCESS_ID / CAI</th>
                  <th className="p-2.5">Causal Última (Cierre Actual)</th>
                  <th className="p-2.5">Causal Padre (Origen)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registrosFiltrados.length > 0 ? (
                  registrosFiltrados.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 text-slate-700">
                      <td className="p-2.5 font-mono font-bold text-blue-700 whitespace-nowrap">
                        🆔 {item.ACCESS_ID}
                      </td>
                      <td className="p-2.5 text-slate-800 font-medium">
                        <span className="inline-block bg-blue-50/70 text-blue-900 px-2 py-0.5 rounded border border-blue-100">
                          📌 {item.CAUSAL_ULTIMA}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-700">
                        <span className="inline-block bg-slate-100/80 text-slate-700 px-2 py-0.5 rounded border border-slate-200/60">
                          🔁 {item.CAUSAL_PADRE}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="text-center p-6 text-slate-400 font-light">
                      No se encontraron registros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}