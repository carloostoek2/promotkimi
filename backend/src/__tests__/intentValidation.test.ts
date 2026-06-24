import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sanitizeAnalysisResult,
  sanitizePromptUpdate,
  validateIntentCategoryCoherence,
} from '../utils/intentValidation';
import { AnalysisResult } from '../types';
import {
  Category,
  ImageIntent,
  ImageTarget,
  InputMode,
  Preservation,
} from '@prisma/client';

const validImagenPayload: AnalysisResult = {
  title: 'Retrato fotorrealista',
  description: 'Genera un retrato con iluminación natural',
  category: Category.IMAGEN,
  intent: ImageIntent.GENERAR,
  targets: [ImageTarget.ROSTRO, ImageTarget.ILUMINACION],
  inputMode: InputMode.TEXTO_A_IMAGEN,
  preservation: Preservation.LIBRE,
  subcategory: 'generacion-retrato',
  tags: ['portrait', 'realistic'],
  metadata: { style: 'fotorealista' },
  confidence: 0.92,
};

describe('sanitizeAnalysisResult', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes through valid IMAGEN payload unchanged', () => {
    const result = sanitizeAnalysisResult(validImagenPayload);
    expect(result.intent).toBe(ImageIntent.GENERAR);
    expect(result.targets).toEqual([ImageTarget.ROSTRO, ImageTarget.ILUMINACION]);
    expect(result.inputMode).toBe(InputMode.TEXTO_A_IMAGEN);
    expect(result.preservation).toBe(Preservation.LIBRE);
    expect(result.subcategory).toBe('generacion-retrato');
  });

  it('nulls invalid intent without throwing', () => {
    const result = sanitizeAnalysisResult({
      ...validImagenPayload,
      intent: 'BOGUS' as ImageIntent,
    });
    expect(result.intent).toBeNull();
    expect(console.warn).toHaveBeenCalled();
  });

  it('strips invalid target entries', () => {
    const result = sanitizeAnalysisResult({
      ...validImagenPayload,
      targets: [ImageTarget.ROSTRO, 'INVALID' as ImageTarget],
    });
    expect(result.targets).toEqual([ImageTarget.ROSTRO]);
    expect(console.warn).toHaveBeenCalled();
  });

  it('nulls all intent fields for non-IMAGEN category', () => {
    const result = sanitizeAnalysisResult({
      ...validImagenPayload,
      category: Category.TEXTO,
      intent: ImageIntent.GENERAR,
      targets: [ImageTarget.ROSTRO],
      inputMode: InputMode.TEXTO_A_IMAGEN,
      preservation: Preservation.IDENTIDAD,
    });
    expect(result.intent).toBeNull();
    expect(result.targets).toEqual([]);
    expect(result.inputMode).toBeNull();
    expect(result.preservation).toBeNull();
  });

  it('nulls invalid subcategory for valid intent', () => {
    const result = sanitizeAnalysisResult({
      ...validImagenPayload,
      subcategory: 'old-freeform-value',
    });
    expect(result.subcategory).toBeNull();
    expect(console.warn).toHaveBeenCalled();
  });

  it('preserves valid subcategory for intent', () => {
    const result = sanitizeAnalysisResult({
      ...validImagenPayload,
      intent: ImageIntent.RETOQUE,
      subcategory: 'retoque-facial',
    });
    expect(result.subcategory).toBe('retoque-facial');
  });

  it('nulls subcategory when intent is null', () => {
    const result = sanitizeAnalysisResult({
      ...validImagenPayload,
      intent: null,
      subcategory: 'generacion-retrato',
    });
    expect(result.subcategory).toBeNull();
  });

  it('nulls invalid inputMode and preservation', () => {
    const result = sanitizeAnalysisResult({
      ...validImagenPayload,
      inputMode: 'INVALID' as InputMode,
      preservation: 'INVALID' as Preservation,
    });
    expect(result.inputMode).toBeNull();
    expect(result.preservation).toBeNull();
  });

  it('normalizes undefined intent to null', () => {
    const result = sanitizeAnalysisResult({
      ...validImagenPayload,
      intent: undefined,
    });
    expect(result.intent).toBeNull();
    expect(result.subcategory).toBeNull();
  });

  it('treats non-array targets as empty array', () => {
    const result = sanitizeAnalysisResult({
      ...validImagenPayload,
      targets: 'ROSTRO' as unknown as ImageTarget[],
    });
    expect(result.targets).toEqual([]);
  });

  it('drops all targets when every entry is invalid', () => {
    const result = sanitizeAnalysisResult({
      ...validImagenPayload,
      targets: ['BAD1', 'BAD2'] as unknown as ImageTarget[],
    });
    expect(result.targets).toEqual([]);
    expect(console.warn).toHaveBeenCalled();
  });

  it('nulls intent fields for VIDEO category same as TEXTO', () => {
    const result = sanitizeAnalysisResult({
      ...validImagenPayload,
      category: Category.VIDEO,
      intent: ImageIntent.GENERAR,
      targets: [ImageTarget.ROSTRO],
      inputMode: InputMode.TEXTO_A_IMAGEN,
      preservation: Preservation.LIBRE,
    });
    expect(result.intent).toBeNull();
    expect(result.targets).toEqual([]);
    expect(result.inputMode).toBeNull();
    expect(result.preservation).toBeNull();
  });

  it('defaults invalid category to TEXTO with warning', () => {
    const result = sanitizeAnalysisResult({
      ...validImagenPayload,
      category: 'INVALID' as Category,
    });
    expect(result.category).toBe(Category.TEXTO);
    expect(result.intent).toBeNull();
    expect(console.warn).toHaveBeenCalled();
  });

  it('drops unknown keys from AI response', () => {
    const result = sanitizeAnalysisResult({
      ...validImagenPayload,
      injectedField: 'malicious',
      extra: 123,
    } as AnalysisResult & Record<string, unknown>);
    expect(result).not.toHaveProperty('injectedField');
    expect(result).not.toHaveProperty('extra');
    expect(console.warn).toHaveBeenCalled();
  });

  it('truncates title and description to max bounds', () => {
    const result = sanitizeAnalysisResult({
      ...validImagenPayload,
      title: 'a'.repeat(150),
      description: 'b'.repeat(400),
    });
    expect(result.title).toHaveLength(100);
    expect(result.description).toHaveLength(300);
  });

  it('sanitizes tags to lowercase hyphenated slugs', () => {
    const result = sanitizeAnalysisResult({
      ...validImagenPayload,
      tags: ['Portrait Style', 'UPPER', 'bad chars!@#', 'valid-tag'],
    });
    expect(result.tags).toEqual(['portrait-style', 'upper', 'bad-chars', 'valid-tag']);
  });

  it('deduplicates tags and caps count', () => {
    const manyTags = Array.from({ length: 25 }, (_, i) => `tag-${i}`);
    const result = sanitizeAnalysisResult({
      ...validImagenPayload,
      tags: ['duplicate', 'Duplicate', ...manyTags],
    });
    expect(result.tags.length).toBeLessThanOrEqual(20);
    expect(result.tags.filter((t) => t === 'duplicate')).toHaveLength(1);
  });

  it('clamps confidence to 0-1 range', () => {
    expect(sanitizeAnalysisResult({ ...validImagenPayload, confidence: 1.5 }).confidence).toBe(1);
    expect(sanitizeAnalysisResult({ ...validImagenPayload, confidence: -0.5 }).confidence).toBe(0);
    expect(sanitizeAnalysisResult({ ...validImagenPayload, confidence: 'bad' as unknown as number }).confidence).toBe(0);
  });

  it('returns empty metadata for non-object values', () => {
    expect(sanitizeAnalysisResult({ ...validImagenPayload, metadata: null }).metadata).toEqual({});
    expect(sanitizeAnalysisResult({ ...validImagenPayload, metadata: 'bad' as unknown as Record<string, unknown> }).metadata).toEqual({});
  });

  it('deduplicates valid targets', () => {
    const result = sanitizeAnalysisResult({
      ...validImagenPayload,
      targets: [ImageTarget.ROSTRO, ImageTarget.ROSTRO, ImageTarget.PIEL],
    });
    expect(result.targets).toEqual([ImageTarget.ROSTRO, ImageTarget.PIEL]);
  });
});

