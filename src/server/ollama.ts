import 'dotenv/config';
import { Ollama } from 'ollama';

export function getOllamaClient(host: string = 'https://ollama.com', customKey?: string) {
  const apiKey = customKey || process.env.OLLAMA_API_KEY || '';
  return new Ollama({
    host,
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
  });
}

export async function callOllamaChat(params: {
  message?: string;
  messages?: Array<{ role: string; content: string }>;
  model?: string;
  system?: string;
  host?: string;
  apiKey?: string;
}): Promise<string> {
  const model = params.model || 'gemma4:31b';
  const client = getOllamaClient(params.host, params.apiKey);

  const formattedMessages: Array<{ role: string; content: string }> = [];

  if (params.system) {
    formattedMessages.push({ role: 'system', content: params.system });
  }

  if (params.messages && Array.isArray(params.messages) && params.messages.length > 0) {
    formattedMessages.push(...params.messages);
  } else if (params.message) {
    formattedMessages.push({ role: 'user', content: params.message });
  } else {
    throw new Error('Debes proporcionar un mensaje o historial de conversación.');
  }

  const response = await client.chat({
    model,
    messages: formattedMessages,
  });

  return response.message.content;
}
