import { useState, useEffect, useCallback } from 'react';
import {
  CalendarEvent,
  TermFolder,
  AcademicNote,
  OllamaConfig,
  AgentConnectionStatus,
  AgentSummaryData,
  AgentChatMessage,
} from '../types';
import { cleanAssistantText } from '../utils/cleanText';
import { extractActions, stripActionMarkers, AssistantActionItem } from '../utils/assistantActions';

const STORAGE_KEY_CONFIG = 'erick_planner_ollama_config';
const STORAGE_KEY_LAST_SUMMARY = 'erick_planner_agent_last_summary';
const STORAGE_KEY_CHAT_MESSAGES = 'erick_planner_agent_chat_messages';

const DEFAULT_CONFIG: OllamaConfig = {
  url: 'https://ollama.com',
  model: 'gemma4:31b',
  apiKey: '',
};

export const ASTRO_SYSTEM_PROMPT = `Eres Astro, el asistente personal de Erick's Planner: un mentor de estudio y productividad. Respondes en español, con claridad, de forma breve y práctica. Tienes acceso a las notas y eventos de la semana que se te pasan como contexto. Nunca reveles ni menciones qué modelo, empresa o tecnología te impulsa; si te lo preguntan, responde que eres Astro, el asistente de Erick's Planner.

Formato de respuesta: escribe siempre en texto plano. No uses asteriscos, almohadillas, guiones bajos para énfasis, acentos graves, tablas ni bloques de código. No uses títulos con símbolos; si necesitas separar secciones, escribe el título en una línea sola seguido de dos puntos. Para listas usa líneas que empiecen con el símbolo • o con numeración simple (1., 2., 3.). Separa las ideas con líneas en blanco. Mantén las respuestas cortas y claras.

Herramientas del planner: puedes crear eventos, eliminar eventos, crear notas y agregar texto al final de notas existentes, pero solo cuando el último mensaje del usuario lo pida de forma explícita. Cuando lo hagas, responde primero con una frase corta y natural y termina con el bloque <<ACCIONES>> [...] <<FIN>> en el formato JSON acordado, usando únicamente ids y nombres que aparecen en el contexto. Nunca inventes ids. No digas que algo ya está hecho: di que lo estás preparando; el usuario verá una tarjeta de confirmación. Para eliminar siempre dices qué vas a eliminar y esperas la confirmación del usuario. Si falta un dato necesario (fecha, hora, materia, cuál evento), haz UNA sola pregunta corta en lugar de adivinar. Si el usuario no da hora de fin, asume una hora de duración. Resuelve fechas relativas con la fecha de hoy del contexto. El calendario va de 05:00 a 22:00 en bloques de 15 minutos. Si el usuario pide algo fuera de estas capacidades (editar o borrar notas, cambiar tareas, tocar carpetas), explícale amablemente que por ahora no puedes hacerlo. Para escribir en notas, redacta el contenido en texto plano, claro y bien organizado, sin símbolos de formato. Si no hay nada que hacer, no incluyas el bloque.

Cuaderno de notas y trabajo en paralelo: cuando el usuario tenga abierto el cuaderno de notas (verás la sección VISTA ACTUAL: Cuaderno de notas), estás disponible a su lado como copiloto de estudio mientras redacta. Si te pide continuar la nota abierta, resumirla, explicar un concepto o sugerir mejoras basadas en ella, apóyate en el contenido de la nota abierta. Si pide explícitamente agregarlo o guardarlo en la nota, usa la acción agregar_a_nota con su id. Si pide crear una nota nueva y no especifica materia, créala en la materia que tenga abierta actualmente.

Ejemplos:
Usuario: agéndame examen de cálculo el martes a las 9, dura 2 horas
Astro: Listo, te preparo el examen de Cálculo para el martes 3 de noviembre de 9:00 a 11:00. <<ACCIONES>> [{"tipo":"crear_evento","titulo":"Examen de Cálculo","fecha":"2026-11-03","inicio":"09:00","fin":"11:00","repeticion":"ninguna"}] <<FIN>>

Usuario: borra la reunión del jueves
Astro: Encontré esta: Reunión de grupo, jueves 5 de noviembre, 15:00 a 16:00. Confirma abajo si quieres que la elimine. <<ACCIONES>> [{"tipo":"eliminar_evento","id":"evt-1730000000000-ab12c"}] <<FIN>>

Usuario: anota en mi nota de límites que la regla de L'Hôpital aplica a indeterminaciones 0/0 e infinito/infinito
Astro: Hecho, lo agrego al final de tu nota de límites. <<ACCIONES>> [{"tipo":"agregar_a_nota","id":"anote-1729999999999-xy9z1","contenido":"Regla de L'Hôpital: aplica a indeterminaciones de tipo 0/0 e infinito/infinito."}] <<FIN>>`;

