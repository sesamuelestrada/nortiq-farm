# Comandos de Voz — Synopsis Farm PoC

Presiona el botón verde flotante (esquina inferior derecha), habla el comando, suelta.

---

## Consultas de Activos

| Comando | Resultado |
|---------|-----------|
| "¿Qué activos están en mantenimiento?" | Tarjetas de todos los activos en mantenimiento |
| "¿Cuántos tractores están operativos?" | Tarjetas de tractores operativos |
| "Muéstrame el Tractor JD 6155M" | Tarjeta del activo con su estatus y ubicación |
| "¿Qué activos están fuera de servicio?" | Tarjetas de activos fuera de servicio |

---

## Historial de Mantenimiento

| Comando | Resultado |
|---------|-----------|
| "Dame el historial del Tractor JD 6155M" | Tabla con todos sus mantenimientos |
| "¿Qué mantenimientos correctivos se han hecho?" | Tabla de mantenimientos correctivos |
| "Muéstrame los últimos 5 mantenimientos" | Tabla con los más recientes |

---

## Analítica e Inteligencia

| Comando | Resultado |
|---------|-----------|
| "¿Cuáles son los tipos de mantenimiento más comunes?" | Gráfica de dona con distribución |
| "¿Cuánto hemos gastado en mantenimiento por equipo?" | Gráfica de barras de costos |
| "Dame una gráfica de los mantenimientos por mes" | Tendencia de los últimos 6 meses |
| "¿Qué equipos necesitan servicio pronto?" | Tabla con fechas en rojo (vencidos) y ámbar (próximos) |

---

## Registro de Mantenimiento (escribe en la BD)

| Comando | Resultado |
|---------|-----------|
| "Registra que Carlos cambió el filtro de aceite del Tractor JD 6155M, tipo preventivo, 2 horas" | Tarjeta verde de confirmación |
| "Anota que se reparó la correa de transmisión del camión norte, fue correctivo" | Confirmación del registro |
| "Registra una inspección del Tractor Kubota, la hizo Pedro, tomó 1 hora" | Confirmación con datos del técnico |

---

## Alta de Activos (crea activo nuevo)

| Comando | Resultado |
|---------|-----------|
| "Da de alta un tractor New Holland T7 en Potrero Sur" | Tarjeta del activo creado + QR inline |
| "Agrega una rastra de discos marca John Deere al sistema" | Tarjeta de implemento creado + QR |
| "Da de alta un camión Kenworth T370, año 2022, en el área de carga" | Activo con todos los datos |

---

## Cambio de Estatus (modifica activo)

| Comando | Resultado |
|---------|-----------|
| "El Tractor JD 6155M ya está operativo" | Badge verde: Operativo |
| "El camión norte entró a mantenimiento" | Badge amarillo: En mantenimiento |
| "La rastra de discos está fuera de servicio" | Badge rojo: Fuera de servicio |

---

## Navegación

| Comando | Resultado |
|---------|-----------|
| "Llévame a los activos" | Navega a /assets |
| "Ve al dashboard" | Navega al panel principal |
| "Muéstrame los mantenimientos" | Navega a /maintenance |
| "Quiero agregar un activo" | Navega al formulario de alta |

---

## Comandos Combinados (más impresionantes para demo)

Estos demuestran que la IA entiende contexto complejo:

- **"¿Cuál es el equipo con más fallas y cuánto ha costado arreglarlo?"**
  → IA consulta analytics + costos y da conclusión en texto

- **"Registra que Juan cambió el aceite y el filtro de aire del JD 6155M, preventivo, 3 horas, costo 850 pesos, próximo servicio en 3 meses"**
  → Un solo comando llena todos los campos del log

- **"¿Qué equipo debería revisar primero esta semana?"**
  → IA consulta activos con servicio próximo y da recomendación

---

## Notas para la Demo

- El asistente responde en **español mexicano**
- Si hay ambigüedad, ejecuta lo más probable y lo menciona
- Los datos escritos (logs, activos) persisten en Supabase en tiempo real
- El dashboard se actualiza automáticamente via Realtime cuando se crea un activo
