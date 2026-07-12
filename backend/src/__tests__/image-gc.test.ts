import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../config/database', () => ({
  default: {
    prompt: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    promptVersion: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../services/image.service', () => ({
  deleteImage: vi.fn(),
  deleteImages: vi.fn(),
}));

import prisma from '../config/database';
import * as imageService from '../services/image.service';
import {
  isImageReferenced,
  collectImageUrlsForPrompt,
  safeDeleteImages,
} from '../services/version.service';

const mockedPrisma = prisma as unknown as {
  prompt: {
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
  promptVersion: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe('isImageReferenced', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when live Prompt still references the URL', async () => {
    mockedPrisma.prompt.findFirst.mockResolvedValue({ id: 'p2' });
    mockedPrisma.promptVersion.findFirst.mockResolvedValue(null);

    const result = await isImageReferenced('/uploads/a.webp');

    expect(result).toBe(true);
    expect(mockedPrisma.prompt.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { imageUrl: '/uploads/a.webp' },
            { thumbnailUrl: '/uploads/a.webp' },
          ]),
        }),
      })
    );
  });

  it('returns true when a PromptVersion references the URL even if live does not', async () => {
    mockedPrisma.prompt.findFirst.mockResolvedValue(null);
    mockedPrisma.promptVersion.findFirst.mockResolvedValue({ id: 'v1' });

    const result = await isImageReferenced('/uploads/old.webp');

    expect(result).toBe(true);
    expect(mockedPrisma.promptVersion.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { imageUrl: '/uploads/old.webp' },
            { thumbnailUrl: '/uploads/old.webp' },
          ]),
        }),
      })
    );
  });

  it('returns false when no Prompt or PromptVersion references the URL', async () => {
    mockedPrisma.prompt.findFirst.mockResolvedValue(null);
    mockedPrisma.promptVersion.findFirst.mockResolvedValue(null);

    const result = await isImageReferenced('/uploads/orphan.webp');

    expect(result).toBe(false);
  });

  it('excludes a prompt id when excludePromptId is provided', async () => {
    mockedPrisma.prompt.findFirst.mockResolvedValue(null);
    mockedPrisma.promptVersion.findFirst.mockResolvedValue(null);

    await isImageReferenced('/uploads/a.webp', 'p1');

    expect(mockedPrisma.prompt.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          NOT: { id: 'p1' },
        }),
      })
    );
    expect(mockedPrisma.promptVersion.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          NOT: { promptId: 'p1' },
        }),
      })
    );
  });
});

describe('collectImageUrlsForPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns union of live and version image URLs without duplicates', async () => {
    mockedPrisma.prompt.findUnique.mockResolvedValue({
      imageUrl: '/uploads/live.webp',
      thumbnailUrl: '/uploads/live-thumb.webp',
    });
    mockedPrisma.promptVersion.findMany.mockResolvedValue([
      { imageUrl: '/uploads/v1.webp', thumbnailUrl: '/uploads/v1-thumb.webp' },
      { imageUrl: '/uploads/live.webp', thumbnailUrl: '/uploads/live-thumb.webp' },
      { imageUrl: null, thumbnailUrl: null },
    ]);

    const urls = await collectImageUrlsForPrompt('p1');

    expect(urls.sort()).toEqual(
      [
        '/uploads/live.webp',
        '/uploads/live-thumb.webp',
        '/uploads/v1.webp',
        '/uploads/v1-thumb.webp',
      ].sort()
    );
  });

  it('returns empty array when prompt is missing', async () => {
    mockedPrisma.prompt.findUnique.mockResolvedValue(null);

    const urls = await collectImageUrlsForPrompt('missing');

    expect(urls).toEqual([]);
  });
});

describe('safeDeleteImages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes only URLs with zero remaining references', async () => {
    // First URL still referenced by a version; second is orphan
    mockedPrisma.prompt.findFirst
      .mockResolvedValueOnce(null) // for /uploads/keep.webp
      .mockResolvedValueOnce(null); // for /uploads/orphan.webp
    mockedPrisma.promptVersion.findFirst
      .mockResolvedValueOnce({ id: 'v1' }) // keep is referenced
      .mockResolvedValueOnce(null); // orphan not referenced

    vi.mocked(imageService.deleteImage).mockResolvedValue(undefined);

    await safeDeleteImages(['/uploads/keep.webp', '/uploads/orphan.webp']);

    expect(imageService.deleteImage).toHaveBeenCalledTimes(1);
    expect(imageService.deleteImage).toHaveBeenCalledWith('/uploads/orphan.webp');
    expect(imageService.deleteImage).not.toHaveBeenCalledWith('/uploads/keep.webp');
  });

  it('skips null/empty URLs', async () => {
    await safeDeleteImages([null, '', undefined as unknown as string]);

    expect(imageService.deleteImage).not.toHaveBeenCalled();
    expect(mockedPrisma.prompt.findFirst).not.toHaveBeenCalled();
  });
});
