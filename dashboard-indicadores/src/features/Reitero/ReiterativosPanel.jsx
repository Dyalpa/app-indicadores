import React, { useEffect, useState, useCallback } from 'react';
import * as XLSX from 'xlsx';

// 🔁 Mismo helper de reintentos + timeout por intento + cancelación externa
// que usa el resto de Reitero (useDashboardState.js), para que el
// comportamiento ante un túnel inestable sea consistente en toda la sección.
async function fetchConReintentosConAviso(url, opciones = {}, maxIntentos = 3, esperaMs = 500, onReintento, timeoutMs = 6000, externalSignal) {
  for (let intento = 1; intento <= maxIntentos; intento++) {
    if (externalSignal?.aborted) {
      throw new DOMException('Cancelado por un filtro más reciente', 'AbortError');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const onExternalAbort = () => controller.abort();
    externalSignal?.addEventListener('abort', onExternalAbort);

    try {
      const respuesta = await fetch(url, { ...opciones, signal: controller.signal });
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', onExternalAbort);

      if ([502, 503, 504].includes(respuesta.status)) {
        throw new Error(`Error de túnel HTTP: ${respuesta.status}`);
      }
      return respuesta;
    } catch (error) {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', onExternalAbort);

      if (externalSignal?.aborted) {
        throw new DOMException('Cancelado por un filtro más reciente', 'AbortError');
      }

      if (intento === maxIntentos) {
        throw new Error(`No se pudo conectar tras ${maxIntentos} intentos.`);
      }
      if (onReintento) onReintento(intento, maxIntentos);

      await new Promise(resolve => setTimeout(resolve, esperaMs));
      if (externalSignal?.aborted) {
        throw new DOMException('Cancelado por un filtro más reciente', 'AbortError');
      }
      esperaMs *= 1.5;
    }
  }
}

export default function ReiterativosPanel({ apiBaseUrl, filtersReitero }) {
  // 🔧 Extraemos los valores PRIMITIVOS del objeto filtersReitero. Este objeto
  // se recrea en cada render del padre (useDashboardState devuelve un literal
  // nuevo cada vez), así que si usáramos `filtersReitero` directo como
  // dependencia de efectos, estos se dispararían de más — incluso sin que el
  // usuario cambiara nada — provocando peticiones duplicadas que a veces
  // "pisaban" un resultado bueno con un error tardío (el "retry fantasma").
  const { selectedMes, selectedDepto, visionCliente, visionTerreno, diaInicio, diaFin } = filtersReitero;

  const [vecesReitero, setVecesReitero] = useState(null);
  const [distribucion, setDistribucion] = useState([]);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [caiExpandido, setCaiExpandido] = useState(null);
  // 🔁 Contador para forzar un reintento real (cambiar el estado al mismo
  // valor no dispara el efecto de nuevo en React)
  const [retryTick, setRetryTick] = useState(0);
  // ⚠️ Se activa cuando fetchConReintentosConAviso entra a un intento 2 o
  // superior — mismo indicador visual que el resto de Reitero.
  const [reintentando, setReintentando] = useState(false);

  const construirQueryBase = useCallback(() => {
    const params = new URLSearchParams();
    if (selectedMes) params.append('mes', selectedMes);
    if (selectedDepto) params.append('departamento', selectedDepto);

    let visionParam;
    if (visionCliente && !visionTerreno) visionParam = 'CLIENTE';
    if (!visionCliente && visionTerreno) visionParam = 'TERRENO';
    if (visionParam) params.append('vision', visionParam);

    params.append('dia_inicio', diaInicio);
    params.append('dia_fin', diaFin);
    return params;
  }, [selectedMes, selectedDepto, visionCliente, visionTerreno, diaInicio, diaFin]);

  // 1️⃣ Al cambiar los filtros globales, primero pedimos SOLO la distribución
  // disponible (sin veces_reitero), para armar los chips seleccionables.
  useEffect(() => {
    const controller = new AbortController();

    async function cargarDistribucion() {
      setCargando(true);
      setError(null);
      setDatos(null);
      setReintentando(false);
      try {
        const params = construirQueryBase();
        const respuesta = await fetchConReintentosConAviso(
          `${apiBaseUrl}/api/reitero/reiterativos?${params.toString()}`,
          {}, 4, 800,
          () => { if (!controller.signal.aborted) setReintentando(true); },
          12000,
          controller.signal
        );
        const json = await respuesta.json();
        if (controller.signal.aborted) return;

        setDistribucion(json.distribucion_disponible || []);
        // Selecciona automáticamente la primera cantidad disponible
        setVecesReitero(json.distribucion_disponible?.[0] ?? null);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('Error cargando distribución de reiterativos:', err);
        setError('No se pudo cargar la distribución de reiteros disponibles.');
      } finally {
        if (!controller.signal.aborted) {
          setReintentando(false);
          setCargando(false);
        }
      }
    }

    cargarDistribucion();
    return () => controller.abort();
  }, [apiBaseUrl, construirQueryBase, retryTick]);

  // 2️⃣ Cuando ya hay una cantidad seleccionada (chip), pedimos el detalle
  // completo de los servicios con exactamente esa cantidad de reiteros.
  useEffect(() => {
    if (vecesReitero === null || vecesReitero === undefined) return;

    const controller = new AbortController();

    async function cargarServicios() {
      setCargando(true);
      setError(null);
      setReintentando(false);
      try {
        const params = construirQueryBase();
        params.append('veces_reitero', vecesReitero);
        const respuesta = await fetchConReintentosConAviso(
          `${apiBaseUrl}/api/reitero/reiterativos?${params.toString()}`,
          {}, 4, 800,
          () => { if (!controller.signal.aborted) setReintentando(true); },
          12000,
          controller.signal
        );
        const json = await respuesta.json();
        if (controller.signal.aborted) return;

        setDatos(json);
        if (json.distribucion_disponible?.length) setDistribucion(json.distribucion_disponible);
        setCaiExpandido(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('Error cargando servicios reiterativos:', err);
        setError('No se pudo cargar la información de servicios reiterativos. Intenta nuevamente.');
      } finally {
        if (!controller.signal.aborted) {
          setReintentando(false);
          setCargando(false);
        }
      }
    }

    cargarServicios();
    return () => controller.abort();
  }, [apiBaseUrl, construirQueryBase, vecesReitero, retryTick]);

  const serviciosFiltrados = (datos?.servicios || []).filter((s) => {
    if (!busqueda) return true;
    const term = busqueda.toLowerCase();
    return (
      String(s.CAI).toLowerCase().includes(term) ||
      String(s.NOMBRE_CLIENTE).toLowerCase().includes(term) ||
      String(s.DIRECCION_DE_INSTALACION).toLowerCase().includes(term) ||
      String(s.TELEFONO_CONTACTO_CLIENTE).toLowerCase().includes(term)
    );
  });

  const exportarExcel = () => {
    if (!serviciosFiltrados.length) return;

    // Cada orden reiterativa de cada servicio se exporta como una fila propia
    const datosMapeados = [];
    serviciosFiltrados.forEach((s) => {
      s.ordenes.forEach((o, idx) => {
        datosMapeados.push({
          'CAI': s.CAI,
          'Titular': s.NOMBRE_CLIENTE,
          'Teléfono': s.TELEFONO_CONTACTO_CLIENTE,
          'Dirección': s.DIRECCION_DE_INSTALACION,
          'Ciudad': s.CIUDAD,
          'Departamento': s.DEPARTAMENTO,
          'CTO': s.TOA_CAJA,
          'N° Orden Reiterativa': idx + 1,
          'Técnico': o.TECNICO,
          'Causal': o.CAUSAL,
          'Fecha': o.FECHA,
          'Días Reitero': o.DIAS_REITERO
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(datosMapeados);
    worksheet['!cols'] = [
      { wch: 16 }, { wch: 28 }, { wch: 16 }, { wch: 32 }, { wch: 16 },
      { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 22 }, { wch: 26 }, { wch: 20 }, { wch: 14 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Reiterativos x${datos.veces_reitero_solicitado}`);
    XLSX.writeFile(workbook, `servicios_reiterativos_x${datos.veces_reitero_solicitado}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* 🎛️ Encabezado + Chips de cantidad de reiteros (única forma de filtrar) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">📇 Servicios Reiterativos</h3>
          <p className="text-[11px] text-slate-400 font-light mt-0.5">
            Selecciona la cantidad de reiteros para ver los servicios (CAI) que se reiteraron exactamente esa
            cantidad de veces, con los datos del titular y el detalle de cada orden reiterativa.
          </p>
        </div>

        {distribucion.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Cantidad de Reiteros:</span>
            {distribucion.map((n) => (
              <button
                key={n}
                onClick={() => setVecesReitero(n)}
                className={`px-3 py-1 text-xs rounded-full border font-semibold transition-colors cursor-pointer ${
                  n === vecesReitero
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        ) : !cargando && (
          <p className="text-xs text-slate-400 font-light">No hay reiteros disponibles para los filtros actuales.</p>
        )}
      </div>

      {/* 🚨 Error con botón de reintento manual */}
      {error && !cargando && (
        <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">
          <span>🚨 {error}</span>
          <button
            onClick={() => setRetryTick((t) => t + 1)}
            className="shrink-0 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors cursor-pointer"
          >
            🔄 Reintentar
          </button>
        </div>
      )}

      {/* 📊 Contenido */}
      {cargando ? (
        <div className="flex h-64 flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 gap-2 shadow-sm">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className={`font-light text-xs ${reintentando ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
            {reintentando ? '⚠️ Conexión inestable, reintentando...' : 'Buscando servicios reiterativos...'}
          </p>
        </div>
      ) : datos ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {datos.total_servicios} servicio{datos.total_servicios !== 1 ? 's' : ''} con exactamente {datos.veces_reitero_solicitado} reiteros
            </h4>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Buscar por CAI, titular, dirección o teléfono..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 w-64"
              />
              {serviciosFiltrados.length > 0 && (
                <button
                  onClick={exportarExcel}
                  className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  📊 Exportar
                </button>
              )}
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {serviciosFiltrados.length > 0 ? (
              serviciosFiltrados.map((s) => {
                const expandido = caiExpandido === s.CAI;
                return (
                  <div key={s.CAI}>
                    {/* Fila resumen del servicio — clic para expandir/colapsar el detalle */}
                    <button
                      onClick={() => setCaiExpandido(expandido ? null : s.CAI)}
                      className="w-full flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 text-left hover:bg-slate-50/70 transition-colors cursor-pointer"
                    >
                      <span className="font-mono font-bold text-blue-700 text-xs whitespace-nowrap">
                        {expandido ? '▼' : '▶'} 🆔 {s.CAI}
                      </span>
                      <span className="text-xs font-medium text-slate-800 flex-1 truncate">{s.NOMBRE_CLIENTE || 'SIN ESPECIFICAR'}</span>
                      <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap">{s.TELEFONO_CONTACTO_CLIENTE || 'SIN ESPECIFICAR'}</span>
                      <span className="text-[11px] text-slate-500 truncate max-w-[220px]" title={s.DIRECCION_DE_INSTALACION}>
                        {s.DIRECCION_DE_INSTALACION || 'SIN ESPECIFICAR'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                        {s.veces_reitero} reiteros
                      </span>
                    </button>

                    {/* Detalle expandido: cada orden reiterativa de este CAI */}
                    {expandido && (
                      <div className="bg-slate-50/60 px-3 pb-3">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="text-slate-500 font-semibold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                              <th className="p-2">#</th>
                              <th className="p-2">Técnico</th>
                              <th className="p-2">Causal</th>
                              <th className="p-2">Fecha</th>
                              <th className="p-2 text-center">Días desde Orden Anterior</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {s.ordenes.map((o, idx) => (
                              <tr key={idx} className="text-slate-700">
                                <td className="p-2 font-mono text-slate-400">{idx + 1}</td>
                                <td className="p-2">{o.TECNICO || 'SIN ESPECIFICAR'}</td>
                                <td className="p-2">
                                  <span className="inline-block bg-blue-50/70 text-blue-900 px-2 py-0.5 rounded border border-blue-100">
                                    📌 {o.CAUSAL || 'SIN ESPECIFICAR'}
                                  </span>
                                </td>
                                <td className="p-2 font-mono whitespace-nowrap">{o.FECHA || 'N/A'}</td>
                                <td className="p-2 text-center font-mono font-bold text-amber-700">
                                  {o.DIAS_REITERO !== null && o.DIAS_REITERO !== undefined ? o.DIAS_REITERO : 'N/A'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center p-6 text-slate-400 font-light text-xs">
                {busqueda
                  ? 'Ningún servicio coincide con la búsqueda.'
                  : `No hay servicios con exactamente ${datos.veces_reitero_solicitado} reiteros para los filtros actuales.`}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}