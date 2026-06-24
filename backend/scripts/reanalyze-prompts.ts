/**
 * Batch re-analysis for prompts missing intent categorization fields.
 *
 * Selects prompts where:
 *   - category is IMAGEN or null
 *   - AND (intent is null OR updatedAt is before the intent migration)
 *
 * Runs DeepSeek analysis directly (not via BullMQ) with a 2s delay between
 * API calls to respect rate limits.
 *
 * Prerequisites:
 *   - DATABASE_URL set
 *   - DEEPSEEK_API_KEY set (for live runs)
 *   - Intent migration applied (`apply-intent-migration.ts` or `prisma migrate deploy`)
 *
 * Usage:
 *   cd backend
 *   npx tsx scripts/reanalyze-prompts.ts --dry-run
 *   npx tsx scripts/reanalyze-prompts.ts --dry-run --limit 10
 *   npx tsx scripts/reanalyze-prompts.ts --limit 50
 *   npm run reanalyze -- --dry-run
 */

import { AnalysisStatus, Prisma } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import prisma from '../src/config/database';
import { analyzePromptWithRetry } from '../src/services/deepseek.service';
import { markAnalysisFailed, updatePromptAnalysis } from '../src/services/prompt.service';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

/** Matches migration folder 20260624120000_intent_categorization */
const MIGRATION_CUTOFF = new Date('2026-06-24T12:00:00.000Z');
const API_DELAY_MS = 2000;

interface ScriptOptions {
  dryRun: boolean;
  limit?: number;
}

function parseArgs(argv: string[]): ScriptOptions {
  const options: ScriptOptions = { dryRun: false };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--limit') {
      const value = argv[i + 1];
      if (!value || Number.isNaN(Number.parseInt(value, 10))) {
        console.error('ERROR: --limit requires a positive integer.');
        process.exit(1);
      }
      options.limit = Number.parseInt(value, 10);
      i++;
      continue;
    }

    if (arg.startsWith('--')) {
      console.error(`ERROR: Unknown flag: ${arg}`);
      process.exit(1);
    }
  }

  return options;
}

function buildWhereClause(): Prisma.PromptWhereInput {
  return {
    OR: [{ category: 'IMAGEN' }, { category: null }],
    AND: {
      OR: [{ intent: null }, { updatedAt: { lt: MIGRATION_CUTOFF } }],
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is not set.');
    process.exit(1);
  }

  if (!options.dryRun && !process.env.DEEPSEEK_API_KEY) {
    console.error('ERROR: DEEPSEEK_API_KEY is required for live re-analysis.');
    console.error('Use --dry-run to preview candidates without calling the API.');
    process.exit(1);
  }

  console.log('[reanalyze] Intent categorization batch re-analysis');
  console.log(`[reanalyze] Migration cutoff: ${MIGRATION_CUTOFF.toISOString()}`);
  console.log(`[reanalyze] Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE'}`);
  if (options.limit !== undefined) {
    console.log(`[reanalyze] Limit: ${options.limit}`);
  }

  const where = buildWhereClause();

  const totalMatching = await prisma.prompt.count({ where });
  console.log(`[reanalyze] Matching prompts: ${totalMatching}`);

  const prompts = await prisma.prompt.findMany({
    where,
    select: {
      id: true,
      content: true,
      title: true,
      category: true,
      intent: true,
      updatedAt: true,
      analysisStatus: true,
    },
    orderBy: { createdAt: 'asc' },
    ...(options.limit !== undefined ? { take: options.limit } : {}),
  });

  const batchSize = prompts.length;
  console.log(`[reanalyze] Processing batch: ${batchSize} prompt(s)`);

  if (batchSize === 0) {
    console.log('[reanalyze] Nothing to do.');
    return;
  }

  let succeeded = 0;
  let failed = 0;

  for (let index = 0; index < prompts.length; index++) {
    const prompt = prompts[index];
    const position = index + 1;
    const label = prompt.title?.trim() || prompt.id.slice(0, 8);

    console.log(
      `[reanalyze] [${position}/${batchSize}] ${prompt.id} | category=${prompt.category ?? 'null'} | intent=${prompt.intent ?? 'null'} | updatedAt=${prompt.updatedAt.toISOString()} | "${label}"`
    );

    if (options.dryRun) {
      console.log(`[reanalyze] [${position}/${batchSize}] DRY RUN — would re-analyze`);
      continue;
    }

    try {
      await prisma.prompt.update({
        where: { id: prompt.id },
        data: { analysisStatus: AnalysisStatus.PROCESSING },
      });

      const analysisResult = await analyzePromptWithRetry(prompt.content);

      await updatePromptAnalysis(prompt.id, {
        title: analysisResult.title,
        description: analysisResult.description,
        category: analysisResult.category,
        subcategory: analysisResult.subcategory,
        intent: analysisResult.intent ?? null,
        targets: analysisResult.targets ?? [],
        inputMode: analysisResult.inputMode ?? null,
        preservation: analysisResult.preservation ?? null,
        tags: analysisResult.tags,
        metadata: analysisResult.metadata,
        analysisResult: {
          ...analysisResult,
          processedAt: new Date().toISOString(),
          reanalyzedBy: 'scripts/reanalyze-prompts.ts',
        },
      });

      succeeded++;
      console.log(
        `[reanalyze] [${position}/${batchSize}] OK — intent=${analysisResult.intent ?? 'null'} category=${analysisResult.category}`
      );
    } catch (error) {
      failed++;
      const message = error instanceof Error ? error.message : 'Error desconocido';
      console.error(`[reanalyze] [${position}/${batchSize}] FAILED — ${message}`);
      await markAnalysisFailed(prompt.id, message);
    }

    if (index < prompts.length - 1) {
      console.log(`[reanalyze] Waiting ${API_DELAY_MS}ms before next API call...`);
      await sleep(API_DELAY_MS);
    }
  }

  console.log('[reanalyze] Summary:');
  console.log(`  Total matching (DB): ${totalMatching}`);
  console.log(`  Batch size:          ${batchSize}`);
  if (!options.dryRun) {
    console.log(`  Succeeded:           ${succeeded}`);
    console.log(`  Failed:              ${failed}`);
  } else {
    console.log(`  Would process:       ${batchSize}`);
  }
}

main()
  .catch((error) => {
    console.error('[reanalyze] Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });