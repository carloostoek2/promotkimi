import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  toComparable,
  buildSnapshotFromPrompt,
  maybeCapture,
  listVersions,
  getVersion,
  restoreVersion,
  type VersionSnapshot,
} from '../services/version.service';

vi.mock('../config/database', () => ({
  default: {
    prompt: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    promptVersion: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    promptTag: {
      deleteMany: vi.fn(),
    },
    tag: {
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import prisma from '../config/database';

const mockedPrisma = prisma as unknown as {
  prompt: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  promptVersion: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  promptTag: { deleteMany: ReturnType<typeof vi.fn> };
  tag: { upsert: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

function baseSnapshot(overrides: Partial<VersionSnapshot> = {}): VersionSnapshot {
  return {
    title: 'My prompt',
    description: 'A description',
    content: 'Generate a cat',
    category: 'IMAGEN',
    subcategory: 'generacion',
    intent: 'GENERAR',
    targets: ['ROSTRO', 'PIEL'],
    inputMode: 'TEXTO_A_IMAGEN',
    preservation: 'IDENTIDAD',
    metadata: { model: 'flux', seed: 42 },
    tags: ['portrait', 'cat'],
    imageUrl: '/uploads/a.jpg',
    thumbnailUrl: '/uploads/a-thumb.jpg',
    analysisResult: { summary: 'ok' },
    ...overrides,
  };
}

describe('toComparable', () => {
  it('treats tag order as irrelevant (sorted case-insensitive)', () => {
    const a = baseSnapshot({ tags: ['Zebra', 'apple', 'Cat'] });
    const b = baseSnapshot({ tags: ['cat', 'APPLE', 'zebra'] });

    expect(toComparable(a)).toBe(toComparable(b));
  });

  it('treats metadata key order as irrelevant (deep-sorted keys)', () => {
    const a = baseSnapshot({
      metadata: { z: 1, a: { y: 2, b: 3 }, m: [1, 2] },
    });
    const b = baseSnapshot({
      metadata: { m: [1, 2], a: { b: 3, y: 2 }, z: 1 },
    });

    expect(toComparable(a)).toBe(toComparable(b));
  });

  it('unifies null and undefined for optional fields', () => {
    const withNull = baseSnapshot({
      title: null,
      description: null,
      category: null,
      subcategory: null,
      intent: null,
      inputMode: null,
      preservation: null,
      metadata: null,
      imageUrl: null,
      thumbnailUrl: null,
      analysisResult: null,
    });
    const withUndefined = baseSnapshot({
      title: undefined as unknown as null,
      description: undefined as unknown as null,
      category: undefined as unknown as null,
      subcategory: undefined as unknown as null,
      intent: undefined as unknown as null,
      inputMode: undefined as unknown as null,
      preservation: undefined as unknown as null,
      metadata: undefined as unknown as null,
      imageUrl: undefined as unknown as null,
      thumbnailUrl: undefined as unknown as null,
      analysisResult: undefined as unknown as null,
    });

    expect(toComparable(withNull)).toBe(toComparable(withUndefined));
  });

  it('treats target order as irrelevant', () => {
    const a = baseSnapshot({ targets: ['PIEL', 'ROSTRO', 'CUERPO'] });
    const b = baseSnapshot({ targets: ['CUERPO', 'ROSTRO', 'PIEL'] });

    expect(toComparable(a)).toBe(toComparable(b));
  });

  it('detects content differences', () => {
    const a = baseSnapshot({ content: 'A' });
    const b = baseSnapshot({ content: 'B' });

    expect(toComparable(a)).not.toBe(toComparable(b));
  });
});

describe('buildSnapshotFromPrompt', () => {
  it('maps live prompt fields and sorted unique tag names; omits favorite and status', () => {
    const prompt = {
      title: 'T',
      description: 'D',
      content: 'C',
      category: 'IMAGEN',
      subcategory: 's',
      intent: 'GENERAR',
      targets: ['PIEL', 'ROSTRO'],
      inputMode: 'TEXTO_A_IMAGEN',
      preservation: 'LIBRE',
      metadata: { a: 1 },
      imageUrl: '/img.jpg',
      thumbnailUrl: '/thumb.jpg',
      analysisResult: { x: true },
      isFavorite: true,
      analysisStatus: 'COMPLETED',
      tags: [
        { tag: { name: 'Beta' } },
        { tag: { name: 'alpha' } },
        { tag: { name: 'Beta' } },
      ],
    };

    const snapshot = buildSnapshotFromPrompt(prompt as never);

    expect(snapshot).toEqual({
      title: 'T',
      description: 'D',
      content: 'C',
      category: 'IMAGEN',
      subcategory: 's',
      intent: 'GENERAR',
      targets: ['PIEL', 'ROSTRO'],
      inputMode: 'TEXTO_A_IMAGEN',
      preservation: 'LIBRE',
      metadata: { a: 1 },
      tags: ['alpha', 'Beta'],
      imageUrl: '/img.jpg',
      thumbnailUrl: '/thumb.jpg',
      analysisResult: { x: true },
    });
    expect(snapshot).not.toHaveProperty('isFavorite');
    expect(snapshot).not.toHaveProperty('analysisStatus');
  });
});

describe('maybeCapture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const livePrompt = {
    id: 'p1',
    title: 'My prompt',
    description: 'A description',
    content: 'Generate a cat',
    category: 'IMAGEN',
    subcategory: 'generacion',
    intent: 'GENERAR',
    targets: ['ROSTRO', 'PIEL'],
    inputMode: 'TEXTO_A_IMAGEN',
    preservation: 'IDENTIDAD',
    metadata: { model: 'flux', seed: 42 },
    imageUrl: '/uploads/a.jpg',
    thumbnailUrl: '/uploads/a-thumb.jpg',
    analysisResult: { summary: 'ok' },
    isFavorite: false,
    analysisStatus: 'PENDING',
    tags: [{ tag: { name: 'portrait' } }, { tag: { name: 'cat' } }],
  };

  it('inserts version 1 when no versions exist', async () => {
    const created = { id: 'v1', promptId: 'p1', version: 1, changeReason: 'CREATE' };

    mockedPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        prompt: {
          findUnique: vi.fn().mockResolvedValue(livePrompt),
        },
        promptVersion: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue(created),
        },
      };
      return fn(tx);
    });

    const result = await maybeCapture('p1', 'CREATE');

    expect(result).toEqual(created);
    expect(mockedPrisma.$transaction).toHaveBeenCalled();
  });

  it('skips insert when live snapshot equals latest version', async () => {
    const latestVersion = {
      id: 'v1',
      promptId: 'p1',
      version: 1,
      changeReason: 'CREATE',
      ...baseSnapshot({ tags: ['cat', 'portrait'] }),
    };

    mockedPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        prompt: {
          findUnique: vi.fn().mockResolvedValue(livePrompt),
        },
        promptVersion: {
          findFirst: vi.fn().mockResolvedValue(latestVersion),
          create: vi.fn(),
        },
      };
      return fn(tx);
    });

    const result = await maybeCapture('p1', 'UPDATE');

    expect(result).toBeNull();
  });

  it('appends monotonic next version when content differs', async () => {
    const latestVersion = {
      id: 'v1',
      promptId: 'p1',
      version: 2,
      changeReason: 'CREATE',
      ...baseSnapshot({ content: 'Old content', tags: ['cat', 'portrait'] }),
    };
    const created = { id: 'v3', promptId: 'p1', version: 3, changeReason: 'UPDATE' };

    let createArgs: unknown;
    mockedPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        prompt: {
          findUnique: vi.fn().mockResolvedValue(livePrompt),
        },
        promptVersion: {
          findFirst: vi.fn().mockResolvedValue(latestVersion),
          create: vi.fn().mockImplementation((args: unknown) => {
            createArgs = args;
            return Promise.resolve(created);
          }),
        },
      };
      return fn(tx);
    });

    const result = await maybeCapture('p1', 'UPDATE');

    expect(result).toEqual(created);
    expect(createArgs).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          promptId: 'p1',
          version: 3,
          changeReason: 'UPDATE',
          content: 'Generate a cat',
        }),
      })
    );
  });

  it('does not store isFavorite or analysisStatus on capture', async () => {
    let createArgs: { data: Record<string, unknown> } | undefined;

    mockedPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        prompt: {
          findUnique: vi.fn().mockResolvedValue({ ...livePrompt, isFavorite: true, analysisStatus: 'COMPLETED' }),
        },
        promptVersion: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) => {
            createArgs = args;
            return Promise.resolve({ id: 'v1', ...args.data });
          }),
        },
      };
      return fn(tx);
    });

    await maybeCapture('p1', 'CREATE');

    expect(createArgs?.data).toBeDefined();
    expect(createArgs?.data).not.toHaveProperty('isFavorite');
    expect(createArgs?.data).not.toHaveProperty('analysisStatus');
    expect(createArgs?.data).toMatchObject({
      title: 'My prompt',
      content: 'Generate a cat',
      tags: expect.any(Array),
    });
  });

  it('throws when prompt does not exist', async () => {
    mockedPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        prompt: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
        promptVersion: {
          findFirst: vi.fn(),
          create: vi.fn(),
        },
      };
      return fn(tx);
    });

    await expect(maybeCapture('missing', 'CREATE')).rejects.toThrow(/not found|no encontrado/i);
  });
});

