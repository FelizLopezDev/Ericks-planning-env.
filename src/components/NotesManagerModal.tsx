import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Plus,
  Folder,
  FolderOpen,
  FileText,
  Trash2,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Check,
  Undo2,
} from 'lucide-react';
import { TermFolder, AcademicNote } from '../types';
import { AssistantAvatar } from './AssistantAvatar';

interface NotesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  terms: TermFolder[];
  notes: AcademicNote[];
  onAddTerm: (name: string) => void;
  onAddSubject: (termId: string, name: string) => void;
  onDeleteSubject: (termId: string, subjectId: string) => void;
  onDeleteTerm: (termId: string) => void;
  onAddNote: (termId: string, subjectId: string, title: string, content: string) => void;
  onUpdateNote: (id: string, title: string, content: string) => void;
  onDeleteNote: (id: string) => void;
  insetRight?: number;
  insetBottom?: number;
  isDockOpen?: boolean;
  onToggleDock?: () => void;
  onSelectionChange?: (sel: {
    termId: string | null;
    subjectId: string | null;
    noteId: string | null;
  }) => void;
  requestedSelection?: {
    termId: string;
    subjectId: string;
    noteId: string;
    nonce: number;
  } | null;
  isResizingDock?: boolean;
  onUndoLastAstroEdit?: () => void;
}

