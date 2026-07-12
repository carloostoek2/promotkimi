import {
  Category,
  ImageIntent,
  ImageTarget,
  InputMode,
  Preservation,
  Prisma,
  VersionChangeReason,
} from '@prisma/client';
import prisma from '../config/database';

// ==================== TYPES ====================

export type VersionSnapshot = {
  title: string | null;
  description: string | null;
  content: string;
  category: Category | string | null;
  subcategory: string | null;
  intent: ImageIntent | string | null;
  targets: Array<ImageTarget | string>;
  inputMode: InputMode | string | null;
  preservation: Preservation | string | null;
  metadata: Record<string, unknown> | null;
  tags: string[];
  imageUrl: string | null;
  thumbnailUrl: string | null;
  analysisResult: Record<string, unknown> | null;
};

type PromptWithTags = {
  title: string | null;
  description: string | null;
  content: string;
  category: Category | string | null;
  subcategory: string | null;
  intent: ImageIntent | string | null;
  targets: Array<ImageTarget | string>;
  inputMode: InputMode | string | null;
  preservation: Preservation | string | null;
  metadata: unknown;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  analysisResult: unknown;
  tags?: Array<{ tag: { name: string } }>;
};

export type VersionSummary = {
  version: number;
  createdAt: Date;
  changeReason: VersionChangeReason;
  title: string | null;
};

// ==================== PURE HELPERS ====================

function nullishToNull<T>(value: T | null | undefined): T | null {
  return value === undefined || value === null ? null : value;
}

function sortTags(tags: string[]): string[] {
  const unique = Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean)));
  return unique.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

function sortTargets(targets: Array<ImageTarget | string>): string[] {
  return [...targets].map(String).sort((a, b) => a.localeCompare(b));
}

/** Deep-sort object keys for stable JSON comparison. */
function stableValue(value: unknown): unknown {
  if (value === undefined || value === null) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  if (typeof value === 'object' && value.constructor === Object) {
    const obj = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = stableValue(obj[key]);
    }
    return sorted;
  }
  return value;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function buildSnapshotFromPrompt(prompt: PromptWithTags): VersionSnapshot {
  const tagNames = (prompt.tags ?? []).map((pt) => pt.tag.name);
  return {
    title: nullishToNull(prompt.title),
    description: nullishToNull(prompt.description),
    content: prompt.content,
    category: nullishToNull(prompt.category),
    subcategory: nullishToNull(prompt.subcategory),
    intent: nullishToNull(prompt.intent),
    targets: [...(prompt.targets ?? [])],
    inputMode: nullishToNull(prompt.inputMode),
    preservation: nullishToNull(prompt.preservation),
    metadata: asRecord(prompt.metadata),
    tags: sortTags(tagNames),
    imageUrl: nullishToNull(prompt.imageUrl),
    thumbnailUrl: nullishToNull(prompt.thumbnailUrl),
    analysisResult: asRecord(prompt.analysisResult),
  };
}

export function toComparable(snapshot: VersionSnapshot): string {
  const normalized = {
    title: nullishToNull(snapshot.title),
    description: nullishToNull(snapshot.description),
    content: snapshot.content ?? '',
    category: nullishToNull(snapshot.category),
    subcategory: nullishToNull(snapshot.subcategory),
    intent: nullishToNull(snapshot.intent),
    targets: sortTargets(snapshot.targets ?? []),
    inputMode: nullishToNull(snapshot.inputMode),
    preservation: nullishToNull(snapshot.preservation),
    metadata: stableValue(nullishToNull(snapshot.metadata)),
    tags: sortTags(snapshot.tags ?? []).map((t) => t.toLowerCase()),
    imageUrl: nullishToNull(snapshot.imageUrl),
    thumbnailUrl: nullishToNull(snapshot.thumbnailUrl),
    analysisResult: stableValue(nullishToNull(snapshot.analysisResult)),
  };

  return JSON.stringify(normalized);
}

