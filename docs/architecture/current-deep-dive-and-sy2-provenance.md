# Current Deep Dive curriculum and SY2 provenance decision

Status: approved SY2 provenance contract. Existing SY1 identifiers and historical source documents remain intact. The SY2 migration is tracked separately.

## Current participant curriculum

| Stage | Current modules | Implementation status |
| --- | --- | --- |
| Awaken | A1–A4 | Implemented |
| See Clearly → See Yourself Clearly | SY1 — Facts and Interpretation; SY2 — Follow the Formation Chain; SY3 — The Learned Self-Story; SY4 — What Is Actually True About Me | SY1 implemented; SY2 implemented in its separate migration; SY3–SY4 planned |
| See Clearly → See God Clearly | SG1 — The God I Learned; SG2 — What I Expect From God; SG3 — Jesus Shows Us the Father; SG4 — Can I Trust God Here? | Planned |
| Become; Join | Later stages | Not part of this foundation pass |

SY1's permanent stored module ID is `see-clearly.sc1`. The SY2 ID is `see-clearly.sy2`, its reflection ID is `sy2-reflection`, and its table is `see_clearly_sy2_records`; neither label change nor participant navigation may rewrite existing SY1 identifiers or rows. The old twelve-module See Clearly master-map, six-plus-six lesson numbering in the clean curriculum, and public Overview page numbers remain content/history, not current Deep Dive module counts. The public Overview is reference material; guided Deep Dive is the participant application. See [the naming reconciliation](../curriculum/see-clearly-naming-reconciliation.md) for source-to-module mappings.

## Approved SY1 → SY2 relationship

1. A future SY2 chain is an independently owned, participant-authored structured record attached to its own `see-clearly.sy2` module progress. Its source SY1 record ID is optional. A participant can instead trace a recent event that has no SY1 record; the chain must still save and remain usable.
2. When present, `source_sc1_record_id` refers to `see_clearly_sc1_records.id` with composite `(source_sc1_record_id, user_id) → (id, user_id)`. SY1 already exposes `unique(id, user_id)`. A matching owner must be enforced in the database and in server actor-scoped access. The target SY2 record's owner remains immutable and subject to forced RLS and owner-only policies. The link must not imply that the participant's chain text was copied from SY1.
3. The future SY2 record stores its own participant-authored chain wording, independently of the SY1 `event_facts` and `automatic_interpretation` fields. Where the source is needed, read the owned SY1 row through the relationship. Do not duplicate its private wording into provenance fields, public logs, analytics, or an AI artifact. Distinguish user-authored wording from suggestions and explicitly user-confirmed AI content.
4. **Source deletion:** use `ON DELETE SET NULL (source_sc1_record_id)` on the composite foreign key, retaining the non-null SY2 `user_id` and independently authored chain. PostgreSQL column-scoped `SET NULL` is needed: nulling both FK columns would violate owner integrity. If SY1 itself disappears because its source journal entry is deleted, the same unlinking applies. Show the participant that the source is no longer available rather than reconstructing deleted wording. SY2 progress and reflection remain intact. This extends the architecture's rule to unlink cross-stage lineage and preserve independent curriculum progress; it does not treat an independently authored SY2 record as a single-source duplicate of SY1.
5. **AI dependency:** no AI output is stored in the SY2 chain as participant-authored content by implication. Any future explicitly saved AI artifact that actually consumed SY1 (or its underlying journal entry) needs a normalized, same-owner source dependency and must be deleted as a whole when a required source is deleted, even if it used multiple sources. The current `ai_artifact_sources` schema handles journal sources only, so SY1-structured-source AI usage requires a separately approved source/deletion design before such AI can be enabled. A plain SY2 record with a now-null source link is not an AI artifact and remains. No AI permission or new schema is approved here.

### Why this deletion rule fits the controlling architecture

The Phase 1 ADR's deletion contract removes single-source structured copies and whole AI artifacts tied to a deleted journal entry, unlinks cross-stage lineage, and preserves curriculum progress. It also keeps exact user wording distinct from AI suggestions. Existing SY1 schema has an optional journal FK with `ON DELETE CASCADE`, so deleting its journal source can remove SY1. For SY2, the proposed SY1 reference records provenance only; the SY2 wording has independent authorship and may exist without an SY1 source. Nulling that reference therefore honors deletion without erasing independent participant work. Existing legacy `formation_links` do not link typed SY1 records to future SY2 records; this proposal must not be implemented by silently reusing a mismatched legacy link type.

### Gate for the SY2 migration

Specify and test: owned SY1 source accepted; no-source chain accepted; cross-user source rejected; source deletion unlinks SY2 but retains its exact words and progress; journal deletion cascades through SY1 and unlinks SY2; an AI artifact dependent on a deleted required source is deleted rather than orphaned; review navigation creates no writes. Do not add AI use of structured sources until its normalized dependency and deletion handling are designed and tested.

## Deferred before Become

Specify the repeated lived-practice lifecycle and new Become source handoff; repeated return/review cycles; broader cross-stage provenance and deletion rules; stage-specific AI policy for See God Clearly and Become. None is implemented by this document.

## Evidence

- `docs/architecture/ADR-001-phase-1-prototype-stack.md`, provenance and deletion dependency rule.
- `docs/architecture/phase-1-schema-blueprint.md`, formation links, AI artifact dependencies, and journal deletion function.
- `supabase/migrations/202609250002_see_clearly_sc1.sql`, SY1 owner uniqueness, progress and optional journal source constraints.
- `supabase/migrations/202609200002_phase1_private_data.sql` and `202609210008_see_clearly_lineage.sql`, legacy typed links and three-prompt See Clearly route data.
