# Phase 1 Bounded Agent Work Packages

All packages operate on `prototype/phase-1-vertical-slice`. Agents may not change product scope, architecture, curriculum structure, or design direction. Every package uses red-green-refactor and returns evidence to the engineering lead; agent self-report is never final acceptance.

## WP-01 — Database / Schema / Security

- **Purpose:** Implement PostgreSQL entities, invariants, least privilege, RLS, same-owner relationships, lifecycle/deletion functions, and audit constraints.
- **Allowed areas:** `supabase/**`, named repository interfaces requested by the lead, `tests/integration/security/**`, `docs/architecture/phase-1-data-dictionary.md`.
- **Dependencies:** Approved ADR; test harness; domain enums/content IDs.
- **Acceptance:** Clean reset applies all migrations; forced RLS and indexed ownership policies cover every private table; anonymous/A/B matrix passes; composite FKs reject cross-owner relationships; direct lifecycle/deletion bypass is denied.
- **Required tests:** TM-SEC-01–16, TM-LIFE-01–06, TM-DEL-01–09, migration/grant/audit tests.
- **Prohibited:** Service-role use in user paths, UI/auth/AI changes, JSON ownership arrays, new entities/features, curriculum prose.
- **Handoff:** Commit SHAs; ER/data dictionary; migration order; policy/function inventory; full SQL output; rollback/forward notes; unresolved risks. Lead reruns from empty and inspects SQL.

## WP-02 — Authentication

- **Purpose:** Establish verified Supabase sessions and an actor contract that cannot accept caller-supplied identity.
- **Allowed areas:** `server/auth/**`, `middleware.ts`, `app/(auth)/**`, `app/auth/callback/**`, `app/(app)/layout.tsx`, auth-only tests.
- **Dependencies:** Test harness; profiles/RLS; design form primitives may be stubbed by semantic HTML until WP-04 lands.
- **Acceptance:** Sign-up/sign-in/sign-out works; protected routes fail closed; session refresh is correct; User A and B remain isolated; errors do not disclose account/object existence.
- **Required tests:** TM-AUTH-01–05, applicable TM-SEC rows, keyboard/form-label auth tests.
- **Prohibited:** Custom identity store, service-role request client, formation data access, social login, recovery/admin UI outside slice.
- **Handoff:** Actor/session interface; route map; environment variables; test users; command evidence; threat notes. Lead verifies browser/server credential separation.

## WP-03 — Curriculum Engine

- **Purpose:** Validate/render the exact seed, manage authored-program state and resume independently, and create approved cross-stage records.
- **Allowed areas:** `domain/curriculum.ts`, `domain/stages.ts`, `content/phase-1/**`, `components/curriculum/**`, `server/services/{curriculum,observation,see-clearly}-service.ts`, corresponding tests and formation routes.
- **Dependencies:** Contract/seed phase depends on the test harness only; renderer/service phase additionally depends on database/auth and WP-04 primitives.
- **Acceptance:** Generic renderer consumes validated content; only four stages exist; Awaken/See Clearly/Become bridges work; resume is correct and remains separate from evidence.
- **Required tests:** TM-CURR-01–08, TM-LINK-01–04, relevant vertical-slice E2E.
- **Prohibited:** Full curriculum, hard-coded route prose, `Walk`, progress percentages/scores, autonomous routing, schema changes.
- **Handoff:** Node inventory/version hash; validation results; renderer contract; cross-stage link assumptions; tests/SHAs. Lead compares every seed string to the approved seed spec.

## WP-04 — Design System / Frontend Foundation

- **Purpose:** Translate the Overview authority into accessible reusable app primitives and responsive shell.
- **Allowed areas:** `app/styles/**`, `app/layout.tsx`, `components/design-system/**`, `tests/unit/components/**`, `tests/e2e/design-foundation.spec.ts`, and Task 0's three named preview files.
- **Dependencies:** Task 0 preview repair depends on the approved source audit and local authority assets; component phase depends on Task 0 passing and the test harness.
- **Acceptance:** Canonical tokens/components match audit; Tree of Life and four-stage assets load; 44px controls, focus states, labels, error semantics, and three-viewpoint shell pass.
- **Required tests:** TM-A11Y-01–09, TM-RESP-01–08, preview route/asset tests.
- **Prohibited:** Changing Overview source/authority, importing old shell, generic LMS/dashboard/chat UI, new brand assets, page-specific curriculum logic.
- **Handoff:** Component/token inventory; before/after screenshots at 375/768/1536; automated output; known visual variances. Lead performs visual comparison.

