import React, { useEffect, useState } from 'react';
import { X, Play, Pause, RotateCcw } from 'lucide-react';
import { TimerStatus } from '../types';

interface FocusTimerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  status: TimerStatus;
  formattedTime: string;
  durationMinutes: number;
  onSetMinutes: (mins: number) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
}

export const FocusTimerOverlay: React.FC<FocusTimerOverlayProps> = ({
  isOpen,
  onClose,
  status,
  formattedTime,
  durationMinutes,
  onSetMinutes,
  onStart,
  onPause,
  onResume,
  onReset,
}) => {
  const [manualInput, setManualInput] = useState<string>(String(durationMinutes));

  useEffect(() => {
    setManualInput(String(durationMinutes));
  }, [durationMinutes]);

  // Tecla Escape para salir de pantalla completa
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

  const handleManualMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setManualInput(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 360) {
      onSetMinutes(parsed);
    }
  };

  const handleAdjustMinutes = (delta: number) => {
    const next = Math.max(1, Math.min(360, durationMinutes + delta));
    setManualInput(String(next));
    onSetMinutes(next);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-zinc-950 flex flex-col justify-between p-6 sm:p-12 animate-in fade-in duration-200 select-none"
      role="dialog"
      aria-label="Temporizador de concentración a pantalla completa"
    >
      {/* Barra superior de la pantalla completa */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-end">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800 rounded-md transition-colors"
          title="Regresar al calendario (el temporizador seguirá activo)"
        >
          <span>Cerrar</span>
          <span className="text-[10px] font-mono text-zinc-500 ml-1">Esc</span>
          <X className="w-4 h-4 ml-0.5" />
        </button>
      </div>

      {/* Zona central: Reloj gigante y controles */}
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center text-center my-auto">
        {/* Reloj minimalista gigante */}
        <div className="font-mono tabular-nums tracking-tighter text-7xl sm:text-9xl md:text-[11rem] font-light text-zinc-100 transition-all">
          {formattedTime}
        </div>

        {/* Indicador exclusivo de tiempo concluido */}
        {status === 'completed' && (
          <div className="mt-4 mb-8 inline-flex items-center gap-2 px-3 py-1 rounded bg-zinc-900 border border-zinc-700 text-zinc-100">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm sm:text-base font-medium">
              ¡El tiempo de concentración ha terminado!
            </span>
          </div>
        )}

        {status !== 'completed' && <div className="h-6 mb-6" />}

        {/* Configuración manual de duración (solo cuando no está corriendo ni pausado) */}
        {(status === 'idle' || status === 'completed') && (
          <div className="flex items-center gap-2 mb-8 bg-zinc-900/60 border border-zinc-800 rounded-lg p-2 px-3">
            <span className="text-xs text-zinc-400">Duración:</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleAdjustMinutes(-5)}
                className="w-7 h-7 text-xs font-mono text-zinc-300 hover:text-white hover:bg-zinc-800 rounded flex items-center justify-center transition-colors"
                title="Restar 5 minutos"
              >
                -5
              </button>
              <input
                type="number"
                min="1"
                max="360"
                value={manualInput}
                onChange={handleManualMinutesChange}
                className="w-16 px-2 py-1 text-center font-mono text-sm bg-zinc-950 border border-zinc-800 rounded text-zinc-100 focus:outline-none focus:border-zinc-500"
              />
              <button
                onClick={() => handleAdjustMinutes(5)}
                className="w-7 h-7 text-xs font-mono text-zinc-300 hover:text-white hover:bg-zinc-800 rounded flex items-center justify-center transition-colors"
                title="Sumar 5 minutos"
              >
                +5
              </button>
            </div>
            <span className="text-xs text-zinc-400">minutos</span>
          </div>
        )}

        {/* Botones de control según el estado */}
        <div className="flex items-center justify-center gap-3">
          {status === 'idle' && (
            <button
              onClick={onStart}
              className="flex items-center gap-2 px-8 py-3.5 text-sm font-medium text-zinc-950 bg-zinc-100 hover:bg-white rounded-lg transition-colors shadow-lg"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Iniciar cuenta regresiva</span>
            </button>
          )}

          {status === 'running' && (
            <>
              <button
                onClick={onPause}
                className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-zinc-100 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-lg transition-colors"
              >
                <Pause className="w-4 h-4 fill-current" />
                <span>Pausar</span>
              </button>
              <button
                onClick={onReset}
                className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors"
                title="Reiniciar temporizador"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reiniciar</span>
              </button>
            </>
          )}

          {status === 'paused' && (
            <>
              <button
                onClick={onResume}
                className="flex items-center gap-2 px-8 py-3 text-sm font-medium text-zinc-950 bg-zinc-100 hover:bg-white rounded-lg transition-colors shadow-lg"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Reanudar</span>
              </button>
              <button
                onClick={onReset}
                className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors"
                title="Reiniciar temporizador"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reiniciar</span>
              </button>
            </>
          )}

          {status === 'completed' && (
            <>
              <button
                onClick={onReset}
                className="flex items-center gap-2 px-8 py-3 text-sm font-medium text-zinc-950 bg-zinc-100 hover:bg-white rounded-lg transition-colors shadow-lg"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reiniciar sesión</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