describe('listVersions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns newest-first summaries when prompt exists', async () => {
    mockedPrisma.prompt.findUnique.mockResolvedValue({ id: 'p1' });
    mockedPrisma.promptVersion.findMany.mockResolvedValue([
      { version: 3, createdAt: new Date('2026-01-03'), changeReason: 'UPDATE', title: 'v3' },
      { version: 2, createdAt: new Date('2026-01-02'), changeReason: 'IMAGE', title: 'v2' },
      { version: 1, createdAt: new Date('2026-01-01'), changeReason: 'CREATE', title: 'v1' },
    ]);

    const result = await listVersions('p1');

    expect(result).not.toBeNull();
    expect(result!).toHaveLength(3);
    expect(result!.map((v) => v.version)).toEqual([3, 2, 1]);
    expect(mockedPrisma.promptVersion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { promptId: 'p1' },
        orderBy: { version: 'desc' },
      })
    );
  });

  it('returns null when prompt does not exist', async () => {
    mockedPrisma.prompt.findUnique.mockResolvedValue(null);

    const result = await listVersions('missing');

    expect(result).toBeNull();
    expect(mockedPrisma.promptVersion.findMany).not.toHaveBeenCalled();
  });

  it('returns empty array when prompt has no versions', async () => {
    mockedPrisma.prompt.findUnique.mockResolvedValue({ id: 'p1' });
    mockedPrisma.promptVersion.findMany.mockResolvedValue([]);

    const result = await listVersions('p1');

    expect(result).toEqual([]);
  });
});

