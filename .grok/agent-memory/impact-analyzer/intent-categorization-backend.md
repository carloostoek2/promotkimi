# Impact Analysis: Intent-Based Categorization — Schema + Backend

**Project:** PromptVault (`/home/ubuntu/repos/promotkimi`)  
**Item:** 1 — Schema + Backend for Intent-Based Categorization  
**Agent:** impact-analyzer (pre-change only — no implementation)  
**Date:** 2026-06-24  
**Scope boundary:** Backend + Prisma only. Frontend is downstream consumer, not in this item.

---

## Executive Summary

This change introduces **four new Prisma enums** and **four new `Prompt` columns** (`intent`, `targets[]`, `inputMode`, `preservation`), updates the **OpenRouter SYSTEM_PROMPT** to extract them, extends **API list filters**, and threads new fields through **types → service → controller → analysis worker**.

**Overall risk: MEDIUM-HIGH** — schema migration is low-risk if columns are nullable, but the **AI pipeline** and **controlled subcategory vocabulary** introduce validation/consistency risks. There are **zero automated tests** in the repo today.

**Blocker / gap:** The repo does **not** contain the "prior proposal" with exact enum values. Implementer must confirm values before migration (see § Open Questions).

---

## 1. Current State

### 1.1 Database (`backend/prisma/schema.prisma`)

| Field | Type | Notes |
|-------|------|-------|
| `category` | `Category?` enum | IMAGEN, VIDEO, TEXTO, AUDIO |
| `subcategory` | `String?` VarChar(50) | Free-form, indexed |
| `metadata` | `Json?` | Category-specific AI metadata |
| `analysisResult` | `Json?` | Full AI snapshot |

**No** `ImageIntent`, `ImageTarget`, `InputMode`, or `Preservation` enums exist.

### 1.2 AI Analysis Pipeline

```
POST /api/prompts → queueAnalysis() → BullMQ worker
  → openRouter.service.analyzePromptWithRetry()
  → updatePromptAnalysis() → PostgreSQL
```

- **SYSTEM_PROMPT** (`backend/src/services/openRouter.service.ts:9-64`): instructs JSON with `category`, free-form `subcategory`, `tags`, `metadata`, `confidence`.
- **Worker** (`backend/src/workers/analysis.worker.ts:30-41`): maps `AnalysisResult` → `updatePromptAnalysis()` — does **not** persist `confidence` to a column (only in `analysisResult` JSON).
- **Re-analysis:** Only triggered on `POST /api/prompts` with `analyzeWithAI=true`. No re-analyze endpoint.

### 1.3 API Surface

| Endpoint | Relevant behavior |
|----------|-------------------|
| `GET /api/prompts` | Filters: `search`, `category`, `tags`, `isFavorite`, `sortBy`, `sortOrder` |
| `PUT /api/prompts/:id` | Zod validates `category`, `subcategory` (free string, max 50) |
| All prompt CRUD | Returns full Prisma `Prompt` object (new columns auto-exposed) |

### 1.4 Types Chain

| Layer | File | Key interfaces |
|-------|------|----------------|
| Prisma | `schema.prisma` | Generated client types |
| Backend | `backend/src/types/index.ts` | `CreatePromptInput`, `UpdatePromptInput`, `PromptFilters`, `AnalysisResult` |
| Frontend (downstream) | `src/types/index.ts` | Mirror of backend prompt types |

### 1.5 Subcategory Today

- Stored and returned by API but **not displayed** in frontend UI (only `category` badge shown in `PromptCard`, `DetailModal`, `FlowViewModal`).
- No server-side validation of subcategory values against a vocabulary.

---

## 2. Proposed Changes (from Scope)

| Change | Description |
|--------|-------------|
| New enums | `ImageIntent`, `ImageTarget`, `InputMode`, `Preservation` |
| New Prompt fields | `intent`, `targets` (array), `inputMode`, `preservation` |
| Controlled subcategory | Replace/ constrain free-form `subcategory` with intent-driven vocabulary |
| SYSTEM_PROMPT | Extract new fields + constrained subcategories for IMAGEN |
| API filters | `?intent=`, `?target=`, `?inputMode=`, `?preservation=` query params |
| Service/controller/types/worker | Thread new fields end-to-end |
| Prisma migration | Add enums + columns + indexes |

