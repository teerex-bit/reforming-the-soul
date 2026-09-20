import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createPreviewServer } from './preview.mjs';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2] || 'final';
const output = path.join(project, 'docs/one-page-test', mode);
fs.mkdirSync(output, { recursive: true });
const profile = path.join(project, '.qa', `browser-${Date.now()}`);
const executable = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const server = createPreviewServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const route = process.env.OVERVIEW_ROUTE || '/awaken/lesson-1/';
const url = `http://127.0.0.1:${server.address().port}${route}`;
const child = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run',
  '--no-default-browser-check', '--disable-extensions', '--disable-background-networking',
  '--disable-component-update', '--disable-sync', '--metrics-recording-only',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  `--disk-cache-dir=${path.join(profile, 'cache')}`, `--crash-dumps-dir=${path.join(profile, 'crashes')}`,
  'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
let ws;
let original;
const sourceFile = path.join(project, 'src/awaken/lesson-1/index.html');
try {
  const endpoint = await new Promise((resolve, reject) => {
    let log = '';
    const timer = setTimeout(() => reject(new Error(`Browser startup timed out: ${log.slice(-2000)}`)), 20000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Browser exited ${code}: ${log.slice(-2000)}`)); });
    child.stderr.on('data', data => {
      log += data;
      const match = log.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
  });
  ws = new WebSocket(endpoint);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let nextId = 0;
  const pending = new Map();
  let events = [];
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const job = pending.get(message.id);
      if (job) { pending.delete(message.id); clearTimeout(job.timer); message.error ? job.reject(new Error(JSON.stringify(message.error))) : job.resolve(message.result); }
    } else events.push(message);
  };
  function send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timed out: ${method}`)); }, 15000);
      pending.set(id, { resolve, reject, timer });
      ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const command = (method, params) => send(method, params, sessionId);
  for (const domain of ['Page', 'Runtime', 'Network', 'Log', 'DOM', 'CSS']) await command(`${domain}.enable`);
  await command('Network.setCacheDisabled', { cacheDisabled: true });
  async function evaluate(expression) {
    const response = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
    return response.result.value;
  }
  async function inspect(width, label) {
    events = [];
    await command('Emulation.setDeviceMetricsOverride', { width, height: width > 1000 ? 1024 : 900, deviceScaleFactor: 1, mobile: false });
    await command('Page.navigate', { url });
    const start = Date.now();
    while (!events.some(e => e.method === 'Page.loadEventFired')) {
      if (Date.now() - start > 15000) throw new Error('Page load timed out');
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    await evaluate('document.fonts.ready.then(() => true)');
    const data = await evaluate(`(() => {
      const bounds = el => { const r=el.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}; };
      const all = selector => [...document.querySelectorAll(selector)];
      return {
        width: innerWidth, documentWidth: document.documentElement.scrollWidth,
        heading: document.querySelector('h1').innerText,
        headingBounds: bounds(document.querySelector('h1')),
        fontsReady: document.fonts.status,
        stylesheets: [...document.styleSheets].map(s => ({url:s.href,rules:s.cssRules.length})),
        images: all('img').map(el => ({url:el.src,loaded:el.complete&&el.naturalWidth>0,naturalWidth:el.naturalWidth,naturalHeight:el.naturalHeight,objectFit:getComputedStyle(el).objectFit,...bounds(el)})),
        controls: all('a,button').map(el => ({text:el.innerText||el.getAttribute('aria-label'),...bounds(el)})),
        sections: all('.lesson-header,.notice-section,.situation-grid,.bottom-notice,.lesson-navigation,.right-photo,.why-panel,.objectives-panel').map(el => ({name:el.className,...bounds(el)})),
        cards: all('.situation-card').map(el => ({...bounds(el),prompt:bounds(el.querySelector('.situation-card__prompt')),footer:bounds(el.querySelector('.situation-card__footer'))})),
        text: all('p,.objective').map(el => ({text:el.innerText.slice(0,65),className:el.className,fontSize:parseFloat(getComputedStyle(el).fontSize),...bounds(el)})),
        computedFonts:{heading:getComputedStyle(document.querySelector('h1')).fontFamily,body:getComputedStyle(document.body).fontFamily},
        lineBreakText: all('p,.objective').filter(el=>el.querySelector('br')).map(el=>{
          const copy=el.cloneNode(true);copy.querySelectorAll('br').forEach(br=>br.replaceWith(' '));
          const normalize=text=>text.replace(/\\s+/g,' ').trim();
          return {expected:normalize(copy.textContent),rendered:normalize(el.innerText)};
        }),
        textOverlaps: (()=>{
          const rects=[];const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
          const owners=new Map(); let ownerSequence=0;
          while(walker.nextNode()){
            const node=walker.currentNode;if(!node.textContent.trim())continue;
            const owner=node.parentElement;
            if(!owners.has(owner)) owners.set(owner, ++ownerSequence);
            const range=document.createRange();range.selectNodeContents(node);
            for(const r of range.getClientRects())if(r.width>0&&r.height>0)rects.push({ownerId:owners.get(owner),text:node.textContent.trim().slice(0,45),x:r.x,y:r.y,right:r.right,bottom:r.bottom});
          }
          const overlaps=[];
          for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){
            const a=rects[i],b=rects[j];
            if(a.ownerId===b.ownerId)continue;
            if(Math.min(a.right,b.right)-Math.max(a.x,b.x)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>2)overlaps.push({a,b});
          }
          return overlaps;
        })(),
        outsideViewport: all('body *').filter(el => {const r=el.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left < -1);}).map(el => ({tag:el.tagName,class:el.className,...bounds(el)})),
        cardColumns:(document.querySelector('.situation-grid') ? getComputedStyle(document.querySelector('.situation-grid')).gridTemplateColumns : null),
        pageColumns:(document.querySelector('.lesson-page') ? getComputedStyle(document.querySelector('.lesson-page')).gridTemplateColumns : null)
      };
    })()`);
    data.responses = events.filter(e => e.method === 'Network.responseReceived').map(e => ({url:e.params.response.url,status:e.params.response.status,type:e.params.type}));
    data.errors = events.filter(e => e.method === 'Runtime.exceptionThrown' || e.method === 'Network.loadingFailed' || (e.method === 'Log.entryAdded' && e.params.entry.level === 'error') || (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error')).map(e => ({method:e.method,details:e.params}));
    data.issues = [];
    if (data.documentWidth > width || data.outsideViewport.length) data.issues.push('Content extends outside viewport');
    if (data.images.some(i => !i.loaded)) data.issues.push('Image failed to decode');
    if (data.responses.some(r => r.status >= 400) || data.errors.length) data.issues.push('Browser/network errors');
    const expectedStylesheets = route.startsWith('/formation') ? 1 : 2;
    if (data.stylesheets.length !== expectedStylesheets) data.issues.push('Missing stylesheet');
    if (data.controls.some(c => c.width < 44 || c.height < 44)) data.issues.push('Tap target below 44px');
    if (data.cards.some(c => c.prompt.bottom > c.footer.y + 1)) data.issues.push('Card copy overlaps footer');
    if (data.text.some(t => t.fontSize < 14 && !['eyebrow','note-label','next-caption','header-label'].includes(t.className))) data.issues.push('Body text smaller than 14px');
    if (data.lineBreakText.some(t => t.expected !== t.rendered)) data.issues.push('Responsive line breaks join or change words');
    if (data.textOverlaps.length) data.issues.push('Text overlaps other text');
    const sections = data.sections.slice(0,5);
    if (sections.some((s,i) => i && s.y < sections[i-1].bottom-1)) data.issues.push('Main content sections overlap');
    const shot = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    fs.writeFileSync(path.join(output, `${label}-${width}.png`), Buffer.from(shot.data, 'base64'));
    await evaluate('document.querySelector("h1").scrollIntoView({block:"center"})');
    const headingShot = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(output, `${label}-${width}-heading.png`), Buffer.from(headingShot.data, 'base64'));
    fs.writeFileSync(path.join(output, `${label}-${width}.json`), JSON.stringify(data, null, 2));
    console.log(JSON.stringify({width,heading:data.heading,images:data.images.length,issues:data.issues,computedFonts:data.computedFonts}));
    return data;
  }
  let results = [];
  if (mode === 'edit-test') {
    original = fs.readFileSync(sourceFile);
    const text = original.toString('utf8');
    const edited = text.replace('>Where Did That Come From?</h1>', '>Where Did That Come From? — EDIT TEST</h1>');
    if (edited === text) throw new Error('Expected editable heading not found');
    fs.writeFileSync(sourceFile, edited);
    try {
      results.push(await inspect(1536, 'temporary-heading'));
      if (results[0].heading !== 'Where Did That Come From? — EDIT TEST') throw new Error('Heading edit not visible');
    } finally { fs.writeFileSync(sourceFile, original); }
    results.push(await inspect(1536, 'restored-heading'));
    if (results[1].heading !== 'Where Did That Come From?') throw new Error('Heading was not restored');
    if (!fs.readFileSync(sourceFile).equals(original)) throw new Error('Source bytes were not restored');
  } else {
    for (const width of [375, 768, 1536]) results.push(await inspect(width, mode));
  }
  fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify({mode,url,results:results.map(r=>({width:r.width,heading:r.heading,issues:r.issues}))},null,2));
  if (results.some(r => r.issues.length)) process.exitCode = 1;
  await send('Browser.close');
} finally {
  if (original) fs.writeFileSync(sourceFile, original);
  if (ws) ws.close();
  child.kill();
  await new Promise(resolve => server.close(resolve));
}
