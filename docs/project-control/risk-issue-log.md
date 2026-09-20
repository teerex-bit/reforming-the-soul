# Risk / Issue Log

| ID | Risk / issue | Impact | Mitigation / next action | Status |
| --- | --- | --- | --- | --- |
| R-001 | Sensitive spiritual journal content is exposed across users. | Critical privacy failure. | Force RLS, prohibit service role in user paths, run two-user matrix for every private table. | Open; Phase 1 gate |
| R-002 | AI receives prior history without active permission. | Breaks user agency and privacy promise. | Server resolves entry-specific active grant immediately before each call; test no-grant and revoked-grant paths. | Open; Phase 1 gate |
| R-003 | Source deletion leaves derived summary/tag content. | Privacy and trust failure. | Transactional deletion plus database dependency enforcement and integration test. | Open; ADR rule proposed |
| R-004 | Supabase adapter leaks into UI/domain and creates lock-in. | Makes mobile/API evolution harder. | Repository/auth adapters and framework-independent domain types. | Open |
| R-005 | AI output is mistaken for the user's belief or God's direction. | Spiritual and safety harm. | Structural provenance, visual labels, save confirmation, policy regression tests. | Open; Phase 1 gate |
| R-006 | Overview styles are copied page-by-page, including drift and overrides. | Inconsistent generic application UI. | Freeze canonical tokens/components from audit; visual QA against Overview. | Mitigated by audit; pending approval |
| R-007 | Overview preview is not reproducible because `shared-assets.json` is missing. | Visual baseline and regression evidence cannot be trusted. | Repair preview input or replace with a documented public-build visual harness before implementation QA. | Open |
| R-008 | Current OpenAI retention configuration is assumed rather than verified. | Privacy statement may be inaccurate. | Record actual organization/project setting before deployed user test; send `store:false` regardless. | Open; deployment gate |
| R-009 | Static JSON payloads become unvalidated schema escape hatches. | Data inconsistency and fragile future clients. | Runtime schemas, database checks for domain/lifecycle enums, service validation, migration tests. | Open |
| R-010 | Scope expands into full curriculum or ancillary RTS products. | Delays proof of core engine. | Enforce backlog and acceptance traceability; no ticket without slice requirement. | Controlled |
| R-011 | Child rows or cross-stage links reference another user's parent despite row-level ownership. | Cross-user metadata leak or lineage corruption. | Composite `(id,user_id)` foreign keys and explicit typed link columns; anonymous/A/B tests. | Mitigated in proposed ADR |
| R-012 | Saved AI transcript retains derived private content after source deletion. | Deletion promise fails. | Do not persist transcripts in Phase 1; store only explicit artifacts with normalized sources. | Mitigated in proposed ADR |
| R-013 | Concurrent or direct updates bypass practice lifecycle. | Resume and return workflow becomes inconsistent. | Locked versioned transition function; direct state updates denied. | Mitigated in proposed ADR |
| R-014 | Journal text attempts to override AI policy or broaden data access. | Safety/privacy boundary bypass. | Treat journal as delimited untrusted data; no model tools; injection regression fixtures. | Mitigated in proposed ADR |
