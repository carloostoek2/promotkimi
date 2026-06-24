import { Prisma } from '@prisma/client';
import { PromptFilters } from '../types';

export function buildPromptWhereClause(filters: PromptFilters): Prisma.PromptWhereInput {
  const { search, category, tags, isFavorite, intent, target, inputMode, preservation } = filters;

  const where: Prisma.PromptWhereInput = {};

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (category) {
    where.category = category;
  }

  if (isFavorite !== undefined) {
    where.isFavorite = isFavorite;
  }

  if (tags && tags.length > 0) {
    const normalizedTags = tags.map((tag) =>
      tag
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
    );
    where.tags = {
      some: {
        tag: {
          normalizedName: {
            in: normalizedTags,
          },
        },
      },
    };
  }

  if (intent) {
    where.intent = intent;
  }

  if (inputMode) {
    where.inputMode = inputMode;
  }

  if (preservation) {
    where.preservation = preservation;
  }

  if (target) {
    where.targets = { has: target };
  }

  return where;
}