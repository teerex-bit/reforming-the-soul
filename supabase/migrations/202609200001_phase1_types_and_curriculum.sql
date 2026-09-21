create extension if not exists pgcrypto with schema extensions;

create type public.stage_id as enum ('awaken', 'see-clearly', 'become', 'join');
create type public.curriculum_node_kind as enum ('module', 'session', 'interaction', 'bridge');
create type public.curriculum_state as enum ('not_started', 'in_progress', 'completed');
create type public.journal_entry_kind as enum (
  'event', 'internal_response', 'body_cue', 'added_insight', 'observable_fact', 'interpretation',
  'belief_expectation', 'control_target', 'present_truth', 'next_right_step', 'practice_outcome', 'practice_review'
);
create type public.formation_record_type as enum (
  'observation', 'reaction', 'body_cue', 'observable_fact', 'interpretation', 'belief', 'expectation',
  'control_target', 'present_truth', 'next_right_step', 'practice_outcome', 'practice_review'
);
create type public.provenance_type as enum ('user_authored', 'ai_suggested', 'user_confirmed_ai');
create type public.formation_link_type as enum ('awaken_to_see_clearly', 'see_clearly_to_become', 'practice_to_return');
create type public.practice_state as enum ('draft', 'open', 'waiting_for_real_life', 'ready_to_review', 'reviewed', 'closed');
create type public.ai_mode as enum ('explain', 'reflect', 'guide_me', 'route');
create type public.ai_outcome as enum ('success', 'refusal', 'incomplete', 'invalid', 'timeout', 'provider_error');
create type public.ai_artifact_type as enum ('summary', 'suggested_tag', 'route_suggestion');
create type public.ai_artifact_status as enum ('suggested', 'confirmed', 'invalidated');
create type public.ai_source_role as enum ('current', 'selected_prior');
create type public.ai_grant_scope as enum ('single_entry_reflect');
create type public.audit_event_type as enum ('journal_entry_deleted');
create type public.audit_object_type as enum ('journal_entry');

create table public.curriculum_versions (
  id text primary key,
  status text not null check (status in ('active', 'retired')),
  content_hash text not null unique,
  published_at timestamptz not null
);

create table public.curriculum_nodes (
  id text not null,
  version_id text not null references public.curriculum_versions(id) on delete restrict,
  stage public.stage_id not null,
  kind public.curriculum_node_kind not null,
  parent_id text,
  sort_order integer not null check (sort_order >= 0),
  content jsonb not null,
  primary key (id, version_id),
  unique (version_id, parent_id, sort_order),
  foreign key (parent_id, version_id)
    references public.curriculum_nodes(id, version_id) on delete restrict
);

create index curriculum_nodes_parent_idx on public.curriculum_nodes(parent_id, version_id);
create index curriculum_nodes_stage_idx on public.curriculum_nodes(version_id, stage, sort_order);

revoke all on public.curriculum_versions, public.curriculum_nodes from public, anon, authenticated;
grant select on public.curriculum_versions, public.curriculum_nodes to authenticated;
