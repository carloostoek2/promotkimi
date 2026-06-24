# PLAN: Item 1 — Intent-Based Categorization (Schema + Backend)

**Project:** PromptVault (`/home/ubuntu/repos/promotkimi`)  
**Pool:** intent-categorization  
**Item:** 1 — Schema + Backend  
**Planner:** gsd-planner  
**Date:** 2026-06-24  
**Impact report:** `.grok/agent-memory/impact-analyzer/intent-categorization-backend.md`

---

## Objective

Add intent-based categorization for IMAGEN prompts: four Prisma enums, four nullable `Prompt` columns, controlled subcategory vocabulary, AI extraction via OpenRouter, API list/update filters, and Vitest coverage for filter + validation logic. Frontend is **out of scope** for this item.

---

## Context

### Current state

| Layer | File | Today |
|-------|------|-------|
| Schema | `backend/prisma/schema.prisma` | `category`, free-form `subcategory`, `metadata`, `analysisResult` — no intent enums |
| AI | `backend/src/services/openRouter.service.ts` | `SYSTEM_PROMPT` returns `category`, `subcategory`, `tags`, `metadata`, `confidence` |
| Worker | `backend/src/workers/analysis.worker.ts` | Maps `AnalysisResult` → `updatePromptAnalysis()` |
| Service | `backend/src/services/prompt.service.ts` | `getPrompts()` filters: `search`, `category`, `tags`, `isFavorite`, sort |
| Controller | `backend/src/controllers/prompt.controller.ts` | Zod on PUT; query params parsed without enum validation |
| Types | `backend/src/types/index.ts` | `AnalysisResult`, `PromptFilters`, `UpdatePromptInput` lack intent fields |
| Tests | — | **None** in repo |

### Pipeline (unchanged shape)

```
POST /api/prompts → queueAnalysis() → BullMQ worker
  → openRouter.service.analyzePromptWithRetry()
  → sanitizeAnalysisResult()   ← NEW
  → updatePromptAnalysis() → PostgreSQL
```

### Confirmed enum values (use exactly — NOT impact-report placeholders)

```prisma
enum ImageIntent {
  GENERAR
  MEJORAR_REALISMO
  TRANSFORMAR
  RETOQUE
  COMPONER
  DEFINIR_IDENTIDAD
  MODIFICAR_POSE
}

enum ImageTarget {
  ROSTRO
  PIEL
  CUERPO
  ILUMINACION
  ESCENA_COMPLETA
  ROPA_TEXTURA
}

enum InputMode {
  TEXTO_A_IMAGEN
  IMAGEN_A_IMAGEN
  MULTI_IMAGEN
}

enum Preservation {
  IDENTIDAD
  COMPOSICION
  LIBRE
}
```

### Controlled subcategories per intent

| Intent | Allowed `subcategory` values |
|--------|------------------------------|
| `GENERAR` | `generacion-retrato`, `generacion-escena`, `generacion-personaje` |
| `MEJORAR_REALISMO` | `mejora-dslr`, `mejora-candid`, `mejora-cinematico` |
| `TRANSFORMAR` | `transformacion-selfie`, `transformacion-espejo`, `transformacion-pov` |
| `RETOQUE` | `retoque-facial`, `retoque-piel`, `retoque-iluminacion`, `retoque-sombras` |
| `COMPONER` | `composicion-face-swap`, `composicion-integracion`, `composicion-cuerpo-cara` |
| `DEFINIR_IDENTIDAD` | `definicion-identidad`, `definicion-morfologia` |
| `MODIFICAR_POSE` | `modificacion-pose`, `modificacion-expresion` |

Centralize in `backend/src/constants/intentVocabulary.ts`.

### Resolved decisions (no further user input needed)

| Question | Decision |
|----------|----------|
| Non-IMAGEN behavior | `intent`, `targets`, `inputMode`, `preservation` = `null` (AI must not set them) |
| Existing subcategories | **Grandfathered** — do not wipe or migrate; only validate new AI output against vocabulary |
| Target filter param | `target` (singular); `?target=ROSTRO` means `targets` array **has** that value |
| Invalid query enum | **400** with clear error message |
| AI invalid enum | Sanitize to `null` (or `[]` for targets); still mark `analysisStatus` **COMPLETED** |
| AI invalid subcategory | `null` if not in vocabulary for resolved intent; log warning |
| Re-analysis endpoint | **Not in scope** |
| Tests | Add **Vitest** in backend; filter + validation unit tests required in this item |

---

## Constraints

