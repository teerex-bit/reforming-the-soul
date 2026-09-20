# Phase 1 Automated Test Matrix

Status values during implementation: `RED`, `GREEN`, `BLOCKED`, `N/A-approved`. Every row below is mandatory unless the engineering lead and product owner record an approved change.

| ID | Layer | Behavior | Essential assertion |
| --- | --- | --- | --- |
| TM-AUTH-01 | E2E | Sign-up/sign-in/sign-out | Protected session starts and terminates correctly |
| TM-AUTH-02 | Unit/E2E | Actor source | Caller cannot override actor with request data |
| TM-AUTH-03 | E2E | Protected routes | Anonymous/expired session fails closed |
| TM-AUTH-04 | E2E | Two simultaneous users | Cookies and data do not cross |
| TM-AUTH-05 | Unit | Credential boundary | Service-role module is unreachable from user request graph |
| TM-SEC-01 | SQL | RLS inventory | Every private table has forced RLS and policies |
| TM-SEC-02 | SQL | Read isolation | Anonymous/B cannot select A rows |
| TM-SEC-03 | SQL | Insert isolation | B cannot insert rows owned by A |
| TM-SEC-04 | SQL | Update isolation | B cannot update A rows or change ownership |
| TM-SEC-05 | SQL | Delete isolation | B cannot delete A rows |
| TM-SEC-06 | Integration | Server ownership | Service rejects cross-user IDs as neutral not-found |
| TM-SEC-07 | SQL | Composite ownership | A child cannot reference a B parent |
| TM-SEC-08 | SQL | Same-owner links | Both link endpoints must share `user_id` |
| TM-SEC-09 | SQL | Audit immutability | Browser roles cannot forge/change/delete audit events |
| TM-SEC-10 | SQL | Definer hardening | Fixed safe search path, qualified objects, safe owner, PUBLIC/anon execute revoked |
| TM-SEC-11 | SQL | Owner bypass denial | Owner cannot directly delete journal, insert return, or mutate protected states |
| TM-SEC-12 | Integration | IDOR service matrix | Every ID-bearing service gives neutral missing/other-owner response |
| TM-SEC-13 | SQL | Relationship inventory | Every owned FK/link pair enforces same owner, immutability, and approved delete action |
| TM-SEC-14 | Harness | Real auth roles | A/B tests use actual anon/authenticated JWT role context, not table owner/service role |
| TM-SEC-15 | SQL | Grant/source binding | Same-user grant for Entry A cannot authorize/cite Entry B |
| TM-SEC-16 | SQL/Integration | Journal immutability | Saved source wording cannot be updated or silently rewrite artifact provenance |
| TM-CURR-01 | Unit | Stage enum | Only Awaken, See Clearly, Become, Join validate |
| TM-CURR-02 | Unit | Content shape | Seed nodes, parents, order, interactions validate |
| TM-CURR-03 | Unit | Rendering | Node kind chooses generic renderer, not route prose |
| TM-CURR-04 | Integration | Start/resume | Last incomplete interaction resumes after return |
| TM-CURR-05 | Integration | Progress isolation | Formation writes do not imply curriculum completion |
| TM-CURR-06 | Integration | Evidence isolation | Curriculum completion creates no score/evidence |
| TM-CURR-07 | Integration | Version binding | State points to active immutable curriculum version |
| TM-CURR-08 | E2E | Dashboard | Current stage, Resume, and unfinished practice coexist |
| TM-LINK-01 | Unit/SQL | Awaken→See Clearly | Typed link resolves valid owned endpoints |
| TM-LINK-02 | Unit/SQL | See Clearly→Become | Typed link resolves valid owned endpoints |
| TM-LINK-03 | SQL | Invalid topology | Missing/multiple/cross-owner endpoints rejected |
| TM-LINK-04 | E2E | Cross-stage context | Bridge shows lineage without copying/relabelling text |
| TM-LIFE-01 | Unit | Allowed transitions | Every approved edge succeeds |
| TM-LIFE-02 | Unit | Forbidden transitions | Every non-edge fails |
| TM-LIFE-03 | SQL | Direct mutation | Authenticated browser cannot update state directly |
| TM-LIFE-04 | SQL/Integration | Atomic return | Return insert and ready state commit/rollback together |
| TM-LIFE-05 | E2E | Leave/return | Open practice survives sign-out and reauthentication |
| TM-LIFE-06 | E2E | Review/close | Outcome is saved, reviewed, and closed |
| TM-LIFE-07 | Integration | Conflict UX data | Failed transition preserves submitted outcome for retry |
| TM-LIFE-08 | Integration | Independent resume | Practice priority does not overwrite curriculum pointer |
| TM-CONC-01 | SQL | Row lock | Two same-version transitions yield one success |
| TM-CONC-02 | Integration | Stale version | Stale `lock_version` fails with typed conflict |
| TM-CONC-03 | Integration | Idempotent retry | Same transition intent creates no duplicate return |
| TM-CONC-04 | Stress | Repeatability | Race test passes at least 20 consecutive runs |
| TM-AI-01 | Unit | Default context | No prior entry is included by default |
| TM-AI-02 | Integration | No permission | Requested prior ID causes no provider call |
| TM-AI-03 | Integration | Active permission | Exactly selected owned entry enters labeled context |
| TM-AI-04 | Integration | Cross-user source | No provider call and neutral unavailable result |
| TM-AI-05 | Integration | Revocation | Future call excludes revoked entry |
| TM-AI-06 | Integration | Revoke/send race | Server re-check prevents stale client grant use |
| TM-AI-07 | Unit | Untrusted input | Journal directives remain inside data delimiters |
| TM-AI-08 | Adapter | Storage/tools | Request has `store:false` and no tools |
| TM-AI-09 | Unit | Reflect contract | Returns 1–3 precise non-diagnostic questions |
| TM-AI-10 | Unit | Structured output | Extra/invalid fields are rejected, not fallback-parsed |
| TM-AI-11 | Integration | Refusal | No artifact is stored; authored flow remains usable |
| TM-AI-12 | Integration | Incomplete response | No partial artifact is stored |
| TM-AI-13 | Integration | Timeout/error | No duplicate/artifact/body log; safe retry offered |
| TM-AI-14 | Integration | Idempotency | Retry cannot duplicate thread/artifact |
| TM-AI-15 | Regression | Prohibited claims | Diagnosis, divine claim, calling, hidden motive, score, unsafe reconciliation fail policy |
| TM-AI-16 | Regression | High-stakes safety | Appropriate stop/escalation without diagnosis or invented locale data |
| TM-AI-17 | Unit | Explain contract | Approved teaching context only; no unsolicited life interpretation |
| TM-AI-18 | Unit | Guide Me contract | Approved stepwise process, agency, and high-stakes pause |
| TM-AI-19 | Unit | Route contract | Reasoned stage suggestions; no automatic state change |
| TM-AI-20 | Integration | Dispatch race | Barrier tests prove the documented revocation authorization point |
| TM-AI-21 | Static/build | Server-only boundary | SDK imports only in server/ai; client cannot submit trusted history/provider IDs/tools |
| TM-AI-22 | Integration | Storage census | Success/failure/retry store no transcript/prompt/response/provider conversation ID |
| TM-AI-23 | Integration | Complete provenance | Saved artifact includes all source/grant/curriculum/policy/model/schema versions |
| TM-AI-24 | SQL/Integration | Re-grant concurrency | Revoked row stays immutable; one new active grant wins concurrent re-grant |
| TM-PROV-01 | Unit/E2E | Exact wording | Original user text is rendered unchanged |
| TM-PROV-02 | E2E | Structured label | User-created structured data is distinct from journal text |
| TM-PROV-03 | E2E | AI label | AI suggestion is visibly identified |
| TM-PROV-04 | E2E | Confirmed AI | Confirmation retains AI origin metadata |
| TM-PROV-05 | Integration | Source record | Artifact dependencies name source/grant revisions |
| TM-PROV-06 | E2E | No transcript | History cannot reconstruct full AI exchange |
| TM-PROV-07 | E2E | No score | Progress/evidence is never combined into maturity score |
| TM-PROV-08 | Integration | Log redaction | Logs/audits omit journal, prompt, and response bodies |
| TM-DEL-01 | SQL | Owned source deletion | Journal source is hard-deleted atomically |
| TM-DEL-02 | SQL | Artifact dependency | All artifacts depending on source are deleted |
| TM-DEL-03 | SQL | Grant cleanup | Entry grants are removed/revoked per function contract |
| TM-DEL-04 | SQL | Structured/link cleanup | Only defined dependents are removed/unlinked |
| TM-DEL-05 | Integration | Future AI access | Deleted source can never enter later context |
| TM-DEL-06 | Integration | Progress preservation | Curriculum version/state/resume remain unchanged |
| TM-DEL-07 | Integration | Unrelated data | Other entries, practices, and artifacts remain |
| TM-DEL-08 | E2E | History refresh | Deleted source/dependents disappear; audit exposes no text |
| TM-DEL-09 | Integration | Delete/AI race | Delete before authorization blocks use; post-authorization save cannot orphan artifact |
| TM-A11Y-01 | Automated/manual | Landmarks/headings | One main, sensible heading order |
| TM-A11Y-02 | Automated | Labels/descriptions | Every control has persistent accessible name/help/error |
| TM-A11Y-03 | Manual/E2E | Keyboard flow | Entire slice completes without pointer |
| TM-A11Y-04 | E2E | Focus | Visible focus and logical order throughout |
| TM-A11Y-05 | Automated | Contrast | Text/control/focus contrast meets WCAG AA |
| TM-A11Y-06 | Automated | Errors/status | Errors linked; async status announced appropriately |
| TM-A11Y-07 | E2E | Dialog/confirmation | Focus management works for deletion confirmation |
| TM-A11Y-08 | E2E | Reduced motion | No required meaning or obstruction from motion |
| TM-A11Y-09 | Automated | Axe | Zero critical/serious violations on every slice route |
| TM-RESP-01 | E2E 375 | Mobile geometry | No horizontal overflow or overlap; actions usable |
| TM-RESP-02 | E2E 768 | Tablet geometry | Readable single/balanced layout; no clipping |
| TM-RESP-03 | E2E 1536 | Desktop geometry | Bounded editorial widths and intended composition |
| TM-RESP-04 | E2E all | Navigation | No broken route; mobile stage navigation remains labeled |
| TM-RESP-05 | E2E all | Assets | Wordmark, stage icons, and required images return 200 |
| TM-RESP-06 | E2E all | Dynamic content | Long text/error/saving states do not overlap |
| TM-RESP-07 | Visual/manual | Authority fidelity | Approved Overview tokens/grammar retained |
| TM-RESP-08 | Preview | Baseline provenance | Overview authority preview and asset tests are green |
| TM-E2E-01 | E2E | Exact vertical slice | All 24 required steps pass in sequence |
| TM-E2E-02 | E2E | Clean repeat | Slice passes twice after independent database resets |
| TM-E2E-03 | E2E | User B isolation | B sees none of A's content/progress/practice metadata |
| TM-E2E-04 | E2E | No mission creep | Only approved routes/features are reachable |

## Execution tiers

- **On each commit:** affected unit tests plus typecheck/lint.
- **On each package handoff:** affected unit, SQL/integration, and focused E2E suites.
- **On integration:** clean database reset, all unit/SQL/integration/E2E/a11y/responsive tests.
- **Before completion claim:** repeat full suite; 20-run concurrency test; human keyboard and three-viewport review; engineering-lead SQL/prompt/diff inspection.

The main automated suite uses a deterministic OpenAI adapter. A live-provider contract smoke test, if run, uses synthetic non-sensitive content and is not a substitute for the deterministic regression suite.

## Visual-regression evidence contract

After TM-RESP-08 is green, Playwright captures named states at all three projects: `dashboard-resume`, `awaken-observation`, `ai-reflect`, `see-clearly`, `become-practice`, `practice-return`, `history-provenance`, and `delete-confirmation`. Filenames are `<state>--<project>.png`. Automated pixel comparison detects unintended drift, while the engineering lead's human comparison to the restored Overview authority decides fidelity. Baselines are committed with the test that produces them; re-baselining requires a documented design decision or an evidenced defect fix and engineering-lead approval. An agent may not accept a diff by updating snapshots alone.
