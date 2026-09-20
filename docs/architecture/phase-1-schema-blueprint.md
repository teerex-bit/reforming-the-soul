# Phase 1 Schema and Privileged Function Blueprint

This blueprint freezes the Phase 1 relational contract before coding. Migration authors may choose physical names for indexes and constraints, but may not add/remove columns, change cardinality, ownership, delete behavior, or function semantics without an engineering-lead decision.

## Shared conventions

- Primary IDs: `uuid primary key default gen_random_uuid()` except stable authored curriculum IDs, which are `text`.
- Private rows: `user_id uuid not null references auth.users(id) on delete cascade`, `created_at timestamptz not null default now()`, and `unique(id,user_id)`.
- Exact user text uses `text not null` with no trimming/rewrite in persistence. Empty-after-client-validation is still rejected by service/runtime schema.
- Ownership columns and every foreign-key/policy predicate are indexed. `user_id` is immutable after insert.
- Private tables have `enable row level security` and `force row level security`. Browser DML grants are allowlisted; lifecycle/deletion/audit mutations occur only through functions.
- All enums are database enums or equivalent check constraints matching domain literals exactly.

## Authored curriculum

### `curriculum_versions`

`id text primary key`, `status text check in ('active','retired')`, `content_hash text not null unique`, `published_at timestamptz not null`. Readable by authenticated users; not browser-writable.

### `curriculum_nodes`

`id text`, `version_id text references curriculum_versions(id) on delete restrict`, `stage stage_id`, `kind curriculum_node_kind`, `parent_id text null`, `sort_order integer not null check (sort_order >= 0)`, `content jsonb not null`, primary key `(id,version_id)`, unique `(version_id,parent_id,sort_order)`, composite parent FK `(parent_id,version_id) → curriculum_nodes(id,version_id) on delete restrict`. Content is validated against the same runtime schema before seed/import; authenticated read only.

### `user_curriculum_state`

`id uuid`, `user_id uuid`, `curriculum_version_id text`, `current_node_id text`, `state curriculum_state`, `completed_node_ids text[] not null default '{}'`, `updated_at timestamptz not null default now()`. Unique `(user_id,curriculum_version_id)`; composite FK `(current_node_id,curriculum_version_id) → curriculum_nodes`; no formation/evidence columns.

## User wording and structured formation

### `journal_entries`

`id uuid`, `user_id uuid`, `curriculum_version_id text`, `node_id text`, `entry_kind journal_entry_kind`, `body text not null`, timestamps. Composite authored-node FK; body is canonical exact user wording. Entries are immutable after save in Phase 1: owner may create/read, but direct update/delete is denied. Corrected wording is a new journal entry and does not silently rewrite AI provenance; edit/replace UI is deferred.

### `formation_records`

`id uuid`, `user_id uuid`, `curriculum_version_id text`, `node_id text`, `record_type formation_record_type`, `value_text text not null`, `source_journal_entry_id uuid not null`, `provenance provenance_type not null check (provenance in ('user_authored','user_confirmed_ai'))`, timestamps. Composite FK `(source_journal_entry_id,user_id) → journal_entries(id,user_id) on delete cascade`. Phase 1 formation records have exactly one journal source; multi-source formation records are not supported.

### `formation_links`

`id uuid`, `user_id uuid`, `link_type formation_link_type`, nullable typed endpoints `source_journal_entry_id`, `source_formation_record_id`, `source_practice_id`, `target_journal_entry_id`, `target_formation_record_id`, `target_practice_id`, timestamps. Checks require exactly one source and exactly one target and an allowlisted `link_type`/endpoint pairing. Every endpoint uses `(endpoint_id,user_id)` composite FK. Journal/formation endpoints use `on delete cascade`; practice endpoints use `on delete cascade`. Link rows never copy source text.

## Practice lifecycle

### `practices`

