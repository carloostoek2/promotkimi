import { ImageIntent, ImageTarget, InputMode, Preservation } from '@prisma/client';

export const INTENT_SUBCATEGORIES: Record<ImageIntent, readonly string[]> = {
  GENERAR: ['generacion-retrato', 'generacion-escena', 'generacion-personaje'],
  MEJORAR_REALISMO: ['mejora-dslr', 'mejora-candid', 'mejora-cinematico'],
  TRANSFORMAR: ['transformacion-selfie', 'transformacion-espejo', 'transformacion-pov'],
  RETOQUE: ['retoque-facial', 'retoque-piel', 'retoque-iluminacion', 'retoque-sombras'],
  COMPONER: ['composicion-face-swap', 'composicion-integracion', 'composicion-cuerpo-cara'],
  DEFINIR_IDENTIDAD: ['definicion-identidad', 'definicion-morfologia'],
  MODIFICAR_POSE: ['modificacion-pose', 'modificacion-expresion'],
};

export const ALL_INTENTS = Object.values(ImageIntent);
export const ALL_TARGETS = Object.values(ImageTarget);
export const ALL_INPUT_MODES = Object.values(InputMode);
export const ALL_PRESERVATIONS = Object.values(Preservation);

export function getSubcategoriesForIntent(intent: ImageIntent): readonly string[] {
  return INTENT_SUBCATEGORIES[intent];
}

export function isValidSubcategory(
  intent: ImageIntent | null | undefined,
  subcategory: string | null | undefined
): boolean {
  if (!intent || !subcategory) {
    return false;
  }
  return INTENT_SUBCATEGORIES[intent].includes(subcategory);
}