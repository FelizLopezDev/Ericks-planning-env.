import { useRef, useEffect, useCallback } from 'react';
import { CalendarEvent, TermFolder, AcademicNote } from '../types';
import {
  AssistantActionItem,
  EliminarEventoActionData,
  validateAssistantAction,
} from '../utils/assistantActions';

interface UseAssistantActionsProps {
  events: CalendarEvent[];
  terms: TermFolder[];
  notes: AcademicNote[];
  addEvent: (eventData: any) => CalendarEvent;
  deleteEvent: (id: string, deleteEntireSeries?: boolean) => void;
  addAcademicNote: (termId: string, subjectId: string, title: string, content: string) => AcademicNote;
  updateAcademicNote: (id: string, title: string, content: string) => void;
  deleteAcademicNote: (id: string) => void;
  onNavigateDate?: (dateKey: string) => void;
  currentSelection?: {
    termId: string | null;
    subjectId: string | null;
    noteId: string | null;
  };
  onNoteCreated?: (created: { termId: string; subjectId: string; noteId: string }) => void;
  onActionExecuted?: (action: AssistantActionItem) => void;
}

export function useAssistantActions({
  events,
  terms,
  notes,
  addEvent,
  deleteEvent,
  addAcademicNote,
  updateAcademicNote,
  deleteAcademicNote,
  onNavigateDate,
  currentSelection,
  onNoteCreated,
  onActionExecuted,
}: UseAssistantActionsProps) {
  const eventsRef = useRef(events);
  const termsRef = useRef(terms);
  const notesRef = useRef(notes);
  const currentSelectionRef = useRef(currentSelection);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    termsRef.current = terms;
  }, [terms]);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    currentSelectionRef.current = currentSelection;
  }, [currentSelection]);

  // Ejecuta una acción validada inmediatamente (crear_evento, crear_nota, agregar_a_nota)
  const executeAction = useCallback(
    (action: AssistantActionItem): AssistantActionItem => {
      try {
        if (action.tipo === 'crear_evento') {
          const created = addEvent(action.eventPayload);
          const result: AssistantActionItem = {
            ...action,
            createdEventId: created.id,
            createdSeriesId: created.seriesId,
            isSeries: Boolean(created.seriesId),
            estado: 'done',
          };
          onActionExecuted?.(result);
          return result;
        }

        if (action.tipo === 'crear_nota') {
          const created = addAcademicNote(
            action.notePayload.termId,
            action.notePayload.subjectId,
            action.notePayload.title,
            action.notePayload.content
          );
          onNoteCreated?.({
            termId: action.notePayload.termId,
            subjectId: action.notePayload.subjectId,
            noteId: created.id,
          });
          const result: AssistantActionItem = {
            ...action,
            createdNoteId: created.id,
            estado: 'done',
          };
          onActionExecuted?.(result);
          return result;
        }

        if (action.tipo === 'agregar_a_nota') {
          const newContent = action.previousContent
            ? `${action.previousContent}\n\n${action.appendedContent}`
            : action.appendedContent;

          updateAcademicNote(action.targetNoteId, action.noteTitle, newContent);
          const result: AssistantActionItem = {
            ...action,
            estado: 'done',
          };
          onActionExecuted?.(result);
          return result;
        }

        return action;
      } catch (err: any) {
        console.error('Error al ejecutar acción:', err);
        return {
          ...action,
          estado: 'failed',
          error: `Error al aplicar la acción: ${err.message || 'Fallo inesperado'}`,
        };
      }
    },
    [addEvent, addAcademicNote, updateAcademicNote, onNoteCreated, onActionExecuted]
  );

  // Procesa y ejecuta el conjunto de acciones extraídas del mensaje de Astro
  const processExtractedActions = useCallback(
    (rawActions: unknown[], hadBlock: boolean, invalid: boolean): AssistantActionItem[] => {
      if (hadBlock && invalid) {
        return [
          {
            id: `act_err_${Date.now()}`,
            tipo: 'desconocido',
            estado: 'failed',
            etiqueta: 'Acción no comprendida',
            error: 'No pude entender esa acción, ¿me lo pides de otra forma?',
          },
        ];
      }

      if (!rawActions || rawActions.length === 0) {
        return [];
      }

      const results: AssistantActionItem[] = [];

      for (const raw of rawActions) {
        const validated = validateAssistantAction(raw, {
          events: eventsRef.current,
          terms: termsRef.current,
          notes: notesRef.current,
          currentSelection: currentSelectionRef.current,
        });

        // Crear evento, crear nota y agregar a nota se ejecutan de inmediato
        if (validated.estado === 'done') {
          const executed = executeAction(validated);
          results.push(executed);
        } else {
          // 'pending' (para eliminar_evento) o 'failed' se devuelven sin ejecutar
          results.push(validated);
        }
      }

      return results;
    },
    [executeAction]
  );

  // Confirmar eliminación de evento pendiente
  const confirmDelete = useCallback(
    (action: EliminarEventoActionData, onUpdateAction: (updated: AssistantActionItem) => void) => {
      if (action.targetEventId) {
        deleteEvent(action.targetEventId, action.deleteEntireSeries);
        onUpdateAction({
          ...action,
          estado: 'done',
          etiqueta: action.deleteEntireSeries ? 'Serie eliminada' : `Evento eliminado: ${action.eventInfo.title}`,
        });
      }
    },
    [deleteEvent]
  );

  // Cancelar eliminación de evento pendiente
  const cancelDelete = useCallback(
    (action: EliminarEventoActionData, onUpdateAction: (updated: AssistantActionItem) => void) => {
      onUpdateAction({
        ...action,
        estado: 'cancelled',
        etiqueta: `Cancelado: ${action.eventInfo.title}`,
      });
    },
    []
  );

  // Deshacer una acción previamente ejecutada
  const undoAction = useCallback(
    (action: AssistantActionItem, onUpdateAction: (updated: AssistantActionItem) => void) => {
      try {
        if (action.tipo === 'crear_evento' && action.createdEventId) {
          deleteEvent(action.createdEventId, action.isSeries);
          onUpdateAction({
            ...action,
            estado: 'undone',
            etiqueta: `Deshecho: creación de "${action.eventPayload.title}"`,
          });
        } else if (action.tipo === 'crear_nota' && action.createdNoteId) {
          deleteAcademicNote(action.createdNoteId);
          onUpdateAction({
            ...action,
            estado: 'undone',
            etiqueta: `Deshecho: creación de "${action.notePayload.title}"`,
          });
        } else if (action.tipo === 'agregar_a_nota') {
          updateAcademicNote(action.targetNoteId, action.noteTitle, action.previousContent);
          onUpdateAction({
            ...action,
            estado: 'undone',
            etiqueta: `Deshecho: cambios en "${action.noteTitle}"`,
          });
        }
      } catch (err: any) {
        console.error('Error al deshacer acción:', err);
      }
    },
    [deleteEvent, deleteAcademicNote, updateAcademicNote]
  );

  return {
    processExtractedActions,
    confirmDelete,
    cancelDelete,
    undoAction,
    onNavigateDate,
  };
}