`id uuid`, `user_id uuid`, `curriculum_version_id text`, `node_id text`, `control_target_entry_id uuid not null`, `present_truth_entry_id uuid not null`, `next_right_step_entry_id uuid not null`, `state practice_state not null`, `lock_version integer not null default 0 check (lock_version >= 0)`, `opened_at`, `ready_to_review_at`, `reviewed_at`, `closed_at` nullable timestamps, common timestamps. Each entry ID uses a composite same-owner FK to `journal_entries`; the entry kinds are validated by the service. The practice row contains lifecycle/relationships, not copied user prose. Browser direct state update is denied.

### `practice_returns`

`id uuid`, `user_id uuid`, `practice_id uuid`, `outcome_entry_id uuid not null`, `review_entry_id uuid null`, `created_at`, `reviewed_at null`, unique `(practice_id)`, composite FK `(practice_id,user_id) → practices(id,user_id) on delete cascade`, and composite same-owner journal FKs for outcome/review entries. The functions create the exact-text journal entries and links atomically; the return row does not duplicate their bodies. Browser direct insert/update/delete is denied.

## AI metadata, permissions, and artifacts

### `ai_threads`

Content-free metadata only: `id uuid`, `user_id uuid`, `intent_id uuid not null`, `request_fingerprint text not null`, `mode ai_mode`, `stage stage_id`, `curriculum_version_id text`, `node_id text`, `status ai_outcome`, `model_id text not null`, `global_policy_version text not null`, `stage_policy_version text not null`, `mode_policy_version text not null`, `output_schema_version text not null`, timing/token-count fields nullable, timestamps. Unique `(user_id,intent_id)`. No prompt, response, transcript, provider conversation ID, or journal-body column.

### `ai_artifacts`

`id uuid`, `user_id uuid`, `thread_id uuid`, `artifact_type ai_artifact_type`, `content jsonb not null`, `status ai_artifact_status check in ('suggested','confirmed','invalidated')`, `provenance provenance_type check in ('ai_suggested','user_confirmed_ai')`, full content-free version/model provenance repeated from the thread for immutable history, timestamps. Composite FK `(thread_id,user_id) → ai_threads(id,user_id) on delete cascade`. Explicit “save suggestion” creates `status='suggested'`, `provenance='ai_suggested'`; a separate “accept as mine” action changes to `confirmed/user_confirmed_ai` while retaining AI origin metadata. The slice tests save-as-suggestion only.

### `ai_artifact_sources`

`id uuid`, `user_id uuid`, `artifact_id uuid`, `journal_entry_id uuid`, `context_grant_id uuid null`, `grant_revision integer null`, `source_role ai_source_role check in ('current','selected_prior')`, timestamps. Unique `(artifact_id,journal_entry_id,source_role)`; composite FKs for artifact and journal require the same owner. Grants expose unique `(id,journal_entry_id,user_id)`, and selected-prior sources use composite FK `(context_grant_id,journal_entry_id,user_id)` so a same-user grant for a different entry cannot be cited. `grant_revision` is the immutable authorization-time snapshot and is checked by the save service against the thread authorization record, not an FK to the grant's later mutable revision. `current` requires null grant fields; `selected_prior` requires them. Deleting any source journal through the approved function deletes the entire dependent artifact, including multi-source artifacts.

### `ai_context_grants`

`id uuid`, `user_id uuid`, `journal_entry_id uuid`, `scope ai_grant_scope check (scope='single_entry_reflect')`, `revision integer not null default 1`, `granted_at timestamptz`, `revoked_at timestamptz null`, common timestamps, composite FK `(journal_entry_id,user_id) → journal_entries(id,user_id) on delete cascade`, unique `(id,journal_entry_id,user_id)`. At most one active grant per `(user_id,journal_entry_id,scope)` through a partial unique index. Revocation locks the active row, sets `revoked_at`, and increments that row's revision. A later re-grant never reactivates it: it inserts a new grant identity at revision 1. Concurrent grant/re-grant attempts serialize on an advisory key for `(user,entry,scope)` plus the partial unique index, producing one active grant; losing attempts return that active identity idempotently. Revoked history remains until source deletion.

