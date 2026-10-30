import { CalendarEvent, TermFolder, AcademicNote, EventRecurrence } from '../types';
import { cleanAssistantText } from './cleanText';

const OPEN = '<<ACCIONES>>';
const CLOSE = '<<FIN>>';

export interface ExtractedActions {
  text: string;        // respuesta visible, sin el bloque técnico
  actions: unknown[];  // acciones sin validar (máximo 10)
  hadBlock: boolean;
  invalid: boolean;    // había bloque pero no se pudo leer
}

export function extractActions(raw: string): ExtractedActions {
  const src = raw || '';
  const start = src.indexOf(OPEN);
  if (start === -1) return { text: src.trim(), actions: [], hadBlock: false, invalid: false };
  const end = src.indexOf(CLOSE, start + OPEN.length);
  const before = src.slice(0, start);
  const after = end === -1 ? '' : src.slice(end + CLOSE.length);
  const text = (before + after).trim();
  if (end === -1) return { text, actions: [], hadBlock: true, invalid: true };
  const body = src.slice(start + OPEN.length, end).trim()
    .replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    const parsed = JSON.parse(body);
    const list = Array.isArray(parsed) ? parsed : [parsed];
    return { text, actions: list.slice(0, 10), hadBlock: true, invalid: false };
  } catch {
    return { text, actions: [], hadBlock: true, invalid: true };
  }
}

// Evita que el contenido de una nota o evento inyecte acciones falsas en el contexto.
export function stripActionMarkers(s: string): string {
  return (s || '').split(OPEN).join('').split(CLOSE).join('');
}

export type ActionStatus = 'done' | 'pending' | 'cancelled' | 'undone' | 'failed';

export interface BaseActionItem {
  id: string; // ID único de la acción en la UI
  tipo: 'crear_evento' | 'eliminar_evento' | 'crear_nota' | 'agregar_a_nota' | 'desconocido';
  estado: ActionStatus;
  etiqueta: string;
  detalle?: string;
  conflicto?: string;
  error?: string;
}

export interface CrearEventoActionData extends BaseActionItem {
  tipo: 'crear_evento';
  createdEventId?: string;
  createdSeriesId?: string;
  isSeries?: boolean;
  eventPayload: {
    title: string;
    dateKey: string;
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
    recurrence: EventRecurrence;
  };
}

export interface EliminarEventoActionData extends BaseActionItem {
  tipo: 'eliminar_evento';
  targetEventId?: string;
  targetSeriesId?: string;
  deleteEntireSeries?: boolean;
  eventInfo: {
    title: string;
    dateKey: string;
    timeRange: string;
    count?: number;
  };
}

export interface CrearNotaActionData extends BaseActionItem {
  tipo: 'crear_nota';
  createdNoteId?: string;
  notePayload: {
    termId: string;
    subjectId: string;
    termName: string;
    subjectName: string;
    title: string;
    content: string;
  };
}

export interface AgregarNotaActionData extends BaseActionItem {
  tipo: 'agregar_a_nota';
  targetNoteId: string;
  noteTitle: string;
  previousContent: string;
  appendedContent: string;
}

export interface ErrorActionData extends BaseActionItem {
  tipo: 'desconocido';
}

export type AssistantActionItem =
  | CrearEventoActionData
  | EliminarEventoActionData
  | CrearNotaActionData
  | AgregarNotaActionData
  | ErrorActionData;

// Normalización para comparaciones sin acentos y en minúsculas
export function normalizeText(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Redondear minutos al múltiplo de 15 más cercano (0, 15, 30, 45)
export function roundTo15(minute: number): number {
  const rounded = Math.round(minute / 15) * 15;
  return rounded === 60 ? 45 : rounded;
}

function parseTime(timeStr: string): { hour: number; minute: number } | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute: roundTo15(minute) };
}

