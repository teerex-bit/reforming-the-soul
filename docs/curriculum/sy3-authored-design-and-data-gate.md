# SY3 — The Learned Self-Story: authored design and data gate

Status: design and migration specification only. Baseline `3abe8cad8677506b5f59310db68bbde950e6868f`. No schema, lesson implementation, AI, or deployment is authorized by this document.

Current movement: See Clearly → See Yourself Clearly. Proposed technical ID `see-clearly.sy3`; proposed reflection ID `sy3-reflection`. These are reserved and not yet persisted.

## A. Complete proposed participant copy

The following six sections are the proposed authored text, including interaction labels. The examples are fictional. They never describe the participant.

### 1. Opening — A familiar sentence

**The Learned Self-Story**

Imagine Mara receiving a brief correction at work. She thanks her coworker, then spends the afternoon replaying the exchange. Later she forgets something she had promised to do and works late to make up for it. That evening, a friend seems quieter than usual. Mara sends another message, wondering whether she has upset them.

From the outside, these moments look different. Mara rechecks her work, tries to repair a mistake, and seeks reassurance from a friend. Underneath them, a familiar sentence may be gathering strength: “I am disappointing people.” She might not say those words aloud. She may simply feel the pressure to prove she is still okay with everyone.

Mara's sentence is an example, not an explanation for your life. Your moments may have nothing in common with hers. This lesson invites you to listen for a conclusion that sometimes seems to follow you from one situation to another, while leaving room for the possibility that you do not hear one yet.

### 2. Teaching — How a story becomes familiar

Experiences leave memories, but they can also leave conclusions about ourselves. A mistake may become more than “I got that wrong.” It can begin sounding like “I am a failure.” Someone's disappointment may become “I disappoint people.” Being left out may begin to sound like “I am unwanted.” A conclusion heard often enough can stop sounding like a conclusion and start sounding like a description.

Some conclusions grow around performance. If the story is “I matter when I succeed,” praise may bring relief while ordinary mistakes feel unusually threatening. Another story may lead someone to hide weakness because being known feels unsafe. Someone who carries “I cannot depend on anyone” may keep their distance even when help is offered. These are ways a learned story *might* show itself, not types of people or answers for you to choose.

The same outward behavior can have more than one meaning. Working hard may express care and responsibility. Asking for reassurance may be a sensible response to uncertainty. Keeping something private is not automatically hiding. We do not need to assign a motive to recognize that, in some moments, a sentence about ourselves seems to gain unusual authority.

You have already seen that formation is not identity. Here the question becomes more specific: Is there one familiar conclusion you may have learned to carry? You do not have to know where it began or decide whether it is true. First, see whether you can hear it.

### 3. Recognition — The sentence underneath

**What story seems to return?**

You may look at your SY2 trace as a reminder of one moment, or begin with what you have been noticing lately. A single moment may not show a recurring story. Think also of other moments that have felt similar, without trying to make them fit.

**Prompt:** As you think about this moment—and other moments that have felt similar—what does the story underneath them seem to say about you?

**Field label:** A story I sometimes carry is…

Your words can be tentative. You can write “I may have learned…,” change your mind, or say “I'm not sure yet.” This is a working sentence, not a verdict about who you are. You may also continue without saving one.

### 4. Clarification — A story is not a verdict

A familiar story is not automatically a true story. It may contain something real, leave out something important, or reflect a conclusion that helped you make sense of repeated experiences. You may not yet know which part describes your situation. The fact that a sentence feels familiar does not give it the authority to define you.

There is no need to correct the sentence immediately or replace it with something more positive. Keep it in your own words and hold it lightly. SY3 helps you recognize the story you may have learned to carry. The next lesson will ask a different question: what is actually true?

### 5. Reflection and practice — Notice when it speaks

**Reflection**

When a moment seems to confirm your working story, what changes in the way you respond—and what, if anything, makes you pause before accepting that story? You may write about uncertainty instead of an answer.

**In your day**

For the next few days, notice moments that seem to say something about you. Criticism, a mistake, appreciation, or someone's disappointment may each stir a sentence. Pause long enough to notice what that sentence says and whether it sounds familiar. You do not need to correct it, explain its origin, share it with anyone, or force a conclusion. Noticing is enough for now.

### 6. Carry forward — A question worth carrying

The story you learned may have shaped you deeply. That does not automatically make it true. Carry your tentative sentence forward if you have one; if you do not, carry the question. You can return and revise your words as you notice more.

