# ADR-001: Phase 1 Prototype Stack and Boundaries

- Status: Proposed for approval
- Date: 2026-09-20
- Phase: Phase 1 — Technical Architecture & Vertical Slice
- Decision owners: RTS product owner and engineering lead
- Scope: One controlled end-to-end vertical slice only

## Context

The Phase 1 prototype must prove the hardest shared RTS behavior before broader curriculum programming: authenticated user isolation; structured curriculum rendering; separate user wording, formation data, AI-derived data, curriculum progress, and formation evidence; an open practice that survives leaving and returning; explicitly selected prior-entry AI context; dependent-artifact deletion; and an Overview-consistent responsive experience.

The prototype must not become a generic LMS, generic chat product, or a miniature build of the full curriculum. The approved journey remains Awaken → See Clearly → Become → Join. Walk is not a primary stage.

## Decision

Use a full-stack TypeScript web application with these boundaries:

| Layer | Decision |
| --- | --- |
| Web | Next.js App Router, React, TypeScript |
| Styling | CSS custom properties and small reusable React components derived from the Overview audit; no generic UI kit |
| Curriculum | Versioned structured TypeScript/JSON content validated at build/test time; no curriculum prose embedded in route components |
| Database | PostgreSQL through Supabase for the prototype |
| Authentication | Supabase Auth with secure server-side session handling |
| Authorization | PostgreSQL Row Level Security on every private user table plus server-side ownership checks |
| Domain/API | Framework-independent TypeScript domain rules and authenticated service functions behind route handlers/server actions |
| AI | OpenAI Responses API from server-only code; `store: false`; app-assembled minimum context; Structured Outputs for machine-consumed suggestions |
| Testing | Unit and contract tests, local Supabase integration tests, Playwright end-to-end/accessibility/viewport tests |
| Deployment | Deferred until the slice runs locally and Cloudflare compatibility is tested; domain logic must not depend on a hosting vendor |

## Why this option

This is the smallest stack that proves the required privacy, relational integrity, lifecycle, and server-side AI boundary without writing custom authentication infrastructure. It preserves PostgreSQL portability and gives a future native client a stable domain/API boundary. Supabase accelerates the prototype but is treated as an infrastructure adapter, not the domain model.

## Alternatives considered

### 1. Next.js + Supabase PostgreSQL/Auth/RLS — selected

Advantages: fastest path to authenticated PostgreSQL, explicit RLS, local migrations, and a realistic two-user isolation test. Risks: careless use of service-role credentials can bypass RLS; SSR session handling must be implemented exactly; Supabase-specific client calls can leak into UI code unless adapters are enforced.

### 2. Next.js + PostgreSQL + custom session/auth library

Advantages: less platform coupling and complete control. Disadvantages: adds security-sensitive session, verification, recovery, and user-lifecycle work that does not test the RTS formation engine. Reconsider only if Supabase cannot meet the deployment or authorization tests.

### 3. Separate API service plus SPA

Advantages: strongest early separation for future mobile clients. Disadvantages: doubles prototype deployment and integration surface before the domain is validated. The selected architecture preserves the same service boundary inside one repository and can extract it later without requiring two services now.

## Repository boundaries

```text
app/                         routes, layouts, server entry points
components/design-system/    Overview-derived primitives
components/curriculum/       generic interaction renderers
content/                     versioned authored curriculum data
domain/                      framework-independent types, schemas, state machines
server/auth/                 authenticated actor/session helpers
server/data/                 RLS-aware repositories
server/ai/                   policies, context assembly, OpenAI adapter, output schemas
server/services/             application use cases and transactions
supabase/migrations/         schema, constraints, functions, triggers, RLS
supabase/seed.sql             curriculum fixture and two-user test fixtures only
tests/unit/                  domain, curriculum, AI policy/context tests
tests/integration/           database, RLS, lifecycle, deletion tests
tests/e2e/                   complete vertical slice and viewport/accessibility checks
docs/                        ADRs, design audit, data dictionary, control logs, QA evidence
```

