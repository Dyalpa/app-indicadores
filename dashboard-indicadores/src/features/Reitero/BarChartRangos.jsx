import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

export default function BarChartRangos({ data = [] }) {
  
  // 🧭 Ordenamos cronológicamente los rangos extrayendo el primer número (ej: "De 0 a 5..." -> 0)
  const dataOrdenada = [...data].sort((a, b) => {
    const numA = parseInt(a.Rango_Dias_Reitero?.match(/\d+/)?.[0] || '999', 10);
    const numB = parseInt(b.Rango_Dias_Reitero?.match(/\d+/)?.[0] || '999', 10);
    return numA - numB;
  });

  if (dataOrdenada.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50">
        <p className="text-slate-400 font-light text-xs">Sin datos de rangos disponibles</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      {/* 🔥 INYECCIÓN DE CSS LOCAL: Unificado con tu estándar visual */}
      <style>{`
        .recharts-wrapper, .recharts-surface, .recharts-bar-rect, .recharts-cell {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
          -webkit-tap-highlight-color: transparent !important;
        }
        *:focus {
          outline: none !important;
        }
      `}</style>

      {/* 🏷️ TÍTULO */}
      <div>
        <h3 className="text-base font-bold text-slate-900 tracking-tight">
          📊 Distribución de Reiteros por Rangos de Días
        </h3>
        <p className="text-xs text-slate-500">
          Casos según el tiempo transcurrido desde la última atención.
        </p>
      </div>

      {/* 📜 CONTENEDOR DEL GRÁFICO (Eje Vertical) */}
      <div className="w-full h-[320px] pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={dataOrdenada} 
            margin={{ top: 20, right: 20, left: -25, bottom: 5 }}
            accessibilityLayer={false}
          >
            {/* Rejilla idéntica a tu estándar: solo líneas horizontales, ocultando verticales */}
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={true} vertical={false} />
            
            <XAxis 
              dataKey="Rango_Dias_Reitero" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
            />
            
            <YAxis 
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 11 }}
            />
            
            {/* Tooltip con tu mismo estilo limpio */}
            <Tooltip
              cursor={{ fill: '#f8fafc', strokeWidth: 0 }}
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
              radius={[4, 4, 0, 0]} // Redondeado superior coherente con tus barras
              maxBarSize={45}
            >
              {/* Etiquetas numéricas flotando sobre cada barra vertical */}
              <LabelList 
                dataKey="Cantidad_Casos" 
                position="top" 
                dy={-8}           
                fill="#475569"   
                fontSize={10} 
                fontWeight={700}
              />

              {dataOrdenada.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill="#3b82f6" // Conserva el color primario azul de productividad
                  stroke="none"      
                  strokeWidth={0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}