**Next: SY4 — What Is Actually True About Me.** There, you will examine what has authority to tell the truth about you. For now, you have made room to hear a story without letting it become your identity.

## B. Interaction specification

| Element | Exact proposed behavior |
| --- | --- |
| Source choice | If an owned SY2 record exists, radio choices **Use my SY2 trace** and **Start from what I have been noticing lately**. Default to the saved choice on review; otherwise let the participant choose, with no automatic transfer of words. Without an owned record, show only the latter path and a quiet note that no earlier trace is needed. |
| Source reference | Selecting SY2 displays its exact participant-authored chain wording in a restrained read-only reference, with labels and empty links omitted. It is context, not a prefilled answer. If the source was later deleted, show **Your earlier SY2 trace is no longer available. Your own words here remain.** Do not reconstruct deleted wording. |
| Recognition | One editable multiline field labeled **A story I sometimes carry is…** beneath the exact prompt in section 3. No authored answer options, theme selection, second situation field, automatic inference, or score. A short note permits tentative wording and “I'm not sure yet.” |
| Optional question | One optional field labeled **A question I want to keep open…** may be offered as an alternative or companion to the hypothesis. It should not force a second answer. Either field alone can form a meaningful saved record. |
| Save | **Save & continue** when either field contains non-whitespace participant wording. Preserve exact entered wording, including intentional surrounding spaces, once nonempty. Persist source selection only with a meaningful record, validate ownership again on the server, then advance after confirmed persistence. A subsequent edit can change or clear either field; clearing both deletes the private record or explicitly declines saving rather than retaining an empty row. |
| Skip | **Continue without saving a story** advances progress only. It does not create an empty SY3 row, implicitly save an SY2 link, or overwrite an existing saved story. |
| Return/review | Resume at the furthest reached section; completed sections are freely navigable without progress writes. The hypothesis/question and source selection remain editable in review. Clearly distinguish saved text from unsaved local edits. |
| Failure/auth | On save failure remain here with local wording and source choice intact, report that it was not saved, and allow retry. On expired auth provide a clear sign-in path without claiming success. Completion follows the shared confirmed-persistence contract. |
| Reflection | One optional private response with the exact section 5 prompt. Save, edit, skip, and deletion follow the existing reflection lifecycle, independently of the structured story record and completion. |

Narrative examples are authored and never selectable participant diagnoses. A source is optional even if present. Source choice does not imply the SY2 chain contains or proves the proposed story.

## C. Minimum durable data contract

One optional structured record per participant's SY3 progress, created only on intentional save of at least one nonblank participant field:

| Field | Contract |
| --- | --- |
| `id` | Stable UUID record identity. |
| `user_id` | Authenticated owner; immutable. |
| `progress_id` | Same-owner SY3 module progress. |
| `module_id` | Fixed `see-clearly.sy3` to bind progress identity. |
| `source_sy2_record_id` | Nullable same-owner SY2 record reference; context only. |
| `source_was_linked` | Non-content boolean for an unavailable selected source. Follow the proven SY2 pattern: true when a source is selected in the saved record, survives FK unlinking, and can be reset when the participant intentionally saves a different no-source choice. No other historical source text is retained. |
| `self_story_hypothesis` | Nullable exact participant wording; no generated or normalized identity claim. |
| `open_question` | Nullable exact participant wording; permits question-only save. |
| `created_at`, `updated_at` | Record lifecycle timestamps; no review-navigation update. |

At least one of the two wording fields must be nonblank for a persisted record. The source flag or FK alone is not meaningful content. Existing `deep_dive_reflections` owns the single private reflection separately. Progress and completion remain separate from these writings. No transient examples, tags, confidence, cause, copied SY2 text, or AI content are stored.

## D. Exact proposed migration specification — no SQL file

