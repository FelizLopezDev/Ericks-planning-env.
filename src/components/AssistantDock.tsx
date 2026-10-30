import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Send,
  Trash2,
  Copy,
  Check,
  FileText,
  Maximize2,
  Minimize2,
  Calendar,
  Undo2,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  NotebookPen,
} from 'lucide-react';
import {
  CalendarEvent,
  TermFolder,
  AcademicNote,
  AgentChatMessage,
} from '../types';
import { AssistantAvatar, AvatarState } from './AssistantAvatar';
import { cleanAssistantText } from '../utils/cleanText';
import {
  AssistantActionItem,
  EliminarEventoActionData,
} from '../utils/assistantActions';

interface AssistantDockProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onOpenModal: () => void;
  weekEvents: CalendarEvent[];
  weekRangeText: string;
  terms: TermFolder[];
  academicNotes: AcademicNote[];
  chatMessages: AgentChatMessage[];
  isChatSending: boolean;
  onSendChatMessage: (userText: string) => Promise<void>;
  onClearChatMessages: () => void;
  hasError?: boolean;
  onNavigateDate?: (dateKey: string) => void;
  onConfirmDelete?: (action: EliminarEventoActionData) => void;
  onCancelDelete?: (action: EliminarEventoActionData) => void;
  onUndoAction?: (action: AssistantActionItem) => void;
  isNotebookOpen?: boolean;
  onLayoutChange?: (layout: {
    open: boolean;
    placement: 'floating' | 'side' | 'bottom';
    width: number;
    height: number;
  }) => void;
  onResizingChange?: (isResizing: boolean) => void;
  onSaveMessageAsNote?: (content: string) => void;
}

const QUICK_SUGGESTIONS = [
  'Resume mi semana',
  '¿Qué debo estudiar hoy?',
  'Organiza mis pendientes',
];

const NOTEBOOK_QUICK_SUGGESTIONS = [
  'Resume esta nota',
  'Explícame esto con un ejemplo',
  'Genera preguntas de repaso',
  '¿Qué puntos clave faltan en mis apuntes?',
];

const STORAGE_KEY_SIZE = 'astro_dock_size';
const STORAGE_KEY_SIDE_WIDTH = 'astro_dock_side_width';
const DEFAULT_SIZE = { width: 360, height: 520 };
const MIN_WIDTH = 320;
const MIN_HEIGHT = 360;
const DEFAULT_SIDE_WIDTH = 380;
const MIN_SIDE_WIDTH = 320;

function getBounds() {
  if (typeof window === 'undefined') {
    return { maxWidth: 800, maxHeight: 700 };
  }
  return {
    maxWidth: Math.floor(window.innerWidth * 0.9),
    maxHeight: Math.floor(window.innerHeight * 0.9),
  };
}