describe('validateIntentCategoryCoherence', () => {
  it('returns null when effective category is IMAGEN', () => {
    expect(
      validateIntentCategoryCoherence(
        {
          intent: ImageIntent.GENERAR,
          targets: [ImageTarget.ROSTRO],
          inputMode: InputMode.TEXTO_A_IMAGEN,
          preservation: Preservation.LIBRE,
        },
        Category.IMAGEN
      )
    ).toBeNull();
  });

  it('rejects intent when effective category is TEXTO', () => {
    expect(
      validateIntentCategoryCoherence({ intent: ImageIntent.GENERAR }, Category.TEXTO)
    ).toBe('intent solo es válido cuando category es IMAGEN');
  });

  it('rejects non-empty targets when effective category is VIDEO', () => {
    expect(
      validateIntentCategoryCoherence({ targets: [ImageTarget.PIEL] }, Category.VIDEO)
    ).toBe('targets solo es válido cuando category es IMAGEN');
  });

  it('rejects inputMode when effective category is AUDIO', () => {
    expect(
      validateIntentCategoryCoherence(
        { inputMode: InputMode.IMAGEN_A_IMAGEN },
        Category.AUDIO
      )
    ).toBe('inputMode solo es válido cuando category es IMAGEN');
  });

  it('rejects preservation when effective category is null', () => {
    expect(
      validateIntentCategoryCoherence({ preservation: Preservation.IDENTIDAD }, null)
    ).toBe('preservation solo es válido cuando category es IMAGEN');
  });

  it('allows empty targets array on non-IMAGEN category', () => {
    expect(
      validateIntentCategoryCoherence({ targets: [] }, Category.TEXTO)
    ).toBeNull();
  });

  it('allows null intent on non-IMAGEN category', () => {
    expect(
      validateIntentCategoryCoherence({ intent: null }, Category.TEXTO)
    ).toBeNull();
  });
});

