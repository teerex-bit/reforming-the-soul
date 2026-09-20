# Become Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build five sequential Become overview pages and add them to the public doorway.

**Architecture:** Each page owns one HTML file and one page-specific CSS file beneath `public/become/`. Pages use ordinary links for a single forward path. The root doorway links to each page for review access.

**Tech Stack:** Static HTML5, CSS3, GitHub/Cloudflare Pages.

**Spec:** `docs/superpowers/specs/2026-09-20-become-overview-design.md`

## Global Constraints

- Use the Tree of Life logo.
- Use live HTML text, not text embedded in images.
- Mention the deeper curriculum only on the Become introduction.
- Keep the daily rhythm exactly: Release control → Receive the moment → Take the next right step → Repeat.
- Do not rename Become to Walk.
- Do not link to a missing Join route.
- Every page must be responsive at 375px, 768px, and desktop widths.

## Review Focus

- Every forward CTA resolves to the next page and never skips the pause page.
- No page accidentally repeats See Clearly teaching.
- The deeper-dive note is present on the introduction and absent elsewhere.
- Mobile layouts have no horizontal overflow.
- Doorway links resolve to all five pages.

---

### Task 1: Become introduction

**Files:**
- Create: `public/become/index.html`
- Create: `public/become/become.css`

- [ ] **Step 1: Write the failing live-route test**

Run:
```bash
curl -fsSL https://review.reformingthesoul.com/become/ | rg 'Become is where truth begins to take shape in the whole person'
```
Expected: FAIL because the route does not exist.

- [ ] **Step 2: Create the page and styles**

Include the overview/deeper-dive note, two explanatory parts, and one CTA to `/become/live-with-god/`.

- [ ] **Step 3: Verify**

Run:
```bash
curl -fsSL https://review.reformingthesoul.com/become/ | rg 'deeper curriculum|/become/live-with-god/'
curl -fsSI https://review.reformingthesoul.com/become/become.css | rg '200|text/css'
```

### Task 2: Live With God

**Files:**
- Create: `public/become/live-with-god/index.html`
- Create: `public/become/live-with-god/live-with-god.css`

- [ ] **Step 1: Write the failing route/content test**

Run:
```bash
curl -fsSL https://review.reformingthesoul.com/become/live-with-god/ | rg 'Release control.*Receive the moment.*Take the next right step.*Repeat'
```
Expected: FAIL.

- [ ] **Step 2: Create the page and styles**

Explain presence, listening, surrender, and the exact four-step rhythm. Link only to `/become/practice-forms-the-person/`.

- [ ] **Step 3: Verify route, exact rhythm, next link, and no deeper-curriculum copy.**

### Task 3: Practice Forms the Person

**Files:**
- Create: `public/become/practice-forms-the-person/index.html`
- Create: `public/become/practice-forms-the-person/practice.css`

- [ ] **Step 1: Write the failing route/content test**

Run:
```bash
curl -fsSL https://review.reformingthesoul.com/become/practice-forms-the-person/ | rg 'Practice forms the person'
```
Expected: FAIL.

- [ ] **Step 2: Create the pause page**

Show how repeated choices train the will, body, relationships, and soul. Link to `/become/whole-person/`.

- [ ] **Step 3: Verify it contains the bridge, the correct next link, and no menu/deeper-curriculum CTA.**

### Task 4: The Whole Person

**Files:**
- Create: `public/become/whole-person/index.html`
- Create: `public/become/whole-person/whole-person.css`

- [ ] **Step 1: Write the failing route/content test**

Assert the page contains Will, Body, Relationships, and Soul. Expected: FAIL.

- [ ] **Step 2: Create the page**

Give each dimension a concise explanation and show their integration under God. Link to `/become/fruit/`.

- [ ] **Step 3: Verify all four dimensions, next link, responsive stylesheet, and no overflow-prone fixed widths.**

### Task 5: Fruit

**Files:**
- Create: `public/become/fruit/index.html`
- Create: `public/become/fruit/fruit.css`

- [ ] **Step 1: Write the failing route/content test**

Assert the page contains `What a changed person looks like`. Expected: FAIL.

- [ ] **Step 2: Create the page**

Describe love, peace, patience, courage, freedom, and availability to God as visible fruit. Close by explaining that Join comes next, without linking to a missing route.

- [ ] **Step 3: Verify the six fruit themes and confirm there is no broken Join href.**

### Task 6: Navigation and doorway

**Files:**
- Modify: `public/see-clearly/integration/index.html`
- Modify: `public/index.html`

- [ ] **Step 1: Write the failing link tests**

Assert the integration page links to `/become/` and the doorway contains links to all five Become routes. Expected: doorway test FAIL.

- [ ] **Step 2: Add a Become section to the doorway**

List the introduction, Part 1, pause, Part 2, and Fruit in order.

- [ ] **Step 3: Run the full link/content verification**

Fetch all five routes and their CSS files; assert HTTP 200, correct content types, correct forward links, no Awaken references, no `Walk` stage label, and no broken Join link.

- [ ] **Step 4: Review at 375px, 768px, and desktop widths for overflow and hierarchy.**
