# Phase 1 Data Dictionary

This dictionary describes the minimum vertical-slice schema implemented by migrations `202609200001` through `202609210001`. The Task 2 contracts and `phase-1-schema-blueprint.md` remain authoritative.

## Authored curriculum

| Table | Purpose | Ownership and writes |
| --- | --- | --- |
| `curriculum_versions` | Immutable curriculum release identity and authorized content fingerprint. | Authenticated read-only. |
| `curriculum_nodes` | Stable stage/module/session/interaction/bridge nodes with validated authored JSON content. | Authenticated read-only; composite self-FK preserves the authored tree. |

The only seeded release is `phase-1-v1`, fingerprint `aeed790c`, containing the sixteen authorized Task 2 nodes. `stage_id` contains only `awaken`, `see-clearly`, `become`, and `join`.

## User-owned data

| Table | Purpose | Primary relational protections |
| --- | --- | --- |
| `profiles` | Minimal optional 1:1 authenticated-user profile record. | Unique `user_id`; owner RLS. |
| `user_curriculum_state` | Resume pointer and authored-program completion state only. | Unique user/version; composite current-node FK; completed-node trigger rejects missing or cross-version IDs; no formation evidence or score. |
| `journal_entries` | Canonical exact user wording. | Composite authored-node FK; owner insert/read; no direct update/delete. |
| `formation_records` | User-confirmed structured formation values. | Same-owner journal FK; provenance excludes unconfirmed AI suggestions. |
| `practices` | Practice relationships, lifecycle timestamps, and optimistic `lock_version`. | Same-owner journal FKs; lifecycle changes only through privileged functions. |
| `practice_returns` | Outcome/review entry identities for one practice return. | Same-owner practice/journal FKs; no browser writes. |
| `formation_links` | Typed cross-stage lineage without copied wording. | Exactly one typed source and target; all endpoints are same-owner composite FKs. |
| `ai_threads` | Content-free AI request metadata and policy/model versions. | No prompt, response, transcript, or provider conversation identifier. |
| `ai_artifacts` | Explicitly saved AI-derived artifact with visible provenance. | Same-owner thread FK; status/provenance pair is constrained. |
| `ai_context_grants` | Entry-specific selected-prior permission and revision history. | Same-owner journal FK; one active grant per entry/scope; grant/revoke functions only. |
| `ai_artifact_sources` | Normalized artifact-to-journal dependencies and authorization snapshot. | Same-owner artifact/journal FKs; selected-prior source must cite a grant for that same entry. |
| `audit_events` | Content-free allowlisted deletion event and dependent counts. | Owner-read-only; only privileged functions may write. |

Every user-owned table has `user_id`, `unique(id,user_id)`, an ownership index, enabled and forced RLS, and a trigger that rejects ownership reassignment. Browser privileges are allowlisted. Anonymous roles have no table access.

## Privileged functions

| Function | Contract |
| --- | --- |
| `transition_practice` | Locks an owned practice, checks expected state/version and one allowed edge, stamps the lifecycle transition, and increments `lock_version`. |
| `record_practice_return` | Atomically saves exact outcome wording, creates the one return and typed link, and moves waiting → ready-to-review. |
| `review_practice` | Atomically saves exact review wording, attaches it to the owned return, and moves ready-to-review → reviewed. |
| `save_awaken_observation` | Atomically saves the three non-whitespace Awaken exact-text entries, creates the `observation`, `reaction`, and `body_cue` user-authored records, and advances only a new resume state to `awaken.pay-attention.reflect`; any repeat/stale submission receives a neutral conflict and cannot rewrite the originals. |
| `grant_ai_context` | Serializes by user/entry/scope and returns the one active explicit grant idempotently. |
| `revoke_ai_context` | Locks the owned grant, verifies its revision, records revocation, and increments the revision. |
| `delete_journal_entry_with_dependencies` | Hard-deletes an owned journal source, every dependent AI artifact, grants, records and links; preserves unrelated data and curriculum progress; writes a content-free audit event. |

All privileged functions reject unauthenticated callers, recheck `auth.uid()` ownership, use `SECURITY DEFINER` with `search_path=pg_catalog`, are owned by the non-login `rts_privileged_owner` role, revoke `PUBLIC`/`anon` execution, and grant execution only to `authenticated`.

## Delete actions

- Auth-user deletion cascades through all private rows.
- Authored curriculum references use `restrict`.
- Formation records and links cascade when their owned journal/record/practice endpoint is removed.
- AI thread deletion cascades to its artifacts; artifact deletion cascades to source dependencies.
- Journal deletion is not granted directly. The privileged deletion function removes whole dependent artifacts before deleting the journal source.
- Practice plan/outcome/review journal references use `restrict` so practice history cannot be silently orphaned.

## Deliberate exclusions

There is no transcript/message table, spiritual score, maturity state, social/community/mentor data, advanced analytics, commerce/subscription data, production CMS structure, or full-curriculum schema in Phase 1.