describe('sanitizePromptUpdate', () => {
  it('clears intent fields when category is not IMAGEN', () => {
    const result = sanitizePromptUpdate(
      {
        category: Category.TEXTO,
        intent: ImageIntent.GENERAR,
        targets: [ImageTarget.ROSTRO],
        inputMode: InputMode.TEXTO_A_IMAGEN,
        preservation: Preservation.LIBRE,
        subcategory: 'legacy-value',
      },
      { category: Category.IMAGEN }
    );
    expect(result.intent).toBeNull();
    expect(result.targets).toEqual([]);
    expect(result.inputMode).toBeNull();
    expect(result.preservation).toBeNull();
    expect(result.subcategory).toBe('legacy-value');
  });

  it('clears intent fields when existing category is not IMAGEN and category not in update', () => {
    const result = sanitizePromptUpdate(
      {
        intent: ImageIntent.GENERAR,
        targets: [ImageTarget.ROSTRO],
      },
      { category: Category.TEXTO }
    );
    expect(result.intent).toBeNull();
    expect(result.targets).toEqual([]);
  });

  it('preserves intent fields when category is IMAGEN', () => {
    const result = sanitizePromptUpdate(
      {
        category: Category.IMAGEN,
        intent: ImageIntent.RETOQUE,
        targets: [ImageTarget.PIEL],
        inputMode: InputMode.IMAGEN_A_IMAGEN,
        preservation: Preservation.IDENTIDAD,
      },
      { category: Category.TEXTO }
    );
    expect(result.intent).toBe(ImageIntent.RETOQUE);
    expect(result.targets).toEqual([ImageTarget.PIEL]);
    expect(result.inputMode).toBe(InputMode.IMAGEN_A_IMAGEN);
    expect(result.preservation).toBe(Preservation.IDENTIDAD);
  });

  it('preserves intent fields when existing category is IMAGEN and category omitted', () => {
    const result = sanitizePromptUpdate(
      {
        intent: ImageIntent.GENERAR,
        targets: [ImageTarget.ROSTRO],
      },
      { category: Category.IMAGEN }
    );
    expect(result.intent).toBe(ImageIntent.GENERAR);
    expect(result.targets).toEqual([ImageTarget.ROSTRO]);
  });

  it('deduplicates targets on IMAGEN update', () => {
    const result = sanitizePromptUpdate(
      {
        targets: [ImageTarget.ROSTRO, ImageTarget.ROSTRO, ImageTarget.PIEL],
      },
      { category: Category.IMAGEN, intent: ImageIntent.GENERAR }
    );
    expect(result.targets).toEqual([ImageTarget.ROSTRO, ImageTarget.PIEL]);
  });

  it('nulls subcategory when intent is null on IMAGEN', () => {
    const result = sanitizePromptUpdate(
      { intent: null },
      {
        category: Category.IMAGEN,
        intent: ImageIntent.GENERAR,
        subcategory: 'generacion-retrato',
      }
    );
    expect(result.intent).toBeNull();
    expect(result.subcategory).toBeNull();
  });

  it('nulls controlled subcategory that does not match intent', () => {
    const result = sanitizePromptUpdate(
      {
        intent: ImageIntent.RETOQUE,
        subcategory: 'generacion-retrato',
      },
      { category: Category.IMAGEN }
    );
    expect(result.subcategory).toBeNull();
  });

  it('preserves grandfathered freeform subcategory on IMAGEN', () => {
    const result = sanitizePromptUpdate(
      { intent: ImageIntent.GENERAR },
      {
        category: Category.IMAGEN,
        intent: ImageIntent.GENERAR,
        subcategory: 'old-freeform-value',
      }
    );
    expect(result.subcategory).toBeUndefined();
  });

  it('clears intent fields on category demotion IMAGEN to TEXTO without intent in body', () => {
    const result = sanitizePromptUpdate(
      { category: Category.TEXTO },
      {
        category: Category.IMAGEN,
        intent: ImageIntent.GENERAR,
        subcategory: 'generacion-retrato',
      }
    );
    expect(result.category).toBe(Category.TEXTO);
    expect(result.intent).toBeNull();
    expect(result.targets).toEqual([]);
    expect(result.inputMode).toBeNull();
    expect(result.preservation).toBeNull();
    expect(result.subcategory).toBeUndefined();
  });
});