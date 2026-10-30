import React, { useState, useEffect } from 'react';
import { X, Trash2, Repeat } from 'lucide-react';
import { CalendarEvent, EventRecurrence } from '../types';
import {
  HOURS_START,
  HOURS_END,
  formatHourLabel,
} from '../utils/dateUtils';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventData: {
    id?: string;
    seriesId?: string;
    title: string;
    dateKey: string;
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
    recurrence?: EventRecurrence;
  }) => void;
  onDelete?: (id: string, deleteEntireSeries?: boolean) => void;
  initialEvent?: CalendarEvent | null;
  defaultDateKey: string;
  defaultStartHour: number;
  weekDays: Array<{ dateKey: string; dayName: string; dayNumber: number; monthName: string }>;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialEvent,
  defaultDateKey,
  defaultStartHour,
  weekDays,
}) => {
  const [title, setTitle] = useState('');
  const [dateKey, setDateKey] = useState(defaultDateKey);
  const [startHour, setStartHour] = useState(defaultStartHour);
  const [startMinute, setStartMinute] = useState(0);
  const [endHour, setEndHour] = useState(Math.min(defaultStartHour + 1, HOURS_END));
  const [endMinute, setEndMinute] = useState(0);
  const [recurrence, setRecurrence] = useState<EventRecurrence>('none');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialEvent) {
      setTitle(initialEvent.title);
      setDateKey(initialEvent.dateKey);
      setStartHour(initialEvent.startHour);
      setStartMinute(initialEvent.startMinute);
      setEndHour(initialEvent.endHour);
      setEndMinute(initialEvent.endMinute);
      setRecurrence(initialEvent.recurrence || 'none');
    } else {
      setTitle('');
      setDateKey(defaultDateKey);
      setStartHour(defaultStartHour);
      setStartMinute(0);
      setEndHour(Math.min(defaultStartHour + 1, HOURS_END));
      setEndMinute(0);
      setRecurrence('none');
    }
    setError(null);
  }, [initialEvent, defaultDateKey, defaultStartHour, isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('Por favor introduce el nombre del evento');
      return;
    }

    const startTotal = startHour * 60 + startMinute;
    const endTotal = endHour * 60 + endMinute;

    if (endTotal <= startTotal) {
      setError('La hora de finalización debe ser posterior a la de inicio');
      return;
    }

    onSave({
      id: initialEvent ? initialEvent.id : undefined,
      seriesId: initialEvent ? initialEvent.seriesId : undefined,
      title: cleanTitle,
      dateKey,
      startHour,
      startMinute,
      endHour,
      endMinute,
      recurrence,
    });
    onClose();
  };

  const isEditing = Boolean(initialEvent);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
      <div
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl p-5"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-100">
            {isEditing ? 'Modificar evento' : 'Nuevo evento'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Nombre del evento */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Nombre del evento
            </label>
            <input
              type="text"
              autoFocus
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Ej. Pre-cálculo, Laboratorio de algoritmos"
              className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
            />
          </div>

          {/* Selección de día */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Día de la semana
            </label>
            <select
              value={dateKey}
              onChange={(e) => setDateKey(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-md text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors"
            >
              {weekDays.map((d) => (
                <option key={d.dateKey} value={d.dateKey}>
                  {d.dayName} {d.dayNumber} {d.monthName}
                </option>
              ))}
            </select>
          </div>

          {/* Horas: Inicio y Fin */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Hora de inicio
              </label>
              <div className="flex gap-1.5">
                <select
                  value={startHour}
                  onChange={(e) => setStartHour(Number(e.target.value))}
                  className="w-full px-2 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-md text-zinc-100 focus:outline-none focus:border-zinc-500"
                >
                  {Array.from({ length: HOURS_END - HOURS_START }, (_, i) => HOURS_START + i).map(
                    (h) => (
                      <option key={`start-${h}`} value={h}>
                        {formatHourLabel(h)}
                      </option>
                    )
                  )}
                </select>

                <select
                  value={startMinute}
                  onChange={(e) => setStartMinute(Number(e.target.value))}
                  className="w-20 px-2 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-md text-zinc-100 font-mono focus:outline-none focus:border-zinc-500"
                >
                  <option value={0}>:00</option>
                  <option value={15}>:15</option>
                  <option value={30}>:30</option>
                  <option value={45}>:45</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Hora de finalización
              </label>
              <div className="flex gap-1.5">
                <select
                  value={endHour}
                  onChange={(e) => setEndHour(Number(e.target.value))}
                  className="w-full px-2 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-md text-zinc-100 focus:outline-none focus:border-zinc-500"
                >
                  {Array.from(
                    { length: HOURS_END - HOURS_START + 1 },
                    (_, i) => HOURS_START + i
                  ).map((h) => (
                    <option key={`end-${h}`} value={h}>
                      {formatHourLabel(h)}
                    </option>
                  ))}
                </select>

                <select
                  value={endMinute}
                  onChange={(e) => setEndMinute(Number(e.target.value))}
                  className="w-20 px-2 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-md text-zinc-100 font-mono focus:outline-none focus:border-zinc-500"
                >
                  <option value={0}>:00</option>
                  <option value={15}>:15</option>
                  <option value={30}>:30</option>
                  <option value={45}>:45</option>
                </select>
              </div>
            </div>
          </div>

          {/* Selector de repetición */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-300 mb-1.5">
              <Repeat className="w-3.5 h-3.5 text-zinc-400" />
              <span>Repetir evento</span>
            </label>
            <select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as EventRecurrence)}
              className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-md text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors"
            >
              <option value="none">No repetir</option>
              <option value="daily">Cada día</option>
              <option value="weekly">Cada semana el mismo día</option>
            </select>
          </div>

          {error && (
            <p className="text-xs text-rose-400 mt-1">{error}</p>
          )}

          {/* Acciones del formulario */}
          <div className="flex items-center justify-between pt-3 border-t border-zinc-800 mt-5">
            {isEditing && onDelete ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (initialEvent) {
                      onDelete(initialEvent.id, false);
                      onClose();
                    }
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-md transition-colors"
                  title="Eliminar este evento"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>

                {initialEvent?.seriesId && (
                  <button
                    type="button"
                    onClick={() => {
                      if (initialEvent) {
                        onDelete(initialEvent.id, true);
                        onClose();
                      }
                    }}
                    className="text-[11px] text-zinc-500 hover:text-rose-400 underline transition-colors"
                    title="Eliminar todas las repeticiones de la serie"
                  >
                    (Toda la serie)
                  </button>
                )}
              </div>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-medium text-zinc-900 bg-zinc-100 hover:bg-white rounded-md transition-colors shadow-sm"
              >
                {isEditing ? 'Actualizar' : 'Crear evento'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
