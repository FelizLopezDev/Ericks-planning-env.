import { useState, useEffect, useRef, useCallback } from 'react';
import { TimerStatus } from '../types';
import { playGentleChime } from '../utils/audioAlert';

export function useFocusTimer() {
  const [durationMinutes, setDurationMinutes] = useState<number>(25);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(25 * 60);
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [targetEndTime, setTargetEndTime] = useState<number | null>(null);

  const targetEndTimeRef = useRef<number | null>(null);
  targetEndTimeRef.current = targetEndTime;

  const statusRef = useRef<TimerStatus>(status);
  statusRef.current = status;

  // Actualización de minutos base
  const setMinutes = useCallback((minutes: number) => {
    const validMinutes = Math.max(1, Math.min(180, Math.floor(minutes) || 1));
    setDurationMinutes(validMinutes);
    if (statusRef.current === 'idle' || statusRef.current === 'completed') {
      setRemainingSeconds(validMinutes * 60);
      setStatus('idle');
      setTargetEndTime(null);
    }
  }, []);

  // Iniciar temporizador
  const startTimer = useCallback(() => {
    const totalSecs = statusRef.current === 'completed' || statusRef.current === 'idle'
      ? durationMinutes * 60
      : remainingSeconds;

    const target = Date.now() + totalSecs * 1000;
    setTargetEndTime(target);
    setStatus('running');
  }, [durationMinutes, remainingSeconds]);

  // Pausar temporizador
  const pauseTimer = useCallback(() => {
    if (targetEndTimeRef.current) {
      const now = Date.now();
      const currentRemaining = Math.max(0, Math.ceil((targetEndTimeRef.current - now) / 1000));
      setRemainingSeconds(currentRemaining);
    }
    setTargetEndTime(null);
    setStatus('paused');
  }, []);

  // Reanudar temporizador
  const resumeTimer = useCallback(() => {
    const target = Date.now() + remainingSeconds * 1000;
    setTargetEndTime(target);
    setStatus('running');
  }, [remainingSeconds]);

  // Reiniciar temporizador
  const resetTimer = useCallback(() => {
    setTargetEndTime(null);
    setRemainingSeconds(durationMinutes * 60);
    setStatus('idle');
  }, [durationMinutes]);

  // Bucle de sincronización temporal con exactitud de timestamp (resistente a pestañas en segundo plano)
  useEffect(() => {
    if (status !== 'running' || !targetEndTime) return;

    const checkTime = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((targetEndTime - now) / 1000));
      setRemainingSeconds(diff);

      if (diff <= 0) {
        setStatus('completed');
        setTargetEndTime(null);
        playGentleChime();
      }
    };

    // Revisar frecuentemente (cada 250ms) para respuesta visual suave
    const intervalId = window.setInterval(checkTime, 250);

    // Detección cuando la pestaña vuelve al primer plano
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkTime();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [status, targetEndTime]);

  // Formato MM:SS
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return {
    durationMinutes,
    remainingSeconds,
    status,
    formattedTime,
    setMinutes,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
  };
}
