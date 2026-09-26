# See Clearly naming reconciliation

Status: reconciled for SY2 against certified review baseline `60acee35d9270ad9d970e17bed02178c3296cddb`. Existing SY1 identifiers remain unchanged.

## Current Deep Dive structure

The app has two movements. The eight-module plan supersedes the twelve-module count in `RTS_See_Clearly_Curriculum_Master_Map.docx` and the separate six-lesson counts in each movement of `RTS-Curriculum-Master-Clean.docx`. The older material contributes content, not one-to-one identifiers. `SY` means See Yourself Clearly; `SG` means See God Clearly. SY1 is the existing persisted module; SY2 is implemented in the separate `202609260001_see_clearly_sy2.sql` migration.

| Legacy source concept (content provenance) | Current concept | Permanent technical module ID | Participant label |
| --- | --- | --- | --- |
| Master map module 1, “The Lens Beneath the Reaction”; older `SC1` app shorthand | Part I, facts versus automatic interpretation | `see-clearly.sc1` **existing; preserve** | SY1 — Facts and Interpretation |
| Master map module 2, “Trace the Formation Chain”; planned `SC2` shorthand | Part I, formation chain | `see-clearly.sy2` **new SY2 migration** | SY2 — Follow the Formation Chain |
| Master map modules 3–6; clean curriculum Part I lessons 1, 3–5 | Part I, learned self-story, performance, shame and protection | `see-clearly.sy3` **reserved proposal, not migrated** | SY3 — The Learned Self-Story |
| Master map module 7; clean curriculum Part I lessons 2 and 6, review | Part I, grounded truth about self | `see-clearly.sy4` **reserved proposal, not migrated** | SY4 — What Is Actually True About Me |
| Master map modules 8–9; clean curriculum Part II lesson 1 | Part II, learned picture of God and its sources | `see-clearly.sg1` **reserved proposal, not migrated** | SG1 — The God I Learned |
| Master map modules 8–9; clean curriculum Part II lessons 2 and 4 | Part II, functional expectations of God | `see-clearly.sg2` **reserved proposal, not migrated** | SG2 — What I Expect From God |
| Master map module 10; clean curriculum Part II lesson 5 | Part II, observations of Jesus | `see-clearly.sg3` **reserved proposal, not migrated** | SG3 — Jesus Shows Us the Father |
| Master map modules 11–12; clean curriculum Part II lessons 3 and 6 | Part II, concrete trust situation, summary and Become handoff | `see-clearly.sg4` **reserved proposal, not migrated** | SG4 — Can I Trust God Here? |

The source map calls Part I “See Myself Clearly.” The approved current app group is **See Yourself Clearly**. This group wording is a participant label; it does not rename stored data.

## Public Overview and ambiguous labels

| Legacy name or location | What it actually denotes | Permanent Deep Dive technical ID | Participant label in this app |
| --- | --- | --- | --- |
| “See Clearly 1” in `public/review/index.html` and `src/review/index.html` | Public Overview review switcher entry for `/see-clearly/`; it is an introductory public page, not SY1 | None | See Clearly introduction (public Overview) |
| “See Clearly 2” in `public/review/index.html` | Public Overview switcher entry for `/see-clearly/lesson-2/`, titled See God Clearly; it is not SY2 | None | See God Clearly (public Overview) |
| “See Clearly 2” in `src/review/index.html` | An older disabled Upcoming public Overview switcher entry; no active module route there | None | Upcoming public Overview page (historical) |
| `/see-clearly/part-1/` | Public Overview page titled See Yourself Clearly; not a Deep Dive lesson | None | See Yourself Clearly (public Overview) |
| `/see-clearly/lesson-2/` | Public Overview Part 2 titled See God Clearly; the path segment `lesson-2` is a page number, not SY2 | None | See God Clearly (public Overview) |
| `/see-clearly/integration/` | Public Overview integration page, not a ninth Deep Dive module | None | See Clearly integration (public Overview) |
| “See Clearly 1-2” | **Unresolved:** no exact occurrence in current repository, repository text history, or either controlling document inspected. May refer to another legacy source; do not treat as SY2 without that source. | None assigned | Legacy alias only; do not display |
| “See Clearly 2-2” | **Unresolved:** same evidence boundary. Do not treat as SG2 without that source. | None assigned | Legacy alias only; do not display |
| `SC1` in current app code, tests, and schema | Technical shorthand for the implemented first app module | `see-clearly.sc1`; reflection prompt `sc1-reflection`; record table `see_clearly_sc1_records` | SY1 — Facts and Interpretation |
| `SC2` in historical navigation and the pre-migration constraint test | Older shorthand, not a persisted ID | `see-clearly.sy2`, `sy2-reflection`, `see_clearly_sy2_records` | SY2 — Follow the Formation Chain |

