import { useState, useEffect } from 'react';
import {
  CalendarEvent,
  TodoTask,
  TermFolder,
  AcademicNote,
  EventRecurrence,
} from '../types';
import { formatDateKey, getMonday } from '../utils/dateUtils';

const STORAGE_EVENTS_KEY = 'plerd_calendar_events_v1';
const STORAGE_TASKS_KEY = 'plerd_todo_tasks_v1';
const STORAGE_TERMS_KEY = 'plerd_academic_terms_v1';
const STORAGE_ACADEMIC_NOTES_KEY = 'plerd_academic_notes_v1';

function getInitialSampleEvents(): CalendarEvent[] {
  const currentMonday = getMonday(new Date());

  const mondayDate = new Date(currentMonday);
  const mondayKey = formatDateKey(mondayDate);

  const wedDate = new Date(currentMonday);
  wedDate.setDate(wedDate.getDate() + 2);
  const wedKey = formatDateKey(wedDate);

  const friDate = new Date(currentMonday);
  friDate.setDate(friDate.getDate() + 4);
  const friKey = formatDateKey(friDate);

  return [
    {
      id: 'sample-event-1',
      title: 'Pre-cálculo (Clase)',
      dateKey: mondayKey,
      startHour: 8,
      startMinute: 0,
      endHour: 10,
      endMinute: 0,
      recurrence: 'weekly',
    },
    {
      id: 'sample-event-2',
      title: 'Introducción a algoritmos (Lab)',
      dateKey: wedKey,
      startHour: 10,
      startMinute: 0,
      endHour: 12,
      endMinute: 0,
      recurrence: 'weekly',
    },
    {
      id: 'sample-event-3',
      title: 'Razonamiento lógico matemático',
      dateKey: friKey,
      startHour: 14,
      startMinute: 0,
      endHour: 16,
      endMinute: 0,
      recurrence: 'weekly',
    },
  ];
}

const INITIAL_TERMS: TermFolder[] = [
  {
    id: 'term-1',
    name: '1er cuatrimestre',
    subjects: [
      { id: 'subj-precalculo', name: 'Pre-cálculo' },
      { id: 'subj-algoritmos', name: 'Introducción a algoritmos' },
      { id: 'subj-occidente', name: 'Rev. en occidente' },
      { id: 'subj-espanol', name: 'Español 1' },
      { id: 'subj-razonamiento', name: 'Razonamiento lógico matemático' },
    ],
  },
  {
    id: 'term-tecnico',
    name: 'Técnico',
    subjects: [{ id: 'subj-tec-general', name: 'General' }],
  },
  {
    id: 'term-proyectos',
    name: 'Proyectos',
    subjects: [{ id: 'subj-proy-general', name: 'General' }],
  },
];

const INITIAL_ACADEMIC_NOTES: AcademicNote[] = [
  {
    id: 'note-welcome-precalc',
    termId: 'term-1',
    subjectId: 'subj-precalculo',
    title: 'Repaso de álgebra y funciones',
    content:
      'Temas clave para el primer examen:\n- Dominio y rango de funciones polinomiales\n- Transformaciones de gráficas (desplazamientos y reflexiones)\n- Funciones compuestas e inversas\n- Modelado de problemas cuadráticos',
    updatedAt: Date.now() - 3600000 * 5,
  },
  {
    id: 'note-welcome-algoritmos',
    termId: 'term-1',
    subjectId: 'subj-algoritmos',
    title: 'Fundamentos de pseudocódigo y estructuras',
    content:
      'Estructuras de control básicas:\n1. Secuencial\n2. Condicional (si / entonces / si no)\n3. Iterativa (mientras, para)\n\nNotación asintótica O(n) y análisis de algoritmos de búsqueda.',
    updatedAt: Date.now() - 3600000 * 2,
  },
];

const INITIAL_SAMPLE_TASKS: TodoTask[] = [
  {
    id: 'sample-task-1',
    text: 'Revisar temario de Pre-cálculo',
    completed: false,
    createdAt: Date.now() - 3600000 * 3,
  },
  {
    id: 'sample-task-2',
    text: 'Instalar entorno para Introducción a algoritmos',
    completed: true,
    createdAt: Date.now() - 3600000 * 4,
  },
];