Route components may select a session and render interactions. They may not own canonical curriculum wording or query private tables directly. All private writes pass through application services, and database policies remain effective even if a server-side ownership check is missed.

## Authorization model

1. Every private row carries `user_id uuid not null` unless ownership is reached through a parent with a non-bypassable foreign key.
2. RLS is enabled and forced on private tables. Policies apply to the `authenticated` role and use both `using` and `with check` as appropriate.
3. Policy ownership predicates use `(select auth.uid()) = user_id`; `user_id` and all foreign-key/policy columns are indexed.
4. The browser uses only the publishable/anon client key and the authenticated user's JWT. The service-role key is prohibited from user request paths.
5. Server services resolve the authenticated actor and include explicit ownership predicates. RLS is the second enforcement layer, not the only layer.
6. Cross-user object IDs must resolve to no row or a neutral not-found result. They must not reveal whether another user's record exists.
7. Parent and child tables carry `user_id`. Each owned parent exposes `unique (id, user_id)`, and every owned child uses a composite foreign key `(parent_id, user_id)` so a valid User A row cannot reference a User B parent.
8. The Phase 1 `formation_links` table uses explicit nullable typed foreign keys rather than unconstrained polymorphic IDs. A check constraint requires one source and one target, and composite foreign keys require both ends to share `user_id`.
9. Authorization integration tests run anonymous, User A, and User B read/write/update/delete tests for profiles, curriculum state, journals, formation records, practices, returns, links, AI thread metadata, AI artifacts, artifact sources, context grants, audit functions, and deletion functions.

## Data model confirmation and refinements

The Phase 1 entities are retained, with two normalization changes: AI source dependencies and AI context grants use relational rows rather than JSON ID arrays. This makes authorization, revocation, and deletion testable with foreign keys.

| Table | Key responsibility |
| --- | --- |
| `profiles` | Minimal optional profile mapped 1:1 to the authenticated user |
| `curriculum_versions` | Immutable authored-content release identity |
| `curriculum_nodes` | Stage → module → session → interaction tree and validated content payload |
| `user_curriculum_state` | Authored-program state and resume pointer only |
| `journal_entries` | Exact user-authored wording |
| `formation_records` | Typed structured observations with explicit provenance |
| `practices` | Practice state machine and plan |
| `practice_returns` | What happened when the user returned |
| `formation_links` | Cross-stage lineage through explicit same-owner typed foreign keys |
| `ai_threads` | Content-free interaction metadata; not opaque provider memory |
| `ai_artifacts` | AI-derived summary/tag/route suggestion with visible provenance and status |
| `ai_artifact_sources` | Normalized dependency from artifact to selected source entry |
| `ai_context_grants` | Entry-specific permission for future AI use, with grant/revoke timestamps |
| `audit_events` | Server-written allowlisted event fields; never journal bodies, prompts, or responses |

Full AI transcripts and `ai_messages` are not persisted in the vertical slice. If a user explicitly saves an AI-derived suggestion, it is stored as an `ai_artifact` with normalized source dependencies. If the user writes and saves a new personal insight after reflection, the exact text is a `journal_entry` with a visible link to the originating AI artifact; it is not relabeled as an AI transcript.

### Provenance values

- `user_authored`: exact user wording or user-created structured record.
- `ai_suggested`: machine output not accepted as user truth.
- `user_confirmed_ai`: AI suggestion explicitly edited or accepted by the user; still retains AI origin metadata.

The UI must never render `ai_suggested` as if it were `user_authored`.

### Deletion dependency rule

Deleting a journal entry is a hard deletion from RTS application storage inside one database transaction. It does not claim deletion from provider safety/retention systems; those boundaries must be disclosed and verified before deployed testing.

1. Delete every AI artifact listed in `ai_artifact_sources` for that source entry, even if the artifact had multiple sources. The prototype chooses privacy and determinism over preserving a partial summary.
2. Cascade-delete the artifact's source rows, entry-specific AI context grants, and structured formation records whose only source is that entry. No AI transcript table exists in Phase 1.
3. Delete or unlink cross-stage lineage involving the entry; do not copy the deleted body into another table.
4. Delete the journal entry.
5. Retain curriculum progress and resume state because authored-program progress is independent.
6. Write only a content-free audit event containing actor ID, deleted object type, deleted object ID, dependent object counts, and timestamp.

