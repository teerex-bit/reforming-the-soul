# RTS Overview Source Design-System Audit

- Status: Approved design baseline
- Date: 2026-09-20
- Source branch: `overview-review` at `26ebefc`
- Design authority: `/overview/`, reinforced by Formation and Awaken
- Excluded as authority: old 41-page shell and the repository's working-page directory landing

## Audit conclusion

The Overview site has a coherent editorial language: large Georgia statements, highly readable Arial body/UI copy, warm ivory fields, deep navy contrast, green stage/action accents, gold hairlines, purposeful landscape imagery, and unusually generous section rhythm. The app should preserve those relationships while adding forms and stateful controls that the public site does not yet contain.

Do not copy every raw stylesheet value. Later stage pages drift in color, header geometry, and breakpoints, and the Formation stylesheet contains append-only overrides. Canonize the Overview baseline plus shared intent.

## Canonical tokens for the prototype

```css
:root {
  --color-navy: #06223a;
  --color-navy-deep: #031d32;
  --color-ivory: #faf6ef;
  --color-ivory-secondary: #f5efe5;
  --color-paper: #fffdfa;
  --color-gold: #c88a31;
  --color-green: #607c43;
  --color-text: #13263a;
  --color-line: #ded8cf;
  --color-sage: #e9eee3;

  --font-display: Georgia, "Times New Roman", serif;
  --font-body: Arial, Helvetica, sans-serif;

  --content-reading: 46rem;
  --content-editorial: 70rem;
  --content-wide: 100rem;

  --gutter-mobile: 1.375rem;
  --gutter-page: clamp(2.5rem, 7vw, 7rem);
  --section-space: clamp(4rem, 8vw, 8rem);

  --radius-control: 0.5rem;
  --radius-panel: 0.625rem;
  --focus-ring: 0 0 0 3px var(--color-gold);
}
```

The exact space scale should be consolidated during component implementation, but the macro rhythm is fixed: desktop horizontal insets generally fall between 7–8vw, section vertical padding between 62–138px, and mobile gutters remain 22px.

## Typography

| Role | Canonical behavior | Source evidence |
| --- | --- | --- |
| Major statement / question | Georgia 400, tight line height, responsive scale | Overview H1 `clamp(3.2rem,7vw,7rem)/.98`; Awaken H1 up to 6.8rem; stage hero H1s 6–9rem |
| Section heading | Georgia 400, about 2.7–5rem desktop | Formation, See Clearly, Become |
| Reflective/scriptural text | Georgia italic, generous 1.4–1.75 line height | Scripture rules and callouts across Formation/Awaken |
| Body | Arial 16–18px, 1.55–1.75 line height | Overview body `17px/1.75`; stage pages use comparable values |
| Eyebrow / operational label | Arial bold uppercase, 11–12px, 0.14–0.22em tracking | `.eyebrow`, header labels, context nav |
| Button | Arial bold uppercase, 12px, clear action verb | Later page CTAs and context controls |

One-line display statements are reserved for emphasis. Teaching remains in complete paragraphs with readable line lengths.

## Layout and content widths

- Wide editorial canvas: maximum 1600px.
- Reading text: approximately 720–850px.
- Overview statement: 850px with a 3px gold left rule.
- Two-column editorial layout: usually 0.9/1.1 or 1/1 with 60–125px responsive gap.
- App forms should use the reading width, not stretch across the full canvas.
- Dashboard information must use a small number of large editorial regions, not a dense card grid.

## Hero grammar

The app may use two hero variants:

1. Scenic hero: full-bleed image, live text, warm-to-transparent veil, optional deep-navy grounding near the bottom. Use for stage/session orientation, not every screen.
2. Editorial hero: warm or navy field with a large live question/statement and one restrained motif. Use for bridges, return, and history orientation.

Desktop scenic heroes are generally 590–840px tall. Mobile heroes shift to a vertical veil and 680–720px where imagery remains important. Text is never baked into imagery.

## Panels, cards, and controls

