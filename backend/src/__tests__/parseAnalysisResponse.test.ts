import { describe, expect, it } from 'vitest';
import { extractJsonFromContent, parseAnalysisContent } from '../utils/parseAnalysisResponse';

describe('parseAnalysisResponse', () => {
  it('extracts JSON from markdown code block', () => {
    const raw = '```json\n{"title":"Test","category":"TEXTO"}\n```';
    expect(extractJsonFromContent(raw)).toBe('{"title":"Test","category":"TEXTO"}');
  });

  it('parses and sanitizes valid analysis JSON', () => {
    const content = JSON.stringify({
      title: 'Portrait prompt',
      description: 'Generates a portrait',
      category: 'IMAGEN',
      intent: 'GENERAR',
      targets: ['ROSTRO'],
      inputMode: 'TEXTO_A_IMAGEN',
      preservation: 'LIBRE',
      subcategory: 'generacion-retrato',
      tags: ['portrait'],
      metadata: {},
      confidence: 0.9,
    });

    const result = parseAnalysisContent(content, 'DeepSeek');
    expect(result.intent).toBe('GENERAR');
    expect(result.category).toBe('IMAGEN');
  });
});