The deletion service calls one security-definer database function with an authenticated actor check. That function performs the dependency deletion transaction. Direct table deletes are not granted to browser roles. Tests invoke both the application service and the database function and prove no dependent content remains.

## Lifecycle state confirmation

State transitions are domain-validated and database-constrained.

- Curriculum: `not_started → in_progress → completed`.
- Practice: `draft → open → waiting_for_real_life → ready_to_review → reviewed → closed`.
- AI artifact: `suggested → confirmed` or `suggested|confirmed → invalidated|deleted`.
- AI context grant: `active → revoked`; a revoked row is retained without source text so future calls can prove access is denied.

The vertical slice creates a practice in `waiting_for_real_life`, returns it to `ready_to_review`, records a return, then moves it through `reviewed` to `closed`. A database transition function locks the row, checks the expected current state and `lock_version`, validates the requested transition, updates timestamps, and increments the version. `practice_returns` may be inserted only by the same transaction that moves an owned practice to `ready_to_review`. Direct state updates are not granted to browser roles. Invalid and concurrent transitions fail in domain and integration tests.

Reopening or duplicating a closed practice is part of the canonical future lifecycle but is intentionally deferred from the Phase 1 UI and service contract. The initial schema must not treat `closed` as an irreversible theological or historical judgment.

## AI architecture

### Request assembly

Each request is assembled server-side from four labeled blocks:

1. Global RTS authority, safety, privacy, and provenance policy.
2. One stage policy and one mode policy: Explain, Reflect, Guide Me, or Route.
3. Current authored curriculum excerpt and session metadata.
4. Current user entry plus zero or more selected prior entries whose active grants are verified at request time.

The default prior-entry set is empty. The client cannot send arbitrary prior-entry text as trusted context; it sends IDs, and the server re-resolves active grants and ownership immediately before the API call. Revocation therefore blocks future inclusion without relying on cached client state.

All journal content is wrapped as untrusted user data with explicit delimiters and source labels. Global policy always has higher precedence than user text. Journal instructions that ask the model to reveal other data, change mode, ignore safety/privacy policy, invoke tools, or broaden context are treated as content, not instructions. Phase 1 AI requests have no tools and no network/data access beyond the context assembled by the server.

### Mode contracts

| Mode | Allowed context and output contract |
| --- | --- |
| Explain | Approved RTS excerpt, session metadata, direct question. Clarifies teaching or Scripture and does not reinterpret the user's life unless directly asked. |
| Reflect | Current entry and optionally granted prior entries. Asks 1–3 precise questions, stays close to user wording, and does not declare causes or conclusions. |
| Guide Me | Current situation and approved stage workflow. Walks one approved step at a time, preserves agency, and pauses high-stakes action planning when professional or emergency help is indicated. |
| Route | Current surfaced issue plus four-stage definitions. Returns one or more reasoned suggestions; the user chooses and no curriculum state changes automatically. |

Stage rules may narrow a mode but may never relax the global safety, privacy, or provenance policy.

### Retention and storage

- OpenAI calls use `store: false`.
- The app does not use opaque provider conversation memory for user history.
- Full AI transcripts are ephemeral by default.
- The user may explicitly save an added insight; saved wording and any AI provenance remain separate and follow the relational dependency rule above.
- The actual OpenAI organization/project retention configuration, abuse-monitoring window, user disclosure, and operational deletion boundary must be recorded before a deployed user test. Eligibility for Zero Data Retention is not assumed.
- SDK debug logging, tracing, error capture, analytics, and request dumps must redact or omit prompts, journal bodies, and model responses. Normal observability records IDs, mode, stage, duration, token counts, outcome class, and policy/schema versions only.
- An idempotency key scoped to user + interaction intent prevents a retry from creating duplicate threads or artifacts. A failed/refused/invalid response creates no artifact.

