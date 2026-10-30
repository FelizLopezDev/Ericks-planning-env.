export const HOURS_START = 5; // 5:00 AM
export const HOURS_END = 22; // 10:00 PM

export const DAY_NAMES = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

export const MONTH_NAMES_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

/**
 * Retorna la fecha normalizada al Lunes de la semana correspondiente
 */
export function getMonday(dateInput: Date): Date {
  const d = new Date(dateInput);
  const day = d.getDay(); // 0 es Domingo, 1 es Lunes
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Agrega semanas a una fecha dada
 */
export function addWeeks(date: Date, count: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + count * 7);
  return result;
}

/**
 * Formatea una fecha local en formato YYYY-MM-DD
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Retorna los 7 días de la semana a partir del Lunes
 */
export function getWeekDays(monday: Date): Array<{
  date: Date;
  dateKey: string;
  dayName: string;
  dayNumber: number;
  monthName: string;
  isToday: boolean;
}> {
  const todayKey = formatDateKey(new Date());

  return Array.from({ length: 7 }, (_, i) => {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    const dateKey = formatDateKey(current);

    return {
      date: current,
      dateKey,
      dayName: DAY_NAMES[i],
      dayNumber: current.getDate(),
      monthName: MONTH_NAMES_SHORT[current.getMonth()],
      isToday: dateKey === todayKey,
    };
  });
}

/**
 * Formatea el rango de fechas de la semana (ej. "27 oct – 2 nov 2026")
 */
export function formatWeekRange(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const startDay = monday.getDate();
  const startMonth = MONTH_NAMES_SHORT[monday.getMonth()];
  const startYear = monday.getFullYear();

  const endDay = sunday.getDate();
  const endMonth = MONTH_NAMES_SHORT[sunday.getMonth()];
  const endYear = sunday.getFullYear();

  if (startYear !== endYear) {
    return `${startDay} ${startMonth} ${startYear} – ${endDay} ${endMonth} ${endYear}`;
  }

  if (startMonth !== endMonth) {
    return `${startDay} ${startMonth} – ${endDay} ${endMonth} ${startYear}`;
  }

  return `${startDay} – ${endDay} ${startMonth} ${startYear}`;
}

/**
 * Formatea una hora en formato de 12 horas legible (ej. "5:00 AM", "12:00 PM", "10:00 PM")
 */
export function formatHourLabel(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour} ${period}`;
}

/**
 * Formatea hora y minutos completos (ej. "09:30 AM" o "2:15 PM")
 */
export function formatTimeRange(
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number
): string {
  const formatSingle = (h: number, m: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    const displayMinute = m === 0 ? '' : `:${String(m).padStart(2, '0')}`;
    return `${displayHour}${displayMinute} ${period}`;
  };

  return `${formatSingle(startHour, startMinute)} – ${formatSingle(endHour, endMinute)}`;
}

/**
 * Lista de horas desde 5:00 AM hasta 10:00 PM (inclusive)
 */
export const SCHEDULE_HOURS = Array.from(
  { length: HOURS_END - HOURS_START + 1 },
  (_, i) => HOURS_START + i
);
