import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

export default function LineChartAcumulado({ data = [] }) {
  
  // 📈 Agrupar por día y calcular la Tasa de Reitero Acumulada (%)
  const procesarDatosAcumulados = () => {
    if (!data || data.length === 0) return [];

    const datosOrdenados = [...data].sort((a, b) => a.Dia_Ingreso - b.Dia_Ingreso);

    const mapaDias = {};
    datosOrdenados.forEach(reg => {
      const dia = reg.Dia_Ingreso;
      if (!mapaDias[dia]) {
        mapaDias[dia] = { averias: 0, reiteros: 0 };
      }
      mapaDias[dia].averias += (reg.Averias_Ingresadas || 0);
      mapaDias[dia].reiteros += (reg.Reiteros_Ingresados || 0);
    });

    let acumuladoAverias = 0;
    let acumuladoReiteros = 0;

    return Object.keys(mapaDias)
      .map(dia => {
        const numeroDia = parseInt(dia, 10);
        acumuladoAverias += mapaDias[numeroDia].averias;
        acumuladoReiteros += mapaDias[numeroDia].reiteros;

        const tasaDelDia = mapaDias[numeroDia].averias > 0 
          ? (mapaDias[numeroDia].reiteros / mapaDias[numeroDia].averias) * 100 
          : 0;

        const tasaAcumulada = acumuladoAverias > 0 
          ? (acumuladoReiteros / acumuladoAverias) * 100 
          : 0;

        return {
          Dia_Ingreso: `Día ${numeroDia}`,
          "Reitero Diario": parseFloat(tasaDelDia.toFixed(2)),
          "Reitero Acumulado": parseFloat(tasaAcumulada.toFixed(2))
        };
      })
      .sort((a, b) => parseInt(a.Dia_Ingreso.match(/\d+/)[0]) - parseInt(b.Dia_Ingreso.match(/\d+/)[0]));
  };

  const dataGrafico = procesarDatosAcumulados();

  if (dataGrafico.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50">
        <p className="text-slate-400 font-light text-xs">Sin datos diarios disponibles para este mes</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      <style>{`
        .recharts-wrapper, .recharts-surface, .recharts-bar-rect, .recharts-cell {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
        }
        *:focus {
          outline: none !important;
        }
      `}</style>

      <div>
        <h3 className="text-base font-bold text-slate-900 tracking-tight">
          📈 Curva de Comportamiento y Tasa Acumulada
        </h3>
        <p className="text-xs text-slate-500">
          Evolución de la tasa porcentual de reitero consolidada día con día.
        </p>
      </div>

      <div className="w-full h-[320px] pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dataGrafico} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            
            <XAxis 
              dataKey="Dia_Ingreso" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 10 }}
            />
            
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 11 }}
              unit="%"
            />
            
            <Tooltip
              cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
              contentStyle={{ 
                backgroundColor: '#ffffff', 
                borderRadius: '12px', 
                border: '1px solid #e2e8f0', 
                fontSize: '12px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)'
              }}
              formatter={(value, name) => [`${value}%`, name]}
              labelClassName="font-bold text-slate-800 mb-1"
            />
            
            {/* 🟦 Línea Dominante: Reitero Acumulado */}
            <Line 
              type="monotone" 
              dataKey="Reitero Acumulado" 
              stroke="#2563eb" 
              strokeWidth={3}
              dot={{ r: 3, strokeWidth: 1, fill: '#2563eb' }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            >
              {/* 🎯 ETIQUETAS SOBRE CADA PUNTO DE LA LÍNEA ACUMULADA */}
              <LabelList 
                dataKey="Reitero Acumulado" 
                position="top" 
                dy={-10}           
                fill="#1e3a8a" // Un tono azul un poco más oscuro para que resalte limpio
                fontSize={9} 
                fontWeight={700}
                formatter={(value) => `${value}%`}
              />
            </Line>

            {/* 🟨 Línea Discreta: Reitero Diario */}
            <Line 
              type="monotone" 
              dataKey="Reitero Diario" 
              stroke="#94a3b8" 
              strokeWidth={1.2}
              strokeDasharray="4 4"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}