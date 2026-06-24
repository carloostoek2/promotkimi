import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response } from 'express';
import { getPrompts, updatePrompt } from '../controllers/prompt.controller';
import * as promptService from '../services/prompt.service';
import { Category, ImageIntent, ImageTarget, InputMode, Preservation } from '@prisma/client';

vi.mock('../config/queue', () => ({
  queueAnalysis: vi.fn(),
}));

function createMockResponse() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe('getPrompts intent categorization query params', () => {
  beforeEach(() => {
    vi.spyOn(promptService, 'getPrompts').mockResolvedValue([]);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes valid intent categorization filters to the service', async () => {
    const req = {
      query: {
        category: Category.IMAGEN,
        intent: ImageIntent.RETOQUE,
        target: ImageTarget.PIEL,
        inputMode: InputMode.IMAGEN_A_IMAGEN,
        preservation: Preservation.IDENTIDAD,
      },
    } as unknown as Request;
    const res = createMockResponse();

    await getPrompts(req, res);

    expect(promptService.getPrompts).toHaveBeenCalledWith(
      expect.objectContaining({
        category: Category.IMAGEN,
        intent: ImageIntent.RETOQUE,
        target: ImageTarget.PIEL,
        inputMode: InputMode.IMAGEN_A_IMAGEN,
        preservation: Preservation.IDENTIDAD,
      })
    );
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [],
      count: 0,
    });
  });

  it('returns 400 for invalid category query param', async () => {
    const req = {
      query: { category: 'NOT_A_CATEGORY' },
    } as unknown as Request;
    const res = createMockResponse();

    await getPrompts(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Valor inválido para category: NOT_A_CATEGORY',
    });
    expect(promptService.getPrompts).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid intent query param', async () => {
    const req = {
      query: { intent: 'INVALID_INTENT' },
    } as unknown as Request;
    const res = createMockResponse();

    await getPrompts(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Valor inválido para intent: INVALID_INTENT',
    });
    expect(promptService.getPrompts).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid target query param', async () => {
    const req = {
      query: { target: 'NOT_A_TARGET' },
    } as unknown as Request;
    const res = createMockResponse();

    await getPrompts(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Valor inválido para target: NOT_A_TARGET',
    });
    expect(promptService.getPrompts).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid inputMode query param', async () => {
    const req = {
      query: { inputMode: 'NOT_A_MODE' },
    } as unknown as Request;
    const res = createMockResponse();

    await getPrompts(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Valor inválido para inputMode: NOT_A_MODE',
    });
    expect(promptService.getPrompts).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid preservation query param', async () => {
    const req = {
      query: { preservation: 'NOT_A_PRESERVATION' },
    } as unknown as Request;
    const res = createMockResponse();

    await getPrompts(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Valor inválido para preservation: NOT_A_PRESERVATION',
    });
    expect(promptService.getPrompts).not.toHaveBeenCalled();
  });

  it('returns 400 for non-string enum query param', async () => {
    const req = {
      query: { inputMode: ['TEXTO_A_IMAGEN'] },
    } as unknown as Request;
    const res = createMockResponse();

    await getPrompts(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Valor inválido para inputMode: TEXTO_A_IMAGEN',
    });
    expect(promptService.getPrompts).not.toHaveBeenCalled();
  });

  it('omits empty intent filter values', async () => {
    const req = {
      query: {
        intent: '',
        target: undefined,
        inputMode: null,
        preservation: '',
      },
    } as unknown as Request;
    const res = createMockResponse();

    await getPrompts(req, res);

    expect(promptService.getPrompts).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: undefined,
        target: undefined,
        inputMode: undefined,
        preservation: undefined,
      })
    );
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [],
      count: 0,
    });
  });
});