### 2.1 Inferred Enum Values (⚠️ NOT IN REPO — confirm with prior proposal)

Since the prior proposal document is **not present** in the workspace, downstream must validate these placeholders:

```prisma
enum ImageIntent {
  GENERATE      // text-to-image from scratch
  EDIT          // modify existing image
  INPAINT       // masked region regeneration
  OUTPAINT      // extend canvas
  STYLE_TRANSFER
  UPSCALE
  VARIATION
}

enum ImageTarget {
  SUBJECT
  BACKGROUND
  LIGHTING
  COLOR
  COMPOSITION
  STYLE
  TEXTURE
  FACE
  OBJECT
}

enum InputMode {
  TEXT_ONLY
  TEXT_AND_IMAGE
  IMAGE_TO_IMAGE
  INPAINT_MASK
  CONTROL_REFERENCE
}

enum Preservation {
  NONE
  PARTIAL
  STRICT
  IDENTITY
}
```

**Controlled subcategory vocabulary** (example — intent → allowed subcategories):

| Intent | Subcategories |
|--------|---------------|
| GENERATE | `portrait`, `landscape`, `product`, `concept-art`, `architecture`, `abstract` |
| EDIT | `color-grade`, `remove-object`, `add-element`, `enhance-detail`, `background-swap` |
| INPAINT | `fill-region`, `replace-object`, `fix-artifact` |
| STYLE_TRANSFER | `artistic`, `photographic`, `illustration` |
| UPSCALE | `2x`, `4x`, `detail-enhance` |

Implementer should centralize this in e.g. `backend/src/constants/intentVocabulary.ts`.

---

## 3. Consumer Map

### 3.1 Direct Backend Consumers (MUST change in this item)

| Consumer | File | Call site / usage | Impact |
|----------|------|-------------------|--------|
| Prisma schema | `backend/prisma/schema.prisma` | Source of truth | Add enums, fields, indexes, migration |
| Types | `backend/src/types/index.ts` | `AnalysisResult`, `PromptFilters`, `UpdatePromptInput` | Add 4 fields + filter types |
| OpenRouter | `backend/src/services/openRouter.service.ts` | `SYSTEM_PROMPT`, `analyzePrompt()` | Major prompt rewrite; JSON schema change |
| Prompt service | `backend/src/services/prompt.service.ts` | `getPrompts()`, `updatePromptAnalysis()` | Filter logic + persist new fields |
| Controller | `backend/src/controllers/prompt.controller.ts` | `getPrompts()`, `updatePromptSchema` | Parse/validate query params + body |
| Analysis worker | `backend/src/workers/analysis.worker.ts` | `updatePromptAnalysis()` call | Map new `AnalysisResult` fields |
| Prisma client | `backend/node_modules/.prisma/client/*` | All DB access | Regenerate via `prisma generate` |
| Compiled dist | `backend/dist/**` | Production build | Rebuild after changes |

### 3.2 Indirect Backend Consumers (auto-affected, likely no code change)

| Consumer | File | Impact |
|----------|------|--------|
| Queue config | `backend/src/config/queue.ts` | No change — passes `promptId` + `content` only |
| Flow service | `backend/src/services/flow.service.ts` | `include: { prompt: ... }` returns new fields automatically |
| Database config | `backend/src/config/database.ts` | No change |
| App bootstrap | `backend/src/app.ts` | No route changes needed |

### 3.3 Downstream Frontend Consumers (OUT OF SCOPE — future item)

