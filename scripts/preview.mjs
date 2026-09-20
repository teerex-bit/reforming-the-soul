import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(project, 'src');
const config = JSON.parse(fs.readFileSync(path.join(project, 'shared-assets.json'), 'utf8'));
const localRoutes = new Map([
  ['/', 'index.html'],
  ['/index.html', 'index.html'],
  ['/formation', 'formation/index.html'],
  ['/formation/', 'formation/index.html'],
  ['/formation/index.html', 'formation/index.html'],
  ['/overview', 'overview/index.html'],
  ['/overview/', 'overview/index.html'],
  ['/overview/index.html', 'overview/index.html'],
  ['/review', 'review/index.html'],
  ['/review/', 'review/index.html'],
  ['/review/index.html', 'review/index.html'],
  ['/awaken/lesson-1', 'awaken/lesson-1/index.html'],
  ['/awaken/lesson-1/', 'awaken/lesson-1/index.html'],
  ['/awaken/lesson-1/index.html', 'awaken/lesson-1/index.html'],
  ['/awaken/lesson-2', 'awaken/lesson-2/index.html'],
  ['/awaken/lesson-2/', 'awaken/lesson-2/index.html'],
  ['/awaken/lesson-2/index.html', 'awaken/lesson-2/index.html'],
  ['/see-clearly', 'see-clearly/index.html'],
  ['/see-clearly/', 'see-clearly/index.html'],
  ['/see-clearly/index.html', 'see-clearly/index.html'],
  ['/assets/css/curriculum.css', 'assets/css/curriculum.css'],
  ['/assets/css/pages/awaken-lesson-1.css', 'assets/css/pages/awaken-lesson-1.css'],
  ['/assets/css/pages/awaken-lesson-2-overview.css', 'assets/css/pages/awaken-lesson-2-overview.css'],
  ['/assets/css/pages/formation-introduction.css', 'assets/css/pages/formation-introduction.css'],
  ['/assets/css/pages/overview-statement.css', 'assets/css/pages/overview-statement.css'],
  ['/assets/css/review-switcher.css', 'assets/css/review-switcher.css'],
  ['/assets/images/formation-intro-hero.png', 'assets/images/formation-intro-hero.png'],
  ['/assets/images/awaken-01-forest-clearing.png', 'assets/images/awaken-01-forest-clearing.png'],
  ['/assets/images/awaken-02-still-lake.png', 'assets/images/awaken-02-still-lake.png'],
  ['/assets/logos/rts-tree-wordmark.png', 'assets/logos/rts-tree-wordmark.png'],
  ['/assets/icons/rts-stage-awaken.svg', 'assets/icons/rts-stage-awaken.svg'],
  ['/assets/icons/rts-stage-see-clearly.svg', 'assets/icons/rts-stage-see-clearly.svg'],
  ['/assets/icons/rts-stage-become.svg', 'assets/icons/rts-stage-become.svg'],
  ['/assets/icons/rts-stage-join.svg', 'assets/icons/rts-stage-join.svg'],
]);
const sharedRoutes = new Map(config.files.map(file => [`/assets/${file}`, path.join(config.root, file)]));
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };

export function createPreviewServer() {
  return http.createServer((request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end('Read-only preview');
      return;
    }
    const route = new URL(request.url, 'http://127.0.0.1').pathname;
    if (route === '/favicon.ico') { response.writeHead(204).end(); return; }
    const local = localRoutes.get(route);
    const file = local ? path.join(source, local) : sharedRoutes.get(route);
    if (!file) { response.writeHead(404).end('Not included in this one-page preview'); return; }
    fs.readFile(file, (error, data) => {
      if (error) { response.writeHead(404).end('Missing file'); return; }
      response.writeHead(200, { 'Content-Type': mime[path.extname(file)], 'Cache-Control': 'no-store' });
      response.end(request.method === 'HEAD' ? undefined : data);
    });
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.OVERVIEW_PORT || 4186);
  const server = createPreviewServer();
  server.listen(port, '127.0.0.1', () => console.log(`Overview Website: http://127.0.0.1:${port}/awaken/lesson-1/`));
}
