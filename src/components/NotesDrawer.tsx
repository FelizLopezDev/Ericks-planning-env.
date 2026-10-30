import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Check, ArrowLeft } from 'lucide-react';
import { PersonalNote } from '../types';

interface NotesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notes: PersonalNote[];
  onAddNote: (title: string, content: string) => void;
  onUpdateNote: (id: string, title: string, content: string) => void;
  onDeleteNote: (id: string) => void;
}

export const NotesDrawer: React.FC<NotesDrawerProps> = ({
  isOpen,
  onClose,
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}) => {
  // Estado interno para crear o editar una nota
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isCreatingNew || editingNoteId) {
          handleCancelForm();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isCreatingNew, editingNoteId, onClose]);

  if (!isOpen) return null;

  const handleStartCreate = () => {
    setIsCreatingNew(true);
    setEditingNoteId(null);
    setFormTitle('');
    setFormContent('');
    setDeleteConfirmId(null);
  };

  const handleStartEdit = (note: PersonalNote) => {
    setEditingNoteId(note.id);
    setIsCreatingNew(false);
    setFormTitle(note.title);
    setFormContent(note.content);
    setDeleteConfirmId(null);
  };

  const handleCancelForm = () => {
    setIsCreatingNew(false);
    setEditingNoteId(null);
    setFormTitle('');
    setFormContent('');
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = formTitle.trim() || 'Nota sin título';
    const cleanContent = formContent.trim();

    if (isCreatingNew) {
      onAddNote(cleanTitle, cleanContent);
    } else if (editingNoteId) {
      onUpdateNote(editingNoteId, cleanTitle, cleanContent);
    }

    handleCancelForm();
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Fondo atenuado (Backdrop) */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel lateral deslizable desde la derecha */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <aside
          className="w-screen max-w-md bg-zinc-900 border-l border-zinc-800 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
          role="dialog"
          aria-label="Bloc de notas personales"
        >
          {/* Cabecera del panel */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/90">
            <div className="flex items-center gap-2">
              {(isCreatingNew || editingNoteId) && (
                <button
                  onClick={handleCancelForm}
                  className="p-1 -ml-1 text-zinc-400 hover:text-zinc-100 rounded transition-colors"
                  title="Volver a la lista de notas"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <h2 className="text-sm font-semibold text-zinc-100">
                {isCreatingNew
                  ? 'Nueva nota'
                  : editingNoteId
                  ? 'Editar nota'
                  : 'Bloc de notas'}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {!isCreatingNew && !editingNoteId && (
                <button
                  onClick={handleStartCreate}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-zinc-900 bg-zinc-100 hover:bg-white rounded transition-colors shadow-sm"
                  title="Crear una nueva nota"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar nota</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 text-zinc-400 hover:text-zinc-100 rounded hover:bg-zinc-800 transition-colors"
                aria-label="Cerrar panel de notas"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Cuerpo: Formulario de creación/edición O Lista de notas */}
          <div className="flex-1 overflow-y-auto p-5">
            {isCreatingNew || editingNoteId ? (
              /* Formulario de nota */
              <form onSubmit={handleSaveForm} className="flex flex-col h-full space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Título
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Título de la nota..."
                    className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
                  />
                </div>

                <div className="flex-1 flex flex-col min-h-[220px]">
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Texto libre
                  </label>
                  <textarea
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="Escribe tus pensamientos, ideas, tareas y recordatorios aquí..."
                    rows={12}
                    className="w-full flex-1 p-3 text-sm bg-zinc-950 border border-zinc-800 rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors resize-none font-normal leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-zinc-900 bg-zinc-100 hover:bg-white rounded-md transition-colors shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Guardar nota</span>
                  </button>
                </div>
              </form>
            ) : notes.length === 0 ? (
              /* Estado vacío */
              <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
                <div className="w-12 h-12 rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-400 mb-4">
                  <Plus className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-medium text-zinc-200 mb-1">
                  Sin notas guardadas
                </h3>
                <p className="text-xs text-zinc-400 max-w-xs mb-5">
                  Utiliza este espacio personal para volcar pensamientos, ideas o recordatorios en texto libre.
                </p>
                <button
                  onClick={handleStartCreate}
                  className="px-4 py-2 text-xs font-medium text-zinc-900 bg-zinc-100 hover:bg-white rounded-md transition-colors"
                >
                  Agregar nota
                </button>
              </div>
            ) : (
              /* Lista de notas */
              <div className="space-y-3">
                {notes.map((note) => (
                  <article
                    key={note.id}
                    className="p-4 rounded-lg bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700 transition-colors group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-white leading-snug">
                          {note.title}
                        </h3>

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => handleStartEdit(note)}
                            className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
                            title="Editar nota"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {deleteConfirmId === note.id ? (
                            <div className="flex items-center gap-1 bg-zinc-900 px-1 py-0.5 rounded border border-rose-900/60">
                              <button
                                onClick={() => {
                                  onDeleteNote(note.id);
                                  setDeleteConfirmId(null);
                                }}
                                className="text-[10px] text-rose-400 hover:text-rose-300 font-medium px-1"
                              >
                                Borrar
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="text-[10px] text-zinc-500 hover:text-zinc-300 px-1"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(note.id)}
                              className="p-1 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded transition-colors"
                              title="Eliminar nota"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {note.content && (
                        <p className="text-xs text-zinc-300 whitespace-pre-wrap font-normal leading-relaxed line-clamp-6">
                          {note.content}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-zinc-900 text-[10px] font-mono text-zinc-400">
                      Actualizada: {formatDate(note.updatedAt)}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
