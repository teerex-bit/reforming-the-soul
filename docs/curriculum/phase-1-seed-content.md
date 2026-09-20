# Phase 1 Exact Seed Curriculum

## Boundary

This is the complete authored-content inventory authorized for the prototype. It is a test fixture and vertical-slice seed, not a condensed full curriculum. No Join session is built; Join exists only as an approved stage identifier and Route option. `Walk` is not a primary stage.

## Version and node order

- Curriculum version: `phase-1-v1`
- Start node: `awaken.pay-attention.observe`
- Terminal slice node: `become.practice.review`
- Primary stages: `awaken`, `see-clearly`, `become`, `join`

| Order | Node ID | Stage/kind | Exact authored content / interaction |
| --- | --- | --- | --- |
| 1 | `awaken.pay-attention` | Awaken/session | Title: **Pay Attention**. Teaching: “Formation begins by paying attention to what is happening around you and within you. Notice before you explain, judge, or fix.” |
| 2 | `awaken.pay-attention.observe` | Awaken/interaction | Prompt: **What happened?** Help: “Describe the situation in your own words.” Exact-text multiline field `event_text`, required. |
| 3 | `awaken.pay-attention.inside` | Awaken/interaction | Prompt: **What happened inside me?** Help: “Notice thoughts, emotions, impulses, or reactions without diagnosing them.” Exact-text multiline field `internal_response_text`, required. |
| 4 | `awaken.pay-attention.body` | Awaken/interaction | Prompt: **What did you notice in your body?** Help: “Name one body cue, such as tension, warmth, restlessness, heaviness, or a change in breathing.” Exact-text field `body_cue_text`, required. |
| 5 | `awaken.pay-attention.reflect` | Awaken/interaction | Action: **Reflect with AI**. Disclosure: “AI can ask a careful follow-up. It is not an authority and will not diagnose you or tell you what God is saying.” Output: 1–3 questions. Optional user action: **Save my added insight** into exact-text `added_insight_text`; no transcript save. |
| 6 | `bridge.awaken-see-clearly` | Awaken→See Clearly/bridge | Title: **See clearly**. Teaching: “A situation and the meaning we give it are related, but they are not the same. Separate what could be observed from what you concluded.” |
| 7 | `see-clearly.fact` | See Clearly/interaction | Prompt: **What is the observable fact?** Help: “Write only what a camera or careful witness could observe.” Exact-text multiline field `observable_fact_text`, required. |
| 8 | `see-clearly.interpretation` | See Clearly/interaction | Prompt: **What is my interpretation?** Help: “Name the meaning, conclusion, or story you attached to the fact.” Exact-text multiline field `interpretation_text`, required. |
| 9 | `see-clearly.belief-expectation` | See Clearly/interaction | Prompt: **What belief or expectation is present?** User chooses exactly one type: `belief` or `expectation`, then enters exact text `belief_expectation_text`, required. |
| 10 | `bridge.see-clearly-become` | See Clearly→Become/bridge | Title: **Become in the present moment**. Teaching: “You may not control the outcome, but you can receive what is true now and choose a faithful next step.” |
| 11 | `become.control` | Become/interaction | Prompt: **What outcome am I trying to control?** Exact-text multiline field `control_target_text`, required. |
| 12 | `become.receive` | Become/interaction | Prompt: **What is actually true in the present moment?** Help: “Name what you can honestly receive as true now, without predicting the future.” Exact-text multiline field `present_truth_text`, required. |
| 13 | `become.next-step` | Become/interaction | Prompt: **What is the next right step?** Help: “Choose one concrete, appropriately bounded action.” Exact-text multiline field `next_right_step_text`, required. |
| 14 | `become.practice.open` | Become/practice | Title: **Open practice**. Summary shows the three Become fields. Action: **Save as open practice**. Initial persisted lifecycle after confirmation: `waiting_for_real_life`. Copy: “Leave this open and return after you have had an opportunity to practice.” |
| 15 | `become.practice.return` | Become/return | Title: **Return to your practice**. Prompt: **What happened when you took—or had an opportunity to take—the next right step?** Exact-text multiline field `practice_outcome_text`, required. Saving creates the return and moves state to `ready_to_review`. |
| 16 | `become.practice.review` | Become/review | Title: **Review the practice**. Displays original plan and outcome separately. Prompt: **What are you noticing now?** Exact-text multiline field `review_text`, required. Actions: **Save review**, then **Close practice**. No score or maturity judgment. |

## Permission/deletion test fixture

The Awaken observation journal entry is the only prior entry selectable in the acceptance flow. The permission control must say:

- Label: **Allow AI to use this entry for this reflection**
- Disclosure: “Only this selected entry will be added to the next AI Reflect request. You can revoke permission before a future request.”
- Revoke action: **Stop allowing future AI use**

The second Reflect request appears as `practice.review.reflect`, an optional AI capability on the practice review screen after review text is saved. It reuses the policy/interaction definition from `awaken.pay-attention.reflect` without becoming a new curriculum-progress node. Its current entry is the owned review journal entry; it adds the one selected Awaken entry only through an active grant. The user may explicitly choose **Save AI suggestion**; this stores `ai_suggested/suggested`, not user-authored truth. No “accept as mine” transition is required in the slice. Deleting the original Awaken entry deletes that dependent artifact under the approved rule; curriculum progress and resume state remain.

## Required structure and exclusions

- Authored teaching, help, prompts, field definitions, stage IDs, and node order live in the versioned content module.
- Route and UI components receive validated nodes; they do not duplicate this wording.
- User fixture wording belongs in test fixtures, never authored content.
- No additional lessons, Scripture passages, practices, Join interactions, assessment, community, mentor, notification, score, badge, streak, analytics, Books, Music, commerce, or CMS content is authorized.
