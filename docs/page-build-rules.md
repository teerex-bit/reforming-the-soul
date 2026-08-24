# Page Build Rules

## Source of Truth
Every page begins with an approved graphic/mockup.

The approved graphic defines composition, hierarchy, copy, imagery, spacing intent, icons, section relationships, and color relationships.

## Conversion Model
Build using this priority:
1. Live HTML text
2. Native HTML/CSS layout
3. Reusable approved assets
4. Composite raster artwork only where separation provides no benefit

Do not use a full-page PNG as the production page.

## Text
All ordinary copy becomes live HTML.

Do not rewrite, shorten, summarize, SEO-rephrase, silently correct, or add final copy without approval.

For missing copy:
- use `Lorem ipsum` for visual testing where meaning is irrelevant
- otherwise flag the content decision

## Images
Keep photography/complex scenes as raster.
Prefer SVG or high-resolution transparent files for logos/icons/simple marks.

Never upscale a tiny screenshot crop and treat it as a production asset.

## Responsive Behavior
Preserve hierarchy and meaning, not fixed screenshot coordinates.

Desktop should closely match the approved composition.

Mobile should reflow rather than shrink, preserve content order, avoid horizontal overflow, keep icons meaningful, and retain generous spacing.

## Sidebar
Within Soul Formation:
- four stages only
- sticky/persistent on desktop where appropriate
- compact/collapsible on mobile
- no LMS completion mechanics

## Page 01 — Soul Formation Landing
### Header
- approved RTS logo
- live navigation
- live primary CTA

### Hero
Live text includes:
- `SOUL FORMATION`
- `Formation that changes the way you see.`
- `A journey from inherited faith to a lived relationship with God.`
- approved body copy
- `BEGIN WITH AWAKEN`

Removed:
- `WATCH THE OVERVIEW`

### Formation sidebar
Preserve right-side navy sidebar.

### Journey
Use:
- Awaken
- See Clearly
- Become
- Join

Remove:
- Walk Daily

### Removed section
`WHAT YOU'LL EXPERIENCE` is removed for now.

### Closing
Preserve dark navy closing statement and CTA treatment.

## Per-Page Build Note
Each implemented page should document:
```text
Source graphic:
Route:
Status:
Desktop reviewed:
Mobile reviewed:

HEX:
- background:
- text:
- accent:
- button:
- sidebar:

Assets:
- ...

Live copy changes from source:
- none / approved list
```

## Accessibility Baseline
- semantic heading order
- meaningful alt text
- empty alt text for decorative images
- visible keyboard focus
- sufficient contrast
- actual buttons/links
- no interaction dependent only on hover
