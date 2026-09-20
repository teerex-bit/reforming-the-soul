# RTS Phase 1 Vertical Slice TDD Implementation Plan

> **For the engineering lead:** Execute this plan one bounded work package at a time. Every behavior begins with a failing test, receives the minimum implementation needed to pass, and is refactored only while the suite is green. No agent may change the architecture, curriculum structure, or product scope without a recorded engineering-lead decision.

**Goal:** Prove the approved 24-step RTS vertical slice end to end without building the broader curriculum.

**Architecture:** A Next.js App Router application calls framework-independent TypeScript services. Supabase Auth supplies the actor; PostgreSQL RLS, composite ownership constraints, and transactional functions provide the final data boundary. Versioned authored content is validated outside route components. Server-only OpenAI orchestration assembles minimum, permission-verified context and never persists full transcripts.

**Tech stack:** Next.js 16, React 19, TypeScript 5.9, PostgreSQL/Supabase Auth/RLS, OpenAI Responses API with `store:false`, Vitest, Supabase CLI/pgTAP-compatible SQL integration tests, Playwright, axe-core.

**Controlling documents:** `docs/architecture/ADR-001-phase-1-prototype-stack.md`, `docs/design-system/overview-source-audit.md`, `docs/superpowers/specs/2026-09-20-rts-phase1-vertical-slice-design.md`, `docs/qa/phase-1-test-matrix.md`, `docs/curriculum/phase-1-seed-content.md`, and `docs/engineering/phase-1-agent-work-packages.md`.

## Non-negotiable TDD protocol

For every task below:

1. Write one behavior-focused test and run its narrow command.
2. Confirm it fails for the expected missing behavior, not because the harness is broken.
3. Implement the smallest production change that can pass it.
4. Run the narrow test and confirm green.
5. Run the package suite and affected integration tests.
6. Refactor only with all affected tests green.
7. Commit tests and implementation together in a reviewable commit.

Tests must exercise public behavior. Mocks may isolate the OpenAI network adapter and time, but must not replace PostgreSQL/RLS, the ownership boundary, or browser acceptance behavior. Never weaken a test to accept the implementation.

## Planned verification commands

Task 1 creates these scripts; subsequent tasks use the narrowest applicable command before the broader gate:

```bash
npm run typecheck
npm run lint
npm run test:unit -- <test-file-or-pattern>
npm run test:db -- <sql-test-or-pattern>
npm run test:integration -- <test-file-or-pattern>
npm run test:e2e -- <spec-file>
npm run test:a11y
npm run test:all
```

Preview authority uses `npm test`. Database/security package acceptance begins with `supabase db reset` and then `npm run test:db`; the engineering lead repeats that clean-reset sequence before integration acceptance. Concurrency acceptance runs the focused race case twenty times using a script added in Task 1 (`npm run test:concurrency`). Final browser commands select named Playwright projects `mobile-375`, `tablet-768`, and `desktop-1536`. Exact runner flags are fixed in Task 1 configuration and must not be changed by downstream packages to hide failures.

## Dependency-ordered delivery map

| Order | Gate | Must exist before next layer | Primary package |
| --- | --- | --- | --- |
| 0 | Overview preview authority | Reproducible local Overview routes/assets and passing preview tests | Design foundation |
| 1 | Test/tooling foundation | Unit, SQL integration, and browser test runners; environment validation | Integration testing |
| 2 | Domain and content contracts | Runtime schemas, enums, state machines, minimal seed content validation | Curriculum engine |
| 3 | Database security foundation | Migrations, constraints, functions, grants, forced RLS, A/B isolation suite | Database/security |
| 4 | Authenticated actor boundary | Browser/server Supabase clients, protected routes, neutral not-found ownership checks | Authentication |
| 5 | Visual/app shell foundation | Tokens, primitives, accessible form controls, responsive shell | Design/frontend |
| 6 | Curriculum state and Awaken | Renderer, Pay Attention save, independent resume pointer | Curriculum engine |
| 7 | AI Reflect without prior context | Policy, context builder, adapter, schema/error handling, ephemeral response | AI orchestration |
| 8 | See Clearly lineage | Fact/interpretation and belief/expectation with typed same-owner links | Curriculum engine + database |
| 9 | Become and practice lifecycle | Control/present truth/next step, open/return/review/close, concurrency | Practice lifecycle |
| 10 | History and provenance | Separate authored, structured, and AI-derived presentation | History/provenance |
| 11 | Selected prior context | Grant/revoke, server re-verification, provenance of context used | AI orchestration |
| 12 | Deletion dependency | Transactional source deletion, dependent artifact cleanup, progress preservation | Deletion/dependency |
| 13 | Integrated acceptance | Exact flow, isolation, accessibility, three viewports, regression evidence | Integration + QA |

