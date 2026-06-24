import {
  Category,
  ImageIntent,
  ImageTarget,
  InputMode,
  Preservation,
} from '@prisma/client';
import { AnalysisResult, UpdatePromptInput } from '../types';
import { INTENT_SUBCATEGORIES, isValidSubcategory } from '../constants/intentVocabulary';

export interface SanitizedAnalysisResult extends AnalysisResult {
  intent?: ImageIntent | null;
  targets?: ImageTarget[];
  inputMode?: InputMode | null;
  preservation?: Preservation | null;
}

const ANALYSIS_RESULT_KEYS = [
  'title',
  'description',
  'category',
  'subcategory',
  'intent',
  'targets',
  'inputMode',
  'preservation',
  'tags',
  'metadata',
  'confidence',
] as const;

const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 300;
const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 50;

function isValidEnumValue<T extends string>(
  value: unknown,
  enumObj: Record<string, T>
): value is T {
  return typeof value === 'string' && Object.values(enumObj).includes(value as T);
}

function pickWhitelistedKeys(raw: Record<string, unknown>): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  const unknownKeys: string[] = [];

  for (const key of Object.keys(raw)) {
    if (ANALYSIS_RESULT_KEYS.includes(key as (typeof ANALYSIS_RESULT_KEYS)[number])) {
      picked[key] = raw[key];
    } else {
      unknownKeys.push(key);
    }
  }

  if (unknownKeys.length > 0) {
    console.warn(
      `[sanitizeAnalysisResult] Dropped unknown keys: ${unknownKeys.join(', ')}`
    );
  }

  return picked;
}

function truncateString(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.slice(0, maxLen);
}

function sanitizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const tags: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') {
      continue;
    }
    const sanitized = item
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, MAX_TAG_LENGTH);
    if (sanitized && !tags.includes(sanitized) && tags.length < MAX_TAGS) {
      tags.push(sanitized);
    }
  }
  return tags;
}

