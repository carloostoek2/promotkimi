import { describe, it, expect } from 'vitest';
import { buildPromptWhereClause } from '../utils/promptFilters';
import { Category, ImageIntent, ImageTarget, InputMode, Preservation } from '@prisma/client';

describe('buildPromptWhereClause', () => {
  it('returns empty object for empty filters', () => {
    expect(buildPromptWhereClause({})).toEqual({});
  });

  it('filters by intent', () => {
    expect(buildPromptWhereClause({ intent: ImageIntent.GENERAR })).toEqual({
      intent: ImageIntent.GENERAR,
    });
  });

  it('filters by target using has operator', () => {
    expect(buildPromptWhereClause({ target: ImageTarget.ROSTRO })).toEqual({
      targets: { has: ImageTarget.ROSTRO },
    });
  });

  it('filters by inputMode', () => {
    expect(buildPromptWhereClause({ inputMode: InputMode.TEXTO_A_IMAGEN })).toEqual({
      inputMode: InputMode.TEXTO_A_IMAGEN,
    });
  });

  it('filters by preservation', () => {
    expect(buildPromptWhereClause({ preservation: Preservation.IDENTIDAD })).toEqual({
      preservation: Preservation.IDENTIDAD,
    });
  });

  it('combines category, intent, and target with AND logic', () => {
    expect(
      buildPromptWhereClause({
        category: Category.IMAGEN,
        intent: ImageIntent.RETOQUE,
        target: ImageTarget.PIEL,
      })
    ).toEqual({
      category: Category.IMAGEN,
      intent: ImageIntent.RETOQUE,
      targets: { has: ImageTarget.PIEL },
    });
  });

  it('includes search OR clause when search is provided', () => {
    const where = buildPromptWhereClause({ search: 'portrait' });
    expect(where.OR).toHaveLength(3);
    expect(where.OR?.[0]).toEqual({ title: { contains: 'portrait', mode: 'insensitive' } });
  });

  it('filters by isFavorite', () => {
    expect(buildPromptWhereClause({ isFavorite: true })).toEqual({ isFavorite: true });
    expect(buildPromptWhereClause({ isFavorite: false })).toEqual({ isFavorite: false });
  });

  it('filters by category alone', () => {
    expect(buildPromptWhereClause({ category: Category.IMAGEN })).toEqual({
      category: Category.IMAGEN,
    });
  });

  it('normalizes tags for filter matching', () => {
    expect(
      buildPromptWhereClause({ tags: ['Portrait', ' Realistic '] })
    ).toEqual({
      tags: {
        some: {
          tag: {
            normalizedName: {
              in: ['portrait', 'realistic'],
            },
          },
        },
      },
    });
  });

  it('combines all intent categorization filters with AND logic', () => {
    expect(
      buildPromptWhereClause({
        intent: ImageIntent.RETOQUE,
        target: ImageTarget.PIEL,
        inputMode: InputMode.IMAGEN_A_IMAGEN,
        preservation: Preservation.IDENTIDAD,
      })
    ).toEqual({
      intent: ImageIntent.RETOQUE,
      targets: { has: ImageTarget.PIEL },
      inputMode: InputMode.IMAGEN_A_IMAGEN,
      preservation: Preservation.IDENTIDAD,
    });
  });

  it('combines search with intent filters without losing either', () => {
    const where = buildPromptWhereClause({
      search: 'retrato',
      intent: ImageIntent.GENERAR,
      target: ImageTarget.ROSTRO,
    });

    expect(where.OR).toHaveLength(3);
    expect(where.intent).toBe(ImageIntent.GENERAR);
    expect(where.targets).toEqual({ has: ImageTarget.ROSTRO });
  });
});