### `audit_events`

`id uuid`, `user_id uuid`, `event_type audit_event_type`, `object_type audit_object_type`, `object_id uuid`, allowlisted integer count columns (`dependent_artifact_count`, `dependent_record_count`, `dependent_link_count`, `grant_count`) default 0, `created_at`. No free-form text/json. Browser roles have no insert/update/delete. User visibility, if enabled, is owner-read-only.

## Privileged function contracts

Every function below is `security definer`, has a fixed safe `search_path` containing only required trusted schemas, schema-qualifies every object, rejects null `auth.uid()`, rechecks row ownership internally, is owned by a non-login migration role, revokes execute from `PUBLIC`/`anon`, and grants execute only to `authenticated`. Tests inspect metadata and attempt anonymous/cross-owner/search-path-shadow/direct-DML bypasses.

### `transition_practice`

```sql
transition_practice(
  p_practice_id uuid,
  p_expected_state practice_state,
  p_expected_lock_version integer,
  p_target_state practice_state
) returns table (practice_id uuid, state practice_state, lock_version integer)
```

Locks the owned row `for update`; validates one allowed edge; updates the relevant timestamp and version. No return-row creation.

### `record_practice_return`

```sql
record_practice_return(
  p_practice_id uuid,
  p_expected_lock_version integer,
  p_outcome_text text
) returns table (practice_return_id uuid, practice_id uuid, state practice_state, lock_version integer)
```

Requires owned `waiting_for_real_life`, locks the row, creates the `practice_outcome` journal entry, inserts the one return referencing it, changes to `ready_to_review`, and increments version atomically. Repeated intent is handled by the service idempotency boundary and unique practice return.

### `review_practice`

```sql
review_practice(
  p_practice_id uuid,
  p_expected_lock_version integer,
  p_review_text text
) returns table (practice_return_id uuid, practice_id uuid, state practice_state, lock_version integer)
```

Requires owned `ready_to_review`, creates the `practice_review` journal entry and references it from the return, moves to `reviewed`, and increments version atomically. Closing then uses `transition_practice(reviewed→closed)`.

### `grant_ai_context` / `revoke_ai_context`

```sql
grant_ai_context(p_journal_entry_id uuid, p_scope ai_grant_scope)
returns table (grant_id uuid, revision integer, granted_at timestamptz);

revoke_ai_context(p_grant_id uuid, p_expected_revision integer)
returns table (grant_id uuid, revision integer, revoked_at timestamptz);
```

Both lock owned rows and use optimistic revision checks. Revocation semantics are governed by the dispatch authorization point below.

### `delete_journal_entry_with_dependencies`

```sql
delete_journal_entry_with_dependencies(p_journal_entry_id uuid)
returns table (
  deleted_entry_id uuid,
  dependent_artifact_count integer,
  dependent_record_count integer,
  dependent_link_count integer,
  grant_count integer
);
```

Locks and validates the owned journal entry; identifies and deletes every artifact with a source row for it, grants, single-source formation records, links, then the journal entry; preserves curriculum state and unrelated rows; writes a content-free audit row; commits atomically. Missing/other-owner IDs yield the same neutral application result.

## AI dispatch authorization point

The permission guarantee is linearizable at **dispatch authorization**, not retroactive. Immediately before context materialization, a short database transaction locks/reads the owned current entry, each selected prior entry, and active grant revision; it emits an immutable in-process authorized-context snapshot and commits. Provider dispatch follows immediately. A revocation committed before this authorization transaction completes prevents dispatch. A revocation committed after authorization cannot recall a provider request already authorized or dispatched; it blocks every later authorization. The app must not claim otherwise.

Barrier-controlled integration tests cover: revocation committed before authorization (no provider call), revocation racing while authorization waits (revocation wins/no call), and revocation after authorization (one already-authorized call may proceed; next call is blocked). Deletion uses the same boundary; deleting before authorization prevents use, while an already-authorized in-flight request cannot be recalled and may not persist a new artifact if its source no longer exists at save time.
