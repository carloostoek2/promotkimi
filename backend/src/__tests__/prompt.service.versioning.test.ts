import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../config/database', () => ({
  default: {
    prompt: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    promptTag: {
      deleteMany: vi.fn(),
    },
    tag: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock('../services/version.service', () => ({
  maybeCapture: vi.fn(),
}));

import prisma from '../config/database';
import * as versionService from '../services/version.service';
import {
  createPrompt,
  updatePrompt,
  updatePromptImages,
  toggleFavorite,
} from '../services/prompt.service';

const mockedPrisma = prisma as unknown as {
  prompt: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
  promptTag: { deleteMany: ReturnType<typeof vi.fn> };
  tag: { upsert: ReturnType<typeof vi.fn> };
};

describe('prompt.service version capture hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls maybeCapture(CREATE) after createPrompt', async () => {
    const created = {
      id: 'p1',
      content: 'hello',
      tags: [],
    };
    mockedPrisma.prompt.create.mockResolvedValue(created);
    vi.mocked(versionService.maybeCapture).mockResolvedValue({ id: 'v1' } as never);

    const result = await createPrompt({ content: 'hello' });

    expect(result).toEqual(created);
    expect(versionService.maybeCapture).toHaveBeenCalledWith('p1', 'CREATE');
  });

  it('calls maybeCapture(UPDATE) after updatePrompt', async () => {
    const updated = {
      id: 'p1',
      content: 'updated',
      category: 'IMAGEN',
      intent: null,
      subcategory: null,
      tags: [],
    };
    mockedPrisma.prompt.findUnique.mockResolvedValue({
      category: 'IMAGEN',
      intent: null,
      subcategory: null,
    });
    mockedPrisma.prompt.update.mockResolvedValue(updated);
    vi.mocked(versionService.maybeCapture).mockResolvedValue({ id: 'v2' } as never);

    const result = await updatePrompt('p1', { content: 'updated' });

    expect(result).toEqual(updated);
    expect(versionService.maybeCapture).toHaveBeenCalledWith('p1', 'UPDATE');
  });

  it('calls maybeCapture(IMAGE) after updatePromptImages', async () => {
    const updated = {
      id: 'p1',
      imageUrl: '/new.jpg',
      thumbnailUrl: '/new-thumb.jpg',
      tags: [],
    };
    mockedPrisma.prompt.update.mockResolvedValue(updated);
    vi.mocked(versionService.maybeCapture).mockResolvedValue({ id: 'v3' } as never);

    const result = await updatePromptImages('p1', '/new.jpg', '/new-thumb.jpg');

    expect(result).toEqual(updated);
    expect(versionService.maybeCapture).toHaveBeenCalledWith('p1', 'IMAGE');
  });

  it('does not call maybeCapture on favorite-only toggle', async () => {
    mockedPrisma.prompt.findUnique.mockResolvedValue({ isFavorite: false });
    mockedPrisma.prompt.update.mockResolvedValue({
      id: 'p1',
      isFavorite: true,
      tags: [],
    });

    await toggleFavorite('p1');

    expect(versionService.maybeCapture).not.toHaveBeenCalled();
  });
});
