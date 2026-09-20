# Overview Website

This project is the simplified public overview version of Reforming the Soul. It currently contains the first finished movement, Awaken, with exactly two public formation pages: Pay Attention and Notice What Is Driving You. See Clearly has not been built.

The original 40-page site is preserved separately and remains unchanged. A verified backup is also preserved separately.

Approved shared logos, icons, images, fonts, and other visual assets may be referenced, but must not be altered without explicit instruction.

All future page edits for the overview must occur inside Overview Website. Any original pages selected as starting points must be copied here, never moved; the originals must remain intact.

Edit Page 1 at `src/awaken/lesson-1/index.html` and `src/assets/css/pages/awaken-lesson-1.css`. Edit Page 2 at `src/awaken/lesson-2/index.html` and `src/assets/css/pages/awaken-lesson-2-overview.css`. Shared CSS has an independent copy at `src/assets/css/curriculum.css`.

Run `npm run preview` (Node.js 22+) and open `http://127.0.0.1:4186/awaken/lesson-1/` or `/awaken/lesson-2/`. The read-only preview serves the authoritative HTML, CSS, and approved assets directly from `src` through an explicit route allowlist; no external asset manifest, compilation, or dependency installation is needed. No deployment is configured.

See `docs/one-page-test/REPORT.md` for the Page 1 provenance test and `docs/awaken-page-02-source-audit.md` for Page 2 provenance. See `docs/awaken-build-report.md` for the two-page build, responsive evidence, and original-file verification. Stop here pending review; do not begin See Clearly.

## Phase 1 test harness

The harness is intentionally separate from feature implementation:

- `npm test` verifies the read-only Overview authority preview.
- `npm run test:harness` verifies environment safety boundaries.
- `npm run test:unit` runs deterministic Vitest unit tests with live OpenAI credentials prohibited.
- `npm run test:integration` requires `.env.test` and a running local Supabase stack, then proves queries execute as the real `authenticated` database role with an `auth.uid()` subject.
- `npm run test:db` runs pgTAP tests against local Supabase.
- `npm run test:e2e` runs Chromium at 375px, 768px, and 1536px.
- `npm run test:a11y` runs axe checks at those same viewports.
- `npm run test:all` is the complete CI gate.

Copy `.env.test.example` to the ignored `.env.test`, start local Supabase with Docker available using `npx supabase start`, obtain the local anon key from `npx supabase status`, and install Chromium with `npx playwright install chromium`. The environment verifier rejects hosted Supabase/PostgreSQL targets and any live OpenAI key. Never run destructive tests against shared or production infrastructure.
