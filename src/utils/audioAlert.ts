/**
 * Generador de tono sutil y minimalista mediante Web Audio API
 * No requiere archivos de audio externos ni descargas de red.
 */
export function playGentleChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Primer armónico suave (Frecuencia 587.33 Hz - Re 5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.5); // Sube a La 5

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 1.2);

    // Segundo armónico complementario
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.15);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.7);

    gain2.gain.setValueAtTime(0.001, now + 0.15);
    gain2.gain.linearRampToValueAtTime(0.15, now + 0.22);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.15);
    osc2.stop(now + 1.4);
  } catch {
    // Si el navegador tiene políticas estrictas de audio, se degrada silenciosamente
  }
}
