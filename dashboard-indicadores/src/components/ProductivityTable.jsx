import React from 'react';
import * as XLSX from 'xlsx';

export default function ProductivityTable({ data, tiposOrden = [], onSelectTecnico, seleccionado }) {
  
  const exportarAExcel = () => {
    if (!data || data.length === 0) {
      alert("No hay datos disponibles para exportar");
      return;
    }

    // 🚀 Construimos dinámicamente las filas mapeadas incluyendo tipos de orden y liquidación
    const datosFormateados = data.map((tecnico, index) => {
      const fila = {
        "Ranking": index + 1,
        "Nombre Técnico": tecnico.Nombre_Tecnico,
        "Departamento": tecnico.Departamento,
        "Mes": tecnico.Mes,
        "Días Trabajados": tecnico.Dias_Trabajados,
      };

      // 🌟 Añadir dinámicamente cada tipo de orden al Excel
      tiposOrden.forEach(tipo => {
        fila[`Órdenes: ${tipo}`] = tecnico.tipos_orden?.[tipo] || 0;
      });

      fila["Total Órdenes"] = tecnico.Total_Ordenes;
      fila["Baremos Totales"] = tecnico.Baremos_Totales || 0;       // 📊 Columna Financiera/Operativa
      fila["Total Facturado ($)"] = tecnico.Facturacion_Total || 0; // 💵 Columna Financiera
      fila["Promedio Diario"] = tecnico.Promedio_Diario;

      return fila;
    });

    const hojaTrabajo = XLSX.utils.json_to_sheet(datosFormateados);
    const libroTrabajo = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libroTrabajo, hojaTrabajo, "Productividad y Facturación");

    // Auto-ajuste de ancho de columnas
    const anchos = Object.keys(datosFormateados[0]).map(key => ({
      wch: Math.max(...datosFormateados.map(row => row[key] ? row[key].toString().length : 0), key.length) + 3
    }));
    hojaTrabajo['!cols'] = anchos;

    const nombreMes = data[0]?.Mes || "Dashboard";
    XLSX.writeFile(libroTrabajo, `Informe_Productividad_Facturacion_${nombreMes}.xlsx`);
  };

  // 🇨🇴 Formateador numérico para pesos colombianos (sin decimales para dinero)
  const formatoMoneda = (valor) => {
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP', 
      maximumFractionDigits: 0 
    }).format(valor || 0);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">Ranking General y Facturación</h3>
          <p className="text-xs text-slate-500">Métricas operativas, baremos acumulados y valor de mano de obra</p>
        </div>
        
        <button
          onClick={exportarAExcel}
          className="inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl transition-colors shadow-sm gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Exportar Informe
        </button>
      </div>

      <div className="overflow-x-auto border border-slate-150 rounded-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold whitespace-nowrap">
            <tr>
              <th className="py-3 px-4 w-12">Puesto</th>
              <th className="py-3 px-4">Técnico</th>
              <th className="py-3 px-4">Departamento</th>
              <th className="py-3 px-4 text-center">Días Trab.</th>
              
              {/* 🌟 Columnas Dinámicas para cada Tipo de Orden */}
              {tiposOrden.map(tipo => (
                <th key={tipo} className="py-3 px-4 text-center bg-slate-100/50 text-slate-700 normal-case font-medium border-x border-slate-200">
                  {tipo}
                </th>
              ))}

              <th className="py-3 px-4 text-center">Total Órdenes</th>
              <th className="py-3 px-4 text-center bg-amber-50/50 text-amber-900 normal-case font-semibold border-x border-slate-200">BAREMOS TOTALES</th>
              <th className="py-3 px-4 text-center bg-blue-50/50 text-blue-900 normal-case font-semibold border-x border-slate-200">TOTAL FACTURADO</th>
              <th className="py-3 px-4 text-center">Promedio Diario</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 whitespace-nowrap">
            {data.map((tecnico, index) => {
              const esSeleccionado = seleccionado === tecnico.Nombre_Tecnico;
              return (
                <tr 
                  key={tecnico.id_unico}
                  onClick={() => onSelectTecnico(esSeleccionado ? null : tecnico.Nombre_Tecnico)}
                  className={`cursor-pointer transition-colors ${
                    esSeleccionado ? 'bg-blue-50 font-medium text-blue-900 hover:bg-blue-100' : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="py-3 px-4 font-bold text-slate-400">{index + 1}</td>
                  <td className="py-3 px-4 font-medium">{tecnico.Nombre_Tecnico}</td>
                  <td className="py-3 px-4">{tecnico.Departamento}</td>
                  <td className="py-3 px-4 text-center font-mono">{tecnico.Dias_Trabajados}</td>
                  
                  {/* 🌟 Celdas Dinámicas con el conteo por cada Tipo de Orden */}
                  {tiposOrden.map(tipo => {
                    const cant = tecnico.tipos_orden?.[tipo] || 0;
                    return (
                      <td key={tipo} className="py-3 px-4 text-center font-mono border-x border-slate-100 bg-slate-50/30 text-slate-600">
                        {cant > 0 ? cant : <span className="text-slate-300">-</span>}
                      </td>
                    );
                  })}

                  <td className="py-3 px-4 text-center font-mono font-semibold text-slate-900">{tecnico.Total_Ordenes}</td>
                  
                  {/* 📊 Celda de Baremos Totales */}
                  <td className="py-3 px-4 text-center font-mono font-bold bg-amber-50/20 text-amber-700 border-x border-slate-100">
                    {tecnico.Baremos_Totales}
                  </td>
                  
                  {/* 💵 Celda de Facturación Líquida */}
                  <td className="py-3 px-4 text-center font-mono font-bold bg-blue-50/20 text-blue-700 border-x border-slate-100">
                    {formatoMoneda(tecnico.Facturacion_Total)}
                  </td>

                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded-md font-mono font-semibold ${
                      tecnico.Promedio_Diario >= 5 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {tecnico.Promedio_Diario}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}