1. **Scope:** Backend + Prisma only. Do not modify `src/` (frontend).
2. **Additive schema:** All new columns nullable; no backfill required.
3. **Enum names:** Use confirmed Spanish taxonomy exactly — PostgreSQL enum renames are costly.
4. **Deploy order:** `prisma migrate` → `prisma generate` → `npm run build` (backend).
5. **Patterns:** Follow existing Express + Zod + Prisma service layering; keep `ApiResponse<T>` shape.
6. **No breaking API changes:** New fields appear on prompt objects; existing clients ignore them.
7. **Grandfathered subcategories:** PUT may accept any string ≤50 chars (existing behavior); AI path enforces vocabulary for IMAGEN only.

---

## Tasks

Execute in order. Each task lists **Files**, **Steps**, and **Verification**.

---

### Task 1 — Prisma schema + migration

**Files:**
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/<timestamp>_intent_categorization/migration.sql` (generated)

**Steps:**

1. Add four enums (`ImageIntent`, `ImageTarget`, `InputMode`, `Preservation`) with values above.
2. Add to `Prompt` model:
   ```prisma
   intent        ImageIntent?
   targets       ImageTarget[]
   inputMode     InputMode?     @map("input_mode")
   preservation  Preservation?
   ```
3. Add indexes:
   ```prisma
   @@index([intent])
   @@index([inputMode])
   @@index([preservation])
   ```
   Optional: GIN on `targets` only if migration tooling supports it cleanly; not required for MVP.
4. Run migration:
   ```bash
   cd backend && npx prisma migrate dev --name intent_categorization
   cd backend && npx prisma generate
   ```

**Verification:**
- [ ] `\d prompts` (or Prisma Studio) shows new columns; existing rows have `null` / `{}` defaults
- [ ] `npx prisma generate` succeeds
- [ ] No TypeScript errors from generated client imports

---

### Task 2 — Intent vocabulary constants

**Files:**
- `backend/src/constants/intentVocabulary.ts` (**NEW**)

**Steps:**

1. Export:
   - `INTENT_SUBCATEGORIES: Record<ImageIntent, readonly string[]>`
   - `ALL_INTENTS`, `ALL_TARGETS`, `ALL_INPUT_MODES`, `ALL_PRESERVATIONS` (string arrays from Prisma enums)
   - `isValidSubcategory(intent: ImageIntent | null | undefined, subcategory: string | null | undefined): boolean`
   - `getSubcategoriesForIntent(intent: ImageIntent): readonly string[]`
2. Map every intent → its three (or two) controlled subcategory slugs from table above.

**Verification:**
- [ ] Every `ImageIntent` enum member has an entry in `INTENT_SUBCATEGORIES`
- [ ] `isValidSubcategory('GENERAR', 'generacion-retrato')` → `true`
- [ ] `isValidSubcategory('GENERAR', 'old-freeform-value')` → `false`

---

### Task 3 — Analysis sanitization utility

**Files:**
- `backend/src/utils/intentValidation.ts` (**NEW**)

**Steps:**

1. Implement `sanitizeAnalysisResult(raw: AnalysisResult): SanitizedAnalysisResult` that:
   - If `category !== 'IMAGEN'`: force `intent`, `targets`, `inputMode`, `preservation` to `null` / `[]`; leave `subcategory` as returned (grandfathering path for non-IMAGEN unchanged).
   - If `category === 'IMAGEN'`:
     - Validate `intent` against `ImageIntent`; invalid → `null` + `console.warn`
     - Validate each `targets` entry against `ImageTarget`; drop invalid entries + warn
     - Validate `inputMode`, `preservation`; invalid → `null` + warn
     - If `intent` valid: validate `subcategory` via `isValidSubcategory`; invalid → `null` + warn
     - If `intent` null: allow AI `subcategory` through as-is (grandfather) OR set null — prefer **null** for new analyses without valid intent
2. Export types `SanitizedAnalysisResult` extending `AnalysisResult` with optional intent fields.
3. Never throw on invalid AI enums — sanitization must be non-fatal.

**Verification:**
- [ ] Invalid AI enum → `null`, no exception
- [ ] `category: TEXTO` → all intent fields nulled regardless of AI output
- [ ] Valid IMAGEN payload passes through unchanged

---

### Task 4 — Extend backend types

**Files:**
- `backend/src/types/index.ts`

**Steps:**

1. Import `ImageIntent`, `ImageTarget`, `InputMode`, `Preservation` from `@prisma/client`.
2. Extend `AnalysisResult`:
   ```typescript
   intent?: ImageIntent | null;
   targets?: ImageTarget[];
   inputMode?: InputMode | null;
   preservation?: Preservation | null;
   subcategory: string | null;  // was required string — align with nullable DB
   ```
3. Extend `PromptFilters`:
   ```typescript
   intent?: ImageIntent;
   target?: ImageTarget;      // singular — maps to Prisma has:
   inputMode?: InputMode;
   preservation?: Preservation;
   ```
4. Extend `UpdatePromptInput`:
   ```typescript
   intent?: ImageIntent | null;
   targets?: ImageTarget[];
   inputMode?: InputMode | null;
   preservation?: Preservation | null;
   ```
5. Extend `updatePromptAnalysis` param type in service (Task 5) to accept the four new fields.

**Verification:**
- [ ] `npm run build` in backend compiles after Task 5 wiring

---

### Task 5 — Prompt service: filters + analysis persistence

**Files:**
- `backend/src/services/prompt.service.ts`

**Steps:**

1. Extract `buildPromptWhereClause(filters: PromptFilters): Prisma.PromptWhereInput` (testable pure function in same file or `backend/src/utils/promptFilters.ts`).
2. Add filter logic:
   ```typescript
   if (intent) where.intent = intent;
   if (inputMode) where.inputMode = inputMode;
   if (preservation) where.preservation = preservation;
   if (target) where.targets = { has: target };
   ```
3. Refactor `getPrompts()` to use `buildPromptWhereClause`.
4. Extend `updatePromptAnalysis()` to persist `intent`, `targets`, `inputMode`, `preservation` alongside existing fields.
5. For `targets` on update: replace array entirely (not merge).

**Verification:**
- [ ] `buildPromptWhereClause({ intent: 'GENERAR' })` produces `{ intent: 'GENERAR' }`
- [ ] `buildPromptWhereClause({ target: 'ROSTRO' })` produces `{ targets: { has: 'ROSTRO' } }`
- [ ] Combined filters AND correctly (category + intent + target)

---

### Task 6 — OpenRouter SYSTEM_PROMPT + sanitization hook

**Files:**
- `backend/src/services/openRouter.service.ts`

**Steps:**

1. Extend `SYSTEM_PROMPT`:
   - Add **INTENT TAXONOMY (IMAGEN only)** section listing all enum values verbatim.
   - Add subcategory vocabulary per intent (copy from `intentVocabulary.ts` or inline mirror).
   - Update JSON response structure:
     ```json
     {
       "title": "...",
       "description": "...",
       "category": "IMAGEN|VIDEO|TEXTO|AUDIO",
       "intent": "GENERAR|...|null",
       "targets": ["ROSTRO", "..."],
       "inputMode": "TEXTO_A_IMAGEN|...|null",
       "preservation": "IDENTIDAD|COMPOSICION|LIBRE|null",
       "subcategory": "controlled-slug-or-null",
       "tags": [],
       "metadata": {},
       "confidence": 0.0
     }
     ```
   - Instruct explicitly:
     - For non-IMAGEN: `intent`, `targets`, `inputMode`, `preservation` must be `null`; `targets` = `[]`
     - For IMAGEN: pick one `intent`; `targets` is multi-select array; `subcategory` must be from allowed list for that intent
   - Consider `max_tokens: 1200` if responses truncate (optional, log if needed).
2. After `JSON.parse`, call `sanitizeAnalysisResult(result)` before return.
3. Export `sanitizeAnalysisResult` usage only inside service (validation util stays in `intentValidation.ts`).

**Verification:**
- [ ] Prompt text includes all 7 intents, 6 targets, 3 input modes, 3 preservation values
- [ ] `analyzePrompt()` returns sanitized result (manual smoke with mock if no API key)

---

### Task 7 — Analysis worker threading

**Files:**
- `backend/src/workers/analysis.worker.ts`

**Steps:**

1. After `analyzePromptWithRetry`, result is already sanitized (Task 6).
2. Pass to `updatePromptAnalysis`:
   ```typescript
   intent: analysisResult.intent ?? null,
   targets: analysisResult.targets ?? [],
   inputMode: analysisResult.inputMode ?? null,
   preservation: analysisResult.preservation ?? null,
   ```
3. Keep full raw+sanitized snapshot in `analysisResult` JSON (spread existing pattern).

**Verification:**
- [ ] Worker compiles; new fields appear in DB after analyzing an IMAGEN prompt

---

### Task 8 — Controller: query validation + PUT schema

**Files:**
- `backend/src/controllers/prompt.controller.ts`

**Steps:**

1. Import new Prisma enums.
2. Add helper `parseEnumParam<T>(value: unknown, enumObj: object, fieldName: string): T | undefined` that returns `undefined` if absent, or throws/returns error descriptor if present but invalid.
3. In `getPrompts`:
   - Parse `intent`, `target`, `inputMode`, `preservation` from `req.query`
   - Invalid enum string → **400** `{ success: false, error: 'Valor inválido para intent: FOO' }`
   - Do **not** silently ignore invalid values
4. Extend `updatePromptSchema`:
   ```typescript
   intent: z.nativeEnum(ImageIntent).nullable().optional(),
   targets: z.array(z.nativeEnum(ImageTarget)).optional(),
   inputMode: z.nativeEnum(InputMode).nullable().optional(),
   preservation: z.nativeEnum(Preservation).nullable().optional(),
   ```
5. Keep `subcategory: z.string().max(50).optional()` — grandfathered free-form on manual PUT.

**Verification:**
- [ ] `GET /api/prompts?intent=INVALID` → 400
- [ ] `GET /api/prompts?intent=GENERAR` → 200, filtered results
- [ ] `PUT` with invalid `intent` → 400 Zod error

---

### Task 9 — Vitest setup + automated tests

**Files:**
- `backend/package.json` — add devDeps + scripts
- `backend/vitest.config.ts` (**NEW**)
- `backend/src/__tests__/promptFilters.test.ts` (**NEW**)
- `backend/src/__tests__/intentValidation.test.ts` (**NEW**)

**Steps:**

1. Install Vitest:
   ```bash
   cd backend && npm install -D vitest
   ```
2. Add scripts to `backend/package.json`:
   ```json
   "test": "vitest run",
   "test:watch": "vitest"
   ```
3. `vitest.config.ts`: `environment: 'node'`, include `src/**/*.test.ts`.
4. **`promptFilters.test.ts`** — test `buildPromptWhereClause`:
   - Empty filters → `{}`
   - Single: `intent`, `target`, `inputMode`, `preservation`
   - Combined: `category` + `intent` + `target`
   - Ensure `target` uses `{ has: target }` not equality on scalar
5. **`intentValidation.test.ts`** — test `sanitizeAnalysisResult`:
   - Valid IMAGEN full payload
   - Invalid `intent` → null, COMPLETED path (no throw)
   - Invalid `targets` entries stripped
   - `category: TEXTO` with intent set → all intent fields nulled
   - Invalid subcategory for valid intent → `null`
   - Valid subcategory for intent → preserved
6. Export `buildPromptWhereClause` from service or `utils/promptFilters.ts` for testing.

**Verification:**
- [ ] `cd backend && npm test` — all tests pass
- [ ] At least 10 test cases across both files

---

### Task 10 — Build + docs

**Files:**
- `CLAUDE.md` (API routes section only)

**Steps:**

1. Run `npm run build` from `backend/`.
2. Update `CLAUDE.md` `GET /api/prompts` line:
   ```
   - `GET /api/prompts` - List prompts (supports `?category=`, `?search=`, `?favorite=true`, `?intent=`, `?target=`, `?inputMode=`, `?preservation=`)
   ```
3. Note invalid enum query params return 400.

**Verification:**
- [ ] `npm run build:backend` (from repo root) succeeds
- [ ] CLAUDE.md reflects new query params

---

## Definition of Done

- [ ] Schema migrated; four enums + four columns on `Prompt`
- [ ] `intentVocabulary.ts` + `intentValidation.ts` implemented
- [ ] AI pipeline extracts and sanitizes intent fields for IMAGEN; non-IMAGEN fields null
- [ ] `GET /api/prompts` supports `intent`, `target`, `inputMode`, `preservation` with 400 on invalid enums
- [ ] `PUT /api/prompts/:id` accepts new fields via Zod
- [ ] Grandfathered existing `subcategory` values untouched in DB
- [ ] Vitest tests pass (`npm test` in backend)
- [ ] Backend builds without errors
- [ ] No frontend files modified

---

## Manual smoke test matrix (post-implementation)

| # | Test | Expected |
|---|------|----------|
| M1 | Migration on DB with existing prompts | Columns added; old rows `intent: null` |
| M2 | POST IMAGEN-style prompt + AI | Worker sets intent fields + controlled subcategory |
| M3 | POST TEXTO prompt + AI | `intent`, `targets`, `inputMode`, `preservation` all null |
| M4 | `GET ?intent=GENERAR` | Only matching prompts |
| M5 | `GET ?target=ROSTRO` | Prompts where `targets` contains ROSTRO |
| M6 | `GET ?intent=BOGUS` | 400 |
| M7 | `GET ?category=IMAGEN&intent=RETOQUE&target=PIEL` | Intersection |
| M8 | PUT valid intent fields | Persisted |
| M9 | Pre-migration prompt GET | No errors, null intent fields |

---

## Test commands

```bash
# Unit tests (required — run after Task 9)
cd /home/ubuntu/repos/promotkimi/backend && npm test

