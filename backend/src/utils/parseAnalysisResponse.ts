import { AnalysisResult } from '../types';
import { sanitizeAnalysisResult } from './intentValidation';

export function extractJsonFromContent(content: string): string {
  const codeBlockMatch = content.match(/```json\n?([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  const genericBlockMatch = content.match(/```\n?([\s\S]*?)```/);
  if (genericBlockMatch) {
    return genericBlockMatch[1].trim();
  }

  return content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
}

export function parseAnalysisContent(content: string, providerLabel = 'IA'): AnalysisResult {
  if (!content) {
    throw new Error(`Respuesta vacía de ${providerLabel}`);
  }

  const jsonContent = extractJsonFromContent(content);

  try {
    const result: AnalysisResult = JSON.parse(jsonContent);
    return sanitizeAnalysisResult(result);
  } catch (error) {
    console.error(`Error parseando JSON de ${providerLabel}:`, content);
    throw new Error(`Respuesta inválida de ${providerLabel}: no es JSON válido`);
  }
}