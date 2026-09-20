# Decision / Change Log

| Date | Decision / request | Phase | Impact | Status |
| --- | --- | --- | --- | --- |
| 2026-09-20 | Overview site is the app design and UX authority; old site and Done folder are content sources only. | 0 | Controls all visual implementation. | Locked |
| 2026-09-20 | Approved primary journey is Awaken → See Clearly → Become → Join. | 0 | Prevents Walk becoming a fifth stage. | Locked |
| 2026-09-20 | Phase 1 is limited to one end-to-end vertical slice. | 1 | Full curriculum remains unauthorized. | Locked |
| 2026-09-20 | Propose Next.js/React/TypeScript + PostgreSQL/Supabase Auth/RLS + server-side OpenAI. | 1 | Establishes prototype technical baseline. | Proposed in ADR-001 |
| 2026-09-20 | Propose normalized `ai_artifact_sources` and `ai_context_grants` instead of JSON ID lists. | 1 | Makes deletion, revocation, RLS, and tests relationally enforceable. | Proposed in ADR-001 |
| 2026-09-20 | Propose hard deletion of all AI artifacts dependent on a deleted source entry. | 1 | Gives deterministic privacy behavior; curriculum state remains. | Proposed in ADR-001 |
| 2026-09-20 | Canonical prototype palette follows Overview/Formation/Awaken values; later-page token drift is not adopted. | 1 | Freezes prototype token direction. | Proposed pending design audit approval |
| 2026-09-20 | Phase 1 does not persist full AI transcripts; explicitly saved AI material uses normalized artifact sources. | 1 | Makes deletion dependencies deterministic and minimizes retained sensitive text. | Proposed in ADR-001 |
| 2026-09-20 | Same-owner child relationships use composite foreign keys; cross-stage links use typed columns. | 1 | Enforces ownership integrity below the service layer. | Proposed in ADR-001 |
| 2026-09-20 | Practice transitions use a locked, versioned database function; reopen/duplicate is deferred. | 1 | Prevents invalid or concurrent lifecycle changes. | Proposed in ADR-001 |
