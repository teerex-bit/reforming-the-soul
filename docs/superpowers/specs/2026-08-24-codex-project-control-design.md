# Reforming the Soul Codex Project Control Design

**Date:** 2026-08-24

## Goal
Create a permanent repository-resident instruction system so Codex can implement and deploy the Reforming the Soul website without repeatedly requiring manual transfer of project context.

## Problem
Design decisions currently exist across conversation history, source graphics, Drive assets, generated files, and verbal corrections. An implementation agent working only from GitHub could accidentally redesign approved pages, restore superseded stages, change approved text, or recreate locked brand assets.

## Solution
Store authoritative implementation rules directly in the repository:
- `AGENTS.md`
- `docs/brand-system.md`
- `docs/site-architecture.md`
- `docs/page-build-rules.md`
- `docs/deployment.md`

## Authority Order
When instructions conflict:
1. explicit current user instruction
2. `AGENTS.md`
3. approved page-specific source graphic and current page specification
4. other files in `docs/`
5. existing implementation
6. older mockups/historical files

## Locked Decisions
- Formation journey: Awaken → See Clearly → Become → Join.
- Walk / Walk Daily is not a standalone primary stage.
- Approved graphic text becomes live website text verbatim.
- Missing text uses placeholders or is flagged.
- Approved RTS logo is never regenerated.
- Tree of Life symmetry is preserved where recognition matters.
- Conversations preserves its own identity treatment.
- Four journey icons are locked.
- Visual-to-verbal progression is intentional.
- Page-specific HEX values are documented.
- Current website is an overview, not an LMS.
- Page 01 excludes `Watch the Overview`.
- Page 01 excludes `What You'll Experience`.
- Page 01 retains the right-side formation sidebar.

## Deployment Contract
The repository deploys through Cloudflare Workers Static Assets from `public/` with `npx wrangler deploy`.

The domain remains registered at GoDaddy. Cloudflare controls DNS. Google Workspace email records are protected from website deployment changes.

## Success Criteria
A new Codex session should be able to enter the repository, read `AGENTS.md` and the relevant docs, and accurately explain:
- what it may change
- what it must not redesign
- the four-stage structure
- the copy fidelity rule
- the deployment path
- how to verify a page before pushing
