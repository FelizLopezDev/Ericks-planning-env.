import React, { useMemo, useRef, useEffect } from 'react';
import { CalendarEvent } from '../types';
import {
  HOURS_START,
  HOURS_END,
  formatHourLabel,
  formatTimeRange,
  getWeekDays,
  formatDateKey,
} from '../utils/dateUtils';

interface WeeklyCalendarProps {
  monday: Date;
  events: CalendarEvent[];
  onSelectSlot: (dateKey: string, hour: number) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  weekRangeText?: string;
}

const ROW_HEIGHT = 64; // Altura en px por cada hora para claridad visual

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
  monday,
  events,
  onSelectSlot,
  onSelectEvent,
  onPrevWeek,
  onNextWeek,
  weekRangeText,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSwipeTime = useRef(0);
  const accumulatedDeltaX = useRef(0);
  const resetTimerRef = useRef<number | null>(null);

  const weekDays = useMemo(() => getWeekDays(monday), [monday]);

  // Lista de horas desde 5 AM hasta 10 PM (5 a 21 representan los bloques horarios)
  const hourSlots = useMemo(() => {
    const slots: number[] = [];
    for (let h = HOURS_START; h < HOURS_END; h++) {
      slots.push(h);
    }
    return slots;
  }, []);

  // Eventos organizados por dateKey para renderizado ágil
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const d of weekDays) {
      map.set(d.dateKey, []);
    }
    for (const ev of events) {
      if (map.has(ev.dateKey)) {
        map.get(ev.dateKey)!.push(ev);
      }
    }
    return map;
  }, [events, weekDays]);

  // Cálculo de la línea de tiempo actual (si estamos en la semana en curso)
  const todayKey = formatDateKey(new Date());
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const isTimeInRange = currentHour >= HOURS_START && currentHour < HOURS_END;
  const currentTimeTop = isTimeInRange
    ? (currentHour - HOURS_START + currentMinute / 60) * ROW_HEIGHT
    : null;

  // Detección de navegación entre semanas con swipe de dos dedos en trackpad de Mac
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // Comprobar si el gesto es principalmente horizontal (dos dedos en trackpad)
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 5) {
        // Prevenir la navegación atrás/adelante nativa de Safari/Chrome en macOS
        e.preventDefault();

        accumulatedDeltaX.current += e.deltaX;

        if (resetTimerRef.current) {
          window.clearTimeout(resetTimerRef.current);
        }
        resetTimerRef.current = window.setTimeout(() => {
          accumulatedDeltaX.current = 0;
        }, 180);

        const currentTime = Date.now();
        const SWIPE_THRESHOLD = 32;
        const SWIPE_COOLDOWN = 380; // Milisegundos de enfriamiento entre cambios de semana

        if (currentTime - lastSwipeTime.current > SWIPE_COOLDOWN) {
          if (accumulatedDeltaX.current > SWIPE_THRESHOLD) {
            // Deslizamiento de derecha a izquierda: avanzar a la siguiente semana
            onNextWeek();
            lastSwipeTime.current = currentTime;
            accumulatedDeltaX.current = 0;
          } else if (accumulatedDeltaX.current < -SWIPE_THRESHOLD) {
            // Deslizamiento de izquierda a derecha: retroceder a la semana anterior
            onPrevWeek();
            lastSwipeTime.current = currentTime;
            accumulatedDeltaX.current = 0;
          }
        }
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      el.removeEventListener('wheel', handleWheel);
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, [onPrevWeek, onNextWeek]);

  // Soporte adicional para swipe táctil en pantallas touch / móviles
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const diffX = touchEndX - touchStartX;
      const diffY = touchEndY - touchStartY;

      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 45) {
        if (diffX < 0) {
          onNextWeek();
        } else {
          onPrevWeek();
        }
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onPrevWeek, onNextWeek]);

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col min-h-0 bg-zinc-950 overflow-auto select-none"
    >
      <div className="min-w-[840px] flex flex-col flex-1">
        {/* Cabecera con los 7 días de la semana */}
        <div className="sticky top-0 z-20 grid grid-cols-[72px_repeat(7,1fr)] border-b border-zinc-800 bg-zinc-950">
          {/* Esquina superior izquierda fija con rango de fechas sutil */}
          <div className="p-2 border-r border-zinc-800 flex flex-col items-center justify-center text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
            <span>Hora</span>
            {weekRangeText && (
              <span className="text-[9px] text-zinc-400 font-normal lowercase tracking-normal truncate max-w-[64px]" title={weekRangeText}>
                {weekDays[0].monthName} {weekDays[0].date.getFullYear()}
              </span>
            )}
          </div>

          {/* Columnas de los 7 días (Lunes a Domingo) */}
          {weekDays.map((day) => (
            <div
              key={day.dateKey}
              className={`p-3 text-center border-r border-zinc-800/80 last:border-r-0 ${
                day.isToday ? 'bg-zinc-900/40' : ''
              }`}
            >
              <div className="text-xs font-medium text-zinc-400">
                {day.dayName}
              </div>
              <div
                className={`text-base font-semibold mt-0.5 inline-block tabular-nums ${
                  day.isToday
                    ? 'text-zinc-100 font-bold border-b-2 border-zinc-100 pb-0.5'
                    : 'text-zinc-300'
                }`}
              >
                {day.dayNumber} {day.monthName}
              </div>
            </div>
          ))}
        </div>

        {/* Matriz horaria: 5 AM a 10 PM */}
        <div className="grid grid-cols-[72px_repeat(7,1fr)] flex-1 relative">
          {/* Columna de etiquetas de horas */}
          <div className="border-r border-zinc-800 bg-zinc-950 select-none">
            {hourSlots.map((hour) => (
              <div
                key={`label-${hour}`}
                style={{ height: `${ROW_HEIGHT}px` }}
                className="pr-3 pt-1 text-right text-xs font-mono text-zinc-500 border-b border-zinc-800/40"
              >
                {formatHourLabel(hour)}
              </div>
            ))}
            {/* Etiqueta final de las 10 PM */}
            <div className="pr-3 pt-1 text-right text-xs font-mono text-zinc-500">
              {formatHourLabel(HOURS_END)}
            </div>
          </div>

          {/* 7 Columnas de días */}
          {weekDays.map((day) => {
            const dayEvents = eventsByDay.get(day.dateKey) || [];

            return (
              <div
                key={`col-${day.dateKey}`}
                className={`relative border-r border-zinc-800/60 last:border-r-0 ${
                  day.isToday ? 'bg-zinc-900/10' : ''
                }`}
              >
                {/* Cuadrícula de slots horarios clickeables para crear eventos */}
                {hourSlots.map((hour) => (
                  <div
                    key={`slot-${day.dateKey}-${hour}`}
                    style={{ height: `${ROW_HEIGHT}px` }}
                    onClick={() => onSelectSlot(day.dateKey, hour)}
                    className="border-b border-zinc-800/40 hover:bg-zinc-900/60 cursor-pointer transition-colors group relative"
                    title={`Crear evento el ${day.dayName} a las ${formatHourLabel(hour)}`}
                  >
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-zinc-500 font-mono absolute top-1 left-2 pointer-events-none">
                      + Evento
                    </span>
                  </div>
                ))}

                {/* Línea horizontal en tiempo real para el día de hoy */}
                {day.isToday && currentTimeTop !== null && (
                  <div
                    style={{ top: `${currentTimeTop}px` }}
                    className="absolute left-0 right-0 z-10 pointer-events-none flex items-center"
                  >
                    <div className="w-2 h-2 rounded-full bg-zinc-100 shadow-sm -ml-1" />
                    <div className="h-px bg-zinc-100/90 flex-1 shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
                  </div>
                )}

                {/* Renderizado de bloques de eventos */}
                {dayEvents.map((ev) => {
                  const startHoursVal = ev.startHour - HOURS_START + ev.startMinute / 60;
                  const durationHours =
                    ev.endHour - ev.startHour + (ev.endMinute - ev.startMinute) / 60;

                  const topPos = Math.max(0, startHoursVal * ROW_HEIGHT);
                  const eventHeight = Math.max(26, durationHours * ROW_HEIGHT - 3);

                  return (
                    <button
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(ev);
                      }}
                      style={{
                        top: `${topPos + 1}px`,
                        height: `${eventHeight}px`,
                      }}
                      className="absolute inset-x-1.5 z-10 flex flex-col justify-start rounded bg-zinc-900 hover:bg-zinc-850 border border-zinc-700/80 hover:border-zinc-500 text-left px-2.5 py-1.5 transition-all shadow-md group overflow-hidden focus:outline-none focus:ring-1 focus:ring-zinc-400"
                      title={`${ev.title} (${formatTimeRange(
                        ev.startHour,
                        ev.startMinute,
                        ev.endHour,
                        ev.endMinute
                      )}) - Haz clic para modificar o eliminar`}
                    >
                      <div className="text-xs font-medium text-zinc-100 truncate w-full group-hover:text-white">
                        {ev.title}
                      </div>
                      {eventHeight >= 42 && (
                        <div className="text-[11px] font-mono text-zinc-400 truncate mt-0.5">
                          {formatTimeRange(
                            ev.startHour,
                            ev.startMinute,
                            ev.endHour,
                            ev.endMinute
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
