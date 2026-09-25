# Awaken implementation target — four modules

This supersedes the seven-module Awaken plan. Awaken is a short introduction to the formation journey. The participant moves through:

| Module | Purpose | Movement |
| --- | --- | --- |
| A1 — Pay Attention | Catch an internal response | Event → internal response → notice |
| A2 — Catch Yourself Being You | Recognize repetition | Situation → response → repetition → pattern |
| A3 — Your Reactions Have a History | Trace a response's possible formation without claiming certainty | Recurring response → possible source → former function |
| A4 — Formation Is Not Identity | Separate learned formation from identity and enter See Clearly | Formation ≠ identity → notice/name/optional ask/optional receive → what is actually true? |

The old separate Awaken modules **Name What Is Driving You**, **Let God Show You**, and **Ready to Look Again** are retired as implementation targets. A3 absorbs only light formation-history material; A4 absorbs the gentle interaction with God and the See Clearly handoff. Belief, meaning, expectation, fear, desire, and interpretation belong in See Clearly.

## Participant rhythm

Orient → narrative teaching → concrete example or contrast → recognition interaction → one or two reflection prompts → real-life practice → short carry-forward. Ordinary teaching paragraphs should contain two to five complete sentences. Questions follow explanation; interactions support the teaching. Awaken remains concise.

## A3 content boundary

Begin with one response the participant recognized in A2, chosen anew by the participant because A2's temporary map is not stored. Offer neutral source possibilities, including repeated experiences and “I'm not sure.” Let the participant choose or enter a possible source and a former function; do not infer either. Teach that a response may have been learned, modeled, reinforced, repeated, or chosen; what once helped may now operate automatically. Understanding history neither assigns blame nor excuses behavior, and certainty is unnecessary. Use an ordinary conflict/withdrawal example. End with practice noticing one recurring response and one or more possible sources. Do not diagnose, infer childhood causes or motives, or ask for deepest wounds or underlying beliefs.

## A4 content boundary

Teach that formation can influence a person without defining them. New life in Christ does not mean every learned response was instantly retrained; transformation can reach those patterns. Use identity-fused examples and a participant-controlled reframe: “I learned / tend / have been formed to ___, but this is not the whole truth of who I am.” Ground the new-creation frame only in approved curriculum source material. Keep reflection brief. Present NOTICE and NAME, with ASK and RECEIVE clearly optional; never imply a guaranteed answer or certify a thought as divine guidance. End with the explicit handoff: the participant is ready to examine what they believe and what is actually true in See Clearly.

## Design and release

Reuse the compact progress header, responsive width and typography, accessible disclosures, optional reflection behavior, and completed-lesson review established in A1/A2. A3 visually traces backward; A4 separates and reframes. Avoid card grids, clinical styling, and heavy graphics. Verify the complete A1–A4 journey, persistence, save/skip, resume, completion, revisit, and visuals at 375/768/1536 pixels before promotion. Do not begin See Clearly implementation in this pass.

## Persistence prerequisite

Existing database check constraints allowed only A1/A2 identifiers (`202609240001_deep_dive_a2_identifiers.sql`). The owner authorized an identifier-only expansion on 2026-09-25. Migration `202609250001_deep_dive_a3_a4_identifiers.sql` adds `awaken.your-reactions-have-a-history` and `awaken.formation-is-not-identity` to the module allowlist and distinct prompt IDs to the reflection allowlist. It preserves the A1/A2 identifiers and all existing RLS policies, ownership checks, and relationships.
