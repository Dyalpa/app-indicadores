import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export default function ProductivityPieChart({ registrosGraficoCircular }) {
  // 1. Clasificación y reducción de la facturación según las reglas de negocio
  const datosProcesados = (registrosGraficoCircular || []).reduce(
    (acc, curr) => {
      const tipo = (curr.Tipo_de_orden || '').toUpperCase();
      const dinero = curr.Total_Dinero || 0;

      // Regla de negocio: Identificar si es Avería o si pertenece a Altas/Posventas
      if (tipo.includes('AVE') || tipo.includes('REPAR')) {
        acc.averias += dinero;
      } else {
        acc.altasPosventas += dinero;
      }

      return acc;
    },
    { averias: 0, altasPosventas: 0 }
  );

  const totalFacturado = datosProcesados.averias + datosProcesados.altasPosventas;

  // 2. Formatear la estructura requerida por Recharts
  const data = [
    { 
      name: 'Averías', 
      value: Number(datosProcesados.averias.toFixed(2)),
      porcentaje: totalFacturado > 0 ? ((datosProcesados.averias / totalFacturado) * 100).toFixed(1) : 0
    },
    { 
      name: 'Altas y Posventas', 
      value: Number(datosProcesados.altasPosventas.toFixed(2)),
      porcentaje: totalFacturado > 0 ? ((datosProcesados.altasPosventas / totalFacturado) * 100).toFixed(1) : 0
    },
  ];

  // Colores minimalistas alineados con la estética de tu app
  const COLORS = ['#ef4444', '#3b82f6']; // Rojo para Averías, Azul para Altas/Posventas

  // Formateador de moneda local
  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col h-full">
      <div>
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
          Distribución de Facturación
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Resumen según el tipo de orden
        </p>
      </div>

      {totalFacturado === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[240px] text-slate-400 text-sm font-medium">
          No hay datos de facturación en este rango
        </div>
      ) : (
        <div className="flex-1 flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
          {/* Contenedor del Gráfico Circular */}
          <div className="w-full sm:w-1/2 h-[220px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  formatter={(value) => [formatearMoneda(value), 'Facturado']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                />
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Texto informativo en el centro del Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs font-semibold text-slate-400 uppercase">Total</span>
              <span className="text-base font-bold text-slate-700">
                {formatearMoneda(totalFacturado)}
              </span>
            </div>
          </div>

          {/* Tarjetas informativas de Leyenda */}
          <div className="w-full sm:w-1/2 flex flex-col gap-3">
            {data.map((item, index) => (
              <div 
                key={item.name} 
                className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl"
              >
                <div className="flex items-center space-x-2.5">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index] }} 
                  />
                  <div>
                    <p className="text-sm font-bold text-slate-700">{item.name}</p>
                    <p className="text-xs text-slate-400 font-medium">{item.porcentaje}% del total</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-slate-600">
                  {formatearMoneda(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}