# Watch mode during development
cd /home/ubuntu/repos/promotkimi/backend && npm run test:watch

# Schema
cd /home/ubuntu/repos/promotkimi/backend && npx prisma migrate dev --name intent_categorization
cd /home/ubuntu/repos/promotkimi/backend && npx prisma generate

# Compile
cd /home/ubuntu/repos/promotkimi/backend && npm run build
cd /home/ubuntu/repos/promotkimi && npm run build:backend

# Manual API smoke (requires running stack: postgres, redis, api)
curl -s "http://localhost:3001/api/prompts?intent=GENERAR" | jq '.count'
curl -s "http://localhost:3001/api/prompts?intent=INVALID" | jq '.error'   # expect 400
curl -s "http://localhost:3001/api/prompts?target=ROSTRO" | jq '.count'
```

---

## Instrucciones para gsd-executor

1. **Read first:** This PLAN.md, impact report, `CLAUDE.md`, and the seven backend files listed in the impact report §6.1. Do not read or modify frontend `src/`.

2. **Execute Tasks 1→10 in order.** Do not skip Task 9 (Vitest). Mark each verification checkbox mentally before moving on.

3. **Enum fidelity:** Copy enum members exactly as specified — `GENERAR` not `GENERATE`, `TEXTO_A_IMAGEN` not `TEXT_ONLY`. Prisma enum identifiers must match AI prompt strings.

4. **Sanitization is non-fatal:** AI invalid enums never fail the job. Worker always calls `updatePromptAnalysis` with `analysisStatus: COMPLETED` when JSON parses (existing behavior). Only JSON parse/network errors → FAILED.

5. **Query param `target`:** Singular only. Do not add `targets` query param in this item.

6. **Grandfathering:** Never bulk-update existing `subcategory` rows. Manual PUT keeps free string. AI path enforces vocabulary only when `category === IMAGEN'` and `intent` is valid.

