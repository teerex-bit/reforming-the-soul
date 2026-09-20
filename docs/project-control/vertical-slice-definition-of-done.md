# Phase 1 Vertical Slice Definition of Done

The vertical slice is done only when every required statement below is true and linked to reproducible evidence. “An agent says it is complete,” screenshots alone, or mocked authorization do not satisfy this definition.

## Scope and architecture

- [ ] Only the approved vertical slice is implemented; backlog items remain absent.
- [ ] Primary journey is Awaken → See Clearly → Become → Join; no primary `Walk` stage exists.
- [ ] ADR-001 boundaries remain intact or every change has an approved ADR/log entry.
- [ ] Authored curriculum is versioned, validated, and separate from UI components.
- [ ] Exact user wording, structured formation data, AI-derived data, curriculum progress, and formation evidence remain distinct in storage, services, and UI.
- [ ] No combined spiritual/maturity/fruit score exists.

## Security and privacy

- [ ] Migrations apply from an empty local database.
- [ ] Every private table has forced RLS, least-privilege grants, ownership indexes, and anonymous/User A/User B test coverage.
- [ ] Server ownership checks return neutral not-found for cross-user IDs.
- [ ] Composite foreign keys prevent cross-owner child and link relationships.
- [ ] No service-role credential appears in a user request path or browser bundle.
- [ ] Journal, prompt, and AI response bodies are absent from audit, analytics, tracing, and error logs.

## Functional journey

- [ ] Account creation/sign-in/sign-out and later return work.
- [ ] Dashboard shows current stage, curriculum Resume, and unfinished practice without conflating them.
- [ ] Awaken saves what happened, what happened inside, and one body cue exactly.
- [ ] Reflect asks a precise non-diagnostic follow-up and saves only explicitly chosen insight.
- [ ] See Clearly separates observable fact from interpretation and records one belief or expectation.
- [ ] Become records control target, present truth, and next right step.
- [ ] Practice is saved open, survives leaving, returns, records outcome, is reviewed, and closes.
- [ ] History visibly separates original wording, structured records, and AI-derived artifacts.
- [ ] One selected prior entry is used only after explicit active permission.
- [ ] Revocation committed before dispatch authorization prevents the call; an already-authorized/dispatched call is not misrepresented as recallable; every later authorization is blocked.
- [ ] Source deletion removes all defined dependent AI artifacts and prevents future AI use.
- [ ] Unrelated curriculum progress and data remain after deletion.

## AI boundary

- [ ] All OpenAI calls are server-side, use `store:false`, use no tools, and omit prior history by default.
- [ ] Context is assembled from owned IDs and active grants at call time; the client cannot submit trusted historical text.
- [ ] Current/prior journal text is delimited and labeled as untrusted data.
- [ ] Explain/Reflect/Guide Me/Route contracts exist; only required Reflect UI is built.
- [ ] Refusal, incomplete, invalid structured output, timeout, and retry paths persist no partial/duplicate artifact.
- [ ] Prohibited-output and high-stakes safety fixtures pass.
- [ ] Full AI transcripts are not persisted.
- [ ] Actual deployment retention configuration and disclosure are documented before any deployed user test; until then deployment remains blocked even if local DoD passes.

## Quality and authority

- [ ] `shared-assets.json` dependency is removed under test; Overview source files remain unchanged; preview routes/assets pass.
- [ ] Final visual baselines derive from the restored Overview authority, not the old 41-page shell.
- [ ] Required tests in `docs/qa/phase-1-test-matrix.md` are green twice from clean database resets.
- [ ] Concurrency test passes 20 consecutive runs.
- [ ] 375px, 768px, and 1536px have no overflow, overlap, clipped controls, missing assets, or broken navigation.
- [ ] Keyboard-only completion, visible focus, labels, errors, headings, landmarks, contrast, and reduced-motion behavior pass.
- [ ] No critical or serious automated accessibility violation remains.
- [ ] Engineering lead has inspected the integrated diff, SQL/policies/functions, AI context/request capture, browser behavior, and evidence personally.

## Handoff and controls

- [ ] Every work package provides SHA, file list, test commands/results, risks, and scope-compliance statement.
- [ ] Architecture Decision Record, Decision/Change Log, Risk/Issue Log, Backlog, Current Project Status, data dictionary, and acceptance evidence are current.
- [ ] No unresolved blocker or critical risk remains for local prototype acceptance.
- [ ] Deployment-specific open risks are clearly separated from local completion and are not misreported as resolved.

Only the engineering lead may mark the slice complete after all checks above are evidenced.