## WP-05 — AI Orchestration

- **Purpose:** Provide server-only, minimum-context Explain/Reflect/Guide Me/Route contracts, implementing Reflect in the slice with permission enforcement and safe failure behavior.
- **Allowed areas:** `server/ai/**`, `server/services/ai-*.ts`, `app/api/ai/**`, `components/ai/**`, AI tests/fixtures.
- **Dependencies:** Auth actor; owned repositories; curriculum schemas/IDs; AI grant/artifact tables; design primitives.
- **Acceptance:** `store:false`; no tools; no history by default; active server-verified selected grant only; untrusted delimiters; strict outputs; no artifact on timeout/refusal/incomplete/invalid output; provenance and idempotency pass.
- **Required tests:** TM-AI-01–24 and prohibited-output/safety/prompt-injection fixture set.
- **Prohibited:** Client SDK calls, full transcript storage, opaque provider memory, diagnosis/divine claims/calling/scores, unsanctioned context, automatic curriculum changes.
- **Handoff:** Typed orchestration interface; policy/schema versions; captured redacted request shapes; model adapter fake; regression results; retention-deployment risk. Lead reviews actual prompt/context boundaries.

## WP-06 — Practice Lifecycle

- **Purpose:** Implement Become inputs and the concurrency-safe open/leave/return/review/close lifecycle.
- **Allowed areas:** `domain/practice.ts`, `server/data/practice-repository.ts`, `server/services/practice-service.ts`, `components/practice/**`, practice route/tests; migration changes only through WP-01.
- **Dependencies:** Database transition function; auth; curriculum bridge; design primitives.
- **Acceptance:** Allowed edges work; invalid/stale/concurrent transitions fail atomically; return creation and ready-to-review transition are one transaction; dashboard surfaces unfinished practice after reauthentication.
- **Required tests:** TM-LIFE-01–08, TM-CONC-01–04, relevant E2E.
- **Prohibited:** Direct state update, reopen/duplicate UI, reminders, streaks, scoring, notifications, schema edits.
- **Handoff:** State diagram/transition table; repository/service API; conflict UX evidence; concurrency output; SHAs. Lead reruns race test repeatedly.

## WP-07 — History / Provenance

- **Purpose:** Show exact wording, structured records, AI-derived artifacts, and links without collapsing their provenance.
- **Allowed areas:** `server/data/history-repository.ts`, `server/services/history-service.ts`, `components/history/**`, history page/tests.
- **Dependencies:** Persisted Awaken/See Clearly/Become/practice data; provenance types; AI artifacts; design primitives.
- **Acceptance:** Original wording remains intact; labels are unambiguous; AI metadata/source relationships are visible; curriculum progress is not presented as formation evidence; no transcript reconstruction.
- **Required tests:** TM-PROV-01–08, query isolation, history accessibility/E2E.
- **Prohibited:** Pattern analytics, scores, inferred conclusions, editing source data through projections, mentor views.
- **Handoff:** Projection contract; sample owned output; provenance mapping table; screenshot/test evidence; SHAs. Lead verifies database values against rendered text.

## WP-08 — Deletion / Dependency Behavior

