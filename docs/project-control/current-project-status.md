# Current Project Status

- Current phase: Phase 1 — Technical Architecture & Vertical Slice
- Current milestone: Task 1 certified; Task 2 domain contracts and minimal seed implemented for review
- Git branch: `prototype/phase-1-vertical-slice`
- Full curriculum implementation: Not authorized
- Application/curriculum coding: Domain contracts and the exact minimal seed only; Task 3 remains unauthorized

## Completed

- Read all seven controlling specifications and inspected the current Overview authority source.
- Approved the Overview-derived design baseline and ADR-001 architecture decisions.
- Established the detailed dependency-ordered TDD plan.
- Defined ten bounded specialist work packages with file ownership, dependencies, acceptance criteria, tests, prohibited scope, and lead handoff requirements.
- Defined the mandatory automated test matrix, exact minimal seed curriculum, and pre-implementation definition of done.
- Root-caused `shared-assets.json`: it never existed in accessible source history, was intended as a local shared-asset mapping, and is obsolete because every current Overview source asset reference is present under `src/assets`.
- Formally isolated visual baselines until test-first preview repair passes; no Overview design source was changed.
- Existing source contract suite remains 15/15 passing.
- Task 0 completed test-first: the Overview preview is self-contained, all referenced authority assets resolve, and GET/HEAD/method/traversal behavior passes without changing `src`.
- Task 1 installed deterministic unit, integration, pgTAP/Supabase, Playwright, accessibility, viewport, fake-AI, concurrency, and environment-safety foundations without feature or application-schema work.
- Task 1 certification hardening now rejects arbitrary reused preview servers, bounds concurrency barriers with actionable timeouts, verifies simultaneous actor contexts, adds a rollback-only authenticated A/B RLS probe, and captures successful non-baseline browser evidence when Chromium is available.
- Task 1 runtime certification passed on a Docker-capable GitHub-hosted runner, including local Supabase, RLS, 20 concurrency repetitions, Chromium, accessibility, and all three required viewports.
- Task 2 defines framework-independent domain contracts, the canonical interaction and lifecycle taxonomies, provenance/permission/dependency boundaries, and the exact 16-node vertical-slice seed with runtime validation.

## Approved architecture retained

- Next.js / React / TypeScript; PostgreSQL; Supabase Auth/RLS; server-side OpenAI.
- Authored curriculum, exact user wording, structured formation data, AI artifacts, curriculum progress, and formation evidence stay separate.
- No full AI transcript persistence; relational permissions/dependencies; hard dependent-artifact deletion; same-owner composite relationships.
- Server-verified active grant before prior context; untrusted journal-input boundary; concurrency-safe practice transitions; `store:false`.
- Approved journey is Awaken → See Clearly → Become → Join only.

## Current blockers and gates

- Task 3 remains unauthorized until the Task 2 checkpoint is reviewed.
- Deployment/user testing remains blocked on verified OpenAI organization/project retention configuration and disclosure.

## Next controlled step

Review the Task 2 contracts and exact seed checkpoint. Do not begin Task 3 without explicit authorization.