The shared panel language is a thin neutral border, a 2–3px gold accent, generous padding, very light surface contrast, and little or no shadow. Geometry varies in source pages, so Phase 1 standardizes only:

- `ReflectionPanel`: reading-width field group with visible label, prompt, help, save status, and error region.
- `ChoicePanel`: optional selectable structured value; never disguises an interpretation as fact.
- `PracticePanel`: shows state, planned next step, leave/return expectation, and return action.
- `ProvenancePanel`: separates User wording, Structured record, and AI-derived suggestion.
- `StagePanel`: stage identity and transition context; not a generic course card.

Controls must have a 44px minimum target, persistent labels, visible gold focus, clear errors, and calm saved/saving states. Textareas grow with content and preserve paragraphs. AI opens inline or as an adjacent editorial panel; no floating chat bubble and no generic message-app chrome.

## Navigation

- Global formation wordmark: approved Tree of Life asset.
- Four-stage identity: approved Awaken, See Clearly, Become, Join icons.
- App shell: compact wordmark header plus stage/resume context; do not copy the old curriculum sidebar.
- Context navigation may reuse the Overview breadcrumb/back-bar intent.
- On mobile, navigation stacks or becomes a labeled disclosure without horizontal overflow.

## Responsive system

The source uses fragmented thresholds. The prototype uses intent-based breakpoints:

| Width | Required behavior |
| --- | --- |
| ≤ 639px | One column, 22px gutters, full-width primary actions, no hidden horizontal stage rail |
| 640–899px | Tablet single-column or balanced two-column only when both regions remain readable |
| 900–1199px | Compact desktop; secondary panels may sit beside content when at least 320px wide |
| ≥ 1200px | Full editorial composition with wide rhythm and bounded reading columns |

Acceptance screenshots are fixed at 375px, 768px, and 1536px. Every one must show no horizontal overflow, clipped control, overlap, or meaning loss.

## Source evidence

- Overview: `public/overview/index.html`, `public/assets/css/pages/overview-statement.css`
- Formation: `public/formation/index.html`, `public/assets/css/pages/formation-introduction.css`
- Awaken: `public/awaken/lesson-1/index.html`, `public/awaken/lesson-2/index.html`, page CSS under `public/assets/css/pages/`
- See Clearly: `public/see-clearly/index.html`, `public/see-clearly/see-clearly-overview.css`
- Become: `public/become/*.html`, `public/become/become.css`
- Context navigation: `public/assets/css/overview-context-nav.css`
- Formation brand: `public/assets/logos/rts-tree-wordmark.png`, `public/assets/icons/rts-stage-*.svg`

## Findings that must not be canonized

1. See Clearly and Become near-duplicate palettes that drift from Overview.
2. Header heights from 82px to 112px and wordmarks from 195px to 280px.
3. Page-specific breakpoint proliferation between 560px and 1080px.
4. Repeated late overrides in `formation-introduction.css`.
5. Page-specific card shapes presented as one universal component.
6. The `/` working-page directory palette and card layout.
7. The old 41-page curriculum shell or sidebar.

## Preview-authority limitation and resolution

The branch's documented `npm run preview` currently fails because `scripts/preview.mjs` synchronously requires `shared-assets.json`. History and branch inspection found no source-controlled copy and no repository generator. The manifest was manually configured machine-local input for an earlier shared-original-assets workflow, not a generated or source-controlled artifact. Every `/assets/...` reference in the current `src` authority tree has an exact project-local file under `src/assets`; there are no referenced-but-missing assets.

Therefore `shared-assets.json` should not exist on this branch, has no canonical repository location, and must not be recreated with a machine-specific root. Task 0 of the implementation plan will test-first remove the obsolete manifest dependency and serve the existing project-local authority assets without changing the Overview source. Restoration requires successful module import, every existing route test, every referenced asset returning successfully, traversal protection, and GET/HEAD-only behavior. Until that task passes, visual-regression screenshots are exploratory and non-authoritative.
