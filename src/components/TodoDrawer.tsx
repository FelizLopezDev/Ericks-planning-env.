import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Check, Trash2 } from 'lucide-react';
import { TodoTask } from '../types';

interface TodoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TodoTask[];
  onAddTask: (text: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onClearCompleted: () => void;
}

export const TodoDrawer: React.FC<TodoDrawerProps> = ({
  isOpen,
  onClose,
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onClearCompleted,
}) => {
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Foco en el input al abrir el panel
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onAddTask(inputText.trim());
    setInputText('');
  };

  const pendingCount = tasks.filter((t) => !t.completed).length;
  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
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
          aria-label="Lista de tareas pendientes"
        >
          {/* Cabecera del panel */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/90">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-zinc-100">
                Lista de tareas
              </h2>
              {pendingCount > 0 && (
                <span className="text-[11px] font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                  {pendingCount} pendientes
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-zinc-100 rounded hover:bg-zinc-800 transition-colors"
              aria-label="Cerrar panel de tareas"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Formulario de entrada rápida */}
          <div className="p-4 border-b border-zinc-800/80 bg-zinc-950/40">
            <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Añadir una tarea y presionar Enter..."
                className="flex-1 px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-2 text-zinc-900 bg-zinc-100 hover:bg-white disabled:opacity-40 disabled:hover:bg-zinc-100 rounded-md transition-colors"
                title="Añadir tarea"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Lista de tareas */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
                <div className="w-10 h-10 rounded-full bg-zinc-800/60 flex items-center justify-center text-zinc-400 mb-3">
                  <Check className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-medium text-zinc-300 mb-1">
                  No hay tareas registradas
                </h3>
                <p className="text-xs text-zinc-500 max-w-xs">
                  Escribe una tarea arriba para comenzar tu lista de pendientes.
                </p>
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center justify-between gap-3 p-3 rounded-lg border transition-all group ${
                    task.completed
                      ? 'bg-zinc-950/40 border-zinc-800/40 opacity-70'
                      : 'bg-zinc-950/70 border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <label className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                    <button
                      type="button"
                      onClick={() => onToggleTask(task.id)}
                      className={`w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${
                        task.completed
                          ? 'bg-zinc-100 border-zinc-100 text-zinc-950'
                          : 'border-zinc-700 hover:border-zinc-400 bg-transparent'
                      }`}
                      aria-label={task.completed ? 'Marcar como pendiente' : 'Marcar como completada'}
                    >
                      {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>

                    <span
                      className={`text-sm break-words flex-1 transition-all ${
                        task.completed
                          ? 'line-through text-zinc-500'
                          : 'text-zinc-200'
                      }`}
                    >
                      {task.text}
                    </span>
                  </label>

                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className="p-1 text-zinc-500 hover:text-rose-400 opacity-60 group-hover:opacity-100 transition-all rounded hover:bg-zinc-800"
                    title="Eliminar tarea"
                    aria-label="Eliminar tarea"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Pie de página con limpieza de tareas completadas */}
          {completedCount > 0 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800 bg-zinc-900/90 text-xs">
              <span className="text-zinc-500 font-mono">
                {completedCount} completada{completedCount > 1 ? 's' : ''}
              </span>
              <button
                onClick={onClearCompleted}
                className="text-zinc-400 hover:text-zinc-200 font-medium transition-colors"
                title="Eliminar todas las tareas completadas de la lista"
              >
                Limpiar completadas
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