describe('updatePrompt intent/category coherence', () => {
  const existingPrompt = {
    id: 'prompt-1',
    category: Category.IMAGEN,
    intent: ImageIntent.GENERAR,
    subcategory: 'generacion-retrato',
  };

  beforeEach(() => {
    vi.spyOn(promptService, 'getPromptById').mockResolvedValue(existingPrompt as never);
    vi.spyOn(promptService, 'updatePrompt').mockResolvedValue(existingPrompt as never);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects intent fields when category is explicitly non-IMAGEN', async () => {
    const req = {
      params: { id: 'prompt-1' },
      body: {
        category: Category.TEXTO,
        intent: ImageIntent.GENERAR,
      },
    } as unknown as Request;
    const res = createMockResponse();

    await updatePrompt(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'intent solo es válido cuando category es IMAGEN',
      })
    );
    expect(promptService.updatePrompt).not.toHaveBeenCalled();
  });

  it('rejects targets when category is VIDEO', async () => {
    const req = {
      params: { id: 'prompt-1' },
      body: {
        category: Category.VIDEO,
        targets: [ImageTarget.ROSTRO],
      },
    } as unknown as Request;
    const res = createMockResponse();

    await updatePrompt(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'targets solo es válido cuando category es IMAGEN',
      })
    );
    expect(promptService.updatePrompt).not.toHaveBeenCalled();
  });

  it('rejects inputMode when category is TEXTO', async () => {
    const req = {
      params: { id: 'prompt-1' },
      body: {
        category: Category.TEXTO,
        inputMode: InputMode.TEXTO_A_IMAGEN,
      },
    } as unknown as Request;
    const res = createMockResponse();

    await updatePrompt(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'inputMode solo es válido cuando category es IMAGEN',
      })
    );
    expect(promptService.updatePrompt).not.toHaveBeenCalled();
  });

  it('rejects preservation when category is VIDEO', async () => {
    const req = {
      params: { id: 'prompt-1' },
      body: {
        category: Category.VIDEO,
        preservation: Preservation.LIBRE,
      },
    } as unknown as Request;
    const res = createMockResponse();

    await updatePrompt(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'preservation solo es válido cuando category es IMAGEN',
      })
    );
    expect(promptService.updatePrompt).not.toHaveBeenCalled();
  });

  it('rejects intent fields on partial PUT when existing category is non-IMAGEN', async () => {
    vi.spyOn(promptService, 'getPromptById').mockResolvedValue({
      ...existingPrompt,
      category: Category.TEXTO,
    } as never);

    const req = {
      params: { id: 'prompt-1' },
      body: { intent: ImageIntent.GENERAR },
    } as unknown as Request;
    const res = createMockResponse();

    await updatePrompt(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'intent solo es válido cuando category es IMAGEN',
      })
    );
    expect(promptService.updatePrompt).not.toHaveBeenCalled();
  });

  it('rejects invalid category enum in body', async () => {
    const req = {
      params: { id: 'prompt-1' },
      body: { category: 'BOGUS_CATEGORY' },
    } as unknown as Request;
    const res = createMockResponse();

    await updatePrompt(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
    expect(promptService.updatePrompt).not.toHaveBeenCalled();
  });

  it('rejects invalid targets element in body', async () => {
    const req = {
      params: { id: 'prompt-1' },
      body: { targets: ['NOT_A_TARGET'] },
    } as unknown as Request;
    const res = createMockResponse();

    await updatePrompt(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
    expect(promptService.updatePrompt).not.toHaveBeenCalled();
  });

  it('rejects invalid inputMode enum in body', async () => {
    const req = {
      params: { id: 'prompt-1' },
      body: { inputMode: 'INVALID_MODE' },
    } as unknown as Request;
    const res = createMockResponse();

    await updatePrompt(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
    expect(promptService.updatePrompt).not.toHaveBeenCalled();
  });

  it('rejects invalid preservation enum in body', async () => {
    const req = {
      params: { id: 'prompt-1' },
      body: { preservation: 'INVALID_PRESERVATION' },
    } as unknown as Request;
    const res = createMockResponse();

    await updatePrompt(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
    expect(promptService.updatePrompt).not.toHaveBeenCalled();
  });

  it('rejects invalid intent enum in body', async () => {
    const req = {
      params: { id: 'prompt-1' },
      body: { intent: 'BOGUS_INTENT' },
    } as unknown as Request;
    const res = createMockResponse();

    await updatePrompt(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
      })
    );
    expect(promptService.updatePrompt).not.toHaveBeenCalled();
  });

  it('returns 404 when prompt not found', async () => {
    vi.spyOn(promptService, 'getPromptById').mockResolvedValue(null);

    const req = {
      params: { id: 'missing-id' },
      body: { title: 'Updated title' },
    } as unknown as Request;
    const res = createMockResponse();

    await updatePrompt(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Prompt no encontrado',
    });
    expect(promptService.updatePrompt).not.toHaveBeenCalled();
  });

  it('accepts partial PUT with only intent on existing IMAGEN prompt', async () => {
    const req = {
      params: { id: 'prompt-1' },
      body: { intent: ImageIntent.RETOQUE },
    } as unknown as Request;
    const res = createMockResponse();

    await updatePrompt(req, res);

    expect(promptService.updatePrompt).toHaveBeenCalledWith(
      'prompt-1',
      { intent: ImageIntent.RETOQUE },
      {
        category: Category.IMAGEN,
        intent: ImageIntent.GENERAR,
        subcategory: 'generacion-retrato',
      }
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
    expect(res.status).not.toHaveBeenCalledWith(400);
  });

  it('accepts intent fields when category is IMAGEN', async () => {
    const req = {
      params: { id: 'prompt-1' },
      body: {
        category: Category.IMAGEN,
        intent: ImageIntent.RETOQUE,
        targets: [ImageTarget.PIEL],
        inputMode: InputMode.IMAGEN_A_IMAGEN,
        preservation: Preservation.IDENTIDAD,
      },
    } as unknown as Request;
    const res = createMockResponse();

    await updatePrompt(req, res);

    expect(promptService.updatePrompt).toHaveBeenCalledWith(
      'prompt-1',
      expect.objectContaining({
        category: Category.IMAGEN,
        intent: ImageIntent.RETOQUE,
        targets: [ImageTarget.PIEL],
      }),
      {
        category: Category.IMAGEN,
        intent: ImageIntent.GENERAR,
        subcategory: 'generacion-retrato',
      }
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
      })
    );
  });
});