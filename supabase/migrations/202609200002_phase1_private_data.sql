create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.user_curriculum_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  curriculum_version_id text not null references public.curriculum_versions(id) on delete restrict,
  current_node_id text not null,
  state public.curriculum_state not null default 'not_started',
  completed_node_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, curriculum_version_id),
  foreign key (current_node_id, curriculum_version_id)
    references public.curriculum_nodes(id, version_id) on delete restrict
);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  curriculum_version_id text not null,
  node_id text not null,
  entry_kind public.journal_entry_kind not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (node_id, curriculum_version_id)
    references public.curriculum_nodes(id, version_id) on delete restrict
);

create table public.formation_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  curriculum_version_id text not null,
  node_id text not null,
  record_type public.formation_record_type not null,
  value_text text not null,
  source_journal_entry_id uuid not null,
  provenance public.provenance_type not null check (provenance in ('user_authored', 'user_confirmed_ai')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (node_id, curriculum_version_id)
    references public.curriculum_nodes(id, version_id) on delete restrict,
  foreign key (source_journal_entry_id, user_id)
    references public.journal_entries(id, user_id) on delete cascade
);

create table public.practices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  curriculum_version_id text not null,
  node_id text not null,
  control_target_entry_id uuid not null,
  present_truth_entry_id uuid not null,
  next_right_step_entry_id uuid not null,
  state public.practice_state not null,
  lock_version integer not null default 0 check (lock_version >= 0),
  opened_at timestamptz,
  ready_to_review_at timestamptz,
  reviewed_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (node_id, curriculum_version_id)
    references public.curriculum_nodes(id, version_id) on delete restrict,
  foreign key (control_target_entry_id, user_id)
    references public.journal_entries(id, user_id) on delete restrict,
  foreign key (present_truth_entry_id, user_id)
    references public.journal_entries(id, user_id) on delete restrict,
  foreign key (next_right_step_entry_id, user_id)
    references public.journal_entries(id, user_id) on delete restrict
);

create table public.practice_returns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  practice_id uuid not null unique,
  outcome_entry_id uuid not null,
  review_entry_id uuid,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (id, user_id),
  foreign key (practice_id, user_id)
    references public.practices(id, user_id) on delete cascade,
  foreign key (outcome_entry_id, user_id)
    references public.journal_entries(id, user_id) on delete restrict,
  foreign key (review_entry_id, user_id)
    references public.journal_entries(id, user_id) on delete restrict
);

create table public.formation_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  link_type public.formation_link_type not null,
  source_journal_entry_id uuid,
  source_formation_record_id uuid,
  source_practice_id uuid,
  target_journal_entry_id uuid,
  target_formation_record_id uuid,
  target_practice_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  check (num_nonnulls(source_journal_entry_id, source_formation_record_id, source_practice_id) = 1),
  check (num_nonnulls(target_journal_entry_id, target_formation_record_id, target_practice_id) = 1),
  check (
    (link_type = 'awaken_to_see_clearly' and source_journal_entry_id is not null and target_formation_record_id is not null)
    or (link_type = 'see_clearly_to_become' and source_formation_record_id is not null and target_practice_id is not null)
    or (link_type = 'practice_to_return' and source_practice_id is not null and target_journal_entry_id is not null)
  ),
  foreign key (source_journal_entry_id, user_id) references public.journal_entries(id, user_id) on delete cascade,
  foreign key (source_formation_record_id, user_id) references public.formation_records(id, user_id) on delete cascade,
  foreign key (source_practice_id, user_id) references public.practices(id, user_id) on delete cascade,
  foreign key (target_journal_entry_id, user_id) references public.journal_entries(id, user_id) on delete cascade,
  foreign key (target_formation_record_id, user_id) references public.formation_records(id, user_id) on delete cascade,
  foreign key (target_practice_id, user_id) references public.practices(id, user_id) on delete cascade
);

create table public.ai_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  intent_id uuid not null,
  request_fingerprint text not null,
  mode public.ai_mode not null,
  stage public.stage_id not null,
  curriculum_version_id text not null,
  node_id text not null,
  status public.ai_outcome not null,
  model_id text not null,
  global_policy_version text not null,
  stage_policy_version text not null,
  mode_policy_version text not null,
  output_schema_version text not null,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  input_token_count integer check (input_token_count is null or input_token_count >= 0),
  output_token_count integer check (output_token_count is null or output_token_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, intent_id),
  foreign key (node_id, curriculum_version_id)
    references public.curriculum_nodes(id, version_id) on delete restrict
);

create table public.ai_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null,
  artifact_type public.ai_artifact_type not null,
  content jsonb not null,
  status public.ai_artifact_status not null,
  provenance public.provenance_type not null,
  model_id text not null,
  global_policy_version text not null,
  stage_policy_version text not null,
  mode_policy_version text not null,
  output_schema_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  check (
    (status = 'suggested' and provenance = 'ai_suggested')
    or (status = 'confirmed' and provenance = 'user_confirmed_ai')
    or (status = 'invalidated' and provenance in ('ai_suggested', 'user_confirmed_ai'))
  ),
  foreign key (thread_id, user_id)
    references public.ai_threads(id, user_id) on delete cascade
);

