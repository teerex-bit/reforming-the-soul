# Codex Project Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install a permanent repository-resident project-control system that gives Codex the approved Reforming the Soul brand, architecture, page-build, and deployment rules before it edits the site.

**Architecture:** Put mandatory cross-cutting rules in root `AGENTS.md` and focused reference material under `docs/`. These files change agent behavior, not runtime behavior.

**Tech Stack:** Markdown, Git, existing HTML/CSS/JS site, Cloudflare Workers Static Assets

**Spec:** `docs/superpowers/specs/2026-08-24-codex-project-control-design.md`

## Global Constraints
- Approved graphics are the design authority.
- Journey is exactly Awaken → See Clearly → Become → Join.
- Approved source copy becomes live website copy verbatim unless explicitly revised.
- Approved RTS logo and four journey icons must not be regenerated or redesigned.
- Static production assets deploy from `./public`.
- Cloudflare deploy command is `npx wrangler deploy`.
- Google Workspace DNS records must not be altered by site-code work.

---

### Task 1: Install the agent instruction layer

**Files:**
- Create: `AGENTS.md`
- Create: `docs/brand-system.md`
- Create: `docs/site-architecture.md`
- Create: `docs/page-build-rules.md`
- Create: `docs/deployment.md`
- Create: `docs/superpowers/specs/2026-08-24-codex-project-control-design.md`

**Interfaces:**
- Consumes: current approved Reforming the Soul design decisions
- Produces: repository-local instructions for Codex and human implementers

- [ ] **Step 1: Copy the supplied files into the repository with paths preserved**

Expected tree:
```text
AGENTS.md
docs/
  brand-system.md
  site-architecture.md
  page-build-rules.md
  deployment.md
  superpowers/
    specs/
      2026-08-24-codex-project-control-design.md
```

- [ ] **Step 2: Verify the four-stage rule**
```bash
grep -n "Awaken" AGENTS.md docs/site-architecture.md
grep -n "Walk Daily" AGENTS.md docs/page-build-rules.md
```

Expected: four-stage rule is explicit; `Walk Daily` appears only as removed/superseded.

- [ ] **Step 3: Verify deployment rules**
```bash
grep -n "./public" AGENTS.md docs/deployment.md
grep -n "npx wrangler deploy" AGENTS.md docs/deployment.md
```

Expected: both commands return matching deployment references.

- [ ] **Step 4: Verify no placeholder markers**
```bash
grep -RniE 'TBD|TODO|FIXME' AGENTS.md docs || true
```

Expected: no output.

- [ ] **Step 5: Commit**
```bash
git add AGENTS.md docs
git commit -m "docs: add Reforming the Soul Codex project rules"
```

### Task 2: Validate the existing site against the project rules

**Files:**
- Inspect: `public/index.html`
- Inspect: `wrangler.jsonc`
- Inspect: `package.json`
- Create: `docs/page-01-gap-review.md`

**Interfaces:**
- Consumes: rules installed in Task 1
- Produces: a gap review before visual implementation changes

- [ ] **Step 1: Confirm static deployment directory**
```bash
cat wrangler.jsonc
```

Expected: static assets point to `./public`.

- [ ] **Step 2: Check Page 01 for superseded content**
```bash
grep -RniE 'Walk Daily|Watch the Overview|WHAT YOU.LL EXPERIENCE' public || true
```

Expected: none of these remain in the implementation.

- [ ] **Step 3: Check four required journey names**
```bash
for s in "AWAKEN" "SEE CLEARLY" "BECOME" "JOIN"; do
  grep -Rni "$s" public/index.html >/dev/null || echo "MISSING: $s"
done
```

Expected: no `MISSING:` output.

- [ ] **Step 4: Create `docs/page-01-gap-review.md`**
It must contain:
- source graphic used
- currently correct elements
- known visual mismatches
- missing high-resolution assets
- exact copy mismatches
- mobile issues
- next recommended implementation task

- [ ] **Step 5: Commit review**
```bash
git add docs/page-01-gap-review.md
git commit -m "docs: review Soul Formation page against approved design"
```

### Task 3: Verify repository readiness

**Files:**
- Read: `AGENTS.md`
- Read: all focused docs
- Read: `docs/page-01-gap-review.md`

**Interfaces:**
- Consumes: Tasks 1–2
- Produces: stable handoff for future Codex implementation sessions

- [ ] **Step 1: Check clean working tree**
```bash
git status --short
```

Expected: no output.

- [ ] **Step 2: Confirm latest commits**
```bash
git log -2 --oneline
```

Expected: project-rules commit and Page 01 review commit.

- [ ] **Step 3: Report readiness**
Codex reports:
- repository rules installed
- deployment configuration status
- Page 01 compliance status
- next concrete implementation task
- blockers requiring user approval

Do not begin redesign work during validation.
