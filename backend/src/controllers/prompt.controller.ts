import { Request, Response } from 'express';
import { z } from 'zod';
import * as promptService from '../services/prompt.service';
import * as imageService from '../services/image.service';
import { queueAnalysis } from '../config/queue';
import { Category, ImageIntent, ImageTarget, InputMode, Preservation } from '@prisma/client';
import { validateIntentCategoryCoherence } from '../utils/intentValidation';

// ==================== VALIDATION SCHEMAS ====================

const createPromptSchema = z.object({
  content: z.string().min(1, 'El contenido es requerido'),
  analyzeWithAI: z.preprocess(
    (val) => val === 'true' ? true : val === 'false' ? false : val,
    z.boolean().optional().default(true)
  )
});

const updatePromptSchema = z.object({
  title: z.string().max(200).optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  category: z.nativeEnum(Category).optional(),
  subcategory: z.string().max(50).optional(),
  intent: z.nativeEnum(ImageIntent).nullable().optional(),
  targets: z.array(z.nativeEnum(ImageTarget)).optional(),
  inputMode: z.nativeEnum(InputMode).nullable().optional(),
  preservation: z.nativeEnum(Preservation).nullable().optional(),
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
});

function parseEnumParam<T extends string>(
  value: unknown,
  enumObj: Record<string, T>,
  fieldName: string
): T | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new Error(`Valor inválido para ${fieldName}: ${String(value)}`);
  }
  const enumValues = Object.values(enumObj);
  if (!enumValues.includes(value as T)) {
    throw new Error(`Valor inválido para ${fieldName}: ${value}`);
  }
  return value as T;
}

// ==================== CONTROLLERS ====================

export async function createPrompt(req: Request, res: Response) {
  try {
    const validation = createPromptSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.errors[0].message
      });
    }

    const { content, analyzeWithAI } = validation.data;

    // Crear prompt
    const prompt = await promptService.createPrompt({ content, analyzeWithAI });

    // Procesar imagen si se subió
    if (req.file) {
      const processedImage = await imageService.processImage(req.file);
      await promptService.updatePromptImages(
        prompt.id,
        processedImage.originalUrl,
        processedImage.thumbnailUrl
      );
    }

    // Encolar análisis si es necesario
    if (analyzeWithAI) {
      await queueAnalysis(prompt.id, content);
    }

    // Obtener prompt actualizado
    const updatedPrompt = await promptService.getPromptById(prompt.id);

    return res.status(201).json({
      success: true,
      data: updatedPrompt,
      message: analyzeWithAI 
        ? 'Prompt creado y en proceso de análisis' 
        : 'Prompt creado exitosamente'
    });

  } catch (error) {
    console.error('Error creando prompt:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
}

export async function getPrompts(req: Request, res: Response) {
  try {
    let category: Category | undefined;
    let intent: ImageIntent | undefined;
    let target: ImageTarget | undefined;
    let inputMode: InputMode | undefined;
    let preservation: Preservation | undefined;

    try {
      category = parseEnumParam(req.query.category, Category, 'category');
      intent = parseEnumParam(req.query.intent, ImageIntent, 'intent');
      target = parseEnumParam(req.query.target, ImageTarget, 'target');
      inputMode = parseEnumParam(req.query.inputMode, InputMode, 'inputMode');
      preservation = parseEnumParam(req.query.preservation, Preservation, 'preservation');
    } catch (enumError) {
      return res.status(400).json({
        success: false,
        error: enumError instanceof Error ? enumError.message : 'Parámetro de filtro inválido',
      });
    }

    const filters = {
      search: req.query.search as string | undefined,
      category,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      isFavorite: req.query.isFavorite === 'true' ? true :
                  req.query.isFavorite === 'false' ? false : undefined,
      intent,
      target,
      inputMode,
      preservation,
      sortBy: (req.query.sortBy as 'createdAt' | 'updatedAt' | 'title') || 'createdAt',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
    };

    const prompts = await promptService.getPrompts(filters);

    return res.json({
      success: true,
      data: prompts,
      count: prompts.length
    });

  } catch (error) {
    console.error('Error obteniendo prompts:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
}

export async function getPromptById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const prompt = await promptService.getPromptById(id);

    if (!prompt) {
      return res.status(404).json({
        success: false,
        error: 'Prompt no encontrado'
      });
    }

    return res.json({
      success: true,
      data: prompt
    });

  } catch (error) {
    console.error('Error obteniendo prompt:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
}

export async function updatePrompt(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const existingPrompt = await promptService.getPromptById(id);
    if (!existingPrompt) {
      return res.status(404).json({
        success: false,
        error: 'Prompt no encontrado'
      });
    }

    const validation = updatePromptSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.errors[0].message
      });
    }

    const effectiveCategory = validation.data.category ?? existingPrompt.category;
    const coherenceError = validateIntentCategoryCoherence(
      validation.data,
      effectiveCategory
    );

    if (coherenceError) {
      return res.status(400).json({
        success: false,
        error: coherenceError,
      });
    }

    const prompt = await promptService.updatePrompt(id, validation.data, {
      category: existingPrompt.category,
      intent: existingPrompt.intent ?? null,
      subcategory: existingPrompt.subcategory ?? null,
    });

    return res.json({
      success: true,
      data: prompt,
      message: 'Prompt actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error actualizando prompt:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
}

export async function deletePrompt(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Verificar que el prompt existe
    const prompt = await promptService.getPromptById(id);
    if (!prompt) {
      return res.status(404).json({
        success: false,
        error: 'Prompt no encontrado'
      });
    }

    // Eliminar imágenes asociadas
    if (prompt.imageUrl || prompt.thumbnailUrl) {
      await imageService.deleteImages(prompt.imageUrl, prompt.thumbnailUrl);
    }

    // Eliminar prompt
    await promptService.deletePrompt(id);

    return res.json({
      success: true,
      message: 'Prompt eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando prompt:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
}

export async function toggleFavorite(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const prompt = await promptService.toggleFavorite(id);

    return res.json({
      success: true,
      data: prompt,
      message: prompt.isFavorite ? 'Agregado a favoritos' : 'Removido de favoritos'
    });

  } catch (error) {
    console.error('Error toggling favorite:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
}

export async function updatePromptImage(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó ninguna imagen'
      });
    }

    // Verificar que el prompt existe
    const prompt = await promptService.getPromptById(id);
    if (!prompt) {
      return res.status(404).json({
        success: false,
        error: 'Prompt no encontrado'
      });
    }

    // Eliminar imágenes anteriores
    if (prompt.imageUrl || prompt.thumbnailUrl) {
      await imageService.deleteImages(prompt.imageUrl, prompt.thumbnailUrl);
    }

    // Procesar nueva imagen
    const processedImage = await imageService.processImage(req.file);

    // Actualizar prompt
    const updatedPrompt = await promptService.updatePromptImages(
      id,
      processedImage.originalUrl,
      processedImage.thumbnailUrl
    );

    return res.json({
      success: true,
      data: updatedPrompt,
      message: 'Imagen actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error actualizando imagen:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
}
