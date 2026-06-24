import axios from 'axios';
import { AnalysisResult, ChatCompletionResponse } from '../types';
import { ANALYSIS_SYSTEM_PROMPT } from '../constants/analysisPrompt';
import { parseAnalysisContent } from '../utils/parseAnalysisResponse';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const API_KEY = process.env.DEEPSEEK_API_KEY || '';
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

export async function analyzePrompt(promptContent: string): Promise<AnalysisResult> {
  if (!API_KEY) {
    throw new Error('DEEPSEEK_API_KEY no está configurada');
  }

  const response = await axios.post<ChatCompletionResponse>(
    DEEPSEEK_API_URL,
    {
      model: MODEL,
      messages: [
        { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Analiza el siguiente prompt y extrae la metadata estructurada:\n\n---\n${promptContent}\n---`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1500,
      thinking: { type: 'disabled' },
    },
    {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  );

  if (!response.data.choices?.length) {
    throw new Error('Respuesta vacía de DeepSeek');
  }

  const content = response.data.choices[0]?.message?.content;
  return parseAnalysisContent(content ?? '', 'DeepSeek');
}

export async function analyzePromptWithRetry(
  promptContent: string,
  maxRetries = 3
): Promise<AnalysisResult> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await analyzePrompt(promptContent);
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      const delay = Math.pow(2, attempt - 1) * 1000;
      console.log(`Reintentando análisis DeepSeek en ${delay}ms... (intento ${attempt + 1}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error('Máximo de reintentos excedido');
}