export function useAgent() {
  const [config, setConfig] = useState<OllamaConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.url || parsed.url === 'http://localhost:11434') {
          parsed.url = 'https://ollama.com';
        }
        if (!parsed.model) {
          parsed.model = 'gemma4:31b';
        }
        return { ...DEFAULT_CONFIG, ...parsed };
      }
    } catch (e) {
      console.warn('Error reading agent config from localStorage', e);
    }
    return DEFAULT_CONFIG;
  });

  const [connectionStatus, setConnectionStatus] = useState<AgentConnectionStatus>('untested');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isChatSending, setIsChatSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lastSummary, setLastSummary] = useState<AgentSummaryData | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LAST_SUMMARY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Error reading last summary from localStorage', e);
    }
    return null;
  });

  const [chatMessages, setChatMessages] = useState<AgentChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CHAT_MESSAGES);
      if (saved) {
        const parsed: AgentChatMessage[] = JSON.parse(saved);
        // Las confirmaciones pendientes no se guardan activas: tras recargar aparecen canceladas/caducadas
        return parsed.map((m) => {
          if (m.actions && m.actions.length > 0) {
            return {
              ...m,
              actions: m.actions.map((act) =>
                act.estado === 'pending' ? { ...act, estado: 'cancelled' as const } : act
              ),
            };
          }
          return m;
        });
      }
    } catch (e) {
      console.warn('Error reading chat messages from localStorage', e);
    }
    return [];
  });

  // Guardar configuración cuando cambie
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    } catch (e) {
      console.warn('Error saving agent config to localStorage', e);
    }
  }, [config]);

  // Guardar último resumen generado
  useEffect(() => {
    if (lastSummary) {
      try {
        localStorage.setItem(STORAGE_KEY_LAST_SUMMARY, JSON.stringify(lastSummary));
      } catch (e) {
        console.warn('Error saving last summary to localStorage', e);
      }
    }
  }, [lastSummary]);

  // Guardar historial de chat en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CHAT_MESSAGES, JSON.stringify(chatMessages));
    } catch (e) {
      console.warn('Error saving chat messages to localStorage', e);
    }
  }, [chatMessages]);

  const updateConfig = useCallback((partial: Partial<OllamaConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
    setConnectionStatus('untested');
    setError(null);
  }, []);

  // Probar conexión contra el proxy de backend
  const testConnection = useCallback(
    async (overrideConfig?: Partial<OllamaConfig>) => {
      const targetConfig = { ...config, ...overrideConfig };
      setConnectionStatus('testing');
      setStatusMessage('Probando conexión...');
      setError(null);

      try {
        const query = new URLSearchParams({
          url: targetConfig.url || 'https://ollama.com',
        });

        const headers: Record<string, string> = {};
        if (targetConfig.apiKey?.trim()) {
          headers['Authorization'] = `Bearer ${targetConfig.apiKey.trim()}`;
        }

        const res = await fetch(`/api/ollama/status?${query.toString()}`, {
          method: 'GET',
          headers,
        });

        const data = await res.json();
        if (data.ok) {
          setConnectionStatus('connected');
          const models = Array.isArray(data.models) ? data.models : [];
          setAvailableModels(models);
          setStatusMessage('Conexión exitosa.');
          return { ok: true, models };
        } else {
          setConnectionStatus('disconnected');
          setStatusMessage('No se pudo conectar.');
          setError('No se pudo conectar.');
          return { ok: false, error: 'No se pudo conectar.' };
        }
      } catch (err: any) {
        console.error('Error al probar conexión:', err);
        setConnectionStatus('disconnected');
        const msg = 'No se pudo conectar.';
        setStatusMessage(msg);
        setError(msg);
        return { ok: false, error: msg };
      }
    },
    [config]
  );

  // Helper para construir el contexto académico detallado (Parte 3.7)
  const buildAcademicContext = useCallback(
    (params: {
      allEvents?: CalendarEvent[];
      terms?: TermFolder[];
      academicNotes?: AcademicNote[];
      activeNoteContext?: string;
    }) => {
      const { allEvents = [], terms = [], academicNotes = [], activeNoteContext } = params;

      // 1. Fecha y hora actuales del dispositivo en español
      const now = new Date();
      const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
      const dayName = days[now.getDay()];
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const date = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const formattedNow = `Hoy es ${dayName} ${year}-${month}-${date}, ${hours}:${minutes}`;

      // 2. Eventos desde 14 días atrás hasta 60 días adelante
      const pastLimit = new Date(now);
      pastLimit.setDate(pastLimit.getDate() - 14);
      const pastKey = `${pastLimit.getFullYear()}-${String(pastLimit.getMonth() + 1).padStart(2, '0')}-${String(pastLimit.getDate()).padStart(2, '0')}`;

      const futureLimit = new Date(now);
      futureLimit.setDate(futureLimit.getDate() + 60);
      const futureKey = `${futureLimit.getFullYear()}-${String(futureLimit.getMonth() + 1).padStart(2, '0')}-${String(futureLimit.getDate()).padStart(2, '0')}`;

      const relevantEvents = allEvents.filter(
        (e) => e.dateKey >= pastKey && e.dateKey <= futureKey
      );

      // Agrupar eventos que pertenecen a una serie recurrente en una sola línea
      const seriesMap = new Map<string, CalendarEvent[]>();
      const standaloneEvents: CalendarEvent[] = [];

      relevantEvents.forEach((ev) => {
        if (ev.seriesId) {
          const list = seriesMap.get(ev.seriesId) || [];
          list.push(ev);
          seriesMap.set(ev.seriesId, list);
        } else {
          standaloneEvents.push(ev);
        }
      });

      const eventLines: string[] = [];

      // Líneas de series recurrentes agrupadas
      seriesMap.forEach((seriesEvents, sId) => {
        const sorted = [...seriesEvents].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const sTime = `${first.startHour}:${String(first.startMinute).padStart(2, '0')}`;
        const eTime = `${first.endHour}:${String(first.endMinute).padStart(2, '0')}`;
        const recType = first.recurrence === 'daily' ? 'diaria' : 'semanal';
        const cleanTitle = stripActionMarkers(first.title);
        eventLines.push(
          `serie=${sId} | repite ${recType} | desde ${first.dateKey} hasta ${last.dateKey} | ${sTime}-${eTime} | ${cleanTitle}`
        );
      });

      // Líneas de eventos individuales
      standaloneEvents
        .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
        .forEach((ev) => {
          const sTime = `${ev.startHour}:${String(ev.startMinute).padStart(2, '0')}`;
          const eTime = `${ev.endHour}:${String(ev.endMinute).padStart(2, '0')}`;
          const cleanTitle = stripActionMarkers(ev.title);
          eventLines.push(`id=${ev.id} | ${ev.dateKey} | ${sTime}-${eTime} | ${cleanTitle}`);
        });

      let eventsSection = '';
      if (eventLines.length === 0) {
        eventsSection = 'No hay eventos agendados en este período.';
      } else {
        const displayLines = eventLines.slice(0, 150);
        eventsSection = displayLines.join('\n');
        if (eventLines.length > 150) {
          eventsSection += '\n(lista recortada)';
        }
      }

      // 3. Estructura de carpetas por cuatrimestre y materias
      const folderLines = terms.map((t) => {
        const subjects = t.subjects.map((s) => stripActionMarkers(s.name)).join(', ');
        return `• ${stripActionMarkers(t.name)}: ${subjects || 'Sin materias'}`;
      });

      // 4. Notas académicas con id y contenido recortado a 600 caracteres
      const termLookup = new Map<string, string>();
      const subjectLookup = new Map<string, { sName: string; tName: string }>();

      terms.forEach((t) => {
        termLookup.set(t.id, t.name);
        t.subjects.forEach((s) => {
          subjectLookup.set(s.id, { sName: s.name, tName: t.name });
        });
      });

      const notesLines = academicNotes.map((n) => {
        const meta = subjectLookup.get(n.subjectId) || {
          sName: 'General',
          tName: termLookup.get(n.termId) || 'Cuatrimestre',
        };
        const rawBody = stripActionMarkers(n.content.trim());
        const truncated = rawBody.length > 600 ? rawBody.slice(0, 600) + '...' : rawBody;
        const cleanTitle = stripActionMarkers(n.title);
        return `id=${n.id} | ${meta.tName} | ${meta.sName} | ${cleanTitle}\n${truncated || '(Sin contenido)'}`;
      });

      return `
[FECHA ACTUAL]
${formattedNow}
${activeNoteContext ? `\n${activeNoteContext}\n` : ''}
[EVENTOS DEL CALENDARIO]
${eventsSection}

[ESTRUCTURA DE ASIGNATURAS POR CUATRIMESTRE]
${folderLines.length > 0 ? folderLines.join('\n') : 'No hay cuatrimestres registrados.'}

[NOTAS ACADÉMICAS REGISTRADAS]
${notesLines.length > 0 ? notesLines.join('\n---\n') : 'No hay notas registradas.'}
`;
    },
    []
  );

  // Actualizar una acción específica dentro de un mensaje (por ejemplo al confirmar o deshacer)
  const updateMessageAction = useCallback((actionId: string, updatedAction: AssistantActionItem) => {
    setChatMessages((prev) =>
      prev.map((msg) => {
        if (!msg.actions) return msg;
        const idx = msg.actions.findIndex((a) => a.id === actionId);
        if (idx === -1) return msg;
        const newActions = [...msg.actions];
        newActions[idx] = updatedAction;
        return {
          ...msg,
          actions: newActions,
        };
      })
    );
  }, []);

  // Enviar mensaje de chat a Astro en la interfaz de texto
  const sendChatMessage = useCallback(
    async (
      userText: string,
      contextParams: {
        allEvents: CalendarEvent[];
        terms: TermFolder[];
        academicNotes: AcademicNote[];
        activeNoteContext?: string;
      },
      onProcessActions?: (rawActions: unknown[], hadBlock: boolean, invalid: boolean) => AssistantActionItem[]
    ) => {
      const trimmed = userText.trim();
      if (!trimmed) return;

      setIsChatSending(true);
      setError(null);

      const userMsg: AgentChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: Date.now(),
      };

      const updatedHistory = [...chatMessages, userMsg];
      setChatMessages(updatedHistory);

      let systemPrompt = ASTRO_SYSTEM_PROMPT;

      if (contextParams) {
        systemPrompt += `\n\n${buildAcademicContext(contextParams)}`;
      }

      try {
        const formattedMessages = updatedHistory.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch('/api/ollama/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: config.url || 'https://ollama.com',
            model: config.model?.trim() || 'gemma4:31b',
            messages: formattedMessages,
            system: systemPrompt,
            apiKey: config.apiKey?.trim() || undefined,
          }),
        });

        const data = await res.json();
        if (data.ok && data.response) {
          // Extraer acciones y limpiar texto de la respuesta
          const rawResponse = data.response;
          const { text, actions: extractedActionsList, hadBlock, invalid } = extractActions(rawResponse);
          const cleanedText = cleanAssistantText(text);

          let executedActions: AssistantActionItem[] = [];
          if (onProcessActions && (extractedActionsList.length > 0 || hadBlock)) {
            executedActions = onProcessActions(extractedActionsList, hadBlock, invalid);
          }

          const assistantMsg: AgentChatMessage = {
            id: `msg_${Date.now()}_assistant`,
            role: 'assistant',
            content: cleanedText,
            timestamp: Date.now(),
            model: 'Astro',
            actions: executedActions.length > 0 ? executedActions : undefined,
          };
          setChatMessages((prev) => [...prev, assistantMsg]);
        } else {
          throw new Error('Respuesta no válida del servidor.');
        }
      } catch (chatErr: any) {
        console.error('Error detallado de chat:', chatErr);
        setError('Ups, no pude responder ahora mismo. Intenta de nuevo en unos segundos.');
        const errorAssistantMsg: AgentChatMessage = {
          id: `msg_${Date.now()}_err`,
          role: 'assistant',
          content: 'Ups, no pude responder ahora mismo. Intenta de nuevo en unos segundos.',
          timestamp: Date.now(),
          model: 'Astro',
        };
        setChatMessages((prev) => [...prev, errorAssistantMsg]);
      } finally {
        setIsChatSending(false);
      }
    },
    [chatMessages, config, buildAcademicContext]
  );

  const clearChatMessages = useCallback(() => {
    setChatMessages([]);
    try {
      localStorage.removeItem(STORAGE_KEY_CHAT_MESSAGES);
    } catch (e) {
      console.warn('Error clearing chat messages', e);
    }
  }, []);

  // Generador de análisis y resumen semanal con limpieza de markdown
  const generateWeeklySummary = useCallback(
    async (params: {
      weekEvents: CalendarEvent[];
      weekRangeText: string;
      terms: TermFolder[];
      academicNotes: AcademicNote[];
    }) => {
      setIsGenerating(true);
      setError(null);

      const { weekEvents, weekRangeText, terms, academicNotes } = params;

      const termMap = new Map<string, string>();
      const subjectMap = new Map<string, { subjectName: string; termName: string }>();

      terms.forEach((t) => {
        termMap.set(t.id, t.name);
        t.subjects.forEach((s) => {
          subjectMap.set(s.id, { subjectName: s.name, termName: t.name });
        });
      });

      const notesWithMetadata = academicNotes.map((note) => {
        const meta = subjectMap.get(note.subjectId) || {
          subjectName: 'Materia no asignada',
          termName: termMap.get(note.termId) || 'Cuatrimestre general',
        };
        return {
          ...note,
          subjectName: meta.subjectName,
          termName: meta.termName,
        };
      });

      const promptPayload = `
${ASTRO_SYSTEM_PROMPT}

Evalúa las notas académicas y los eventos de la semana actual y genera un análisis claro y útil.

[CONTEXTO TEMPORAL]
Semana activa: ${weekRangeText}

[EVENTOS Y ACTIVIDADES REGISTRADAS ESTA SEMANA (${weekEvents.length} eventos)]
${
  weekEvents.length > 0
    ? weekEvents
        .map(
          (e) =>
            `- [${e.dateKey} ${e.startHour}:${String(e.startMinute).padStart(2, '0')} - ${e.endHour}:${String(e.endMinute).padStart(2, '0')}] ${stripActionMarkers(e.title)} ${e.recurrence && e.recurrence !== 'none' ? `(Repite: ${e.recurrence})` : ''}`
        )
        .join('\n')
    : 'No hay eventos agendados en esta semana en el calendario.'
}

[NOTAS Y CUADERNOS DE ESTUDIO (${notesWithMetadata.length} notas registradas)]
${
  notesWithMetadata.length > 0
    ? notesWithMetadata
        .map(
          (n) => `---
CUATRIMESTRE: ${stripActionMarkers(n.termName)}
MATERIA: ${stripActionMarkers(n.subjectName)}
TÍTULO DE NOTA: ${stripActionMarkers(n.title)}
CONTENIDO:
${stripActionMarkers(n.content.trim()) || '(Nota vacía)'}
ÚLTIMA MODIFICACIÓN: ${new Date(n.updatedAt).toLocaleDateString('es-ES')}
`
        )
        .join('\n')
    : 'Aún no se han redactado notas académicas en el sistema.'
}

[INSTRUCCIÓN]
Por favor genera una respuesta bien formateada en español en texto plano (sin asteriscos ni almohadillas) con las siguientes 3 secciones claramente delimitadas:
1. Cosas hechas esta semana (Eventos completados o cursados en el calendario y progreso en notas).
2. Cosas escritas en notas (Síntesis clave organizada por materia y conceptos anotados).
3. Temas que debo estudiar (Puntos prioritarios para repasar, tareas pendientes inferidas y recomendaciones prácticas).
`;

      try {
        const res = await fetch('/api/ollama/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: config.url || 'https://ollama.com',
            model: config.model?.trim() || 'gemma4:31b',
            prompt: promptPayload,
            apiKey: config.apiKey?.trim() || undefined,
          }),
        });

        const data = await res.json();
        if (data.ok && data.response) {
          const rawResponse: string = data.response;
          const cleanFull = cleanAssistantText(rawResponse);

          const newSummary: AgentSummaryData = {
            id: `sum_${Date.now()}`,
            generatedAt: Date.now(),
            modelUsed: 'Astro',
            fullText: cleanFull,
            weeklyHighlights: [
              cleanAssistantText(`${weekEvents.length} compromisos agendados en la semana (${weekRangeText}).`),
              cleanAssistantText(`${academicNotes.length} notas académicas analizadas en el sistema.`),
            ],
            notesReview: notesWithMetadata.map((n) => ({
              termName: cleanAssistantText(n.termName),
              subjectName: cleanAssistantText(n.subjectName),
              noteTitle: cleanAssistantText(n.title),
              summary: cleanAssistantText(n.content.slice(0, 150) + (n.content.length > 150 ? '...' : '')),
            })),
            studyRecommendations: [
              cleanAssistantText('Revisa los conceptos clave sintetizados en este análisis.'),
              cleanAssistantText('Organiza bloques de enfoque en el calendario para preparar entregas pendientes.'),
            ],
          };

          setLastSummary(newSummary);
          setIsGenerating(false);
          return newSummary;
        } else {
          throw new Error('Respuesta no válida del servidor.');
        }
      } catch (ollamaErr: any) {
        console.error('Error detallado al generar resumen:', ollamaErr);
        setError('Astro no pudo responder esta vez. Te preparé un resumen base con tus notas.');

        const weeklyHighlights = [
          weekEvents.length > 0
            ? `${weekEvents.length} evento(s) planificado(s) durante esta semana (${weekRangeText}), incluyendo: ${weekEvents.slice(0, 3).map((e) => cleanAssistantText(e.title)).join(', ')}.`
            : `Semana ${weekRangeText} sin eventos agendados aún en el calendario.`,
          notesWithMetadata.length > 0
            ? `Se encontraron ${notesWithMetadata.length} nota(s) en tus cuadernos de cuatrimestre.`
            : 'Aún no hay notas registradas; escribe notas en tus materias para que el asistente extraiga detalles.',
        ].map(cleanAssistantText);

        const notesReview = notesWithMetadata.map((n) => {
          const preview = n.content.trim()
            ? n.content.replace(/[\n\r]+/g, ' ').slice(0, 160) + (n.content.length > 160 ? '...' : '')
            : 'Sin contenido detallado aún.';
          return {
            termName: cleanAssistantText(n.termName),
            subjectName: cleanAssistantText(n.subjectName),
            noteTitle: cleanAssistantText(n.title),
            summary: cleanAssistantText(preview),
          };
        });

        const studyRecommendations: string[] = [];
        if (notesWithMetadata.length > 0) {
          notesWithMetadata.forEach((n) => {
            if (n.title.trim()) {
              studyRecommendations.push(`Repasar "${cleanAssistantText(n.title)}" de la materia ${cleanAssistantText(n.subjectName)} (${cleanAssistantText(n.termName)}).`);
            }
          });
          studyRecommendations.push('Programar sesiones de enfoque de 25 min para consolidar apuntes.');
        } else {
          studyRecommendations.push('Crea notas de tus materias para recibir recomendaciones de estudio personalizadas.');
        }

        const fallbackSummary: AgentSummaryData = {
          id: `sum_${Date.now()}`,
          generatedAt: Date.now(),
          modelUsed: 'Astro',
          weeklyHighlights,
          notesReview,
          studyRecommendations: studyRecommendations.map(cleanAssistantText),
          fullText: undefined,
        };

        setLastSummary(fallbackSummary);
        setIsGenerating(false);
        return fallbackSummary;
      }
    },
    [config]
  );

  return {
    config,
    updateConfig,
    connectionStatus,
    statusMessage,
    availableModels,
    testConnection,
    generateWeeklySummary,
    isGenerating,
    lastSummary,
    chatMessages,
    isChatSending,
    sendChatMessage,
    updateMessageAction,
    clearChatMessages,
    error,
    clearError: () => setError(null),
  };
}