create table public.ai_context_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  journal_entry_id uuid not null,
  scope public.ai_grant_scope not null,
  revision integer not null default 1 check (revision >= 1),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (id, journal_entry_id, user_id),
  foreign key (journal_entry_id, user_id)
    references public.journal_entries(id, user_id) on delete cascade
);

create unique index ai_context_grants_one_active_idx
  on public.ai_context_grants(user_id, journal_entry_id, scope)
  where revoked_at is null;

create table public.ai_artifact_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  artifact_id uuid not null,
  journal_entry_id uuid not null,
  context_grant_id uuid,
  grant_revision integer,
  source_role public.ai_source_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (artifact_id, journal_entry_id, source_role),
  check (
    (source_role = 'current' and context_grant_id is null and grant_revision is null)
    or (source_role = 'selected_prior' and context_grant_id is not null and grant_revision is not null and grant_revision >= 1)
  ),
  foreign key (artifact_id, user_id)
    references public.ai_artifacts(id, user_id) on delete cascade,
  foreign key (journal_entry_id, user_id)
    references public.journal_entries(id, user_id) on delete cascade,
  foreign key (context_grant_id, journal_entry_id, user_id)
    references public.ai_context_grants(id, journal_entry_id, user_id) on delete restrict
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type public.audit_event_type not null,
  object_type public.audit_object_type not null,
  object_id uuid not null,
  dependent_artifact_count integer not null default 0 check (dependent_artifact_count >= 0),
  dependent_record_count integer not null default 0 check (dependent_record_count >= 0),
  dependent_link_count integer not null default 0 check (dependent_link_count >= 0),
  grant_count integer not null default 0 check (grant_count >= 0),
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create index profiles_user_idx on public.profiles(user_id);
create index user_curriculum_state_user_idx on public.user_curriculum_state(user_id);
create index user_curriculum_state_version_idx on public.user_curriculum_state(curriculum_version_id);
create index user_curriculum_state_node_idx on public.user_curriculum_state(current_node_id, curriculum_version_id);
create index journal_entries_user_idx on public.journal_entries(user_id);
create index journal_entries_node_idx on public.journal_entries(node_id, curriculum_version_id);
create index formation_records_user_idx on public.formation_records(user_id);
create index formation_records_node_idx on public.formation_records(node_id, curriculum_version_id);
create index formation_records_source_idx on public.formation_records(source_journal_entry_id, user_id);
create index practices_user_idx on public.practices(user_id);
create index practices_node_idx on public.practices(node_id, curriculum_version_id);
create index practices_control_idx on public.practices(control_target_entry_id, user_id);
create index practices_truth_idx on public.practices(present_truth_entry_id, user_id);
create index practices_step_idx on public.practices(next_right_step_entry_id, user_id);
create index practice_returns_user_idx on public.practice_returns(user_id);
create index practice_returns_practice_idx on public.practice_returns(practice_id, user_id);
create index practice_returns_outcome_idx on public.practice_returns(outcome_entry_id, user_id);
create index practice_returns_review_idx on public.practice_returns(review_entry_id, user_id);
create index formation_links_user_idx on public.formation_links(user_id);
create index formation_links_source_journal_idx on public.formation_links(source_journal_entry_id, user_id);
create index formation_links_source_record_idx on public.formation_links(source_formation_record_id, user_id);
create index formation_links_source_practice_idx on public.formation_links(source_practice_id, user_id);
create index formation_links_target_journal_idx on public.formation_links(target_journal_entry_id, user_id);
create index formation_links_target_record_idx on public.formation_links(target_formation_record_id, user_id);
create index formation_links_target_practice_idx on public.formation_links(target_practice_id, user_id);
create index ai_threads_user_idx on public.ai_threads(user_id);
create index ai_threads_node_idx on public.ai_threads(node_id, curriculum_version_id);
create index ai_artifacts_user_idx on public.ai_artifacts(user_id);
create index ai_artifacts_thread_idx on public.ai_artifacts(thread_id, user_id);
create index ai_context_grants_user_idx on public.ai_context_grants(user_id);
create index ai_context_grants_journal_idx on public.ai_context_grants(journal_entry_id, user_id);
create index ai_artifact_sources_user_idx on public.ai_artifact_sources(user_id);
create index ai_artifact_sources_artifact_idx on public.ai_artifact_sources(artifact_id, user_id);
create index ai_artifact_sources_journal_idx on public.ai_artifact_sources(journal_entry_id, user_id);
create index ai_artifact_sources_grant_idx on public.ai_artifact_sources(context_grant_id, journal_entry_id, user_id);
create index audit_events_user_idx on public.audit_events(user_id);
create index audit_events_object_idx on public.audit_events(object_id, user_id);