function versionRowToSnapshot(row: {
  title: string | null;
  description: string | null;
  content: string;
  category: Category | string | null;
  subcategory: string | null;
  intent: ImageIntent | string | null;
  targets: Array<ImageTarget | string>;
  inputMode: InputMode | string | null;
  preservation: Preservation | string | null;
  metadata: unknown;
  tags: unknown;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  analysisResult: unknown;
}): VersionSnapshot {
  const tags = Array.isArray(row.tags)
    ? (row.tags as string[])
    : typeof row.tags === 'string'
      ? (JSON.parse(row.tags) as string[])
      : [];

  return {
    title: nullishToNull(row.title),
    description: nullishToNull(row.description),
    content: row.content,
    category: nullishToNull(row.category),
    subcategory: nullishToNull(row.subcategory),
    intent: nullishToNull(row.intent),
    targets: [...(row.targets ?? [])],
    inputMode: nullishToNull(row.inputMode),
    preservation: nullishToNull(row.preservation),
    metadata: asRecord(row.metadata),
    tags,
    imageUrl: nullishToNull(row.imageUrl),
    thumbnailUrl: nullishToNull(row.thumbnailUrl),
    analysisResult: asRecord(row.analysisResult),
  };
}

function snapshotToCreateData(
  promptId: string,
  version: number,
  reason: VersionChangeReason,
  snapshot: VersionSnapshot
) {
  return {
    promptId,
    version,
    changeReason: reason,
    title: snapshot.title,
    description: snapshot.description,
    content: snapshot.content,
    category: snapshot.category as Category | null,
    subcategory: snapshot.subcategory,
    intent: snapshot.intent as ImageIntent | null,
    targets: snapshot.targets as ImageTarget[],
    inputMode: snapshot.inputMode as InputMode | null,
    preservation: snapshot.preservation as Preservation | null,
    metadata: snapshot.metadata === null ? Prisma.JsonNull : (snapshot.metadata as Prisma.InputJsonValue),
    tags: snapshot.tags as Prisma.InputJsonValue,
    imageUrl: snapshot.imageUrl,
    thumbnailUrl: snapshot.thumbnailUrl,
    analysisResult:
      snapshot.analysisResult === null
        ? Prisma.JsonNull
        : (snapshot.analysisResult as Prisma.InputJsonValue),
  };
}

// ==================== CAPTURE ====================

const MAX_CAPTURE_RETRIES = 3;

type TxClient = {
  prompt: {
    findUnique: typeof prisma.prompt.findUnique;
  };
  promptVersion: {
    findFirst: typeof prisma.promptVersion.findFirst;
    create: typeof prisma.promptVersion.create;
  };
};

async function captureOnce(
  tx: TxClient,
  promptId: string,
  reason: VersionChangeReason
) {
  const prompt = await tx.prompt.findUnique({
    where: { id: promptId },
    include: {
      tags: {
        include: { tag: true },
      },
    },
  });

  if (!prompt) {
    throw new Error('Prompt not found');
  }

  const liveSnapshot = buildSnapshotFromPrompt(prompt);

  const latest = await tx.promptVersion.findFirst({
    where: { promptId },
    orderBy: { version: 'desc' },
  });

  if (latest) {
    const latestSnapshot = versionRowToSnapshot(latest);
    if (toComparable(liveSnapshot) === toComparable(latestSnapshot)) {
      return null;
    }
  }

  const nextVersion = latest ? latest.version + 1 : 1;

  return tx.promptVersion.create({
    data: snapshotToCreateData(promptId, nextVersion, reason, liveSnapshot),
  });
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === 'P2002'
  );
}

export async function maybeCapture(promptId: string, reason: VersionChangeReason) {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_CAPTURE_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        return captureOnce(tx as unknown as TxClient, promptId, reason);
      });
    } catch (error) {
      if (isUniqueViolation(error) && attempt < MAX_CAPTURE_RETRIES - 1) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

// ==================== READ APIs ====================

export async function listVersions(promptId: string): Promise<VersionSummary[] | null> {
  const prompt = await prisma.prompt.findUnique({
    where: { id: promptId },
    select: { id: true },
  });

  if (!prompt) {
    return null;
  }

  return prisma.promptVersion.findMany({
    where: { promptId },
    orderBy: { version: 'desc' },
    select: {
      version: true,
      createdAt: true,
      changeReason: true,
      title: true,
    },
  });
}

export async function getVersion(promptId: string, version: number) {
  return prisma.promptVersion.findUnique({
    where: {
      promptId_version: { promptId, version },
    },
  });
}
