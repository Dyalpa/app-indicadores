import { useState, useEffect } from 'react';

export function useDashboardState() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedMes, setSelectedMes] = useState('');
  const [selectedDepto, setSelectedDepto] = useState('');
  const [selectedTecnico, setSelectedTecnico] = useState(null);
  const [selectedTipoOrden, setSelectedTipoOrden] = useState('');
  const [selectedTipoDia, setSelectedTipoDia] = useState('');

  const [diaInicio, setDiaInicio] = useState(1);
  const [diaFin, setDiaFin] = useState(31);
  const [rangoEnSeleccion, setRangoEnSeleccion] = useState(false); 

  useEffect(() => {
    const apiBaseUrl = window.location.hostname.includes('devtunnels.ms')
      ? 'https://fs9xp008-8000.use.devtunnels.ms'
      : 'http://localhost:8000';

    fetch(`${apiBaseUrl}/api/informe`)
      .then(res => res.json())
      .then(resData => {
        setData(resData);
        if (resData.filtros_disponibles?.meses?.length > 0) {
          const primerMes = resData.filtros_disponibles.meses[0];
          setSelectedMes(primerMes);
          
          const infoMes = resData?.filtros_disponibles?.calendario_por_mes?.[primerMes] || [];
          if (infoMes.length > 0) {
            setDiaInicio(infoMes[0].Dia_Del_Mes);
            setDiaFin(infoMes[infoMes.length - 1].Dia_Del_Mes);
          }
        }
        setLoading(false);
      })
      .catch(err => console.error("Error cargando la API: ", err));
  }, []);

  const resetearDiasPorMes = (mes) => {
    const infoMes = data?.filtros_disponibles?.calendario_por_mes?.[mes] || [];
    if (infoMes.length > 0) {
      setDiaInicio(infoMes[0].Dia_Del_Mes);
      setDiaFin(infoMes[infoMes.length - 1].Dia_Del_Mes);
    }
  };

  const manejarCambioMes = (mes) => {
    setSelectedMes(mes);
    setSelectedTecnico(null); 
    resetearDiasPorMes(mes);
  };

  const manejarClickDia = (dia) => {
    if (!rangoEnSeleccion) {
      setDiaInicio(dia);
      setDiaFin(dia);
      setRangoEnSeleccion(true);
    } else {
      if (dia < diaInicio) {
        setDiaInicio(dia);
        setDiaFin(dia);
      } else {
        setDiaFin(dia);
        setRangoEnSeleccion(false);
      }
    }
  };

  const seleccionarMesCompleto = () => {
    resetearDiasPorMes(selectedMes);
    setRangoEnSeleccion(false);
  };

  return {
    data, loading,
    filters: { selectedMes, selectedDepto, selectedTecnico, selectedTipoOrden, selectedTipoDia, diaInicio, diaFin },
    setters: { setSelectedDepto, setSelectedTecnico, setSelectedTipoOrden, setSelectedTipoDia },
    actions: { manejarCambioMes, manejarClickDia, seleccionarMesCompleto }
  };
}