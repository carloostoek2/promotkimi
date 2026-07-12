import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response } from 'express';
import {
  listPromptVersions,
  getPromptVersion,
  restorePromptVersion,
} from '../controllers/version.controller';
import * as versionService from '../services/version.service';
import * as queueModule from '../config/queue';

vi.mock('../services/version.service', () => ({
  listVersions: vi.fn(),
  getVersion: vi.fn(),
  restoreVersion: vi.fn(),
}));

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

describe('listPromptVersions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 200 with newest-first summaries', async () => {
    const summaries = [
      { version: 3, createdAt: new Date('2026-01-03'), changeReason: 'UPDATE', title: 'v3' },
      { version: 2, createdAt: new Date('2026-01-02'), changeReason: 'IMAGE', title: 'v2' },
      { version: 1, createdAt: new Date('2026-01-01'), changeReason: 'CREATE', title: 'v1' },
    ];
    vi.mocked(versionService.listVersions).mockResolvedValue(summaries as never);

    const req = { params: { id: 'p1' } } as unknown as Request;
    const res = createMockResponse();

    await listPromptVersions(req, res);

    expect(versionService.listVersions).toHaveBeenCalledWith('p1');
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: summaries,
    });
    expect(res.status).not.toHaveBeenCalledWith(404);
  });

  it('returns 404 when prompt is missing', async () => {
    vi.mocked(versionService.listVersions).mockResolvedValue(null);

    const req = { params: { id: 'missing' } } as unknown as Request;
    const res = createMockResponse();

    await listPromptVersions(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Prompt no encontrado',
    });
  });

  it('returns 200 with empty array when prompt has no versions', async () => {
    vi.mocked(versionService.listVersions).mockResolvedValue([]);

    const req = { params: { id: 'p1' } } as unknown as Request;
    const res = createMockResponse();

    await listPromptVersions(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [],
    });
  });
});

describe('getPromptVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 200 with full snapshot when version exists', async () => {
    const detail = {
      version: 2,
      createdAt: new Date('2026-01-02'),
      changeReason: 'UPDATE',
      title: 'v2',
      description: 'd',
      content: 'c',
      category: 'IMAGEN',
      subcategory: null,
      intent: null,
      targets: [],
      inputMode: null,
      preservation: null,
      metadata: null,
      tags: ['a'],
      imageUrl: null,
      thumbnailUrl: null,
      analysisResult: null,
    };
    vi.mocked(versionService.getVersion).mockResolvedValue(detail as never);

    const req = { params: { id: 'p1', version: '2' } } as unknown as Request;
    const res = createMockResponse();

    await getPromptVersion(req, res);

    expect(versionService.getVersion).toHaveBeenCalledWith('p1', 2);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: detail,
    });
  });

  it('returns 404 when version is missing', async () => {
    vi.mocked(versionService.getVersion).mockResolvedValue(null);

    const req = { params: { id: 'p1', version: '99' } } as unknown as Request;
    const res = createMockResponse();

    await getPromptVersion(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Versión no encontrada',
    });
  });

  it('returns 400 for non-integer version param', async () => {
    const req = { params: { id: 'p1', version: 'abc' } } as unknown as Request;
    const res = createMockResponse();

    await getPromptVersion(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: expect.stringMatching(/versión|version/i),
    });
    expect(versionService.getVersion).not.toHaveBeenCalled();
  });
});

describe('restorePromptVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 200 with live head after restore and does not queue analysis', async () => {
    const liveHead = {
      id: 'p1',
      content: 'Restored content',
      isFavorite: true,
      analysisStatus: 'COMPLETED',
      tags: [],
    };
    vi.mocked(versionService.restoreVersion).mockResolvedValue(liveHead as never);

    const req = { params: { id: 'p1', version: '2' } } as unknown as Request;
    const res = createMockResponse();

    await restorePromptVersion(req, res);

    expect(versionService.restoreVersion).toHaveBeenCalledWith('p1', 2);
    expect(queueModule.queueAnalysis).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: liveHead,
      message: expect.stringMatching(/restaurad/i),
    });
  });

  it('returns 404 when version is missing', async () => {
    vi.mocked(versionService.restoreVersion).mockRejectedValue(
      Object.assign(new Error('Versión no encontrada'), { statusCode: 404 })
    );

    const req = { params: { id: 'p1', version: '99' } } as unknown as Request;
    const res = createMockResponse();

    await restorePromptVersion(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: expect.stringMatching(/versión|version/i),
    });
  });

  it('returns 404 when prompt is missing', async () => {
    vi.mocked(versionService.restoreVersion).mockRejectedValue(
      Object.assign(new Error('Prompt no encontrado'), { statusCode: 404 })
    );

    const req = { params: { id: 'missing', version: '1' } } as unknown as Request;
    const res = createMockResponse();

    await restorePromptVersion(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: expect.stringMatching(/prompt|no encontrado/i),
    });
  });

  it('returns 400 for non-integer version param', async () => {
    const req = { params: { id: 'p1', version: 'abc' } } as unknown as Request;
    const res = createMockResponse();

    await restorePromptVersion(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: expect.stringMatching(/versión|version/i),
    });
    expect(versionService.restoreVersion).not.toHaveBeenCalled();
  });
});
