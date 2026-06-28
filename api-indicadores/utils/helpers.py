import pandas as pd

FESTIVOS = [
    "2025-10-13", "2025-11-03", "2025-03-17", "2025-12-08", "2025-12-25",
    "2026-01-01", "2026-01-12", "2026-03-23", "2026-04-02", "2026-04-03",
    "2026-05-01", "2026-05-25", "2026-06-15", "2026-06-22", "2026-07-20",
    "2026-08-07", "2026-08-17", "2026-10-12", "2026-11-02", "2026-11-16",
    "2026-12-08", "2026-12-25"
]

festivos_set = pd.to_datetime(FESTIVOS).date

MESES_ESPANOL = {
    "January": "Enero", "February": "Febrero", "March": "Marzo", "April": "Abril",
    "May": "Mayo", "June": "Junio", "July": "Julio", "August": "Agosto",
    "September": "Septiembre", "October": "Octubre", "November": "Noviembre", "December": "Diciembre"
}

mapa_iniciales = {
    "Monday": "L", "Tuesday": "M", "Wednesday": "M", "Thursday": "J", 
    "Friday": "V", "Saturday": "S", "Sunday": "D"
}