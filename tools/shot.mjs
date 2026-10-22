// Render one view of the flat to a PNG with headless Chromium.
// usage: node tools/shot.mjs <view> <out.png> [width] [height] [extra=query]
//   view = photo | top | any key of VIEWS in src/plan.js
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [view = 'photo', out = 'shot.png', wArg, hArg, extra = ''] = process.argv.slice(2);
const w = +(wArg || (view === 'top' ? 1381 : 1080));
const h = +(hArg || (view === 'top' ? 1284 : 607));

const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.hdr': 'application/octet-stream', '.exr': 'application/octet-stream',
  '.ktx2': 'application/octet-stream', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) {
    const idx = path.join(p, 'index.html');
    if (fs.existsSync(idx)) { res.writeHead(200, { 'content-type': 'text/html' }); return fs.createReadStream(idx).pipe(res); }
    res.writeHead(404); return res.end();
  }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch({
  executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? undefined : undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const page = await browser.newPage({ viewport: { width: w, height: h } });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
const url = `http://127.0.0.1:${port}/index.html?shot=1&view=${view}&w=${w}&h=${h}${extra ? '&' + extra : ''}`;
const t0 = Date.now();
await page.goto(url);
try {
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
} catch (e) {
  logs.push('[shot] timed out waiting for __ready');
}
const pieces = await page.evaluate(() => window.__pieces);
await page.locator('canvas').screenshot({ path: out });
console.log(`shot ${view} -> ${out} (${w}x${h}) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log('pieces:', JSON.stringify(pieces));
const interesting = logs.filter((l) => !l.includes('GPU stall') && !l.includes('Automatic fallback'));
if (interesting.length) console.log(interesting.slice(0, 30).join('\n'));
await browser.close();
server.close();
