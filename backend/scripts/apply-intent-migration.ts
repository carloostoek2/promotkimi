/**
 * Apply the intent categorization migration to production.
 *
 * Runs `prisma migrate deploy`, which applies all pending migrations including
 * `20260624120000_intent_categorization` (ImageIntent, ImageTarget, InputMode,
 * Preservation columns on prompts).
 *
 * Prerequisites:
 *   - DATABASE_URL set to the target database (e.g. production)
 *   - Network access to that database
 *   - `npm install` completed in backend/
 *
 * Usage:
 *   cd backend
 *   DATABASE_URL="postgresql://user:pass@host:5432/dbname" npx tsx scripts/apply-intent-migration.ts
 *
 * Alternative (equivalent, no wrapper):
 *   cd backend
 *   DATABASE_URL="postgresql://user:pass@host:5432/dbname" npx prisma migrate deploy
 *
 * Verify after apply:
 *   DATABASE_URL="..." npx prisma migrate status
 *
 * Expected migration output should list:
 *   20260624120000_intent_categorization
 */

import { execSync } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MIGRATION_NAME = '20260624120000_intent_categorization';

function main(): void {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL is not set.');
    console.error('Set it inline or in backend/.env before running this script.');
    process.exit(1);
  }

  const maskedUrl = databaseUrl.replace(/:([^:@/]+)@/, ':****@');
  console.log(`[apply-intent-migration] Target database: ${maskedUrl}`);
  console.log(`[apply-intent-migration] Applying pending migrations (including ${MIGRATION_NAME})...`);

  const backendRoot = path.resolve(__dirname, '..');

  try {
    execSync('npx prisma migrate deploy', {
      cwd: backendRoot,
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });

    console.log('[apply-intent-migration] Done. Run `npx prisma migrate status` to confirm.');
  } catch (error) {
    console.error('[apply-intent-migration] Migration failed.');
    process.exit(1);
  }
}

main();