export const NotesManagerModal: React.FC<NotesManagerModalProps> = ({
  isOpen,
  onClose,
  terms,
  notes,
  onAddTerm,
  onAddSubject,
  onDeleteSubject,
  onDeleteTerm,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  insetRight = 0,
  insetBottom = 0,
  isDockOpen = false,
  onToggleDock,
  onSelectionChange,
  requestedSelection,
  isResizingDock = false,
  onUndoLastAstroEdit,
}) => {
  // Cuatrimestre y materia seleccionada
  const [selectedTermId, setSelectedTermId] = useState<string>(() => terms[0]?.id || '');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    () => terms[0]?.subjects[0]?.id || ''
  );

  // Nota actualmente seleccionada para edición
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // Estados para creación rápida de carpetas
  const [isAddingTerm, setIsAddingTerm] = useState(false);
  const [newTermName, setNewTermName] = useState('');
  const [addingSubjectForTermId, setAddingSubjectForTermId] = useState<string | null>(null);
  const [newSubjectName, setNewSubjectName] = useState('');

  // Estado para retraer / desplegar carpetas de cuatrimestre
  const [collapsedTerms, setCollapsedTerms] = useState<Record<string, boolean>>({});

  const toggleTermCollapse = (termId: string) => {
    setCollapsedTerms((prev) => ({
      ...prev,
      [termId]: !prev[termId],
    }));
  };

  // Estado del editor de la nota seleccionada
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [savedFeedback, setSavedFeedback] = useState(false);

  // Destello y aviso cuando Astro añade texto a la nota activa
  const [astroEditAlert, setAstroEditAlert] = useState(false);
  const prevNoteContentRef = useRef<Record<string, string>>({});

  // Sincronizar selección inicial
  useEffect(() => {
    if (terms.length > 0 && !selectedTermId) {
      setSelectedTermId(terms[0].id);
      if (terms[0].subjects.length > 0) {
        setSelectedSubjectId(terms[0].subjects[0].id);
      }
    }
  }, [terms, selectedTermId]);

  // Reportar cambios de selección a App.tsx para que Astro conozca el contexto activo
  useEffect(() => {
    if (isOpen) {
      onSelectionChange?.({
        termId: selectedTermId || null,
        subjectId: selectedSubjectId || null,
        noteId: selectedNoteId || null,
      });
    } else {
      onSelectionChange?.({
        termId: null,
        subjectId: null,
        noteId: null,
      });
    }
  }, [isOpen, selectedTermId, selectedSubjectId, selectedNoteId, onSelectionChange]);

  // Responder a selección solicitada desde Astro (por ejemplo al crear una nota nueva o guardar mensaje como nota)
  useEffect(() => {
    if (!requestedSelection) return;
    const { termId, subjectId, noteId } = requestedSelection;
    if (termId) setSelectedTermId(termId);
    if (subjectId) setSelectedSubjectId(subjectId);
    if (noteId) {
      setSelectedNoteId(noteId);
      const targetNote = notes.find((n) => n.id === noteId);
      if (targetNote) {
        setEditorTitle(targetNote.title);
        setEditorContent(targetNote.content);
      }
    }
  }, [requestedSelection?.nonce]);

  // Sincronización del editor: si la nota que se está editando recibe texto nuevo desde Astro (agregar_a_nota),
  // el editor textarea se actualiza inmediatamente (stored.content !== editorContent) sin perder foco
  useEffect(() => {
    if (!selectedNoteId) return;
    const stored = notes.find((n) => n.id === selectedNoteId);
    if (!stored) return;

    const previous = prevNoteContentRef.current[selectedNoteId];
    if (previous !== undefined && stored.content !== previous) {
      // Si el contenido almacenado cambió externamente
      if (stored.content !== editorContent) {
        setEditorContent(stored.content);
        setEditorTitle(stored.title);
        setAstroEditAlert(true);
        const timer = setTimeout(() => {
          setAstroEditAlert(false);
        }, 3500);
        return () => clearTimeout(timer);
      }
    }
    prevNoteContentRef.current[selectedNoteId] = stored.content;
  }, [notes, selectedNoteId, editorContent]);

  // Notas filtradas para la materia activa
  const subjectNotes = useMemo(() => {
    return notes.filter(
      (n) => n.termId === selectedTermId && n.subjectId === selectedSubjectId
    );
  }, [notes, selectedTermId, selectedSubjectId]);

  // Si cambia de materia y la nota seleccionada no pertenece a ella, seleccionar la primera disponible o null
  useEffect(() => {
    if (subjectNotes.length > 0) {
      const exists = subjectNotes.some((n) => n.id === selectedNoteId);
      if (!exists) {
        setSelectedNoteId(subjectNotes[0].id);
        setEditorTitle(subjectNotes[0].title);
        setEditorContent(subjectNotes[0].content);
      }
    } else {
      setSelectedNoteId(null);
      setEditorTitle('');
      setEditorContent('');
    }
  }, [subjectNotes, selectedNoteId]);

  // Cargar contenido al seleccionar una nota
  const handleSelectNote = (note: AcademicNote) => {
    setSelectedNoteId(note.id);
    setEditorTitle(note.title);
    setEditorContent(note.content);
    setSavedFeedback(false);
  };

  // Guardar cambios en la nota activa
  const handleSaveCurrentNote = () => {
    if (!selectedNoteId) return;
    onUpdateNote(selectedNoteId, editorTitle, editorContent);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 1500);
  };

  // Crear una nueva nota en la materia actual
  const handleCreateNote = () => {
    if (!selectedTermId || !selectedSubjectId) return;
    const defaultTitle = 'Nueva nota';
    const defaultContent = '';
    onAddNote(selectedTermId, selectedSubjectId, defaultTitle, defaultContent);
  };

  // Confirmar creación de nuevo cuatrimestre
  const handleConfirmAddTerm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTermName.trim()) return;
    onAddTerm(newTermName.trim());
    setNewTermName('');
    setIsAddingTerm(false);
  };

  // Confirmar creación de nueva materia
  const handleConfirmAddSubject = (termId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    onAddSubject(termId, newSubjectName.trim());
    setNewSubjectName('');
    setAddingSubjectForTermId(null);
  };

  // Cerrar con Escape: ignorar si el evento se originó dentro de Astro dock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        const targetEl = e.target as HTMLElement | null;
        if (targetEl && targetEl.closest?.('[data-assistant-dock]')) {
          return;
        }
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentTerm = terms.find((t) => t.id === selectedTermId);
  const currentSubject = currentTerm?.subjects.find((s) => s.id === selectedSubjectId);

  return (
    <div
      className={`fixed top-0 left-0 z-50 bg-zinc-950 flex flex-col select-none overflow-hidden ${
        isResizingDock ? '' : 'transition-[right,bottom] duration-150 ease-out'
      }`}
      style={{
        right: `${insetRight}px`,
        bottom: `${insetBottom}px`,
      }}
      role="dialog"
      aria-label="Panel completo de notas por carpetas"
    >
      {/* Barra superior de navegación */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur">
        <div className="flex items-center gap-3">
          <BookOpen className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-semibold text-zinc-100">
            Cuaderno de notas
          </span>
          {currentTerm && currentSubject && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400">
              <span>/</span>
              <span className="text-zinc-300">{currentTerm.name}</span>
              <span>/</span>
              <span className="text-zinc-100 font-medium">{currentSubject.name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Botón Astro para alternar el dock flotante o lateral */}
          {onToggleDock && (
            <button
              type="button"
              onClick={onToggleDock}
              className={`flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-all cursor-pointer ${
                isDockOpen
                  ? 'bg-zinc-800 text-zinc-100 border-[#4a74da]/60 shadow-sm'
                  : 'bg-zinc-900/80 text-zinc-300 hover:text-white hover:bg-zinc-800 border-zinc-800'
              }`}
              title="Abrir o alternar chat con Astro (Ctrl+J)"
            >
              <AssistantAvatar size="sm" state="idle" />
              <span>Astro</span>
              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-950/60 px-1 py-0.5 rounded border border-zinc-800">
                Ctrl+J
              </span>
            </button>
          )}

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-800 rounded-md transition-colors"
            title="Regresar al calendario"
          >
            <span>Cerrar</span>
            <span className="text-[10px] font-mono text-zinc-500 ml-1">Esc</span>
            <X className="w-4 h-4 ml-0.5" />
          </button>
        </div>
      </header>

      {/* Contenido dividido en 3 columnas: Carpetas | Lista de notas | Editor */}
      <div className="flex-1 flex overflow-hidden">
        {/* Columna 1: Árbol de carpetas (Cuatrimestres y Materias) */}
        <aside className="w-64 sm:w-72 border-r border-zinc-800 bg-zinc-950 flex flex-col shrink-0">
          <div className="p-3 border-b border-zinc-800/80 flex items-center justify-between text-xs font-semibold tracking-wider text-zinc-300">
            <span>PUCMM</span>
            <button
              onClick={() => setIsAddingTerm(true)}
              className="p-1 hover:text-zinc-100 hover:bg-zinc-900 rounded transition-colors"
              title="Añadir nueva carpeta"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {terms.map((term) => (
              <div key={term.id} className="space-y-1">
                {/* Cabecera del cuatrimestre con flecha retraíble a la izquierda */}
                <div className="flex items-center justify-between px-2 py-1.5 rounded text-xs font-semibold text-zinc-300 hover:bg-zinc-900/60 group">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleTermCollapse(term.id)}
                      className="p-0.5 text-zinc-400 hover:text-zinc-100 rounded hover:bg-zinc-800 transition-colors"
                      title={collapsedTerms[term.id] ? 'Desplegar materias' : 'Retraer materias'}
                      aria-label={collapsedTerms[term.id] ? 'Desplegar materias' : 'Retraer materias'}
                    >
                      {collapsedTerms[term.id] ? (
                        <ChevronRight className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <Folder className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="truncate">{term.name}</span>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setAddingSubjectForTermId(term.id);
                        setCollapsedTerms((prev) => ({ ...prev, [term.id]: false }));
                      }}
                      className="p-0.5 hover:text-zinc-100 rounded"
                      title={`Añadir materia a ${term.name}`}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    {terms.length > 1 && (
                      <button
                        onClick={() => onDeleteTerm(term.id)}
                        className="p-0.5 hover:text-rose-400 rounded"
                        title="Eliminar cuatrimestre"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Subcarpetas de materias (visibles cuando el cuatrimestre no está retraído) */}
                {!collapsedTerms[term.id] && (
                  <div className="space-y-1">
                    {/* Formulario rápido para añadir materia dentro del cuatrimestre */}
                    {addingSubjectForTermId === term.id && (
                      <form
                        onSubmit={(e) => handleConfirmAddSubject(term.id, e)}
                        className="pl-6 pr-2 py-1 flex items-center gap-1"
                      >
                        <input
                          type="text"
                          autoFocus
                          placeholder="Nombre de la materia..."
                          value={newSubjectName}
                          onChange={(e) => setNewSubjectName(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-100 focus:outline-none focus:border-zinc-400"
                        />
                        <button
                          type="submit"
                          className="p-1 text-xs bg-zinc-100 text-zinc-950 rounded hover:bg-white"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddingSubjectForTermId(null)}
                          className="p-1 text-xs text-zinc-400 hover:text-zinc-200"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </form>
                    )}

                    {/* Subcarpetas de materias */}
                    <div className="pl-6 space-y-0.5">
                      {term.subjects.map((subject) => {
                        const isSelected =
                          selectedTermId === term.id && selectedSubjectId === subject.id;
                        return (
                          <div
                            key={subject.id}
                            onClick={() => {
                              setSelectedTermId(term.id);
                              setSelectedSubjectId(subject.id);
                            }}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs cursor-pointer transition-colors group ${
                              isSelected
                                ? 'bg-zinc-800 text-zinc-100 font-medium'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              {isSelected ? (
                                <FolderOpen className="w-3.5 h-3.5 text-zinc-200 shrink-0" />
                              ) : (
                                <Folder className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                              )}
                              <span className="truncate">{subject.name}</span>
                            </div>

                            {term.subjects.length > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteSubject(term.id, subject.id);
                                }}
                                className="p-0.5 text-zinc-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Eliminar materia"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Formulario para añadir nuevo cuatrimestre */}
            {isAddingTerm && (
              <form onSubmit={handleConfirmAddTerm} className="p-2 bg-zinc-900/60 rounded border border-zinc-800 space-y-2">
                <input
                  type="text"
                  autoFocus
                  placeholder="Ej. 2do cuatrimestre..."
                  value={newTermName}
                  onChange={(e) => setNewTermName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-zinc-950 border border-zinc-700 rounded text-zinc-100 focus:outline-none focus:border-zinc-400"
                />
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsAddingTerm(false)}
                    className="px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-2.5 py-1 text-[11px] bg-zinc-100 text-zinc-950 rounded font-medium hover:bg-white"
                  >
                    Crear cuatrimestre
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="p-3 border-t border-zinc-800">
            <button
              onClick={() => setIsAddingTerm(true)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 bg-zinc-900 hover:bg-zinc-850 rounded border border-zinc-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva carpeta</span>
            </button>
          </div>
        </aside>

        {/* Columna 2: Lista de notas de la materia seleccionada */}
        <section className="w-64 sm:w-80 border-r border-zinc-800 bg-zinc-950/60 flex flex-col shrink-0">
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
            <div className="truncate">
              <span className="text-xs font-semibold text-zinc-200 truncate block">
                {currentSubject?.name || 'Materia'}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                {subjectNotes.length} nota{subjectNotes.length !== 1 ? 's' : ''}
              </span>
            </div>

            <button
              onClick={handleCreateNote}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-zinc-950 bg-zinc-100 hover:bg-white rounded transition-colors shadow-sm"
              title="Crear nueva nota en esta materia"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nota</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {subjectNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <FileText className="w-8 h-8 text-zinc-700 mb-2" />
                <p className="text-xs text-zinc-400 mb-3">
                  Sin notas en esta materia
                </p>
                <button
                  onClick={handleCreateNote}
                  className="px-3 py-1.5 text-xs font-medium text-zinc-950 bg-zinc-100 hover:bg-white rounded transition-colors"
                >
                  Crear primera nota
                </button>
              </div>
            ) : (
              subjectNotes.map((note) => {
                const isSelected = selectedNoteId === note.id;
                return (
                  <div
                    key={note.id}
                    onClick={() => handleSelectNote(note)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all group ${
                      isSelected
                        ? 'bg-zinc-800/90 border-zinc-700 text-zinc-100 shadow-sm'
                        : 'bg-zinc-900/40 border-zinc-850 hover:border-zinc-700 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <h4 className="text-xs font-semibold truncate group-hover:text-white">
                        {note.title}
                      </h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteNote(note.id);
                        }}
                        className="p-0.5 text-zinc-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Eliminar nota"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">
                      {note.content || 'Sin contenido adicional...'}
                    </p>

                    <span className="block mt-2 text-[10px] font-mono text-zinc-600">
                      {new Date(note.updatedAt).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Columna 3: Editor de nota a pantalla completa */}
        <main className="flex-1 flex flex-col bg-zinc-950 p-6 sm:p-10 overflow-hidden">
          {selectedNoteId ? (
            <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto space-y-4">
              {/* Barra de título y estado de guardado */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-850">
                <input
                  type="text"
                  value={editorTitle}
                  onChange={(e) => {
                    setEditorTitle(e.target.value);
                    onUpdateNote(selectedNoteId, e.target.value, editorContent);
                  }}
                  placeholder="Título de la nota..."
                  className="text-xl sm:text-2xl font-bold bg-transparent text-zinc-100 placeholder-zinc-600 focus:outline-none flex-1"
                />

                <div className="flex items-center gap-3">
                  {savedFeedback ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 font-mono">
                      <Check className="w-3.5 h-3.5" />
                      <span>Guardado</span>
                    </span>
                  ) : (
                    <button
                      onClick={handleSaveCurrentNote}
                      className="px-3 py-1.5 text-xs font-medium text-zinc-950 bg-zinc-100 hover:bg-white rounded transition-colors shadow-sm"
                    >
                      Guardar
                    </button>
                  )}

                  <button
                    onClick={() => onDeleteNote(selectedNoteId)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 rounded hover:bg-zinc-900 transition-colors"
                    title="Eliminar esta nota"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Aviso sutil cuando Astro añade texto a la nota */}
              {astroEditAlert && (
                <div className="flex items-center justify-between px-3 py-1.5 bg-[#4a74da]/15 border border-[#4a74da]/40 text-xs text-zinc-100 rounded-md animate-in fade-in duration-150">
                  <span className="font-medium text-xs text-zinc-200">Astro agregó texto a esta nota</span>
                  {onUndoLastAstroEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        onUndoLastAstroEdit();
                        setAstroEditAlert(false);
                      }}
                      className="flex items-center gap-1 text-[11px] font-medium text-[#7fa3ff] hover:text-white underline cursor-pointer ml-3"
                    >
                      <Undo2 className="w-3 h-3" />
                      <span>Deshacer</span>
                    </button>
                  )}
                </div>
              )}

              {/* Área de texto libre multilínea para apuntes */}
              <div
                className={`flex-1 flex flex-col rounded-lg transition-colors duration-300 p-1 ${
                  astroEditAlert ? 'bg-[#4a74da]/[0.12] ring-1 ring-[#4a74da]/50' : ''
                }`}
              >
                <textarea
                  data-note-editor="true"
                  value={editorContent}
                  onChange={(e) => {
                    setEditorContent(e.target.value);
                    onUpdateNote(selectedNoteId, editorTitle, e.target.value);
                  }}
                  placeholder="Escribe tus apuntes, resúmenes, fórmulas y tareas de la materia aquí libremente..."
                  className="flex-1 w-full bg-transparent text-sm sm:text-base text-zinc-200 placeholder-zinc-600 focus:outline-none resize-none leading-relaxed font-normal selection:bg-zinc-800"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500">
              <BookOpen className="w-12 h-12 stroke-[1.5] text-zinc-700 mb-3" />
              <h3 className="text-sm font-medium text-zinc-300 mb-1">
                Ninguna nota seleccionada
              </h3>
              <p className="text-xs text-zinc-500 max-w-sm mb-4">
                Elige una nota de la columna izquierda o crea una nueva para {currentSubject?.name || 'esta materia'}.
              </p>
              {currentSubject && (
                <button
                  onClick={handleCreateNote}
                  className="px-4 py-2 text-xs font-medium text-zinc-950 bg-zinc-100 hover:bg-white rounded-md transition-colors"
                >
                  Crear nueva nota
                </button>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
