import { useState, useEffect } from 'react';

export function useDashboardState() {
  const [activeTab, setActiveTab] = useState('PRODUCTIVIDAD');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [reiteroData, setReiteroData] = useState(null);
  const [loadingReitero, setLoadingReitero] = useState(false);
  const [reintentandoReitero, setReintentandoReitero] = useState(false);
  const [reintentandoInforme, setReintentandoInforme] = useState(false);
  const [reiteroError, setReiteroError] = useState(null);
  // 🔁 Contador manual: al incrementarlo, el efecto de carga de Reitero se
  // vuelve a ejecutar con LOS MISMOS filtros actuales (no hace falta que el
  // usuario cambie algo y lo vuelva a cambiar para forzar un nuevo intento).
  const [reiteroRetryTick, setReiteroRetryTick] = useState(0);

  const [selectedMesReitero, setSelectedMesReitero] = useState('');
  const [selectedDeptoReitero, setSelectedDeptoReitero] = useState('');
  const [visionCliente, setVisionCliente] = useState(true);
  const [visionTerreno, setVisionTerreno] = useState(false);
  const [diaInicioReitero, setDiaInicioReitero] = useState(null);
  const [diaFinReitero, setDiaFinReitero] = useState(null);

  const [selectedMes, setSelectedMes] = useState('');
  const [selectedDepto, setSelectedDepto] = useState('');
  const [selectedTecnico, setSelectedTecnico] = useState(null);
  const [selectedTipoOrden, setSelectedTipoOrden] = useState([]);
  const [selectedTipoDia, setSelectedTipoDia] = useState('');
  const [diaInicio, setDiaInicio] = useState(1);
  const [diaFin, setDiaFin] = useState(31);

  const apiBaseUrl = window.location.hostname.includes('devtunnels.ms')
    ? 'https://fs9xp008-8000.use.devtunnels.ms'
    : 'http://localhost:8000';

  useEffect(() => {
    const controller = new AbortController();

    async function cargarInicial() {
      setReintentandoInforme(false);
      try {
        const respuesta = await fetchConReintentosConAviso(
          `${apiBaseUrl}/api/informe`,
          {}, 2, 1000,
          () => { if (!controller.signal.aborted) setReintentandoInforme(true); },
          70000,
          controller.signal
        );
        const resData = await respuesta.json();
        if (controller.signal.aborted) return;

        setData(resData);
        if (resData.filtros_disponibles?.meses?.length > 0) {
          const primerMes = resData.filtros_disponibles.meses[0];
          setSelectedMes(primerMes);
          setSelectedMesReitero(primerMes);

          const infoMes = resData?.filtros_disponibles?.calendario_por_mes?.[primerMes] || [];
          if (infoMes.length > 0) {
            setDiaInicio(infoMes[0].Dia_Del_Mes);
            setDiaFin(infoMes[infoMes.length - 1].Dia_Del_Mes);
            setDiaInicioReitero(infoMes[0].Dia_Del_Mes);
            setDiaFinReitero(infoMes[infoMes.length - 1].Dia_Del_Mes);
          }
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Error inicializando indicadores tras reintentos: ", err);
      } finally {
        if (!controller.signal.aborted) {
          setReintentandoInforme(false);
          setLoading(false);
        }
      }
    }

    cargarInicial();
    return () => controller.abort();
  }, [apiBaseUrl]);

  useEffect(() => {
    if (activeTab !== 'REITERO' || !diaInicioReitero || !diaFinReitero) return;

    const controller = new AbortController();
    setLoadingReitero(true);
    setReintentandoReitero(false);
    setReiteroError(null);

    let visionParam = undefined;
    if (visionCliente && !visionTerreno) visionParam = 'CLIENTE';
    if (!visionCliente && visionTerreno) visionParam = 'TERRENO';

    const queryParams = new URLSearchParams();
    if (selectedMesReitero) queryParams.append('mes', selectedMesReitero);
    if (selectedDeptoReitero) queryParams.append('departamento', selectedDeptoReitero);
    if (visionParam) queryParams.append('vision', visionParam);
    queryParams.append('dia_inicio', diaInicioReitero);
    queryParams.append('dia_fin', diaFinReitero);
    const mesSolicitado = selectedMesReitero;

    async function cargarReitero() {
      try {
        const respuesta = await fetchConReintentosConAviso(
          `${apiBaseUrl}/api/reitero?${queryParams.toString()}`,
          {},
          4,      // 🔧 subido de 3 a 4 reintentos
          800,    // 🔧 espera inicial un poco mayor
          () => { if (!controller.signal.aborted) setReintentandoReitero(true); },
          12000,  // 🔧 timeout por intento subido de 6s a 12s, más margen
          controller.signal
        );
        const resReitero = await respuesta.json();
        if (controller.signal.aborted) return;
        setReiteroData(resReitero);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Error en fetch de Reitero tras reintentos: ", err);
        setReiteroError(
          `No se pudo cargar la información para el filtro actual (${mesSolicitado || 'mes seleccionado'}). ` +
          `Los datos mostrados corresponden a la última consulta exitosa.`
        );
      } finally {
        if (!controller.signal.aborted) {
          setReintentandoReitero(false);
          setLoadingReitero(false);
        }
      }
    }

    cargarReitero();
    return () => controller.abort();
    // 👇 reiteroRetryTick entra como dependencia: al incrementarlo desde el
    // botón "Reintentar", este efecto se re-ejecuta con los MISMOS filtros.
  }, [activeTab, selectedMesReitero, selectedDeptoReitero, visionCliente, visionTerreno, diaInicioReitero, diaFinReitero, apiBaseUrl, reiteroRetryTick]);

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

  // 🔁 Función expuesta para el botón "Reintentar" en la UI
  const reintentarReitero = () => setReiteroRetryTick(t => t + 1);

  return {
    data,
    loading,
    reintentandoInforme,
    reiteroData,
    loadingReitero,
    reintentandoReitero,
    reiteroError,
    reintentarReitero,
    activeTab,
    setActiveTab,

    filtersProductividad: {
      selectedMes, selectedDepto, selectedTecnico, selectedTipoOrden, selectedTipoDia, diaInicio, diaFin
    },
    settersProductividad: {
      setSelectedDepto, setSelectedTecnico, setSelectedTipoOrden, setSelectedTipoDia, setDiaInicio, setDiaFin
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
      setVisionCliente: (valor) => { if (valor) { setVisionCliente(true); setVisionTerreno(false); } },
      setVisionTerreno: (valor) => { if (valor) { setVisionTerreno(true); setVisionCliente(false); } },
      setDiaInicio: setDiaInicioReitero,
      setDiaFin: setDiaFinReitero
    },
    actionsProductividad: {
      manejarCambioMes: manejarCambioMesProductividad,
      manejarClickDia: manejarClickDiaProductividad,
      seleccionarMesCompleto: seleccionarMesCompletoProductividad
    },
    actionsReitero: { manejarCambioMes: manejarCambioMesReitero }
  };
}

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

      const motivo = error.name === 'AbortError' ? `sin respuesta en ${timeoutMs / 1000}s` : (error.message || error);
      console.warn(`Intento ${intento} fallido (${motivo}). Reintentando en ${esperaMs}ms...`);

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