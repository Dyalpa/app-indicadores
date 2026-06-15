import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function OrderPieChart({ tecnico, todoElDetalle }) {
  
  const consolidadoOrdenes = todoElDetalle.reduce((acc, curr) => {
    const tipo = curr.Tipo_de_orden || 'Otros';
    if (!acc[tipo]) acc[tipo] = 0;
    acc[tipo] += curr.Cantidad;
    return acc;
  }, {});

  const dataGrafico = Object.keys(consolidadoOrdenes).map(tipo => ({
    name: tipo,
    value: consolidadoOrdenes[tipo]
  }));

  const COLORES = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

  const renderizarTextoLeyenda = (value) => {
    const item = dataGrafico.find(d => d.name === value);
    const cantidad = item ? item.value : 0;
    return <span className="text-slate-700 font-semibold text-[11px]">{value}: <strong className="text-blue-600 font-extrabold">{cantidad}</strong></span>;
  };

  return (
    <div className="w-full h-full flex flex-col justify-between">
      {/* 🔥 INYECCIÓN DE CSS LOCAL: Bloquea bordes en la dona */}
      <style>{`
        .recharts-wrapper, .recharts-pie-sector, .recharts-sector {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
          -webkit-tap-highlight-color: transparent !important;
        }
      `}</style>

      {/* 🏷️ TÍTULO DINÁMICO */}
      <div className="mb-2">
        <h3 className="text-base font-bold text-slate-900 tracking-tight">
          {tecnico 
            ? `🍩 Distribución: ${tecnico}` 
            : '🍩 Órdenes Globales por Tipo'}
        </h3>
        <p className="text-xs text-slate-500">
          {tecnico 
            ? `Tipos de requerimientos atendidos por este técnico.` 
            : 'Comportamiento general de solicitudes de la empresa.'}
        </p>
      </div>

      {/* CONTENEDOR DEL GRÁFICO */}
      <div className="flex-grow flex items-center justify-center min-h-[300px]">
        {dataGrafico.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No hay órdenes registradas en este rango</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart accessibilityLayer={false}>
              <Pie
                data={dataGrafico}
                cx="50%"
                cy="48%" 
                innerRadius={65} 
                outerRadius={95} 
                paddingAngle={3}
                dataKey="value"
                stroke="none" 
              >
                {dataGrafico.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORES[index % COLORES.length]} 
                    stroke="none"
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name) => [`${value} órdenes`, name]}
                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={40} 
                iconType="circle"
                formatter={renderizarTextoLeyenda} 
                wrapperStyle={{ fontSize: '11px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}