No task may start until all earlier gates it depends on are green. UI stubs may be used only after their domain contract exists; database mocks may not be used to claim a security gate.

## Task 0: Restore the Overview preview authority

**Files:**

- Modify: `scripts/preview.mjs`
- Modify: `scripts/preview.test.mjs`
- Modify: `README.md`
- Test: `scripts/preview.test.mjs`

**Red:** Add a test proving every `/assets/...` reference in the Overview `src` tree resolves from `src/assets`, and that preview module import succeeds without an external manifest. Confirm current import fails on missing `shared-assets.json`.

**Green:** Remove the obsolete manifest read and serve only an explicit, normalized allowlist of project-local `src/assets` files. Preserve GET/HEAD-only behavior, traversal protection, MIME types, existing Overview routes, and the source files themselves.

**Verify:** `npm test`; then run the preview and load the audited authority routes. Visual baselines remain blocked until this is green.

**Commit:** `test(preview): make Overview authority self-contained`

## Task 1: Establish deterministic test infrastructure

**Files:**

- Modify: `package.json`, `package-lock.json`, `.gitignore`
- Create: `vitest.config.ts`, `playwright.config.ts`, `.env.test.example`
- Create: `tests/setup/unit.ts`, `tests/setup/e2e.ts`, `tests/helpers/auth.ts`, `tests/helpers/db.ts`, `tests/helpers/openai.ts`
- Create: `supabase/config.toml`, `supabase/tests/000_harness.sql`
- Create: `scripts/verify-test-environment.mjs`

**Red:** Environment test reports missing Supabase URL/keys, OpenAI test-adapter selection, or database reset capability with actionable messages. A smoke unit test, SQL test, and browser test must initially fail because their target behavior is absent.

**Green:** Add scripts `test:unit`, `test:db`, `test:e2e`, `test:a11y`, and `test:all`; pin browser projects to 375×812, 768×1024, and 1536×960; fail closed if a real OpenAI key is used in automated tests.

**Verify:** Each runner can independently execute one smoke test and return deterministic exit status. Document local prerequisites without storing secrets.

**Commit:** `test: establish Phase 1 verification harness`

## Task 2: Define domain contracts and validate the minimal authored seed

**Files:**

- Create: `domain/stages.ts`, `domain/curriculum.ts`, `domain/provenance.ts`, `domain/practice.ts`, `domain/ai.ts`
- Create: `content/phase-1/v1/curriculum.ts`, `content/phase-1/v1/index.ts`
- Create: `tests/unit/domain/*.test.ts`, `tests/unit/content/phase-1-seed.test.ts`

**Required interfaces:**

```ts
type StageId = 'awaken' | 'see-clearly' | 'become' | 'join';
type Provenance = 'user_authored' | 'ai_suggested' | 'user_confirmed_ai';
type PracticeState = 'draft' | 'open' | 'waiting_for_real_life' | 'ready_to_review' | 'reviewed' | 'closed';
type AiMode = 'explain' | 'reflect' | 'guide_me' | 'route';

interface CurriculumNode {
  id: string;
  version: 'phase-1-v1';
  stage: StageId;
  kind: 'module' | 'session' | 'interaction' | 'bridge';
  parentId: string | null;
  order: number;
  content: TeachingBlock | ScriptureBlock | PromptBlock | InteractionDefinition;
}

type AiAdapterResult<T> =
  | { kind: 'success'; value: T; providerRequestId: string | null }
  | { kind: 'refusal'; safeMessage: string }
  | { kind: 'incomplete'; reason: string }
  | { kind: 'invalid'; issues: readonly string[] }
  | { kind: 'timeout' }
  | { kind: 'provider_error'; retryable: boolean };
```

**Red:** Tests reject `walk`, duplicate IDs/order positions, invalid parent/stage transitions, UI component data in authored content, missing labels, and content beyond the exact seed inventory.