export function useStorage() {
  // Eventos del calendario
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_EVENTS_KEY);
      if (stored) return JSON.parse(stored);
      const initial = getInitialSampleEvents();
      localStorage.setItem(STORAGE_EVENTS_KEY, JSON.stringify(initial));
      return initial;
    } catch {
      return getInitialSampleEvents();
    }
  });

  // Tareas
  const [tasks, setTasks] = useState<TodoTask[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_TASKS_KEY);
      if (stored) return JSON.parse(stored);
      localStorage.setItem(STORAGE_TASKS_KEY, JSON.stringify(INITIAL_SAMPLE_TASKS));
      return INITIAL_SAMPLE_TASKS;
    } catch {
      return INITIAL_SAMPLE_TASKS;
    }
  });

  // Carpetas de cuatrimestres y materias
  const [terms, setTerms] = useState<TermFolder[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_TERMS_KEY);
      if (stored) {
        const parsed: TermFolder[] = JSON.parse(stored);
        const updated = [...parsed];
        let changed = false;

        if (
          !updated.some(
            (t) =>
              t.name.toLowerCase() === 'técnico' || t.name.toLowerCase() === 'tecnico'
          )
        ) {
          updated.push({
            id: 'term-tecnico',
            name: 'Técnico',
            subjects: [{ id: 'subj-tec-general', name: 'General' }],
          });
          changed = true;
        }

        if (!updated.some((t) => t.name.toLowerCase() === 'proyectos')) {
          updated.push({
            id: 'term-proyectos',
            name: 'Proyectos',
            subjects: [{ id: 'subj-proy-general', name: 'General' }],
          });
          changed = true;
        }

        if (changed) {
          localStorage.setItem(STORAGE_TERMS_KEY, JSON.stringify(updated));
        }
        return updated;
      }
      localStorage.setItem(STORAGE_TERMS_KEY, JSON.stringify(INITIAL_TERMS));
      return INITIAL_TERMS;
    } catch {
      return INITIAL_TERMS;
    }
  });

  // Notas académicas estructuradas
  const [academicNotes, setAcademicNotes] = useState<AcademicNote[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_ACADEMIC_NOTES_KEY);
      if (stored) return JSON.parse(stored);
      localStorage.setItem(STORAGE_ACADEMIC_NOTES_KEY, JSON.stringify(INITIAL_ACADEMIC_NOTES));
      return INITIAL_ACADEMIC_NOTES;
    } catch {
      return INITIAL_ACADEMIC_NOTES;
    }
  });

  // Persistencia automática
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_EVENTS_KEY, JSON.stringify(events));
    } catch (e) {
      console.error('Error al guardar eventos', e);
    }
  }, [events]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TASKS_KEY, JSON.stringify(tasks));
    } catch (e) {
      console.error('Error al guardar tareas', e);
    }
  }, [tasks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TERMS_KEY, JSON.stringify(terms));
    } catch (e) {
      console.error('Error al guardar carpetas', e);
    }
  }, [terms]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ACADEMIC_NOTES_KEY, JSON.stringify(academicNotes));
    } catch (e) {
      console.error('Error al guardar notas académicas', e);
    }
  }, [academicNotes]);

  // --- Operaciones de Eventos (con repetición) ---
  const addEvent = (
    eventData: Omit<CalendarEvent, 'id' | 'seriesId'> & { recurrence?: EventRecurrence }
  ) => {
    const recurrence = eventData.recurrence || 'none';
    const baseId = `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    if (recurrence === 'none') {
      const newEvent: CalendarEvent = {
        ...eventData,
        id: baseId,
        recurrence: 'none',
      };
      setEvents((prev) => [...prev, newEvent]);
      return newEvent;
    }

    const seriesId = `series-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const [year, month, day] = eventData.dateKey.split('-').map(Number);
    const startDate = new Date(year, month - 1, day);
    const generatedEvents: CalendarEvent[] = [];

    if (recurrence === 'daily') {
      // Repetir cada día por las próximas 12 semanas (84 días)
      for (let i = 0; i < 84; i++) {
        const nextDate = new Date(startDate);
        nextDate.setDate(startDate.getDate() + i);
        generatedEvents.push({
          ...eventData,
          id: `${baseId}-d${i}`,
          seriesId,
          dateKey: formatDateKey(nextDate),
          recurrence: 'daily',
        });
      }
    } else if (recurrence === 'weekly') {
      // Repetir cada semana el mismo día por 16 semanas (duración estándar de cuatrimestre)
      for (let w = 0; w < 16; w++) {
        const nextDate = new Date(startDate);
        nextDate.setDate(startDate.getDate() + w * 7);
        generatedEvents.push({
          ...eventData,
          id: `${baseId}-w${w}`,
          seriesId,
          dateKey: formatDateKey(nextDate),
          recurrence: 'weekly',
        });
      }
    }

    setEvents((prev) => [...prev, ...generatedEvents]);
    return generatedEvents[0];
  };

  const updateEvent = (updated: CalendarEvent, updateEntireSeries: boolean = false) => {
    if (updateEntireSeries && updated.seriesId) {
      setEvents((prev) =>
        prev.map((ev) =>
          ev.seriesId === updated.seriesId
            ? {
                ...ev,
                title: updated.title,
                startHour: updated.startHour,
                startMinute: updated.startMinute,
                endHour: updated.endHour,
                endMinute: updated.endMinute,
              }
            : ev
        )
      );
    } else {
      setEvents((prev) => prev.map((ev) => (ev.id === updated.id ? updated : ev)));
    }
  };

  const deleteEvent = (id: string, deleteEntireSeries: boolean = false) => {
    setEvents((prev) => {
      const target = prev.find((ev) => ev.id === id);
      if (deleteEntireSeries && target?.seriesId) {
        return prev.filter((ev) => ev.seriesId !== target.seriesId);
      }
      return prev.filter((ev) => ev.id !== id);
    });
  };

  // --- Operaciones de Tareas (To-Do) ---
  const addTask = (text: string) => {
    const cleanText = text.trim();
    if (!cleanText) return;
    const newTask: TodoTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      text: cleanText,
      completed: false,
      createdAt: Date.now(),
    };
    setTasks((prev) => [newTask, ...prev]);
    return newTask;
  };

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const clearCompletedTasks = () => {
    setTasks((prev) => prev.filter((task) => !task.completed));
  };

  // --- Operaciones de Carpetas de Cuatrimestres y Materias ---
  const addTerm = (termName: string) => {
    const clean = termName.trim();
    if (!clean) return;
    const newTerm: TermFolder = {
      id: `term-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: clean,
      subjects: [],
    };
    setTerms((prev) => [...prev, newTerm]);
    return newTerm;
  };

  const addSubject = (termId: string, subjectName: string) => {
    const clean = subjectName.trim();
    if (!clean) return;
    const newSubject = {
      id: `subj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: clean,
    };
    setTerms((prev) =>
      prev.map((t) =>
        t.id === termId
          ? { ...t, subjects: [...t.subjects, newSubject] }
          : t
      )
    );
    return newSubject;
  };

  const deleteSubject = (termId: string, subjectId: string) => {
    setTerms((prev) =>
      prev.map((t) =>
        t.id === termId
          ? { ...t, subjects: t.subjects.filter((s) => s.id !== subjectId) }
          : t
      )
    );
    // Eliminar también las notas asociadas
    setAcademicNotes((prev) =>
      prev.filter((note) => !(note.termId === termId && note.subjectId === subjectId))
    );
  };

  const deleteTerm = (termId: string) => {
    setTerms((prev) => prev.filter((t) => t.id !== termId));
    setAcademicNotes((prev) => prev.filter((note) => note.termId !== termId));
  };

  // --- Operaciones de Notas Académicas ---
  const addAcademicNote = (
    termId: string,
    subjectId: string,
    title: string,
    content: string
  ) => {
    const newNote: AcademicNote = {
      id: `anote-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      termId,
      subjectId,
      title: title.trim() || 'Nota sin título',
      content: content.trim(),
      updatedAt: Date.now(),
    };
    setAcademicNotes((prev) => [newNote, ...prev]);
    return newNote;
  };

  const updateAcademicNote = (id: string, title: string, content: string) => {
    setAcademicNotes((prev) =>
      prev.map((note) =>
        note.id === id
          ? {
              ...note,
              title: title.trim() || 'Nota sin título',
              content: content.trim(),
              updatedAt: Date.now(),
            }
          : note
      )
    );
  };

  const deleteAcademicNote = (id: string) => {
    setAcademicNotes((prev) => prev.filter((note) => note.id !== id));
  };

  return {
    events,
    tasks,
    terms,
    academicNotes,
    addEvent,
    updateEvent,
    deleteEvent,
    addTask,
    toggleTask,
    deleteTask,
    clearCompletedTasks,
    addTerm,
    addSubject,
    deleteSubject,
    deleteTerm,
    addAcademicNote,
    updateAcademicNote,
    deleteAcademicNote,
  };
}
