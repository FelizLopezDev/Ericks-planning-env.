import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { callOllamaChat, getOllamaClient } from './src/server/ollama';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Helper para sanitizar URLs (por defecto a https://ollama.com o URL configurada)
function sanitizeUrl(rawUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return 'https://ollama.com';
  }
  const trimmed = rawUrl.trim().replace(/\/+$/, '');
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

const DEFAULT_SYSTEM_PROMPT = `Eres Astro, el asistente personal de Erick's Planner: un mentor de estudio y productividad. Respondes en español, con claridad, de forma breve y práctica. Tienes acceso a las notas y eventos de la semana que se te pasan como contexto. Nunca reveles ni menciones qué modelo, empresa o tecnología te impulsa; si te lo preguntan, responde que eres Astro, el asistente de Erick's Planner.

Formato de respuesta: escribe siempre en texto plano. No uses asteriscos, almohadillas, guiones bajos para énfasis, acentos graves, tablas ni bloques de código. No uses títulos con símbolos; si necesitas separar secciones, escribe el título en una línea sola seguido de dos puntos. Para listas usa líneas que empiecen con el símbolo • o con numeración simple (1., 2., 3.). Separa las ideas con líneas en blanco. Mantén las respuestas cortas y claras.

Herramientas del planner: puedes crear eventos, eliminar eventos, crear notas y agregar texto al final de notas existentes, pero solo cuando el último mensaje del usuario lo pida de forma explícita. Cuando lo hagas, responde primero con una frase corta y natural y termina con el bloque <<ACCIONES>> [...] <<FIN>> en el formato JSON acordado, usando únicamente ids y nombres que aparecen en el contexto. Nunca inventes ids. No digas que algo ya está hecho: di que lo estás preparando; el usuario verá una tarjeta de confirmación. Para eliminar siempre dices qué vas a eliminar y esperas la confirmación del usuario. Si falta un dato necesario (fecha, hora, materia, cuál evento), haz UNA sola pregunta corta en lugar de adivinar. Si el usuario no da hora de fin, asume una hora de duración. Resuelve fechas relativas con la fecha de hoy del contexto. El calendario va de 05:00 a 22:00 en bloques de 15 minutos. Si el usuario pide algo fuera de estas capacidades (editar o borrar notas, cambiar tareas, tocar carpetas), explícale amablemente que por ahora no puedes hacerlo. Para escribir en notas, redacta el contenido en texto plano, claro y bien organizado, sin símbolos de formato. Si no hay nada que hacer, no incluyas el bloque.

Ejemplos:
Usuario: agéndame examen de cálculo el martes a las 9, dura 2 horas
Astro: Listo, te preparo el examen de Cálculo para el martes 3 de noviembre de 9:00 a 11:00. <<ACCIONES>> [{"tipo":"crear_evento","titulo":"Examen de Cálculo","fecha":"2026-11-03","inicio":"09:00","fin":"11:00","repeticion":"ninguna"}] <<FIN>>

Usuario: borra la reunión del jueves
Astro: Encontré esta: Reunión de grupo, jueves 5 de noviembre, 15:00 a 16:00. Confirma abajo si quieres que la elimine. <<ACCIONES>> [{"tipo":"eliminar_evento","id":"evt-1730000000000-ab12c"}] <<FIN>>

Usuario: anota en mi nota de límites que la regla de L'Hôpital aplica a indeterminaciones 0/0 e infinito/infinito
Astro: Hecho, lo agrego al final de tu nota de límites. <<ACCIONES>> [{"tipo":"agregar_a_nota","id":"anote-1729999999999-xy9z1","contenido":"Regla de L'Hôpital: aplica a indeterminaciones de tipo 0/0 e infinito/infinito."}] <<FIN>>`;

// Endpoint de diagnóstico para verificar conexión
app.get('/api/ollama/status', async (req, res) => {
  let targetUrl = sanitizeUrl((req.query.url as string) || 'https://ollama.com');
  const customKey = (req.query.apiKey as string) || (req.headers.authorization?.replace(/^Bearer\s+/i, ''));
  const effectiveKey = customKey || process.env.OLLAMA_API_KEY || '';

  try {
    const client = getOllamaClient(targetUrl, effectiveKey);
    const modelList = await client.list();
    const models = modelList.models?.map((m) => m.name) || [];

    return res.json({
      ok: true,
      url: targetUrl,
      models: models.length > 0 ? models : ['gemma4:31b'],
      isCloud: targetUrl.includes('ollama.com'),
      hasKeyConfigured: Boolean(process.env.OLLAMA_API_KEY),
    });
  } catch (err: any) {
    console.error('Error al verificar conexión:', err);

    // Si falló localhost pero tenemos clave en la nube, verificar conexión remota
    const isLocal = targetUrl.includes('localhost') || targetUrl.includes('127.0.0.1');
    if (isLocal && process.env.OLLAMA_API_KEY) {
      try {
        const cloudClient = getOllamaClient('https://ollama.com', process.env.OLLAMA_API_KEY);
        const cloudList = await cloudClient.list();
        const cloudModels = cloudList.models?.map((m) => m.name) || [];
        return res.json({
          ok: true,
          url: 'https://ollama.com',
          models: cloudModels.length > 0 ? cloudModels : ['gemma4:31b'],
          isCloud: true,
          hasKeyConfigured: true,
          fallbackFromLocal: true,
        });
      } catch (cloudErr: any) {
        console.error('Fallo chequeo de nube tras fallo local:', cloudErr);
      }
    }

    return res.json({
      ok: false,
      error: 'No se pudo establecer conexión con el servicio.',
      models: [],
      hasKeyConfigured: Boolean(process.env.OLLAMA_API_KEY),
    });
  }
});

// Endpoint proxy para generar respuestas del asistente
app.post('/api/ollama/generate', async (req, res) => {
  const { url, model = 'gemma4:31b', prompt, messages, system, apiKey } = req.body || {};
  let targetUrl = sanitizeUrl(url || 'https://ollama.com');
  const isLocal = targetUrl.includes('localhost') || targetUrl.includes('127.0.0.1');

  if (!prompt && (!messages || !Array.isArray(messages) || messages.length === 0)) {
    return res.status(400).json({ error: 'El mensaje no puede estar vacío.' });
  }

  const effectiveHost = (isLocal && process.env.OLLAMA_API_KEY) ? 'https://ollama.com' : targetUrl;
  const effectiveKey = apiKey || process.env.OLLAMA_API_KEY;

  try {
    const reply = await callOllamaChat({
      message: prompt,
      messages,
      system: system || DEFAULT_SYSTEM_PROMPT,
      model: model || 'gemma4:31b',
      host: effectiveHost,
      apiKey: effectiveKey,
    });

    return res.json({
      ok: true,
      model: model || 'gemma4:31b',
      response: reply,
    });
  } catch (err: any) {
    console.error('Error al generar respuesta:', err);

    if (effectiveHost !== 'https://ollama.com' && process.env.OLLAMA_API_KEY) {
      try {
        const fallbackReply = await callOllamaChat({
          message: prompt,
          messages,
          system: system || DEFAULT_SYSTEM_PROMPT,
          model: model || 'gemma4:31b',
          host: 'https://ollama.com',
          apiKey: process.env.OLLAMA_API_KEY,
        });

        return res.json({
          ok: true,
          model: model || 'gemma4:31b',
          response: fallbackReply,
        });
      } catch (fallbackErr: any) {
        console.error('Error en fallback:', fallbackErr);
        const status = fallbackErr?.status || fallbackErr?.statusCode || 500;
        return res.status(status).json({
          error: 'El asistente no está disponible en este momento.',
        });
      }
    }

    const status = err?.status || err?.statusCode || 500;
    return res.status(status).json({
      error: 'El asistente no está disponible en este momento.',
    });
  }
});

// Configuración de Vite / Static Assets
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Error starting server:', err);
  process.exit(1);
});
