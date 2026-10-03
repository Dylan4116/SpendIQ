import { GoogleGenAI } from '@google/genai';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8').trim().split('\n')
    .filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);

console.log('Model:', env.GEMINI_MODEL);
console.log('Key prefix:', env.GEMINI_API_KEY?.slice(0, 12) + '...');

const client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
try {
  const response = await client.models.generateContent({
    model: env.GEMINI_MODEL,
    contents: 'Reply with valid JSON: {"ok": true}',
    config: { responseMimeType: 'application/json' },
  });
  console.log('SUCCESS:', response.text);
} catch (e) {
  console.error('ERROR STATUS:', e.status);
  console.error('ERROR MESSAGE:', e.message);
}
