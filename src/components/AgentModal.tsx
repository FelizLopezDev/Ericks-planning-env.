import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Settings,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar as CalendarIcon,
  BookOpen,
  ArrowRight,
  Server,
  Key,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  CalendarEvent,
  TermFolder,
  AcademicNote,
  OllamaConfig,
  AgentConnectionStatus,
  AgentSummaryData,
} from '../types';
import { AssistantAvatar, AvatarState } from './AssistantAvatar';

interface AgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  weekEvents: CalendarEvent[];
  weekRangeText: string;
  terms: TermFolder[];
  academicNotes: AcademicNote[];
  config: OllamaConfig;
  onUpdateConfig: (partial: Partial<OllamaConfig>) => void;
  connectionStatus: AgentConnectionStatus;
  statusMessage: string;
  availableModels: string[];
  onTestConnection: (override?: Partial<OllamaConfig>) => Promise<{ ok: boolean; models?: string[]; error?: string }>;
  onGenerateSummary: (params: {
    weekEvents: CalendarEvent[];
    weekRangeText: string;
    terms: TermFolder[];
    academicNotes: AcademicNote[];
  }) => Promise<AgentSummaryData | undefined>;
  isGenerating: boolean;
  lastSummary: AgentSummaryData | null;
  error: string | null;
  onClearError: () => void;
}

