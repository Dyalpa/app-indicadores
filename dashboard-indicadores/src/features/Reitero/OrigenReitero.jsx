import React, { useState, useMemo } from 'react';

export default function AnalisisOrigenesCard({ reiterosRaw = [] }) {
  const [sortConfig, setSortConfig] = useState({ key: 'averias', direction: 'descending' });

  // 📊 Agrupación y cálculo basado en el origen extraído por tu backend
  const datosOrigenes = useMemo(() => {
    if (!reiterosRaw || reiterosRaw.length === 0) return [];

    const agrupado = {};

    reiterosRaw.forEach((item) => {
      const origen = item.Origen_Averia || 'DESCONOCIDO';
      const esReitero = parseInt(item.REITERO) || 0;
      const esAveria = parseInt(item.AVERIA) || 1;

      if (!agrupado[origen]) {
        agrupado[origen] = {
          origen: origen,
          averias: 0,
          reiteros: 0,
        };
      }

      agrupado[origen].averias += esAveria;
      agrupado[origen].reiteros += esReitero;
    });

    return Object.values(agrupado).map((row) => {
      const tasaReitero = row.averias > 0 
        ? parseFloat(((row.reiteros / row.averias) * 100).toFixed(2)) 
        : 0.0;
      return { ...row, tasaReitero };
    });
  }, [reiterosRaw]);

  // 🔄 Lógica de ordenamiento dinámico
  const datosOrdenados = useMemo(() => {
    let sortableItems = [...datosOrigenes];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [datosOrigenes, sortConfig]);

  const requestSort = (key) => {
    let direction = 'descending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'descending') {
      direction = 'ascending';
    }
    setSortConfig({ key, direction });
  };

  const totales = useMemo(() => {
    return datosOrigenes.reduce((acc, curr) => {
      acc.averias += curr.averias;
      acc.reiteros += curr.reiteros;
      return acc;
    }, { averias: 0, reiteros: 0 });
  }, [datosOrigenes]);

  // Indicador visual simple para las columnas ordenables
  const renderSortIcon = (key) => {
    if (!sortConfig || sortConfig.key !== key) return " ↕";
    return sortConfig.direction === 'ascending' ? " ↑" : " ↓";
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden">
      {/* Encabezado */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-indigo-600 font-bold">📋</span>
          <h3 className="text-lg font-bold text-slate-800">
            Análisis por Origen del Diagnóstico
          </h3>
        </div>
        <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium">
          {datosOrigenes.length} Orígenes Detectados
        </span>
      </div>

      <div className="p-6">
        {datosOrigenes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
            <p className="text-sm">No hay registros de orígenes para mostrar en esta vista</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-100">
                  <th 
                    onClick={() => requestSort('origen')} 
                    className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  >
                    Origen{renderSortIcon('origen')}
                  </th>
                  <th 
                    onClick={() => requestSort('averias')} 
                    className="px-4 py-3 font-semibold text-right cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  >
                    Averías{renderSortIcon('averias')}
                  </th>
                  <th 
                    onClick={() => requestSort('reiteros')} 
                    className="px-4 py-3 font-semibold text-right cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  >
                    Reiteros{renderSortIcon('reiteros')}
                  </th>
                  <th 
                    onClick={() => requestSort('tasaReitero')} 
                    className="px-4 py-3 font-semibold text-right cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  >
                    Tasa Reitero{renderSortIcon('tasaReitero')}
                  </th>
                  <th className="px-4 py-3 font-semibold text-center w-1/4">Distribución</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {datosOrdenados.map((item, index) => {
                  const pctParticipacion = totales.averias > 0 
                    ? ((item.averias / totales.averias) * 100).toFixed(1) 
                    : 0;

                  return (
                    <tr key={index} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900 max-w-xs truncate">
                        {item.origen}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">
                        {item.averias.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">
                        {item.reiteros.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs ${
                          item.tasaReitero > 15 
                            ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                            : item.tasaReitero > 8 
                            ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          {item.tasaReitero}%
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center space-x-2 justify-center">
                          <div className="w-full bg-slate-100 rounded-full h-2 max-w-[120px]">
                            <div 
                              className="bg-indigo-500 h-2 rounded-full" 
                              style={{ width: `${pctParticipacion}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-slate-400 font-mono w-8 text-right">
                            {pctParticipacion}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}