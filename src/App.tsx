/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import { TopBar } from './components/TopBar';
import { WeeklyCalendar } from './components/WeeklyCalendar';
import { EventModal } from './components/EventModal';
import { NotesManagerModal } from './components/NotesManagerModal';
import { FocusTimerOverlay } from './components/FocusTimerOverlay';
import { AgentModal } from './components/AgentModal';
import { AssistantDock } from './components/AssistantDock';
import { useStorage } from './hooks/useStorage';
import { useFocusTimer } from './hooks/useFocusTimer';
import { useAgent } from './hooks/useAgent';
import { useAssistantActions } from './hooks/useAssistantActions';
import {
  EliminarEventoActionData,
  AssistantActionItem,
} from './utils/assistantActions';
import {
  getMonday,
  addWeeks,
  formatWeekRange,
  formatDateKey,
  getWeekDays,
} from './utils/dateUtils';
import { CalendarEvent, EventRecurrence } from './types';

export default function App() {
  // Estado de navegación semanal (exclusivamente vista semanal)
  const [currentMonday, setCurrentMonday] = useState<Date>(() => getMonday(new Date()));

  // Estado de los paneles y modales
  const [isDockOpen, setIsDockOpen] = useState(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [isNotesManagerOpen, setIsNotesManagerOpen] = useState(false);
  const [isTimerOverlayOpen, setIsTimerOverlayOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [modalDefaultDateKey, setModalDefaultDateKey] = useState<string>(() =>
    formatDateKey(new Date())
  );
  const [modalDefaultStartHour, setModalDefaultStartHour] = useState<number>(9);

  // Almacenamiento persistente de eventos, cuatrimestres y notas académicas
  const {
    events,
    terms,
    academicNotes,
    addEvent,
    updateEvent,
    deleteEvent,
    addTerm,
    addSubject,
    deleteSubject,
    deleteTerm,
    addAcademicNote,
    updateAcademicNote,
    deleteAcademicNote,
  } = useStorage();

  // Temporizador de concentración de alta precisión
  const {
    durationMinutes,
    status: timerStatus,
    formattedTime: timerFormattedTime,
    setMinutes: setTimerMinutes,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
  } = useFocusTimer();

  // Asistente Astro de estudio y planificación
  const {
    config: agentConfig,
    updateConfig: updateAgentConfig,
    connectionStatus: agentConnectionStatus,
    statusMessage: agentStatusMessage,
    availableModels: agentAvailableModels,
    testConnection: testAgentConnection,
    generateWeeklySummary: generateAgentSummary,
    isGenerating: isAgentGenerating,
    lastSummary: agentLastSummary,
    chatMessages: agentChatMessages,
    isChatSending: agentIsChatSending,
    sendChatMessage: agentSendChatMessage,
    updateMessageAction: agentUpdateMessageAction,
    clearChatMessages: agentClearChatMessages,
    error: agentError,
    clearError: clearAgentError,
  } = useAgent();

  // Navegación en el calendario al hacer clic en "Ver en el calendario" desde una acción de Astro
  const handleNavigateDate = useCallback((dateKey: string) => {
    const [y, m, d] = dateKey.split('-').map(Number);
    setCurrentMonday(getMonday(new Date(y, m - 1, d)));
  }, []);

  // Hook de ejecución de acciones de Astro en planner y notas
  const {
    processExtractedActions,
    confirmDelete,
    cancelDelete,
    undoAction,
  } = useAssistantActions({
    events,
    terms,
    notes: academicNotes,
    addEvent,
    deleteEvent,
    addAcademicNote,
    updateAcademicNote,
    deleteAcademicNote,
    onNavigateDate: handleNavigateDate,
  });

  // Envío de chat conectando el extractor y ejecutor de acciones
  const handleSendChatMessage = useCallback(
    async (userText: string) => {
      await agentSendChatMessage(
        userText,
        {
          allEvents: events,
          terms,
          academicNotes,
        },
        processExtractedActions
      );
    },
    [agentSendChatMessage, events, terms, academicNotes, processExtractedActions]
  );

  // Confirmar eliminación de evento
  const handleConfirmDelete = useCallback(
    (action: EliminarEventoActionData) => {
      confirmDelete(action, (updated) => agentUpdateMessageAction(action.id, updated));
    },
    [confirmDelete, agentUpdateMessageAction]
  );

  // Cancelar eliminación de evento
  const handleCancelDelete = useCallback(
    (action: EliminarEventoActionData) => {
      cancelDelete(action, (updated) => agentUpdateMessageAction(action.id, updated));
    },
    [cancelDelete, agentUpdateMessageAction]
  );

  // Deshacer acción ejecutada
  const handleUndoAction = useCallback(
    (action: AssistantActionItem) => {
      undoAction(action, (updated) => agentUpdateMessageAction(action.id, updated));
    },
    [undoAction, agentUpdateMessageAction]
  );

  // Días de la semana actual
  const weekDays = useMemo(() => getWeekDays(currentMonday), [currentMonday]);

  // Eventos filtrados de la semana visible actual
  const currentWeekEvents = useMemo(() => {
    const weekDateKeys = new Set(weekDays.map((d) => d.dateKey));
    return events.filter((e) => weekDateKeys.has(e.dateKey));
  }, [events, weekDays]);

  // Texto del rango semanal
  const weekRangeText = useMemo(
    () => formatWeekRange(currentMonday),
    [currentMonday]
  );

  // Navegación de semanas
  const handlePrevWeek = useCallback(() => {
    setCurrentMonday((prev) => addWeeks(prev, -1));
  }, []);

  const handleNextWeek = useCallback(() => {
    setCurrentMonday((prev) => addWeeks(prev, 1));
  }, []);

  // Interacción con slots del calendario (Creación directa)
  const handleSelectSlot = useCallback((dateKey: string, hour: number) => {
    setSelectedEvent(null);
    setModalDefaultDateKey(dateKey);
    setModalDefaultStartHour(hour);
    setIsEventModalOpen(true);
  }, []);

  // Interacción con eventos existentes (Modificación / Eliminación)
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setModalDefaultDateKey(event.dateKey);
    setModalDefaultStartHour(event.startHour);
    setIsEventModalOpen(true);
  }, []);

  // Guardado de evento desde el modal (con soporte de repetición)
  const handleSaveEvent = useCallback(
    (eventData: {
      id?: string;
      seriesId?: string;
      title: string;
      dateKey: string;
      startHour: number;
      startMinute: number;
      endHour: number;
      endMinute: number;
      recurrence?: EventRecurrence;
    }) => {
      if (eventData.id) {
        updateEvent(
          {
            id: eventData.id,
            seriesId: eventData.seriesId,
            title: eventData.title,
            dateKey: eventData.dateKey,
            startHour: eventData.startHour,
            startMinute: eventData.startMinute,
            endHour: eventData.endHour,
            endMinute: eventData.endMinute,
            recurrence: eventData.recurrence,
          },
          false
        );
      } else {
        addEvent({
          title: eventData.title,
          dateKey: eventData.dateKey,
          startHour: eventData.startHour,
          startMinute: eventData.startMinute,
          endHour: eventData.endHour,
          endMinute: eventData.endMinute,
          recurrence: eventData.recurrence,
        });
      }
    },
    [addEvent, updateEvent]
  );

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Barra superior con marca Erick's Planner, botón de Astro, enlaces y herramientas */}
      <TopBar
        onOpenAgent={() => setIsDockOpen((prev) => !prev)}
        onOpenNotes={() => setIsNotesManagerOpen(true)}
        notesCount={academicNotes.length}
        onOpenTimer={() => setIsTimerOverlayOpen(true)}
        timerStatus={timerStatus}
        timerFormattedTime={timerFormattedTime}
      />

      {/* Calendario semanal con navegación mediante swipe de 2 dedos en Mac trackpad */}
      <main className="flex-1 flex flex-col min-h-0 relative">
        <WeeklyCalendar
          monday={currentMonday}
          events={events}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          weekRangeText={weekRangeText}
        />
      </main>

      {/* Dock permanente flotante de Astro (Chat) */}
      <AssistantDock
        isOpen={isDockOpen}
        onToggle={() => setIsDockOpen((prev) => !prev)}
        onClose={() => setIsDockOpen(false)}
        onOpenModal={() => setIsAgentModalOpen(true)}
        weekEvents={currentWeekEvents}
        weekRangeText={weekRangeText}
        terms={terms}
        academicNotes={academicNotes}
        chatMessages={agentChatMessages}
        isChatSending={agentIsChatSending}
        onSendChatMessage={handleSendChatMessage}
        onClearChatMessages={agentClearChatMessages}
        hasError={Boolean(agentError)}
        onNavigateDate={handleNavigateDate}
        onConfirmDelete={handleConfirmDelete}
        onCancelDelete={handleCancelDelete}
        onUndoAction={handleUndoAction}
      />

      {/* Modal de Astro (Resumen Semanal y Conexión) */}
      <AgentModal
        isOpen={isAgentModalOpen}
        onClose={() => setIsAgentModalOpen(false)}
        weekEvents={currentWeekEvents}
        weekRangeText={weekRangeText}
        terms={terms}
        academicNotes={academicNotes}
        config={agentConfig}
        onUpdateConfig={updateAgentConfig}
        connectionStatus={agentConnectionStatus}
        statusMessage={agentStatusMessage}
        availableModels={agentAvailableModels}
        onTestConnection={testAgentConnection}
        onGenerateSummary={generateAgentSummary}
        isGenerating={isAgentGenerating}
        lastSummary={agentLastSummary}
        error={agentError}
        onClearError={clearAgentError}
      />

      {/* Modal para crear / editar / eliminar eventos (con opción de repetición) */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSave={handleSaveEvent}
        onDelete={deleteEvent}
        initialEvent={selectedEvent}
        defaultDateKey={modalDefaultDateKey}
        defaultStartHour={modalDefaultStartHour}
        weekDays={weekDays}
      />

      {/* Panel completo de Cuaderno de Notas estructurado por Cuatrimestres y Materias */}
      <NotesManagerModal
        isOpen={isNotesManagerOpen}
        onClose={() => setIsNotesManagerOpen(false)}
        terms={terms}
        notes={academicNotes}
        onAddTerm={addTerm}
        onAddSubject={addSubject}
        onDeleteSubject={deleteSubject}
        onDeleteTerm={deleteTerm}
        onAddNote={addAcademicNote}
        onUpdateNote={updateAcademicNote}
        onDeleteNote={deleteAcademicNote}
      />

      {/* Temporizador de concentración a pantalla completa */}
      <FocusTimerOverlay
        isOpen={isTimerOverlayOpen}
        onClose={() => setIsTimerOverlayOpen(false)}
        status={timerStatus}
        formattedTime={timerFormattedTime}
        durationMinutes={durationMinutes}
        onSetMinutes={setTimerMinutes}
        onStart={startTimer}
        onPause={pauseTimer}
        onResume={resumeTimer}
        onReset={resetTimer}
      />
    </div>
  );
}
