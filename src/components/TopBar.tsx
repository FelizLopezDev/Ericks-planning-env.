import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Timer,
  Calendar,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { TimerStatus } from '../types';
import { AssistantAvatar } from './AssistantAvatar';

interface TopBarProps {
  onOpenAgent: () => void;
  onOpenNotes: () => void;
  notesCount: number;
  onOpenTimer: () => void;
  timerStatus: TimerStatus;
  timerFormattedTime: string;
}

const EXTERNAL_LINKS = [
  {
    name: 'PVA',
    url: 'https://campusvirtual.pucmm.edu.do/moodle/login/index.php',
    title: 'Campus Virtual (PVA PUCMM)',
  },
  {
    name: 'Outlook',
    url: 'https://outlook.cloud.microsoft/mail/',
    title: 'Correo Institucional (Outlook)',
  },
  {
    name: 'Docs',
    url: 'https://docs.google.com/document/u/0/',
    title: 'Google Docs',
  },
  {
    name: 'Drive',
    url: 'https://drive.google.com/drive/home',
    title: 'Google Drive',
  },
  {
    name: 'Gmail',
    url: 'https://mail.google.com/mail/u/0/#inbox',
    title: 'Gmail',
  },
  {
    name: 'Music',
    url: 'https://music.youtube.com/',
    title: 'YouTube Music',
  },
  {
    name: 'Github',
    url: 'https://github.com/FelizLopezDev',
    title: 'GitHub (FelizLopezDev)',
  },
];

const AI_LINKS = [
  {
    name: 'GPT',
    url: 'https://chatgpt.com/',
    title: 'ChatGPT',
  },
  {
    name: 'Claude',
    url: 'https://claude.ai/new',
    title: 'Claude AI',
  },
  {
    name: 'Gemini',
    url: 'https://gemini.google.com/app',
    title: 'Google Gemini',
  },
  {
    name: 'Grok',
    url: 'https://grok.com/',
    title: 'Grok',
  },
];

export const TopBar: React.FC<TopBarProps> = ({
  onOpenAgent,
  onOpenNotes,
  notesCount,
  onOpenTimer,
  timerStatus,
  timerFormattedTime,
}) => {
  const [isAiMenuOpen, setIsAiMenuOpen] = useState(false);
  const aiMenuRef = useRef<HTMLDivElement>(null);

  // Cerrar el menú vertical de AI al hacer clic fuera o presionar Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (aiMenuRef.current && !aiMenuRef.current.contains(e.target as Node)) {
        setIsAiMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAiMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur px-3 sm:px-6 py-2.5 gap-2">
      {/* Zona 1: Título o marca de la aplicación y Agente estático derivado del icono */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-zinc-400" />
          <span className="text-base font-semibold tracking-tight text-zinc-100 whitespace-nowrap">
            Erick's Planner
          </span>
        </div>

        {/* Asistente Astro al lado de Erick's Planner */}
        <button
          type="button"
          onClick={onOpenAgent}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:text-zinc-100 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-md transition-colors cursor-pointer group"
          title="Abrir chat con Astro"
          aria-label="Abrir chat con Astro"
        >
          <AssistantAvatar size="sm" state="idle" />
          <span className="hidden xs:inline">Astro</span>
        </button>
      </div>

      {/* Zona 2: Accesos directos externos, menú vertical AI y herramientas */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
        {/* Enlaces externos estándar: PVA, Outlook, Docs, Drive, Gmail, Music, Github */}
        <div className="flex items-center gap-1 bg-zinc-900/50 p-0.5 rounded-md border border-zinc-850">
          {EXTERNAL_LINKS.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
              title={`${link.title} (Abre en nueva pestaña)`}
            >
              <span>{link.name}</span>
              <ExternalLink className="w-2.5 h-2.5 text-zinc-500" />
            </a>
          ))}
        </div>

        {/* Botón "AI" con barra vertical desplegable para GPT, Claude y Gemini */}
        <div ref={aiMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsAiMenuOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors ${
              isAiMenuOpen
                ? 'bg-zinc-800 text-zinc-100 border-zinc-700'
                : 'bg-zinc-900/80 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 border-zinc-800'
            }`}
            title="Herramientas de Inteligencia Artificial (GPT, Claude, Gemini)"
            aria-expanded={isAiMenuOpen}
          >
            <span>AI</span>
            <ChevronDown
              className={`w-3 h-3 text-zinc-500 transition-transform duration-150 ${
                isAiMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Menú en barra vertical desplegable */}
          {isAiMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 z-50 w-36 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl p-1 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
              {AI_LINKS.map((item) => (
                <a
                  key={item.name}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsAiMenuOpen(false)}
                  className="flex items-center justify-between px-2.5 py-2 text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-colors"
                  title={`${item.title} (Abre en nueva pestaña)`}
                >
                  <span className="font-semibold">{item.name}</span>
                  <ExternalLink className="w-3 h-3 text-zinc-500" />
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

        {/* Herramientas de la aplicación: Notas y Enfoque */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenNotes}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:text-zinc-100 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 rounded-md transition-colors"
            title="Abrir cuaderno de notas por cuatrimestres"
          >
            <FileText className="w-3.5 h-3.5 text-zinc-400" />
            <span>Notas</span>
            {notesCount > 0 && (
              <span className="text-[10px] text-zinc-400 tabular-nums font-mono ml-0.5">
                ({notesCount})
              </span>
            )}
          </button>

          <button
            onClick={onOpenTimer}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors ${
              timerStatus === 'running'
                ? 'text-emerald-300 bg-emerald-950/40 border-emerald-800/80 hover:bg-emerald-950/60'
                : timerStatus === 'paused'
                ? 'text-amber-300 bg-amber-950/40 border-amber-800/80 hover:bg-amber-950/60'
                : 'text-zinc-300 hover:text-zinc-100 bg-zinc-900/80 hover:bg-zinc-800 border-zinc-800'
            }`}
            title="Abrir temporizador de concentración"
          >
            <Timer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Enfoque</span>
            {timerStatus !== 'idle' && (
              <span className="font-mono tabular-nums text-[11px] ml-0.5">
                {timerFormattedTime}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