| Consumer | File | Current usage | Future need |
|----------|------|---------------|-------------|
| Types | `src/types/index.ts` | `Prompt`, `PromptFilters`, `UpdatePromptInput` | Add new fields + enums |
| API client | `src/services/api.ts` | `getPrompts()` builds query params | Append `intent`, `target`, `inputMode`, `preservation` |
| Store | `src/stores/promptStore.ts` | `filters` state, `fetchPrompts()` | New filter state |
| Header | `src/components/Header.tsx` | Category filter UI | Intent filter UI (future) |
| PromptCard | `src/components/prompts/PromptCard.tsx` | Shows `category` badge only | May show intent badge |
| DetailModal | `src/components/prompts/DetailModal.tsx` | Shows category + metadata | Show intent/targets/preservation |
| EditModal | `src/components/prompts/EditModal.tsx` | Edits category, not subcategory | Edit new intent fields |
| FlowViewModal | `src/components/flows/FlowViewModal.tsx` | Category color on nodes | May use intent colors |

**Note:** Frontend types already include `subcategory` but UI ignores it — new fields will similarly be invisible until frontend item.

### 3.4 External Systems

| System | Sensitivity | Impact |
|--------|-------------|--------|
| PostgreSQL 15 | **HIGH** | Migration adds enums + columns; deploy order: migrate → generate → deploy API |
| Redis / BullMQ | LOW | Job payload unchanged (`promptId`, `content`) |
| OpenRouter API | **HIGH** | Prompt change affects all new analyses; token usage may increase |
| Railway deployment | MEDIUM | Requires `prisma migrate deploy` on api service |

---

## 4. Risk Classification

### 🔴 HIGH

| Risk | Description | Mitigation |
|------|-------------|------------|
| **AI returns invalid enum values** | OpenRouter may return strings outside Prisma enums | Validate/sanitize in `analyzePrompt()` or worker; fallback to `null`; log invalid values |
| **Controlled subcategory drift** | AI may invent subcategories outside vocabulary | Post-process: map to nearest valid or `null`; include vocabulary list in SYSTEM_PROMPT |
| **Missing prior proposal values** | Exact enum members unknown | Block migration until values confirmed; wrong enums are costly to rename in PG |
| **No automated tests** | Regressions undetected | Manual test matrix required (see §5) |

### 🟡 MEDIUM

| Risk | Description | Mitigation |
|------|-------------|------------|
| **Existing prompts lack new fields** | All current rows have `null` intent/targets/etc. | Nullable columns; filters must handle `null` gracefully |
| **Backward compat of `analysisResult` JSON** | Old snapshots lack new keys | Frontend/downstream must treat fields as optional |
| **`targets` array filtering** | Prisma `has`/`hasSome` semantics | Document: `?target=SUBJECT` = contains; `?targets=SUBJECT,BACKGROUND` = hasSome |
| **SYSTEM_PROMPT size / token cost** | Larger prompt → higher latency/cost | Monitor; consider intent-only for IMAGEN category |
| **Subcategory column semantics change** | Was free-form, becomes controlled | Existing subcategory values may not match new vocabulary; consider data migration or grandfathering |
| **Index strategy** | New filter columns need indexes | Add `@@index([intent])`, `@@index([inputMode])`, `@@index([preservation])`; GIN index for `targets` array if heavy use |

### 🟢 LOW

| Risk | Description | Mitigation |
|------|-------------|------------|
| **API response shape expansion** | New fields appear in all prompt responses | Additive change; existing clients ignore unknown fields |
| **PUT validation** | New optional fields in update schema | Use `z.nativeEnum()` for each |
| **Flow nodes** | Nested prompt objects gain fields | Additive only |
| **Category enum unchanged** | IMAGEN/VIDEO/TEXTO/AUDIO preserved | Intent fields apply primarily to IMAGEN; clarify behavior for other categories |

---

## 5. Tests

### 5.1 Existing Test Coverage

**None.** Grep found `0` files matching `*.test.ts`, `*.spec.ts`, or test scripts in `package.json`.