1. Add **only** `see-clearly.sy3` to the existing `deep_dive_module_progress.module_id` check and **only** `sy3-reflection` to `deep_dive_reflections.prompt_id` check, retaining every existing allowed value and constraint behavior. Do not create any SY4 identifier.
2. Create `public.see_clearly_sy3_records` with the fields in C. Primary key `id`; `user_id` references `auth.users(id)` with the established owner-deletion behavior. Set `module_id` default and check to exactly `see-clearly.sy3`. The hypothesis and question are nullable individually, with a meaningful-content check requiring at least one nonblank value. Limit reasonable text lengths consistently with existing service validation; preserve exact accepted wording rather than trimming it on storage.
3. Add `unique(id,user_id)` for typed same-owner references and `unique(progress_id,user_id,module_id)` for the one-record-per-progress upsert. Add `(progress_id,user_id,module_id)` composite FK to `deep_dive_module_progress(id,user_id,module_id)` with `ON DELETE CASCADE`. The existing progress key supports this.
4. Add nullable `(source_sy2_record_id,user_id)` composite FK to `see_clearly_sy2_records(id,user_id)`. On source deletion use **column-scoped** `ON DELETE SET NULL (source_sy2_record_id)` so non-null `user_id` remains intact. Existing SY2 `unique(id,user_id)` supports the reference. The source flag remains true after automatic unlink. The service verifies source ownership before insertion or change; database FK remains the final integrity guard.
5. Follow current SY2 ownership controls: forced and enabled RLS, owner-only SELECT/INSERT/UPDATE/DELETE policies for `authenticated`, immutable-owner trigger using the existing `reject_user_id_change()` function, revoke broad table privileges, then grant the minimum established authenticated and privileged-owner CRUD privileges. Do not expand access to another participant's SY2 record.
6. Index `(user_id,progress_id)` for owned progress lookup and `(source_sy2_record_id,user_id)` for FK/deletion and source lookup only if query planning or FK operations justify it. The unique progress key already has an index; avoid a duplicate covering the same access path. No tags or multi-source infrastructure.
7. Data impact: no backfill, transformation, or renaming of SY1/SY2 records. Existing progress, reflection, source, RLS, ownership, and AI dependencies retain their semantics. SQL migration is applied once; the deployment pipeline's second application is a no-op.

The service transaction must validate the owned optional source, upsert the SY3 progress/record atomically when saving new wording, and only advance after confirmation. It must not write progress on completed review. Source deletion must preserve the independently authored SY3 record, reflection, and progress. Explicit deletion of SY3 private writing must preserve curriculum completion.

## E. Test plan

**Database and security:** clean reset/reapply; existing-baseline apply; second no-op; all prior module/reflection identifiers preserved; no-source hypothesis and question-only rows; reject empty and source-only rows; owned SY2 accepted; cross-user or nonexistent SY2 rejected in service and FK; immutable owner; forced RLS and owner-only read/write; source delete nulls only FK and retains flag, wording, question, reflection, and progress; source deletion through its own upstream dependency; SY3 private writing deletion leaves completion. Assert no new AI artifact or source dependency is created.

**Lesson:** first-visit guided sequence and future URL clamp; Back/Continue; resume at reached section; source/no-source choice and exact read-only context; tentative hypothesis and question-only saves; whitespace-only validation without altered accepted wording; skip with no record; existing record not overwritten by skip; edit and clear; reflection save/skip/edit/delete; rejected save and completion retry with local wording intact; expired auth recovery; intentional completion; arbitrary valid navigation and no-write review after completion; deleted-source notice; carry-forward route/group state points toward SY4 without making it accessible prematurely.

**Visual and accessibility:** inspect 375, 768, 1536 rendered states with and without an SY2 source, long participant wording, validation/retry, and deleted source. Verify readable prose width, one primary editable story field, no horizontal overflow or cramped controls, keyboard source choice and form operation, visible focus, semantic labels and error announcements, logical reading order, and a story/recognition composition distinct from SY1's comparison and SY2's chain.

Run the full exact-SHA certification and protected hosted pipeline only in a later authorized implementation pass.

## F. Visual composition

**Desktop:** a readable narrative column with generous paragraph spacing. Let Mara's three moments unfold as prose with restrained breaks; reveal the recurring example sentence as a typographic hinge. The recognition area is one calm, bounded writing surface. An optional SY2 reference sits nearby or above the field, visibly read-only and subordinate to the participant's new words. Clarification and practice return to paragraph flow. No three-card dashboard, chain graphic, or identity menu.

**Mobile:** the same reading order in one column. Keep the narrative paragraphs intact, with the example sentence given breathing room. Stack source choice, read-only context, prompt, field, and controls; make the field comfortable for several lines, controls touch-sized, and saved/error state immediately adjacent. No horizontal scrolling or condensed type to force content onto one screen.

The approved Overview visual language, live text, Tree of Life curriculum identity, visible focus, and quiet progress marker remain the shared shell. The story's pacing and one recognitional sentence give SY3 its own personality.

## G. Blocker

No architecture blocker. This specification does not authorize SQL, app code, AI, SY4, or deployment. The exact participant copy and field labels are proposed for review before a build pass.