export const AssistantDock: React.FC<AssistantDockProps> = ({
  isOpen,
  onToggle,
  onClose,
  onOpenModal,
  weekEvents,
  weekRangeText,
  terms,
  academicNotes,
  chatMessages,
  isChatSending,
  onSendChatMessage,
  onClearChatMessages,
  hasError = false,
  onNavigateDate,
  onConfirmDelete,
  onCancelDelete,
  onUndoAction,
  isNotebookOpen = false,
  onLayoutChange,
  onResizingChange,
  onSaveMessageAsNote,
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hasUnread, setHasUnread] = useState(false);
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');

  // Tamaño redimensionable para modo flotante
  const [size, setSize] = useState<{ width: number; height: number }>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SIZE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          typeof parsed.width === 'number' &&
          typeof parsed.height === 'number'
        ) {
          const { maxWidth, maxHeight } = getBounds();
          return {
            width: Math.min(Math.max(parsed.width, MIN_WIDTH), maxWidth),
            height: Math.min(Math.max(parsed.height, MIN_HEIGHT), maxHeight),
          };
        }
      }
    } catch (e) {
      console.warn('Error reading dock size from localStorage', e);
    }
    return DEFAULT_SIZE;
  });

  // Ancho para panel lateral en modo lado a lado con el cuaderno de notas
  const [sideWidth, setSideWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SIDE_WIDTH);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed)) {
          const maxW = typeof window !== 'undefined' ? Math.floor(window.innerWidth * 0.5) : 600;
          return Math.min(Math.max(parsed, MIN_SIDE_WIDTH), maxW);
        }
      }
    } catch (e) {
      console.warn('Error reading dock side width from localStorage', e);
    }
    return DEFAULT_SIDE_WIDTH;
  });

  // Detección de pantalla pequeña (< 768px) para panel inferior
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  const [isMaximized, setIsMaximized] = useState(false);
  const prevSizeRef = useRef<{ width: number; height: number }>(DEFAULT_SIZE);
  const [isDragging, setIsDragging] = useState(false);

  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  }>({ startX: 0, startY: 0, startWidth: DEFAULT_SIZE.width, startHeight: DEFAULT_SIZE.height });

  // Arrastre del panel lateral
  const isSideDraggingRef = useRef(false);
  const sideDragStartRef = useRef<{ startX: number; startWidth: number }>({
    startX: 0,
    startWidth: DEFAULT_SIDE_WIDTH,
  });

  const rafRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevMessagesCountRef = useRef(chatMessages.length);

  // Escuchar cambio de tamaño de la ventana
  useEffect(() => {
    const handleWindowResize = () => {
      const { maxWidth, maxHeight } = getBounds();
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      setSize((prev) => {
        const clampedW = Math.min(Math.max(prev.width, MIN_WIDTH), maxWidth);
        const clampedH = Math.min(Math.max(prev.height, MIN_HEIGHT), maxHeight);
        if (clampedW !== prev.width || clampedH !== prev.height) {
          return { width: clampedW, height: clampedH };
        }
        return prev;
      });

      setSideWidth((prev) => {
        const maxW = Math.floor(window.innerWidth * 0.5);
        return Math.min(Math.max(prev, MIN_SIDE_WIDTH), maxW);
      });
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  // Notificar cambios de layout a App.tsx para ajustar el inset de NotesManagerModal
  useEffect(() => {
    if (!isOpen) {
      onLayoutChange?.({
        open: false,
        placement: 'floating',
        width: 0,
        height: 0,
      });
      return;
    }

    if (isNotebookOpen) {
      if (isMobile) {
        onLayoutChange?.({
          open: true,
          placement: 'bottom',
          width: typeof window !== 'undefined' ? window.innerWidth : 360,
          height: typeof window !== 'undefined' ? Math.round(window.innerHeight * 0.55) : 320,
        });
      } else {
        onLayoutChange?.({
          open: true,
          placement: 'side',
          width: sideWidth,
          height: typeof window !== 'undefined' ? window.innerHeight : 700,
        });
      }
    } else {
      onLayoutChange?.({
        open: true,
        placement: 'floating',
        width: size.width,
        height: size.height,
      });
    }
  }, [isOpen, isNotebookOpen, isMobile, sideWidth, size.width, size.height, onLayoutChange]);

  // Manejo de atajo global: Ctrl/Cmd+J para abrir/cerrar dock, Esc para minimizar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        onToggle();
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onToggle, onClose]);

  // Limpiar indicador de no leídos al abrir el dock
  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Manejo del estado del avatar: thinking, speaking (2s) o error
  useEffect(() => {
    if (isChatSending) {
      setAvatarState('thinking');
    } else if (hasError) {
      setAvatarState('error');
    } else if (chatMessages.length > prevMessagesCountRef.current) {
      const last = chatMessages[chatMessages.length - 1];
      if (last && last.role === 'assistant') {
        setAvatarState('speaking');
        if (!isOpen) {
          setHasUnread(true);
        }
        const timer = setTimeout(() => {
          setAvatarState('idle');
        }, 2000);
        return () => clearTimeout(timer);
      }
    } else {
      setAvatarState('idle');
    }
    prevMessagesCountRef.current = chatMessages.length;
  }, [isChatSending, hasError, chatMessages, isOpen]);

  // Auto-scroll al final al recibir o enviar mensajes
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatSending, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? inputText).trim();
    if (!text || isChatSending) return;

    setInputText('');
    await onSendChatMessage(text);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Alternar modo ampliado / restaurar
  const handleToggleMaximize = () => {
    const { maxWidth, maxHeight } = getBounds();
    if (isMaximized) {
      const restored = prevSizeRef.current || DEFAULT_SIZE;
      setSize(restored);
      setIsMaximized(false);
      try {
        localStorage.setItem(STORAGE_KEY_SIZE, JSON.stringify(restored));
      } catch (e) {
        console.warn('Error saving dock size', e);
      }
    } else {
      prevSizeRef.current = size;
      const targetW = Math.min(720, maxWidth);
      const targetH = Math.min(Math.floor(window.innerHeight * 0.8), maxHeight);
      const expanded = { width: targetW, height: targetH };
      setSize(expanded);
      setIsMaximized(true);
    }
  };

  // Manejadores de arrastre con pointer events
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: size.width,
      startHeight: size.height,
    };
    setIsDragging(true);
    document.body.style.userSelect = 'none';
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      const { maxWidth, maxHeight } = getBounds();
      // Arrastrar hacia arriba (startY > currentY) agranda; hacia izquierda (startX > currentX) agranda
      const deltaX = dragStartRef.current.startX - e.clientX;
      const deltaY = dragStartRef.current.startY - e.clientY;

      const newWidth = Math.min(
        Math.max(dragStartRef.current.startWidth + deltaX, MIN_WIDTH),
        maxWidth
      );
      const newHeight = Math.min(
        Math.max(dragStartRef.current.startHeight + deltaY, MIN_HEIGHT),
        maxHeight
      );

      setSize({ width: newWidth, height: newHeight });
      setIsMaximized(false);
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setIsDragging(false);
    document.body.style.userSelect = '';
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    try {
      localStorage.setItem(STORAGE_KEY_SIZE, JSON.stringify(size));
    } catch (err) {
      console.warn('Error saving dock size to localStorage', err);
    }
  };

  const handleDoubleClickHandle = () => {
    setSize(DEFAULT_SIZE);
    setIsMaximized(false);
    try {
      localStorage.setItem(STORAGE_KEY_SIZE, JSON.stringify(DEFAULT_SIZE));
    } catch (e) {
      console.warn('Error resetting dock size', e);
    }
  };

  // Redimensionado del panel lateral en modo lado a lado
  const handleSidePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isSideDraggingRef.current = true;
    sideDragStartRef.current = {
      startX: e.clientX,
      startWidth: sideWidth,
    };
    onResizingChange?.(true);
    document.body.style.userSelect = 'none';
  };

  const handleSidePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSideDraggingRef.current) return;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      const deltaX = sideDragStartRef.current.startX - e.clientX;
      const maxW = Math.floor(window.innerWidth * 0.5);
      const newWidth = Math.min(Math.max(sideDragStartRef.current.startWidth + deltaX, MIN_SIDE_WIDTH), maxW);
      setSideWidth(newWidth);
    });
  };

  const handleSidePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSideDraggingRef.current) return;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    isSideDraggingRef.current = false;
    onResizingChange?.(false);
    document.body.style.userSelect = '';
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    try {
      localStorage.setItem(STORAGE_KEY_SIDE_WIDTH, String(sideWidth));
    } catch (err) {
      console.warn('Error saving dock side width', err);
    }
  };

  const handleSideDoubleClick = () => {
    setSideWidth(DEFAULT_SIDE_WIDTH);
    try {
      localStorage.setItem(STORAGE_KEY_SIDE_WIDTH, String(DEFAULT_SIDE_WIDTH));
    } catch (err) {
      console.warn('Error resetting dock side width', err);
    }
  };

  // Renderizar tarjeta de acción para cada acción en msg.actions
  const renderActionCard = (action: AssistantActionItem) => {
    if (action.tipo === 'crear_evento') {
      const { eventPayload, createdEventId, conflicto } = action;
      return (
        <div
          key={action.id}
          className="mt-2 bg-zinc-950/90 border border-zinc-800 rounded-lg p-2.5 space-y-1.5 text-xs text-zinc-200"
        >
          <div className="flex items-start gap-2">
            {action.estado === 'done' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : action.estado === 'undone' ? (
              <Undo2 className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            )}

            <div className="flex-1 min-w-0">
              <div
                className={`font-medium ${
                  action.estado === 'undone' ? 'line-through text-zinc-500' : 'text-zinc-100'
                }`}
              >
                {action.etiqueta}
              </div>
              {action.detalle && (
                <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                  {action.detalle}
                </div>
              )}
              {conflicto && action.estado === 'done' && (
                <div className="mt-1 flex items-center gap-1.5 text-[10px] text-amber-300 bg-amber-950/40 border border-amber-800/40 px-2 py-1 rounded">
                  <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>{conflicto}</span>
                </div>
              )}
            </div>
          </div>

          {action.estado === 'done' && (
            <div className="flex items-center gap-2 pt-1 border-t border-zinc-850">
              {onNavigateDate && (
                <button
                  type="button"
                  onClick={() => onNavigateDate(eventPayload.dateKey)}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-zinc-200 bg-zinc-800 hover:bg-zinc-750 rounded transition-colors cursor-pointer"
                >
                  <Calendar className="w-3 h-3 text-zinc-400" />
                  <span>Ver en el calendario</span>
                </button>
              )}

              {onUndoAction && (
                <button
                  type="button"
                  onClick={() => onUndoAction(action)}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors cursor-pointer ml-auto"
                >
                  <Undo2 className="w-3 h-3" />
                  <span>Deshacer</span>
                </button>
              )}
            </div>
          )}
        </div>
      );
    }

    if (action.tipo === 'eliminar_evento') {
      const isPending = action.estado === 'pending';
      return (
        <div
          key={action.id}
          className="mt-2 bg-zinc-950/90 border border-zinc-800 rounded-lg p-2.5 space-y-2 text-xs text-zinc-200"
        >
          <div className="flex items-start gap-2">
            {isPending ? (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            ) : action.estado === 'done' ? (
              <CheckCircle2 className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
            ) : action.estado === 'cancelled' ? (
              <X className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            )}

            <div className="flex-1 min-w-0">
              <div
                className={`font-medium ${
                  action.estado === 'cancelled' ? 'line-through text-zinc-500' : 'text-zinc-100'
                }`}
              >
                {action.etiqueta}
              </div>
              {action.detalle && (
                <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                  {action.detalle}
                </div>
              )}
              {action.estado === 'cancelled' && (
                <div className="text-[10px] text-zinc-500 italic mt-0.5">
                  Eliminación cancelada
                </div>
              )}
            </div>
          </div>

          {isPending && onConfirmDelete && onCancelDelete && (
            <div className="flex items-center gap-2 pt-1 border-t border-zinc-850">
              <button
                type="button"
                onClick={() => onConfirmDelete(action)}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-red-200 bg-red-950/60 hover:bg-red-900/80 border border-red-800/50 rounded transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Eliminar</span>
              </button>

              <button
                type="button"
                onClick={() => onCancelDelete(action)}
                className="px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-750 rounded transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      );
    }

    if (action.tipo === 'crear_nota' || action.tipo === 'agregar_a_nota') {
      return (
        <div
          key={action.id}
          className="mt-2 bg-zinc-950/90 border border-zinc-800 rounded-lg p-2.5 space-y-1.5 text-xs text-zinc-200"
        >
          <div className="flex items-start gap-2">
            {action.estado === 'done' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : action.estado === 'undone' ? (
              <Undo2 className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            )}

            <div className="flex-1 min-w-0">
              <div
                className={`font-medium ${
                  action.estado === 'undone' ? 'line-through text-zinc-500' : 'text-zinc-100'
                }`}
              >
                {action.etiqueta}
              </div>
              {action.detalle && (
                <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                  {action.detalle}
                </div>
              )}
            </div>
          </div>

          {action.estado === 'done' && onUndoAction && (
            <div className="flex items-center justify-end pt-1 border-t border-zinc-850">
              <button
                type="button"
                onClick={() => onUndoAction(action)}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
              >
                <Undo2 className="w-3 h-3" />
                <span>Deshacer</span>
              </button>
            </div>
          )}
        </div>
      );
    }

    // Acción fallida o desconocida
    return (
      <div
        key={action.id}
        className="mt-2 bg-zinc-950/90 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-300 space-y-1"
      >
        <div className="flex items-center gap-1.5 text-red-400 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{action.etiqueta}</span>
        </div>
        {action.error && (
          <div className="text-[11px] text-zinc-400 leading-relaxed font-sans">
            {action.error}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end">
      {/* Panel de Chat Abierto con Redimensionado */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Chat con Astro"
          style={{
            width: `min(${size.width}px, calc(100vw - 2rem))`,
            height: `min(${size.height}px, calc(100dvh - 5rem))`,
          }}
          className="relative mb-3 flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150 transition-[width,height] ease-out"
        >
          {/* Tirador de Redimensión en Esquina Superior Izquierda (Desktop) */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onDoubleClick={handleDoubleClickHandle}
            title="Arrastrar para redimensionar · Doble clic para restablecer"
            className="hidden sm:flex absolute top-0 left-0 w-4 h-4 cursor-nwse-resize select-none touch-none z-20 items-center justify-center group"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              className="text-zinc-600 group-hover:text-zinc-400 transition-colors pointer-events-none"
            >
              <line
                x1="2"
                y1="10"
                x2="10"
                y2="2"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <line
                x1="2"
                y1="6"
                x2="6"
                y2="2"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <line
                x1="6"
                y1="10"
                x2="10"
                y2="6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Cabecera del Dock */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-zinc-900/95 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-7 h-7 bg-zinc-950 rounded border border-zinc-800">
                <AssistantAvatar size="sm" state={avatarState} />
              </div>
              <div>
                <div className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
                  <span>Astro</span>
                  <span className="text-[10px] text-zinc-400 font-normal">· Asistente</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Botón para abrir modal de resumen semanal y conexión */}
              <button
                type="button"
                onClick={onOpenModal}
                className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                title="Abrir resumen semanal y conexión"
              >
                <FileText className="w-3.5 h-3.5" />
              </button>

              {/* Botón Maximizar / Restaurar */}
              <button
                type="button"
                onClick={handleToggleMaximize}
                className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                title={isMaximized ? 'Restaurar tamaño' : 'Maximizar'}
              >
                {isMaximized ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>

              {chatMessages.length > 0 && (
                <button
                  type="button"
                  onClick={onClearChatMessages}
                  className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                  title="Limpiar conversación"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                title="Minimizar (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Lista de Mensajes */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3.5 bg-zinc-950/60">
            {chatMessages.length === 0 ? (
              /* Estado vacío con Astro */
              <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-3">
                <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800">
                  <AssistantAvatar size="lg" state={avatarState} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-zinc-100">
                    ¡Hola, Erick! Soy Astro. ¿En qué te ayudo hoy?
                  </h3>
                  <p className="text-[11px] text-zinc-400 max-w-[260px] leading-relaxed">
                    Puedo agendar eventos, organizar repasos o crear notas académicas.
                  </p>
                </div>

                <div className="w-full space-y-1.5 pt-1 text-left">
                  {QUICK_SUGGESTIONS.map((sug, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSendMessage(sug)}
                      className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:text-zinc-100 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col space-y-1 ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    {/* Encabezado del mensaje */}
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 px-1 font-mono">
                      <span>{msg.role === 'user' ? 'Tú' : 'Astro'}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {new Date(msg.timestamp).toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Contenido con avatar para Astro */}
                    <div
                      className={`flex items-start gap-2 max-w-[90%] ${
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="mt-0.5 shrink-0">
                          <AssistantAvatar size="sm" state="idle" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div
                          className={`relative group rounded-lg p-3 text-xs leading-relaxed whitespace-pre-wrap font-sans ${
                            msg.role === 'user'
                              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                              : 'bg-zinc-900 text-zinc-200 border border-zinc-800 border-l-2 border-l-[#4a74da]'
                          }`}
                        >
                          {/* Limpieza estricta de formato markdown para Astro; texto de usuario intacto */}
                          {msg.role === 'assistant'
                            ? cleanAssistantText(msg.content)
                            : msg.content}

                          {msg.role === 'assistant' && (
                            <button
                              type="button"
                              onClick={() => handleCopy(cleanAssistantText(msg.content), msg.id)}
                              className="absolute top-1.5 right-1.5 p-1 text-zinc-500 hover:text-zinc-300 bg-zinc-900/90 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              title="Copiar"
                            >
                              {copiedId === msg.id ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>

                        {/* Renderizar tarjetas de acciones de Astro */}
                        {msg.role === 'assistant' &&
                          msg.actions &&
                          msg.actions.length > 0 && (
                            <div className="space-y-1.5">
                              {msg.actions.map((action) => renderActionCard(action))}
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                ))}

                {isChatSending && (
                  <div className="flex items-start gap-2">
                    <AssistantAvatar size="sm" state="thinking" />
                    <div className="bg-zinc-900 text-zinc-400 border border-zinc-800 border-l-2 border-l-[#4a74da] rounded-lg p-2.5 text-xs italic">
                      Astro está pensando...
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Entrada de texto */}
          <div className="p-2.5 bg-zinc-900/95 border-t border-zinc-800 shrink-0">
            <div className="flex items-end gap-1.5 bg-zinc-950 border border-zinc-800 rounded-lg p-1.5 focus-within:border-[#4a74da] transition-colors">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pregúntale a Astro..."
                rows={1}
                disabled={isChatSending}
                className="flex-1 bg-transparent text-xs text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none p-1 max-h-24 leading-relaxed font-sans"
              />

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isChatSending}
                className="p-1.5 text-white bg-[#4a74da] hover:bg-[#3f68c9] active:bg-[#2b4a9a] disabled:opacity-30 disabled:cursor-not-allowed rounded-md transition-colors shrink-0 cursor-pointer"
                title="Enviar (Enter)"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center justify-between mt-1 px-0.5 text-[10px] text-zinc-400 font-mono">
              <span>Enter envía · Shift+Enter línea</span>
              <span>Ctrl+J alternar</span>
            </div>
          </div>
        </div>
      )}

      {/* Botón Circular Flotante (Dock cerrado / toggle) */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-label="Abrir chat con Astro"
        title="Abrir chat con Astro (Ctrl+J)"
        className={`relative flex items-center justify-center w-12 h-12 rounded-full bg-zinc-900 hover:bg-zinc-850 active:bg-zinc-800 border border-zinc-800 shadow-xl transition-all cursor-pointer ${
          isOpen ? 'ring-2 ring-[#4a74da]/50' : ''
        }`}
      >
        <AssistantAvatar size="md" state={avatarState} />

        {/* Punto azul de mensaje nuevo no leído */}
        {!isOpen && hasUnread && (
          <span
            className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#4a74da] ring-2 ring-zinc-950"
            aria-label="Nuevo mensaje"
          />
        )}
      </button>
    </div>
  );
};
