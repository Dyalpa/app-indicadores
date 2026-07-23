import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx'; // Importamos la librería para Excel

export default function CAIDetalle({ causal, onClose, reiterosRaw = [] }) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!causal) return null;

  // 1. Identificar el nombre del elemento seleccionado (Rango de días o Causal)
  const nombreCausal = 
    causal.Rango_Dias_Reitero || 
    causal.TOA_CIERRE_AVERIA || 
    causal.TOA_CIERRE_AVERIA_PADRE || 
    'Sin nombre';

  const esRangoDias = Boolean(causal.Rango_Dias_Reitero);

  // 2. Extraer y estructurar la lista de CAIs (ACCESS_ID)
  const caisList = useMemo(() => {
    // Si viene de las Causales del Backend (Opción A)
    if (causal.cais && Array.isArray(causal.cais) && causal.cais.length > 0) {
      return causal.cais;
    }

    // Si viene del gráfico BarChartRangos (cruza con reiterosRaw)
    const listaIds = causal.Casos || causal.cais || causal.Lista_Cais || [];

    if (reiterosRaw && reiterosRaw.length > 0 && Array.isArray(listaIds)) {
      const setIds = new Set(listaIds.map(id => String(id).trim().toUpperCase()));
      const filtrados = reiterosRaw.filter(r => r.REITERO === 1 && setIds.has(String(r.ACCESS_ID).trim().toUpperCase()));

      // Agrupar por ACCESS_ID para calcular totales y %
      const agrupados = {};
      filtrados.forEach(r => {
        const id = r.ACCESS_ID || 'SIN_ID';
        const desc = r.TOA_CIERRE_AVERIA || r.OBSERVACIONES_DIAGNOSTICO || 'Sin descripción';
        
        if (!agrupados[id]) {
          agrupados[id] = { CODIGO_CAI: id, DESCRIPCION_CAI: desc, Reiteros: 0 };
        }
        agrupados[id].Reiteros += 1;
      });

      const totalReiteros = filtrados.length;
      return Object.values(agrupados).map(item => ({
        ...item,
        Porcentaje: totalReiteros > 0 ? (item.Reiteros / totalReiteros) * 100 : 0
      }));
    }

    return [];
  }, [causal, reiterosRaw]);

  // 3. Exportación a EXCEL (.xlsx)
  const exportarExcel = () => {
    // Mapeamos los datos limpios para las columnas de Excel
    const datosParaExcel = caisList.map(item => ({
      'Código CAI (ACCESS_ID)': item.CODIGO_CAI || item.access_id || 'N/A',
      'Descripción / Observación': item.DESCRIPCION_CAI || item.causal_ultima || 'Sin descripción',
      'Reiteros': item.Reiteros || item.cantidad || 0,
      'Participación %': parseFloat(item.Porcentaje || item.porcentaje || 0).toFixed(2) + '%'
    }));

    // Creamos la hoja de trabajo (Worksheet)
    const worksheet = XLSX.utils.json_to_sheet(datosParaExcel);

    // Ajuste automático opcional del ancho de columnas para que se vea profesional
    const wscols = [
      { wch: 25 }, // Código CAI
      { wch: 45 }, // Descripción
      { wch: 15 }, // Reiteros
      { wch: 20 }, // Participación %
    ];
    worksheet['!cols'] = wscols;

    // Creamos el libro de trabajo (Workbook) y agregamos la hoja
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Detalle CAI');

    // Limpiamos el nombre para que sea un archivo válido en el sistema operativo
    const nombreLimpio = nombreCausal.replace(/[\/\\?%*:|"<>]/g, '_').substring(0, 30);

    // Generamos la descarga del archivo Excel
    XLSX.writeFile(workbook, `cai_${nombreLimpio}.xlsx`);
  };

  // 4. Filtrado local por término de búsqueda
  const caisFiltrados = caisList.filter(cai => {
    const cod = String(cai.CODIGO_CAI || cai.access_id || '').toLowerCase();
    const desc = String(cai.DESCRIPCION_CAI || cai.causal_ultima || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return cod.includes(search) || desc.includes(search);
  });

  return (
    <div className="bg-white rounded-2xl border border-blue-200 shadow-md p-5 animate-fadeIn mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-blue-100 text-blue-800">
              {esRangoDias ? 'Desglose por Rango de Días' : causal.tipo === 'ultima' ? 'Causal Cierre Actual' : 'Causal Padre'}
            </span>
            <h4 className="text-sm font-bold text-slate-900">
              Desglose de Códigos CAI (ACCESS_ID)
            </h4>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Selección: <strong className="text-blue-700">{nombreCausal}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Buscar CAI o Causal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 w-40 sm:w-48"
          />
          {caisList.length > 0 && (
            <button
              onClick={exportarExcel}
              className="px-3 py-1.5 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-all flex items-center gap-1 shrink-0 cursor-pointer"
            >
              📊 Exportar
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
            title="Cerrar detalle"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="text-slate-500 font-semibold border-b border-slate-200 text-[10px] uppercase tracking-wider bg-slate-50/50">
              <th className="p-2.5 w-[140px]">Código CAI (ACCESS_ID)</th>
              <th className="p-2.5">Descripción / Observación</th>
              <th className="p-2.5 text-center w-[120px]">Reiteros</th>
              <th className="p-2.5 text-center w-[120px]">Participación del Total de Reiteros</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {caisFiltrados.length > 0 ? (
              caisFiltrados.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 text-slate-700">
                  <td className="p-2.5 font-mono font-bold text-blue-700">
                    🆔 {item.CODIGO_CAI || item.access_id || 'N/A'}
                  </td>
                  <td className="p-2.5 text-slate-800 font-medium">
                    {item.DESCRIPCION_CAI || item.causal_ultima || 'Sin descripción'}
                  </td>
                  <td className="p-2.5 text-center font-mono text-slate-600">
                    {(item.Reiteros || item.cantidad || 0).toLocaleString()}
                  </td>
                  <td className="p-2.5 text-center font-mono font-semibold text-slate-700">
                    {parseFloat(item.Porcentaje || item.porcentaje || 0).toFixed(2)}%
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center p-6 text-slate-400 font-light">
                  No se encontraron Códigos CAI asociados para este elemento.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}