**Green:** Implement runtime validation and the exact seed in `docs/curriculum/phase-1-seed-content.md`. Keep prose and interaction definitions outside React.

**Verify:** Serialization is stable; every cross-stage bridge target resolves; no `walk` primary stage exists.

**Commit:** `feat(curriculum): define validated vertical-slice seed`

## Task 3: Build the database, RLS, and transactional security boundary

**Files:**

- Create: `supabase/migrations/202609200001_phase1_types_and_curriculum.sql`
- Create: `supabase/migrations/202609200002_phase1_private_data.sql`
- Create: `supabase/migrations/202609200003_phase1_security.sql`
- Create: `supabase/migrations/202609200004_phase1_functions.sql`
- Create: `supabase/seed.sql`
- Create: `supabase/tests/010_schema.sql`, `020_rls_matrix.sql`, `030_same_owner.sql`, `040_practice_transitions.sql`, `050_deletion.sql`, `060_audit.sql`
- Create: `docs/architecture/phase-1-data-dictionary.md`

**Red:** Begin with migrations-from-empty and anonymous/User A/User B tests that demonstrate missing tables/policies/functions. Add failures for cross-owner child references, direct practice state mutation, stale lock versions, invalid transitions, arbitrary audit writes, and dependent deletion.

**Green:** Implement the approved tables, `unique(id,user_id)` parents, composite same-owner foreign keys, typed formation links, forced RLS, indexed ownership columns, least-privilege grants, locked/versioned practice transition function, and authenticated transactional deletion function.

The exact columns, foreign-key delete actions, constraints, direct-DML restrictions, privileged function signatures, hardening rules, and AI dispatch linearization contract are frozen in `docs/architecture/phase-1-schema-blueprint.md`. Migration work implements that blueprint rather than filling gaps by local judgment.

**Verify:** Apply migrations from an empty database twice via reset; exercise actual local Supabase `anon`/`authenticated` JWT roles rather than owner/service roles; run the entire A/B matrix; inspect roles, grants, and safe `security definer` settings. Prove even the owning user cannot bypass approved functions with direct journal deletion, practice-return insertion, lifecycle mutation, audit writes, or grant/artifact state mutation.

**Commit sequence:** one reviewable commit per migration concern: schema, security, lifecycle functions, deletion/audit tests.

## Task 4: Implement authentication and the authenticated actor contract

**Files:**

- Create: `server/auth/browser-client.ts`, `server/auth/server-client.ts`, `server/auth/require-actor.ts`, `server/auth/middleware.ts`
- Create: `app/(auth)/sign-in/page.tsx`, `app/(auth)/sign-up/page.tsx`, `app/auth/callback/route.ts`
- Create: `app/(app)/layout.tsx`, `middleware.ts`
- Create: `tests/unit/auth/*.test.ts`, `tests/e2e/auth.spec.ts`

**Red:** Tests prove unauthenticated protected-route access is redirected, expired/invalid sessions fail closed, and actor IDs cannot be supplied by request body/query parameters.

**Green:** Resolve actor exclusively from the verified Supabase session; use publishable/anon credentials in browser paths; prohibit service-role imports from request paths; provide sign-up/sign-in/sign-out and callback behavior.

**Verify:** Two users can sign in independently; each receives only their own shell; cross-user IDs return neutral not-found.

**Commit:** `feat(auth): establish verified user boundary`

## Task 5: Build the Overview-derived frontend foundation

**Files:**

- Create: `app/styles/tokens.css`, `app/styles/globals.css`
- Modify: `app/layout.tsx`
- Create: `components/design-system/AppShell.tsx`, `Wordmark.tsx`, `StageContext.tsx`, `EditorialHero.tsx`, `ReflectionPanel.tsx`, `ChoicePanel.tsx`, `PracticePanel.tsx`, `ProvenanceBadge.tsx`, `Field.tsx`, `Button.tsx`, `StatusMessage.tsx`
- Create: `tests/unit/components/*.test.tsx`, `tests/e2e/design-foundation.spec.ts`

**Red:** Component tests require accessible names, persistent labels, 44px targets, keyboard behavior, focus visibility, error association, and semantic headings. Browser tests assert canonical token values and no overflow at all three viewports.

**Green:** Implement only components required by the slice, using the audited typography, palette, spacing, widths, Tree of Life wordmark, and four-stage branding. No UI framework, generic dashboard grid, sidebar shell, chat bubble, or old-site visual shell.