function sanitizeMetadata(raw: unknown): Record<string, unknown> {
  if (raw === null || raw === undefined) {
    return {};
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  return raw as Record<string, unknown>;
}

function clampConfidence(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

export function sanitizeAnalysisResult(
  raw: AnalysisResult | Record<string, unknown>
): SanitizedAnalysisResult {
  const whitelisted = pickWhitelistedKeys(raw as Record<string, unknown>);

  let category: Category;
  if (isValidEnumValue(whitelisted.category, Category)) {
    category = whitelisted.category;
  } else {
    console.warn(
      `[sanitizeAnalysisResult] Invalid category: ${String(whitelisted.category)}`
    );
    category = Category.TEXTO;
  }

  const result: SanitizedAnalysisResult = {
    title: truncateString(whitelisted.title, MAX_TITLE_LENGTH),
    description: truncateString(whitelisted.description, MAX_DESCRIPTION_LENGTH),
    category,
    subcategory:
      typeof whitelisted.subcategory === 'string' ? whitelisted.subcategory : null,
    intent: (whitelisted.intent as ImageIntent | null | undefined) ?? null,
    targets: Array.isArray(whitelisted.targets)
      ? (whitelisted.targets as ImageTarget[])
      : [],
    inputMode: (whitelisted.inputMode as InputMode | null | undefined) ?? null,
    preservation:
      (whitelisted.preservation as Preservation | null | undefined) ?? null,
    tags: sanitizeTags(whitelisted.tags),
    metadata: sanitizeMetadata(whitelisted.metadata),
    confidence: clampConfidence(whitelisted.confidence),
  };

  if (result.category !== Category.IMAGEN) {
    result.intent = null;
    result.targets = [];
    result.inputMode = null;
    result.preservation = null;
    return result;
  }

  if (result.intent !== null && result.intent !== undefined) {
    if (!isValidEnumValue(result.intent, ImageIntent)) {
      console.warn(`[sanitizeAnalysisResult] Invalid intent: ${result.intent}`);
      result.intent = null;
    }
  } else {
    result.intent = null;
  }

  const validTargets: ImageTarget[] = [];
  const seenTargets = new Set<ImageTarget>();
  for (const target of result.targets ?? []) {
    if (isValidEnumValue(target, ImageTarget)) {
      if (!seenTargets.has(target)) {
        seenTargets.add(target);
        validTargets.push(target);
      }
    } else {
      console.warn(`[sanitizeAnalysisResult] Invalid target dropped: ${target}`);
    }
  }
  result.targets = validTargets;

  if (result.inputMode !== null && result.inputMode !== undefined) {
    if (!isValidEnumValue(result.inputMode, InputMode)) {
      console.warn(`[sanitizeAnalysisResult] Invalid inputMode: ${result.inputMode}`);
      result.inputMode = null;
    }
  } else {
    result.inputMode = null;
  }

  if (result.preservation !== null && result.preservation !== undefined) {
    if (!isValidEnumValue(result.preservation, Preservation)) {
      console.warn(`[sanitizeAnalysisResult] Invalid preservation: ${result.preservation}`);
      result.preservation = null;
    }
  } else {
    result.preservation = null;
  }

  if (result.intent) {
    if (!isValidSubcategory(result.intent, result.subcategory)) {
      console.warn(
        `[sanitizeAnalysisResult] Invalid subcategory "${result.subcategory}" for intent ${result.intent}`
      );
      result.subcategory = null;
    }
  } else {
    result.subcategory = null;
  }

  return result;
}

export interface PromptUpdateExisting {
  category?: Category | null;
  intent?: ImageIntent | null;
  subcategory?: string | null;
}

type IntentCoherenceInput = Pick<
  UpdatePromptInput,
  'intent' | 'targets' | 'inputMode' | 'preservation'
>;

/**
 * Rejects PUT bodies that send IMAGEN-only intent fields when the effective category is not IMAGEN.
 * Used after resolving effectiveCategory = body.category ?? existing.category.
 */
export function validateIntentCategoryCoherence(
  data: IntentCoherenceInput,
  effectiveCategory: Category | null | undefined
): string | null {
  if (effectiveCategory === Category.IMAGEN) {
    return null;
  }

  if (data.intent !== undefined && data.intent !== null) {
    return 'intent solo es válido cuando category es IMAGEN';
  }
  if (data.targets !== undefined && data.targets.length > 0) {
    return 'targets solo es válido cuando category es IMAGEN';
  }
  if (data.inputMode !== undefined && data.inputMode !== null) {
    return 'inputMode solo es válido cuando category es IMAGEN';
  }
  if (data.preservation !== undefined && data.preservation !== null) {
    return 'preservation solo es válido cuando category es IMAGEN';
  }

  return null;
}

function isControlledSubcategory(subcategory: string): boolean {
  return Object.values(INTENT_SUBCATEGORIES).some((list) => list.includes(subcategory));
}

/**
 * Sanitizes manual PUT updates for intent categorization fields.
 *
 * Grandfathered subcategories: free-form strings (not in the controlled vocabulary) are kept
 * on IMAGEN prompts even when they do not match the current intent. Controlled vocabulary slugs
 * that mismatch the effective intent are nulled. When category is not IMAGEN, intent fields are
 * cleared but subcategory is left untouched (not included in the returned patch).
 */
export function sanitizePromptUpdate(
  data: UpdatePromptInput,
  existing: PromptUpdateExisting = {}
): UpdatePromptInput {
  const effectiveCategory =
    data.category !== undefined ? data.category : existing.category;

  if (effectiveCategory !== Category.IMAGEN) {
    return {
      ...data,
      intent: null,
      targets: [],
      inputMode: null,
      preservation: null,
    };
  }

  const result: UpdatePromptInput = { ...data };

  if (result.targets !== undefined) {
    result.targets = [...new Set(result.targets)];
  }

  const effectiveIntent =
    result.intent !== undefined ? result.intent : existing.intent ?? null;

  if (effectiveIntent === null) {
    return {
      ...result,
      intent: null,
      subcategory: null,
    };
  }

  const subcategory =
    result.subcategory !== undefined ? result.subcategory : existing.subcategory ?? null;

  if (subcategory && !isValidSubcategory(effectiveIntent, subcategory)) {
    if (isControlledSubcategory(subcategory)) {
      result.subcategory = null;
    }
  }

  return result;
}