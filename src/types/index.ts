export type EventRecurrence = 'none' | 'daily' | 'weekly';

export interface CalendarEvent {
  id: string;
  seriesId?: string; // Identificador compartido para eventos de una misma serie recurrente
  title: string;
  dateKey: string; // Formato YYYY-MM-DD
  startHour: number; // 5 a 21
  startMinute: number; // 0, 15, 30, 45
  endHour: number; // 5 a 22
  endMinute: number; // 0, 15, 30, 45
  recurrence?: EventRecurrence;
}

export interface SubjectFolder {
  id: string;
  name: string;
}

export interface TermFolder {
  id: string;
  name: string; // Ej. "1er cuatrimestre"
  subjects: SubjectFolder[];
}

export interface AcademicNote {
  id: string;
  termId: string;
  subjectId: string;
  title: string;
  content: string;
  updatedAt: number; // Timestamp en ms
}

export interface PersonalNote {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

export interface TodoTask {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number; // Timestamp en milisegundos
}

export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface FocusTimerState {
  durationMinutes: number;
  remainingSeconds: number;
  status: TimerStatus;
  targetEndTime: number | null;
}

export * from './agent';