function isValidDateKey(dateKey: string): boolean {
  if (!dateKey || typeof dateKey !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false;
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}

// Validador y preparador de acciones puras
export function validateAssistantAction(
  rawAction: any,
  context: {
    events: CalendarEvent[];
    terms: TermFolder[];
    notes: AcademicNote[];
    currentSelection?: {
      termId: string | null;
      subjectId: string | null;
      noteId: string | null;
    };
  }
): AssistantActionItem {
  const actionId = `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  if (!rawAction || typeof rawAction !== 'object') {
    return {
      id: actionId,
      tipo: 'desconocido',
      estado: 'failed',
      etiqueta: 'Acción no válida',
      error: 'El formato de la acción no es válido.',
    };
  }

  const tipo = rawAction.tipo;

  // 1. CREAR EVENTO
  if (tipo === 'crear_evento') {
    const rawTitle = typeof rawAction.titulo === 'string' ? rawAction.titulo.trim() : '';
    const title = cleanAssistantText(rawTitle).slice(0, 80) || 'Nuevo evento';

    const dateKey = typeof rawAction.fecha === 'string' ? rawAction.fecha.trim() : '';
    if (!isValidDateKey(dateKey)) {
      return {
        id: actionId,
        tipo: 'crear_evento',
        estado: 'failed',
        etiqueta: `Crear evento "${title}"`,
        error: `Fecha no válida (${dateKey || 'vacía'}). Debe ser YYYY-MM-DD.`,
        eventPayload: {
          title,
          dateKey: '',
          startHour: 9,
          startMinute: 0,
          endHour: 10,
          endMinute: 0,
          recurrence: 'none',
        },
      };
    }

    const startParsed = parseTime(rawAction.inicio);
    if (!startParsed || startParsed.hour < 5 || startParsed.hour > 21) {
      return {
        id: actionId,
        tipo: 'crear_evento',
        estado: 'failed',
        etiqueta: `Crear evento "${title}"`,
        error: `Hora de inicio no válida (${rawAction.inicio || 'vacía'}). Rango permitido: 05:00 a 21:00.`,
        eventPayload: {
          title,
          dateKey,
          startHour: 9,
          startMinute: 0,
          endHour: 10,
          endMinute: 0,
          recurrence: 'none',
        },
      };
    }

    let endParsed = parseTime(rawAction.fin);
    if (!endParsed) {
      // Por defecto inicio + 1 hora
      endParsed = {
        hour: Math.min(startParsed.hour + 1, 22),
        minute: startParsed.minute,
      };
    }

    const startVal = startParsed.hour * 60 + startParsed.minute;
    const endVal = endParsed.hour * 60 + endParsed.minute;

    if (endVal <= startVal || endParsed.hour > 22 || (endParsed.hour === 22 && endParsed.minute > 0)) {
      endParsed = {
        hour: Math.min(startParsed.hour + 1, 22),
        minute: startParsed.minute,
      };
    }

    let recurrence: EventRecurrence = 'none';
    if (rawAction.repeticion === 'diaria' || rawAction.repeticion === 'daily') {
      recurrence = 'daily';
    } else if (rawAction.repeticion === 'semanal' || rawAction.repeticion === 'weekly') {
      recurrence = 'weekly';
    }

    // Comprobación de cruces de horario
    const conflicts = context.events.filter((e) => {
      if (e.dateKey !== dateKey) return false;
      const eStart = e.startHour * 60 + e.startMinute;
      const eEnd = e.endHour * 60 + e.endMinute;
      return Math.max(startVal, eStart) < Math.min(endVal, eEnd);
    });

    const conflictoMsg =
      conflicts.length > 0
        ? `Se cruza con: ${conflicts.map((c) => `"${c.title}" (${c.startHour}:${String(c.startMinute).padStart(2, '0')})`).join(', ')}`
        : undefined;

    const startStr = `${startParsed.hour}:${String(startParsed.minute).padStart(2, '0')}`;
    const endStr = `${endParsed.hour}:${String(endParsed.minute).padStart(2, '0')}`;
    const recurrenceStr = recurrence === 'daily' ? ' (Diario)' : recurrence === 'weekly' ? ' (Semanal)' : '';

    return {
      id: actionId,
      tipo: 'crear_evento',
      estado: 'done',
      etiqueta: `Evento creado: ${title}`,
      detalle: `${dateKey} · ${startStr} - ${endStr}${recurrenceStr}`,
      conflicto: conflictoMsg,
      eventPayload: {
        title,
        dateKey,
        startHour: startParsed.hour,
        startMinute: startParsed.minute,
        endHour: endParsed.hour,
        endMinute: endParsed.minute,
        recurrence,
      },
    };
  }

  // 2. ELIMINAR EVENTO (Siempre requiere confirmación: estado 'pending')
  if (tipo === 'eliminar_evento') {
    const rawId = typeof rawAction.id === 'string' ? rawAction.id.trim() : '';
    const rawSeries = typeof rawAction.serie === 'string' ? rawAction.serie.trim() : '';
    const rawFecha = typeof rawAction.fecha === 'string' ? rawAction.fecha.trim() : '';
    const todaLaSerie = Boolean(rawAction.toda_la_serie);

    let foundEvent: CalendarEvent | undefined;
    let seriesCount = 0;

    if (rawId) {
      foundEvent = context.events.find((e) => e.id === rawId);
    } else if (rawSeries) {
      const seriesEvents = context.events.filter((e) => e.seriesId === rawSeries);
      seriesCount = seriesEvents.length;
      if (rawFecha) {
        foundEvent = seriesEvents.find((e) => e.dateKey === rawFecha);
      } else {
        foundEvent = seriesEvents[0];
      }
    }

    if (!foundEvent) {
      return {
        id: actionId,
        tipo: 'eliminar_evento',
        estado: 'failed',
        etiqueta: 'Eliminar evento',
        error: 'No encontré ese evento en el calendario.',
        eventInfo: {
          title: 'Evento no encontrado',
          dateKey: rawFecha || '',
          timeRange: '',
        },
      };
    }

    const startStr = `${foundEvent.startHour}:${String(foundEvent.startMinute).padStart(2, '0')}`;
    const endStr = `${foundEvent.endHour}:${String(foundEvent.endMinute).padStart(2, '0')}`;

    const isFullSeries = (todaLaSerie || (Boolean(rawSeries) && !rawFecha)) && Boolean(foundEvent.seriesId);
    const countToDelete = isFullSeries
      ? context.events.filter((e) => e.seriesId === foundEvent!.seriesId).length
      : 1;

    return {
      id: actionId,
      tipo: 'eliminar_evento',
      estado: 'pending',
      etiqueta: isFullSeries
        ? `¿Eliminar toda la serie (${countToDelete} eventos)?`
        : `¿Eliminar "${foundEvent.title}"?`,
      detalle: `${foundEvent.title} · ${foundEvent.dateKey} (${startStr} - ${endStr})${isFullSeries ? ` · ${countToDelete} fechas` : ''}`,
      targetEventId: foundEvent.id,
      targetSeriesId: foundEvent.seriesId,
      deleteEntireSeries: isFullSeries,
      eventInfo: {
        title: foundEvent.title,
        dateKey: foundEvent.dateKey,
        timeRange: `${startStr} - ${endStr}`,
        count: countToDelete,
      },
    };
  }

  // 3. CREAR NOTA ACADÉMICA
  if (tipo === 'crear_nota') {
    const rawMateria = typeof rawAction.materia === 'string' ? rawAction.materia.trim() : '';
    const normMateria = normalizeText(rawMateria);

    let targetTerm: TermFolder | undefined;
    let targetSubject: { id: string; name: string } | undefined;

    // Buscar materia existente en los cuatrimestres
    if (normMateria) {
      for (const term of context.terms) {
        for (const subj of term.subjects) {
          if (normalizeText(subj.name) === normMateria) {
            targetTerm = term;
            targetSubject = subj;
            break;
          }
        }
        if (targetSubject) break;
      }

      // Si aún no se encuentra, intentar coincidencia parcial
      if (!targetSubject) {
        for (const term of context.terms) {
          for (const subj of term.subjects) {
            if (normalizeText(subj.name).includes(normMateria) || normMateria.includes(normalizeText(subj.name))) {
              targetTerm = term;
              targetSubject = subj;
              break;
            }
          }
          if (targetSubject) break;
        }
      }
    }

    // Si no se especificó materia o no se encontró, usar la carpeta activa en el cuaderno si existe
    if (!targetSubject && context.currentSelection?.subjectId) {
      for (const term of context.terms) {
        const foundSubj = term.subjects.find((s) => s.id === context.currentSelection!.subjectId);
        if (foundSubj) {
          targetTerm = term;
          targetSubject = foundSubj;
          break;
        }
      }
    }

    if (!targetSubject || !targetTerm) {
      const allSubjects = context.terms
        .flatMap((t) => t.subjects.map((s) => `"${s.name}" (${t.name})`))
        .join(', ');
      return {
        id: actionId,
        tipo: 'crear_nota',
        estado: 'failed',
        etiqueta: `Crear nota "${rawAction.titulo || 'Nueva nota'}"`,
        error: `No encontré la materia "${rawMateria || 'no especificada'}". Materias disponibles: ${allSubjects || 'ninguna materia creada aún'}.`,
        notePayload: {
          termId: '',
          subjectId: '',
          termName: '',
          subjectName: '',
          title: '',
          content: '',
        },
      };
    }

    const rawTitle = typeof rawAction.titulo === 'string' ? rawAction.titulo.trim() : '';
    const title = cleanAssistantText(rawTitle).slice(0, 100) || 'Nota de Astro';
    const rawContent = typeof rawAction.contenido === 'string' ? rawAction.contenido : '';
    const content = cleanAssistantText(rawContent).slice(0, 8000);

    return {
      id: actionId,
      tipo: 'crear_nota',
      estado: 'done',
      etiqueta: `Nota creada: ${title}`,
      detalle: `${targetSubject.name} · ${targetTerm.name}`,
      notePayload: {
        termId: targetTerm.id,
        subjectId: targetSubject.id,
        termName: targetTerm.name,
        subjectName: targetSubject.name,
        title,
        content,
      },
    };
  }

  // 4. AGREGAR A NOTA EXISTENTE
  if (tipo === 'agregar_a_nota') {
    const rawNoteId = typeof rawAction.id === 'string' ? rawAction.id.trim() : '';
    let targetNote = rawNoteId ? context.notes.find((n) => n.id === rawNoteId) : undefined;

    // Si no se encuentra por id o se especificó "actual", usar la nota abierta en el cuaderno
    if (!targetNote && (!rawNoteId || rawNoteId === 'actual' || rawNoteId === 'nota_actual') && context.currentSelection?.noteId) {
      targetNote = context.notes.find((n) => n.id === context.currentSelection!.noteId);
    }

    if (!targetNote) {
      return {
        id: actionId,
        tipo: 'agregar_a_nota',
        estado: 'failed',
        etiqueta: 'Agregar a nota',
        error: `No encontré la nota con identificador "${rawNoteId || 'actual'}".`,
        targetNoteId: rawNoteId,
        noteTitle: 'Nota no encontrada',
        previousContent: '',
        appendedContent: '',
      };
    }

    const rawContent = typeof rawAction.contenido === 'string' ? rawAction.contenido : '';
    const appendedClean = cleanAssistantText(rawContent).slice(0, 8000);

    return {
      id: actionId,
      tipo: 'agregar_a_nota',
      estado: 'done',
      etiqueta: `Agregado a nota: ${targetNote.title}`,
      detalle: `${targetNote.title} · +${appendedClean.length} caracteres`,
      targetNoteId: targetNote.id,
      noteTitle: targetNote.title,
      previousContent: targetNote.content,
      appendedContent: appendedClean,
    };
  }

  return {
    id: actionId,
    tipo: 'desconocido',
    estado: 'failed',
    etiqueta: 'Acción desconocida',
    error: `Astro no reconoce el tipo de acción "${tipo}".`,
  };
}