### Outputs and safeguards

Conversational reflection remains text. Machine-consumed tags or route suggestions use a strict, server-validated, versioned schema and are stored only as `ai_suggested`. Allowed tags and routes are validated against the active curriculum version. No partial, fallback-parsed, extra-field, or invalid output is persisted. Each artifact records content-free provenance: source IDs, grant IDs/revisions used, curriculum version, stage policy version, mode policy version, model identifier, and output-schema version.

A mode-independent safety decision layer handles imminent danger, abuse, self-harm, medical, legal, financial, mental-health, and emergency content. It does not diagnose. When immediate danger is reasonably indicated, it stops spiritual action planning, encourages appropriate local emergency/professional support, and preserves user agency. When locale is unknown, it does not invent a local number. Safety events record only an allowlisted outcome code and no journal text.

Regression fixtures cover divine-direction claims, diagnosis/hidden-trauma inference, hidden-motive certainty, calling assignment, spiritual scoring, forced reconciliation, unsafe passivity, high-stakes/crisis routing, and prompt-injection attempts. Integration tests assert that no provider call occurs for unauthorized, cross-user, revoked, or deleted source IDs; captured requests contain only allowlisted labeled blocks; and timeout, refusal, invalid output, and retry paths produce no duplicate or unlabeled artifact. Authored curriculum and manual saving continue to work without AI.

## Vertical-slice implementation boundary

The slice contains only:

1. Sign-up/sign-in/sign-out.
2. Dashboard current stage, resume state, and unfinished practice.
3. Awaken — Pay Attention observation: event, internal response, body cue.
4. Optional AI Reflect and explicit save of added insight.
5. See Clearly bridge: observable fact, interpretation, one belief or expectation.
6. Become bridge: control target, present truth, next right step.
7. Open practice, leave/return, outcome, review, close.
8. Formation History with exact user wording, structured records, and clearly labeled AI-derived data.
9. Selected-prior-entry AI grant, demonstrated use, revocation, and no-access-after-revocation test.
10. Source-entry deletion and dependent-artifact deletion while curriculum progress remains.

Everything else remains in the backlog.

## Consequences

- A complete slice requires a local Supabase test environment and two-user fixtures; mocked authorization is insufficient.
- The first migration must include composite ownership foreign keys, indexes, constraints, transition/deletion functions, grants, and RLS policies, not merely tables.
- The app has an API-ready internal service boundary, but no separate public mobile API is built in Phase 1.
- The Overview design system is extracted into reusable tokens, but the Overview public site is not modified.
- Stack lock is provisional until the integrated acceptance tests pass.
- Domain types and ordinary PostgreSQL relationships are portable. Supabase session roles, `auth.uid()`, and related RLS migrations are adapter-specific and require replacement if the infrastructure changes.
- Account-wide export and deletion remain required future privacy work but are explicitly deferred; the Phase 1 slice proves item-level source deletion only.

`audit_events` is append-only through narrowly scoped security-definer functions. Browser roles cannot insert, update, or delete arbitrary audit rows and cannot supply free-form `metadata_json`. Event schemas use typed columns plus an allowlisted small metadata object validated in the function. Tests prove private text is absent, users cannot tamper with audit records, and audit visibility does not expose another user's object metadata.

## Exit conditions for accepting this ADR

- The Overview audit is approved as the prototype design authority.
- The normalized AI dependency/grant refinement is accepted.
- Supabase local RLS tests prove User A cannot access User B.
- OpenAI retention settings for the actual project are documented before deployed user testing.
- The complete slice passes 375px, 768px, and 1536px visual/accessibility tests.

## Current technical validation sources

- [Next.js documentation](https://nextjs.org/docs) — App Router, Server Actions, and Route Handlers.
- [Supabase server-side Next.js auth](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs) — cookie-based browser/server clients.
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — authenticated policies, `using`, `with check`, `auth.uid()`, and policy indexes.
- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) — schema-constrained machine-consumed outputs and required error handling.
- [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data) — training defaults, Responses API retention behavior, `store:false`, and eligibility-dependent retention controls.