export const AgentModal: React.FC<AgentModalProps> = ({
  isOpen,
  onClose,
  weekEvents,
  weekRangeText,
  terms,
  academicNotes,
  config,
  onUpdateConfig,
  connectionStatus,
  statusMessage,
  availableModels,
  onTestConnection,
  onGenerateSummary,
  isGenerating,
  lastSummary,
  error,
  onClearError,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'settings'>('summary');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showRawText, setShowRawText] = useState(false);

  // Estados locales para la configuración
  const [localUrl, setLocalUrl] = useState(config.url || 'https://ollama.com');
  const [localModel, setLocalModel] = useState(config.model || 'gemma4:31b');
  const [localApiKey, setLocalApiKey] = useState(config.apiKey || '');

  // Sincronizar estados locales con config
  useEffect(() => {
    if (config.url) {
      setLocalUrl(config.url);
    }
    if (config.model) {
      setLocalModel(config.model);
    }
  }, [config.url, config.model]);

  if (!isOpen) return null;

  const handleSaveSettings = () => {
    onUpdateConfig({
      url: localUrl.trim(),
      model: localModel.trim(),
      apiKey: localApiKey.trim(),
    });
  };

  const handleRunGenerate = () => {
    onClearError();
    onGenerateSummary({
      weekEvents,
      weekRangeText,
      terms,
      academicNotes,
    });
  };

  const avatarState: AvatarState = isGenerating
    ? 'thinking'
    : error
    ? 'error'
    : 'idle';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="agent-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Cabecera del Modal */}
        <header className="flex flex-wrap items-center justify-between px-5 py-3.5 border-b border-zinc-850 bg-zinc-900/40 gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800">
              <AssistantAvatar size="md" state={avatarState} />
            </div>
            <div>
              <h2 id="agent-modal-title" className="text-base font-semibold text-zinc-100">
                Astro
              </h2>
              <p className="text-xs text-zinc-400">
                Tu asistente de estudio
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Navegación por pestañas (solo Resumen y Conexión) */}
            <div className="flex items-center p-0.5 bg-zinc-900 rounded-lg border border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveTab('summary')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  activeTab === 'summary'
                    ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Resumen Semanal</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Conexión</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              title="Cerrar modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Notificación de Error */}
        {error && (
          <div className="mx-6 mt-3 p-3 bg-red-950/40 border border-red-900/60 rounded-lg flex items-start justify-between gap-3 text-xs text-red-200 shrink-0">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            <button
              onClick={onClearError}
              className="text-red-400 hover:text-red-200 shrink-0 text-xs font-medium underline cursor-pointer"
            >
              Descartar
            </button>
          </div>
        )}

        {/* ==============================================================
           PESTAÑA 1: RESUMEN SEMANAL
           ============================================================== */}
        {activeTab === 'summary' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Barra de contexto y acción de generación */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-zinc-900/60 border border-zinc-850">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
                  <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Semana activa: <span className="text-zinc-200 font-semibold">{weekRangeText}</span></span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{weekEvents.length} eventos</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{academicNotes.length} notas académicas</span>
                </div>
                <p className="text-xs text-zinc-400">
                  Astro está listo para preparar tu resumen semanal
                </p>
              </div>

              <button
                type="button"
                onClick={handleRunGenerate}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-zinc-950 bg-zinc-100 hover:bg-white active:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all whitespace-nowrap cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Astro está analizando tus notas...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-zinc-900" />
                    <span>{lastSummary ? 'Actualizar resumen' : 'Generar resumen'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Contenido del Resumen */}
            {lastSummary ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between text-xs text-zinc-400 pb-2 border-b border-zinc-850">
                  <div className="flex items-center gap-2">
                    <span>Generado: {new Date(lastSummary.generatedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {lastSummary.fullText && (
                    <button
                      type="button"
                      onClick={() => setShowRawText((prev) => !prev)}
                      className="text-xs text-zinc-400 hover:text-zinc-200 underline font-medium cursor-pointer"
                    >
                      {showRawText ? 'Ver formato estructurado' : 'Ver respuesta directa'}
                    </button>
                  )}
                </div>

                {showRawText && lastSummary.fullText ? (
                  <div className="p-4 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">
                    {lastSummary.fullText}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* 1. Cosas hechas esta semana */}
                    <div className="flex flex-col p-4 rounded-lg bg-zinc-900/40 border border-zinc-800/80 space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-zinc-800/60">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                          Qué he hecho esta semana
                        </h3>
                      </div>
                      <ul className="space-y-2.5 text-xs text-zinc-300 flex-1">
                        {lastSummary.weeklyHighlights.map((hl, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-zinc-400 font-bold shrink-0 mt-0.5">•</span>
                            <span className="leading-snug">{hl}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 2. Cosas escritas en notas */}
                    <div className="flex flex-col p-4 rounded-lg bg-zinc-900/40 border border-zinc-800/80 space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-zinc-800/60">
                        <FileText className="w-4 h-4 text-sky-400" />
                        <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                          Cosas escritas en notas
                        </h3>
                      </div>
                      <div className="space-y-3 text-xs flex-1 max-h-72 overflow-y-auto pr-1">
                        {lastSummary.notesReview.length > 0 ? (
                          lastSummary.notesReview.map((item, i) => (
                            <div key={i} className="p-2.5 rounded bg-zinc-950/60 border border-zinc-850 space-y-1">
                              <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
                                <span className="truncate max-w-[140px] text-zinc-300">{item.subjectName}</span>
                                <span className="text-[10px] text-zinc-400">{item.termName}</span>
                              </div>
                              <div className="text-xs font-semibold text-zinc-100">{item.noteTitle}</div>
                              <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-3">
                                {item.summary}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-zinc-400 italic">No hay notas registradas aún.</p>
                        )}
                      </div>
                    </div>

                    {/* 3. Temas que debo estudiar */}
                    <div className="flex flex-col p-4 rounded-lg bg-zinc-900/40 border border-zinc-800/80 space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-zinc-800/60">
                        <BookOpen className="w-4 h-4 text-amber-400" />
                        <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                          Temas que debo estudiar
                        </h3>
                      </div>
                      <ul className="space-y-2.5 text-xs text-zinc-300 flex-1">
                        {lastSummary.studyRecommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <ArrowRight className="w-3.5 h-3.5 text-amber-400/80 shrink-0 mt-0.5" />
                            <span className="leading-snug">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 px-6 text-center rounded-xl bg-zinc-900/30 border border-dashed border-zinc-800 flex flex-col items-center justify-center space-y-3">
                <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                  <AssistantAvatar size="lg" state="idle" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-200">
                  Genera tu informe de estudio semanal
                </h3>
                <p className="text-xs text-zinc-400 max-w-md leading-relaxed">
                  Astro revisará tus notas académicas, materias por cuatrimestre y eventos del calendario para preparar un resumen de tus avances, tareas y temas que debes estudiar.
                </p>
                <button
                  type="button"
                  onClick={handleRunGenerate}
                  disabled={isGenerating}
                  className="mt-2 flex items-center gap-2 px-4 py-2 text-xs font-medium text-zinc-950 bg-zinc-100 hover:bg-white rounded-lg transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Comenzar análisis</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ==============================================================
           PESTAÑA 2: CONEXIÓN
           ============================================================== */}
        {activeTab === 'settings' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="p-4 rounded-lg bg-zinc-900/40 border border-zinc-800/80 space-y-4">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-zinc-300" />
                <h3 className="text-sm font-semibold text-zinc-100">
                  Parámetros de Conexión
                </h3>
              </div>

              {/* Servicio */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-300">
                  Servicio
                </label>
                <input
                  type="text"
                  value={localUrl}
                  onChange={(e) => setLocalUrl(e.target.value)}
                  placeholder="URL del servicio"
                  className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-zinc-500 font-mono"
                />
              </div>

              {/* Modelo */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-300">
                  Modelo
                </label>
                <input
                  type="text"
                  value={localModel}
                  onChange={(e) => setLocalModel(e.target.value)}
                  placeholder="Nombre del modelo"
                  className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-zinc-500 font-mono"
                />
              </div>

              {/* Clave de acceso */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                  <Key className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Clave de acceso</span>
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={localApiKey}
                    onChange={(e) => setLocalApiKey(e.target.value)}
                    placeholder="Clave de acceso configurada"
                    className="w-full pr-10 pl-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-zinc-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    title={showApiKey ? 'Ocultar' : 'Mostrar'}
                  >
                    {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Botones de acción y guardado */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleSaveSettings();
                    onTestConnection({
                      url: localUrl.trim(),
                      model: localModel.trim(),
                      apiKey: localApiKey.trim(),
                    });
                  }}
                  disabled={connectionStatus === 'testing'}
                  className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-zinc-200 bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 rounded-lg transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${connectionStatus === 'testing' ? 'animate-spin' : ''}`} />
                  <span>Probar Conexión</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="px-4 py-1.5 text-xs font-semibold text-zinc-950 bg-zinc-100 hover:bg-white rounded-lg transition-colors cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </div>

            {/* Diagnóstico de Conexión */}
            <div className="p-4 rounded-lg bg-zinc-900/40 border border-zinc-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300">Diagnóstico de Conexión</span>
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  {connectionStatus === 'connected' && (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Conectado
                    </span>
                  )}
                  {connectionStatus === 'disconnected' && (
                    <span className="text-amber-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Sin conexión
                    </span>
                  )}
                  {connectionStatus === 'testing' && (
                    <span className="text-zinc-400 flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verificando...
                    </span>
                  )}
                  {connectionStatus === 'untested' && (
                    <span className="text-zinc-500">Pendiente</span>
                  )}
                </div>
              </div>

              {statusMessage && (
                <p className="text-xs text-zinc-400 font-mono bg-zinc-950/60 p-2.5 rounded border border-zinc-850 leading-relaxed">
                  {statusMessage}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Pie del modal */}
        <footer className="px-5 py-2.5 border-t border-zinc-850 bg-zinc-900/30 flex items-center justify-between text-xs text-zinc-400 shrink-0">
          <span>Erick's Planner · Astro</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );
};