### 5.2 Recommended Manual Test Matrix (for implementer / QA)

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T1 | Migration | `cd backend && npx prisma migrate dev` | Enums + columns created; existing data intact |
| T2 | Prisma generate | `npx prisma generate` | Client exports new enums |
| T3 | Create + analyze IMAGEN prompt | POST prompt with image-generation text | Worker sets `intent`, `targets`, `inputMode`, `preservation`, controlled `subcategory` |
| T4 | Create TEXTO prompt | POST text-only LLM prompt | Intent fields `null` or ignored per spec |
| T5 | Filter by intent | `GET /api/prompts?intent=GENERATE` | Only matching prompts |
| T6 | Filter by target | `GET /api/prompts?target=SUBJECT` | Prompts where `targets` contains SUBJECT |
| T7 | Filter by inputMode | `GET /api/prompts?inputMode=TEXT_ONLY` | Matching prompts |
| T8 | Filter by preservation | `GET /api/prompts?preservation=STRICT` | Matching prompts |
| T9 | Combined filters | `?category=IMAGEN&intent=EDIT&target=BACKGROUND` | Intersection works |
| T10 | Invalid filter value | `?intent=INVALID` | 400 or empty result (define behavior) |
| T11 | PUT update intent fields | PUT with valid enum values | Persisted correctly |
| T12 | PUT invalid enum | PUT with invalid `intent` | 400 Zod error |
| T13 | AI invalid response | Mock OpenRouter returning bad enum | Graceful fallback, analysisStatus COMPLETED or FAILED per policy |
| T14 | Existing prompts | GET prompts created before migration | `intent: null`, no errors |
| T15 | analysisResult JSON | After analysis | Contains new fields in snapshot |

### 5.3 Recommended Automated Tests (future — not in scope)

- Unit: `getPrompts()` filter builder with enum arrays
- Unit: AI response validator/sanitizer
- Integration: migration round-trip
- Contract: `AnalysisResult` Zod schema parse

---

## 6. Files Affected

### 6.1 Must Modify (this item)

| File | Changes |
|------|---------|
| `backend/prisma/schema.prisma` | Add 4 enums; add `intent`, `targets`, `inputMode`, `preservation` to `Prompt`; indexes |
| `backend/prisma/migrations/<timestamp>_intent_categorization/migration.sql` | **NEW** — generated by Prisma |
| `backend/src/types/index.ts` | Extend `AnalysisResult`, `PromptFilters`, `UpdatePromptInput`; import new enums |
| `backend/src/constants/intentVocabulary.ts` | **NEW** (recommended) — subcategory maps per intent |
| `backend/src/services/openRouter.service.ts` | Rewrite `SYSTEM_PROMPT`; optional response validation |
| `backend/src/services/prompt.service.ts` | `getPrompts()` filters; `updatePromptAnalysis()` new fields |
| `backend/src/controllers/prompt.controller.ts` | Query param parsing; Zod schemas for new fields |
| `backend/src/workers/analysis.worker.ts` | Pass `intent`, `targets`, `inputMode`, `preservation`, `subcategory` to service |

### 6.2 Must Regenerate / Rebuild

| Path | Action |
|------|--------|
| `backend/node_modules/.prisma/client/` | `npx prisma generate` |
| `backend/dist/` | `npm run build` in backend |

### 6.3 Not Modified (this item) but Affected at Runtime

| File | Why |
|------|-----|
| `backend/src/config/queue.ts` | Unchanged interface |
| `backend/src/services/flow.service.ts` | Returns expanded prompt shape |
| `backend/src/routes/prompt.routes.ts` | No new routes needed |

### 6.4 Downstream (separate item)

| File |
|------|
| `src/types/index.ts` |
| `src/services/api.ts` |
| `src/stores/promptStore.ts` |
| `src/components/Header.tsx` |
| `src/components/prompts/*.tsx` |
| `src/components/flows/FlowViewModal.tsx` |
| `CLAUDE.md` (API docs section) |

---

## 7. Implementation Notes for Downstream Agent

### 7.1 Prisma Schema Sketch

```prisma
model Prompt {
  // ... existing fields ...
  intent        ImageIntent?
  targets       ImageTarget[]
  inputMode     InputMode?     @map("input_mode")
  preservation  Preservation?

  @@index([intent])
  @@index([inputMode])
  @@index([preservation])
}
```

### 7.2 Filter Implementation Sketch (`getPrompts`)

