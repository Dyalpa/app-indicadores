import { useState, useEffect } from 'react';

export function useDashboardState() {
  const [activeTab, setActiveTab] = useState('PRODUCTIVIDAD');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // 🔄 Estados de Reitero 100% aislados con valores iniciales limpios
  const [reiteroData, setReiteroData] = useState(null);
  const [loadingReitero, setLoadingReitero] = useState(false);

  const [selectedMesReitero, setSelectedMesReitero] = useState('');
  const [selectedDeptoReitero, setSelectedDeptoReitero] = useState('');
  const [visionCliente, setVisionCliente] = useState(true);
  const [visionTerreno, setVisionTerreno] = useState(false);
  const [diaInicioReitero, setDiaInicioReitero] = useState(null); // 👈 Empezamos en null para saber si ha sido inicializado
  const [diaFinReitero, setDiaFinReitero] = useState(null);

  // 📈 Estados de Productividad
  const [selectedMes, setSelectedMes] = useState('');
  const [selectedDepto, setSelectedDepto] = useState('');
  const [selectedTecnico, setSelectedTecnico] = useState(null);
  const [selectedTipoOrden, setSelectedTipoOrden] = useState('');
  const [selectedTipoDia, setSelectedTipoDia] = useState('');
  const [diaInicio, setDiaInicio] = useState(1);
  const [diaFin, setDiaFin] = useState(31);

  const apiBaseUrl = window.location.hostname.includes('devtunnels.ms')
    ? 'https://fs9xp008-8000.use.devtunnels.ms'
    : 'http://localhost:8000';

  // 📊 EFECTO 1: Carga inicial de catálogos generales
  useEffect(() => {
    fetch(`${apiBaseUrl}/api/informe`)
      .then(res => res.json())
      .then(resData => {
        setData(resData);
        if (resData.filtros_disponibles?.meses?.length > 0) {
          const primerMes = resData.filtros_disponibles.meses[0];
          setSelectedMes(primerMes);
          setSelectedMesReitero(primerMes); // Seteamos el mes por defecto en Reitero

          const infoMes = resData?.filtros_disponibles?.calendario_por_mes?.[primerMes] || [];
          if (infoMes.length > 0) {
            setDiaInicio(infoMes[0].Dia_Del_Mes);
            setDiaFin(infoMes[infoMes.length - 1].Dia_Del_Mes);
            
            // 🚀 Inicialización segura para Reitero sin colisionar
            setDiaInicioReitero(infoMes[0].Dia_Del_Mes);
            setDiaFinReitero(infoMes[infoMes.length - 1].Dia_Del_Mes);
          }
        }
        setLoading(false);
      })
      .catch(err => console.error("Error inicializando indicadores: ", err));
  }, [apiBaseUrl]);

  // ========================================================
  // 🌊 EFECTO 2: CARGA REACTIVA DE REITERO (CON CONDICIONAL SEGURO)
  // ========================================================
  useEffect(() => {
    // 🛑 Si la pestaña no es Reitero o aún no se han inicializado los rangos de días, frenamos la petición ficticia
    if (activeTab !== 'REITERO' || !diaInicioReitero || !diaFinReitero) return;

    setLoadingReitero(true);

    let visionParam = undefined;
    if (visionCliente && !visionTerreno) visionParam = 'CLIENTE';
    if (!visionCliente && visionTerreno) visionParam = 'TERRENO';

    const queryParams = new URLSearchParams();
    if (selectedMesReitero) queryParams.append('mes', selectedMesReitero);
    if (selectedDeptoReitero) queryParams.append('departamento', selectedDeptoReitero);
    if (visionParam) queryParams.append('vision', visionParam);
    queryParams.append('dia_inicio', diaInicioReitero);
    queryParams.append('dia_fin', diaFinReitero);

    fetch(`${apiBaseUrl}/api/reitero?${queryParams.toString()}`)
      .then(res => res.json())
      .then(resReitero => {
        setReiteroData(resReitero);
        setLoadingReitero(false);
      })
      .catch(err => {
        console.error("Error en fetch de Reitero: ", err);
        LoadingReitero(false);
      });
  }, [activeTab, selectedMesReitero, selectedDeptoReitero, visionCliente, visionTerreno, diaInicioReitero, diaFinReitero, apiBaseUrl]);

  // Manejadores de cambios de mes individuales
  const manejarCambioMesProductividad = (mes) => {
    setSelectedMes(mes);
    setSelectedTecnico(null);
    const infoMes = data?.filtros_disponibles?.calendario_por_mes?.[mes] || [];
    if (infoMes.length > 0) {
      setDiaInicio(infoMes[0].Dia_Del_Mes);
      setDiaFin(infoMes[infoMes.length - 1].Dia_Del_Mes);
    }
  };

  const manejarCambioMesReitero = (mes) => {
    setSelectedMesReitero(mes);
    const fuente = reiteroData?.filtros_disponibles || data?.filtros_disponibles;
    const infoMes = fuente?.calendario_por_mes?.[mes] || [];
    if (infoMes.length > 0) {
      setDiaInicioReitero(infoMes[0].Dia_Del_Mes);
      setDiaFinReitero(infoMes[infoMes.length - 1].Dia_Del_Mes);
    }
  };

  // ⚡ LÓGICA DE CLICS RESTAURADA PARA PRODUCTIVIDAD
  const manejarClickDiaProductividad = (diaNum) => {
    if (diaInicio === diaFin && diaNum > diaInicio) {
      setDiaFin(diaNum);
    } else {
      setDiaInicio(diaNum);
      setDiaFin(diaNum);
    }
  };

  const seleccionarMesCompletoProductividad = () => {
    const infoMes = data?.filtros_disponibles?.calendario_por_mes?.[selectedMes] || [];
    if (infoMes.length > 0) {
      setDiaInicio(infoMes[0].Dia_Del_Mes);
      setDiaFin(infoMes[infoMes.length - 1].Dia_Del_Mes);
    }
  };

  return {
    data, 
    loading,
    reiteroData,       
    loadingReitero,    
    activeTab,         
    setActiveTab,      
    filtersProductividad: { 
      selectedMes, selectedDepto, selectedTecnico, selectedTipoOrden, selectedTipoDia, diaInicio, diaFin 
    },
    filtersReitero: { 
      selectedMes: selectedMesReitero, 
      selectedDepto: selectedDeptoReitero, 
      visionCliente, 
      visionTerreno, 
      diaInicio: diaInicioReitero || 1, 
      diaFin: diaFinReitero || 30 
    },
    settersReitero: {
      setSelectedDepto: setSelectedDeptoReitero,
      setVisionCliente,
      setVisionTerreno,
      setDiaInicio: setDiaInicioReitero,
      setDiaFin: setDiaFinReitero
    },
    actionsProductividad: { 
      manejarCambioMes: manejarCambioMesProductividad,
      manejarClickDia: manejarClickDiaProductividad, // 👈 Inyectado de nuevo para revivir los clics
      seleccionarMesCompleto: seleccionarMesCompletoProductividad // 👈 Inyectado de nuevo para revivir el botón de mes completo
    },
    actionsReitero: { manejarCambioMes: manejarCambioMesReitero }
  };
}