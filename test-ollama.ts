import 'dotenv/config';
import { callOllamaChat } from './src/server/ollama';

async function main() {
  try {
    const reply = await callOllamaChat({
      message: 'Hello, respond with a single short greeting sentence.',
      model: 'gemma4:31b',
    });
    console.log('REPLY_START');
    console.log(reply);
    console.log('REPLY_END');
  } catch (error: any) {
    console.error('OLLAMA_ERROR:', error?.status || error?.statusCode || error?.message || error);
    process.exit(1);
  }
}

main();