```typescript
// intent, inputMode, preservation — equality
if (intent) where.intent = intent;
if (inputMode) where.inputMode = inputMode;
if (preservation) where.preservation = preservation;

// target(s) — array contains
if (target) where.targets = { has: target };
if (targets?.length) where.targets = { hasSome: targets };
```

### 7.3 AnalysisResult Extension

```typescript
export interface AnalysisResult {
  // existing...
  intent?: ImageIntent | null;
  targets?: ImageTarget[];
  inputMode?: InputMode | null;
  preservation?: Preservation | null;
  // subcategory: now constrained string from vocabulary
}
```

### 7.4 SYSTEM_PROMPT Changes

- Add intent taxonomy section (IMAGEN-specific)
- List valid enum values explicitly (mirrors Prisma enums)
- Map intent → allowed subcategories
- Update JSON response structure
- Instruct: use `null` for non-IMAGEN categories or when undetermined
- Consider increasing `max_tokens` (currently 1000) if response grows

### 7.5 Data Migration Considerations

- **No backfill required** if columns nullable
- Optional: script to re-queue analysis for existing IMAGEN prompts
- Existing `subcategory` values: leave as-is or validate against new vocabulary on read

---

## 8. Definition of Done (Downstream Implementer)

- [ ] Exact enum values confirmed against prior proposal (not inferred placeholders)
- [ ] `backend/prisma/schema.prisma` updated with 4 enums + 4 Prompt fields
- [ ] Migration applied locally and tested against existing data
- [ ] `npx prisma generate` run; TypeScript compiles without errors
- [ ] `backend/src/constants/intentVocabulary.ts` (or equivalent) defines controlled subcategories
- [ ] `SYSTEM_PROMPT` updated; AI JSON schema documented in code comments
- [ ] AI response validation handles invalid enum values gracefully
- [ ] `AnalysisResult` type extended; worker persists all new fields
- [ ] `updatePromptAnalysis()` accepts and stores `intent`, `targets`, `inputMode`, `preservation`
- [ ] `GET /api/prompts` accepts `intent`, `target` (or `targets`), `inputMode`, `preservation` query params
- [ ] `PUT /api/prompts/:id` validates new fields via Zod
- [ ] Indexes added for filtered columns
- [ ] Manual test matrix (§5.2) executed and logged
- [ ] `npm run build:backend` succeeds
- [ ] `CLAUDE.md` API routes section updated with new query params

---

## 9. Open Questions (Require Resolution Before Implementation)

1. **Exact enum values** — Where is the prior proposal? Repo search found no `ImageIntent`/`ImageTarget` definitions.
2. **Non-IMAGEN behavior** — Should `intent`/`targets`/`inputMode`/`preservation` be `null` for VIDEO/TEXTO/AUDIO, or should AI attempt classification?
3. **Subcategory migration** — Keep existing free-form values or reset/wipe on migration?
4. **Target filter param name** — `target` (singular) vs `targets` (comma-separated)? Scope says `target`.
5. **Invalid query param handling** — Return 400 vs silently ignore invalid enum strings?
6. **AI failure policy** — If intent fields invalid but rest OK: mark COMPLETED with partial data, or FAILED?
7. **Re-analysis endpoint** — Needed to backfill existing prompts? (Not in scope but affects data completeness.)
8. **Preservation applicability** — Only for EDIT/INPAINT intents, or all?

---

## 10. Systems Sensibles (Summary)

| System | Sensitivity | Reason |
|--------|-------------|--------|
| PostgreSQL schema | 🔴 HIGH | Enum additions are hard to rename; migration ordering on deploy |
| OpenRouter SYSTEM_PROMPT | 🔴 HIGH | Changes behavior of all new AI analyses |
| BullMQ analysis worker | 🟡 MEDIUM | Persists new fields; validation gap = bad data |
| GET /api/prompts filters | 🟡 MEDIUM | New query contract; index-dependent performance |
| Prisma client | 🟡 MEDIUM | Must regenerate before compile |
| Frontend (downstream) | 🟢 LOW (this item) | Additive API fields; no breaking changes if nullable |

---

*Generated by impact-analyzer agent. Analysis only — no code changes made.*