**Verify:** Compare the foundation to the restored Overview authority; capture non-baseline exploratory screenshots, but do not approve final visual baselines yet.

**Commit:** `feat(ui): establish Overview-derived app foundation`

## Task 6: Implement curriculum rendering, state, resume, and Awaken observation

**Files:**

- Create: `components/curriculum/CurriculumRenderer.tsx`, `Teaching.tsx`, `Scripture.tsx`, `Prompt.tsx`, `StructuredInput.tsx`, `Bridge.tsx`
- Create: `server/data/curriculum-repository.ts`, `server/services/curriculum-service.ts`, `server/services/observation-service.ts`
- Create: `app/(app)/dashboard/page.tsx`, `app/(app)/formation/[nodeId]/page.tsx`
- Create: `tests/unit/curriculum/*.test.tsx`, `tests/integration/curriculum-state.test.ts`, `tests/e2e/awaken-resume.spec.ts`

**Red:** Tests require generic rendering from validated content, save the three Awaken fields without mutation, advance only curriculum state, and resume the last incomplete interaction after sign-out/sign-in.

**Green:** Render the seed through generic components; save exact event/internal-response/body-cue wording separately from structured formation records; update `user_curriculum_state` transactionally.

**Verify:** Empty, multiline, Unicode, and whitespace-preservation cases; curriculum completion never creates formation score/evidence; resume pointer is independent of practices.

**Commit:** `feat(curriculum): render Awaken observation and resume state`

## Task 7: Implement server-only AI Reflect for the current entry

**Files:**

- Create: `server/ai/policies/global.ts`, `server/ai/policies/stages.ts`, `server/ai/policies/modes.ts`
- Create: `server/ai/context-builder.ts`, `server/ai/safety.ts`, `server/ai/schemas.ts`, `server/ai/openai-adapter.ts`, `server/ai/orchestrator.ts`
- Create: `server/services/ai-reflect-service.ts`, `app/api/ai/reflect/route.ts`
- Create: `components/ai/AIReflectPanel.tsx`
- Create: `tests/unit/ai/*.test.ts`, `tests/integration/ai-context.test.ts`, `tests/e2e/ai-reflect.spec.ts`

**Red:** Fixtures reject diagnostic certainty, divine-direction claims, calling assignment, hidden-motive/trauma assertions, scores, unsafe reconciliation pressure, prompt injection, extra structured fields, refusals, incomplete outputs, and timeout artifacts. Assert no provider call without owned current context.

**Green:** Assemble labeled policy/curriculum/current-entry blocks server-side; use no tools, no prior context by default, and `store:false`; return 1–3 precise non-diagnostic questions. Map provider results to the Task 2 discriminated result without fallback parsing. Do not persist a transcript. Save only a separately confirmed user insight or an explicitly saved labeled suggestion.

**Verify:** Captured requests contain the minimum blocks and omit unrelated history; every mode contract applies `store:false`; a static import test permits the OpenAI SDK only under `server/ai/**`; route responses use `Cache-Control: no-store`; database column/data census after success/refusal/incomplete/invalid/timeout/retry proves no prompt, response, provider conversation ID, or transcript persisted. Retries use owner-scoped `intent_id` plus request fingerprint: same key/same fingerprint safely replays without duplication; same key/different fingerprint is rejected.

**Commit:** `feat(ai): add bounded server-side Reflect mode`

## Task 8: Implement See Clearly and cross-stage lineage

**Files:**

- Create: `server/services/see-clearly-service.ts`
- Extend: `components/curriculum/StructuredInput.tsx`, `Bridge.tsx`
- Create: `tests/unit/domain/formation-links.test.ts`, `tests/integration/see-clearly-links.test.ts`, `tests/e2e/see-clearly.spec.ts`

**Red:** Tests require separate observable fact and interpretation, exactly one belief-or-expectation typed record, an owned Awaken→See Clearly link, and rejection of cross-owner/cross-version targets.

**Green:** Persist exact wording and structured types separately; create typed lineage without copying source bodies; move the curriculum resume pointer to the Become bridge.

**Verify:** Neither an interpretation nor AI suggestion is displayed as fact; deleting or losing authorization never leaks linked metadata.

