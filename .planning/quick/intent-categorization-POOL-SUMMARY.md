# Pool Closed: intent-categorization

**Date:** 2026-06-24  
**Project:** PromptVault  
**Status:** CLOSED — 3/3 items complete

## Completed Items

| # | Item | Status |
|---|------|--------|
| 1 | Backend — intent enums, AI extraction, API filters, tests | DONE |
| 2 | Frontend — filter UI, badges, detail metadata | DONE |
| 3 | Migration scripts — apply migration + batch re-analysis | DONE |

## Verification

| Check | Result |
|-------|--------|
| Backend tests (`npm test`) | **69/69 passing** |
| Frontend build (`npm run build`) | **PASS** |
| Production migration `20260624120000_intent_categorization` | **Applied** |
| Prompts pending re-analysis | **47** |

## Review (Item 1)

- **Effort:** 5
- **Review rounds:** 3
- **Open issues:** 0

## Re-analysis

Run after migration is applied and `OPENROUTER_API_KEY` is set:

```bash
cd backend && npm run reanalyze
```

Options: `--dry-run`, `--limit N`

## New Filter API

`GET /api/prompts` query params (invalid enum → 400):

- `?intent=` — `ImageIntent` (e.g. `GENERAR`, `MEJORAR_REALISMO`, `TRANSFORMAR`, …)
- `?target=` — `ImageTarget` (singular; e.g. `ROSTRO`, `PIEL`, `CUERPO`, …)
- `?inputMode=` — `InputMode` (`TEXTO_A_IMAGEN`, `IMAGEN_A_IMAGEN`, `MULTI_IMAGEN`)
- `?preservation=` — `Preservation` (`IDENTIDAD`, `COMPOSICION`, `LIBRE`)

Frontend wiring: `src/services/api.ts` → `getPrompts()` URLSearchParams.

## UI Locations

| Location | What |
|----------|------|
| `src/components/Header.tsx` | Intent filter panel (visible when category is **Todas** or **IMAGEN**); pill buttons for intent / inputMode / preservation; toggle for target; included in active-filter indicator and "Limpiar filtros" |
| `src/components/prompts/PromptCard.tsx` | Intent badge below category badge on card image |
| `src/components/prompts/DetailModal.tsx` | "Categorización de imagen" section — intent, targets, inputMode, preservation, subcategory (Spanish labels) |
| `src/types/index.ts` | `INTENT_CONFIG`, `TARGET_CONFIG`, `INPUT_MODE_CONFIG`, `PRESERVATION_CONFIG` |

## Key Artifacts

- Migration: `backend/prisma/migrations/20260624120000_intent_categorization/`
- Apply script: `backend/scripts/apply-intent-migration.ts`
- Re-analysis script: `backend/scripts/reanalyze-prompts.ts`