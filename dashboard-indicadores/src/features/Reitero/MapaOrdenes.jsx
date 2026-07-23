import React, { useMemo, useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Componente para corregir mapas recortados y recentrar la cámara
function ConfigurarMapa({ center }) {
  const map = useMap();
  
  useEffect(() => {
    if (center && !isNaN(center[0]) && !isNaN(center[1])) {
      setTimeout(() => {
        map.invalidateSize();
        map.setView(center, map.getZoom());
      }, 200);
    }
  }, [center, map]);
  
  return null;
}

export default function MapaOrdenes({ ordenesRaw }) {
  // 🛠️ Estado para controlar el filtro exacto solicitado
  const [filtroReitero, setFiltroReitero] = useState('todas');

  // 1. Filtrado y parseo estricto de coordenadas base
  const averiasConCoordenadas = useMemo(() => {
    if (!Array.isArray(ordenesRaw)) return [];
    return ordenesRaw.filter((orden) => {
      const lat = parseFloat(orden?.lat);
      const lng = parseFloat(orden?.lng);
      return !isNaN(lat) && !isNaN(lng);
    });
  }, [ordenesRaw]);

  // 2. 📊 Métrica de totales dinámicos (Clasificación estricta de todo el universo mapeado)
  const totales = useMemo(() => {
    let reiteradas = 0;
    let noReiteradas = 0;

    averiasConCoordenadas.forEach((orden) => {
      // Considera reitero si el campo existe, no está vacío y es válido (incluyendo los de 0 días)
      const esReiteroValido = orden.DIAS_REITERO !== undefined && orden.DIAS_REITERO !== null && orden.DIAS_REITERO !== '';
      
      if (esReiteroValido) {
        reiteradas++;
      } else {
        noReiteradas++;
      }
    });

    return {
      todas: averiasConCoordenadas.length,
      reiteradas,
      noReiteradas
    };
  }, [averiasConCoordenadas]);

  // 3. ⚡ Aplicación de la lógica de segmentación solicitada sin omitir los reiteros de 0 días
  const averiasFiltradas = useMemo(() => {
    return averiasConCoordenadas.filter((orden) => {
      const esReiteroValido = orden.DIAS_REITERO !== undefined && orden.DIAS_REITERO !== null && orden.DIAS_REITERO !== '';
      
      if (filtroReitero === 'reiteradas') {
        return esReiteroValido; // Entran todos los reiteros (0 días, 1 día, etc.)
      }
      if (filtroReitero === 'no_reiteradas') {
        return !esReiteroValido; // Solo las que no registran historial de reitero
      }
      return true; // 'todas'
    });
  }, [averiasConCoordenadas, filtroReitero]);

  // 4. Calcular el centro dinámico según lo que se está mostrando
  const centroMapa = useMemo(() => {
    if (averiasFiltradas.length === 0) {
      return [4.570868, -74.297333]; // Colombia por defecto
    }
    let sumLat = 0, sumLng = 0;
    averiasFiltradas.forEach((o) => {
      sumLat += parseFloat(o.lat);
      sumLng += parseFloat(o.lng);
    });
    return [sumLat / averiasFiltradas.length, sumLng / averiasFiltradas.length];
  }, [averiasFiltradas]);

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
      
      {/* Encabezado e Interfaz de Filtros */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            🗺️ Distribución Geográfica de Averías
          </h3>
          <p className="text-xs text-slate-400 font-light mt-0.5">
            Mostrando visualmente <span className="font-medium text-slate-700">{averiasFiltradas.length}</span> órdenes en el mapa.
          </p>
        </div>

        {/* Selector de Filtros con Contadores de Totales integrados */}
        <div className="flex flex-wrap gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium">
          <button
            onClick={() => setFiltroReitero('todas')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
              filtroReitero === 'todas' 
                ? 'bg-white text-slate-800 shadow-xs font-semibold' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            🌐 Todas <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${filtroReitero === 'todas' ? 'bg-slate-100 text-slate-700' : 'bg-slate-200 text-slate-600'}`}>{totales.todas}</span>
          </button>
          
          <button
            onClick={() => setFiltroReitero('reiteradas')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
              filtroReitero === 'reiteradas' 
                ? 'bg-red-500 text-white shadow-xs font-semibold' 
                : 'text-slate-500 hover:text-red-600'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${filtroReitero === 'reiteradas' ? 'bg-white animate-pulse' : 'bg-red-500'}`}></span>
            Solo Reiteradas 
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${filtroReitero === 'reiteradas' ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-600'}`}>{totales.reiteradas}</span>
          </button>

          <button
            onClick={() => setFiltroReitero('no_reiteradas')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
              filtroReitero === 'no_reiteradas' 
                ? 'bg-blue-600 text-white shadow-xs font-semibold' 
                : 'text-slate-500 hover:text-blue-600'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${filtroReitero === 'no_reiteradas' ? 'bg-white' : 'bg-blue-600'}`}></span>
            Solo No Reiteradas 
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${filtroReitero === 'no_reiteradas' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-600'}`}>{totales.noReiteradas}</span>
          </button>
        </div>
      </div>

      {/* Alerta si el filtro no devuelve nada */}
      {averiasFiltradas.length === 0 && (
        <div className="mb-4 p-4 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl text-xs">
          ⚠️ No se encontraron órdenes coincidentes con el filtro de "{filtroReitero === 'reiteradas' ? 'Solo Reiteradas' : 'Solo No Reiteradas'}" en esta zona.
        </div>
      )}

      {/* Mapa */}
      <div className="h-[550px] w-full rounded-2xl overflow-hidden border border-slate-200" style={{ position: 'relative', zIndex: 0 }}>
        <MapContainer
          center={centroMapa}
          zoom={11}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <ConfigurarMapa center={centroMapa} />

          {averiasFiltradas.map((orden, index) => {
            const posicion = [parseFloat(orden.lat), parseFloat(orden.lng)];
            const esReitero = orden.DIAS_REITERO !== undefined && orden.DIAS_REITERO !== null && orden.DIAS_REITERO !== '';
            const diasReitero = esReitero ? parseInt(orden.DIAS_REITERO || 0, 10) : 0;

            return (
              <CircleMarker
                key={`${orden.NUMERO_INCIDENTE || index}-${index}`}
                center={posicion}
                radius={esReitero ? 9 : 5}
                pathOptions={{
                  fillColor: esReitero ? '#ef4444' : '#2563eb', // Rojo para cualquier tipo de reitero, Azul para normales
                  color: esReitero ? '#b91c1c' : '#1d4ed8',
                  weight: 1.5,
                  opacity: 0.9,
                  fillOpacity: esReitero ? 0.5 : 0.35
                }}
              >
                <Popup>
                  <div className="text-xs font-sans p-1 min-w-[190px]">
                    <div className="font-bold text-slate-900 border-b border-slate-100 pb-1.5 mb-1.5 flex justify-between items-center">
                      <span>Incidente: {orden.NUMERO_INCIDENTE || 'N/A'}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        esReitero ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {esReitero ? 'Reiterado' : 'Normal'}
                      </span>
                    </div>
                    <div className="space-y-1 text-slate-600 font-light">
                      <p><strong className="font-medium text-slate-800">Access ID:</strong> {orden.ACCESS_ID || 'N/A'}</p>
                      <p><strong className="font-medium text-slate-800">Ubicación:</strong> {orden.CIUDAD || 'N/A'}</p>
                      <p><strong className="font-medium text-slate-800">Caja / CTO:</strong> {orden.TOA_CAJA || 'N/A'}</p>
                      <p>
                        <strong className="font-medium text-slate-800">Días de Reitero:</strong>{' '}
                        <span className={esReitero ? 'text-red-600 font-semibold' : ''}>
                          {esReitero ? `${diasReitero} días` : 'N/A'}
                        </span>
                      </p>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}