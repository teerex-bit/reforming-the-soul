# See Clearly naming reconciliation

Status: reconciled against the review baseline `5a7d807cace977571dfce42d6cdb8b8ac95a1a4e`. This document records names; it changes no persisted identifier, route, curriculum content, or schema.

## Current Deep Dive structure

The app has two movements. The eight-module plan supersedes the twelve-module count in `RTS_See_Clearly_Curriculum_Master_Map.docx` and the separate six-lesson counts in each movement of `RTS-Curriculum-Master-Clean.docx`. The older material contributes content, not one-to-one identifiers. `SY` means See Yourself Clearly; `SG` means See God Clearly. Only SY1 is implemented and persisted today.

| Legacy source concept (content provenance) | Current concept | Permanent technical module ID | Participant label |
| --- | --- | --- | --- |
| Master map module 1, “The Lens Beneath the Reaction”; older `SC1` app shorthand | Part I, facts versus automatic interpretation | `see-clearly.sc1` **existing; preserve** | SY1 — Facts and Interpretation |
| Master map module 2, “Trace the Formation Chain”; planned `SC2` shorthand | Part I, formation chain | `see-clearly.sc2` **proposed, not migrated** | SY2 — Follow the Formation Chain |
| Master map modules 3–6; clean curriculum Part I lessons 1, 3–5 | Part I, learned self-story, performance, shame and protection | `see-clearly.sc3` **reserved proposal, not migrated** | SY3 — The Learned Self-Story |
| Master map module 7; clean curriculum Part I lessons 2 and 6, review | Part I, grounded truth about self | `see-clearly.sc4` **reserved proposal, not migrated** | SY4 — What Is Actually True About Me |
| Master map modules 8–9; clean curriculum Part II lesson 1 | Part II, learned picture of God and its sources | `see-clearly.sc5` **reserved proposal, not migrated** | SG1 — The God I Learned |
| Master map modules 8–9; clean curriculum Part II lessons 2 and 4 | Part II, functional expectations of God | `see-clearly.sc6` **reserved proposal, not migrated** | SG2 — What I Expect From God |
| Master map module 10; clean curriculum Part II lesson 5 | Part II, observations of Jesus | `see-clearly.sc7` **reserved proposal, not migrated** | SG3 — Jesus Shows Us the Father |
| Master map modules 11–12; clean curriculum Part II lessons 3 and 6 | Part II, concrete trust situation, summary and Become handoff | `see-clearly.sc8` **reserved proposal, not migrated** | SG4 — Can I Trust God Here? |

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
| `SC2` in current app navigation, tests and the pre-migration constraint test | Planned second app module, currently a group-row destination; no SC2 persistence or lesson route exists | `see-clearly.sc2` **proposed**, with `sc2-reflection` and distinct SC2 record table if approved | SY2 — Follow the Formation Chain |

The public Overview pages and the Deep Dive modules have independent numbering. Do not infer an app module ID from a public pathname, switcher number, or a clean curriculum lesson number.

## Schema decision before SY2

The narrow SC2 migration proposed earlier remains technically correct **if** the permanent ID is `see-clearly.sc2`: extend the progress and reflection check constraints with `see-clearly.sc2` and `sc2-reflection`, and create a separate same-owner, forced-RLS SC2 record for the formation-chain fields. Preserve every existing ID and row. The new participant shorthand is SY2 and should replace `SC2` in planning, status, and visible short labels, while `sc2` may remain in permanent technical identifiers, source filenames, and tests that explicitly verify those identifiers.

No SC2 migration has been created. If `1-2` or `2-2` are found in a further historical source, verify their actual page/content before applying this proposal; do not silently make them technical aliases.

## Evidence checked

- `RTS_See_Clearly_Curriculum_Master_Map.docx`, sections 3 and 5: the older twelve-module architecture and its Module 1/2 details.
- `RTS-Curriculum-Master-Clean.docx`, See Clearly parts I and II: two separate runs of lessons numbered 1–6, plus a Part I review.
- Current `components/deep-dive/SeeClearlyStage.tsx`, `components/deep-dive/see-clearly-navigation.ts`, `content/deep-dive/v1/see-clearly/sc1.ts`, `domain/deep-dive.ts`, and `supabase/migrations/202609250002_see_clearly_sc1.sql`.
- Public/static routes and both review switchers in `public/see-clearly/`, `public/review/index.html`, `src/see-clearly/`, and `src/review/index.html`.
- Literal repository search and `git log -S` for “See Clearly 1-2” and “See Clearly 2-2”: no exact occurrence.
