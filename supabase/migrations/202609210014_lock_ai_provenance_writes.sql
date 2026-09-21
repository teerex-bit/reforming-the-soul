drop policy if exists ai_threads_owner_insert on public.ai_threads;
drop policy if exists ai_artifacts_owner_insert on public.ai_artifacts;
drop policy if exists ai_artifact_sources_owner_insert on public.ai_artifact_sources;

revoke insert, update, delete on public.ai_threads from authenticated;
revoke insert, update, delete on public.ai_artifacts from authenticated;
revoke insert, update, delete on public.ai_artifact_sources from authenticated;
