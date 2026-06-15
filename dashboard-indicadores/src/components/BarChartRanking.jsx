import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

export default function BarChartRanking({ data, onSelectTecnico, seleccionado }) {
  
  const manejarClickEnTecnico = (nombreClicado) => {
    if (seleccionado === nombreClicado) {
      onSelectTecnico(null); 
    } else {
      onSelectTecnico(nombreClicado); 
    }
  };

  const altoDinamicoGrafico = Math.max(data.length * 25, 250);

  const RenderTickIzquierdo = (props) => {
    const { x, y, payload } = props;
    return (
      <g transform={`translate(0,${y})`}>
        <text
          x={0}             
          y={4}             
          textAnchor="start" 
          fill="#334155"
          className="text-[10px] font-bold select-none"
          style={{ whiteSpace: 'nowrap' }}
        >
          {payload.value}
        </text>
      </g>
    );
  };

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      {/* 🔥 INYECCIÓN DE CSS LOCAL: Mata el borde negro de raíz en este componente */}
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

      {/* 🏷️ TÍTULO DINÁMICO */}
      <div>
        <h3 className="text-base font-bold text-slate-900 tracking-tight">
          {seleccionado 
            ? `📌 Enfocado en: ${seleccionado}` 
            : '📊 Ranking de Rendimiento (Promedio Diario)'}
        </h3>
        <p className="text-xs text-slate-500">
          {seleccionado 
            ? 'Haz clic nuevamente en la barra azul oscuro para restaurar la vista global.' 
            : 'Haz clic en la barra de cualquier técnico para aislar sus órdenes en la dona.'}
        </p>
      </div>

      {/* 📜 CONTENEDOR CON SCROLL VERTICAL */}
      <div className="w-full h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        
        <div style={{ width: '100%', height: `${altoDinamicoGrafico}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={data} 
              layout="vertical"
              margin={{ top: 10, right: 40, left: 200, bottom: 10 }}
              accessibilityLayer={false} // 👈 Desactiva la generación de capas de enfoque automático
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} vertical={true} />
              
              <XAxis 
                type="number"
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              
              <YAxis 
                dataKey="Nombre_Tecnico" 
                type="category"
                tickLine={false}
                axisLine={false}
                interval={0}
                tick={<RenderTickIzquierdo />} 
              />
              
              <Tooltip 
                cursor={{ fill: '#f8fafc', strokeWidth: 0 }} 
                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
              />
              
              <Bar 
                dataKey="Promedio_Diario" 
                radius={[0, 4, 4, 0]} 
                barSize={14} 
                className="cursor-pointer"
              >
                <LabelList 
                  dataKey="Promedio_Diario" 
                  position="right" 
                  dx={8}           
                  fill="#475569"   
                  fontSize={10} 
                  fontWeight={700}
                />

                {data.map((entry, index) => {
                  const esElSeleccionado = seleccionado === entry.Nombre_Tecnico;
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      onClick={() => manejarClickEnTecnico(entry.Nombre_Tecnico)}
                      fill={esElSeleccionado ? '#2563eb' : seleccionado ? '#cbd5e1' : '#3b82f6'}
                      stroke="none"      
                      strokeWidth={0}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}