describe('getVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns full snapshot when version exists', async () => {
    const row = {
      version: 2,
      createdAt: new Date('2026-01-02'),
      changeReason: 'UPDATE',
      ...baseSnapshot({ title: 'v2 title' }),
    };
    mockedPrisma.promptVersion.findUnique.mockResolvedValue(row);

    const result = await getVersion('p1', 2);

    expect(result).toEqual(row);
    expect(mockedPrisma.promptVersion.findUnique).toHaveBeenCalledWith({
      where: { promptId_version: { promptId: 'p1', version: 2 } },
    });
  });

  it('returns null when version is missing', async () => {
    mockedPrisma.promptVersion.findUnique.mockResolvedValue(null);

    const result = await getVersion('p1', 99);

    expect(result).toBeNull();
  });
});

describe('restoreVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const version2Snapshot = {
    id: 'ver-2',
    promptId: 'p1',
    version: 2,
    changeReason: 'UPDATE',
    title: 'Restored title',
    description: 'Restored desc',
    content: 'Restored content',
    category: 'IMAGEN',
    subcategory: 'old-sub',
    intent: 'GENERAR',
    targets: ['ROSTRO'],
    inputMode: 'TEXTO_A_IMAGEN',
    preservation: 'IDENTIDAD',
    metadata: { model: 'old' },
    tags: ['alpha', 'beta'],
    imageUrl: '/uploads/v2.webp',
    thumbnailUrl: '/uploads/v2-thumb.webp',
    analysisResult: { summary: 'from v2' },
    createdAt: new Date('2026-01-02'),
  };

  const liveAfterRestore = {
    id: 'p1',
    title: 'Restored title',
    description: 'Restored desc',
    content: 'Restored content',
    category: 'IMAGEN',
    subcategory: 'old-sub',
    intent: 'GENERAR',
    targets: ['ROSTRO'],
    inputMode: 'TEXTO_A_IMAGEN',
    preservation: 'IDENTIDAD',
    metadata: { model: 'old' },
    imageUrl: '/uploads/v2.webp',
    thumbnailUrl: '/uploads/v2-thumb.webp',
    analysisResult: { summary: 'from v2' },
    isFavorite: true,
    analysisStatus: 'PROCESSING',
    tags: [
      { tag: { id: 't1', name: 'alpha' } },
      { tag: { id: 't2', name: 'beta' } },
    ],
  };

  it('applies snapshot fields+tags+images, preserves favorite/status, appends RESTORE', async () => {
    mockedPrisma.promptVersion.findUnique.mockResolvedValue(version2Snapshot);
    mockedPrisma.prompt.findUnique.mockResolvedValue({
      id: 'p1',
      isFavorite: true,
      analysisStatus: 'PROCESSING',
    });

    let updateData: Record<string, unknown> | undefined;
    let restoreCreateData: Record<string, unknown> | undefined;
    let deletedTags = false;
    const upsertedTags: string[] = [];

    mockedPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        promptTag: {
          deleteMany: vi.fn().mockImplementation(() => {
            deletedTags = true;
            return Promise.resolve({ count: 1 });
          }),
        },
        tag: {
          upsert: vi.fn().mockImplementation((args: { create: { name: string }; where: { normalizedName: string } }) => {
            upsertedTags.push(args.create.name);
            return Promise.resolve({ id: `tag-${args.create.name}`, name: args.create.name });
          }),
        },
        prompt: {
          update: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) => {
            updateData = args.data;
            return Promise.resolve(liveAfterRestore);
          }),
          findUnique: vi.fn().mockResolvedValue(liveAfterRestore),
        },
        promptVersion: {
          findFirst: vi.fn().mockResolvedValue({
            ...version2Snapshot,
            version: 5,
            content: 'Current head content',
            tags: ['current'],
          }),
          create: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) => {
            restoreCreateData = args.data;
            return Promise.resolve({ id: 'v6', ...args.data });
          }),
        },
      };
      return fn(tx);
    });

    const result = await restoreVersion('p1', 2);

    expect(deletedTags).toBe(true);
    expect(upsertedTags.sort()).toEqual(['alpha', 'beta']);
    expect(updateData).toMatchObject({
      title: 'Restored title',
      description: 'Restored desc',
      content: 'Restored content',
      category: 'IMAGEN',
      subcategory: 'old-sub',
      intent: 'GENERAR',
      targets: ['ROSTRO'],
      inputMode: 'TEXTO_A_IMAGEN',
      preservation: 'IDENTIDAD',
      imageUrl: '/uploads/v2.webp',
      thumbnailUrl: '/uploads/v2-thumb.webp',
    });
    // Must NOT touch favorite or analysis status
    expect(updateData).not.toHaveProperty('isFavorite');
    expect(updateData).not.toHaveProperty('analysisStatus');

    expect(restoreCreateData).toMatchObject({
      promptId: 'p1',
      version: 6,
      changeReason: 'RESTORE',
      content: 'Restored content',
      title: 'Restored title',
    });
    expect(result).toMatchObject({
      id: 'p1',
      content: 'Restored content',
      isFavorite: true,
      analysisStatus: 'PROCESSING',
    });
  });

  it('force-appends RESTORE even when restored snapshot equals latest version', async () => {
    // Restoring latest version: after apply, live equals latest — must still insert RESTORE
    mockedPrisma.promptVersion.findUnique.mockResolvedValue(version2Snapshot);
    mockedPrisma.prompt.findUnique.mockResolvedValue({ id: 'p1' });

    let createCalled = false;
    mockedPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        promptTag: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
        tag: {
          upsert: vi.fn().mockImplementation((args: { create: { name: string } }) =>
            Promise.resolve({ id: args.create.name, name: args.create.name })
          ),
        },
        prompt: {
          update: vi.fn().mockResolvedValue(liveAfterRestore),
          findUnique: vi.fn().mockResolvedValue(liveAfterRestore),
        },
        promptVersion: {
          findFirst: vi.fn().mockResolvedValue({
            ...version2Snapshot,
            version: 2,
            // equal to restored live snapshot
            tags: ['alpha', 'beta'],
          }),
          create: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) => {
            createCalled = true;
            expect(args.data.changeReason).toBe('RESTORE');
            expect(args.data.version).toBe(3);
            return Promise.resolve({ id: 'v3', ...args.data });
          }),
        },
      };
      return fn(tx);
    });

    await restoreVersion('p1', 2);

    expect(createCalled).toBe(true);
  });

  it('throws not-found when version is missing', async () => {
    mockedPrisma.promptVersion.findUnique.mockResolvedValue(null);
    mockedPrisma.prompt.findUnique.mockResolvedValue({ id: 'p1' });

    await expect(restoreVersion('p1', 99)).rejects.toThrow(/versión|version/i);
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('throws not-found when prompt is missing', async () => {
    mockedPrisma.promptVersion.findUnique.mockResolvedValue(null);
    mockedPrisma.prompt.findUnique.mockResolvedValue(null);

    await expect(restoreVersion('missing', 1)).rejects.toThrow(/prompt|no encontrado/i);
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });
});