7. **Extract for testability:** `buildPromptWhereClause` and `sanitizeAnalysisResult` must be importable from tests without starting Express or DB.

8. **If migration fails:** Check `DATABASE_URL`; do not hand-edit SQL unless Prisma generation is wrong. Prefer `prisma migrate dev`.

9. **If OpenRouter key missing:** Still implement and test sanitization + filters via unit tests; skip live AI smoke.

10. **Commit scope:** Backend files + migration + `CLAUDE.md` API line + `backend/vitest.config.ts`. One logical commit message: `feat(backend): intent-based categorization schema, API filters, AI extraction`.

11. **Stop boundary:** Do not implement frontend types/UI, re-analysis endpoint, or data backfill script. Those are downstream items.

12. **Report completion:** Log files touched, test output summary, and any manual smoke results.

---

## Files summary

| Action | Path |
|--------|------|
| MODIFY | `backend/prisma/schema.prisma` |
| NEW | `backend/prisma/migrations/*_intent_categorization/migration.sql` |
| NEW | `backend/src/constants/intentVocabulary.ts` |
| NEW | `backend/src/utils/intentValidation.ts` |
| NEW | `backend/src/utils/promptFilters.ts` (optional — if extracted from service) |
| MODIFY | `backend/src/types/index.ts` |
| MODIFY | `backend/src/services/prompt.service.ts` |
| MODIFY | `backend/src/services/openRouter.service.ts` |
| MODIFY | `backend/src/workers/analysis.worker.ts` |
| MODIFY | `backend/src/controllers/prompt.controller.ts` |
| MODIFY | `backend/package.json` |
| NEW | `backend/vitest.config.ts` |
| NEW | `backend/src/__tests__/promptFilters.test.ts` |
| NEW | `backend/src/__tests__/intentValidation.test.ts` |
| MODIFY | `CLAUDE.md` (API routes bullet only) |
| REGENERATE | `backend/node_modules/.prisma/client/` |
| DO NOT TOUCH | `src/**` (frontend) |

---

*Generated by gsd-planner. Ready for gsd-executor.*