**Commit:** `feat(formation): add See Clearly bridge and lineage`

## Task 9: Implement Become and the concurrency-safe practice lifecycle

**Files:**

- Create: `server/data/practice-repository.ts`, `server/services/practice-service.ts`
- Create: `components/practice/PracticeForm.tsx`, `PracticeReturnForm.tsx`, `PracticeReview.tsx`
- Create: `app/(app)/practices/[practiceId]/page.tsx`
- Create: `tests/unit/domain/practice.test.ts`, `tests/integration/practice-lifecycle.test.ts`, `tests/e2e/practice-return.spec.ts`

**Red:** Domain tests cover every allowed/forbidden edge. SQL/service tests send two transitions with the same expected state/version and require exactly one success. Browser test creates control target, present truth, next right step, leaves, returns, records outcome, reviews, and closes.

**Green:** Use only the transition database function for state changes; create the return row in the same transaction as `waiting_for_real_life → ready_to_review`; show recoverable conflict UI without losing text.

**Verify:** Open practice survives session termination; dashboard prioritizes unfinished practice without replacing curriculum resume; closed is history, not a score.

**Commit:** `feat(practice): prove leave-return-review lifecycle`

## Task 10: Implement history and visible provenance

**Files:**

- Create: `server/data/history-repository.ts`, `server/services/history-service.ts`
- Create: `components/history/HistoryTimeline.tsx`, `HistoryRecord.tsx`, `ProvenancePanel.tsx`
- Create: `app/(app)/history/page.tsx`
- Create: `tests/unit/history/provenance.test.tsx`, `tests/integration/history-query.test.ts`, `tests/e2e/history.spec.ts`

**Red:** Tests require exact original wording, separate structured records, separate AI artifacts, origin/model/policy/source metadata for AI, stable chronological grouping, and no reconstructed transcript.

**Green:** Query an owned, typed history projection and render explicit labels: User wording, Structured by you, AI suggestion, User-confirmed AI. Keep curriculum progress out of formation evidence.

**Verify:** User text round-trips byte-for-byte except documented newline normalization; no AI-origin value appears with a user-authored label.

**Commit:** `feat(history): display formation records with provenance`

## Task 11: Implement selected-prior-entry permission, use, and revocation

**Files:**

- Create: `server/data/ai-context-grant-repository.ts`, `server/services/ai-context-grant-service.ts`
- Create: `components/ai/PriorEntryPermission.tsx`
- Create: `components/ai/PracticeReviewReflect.tsx`
- Extend: `app/(app)/practices/[practiceId]/page.tsx`
- Extend: `server/ai/context-builder.ts`, `server/services/ai-reflect-service.ts`
- Create: `tests/integration/ai-permissions.test.ts`, `tests/e2e/selected-context.spec.ts`

The second Reflect entry point is an optional panel on the practice review page after `review_text` exists. It reuses the authored interaction contract `awaken.pay-attention.reflect` as an AI capability reference but does not advance or rewind curriculum state. Its current source is the owned practice-return review entry; its only selectable prior source in the acceptance fixture is the original Awaken observation.

**Red:** Tests assert no grant means no prior block/no provider call when prior ID requested; cross-user, revoked, deleted, or stale grant produces neutral unavailable; active owned grant adds exactly one labeled prior block. Barrier-controlled races implement the schema blueprint: revocation committed before dispatch authorization blocks the call; an already-authorized/dispatched call is not falsely claimed to be recalled; the next call is blocked.

**Green:** Grant and revoke relational permission; immediately before context materialization use the documented short dispatch-authorization transaction to resolve actor, sources, grant status/revision, and ownership. Never hold a database lock across the provider call. A saved suggestion remains `ai_suggested/suggested`; only a separate “accept as mine” action (not used by the slice) may become `user_confirmed_ai/confirmed`, retaining AI origin.

**Verify:** Browser cannot submit trusted prior text; caches cannot bypass revocation; every artifact records source IDs/roles, grant IDs/revisions, curriculum version, global/stage/mode policy versions, model ID, and output-schema version, including idempotent replay. Future authorizations exclude revoked context while an already-dispatched request is described honestly.

**Commit:** `feat(ai): enforce entry-specific prior-context permission`

## Task 12: Implement journal deletion and dependent cleanup

**Files:**