The public Overview pages and the Deep Dive modules have independent numbering. Do not infer an app module ID from a public pathname, switcher number, or a clean curriculum lesson number.

## Approved identifiers for SY2 and reserved future modules

SY2 uses `see-clearly.sy2`, `sy2-reflection`, and `see_clearly_sy2_records`. Its optional `source_sc1_record_id` points to the existing `see_clearly_sc1_records` table. Preserve SY1's `see-clearly.sc1`, `sc1-reflection`, and `see_clearly_sc1_records` because those identifiers are already persisted. Do not rename existing data for visual symmetry.

The future module IDs and reflection IDs are reserved only: SY3 `see-clearly.sy3` / `sy3-reflection`; SY4 `see-clearly.sy4` / `sy4-reflection`; SG1 `see-clearly.sg1` / `sg1-reflection`; SG2 `see-clearly.sg2` / `sg2-reflection`; SG3 `see-clearly.sg3` / `sg3-reflection`; SG4 `see-clearly.sg4` / `sg4-reflection`. None of these later modules is implemented by SY2.

## SY3 authored allocation decision (design only)

SY3 consolidates the learned self-story, performance/worth, shame/hiding, and protective responses into one story-and-recognition lesson. It asks what recurring, tentative conclusion the participant may have learned to carry. It does not answer whether that conclusion is true; SY4 takes up that question. The historical lessons remain source material rather than current navigation.

**SY3 has no dedicated Scripture section.** Psalm 139:13–14 and Ephesians 2:10 from the original story lesson answer the truth/identity question and are reserved for SY4. Genesis 3, 1 John 1:7, Proverbs 4:23, and 2 Corinthians 12:9 remain narrower historical shame/protection source material; none is inserted merely to fill an SY3 Scripture slot. This is an intentional allocation, not a missing passage. Do not rewrite the historical documents. The proposed participant copy, data contract, and migration specification are in [SY3 authored design and data gate](sy3-authored-design-and-data-gate.md). No SY3 identifiers have been added to the database.

The historical `SC2` shorthand in older navigation and tests is not a persisted identifier. Public Overview numbers are separate. If `1-2` or `2-2` appear in further source material, verify their meaning before assigning an alias.

## Evidence checked

- `RTS_See_Clearly_Curriculum_Master_Map.docx`, sections 3 and 5: the older twelve-module architecture and its Module 1/2 details.
- `RTS-Curriculum-Master-Clean.docx`, See Clearly parts I and II: two separate runs of lessons numbered 1–6, plus a Part I review.
- Current `components/deep-dive/SeeClearlyStage.tsx`, `components/deep-dive/see-clearly-navigation.ts`, `content/deep-dive/v1/see-clearly/sc1.ts`, `domain/deep-dive.ts`, and `supabase/migrations/202609250002_see_clearly_sc1.sql`.
- Public/static routes and both review switchers in `public/see-clearly/`, `public/review/index.html`, `src/see-clearly/`, and `src/review/index.html`.
- Literal repository search and `git log -S` for “See Clearly 1-2” and “See Clearly 2-2”: no exact occurrence.
