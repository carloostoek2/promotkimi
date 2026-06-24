# Test Guardian Verdict: Intent Categorization Backend

**Item:** Intent-based categorization — schema + backend  
**Agent:** test-guardian  
**Date:** 2026-06-24  
**Verdict:** **PASS WITH GAPS CLOSED**

---

## Summary

Audited unit test coverage for intent categorization utilities and controller query-param validation. Found **critical gaps** in controller-level enum validation tests and several edge cases in filter/sanitizer utilities. Added **14 new tests** across 3 files. Full suite: **29/29 passing**.

---

## Coverage Before Audit

| Module | File | Tests | Status |
|--------|------|-------|--------|
| Prompt filters | `backend/src/utils/promptFilters.ts` | 8 | Partial — missing tags, combined filters, search+intent |
| Intent sanitizer | `backend/src/utils/intentValidation.ts` | 8 | Partial — missing non-array targets, undefined intent, non-IMAGEN categories |
| Controller enum parsing | `backend/src/controllers/prompt.controller.ts` (`parseEnumParam` via `getPrompts`) | 0 | **Critical gap** — no 400-path or pass-through tests |

### What Was Adequately Covered

- Individual filter fields: `intent`, `target`, `inputMode`, `preservation`
- Valid IMAGEN analysis payload pass-through
- Invalid intent/target/inputMode/preservation nulling
- Non-IMAGEN (TEXTO) category strips intent fields
- Subcategory vocabulary validation (valid/invalid/null intent)

### Critical Gaps Identified

1. **`getPrompts` enum query validation** — `parseEnumParam` is private; no tests for 400 on invalid values, non-string params, or empty-string omission. This is the API contract for intent filters.
2. **Filter composition** — no test that all four intent filters combine with AND logic.
3. **Search + intent filters** — no test ensuring OR search clause coexists with intent equality filters.
4. **Tags normalization** — tag filter logic untested (adjacent but used alongside intent filters in `GET /api/prompts`).
5. **Sanitizer edge cases** — non-array `targets`, all-invalid targets, `undefined` intent, VIDEO category.

### Out of Scope (Not Critical for This Item)

- Integration tests against PostgreSQL / Prisma
- `updatePrompt` Zod validation for intent fields in request body
- OpenRouter `SYSTEM_PROMPT` / worker persistence chain
- `intentVocabulary.ts` unit tests (thin wrapper; covered indirectly via sanitizer)
- Re-analysis / backfill flows

---

## Tests Added

### `backend/src/__tests__/prompt.controller.test.ts` (NEW — 5 tests)

| Test | Covers |
|------|--------|
| passes valid intent categorization filters to the service | Happy path for all 4 query params |
| returns 400 for invalid intent query param | `parseEnumParam` rejection |
| returns 400 for invalid target query param | Target enum validation |
| returns 400 for non-string enum query param | Type guard in `parseEnumParam` |
| omits empty intent filter values | `undefined` / `null` / `''` → no filter |

### `backend/src/__tests__/promptFilters.test.ts` (+4 tests)

| Test | Covers |
|------|--------|
| filters by isFavorite (extended) | `isFavorite: false` |
| filters by category alone | Category filter |
| normalizes tags for filter matching | Tag slug normalization |
| combines all intent categorization filters with AND logic | Full intent filter stack |
| combines search with intent filters without losing either | Search OR + intent equality |

### `backend/src/__tests__/intentValidation.test.ts` (+4 tests)

| Test | Covers |
|------|--------|
| normalizes undefined intent to null | Missing intent from AI |
| treats non-array targets as empty array | Malformed AI response |
| drops all targets when every entry is invalid | Full strip + warn |
| nulls intent fields for VIDEO category same as TEXTO | Non-IMAGEN guard |

---

## Test Run Output

```
> promptvault-api@1.0.0 test
> vitest run

 RUN  v3.2.6 /home/ubuntu/repos/promotkimi/backend

 ✓ src/__tests__/intentValidation.test.ts (12 tests) 20ms
 ✓ src/__tests__/prompt.controller.test.ts (5 tests) 14ms
 ✓ src/__tests__/promptFilters.test.ts (12 tests) 9ms

 Test Files  3 passed (3)
      Tests  29 passed (29)
   Duration  2.10s
```

**Note:** Importing `prompt.controller.ts` triggers Redis/BullMQ side effects (`ECONNREFUSED 127.0.0.1:6379` stderr). Tests pass; consider mocking `../config/queue` in controller tests to silence noise.

---

## Residual Risks

| Risk | Severity | Recommendation |
|------|----------|----------------|
| No `updatePrompt` body validation tests for intent enums | Medium | Add Zod schema tests for PUT body |
| No integration test for `GET /api/prompts` + DB | Medium | Future item — Prisma test container |
| Controller imports queue/redis on load | Low | Mock queue module in test setup |
| `intentVocabulary` constants untested directly | Low | Covered via sanitizer subcategory tests |

---

## Final Verdict

**PASS WITH GAPS CLOSED** — Critical intent-categorization paths (query-param validation, filter building, AI response sanitization) now have unit coverage. Safe to proceed; recommend follow-up integration tests before production deploy.