- Create: `server/services/journal-deletion-service.ts`
- Create: `app/api/journal/[entryId]/route.ts`
- Create: `components/history/DeleteJournalEntry.tsx`
- Extend: `tests/integration/deletion-dependency.test.ts`, `tests/e2e/deletion.spec.ts`

**Red:** Seed an entry with grant, structured dependent, multi-source AI artifact, source rows, and links plus unrelated curriculum progress. Deletion must remove/invalidate every defined dependent, write a content-free count audit, and preserve unrelated progress/practice/history. Unauthorized deletion must reveal nothing and change nothing.

**Green:** Call the approved security-definer transaction through an authenticated service. Require explicit UI confirmation. Do not issue piecemeal browser deletes.

**Verify:** Query every dependency table after deletion; assert source text absent; active permissions gone; future AI use denied; curriculum state unchanged.

**Commit:** `feat(privacy): delete journal sources and dependent AI artifacts`

## Task 13: Integrate the exact vertical slice

**Files:**

- Extend: `app/(app)/dashboard/page.tsx`, affected route components and services only
- Create: `tests/e2e/vertical-slice.spec.ts`, `tests/e2e/user-isolation.spec.ts`
- Create: `tests/fixtures/users.ts`, `tests/fixtures/vertical-slice.ts`

**Red:** Encode the 24 acceptance steps as one serial browser flow plus an independent User B isolation flow. Require data checks after sign-out/return, permission use, revocation, and deletion.

**Green:** Add only the navigation and orchestration needed to connect already-green packages. No new domain behavior belongs in route components.

**Verify:** Run from clean database twice; use deterministic AI fake for acceptance and a separately gated live-contract smoke test with synthetic non-sensitive text.

**Commit:** `test(e2e): prove the RTS vertical slice`

## Task 14: Accessibility, responsive, and visual-authority gate

**Files:**

- Create: `tests/e2e/accessibility.spec.ts`, `tests/e2e/responsive.spec.ts`, `tests/e2e/navigation.spec.ts`
- Create: `docs/qa/phase-1-acceptance-evidence.md`
- Update: design components/styles only for test-proven defects

**Red:** Automated checks cover landmarks, heading order, labels, described errors, keyboard-only operation, focus, contrast where machine-testable, reduced motion, horizontal overflow, overlapping controls, missing assets, and broken navigation at 375/768/1536.

**Green:** Correct only evidenced defects within approved design tokens/components. Establish visual baselines only after Task 0 passes and human comparison confirms the Overview authority.

**Verify:** `npm run test:all`; inspect screenshots at all viewports; test keyboard flow manually; record exceptions and evidence.

**Commit:** `test(qa): verify accessible responsive vertical slice`

## Task 15: Engineering-lead integration and completion review

**Files:**

- Update: `docs/project-control/current-project-status.md`, `decision-change-log.md`, `risk-issue-log.md`, `backlog.md`
- Update: `docs/qa/phase-1-acceptance-evidence.md`

The engineering lead reviews every commit/diff, reruns migrations from empty, full unit/DB/E2E/a11y suites, and inspects the application at all viewports. Run a security review of policies/functions and an AI regression review independent of implementers. Verify `git diff` contains no unrelated Overview/public-site edits and no mission-creep feature.

Do not report complete until every mandatory row in `docs/qa/phase-1-test-matrix.md` is green and every item in `docs/project-control/vertical-slice-definition-of-done.md` is evidenced. Deployment remains separately gated by verified OpenAI retention configuration.

**Commit:** `docs: record Phase 1 vertical-slice acceptance evidence`

## Cross-package integration rules

- Only the database/security owner authors migrations. Other packages request schema changes through the engineering lead.
- Only the curriculum owner changes authored seed content, and only within the approved inventory.
- Only the AI package imports the OpenAI SDK; UI and domain layers depend on a typed orchestration interface.
- Route components never query private tables directly.
- Cross-package file changes require the current owner and engineering lead to agree before editing.
- Each handoff includes commit SHA, changed files, commands with results, migration/RLS impact, remaining risks, and explicit confirmation of prohibited-scope compliance.
- Failed tests or unresolved security/authority questions block downstream work; they are not converted into backlog items to bypass a gate.

## Plan completion checkpoint

This document authorizes no coding by itself. Coding may begin only after the product owner approves this plan, its work packages, test matrix, minimal seed, preview-manifest resolution, and definition of done.
