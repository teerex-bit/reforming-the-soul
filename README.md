# Overview Website

This project is the simplified public overview version of Reforming the Soul. It currently contains the first finished movement, Awaken, with exactly two public formation pages: Pay Attention and Notice What Is Driving You. See Clearly has not been built.

The original 40-page site is preserved separately and remains unchanged. A verified backup is also preserved separately.

Approved shared logos, icons, images, fonts, and other visual assets may be referenced, but must not be altered without explicit instruction.

All future page edits for the overview must occur inside Overview Website. Any original pages selected as starting points must be copied here, never moved; the originals must remain intact.

Edit Page 1 at `src/awaken/lesson-1/index.html` and `src/assets/css/pages/awaken-lesson-1.css`. Edit Page 2 at `src/awaken/lesson-2/index.html` and `src/assets/css/pages/awaken-lesson-2-overview.css`. Shared CSS has an independent copy at `src/assets/css/curriculum.css`.

Run `npm run preview` (Node.js 22+) and open `http://127.0.0.1:4186/awaken/lesson-1/` or `/awaken/lesson-2/`. The preview reads editable source directly; no compilation or dependency installation is needed. `shared-assets.json` lists the original assets served read-only. This local asset mapping must be configured separately before any future hosting; no deployment is configured.

See `docs/one-page-test/REPORT.md` for the Page 1 provenance test and `docs/awaken-page-02-source-audit.md` for Page 2 provenance. See `docs/awaken-build-report.md` for the two-page build, responsive evidence, and original-file verification. Stop here pending review; do not begin See Clearly.
