import React, { useState } from 'react';
import * as XLSX from 'xlsx'; // Importamos la librería de Excel
import CAIDetalle from './CAIDetalle';

export default function CausalReitero({ causalesData = {} }) {
  const {
    causales_ultimas = [],
    causales_padres = []
  } = causalesData || {};

  const [selectedCausal, setSelectedCausal] = useState(null);

  // ==================== CÁLCULO DE TOTALES ====================
  const totalAveriasUltimas = causales_ultimas.reduce((acc, row) => acc + (row.Averias || 0), 0);
  const totalReiterosUltimas = causales_ultimas.reduce((acc, row) => acc + (row.Reiteros || 0), 0);
  const tasaPonderadaUltimas = totalAveriasUltimas > 0
    ? ((totalReiterosUltimas / totalAveriasUltimas) * 100).toFixed(2)
    : '0.00';

  const totalReiterosPadres = causales_padres.reduce((acc, row) => acc + (row.Reiteros_Causados || 0), 0);
  const totalDistribucionPadres = causales_padres.reduce((acc, row) => acc + parseFloat(row.Distribucion_Porcentaje || 0), 0).toFixed(2);

  // Helper universal para exportar a EXCEL (.xlsx)
  const descargarExcel = (datosMapeados, nombreHoja, nombreArchivo) => {
    const worksheet = XLSX.utils.json_to_sheet(datosMapeados);
    
    // Auto-ancho estimado de columnas
    worksheet['!cols'] = [
      { wch: 40 }, // Columna larga de Causal
      { wch: 15 }, // Numéricos
      { wch: 15 },
      { wch: 15 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, nombreHoja);
    XLSX.writeFile(workbook, `${nombreArchivo}.xlsx`);
  };

  const exportarUltimas = () => {
    const datosMapeados = causales_ultimas.map(row => ({
      'Causal Atendida (Cierre Actual)': row.TOA_CIERRE_AVERIA,
      'Averías': row.Averias,
      'Reiteros': row.Reiteros,
      'Tasa %': parseFloat(row.Tasa_Reitero || 0).toFixed(2) + '%'
    }));

    // Agregamos la fila de TOTAL al final
    datosMapeados.push({
      'Causal Atendida (Cierre Actual)': 'TOTAL',
      'Averías': totalAveriasUltimas,
      'Reiteros': totalReiterosUltimas,
      'Tasa %': tasaPonderadaUltimas + '%'
    });

    descargarExcel(datosMapeados, 'Por Causal', 'porcentaje_reitero_por_causal');
  };

  const exportarPadres = () => {
    const datosMapeados = causales_padres.map(row => ({
      'Causal de Origen (Avería Padre)': row.TOA_CIERRE_AVERIA_PADRE,
      'Reiteros Generados': row.Reiteros_Causados,
      'Participación %': parseFloat(row.Distribucion_Porcentaje || 0).toFixed(2) + '%'
    }));

    // Agregamos la fila de TOTAL al final
    datosMapeados.push({
      'Causal de Origen (Avería Padre)': 'TOTAL',
      'Reiteros Generados': totalReiterosPadres,
      'Participación %': totalDistribucionPadres + '%'
    });

    descargarExcel(datosMapeados, 'Causal Padre', 'causales_padre_origen');
  };

  const handleSelect = (item, tipo) => {
    const key = tipo === 'ultima' ? item.TOA_CIERRE_AVERIA : item.TOA_CIERRE_AVERIA_PADRE;
    const currentKey = selectedCausal?.TOA_CIERRE_AVERIA || selectedCausal?.TOA_CIERRE_AVERIA_PADRE;

    if (selectedCausal && currentKey === key && selectedCausal.tipo === tipo) {
      setSelectedCausal(null);
    } else {
      setSelectedCausal({ ...item, tipo });
    }
  };

  return (
    <div className="flex flex-col space-y-6 w-full animate-fadeIn">
      
      {/* 🔬 Encabezado */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span>🔬</span> Análisis de Causales
        </h3>
        <p className="text-[11px] text-slate-500 font-light mt-0.5">
          Haz clic en cualquier causal de la tabla para desglosar sus <strong>Códigos CAI</strong> asociados.
        </p>
      </div>

      {/* 📊 TABLAS PARALELAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Tabla 1: Causal Cierre Actual */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              📊 Porcentaje de Reitero por Causal
            </h4>
            {causales_ultimas.length > 0 && (
              <button
                onClick={exportarUltimas}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-all cursor-pointer"
              >
                📊 Exportar
              </button>
            )}
          </div>
          <div className="p-3 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="text-slate-500 font-semibold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                  <th className="p-2.5">Causal Atendida (Cierre Actual)</th>
                  <th className="p-2.5 text-center w-[80px]">Averías</th>
                  <th className="p-2.5 text-center w-[80px]">Reiteros</th>
                  <th className="p-2.5 text-center w-[100px]">Tasa %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {causales_ultimas.length > 0 ? (
                  <>
                    {causales_ultimas.map((row, index) => {
                      const isSelected = selectedCausal?.TOA_CIERRE_AVERIA === row.TOA_CIERRE_AVERIA && selectedCausal?.tipo === 'ultima';
                      return (
                        <tr
                          key={index}
                          onClick={() => handleSelect(row, 'ultima')}
                          className={`cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-blue-50/80 border-l-4 border-l-blue-600 text-blue-900 font-medium' 
                              : 'hover:bg-slate-50/80 text-slate-700'
                          }`}
                        >
                          <td className="p-2.5 max-w-[180px] truncate" title={row.TOA_CIERRE_AVERIA}>
                            {row.TOA_CIERRE_AVERIA}
                          </td>
                          <td className="p-2.5 text-center font-mono text-slate-600">
                            {row.Averias.toLocaleString()}
                          </td>
                          <td className="p-2.5 text-center font-mono text-slate-600">
                            {row.Reiteros.toLocaleString()}
                          </td>
                          <td className="p-2.5 text-center font-mono">
                            <span className={`inline-block px-1.5 py-0.5 rounded font-bold text-[10px] ${
                              row.Tasa_Reitero > 7.0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                            }`}>
                              {parseFloat(row.Tasa_Reitero || 0).toFixed(2)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-50/80 font-semibold border-t-2 border-slate-200">
                      <td className="p-2.5 text-slate-800 font-bold">TOTAL</td>
                      <td className="p-2.5 text-center text-slate-800 font-mono font-bold">{totalAveriasUltimas.toLocaleString()}</td>
                      <td className="p-2.5 text-center text-slate-800 font-mono font-bold">{totalReiterosUltimas.toLocaleString()}</td>
                      <td className="p-2.5 text-center font-mono">
                        <span className={`inline-block px-1.5 py-0.5 rounded font-bold text-[10px] ${
                          parseFloat(tasaPonderadaUltimas) > 7.0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {tasaPonderadaUltimas}%
                        </span>
                      </td>
                    </tr>
                  </>
                ) : (
                  <tr><td colSpan="4" className="text-center p-8 text-slate-400 font-light">No hay registros.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabla 2: Causal Padre */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              📊 Causal Padre (Origen)
            </h4>
            {causales_padres.length > 0 && (
              <button
                onClick={exportarPadres}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-all cursor-pointer"
              >
                📊 Exportar
              </button>
            )}
          </div>
          <div className="p-3 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="text-slate-500 font-semibold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                  <th className="p-2.5">Causal de Origen (Avería Padre)</th>
                  <th className="p-2.5 text-center w-[110px]">Reiteros Generados</th>
                  <th className="p-2.5 text-center w-[120px]">Participación del Total de Reiteros</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {causales_padres.length > 0 ? (
                  <>
                    {causales_padres.map((row, index) => {
                      const isSelected = selectedCausal?.TOA_CIERRE_AVERIA_PADRE === row.TOA_CIERRE_AVERIA_PADRE && selectedCausal?.tipo === 'padre';
                      return (
                        <tr
                          key={index}
                          onClick={() => handleSelect(row, 'padre')}
                          className={`cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-blue-50/80 border-l-4 border-l-blue-600 text-blue-900 font-medium' 
                              : 'hover:bg-slate-50/80 text-slate-700'
                          }`}
                        >
                          <td className="p-2.5 max-w-[180px] truncate" title={row.TOA_CIERRE_AVERIA_PADRE}>
                            {row.TOA_CIERRE_AVERIA_PADRE}
                          </td>
                          <td className="p-2.5 text-center font-mono text-slate-600">
                            {row.Reiteros_Causados.toLocaleString()}
                          </td>
                          <td className="p-2.5 text-center font-mono font-semibold text-slate-700">
                            <div className="flex items-center justify-center gap-2">
                              <span className="w-10 text-right">{parseFloat(row.Distribucion_Porcentaje || 0).toFixed(2)}%</span>
                              <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                                <div className="bg-blue-600 h-full rounded-full" style={{ width: `${row.Distribucion_Porcentaje}%` }} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-50/80 font-semibold border-t-2 border-slate-200">
                      <td className="p-2.5 text-slate-800 font-bold">TOTAL</td>
                      <td className="p-2.5 text-center text-slate-800 font-mono font-bold">{totalReiterosPadres.toLocaleString()}</td>
                      <td className="p-2.5 text-center text-slate-800 font-mono font-bold">
                        <div className="flex items-center justify-center gap-2">
                          <span className="w-10 text-right font-bold">{totalDistribucionPadres}%</span>
                          <div className="w-12 bg-slate-200 h-1.5 rounded-full overflow-hidden hidden sm:block">
                            <div className="bg-blue-700 h-full rounded-full" style={{ width: `${Math.min(100, parseFloat(totalDistribucionPadres))}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  </>
                ) : (
                  <tr><td colSpan="3" className="text-center p-8 text-slate-400 font-light">No hay registros.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* 🧩 COMPONENTE DE DETALLE CAI */}
      {selectedCausal && (
        <CAIDetalle
          causal={selectedCausal}
          onClose={() => setSelectedCausal(null)}
        />
      )}

    </div>
  );
}