# Reforming the Soul — Agent Instructions

These instructions apply to every agent working in this repository, including Codex.

## Primary Rule
The approved Reforming the Soul graphics are the design authority.

Implement them faithfully. Do not redesign them, simplify them, modernize them, reinterpret them, or substitute generic website patterns when an approved graphic already establishes the intended design.

## Site Purpose
This website is a public guided overview of the Reforming the Soul system. It is not the future comprehensive curriculum/LMS.

The public Soul Formation journey is:
1. Awaken
2. See Clearly
3. Become
4. Join

`Walk` / `Walk Daily` is no longer a standalone primary stage.

## Text Fidelity
Text visible in an approved source graphic is approved website copy.

- Move ordinary text out of raster graphics and into live HTML text.
- Preserve wording exactly unless a written project decision explicitly changes it.
- Do not rewrite, shorten, summarize, SEO-rephrase, or silently correct approved copy.
- If required copy is missing, use clearly marked placeholder copy or `Lorem ipsum`.
- If a missing text decision affects meaning, flag it instead of inventing final copy.

## Locked Brand Assets
- Use the supplied approved RTS logo. Never regenerate or reinterpret it.
- The Tree of Life is a curriculum-specific recognized symbol. Where it must be recognized as such, preserve the approved symmetry between roots and top/crown.
- The four journey icons are locked: Awaken, See Clearly, Become, Join.
- The Conversations page has its own approved logo/identity treatment.

## Visual Progression
- **Awaken:** strongly visual, minimal text, generous space.
- **See Clearly:** visual plus increasing explanation.
- **Become:** teaching-led with visual anchors and more substantial text.
- **Join:** integrated, mature use of text and imagery.

Do not standardize every section to the same image/text ratio.

## Color Rules
For every page:
- Record reusable solid colors as HEX values.
- Use the approved graphic as the color reference.
- Distinguish core brand colors from page-specific colors.
- Do not create near-duplicate colors caused by anti-aliasing, overlays, or compression.

Current working implementation values:
- Deep navy: `#06223A`
- Dark navy: `#031D32`
- Warm ivory: `#FAF6EF`
- Secondary ivory: `#F5EFE5`
- Gold accent: `#C88A31`
- Light gold: `#E1B45F`
- Primary dark text: `#13263A`

## Typography
- Serif: major statements, H1/H2, theological assertions, quotations, key questions.
- Sans serif: body copy, navigation, buttons, captions, labels, interface text.
- Script is an accent only where an approved treatment calls for it.

## Navigation
### Global site navigation
Used across Books, Music, Conversations, About, and other public sections.

### Soul Formation journey navigation
Four stages only: Awaken, See Clearly, Become, Join.

Desktop: persistent/sticky side navigation where the approved design calls for it.
Mobile: collapse the same hierarchy into a compact control.

This is orientation/navigation, not LMS completion tracking.

## Page 01 Decisions
For the Soul Formation landing page:
- Use the approved RTS logo.
- Use the four-stage journey only.
- Remove `Walk Daily` as a standalone stage.
- Remove the `Watch the Overview` button completely.
- Remove the `What You'll Experience` section for now.
- Preserve the right-hand navy formation sidebar.
- Preserve the closing navy statement section.
- Use live text for all ordinary copy.

## Implementation Principles
- Build responsive HTML/CSS/JS, not screenshot-based pages.
- Use semantic HTML.
- Keep text editable in source.
- Use CSS variables/tokens for repeated colors and spacing.
- Do not bake ordinary text into images.
- Prefer SVG or high-resolution transparent assets for logos/icons.
- Keep photography as raster images.
- Do not upscale low-resolution crops and present them as production assets.
- Avoid unrelated refactors.

## Repository / Deployment Rules
Current deployment target: Cloudflare Workers Static Assets.

Expected structure:
```text
/
  AGENTS.md
  package.json
  wrangler.jsonc
  public/
  docs/
```

Static files deploy from:
```text
./public
```

Deploy command:
```bash
npx wrangler deploy
```

Production branch:
```text
main
```

Do not change deployment architecture without documenting why and receiving approval.

## Git Discipline
Before making changes:
1. Read this file.
2. Read the relevant `docs/` files.
3. Inspect the current implementation and assets.
4. Identify the approved graphic/source for the page.
5. State what will change and what will remain untouched.

When implementing:
- Make focused commits.
- Avoid unrelated refactors.
- Preserve approved copy.
- Verify locally before pushing.
- After push, verify the Cloudflare deployment result when access is available.

## Definition of Done for a Page
A page is not complete until:
- desktop layout matches the approved graphic as closely as practical
- mobile layout preserves hierarchy and meaning
- approved copy is live text and matches exactly
- approved logos/icons are correct
- page HEX colors are documented
- navigation behavior is correct
- no removed/superseded element has reappeared
- there are no obvious broken images or overflow issues
- keyboard focus and basic accessibility are intact
- Cloudflare deployment succeeds