- **Purpose:** Expose the approved authenticated source-entry deletion transaction and prove dependent cleanup with progress preservation.
- **Allowed areas:** `server/services/journal-deletion-service.ts`, journal deletion route/control, deletion tests; function changes only through WP-01.
- **Dependencies:** Final dependency schema/function; auth; history; grants/artifacts/links; curriculum state.
- **Acceptance:** Owned deletion removes source, grants, dependent AI artifacts and relationship rows per rule; no source body remains; content-free audit counts remain; unrelated curriculum state/data survives; unauthorized attempts are neutral and atomic.
- **Required tests:** TM-DEL-01–08, future-AI-access denial, history refresh E2E.
- **Prohibited:** Account-wide deletion/export, soft-delete reinterpretation, piecemeal browser deletes, provider-deletion claims, schema edits.
- **Handoff:** Before/after table census; function/service evidence; audit sample without text; preservation assertions; SHAs. Lead independently queries every dependency.

## WP-09 — Integration Testing

- **Purpose:** Own deterministic harnesses and encode the exact approved end-to-end flow across real local auth/database boundaries.
- **Allowed areas:** root test configs, `tests/setup/**`, `tests/helpers/**`, `tests/fixtures/**`, `tests/e2e/vertical-slice.spec.ts`, `tests/e2e/user-isolation.spec.ts`, and QA evidence. Package-specific integration tests remain with their package owner; production fixes return to that owner.
- **Dependencies:** Harness phase depends on Task 0/environment prerequisites. Integrated-acceptance phase depends on all functional packages being green, resettable local Supabase, and the deterministic OpenAI fake.
- **Acceptance:** Exact 24 steps pass twice from clean state; User B isolation passes; no real sensitive OpenAI data; failures produce trace/screenshot without journal bodies.
- **Required tests:** Every mandatory matrix row, especially TM-E2E-01–04.
- **Prohibited:** Weakening assertions, production feature implementation, masking flakes with retries, live-provider calls in main suite, new scope.
- **Handoff:** Versioned fixtures; full commands/output; traces with redaction confirmation; flake count; failures routed to owners. Lead reruns the suite.

## WP-10 — Accessibility / Responsive QA

- **Purpose:** Independently validate accessibility, Overview fidelity, navigation, assets, and layout at 375/768/1536.
- **Allowed areas:** QA tests/evidence. Production fixes are filed and returned to WP-04 or owning feature package.
- **Dependencies:** Restored Overview preview; integrated slice; stable test data.
- **Acceptance:** No critical/serious automated a11y violations; complete keyboard path; visible focus; proper labels/headings/errors; no overflow/overlap/missing assets/broken navigation at required widths; human visual comparison recorded.
- **Required tests:** TM-A11Y-01–09, TM-RESP-01–08, navigation/asset suite.
- **Prohibited:** Rebranding, snapshot re-baselining without lead approval, content changes, unrequested animations/components/features.
- **Handoff:** Findings by severity with reproduction; screenshots; automated results; baseline provenance; zero unresolved blocker/critical defects. Lead personally checks all three viewports.

## Assignment and merge discipline

| Sequence | Assigned specialist | Work package | May begin when |
| --- | --- | --- | --- |
| 0 | Design-system agent | WP-04 Task 0 only | Plan approved |
| 1 | Integration-testing agent | WP-09 harness foundation | Task 0 preview repair and tests are green |
| 2 | Curriculum-engine agent | WP-03 contracts/seed only | Harness green |
| 3 | Data/security agent | WP-01 | Contracts/IDs frozen |
| 4 | Authentication agent | WP-02 | Core RLS/profile migration green |
| 5 | Design-system/frontend agent | WP-04 remainder | Preview and harness green |
| 6 | Curriculum-engine agent | WP-03 implementation | Auth/database/UI primitives green |
| 7 | AI-integration agent | WP-05 current-entry Reflect | Owned repositories/content context green |
| 8 | Curriculum + data owners | See Clearly link integration | AI current-entry flow green |
| 9 | Practice-lifecycle agent | WP-06 | Become bridge and transition function green |
| 10 | History/provenance agent | WP-07 | Formation/practice/artifact data green |
| 11 | AI-integration agent | WP-05 selected prior context | Grants/history green |
| 12 | Deletion owner + data/security reviewer | WP-08 | Dependency graph final and tested |
| 13 | Integration and QA agents | WP-09, WP-10 | All package suites green |

Parallel work is allowed only where the dependency map permits and file ownership does not overlap. The engineering lead integrates and decides every cross-package change.
