'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const make = require('../scripts/make-samples.cjs');
const core = require('../png-core.js')();
const root = path.resolve(__dirname, '..');
const run = process.env.PNG_CHECK_RUN_DIR || path.join(root, 'runs');
fs.mkdirSync(run, { recursive: true });
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png' };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, bytes) => { if(err) res.writeHead(404).end(); else { res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); res.end(bytes); } });
});
async function pixels(page) {
  return page.evaluate(async () => {
    const image = document.getElementById('image'); await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
    const hash = await crypto.subtle.digest('SHA-256', ctx.getImageData(0, 0, canvas.width, canvas.height).data);
    return Array.from(new Uint8Array(hash), b=>b.toString(16).padStart(2,'0')).join('');
  });
}
(async () => {
  await new Promise(resolve=>server.listen(0, '127.0.0.1', resolve));
  const httpBase = `http://127.0.0.1:${server.address().port}`;
  const options = process.env.CI ? {} : { channel: process.env.PNG_CHECK_BROWSER || 'chrome' };
  const browser = await chromium.launch({ ...options, headless: true });
  const results = { tool:'PNG Share Check', createdAt:new Date().toISOString(), browser:browser.version(), cases:[] };
  try {
    for (const mode of ['http', 'file']) {
      const context = await browser.newContext({ viewport:{ width:1440, height:1000 }, acceptDownloads:true });
      const page = await context.newPage(), external = [], errors = [];
      await page.route('**/*', async route=>{ const u = route.request().url(); if(u.startsWith(httpBase) || u.startsWith('file:') || u.startsWith('blob:') || u.startsWith('data:')) return route.continue(); external.push(u); return route.abort(); });
      page.on('pageerror', e=>errors.push(e.message));
      await page.goto(mode === 'http' ? httpBase : pathToFileURL(path.join(root,'index.html')).href);
      await page.locator('#demo').click();
      await page.getByRole('heading', {name:'Editable scene found'}).waitFor();
      await page.locator('#clean:enabled').waitFor();
      assert.match(await page.locator('.scene-text').textContent(), /Synthetic note outside/);
      const before = await pixels(page);
      if(mode === 'http') await page.screenshot({ path:path.join(run,'desktop-original.png'), fullPage:true });
      if(mode === 'http' && process.env.PNG_CHECK_UPDATE_SCREENSHOTS === '1') await page.screenshot({path:path.join(root,'assets','inspection.jpg'), type:'jpeg', quality:88, fullPage:true});
      await page.locator('#clean').click();
      await page.locator('#download:enabled').waitFor();
      await page.getByRole('heading', {name:'No targeted metadata found'}).waitFor();
      assert.equal(await pixels(page), before);
      await page.locator('#proof').evaluate(el=>el.open=true);
      assert.match(await page.locator('#proof-body').textContent(), /Identical IDAT SHA-256/);
      if(mode === 'http') await page.screenshot({ path:path.join(run,'desktop-cleaned.png'), fullPage:true });
      const dl = page.waitForEvent('download'); await page.locator('#download').click(); const download = await dl;
      const output = path.join(run,`cleaned-${mode}.png`); await download.saveAs(output);
      const original = fs.readFileSync(path.join(root,'samples','diagram-with-scene.png'));
      const verified = await core.clean(original);
      assert.deepEqual(fs.readFileSync(output), Buffer.from(verified.bytes));
      const reportDownload = page.waitForEvent('download'); await page.locator('#report').click(); const report = await reportDownload;
      const reportPath = path.join(run,`report-${mode}.json`); await report.saveAs(reportPath);
      assert.deepEqual(JSON.parse(fs.readFileSync(reportPath)), core.report(verified));
      await page.locator('#file').setInputFiles(output);
      await page.locator('#clean:enabled').waitFor();
      assert.equal(await pixels(page), before);
      assert.match(await page.locator('#summary').textContent(), /^0 text/);
      const evil = make.insert(make.makePng(), 'tEXt', make.scenePayload(['<img src="https://evil.invalid/probe" onerror="window.pwned=1">']));
      await page.locator('#file').setInputFiles({name:'synthetic-injection.png', mimeType:'image/png', buffer:evil});
      await page.getByRole('heading', {name:'Editable scene found'}).waitFor();
      await page.locator('#clean:enabled').waitFor();
      assert.match(await page.locator('.scene-text').textContent(), /<img src=/);
      assert.equal(await page.locator('.scene-text img').count(), 0); assert.equal(await page.evaluate(()=>window.pwned), undefined);
      await page.locator('#language').click();
      assert.equal(await page.locator('html').getAttribute('lang'), 'zh-CN'); assert.match(await page.locator('#clean').textContent(), /移除/);
      await page.locator('#demo').click(); await page.locator('#clean:enabled').waitFor();
      if(mode === 'http') await page.screenshot({path:path.join(run,'desktop-zh.png'), fullPage:true});
      if(mode === 'http' && process.env.PNG_CHECK_UPDATE_SCREENSHOTS === '1') await page.screenshot({path:path.join(root,'assets','inspection-zh.jpg'), type:'jpeg', quality:88, fullPage:true});
      await page.setViewportSize({width:390, height:844});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth), true);
      if(mode === 'http') await page.screenshot({path:path.join(run,'mobile-zh.png'), fullPage:true});
      await page.locator('#language').click();
      if(mode === 'http') await page.screenshot({path:path.join(run,'mobile-en.png'), fullPage:true});
      await page.locator('#file').setInputFiles({name:'corrupt.png',mimeType:'image/png',buffer:Buffer.from('not a png')});
      await page.locator('#status.error').waitFor(); assert.match(await page.locator('#status').textContent(), /PNG/);
      await page.locator('#forget').click(); assert.equal(await page.locator('#image').isVisible(), false);
      assert.equal(external.length, 0); assert.deepEqual(errors, []);
      results.cases.push({mode, originalPixelSha256:before, cleanedPixelSha256:before, downloadedBytes:verified.bytes.length,
        cleanReinspection:true, reportMatches:true, markupNotExecuted:true, chinese:true, mobileNoOverflow:true, malformedRejected:true, externalRequests:external.length, pageErrors:errors.length});
      await context.close();
    }
    if (process.env.PNG_CHECK_OFFICIAL_FIXTURE_DIR) {
      const page = await browser.newPage();
      await page.goto(pathToFileURL(path.join(root,'index.html')).href);
      for (const name of ['smiley_embedded_v2.png','test_embedded_v1.png','smiley.png']) {
        await page.locator('#file').setInputFiles(path.join(process.env.PNG_CHECK_OFFICIAL_FIXTURE_DIR,name));
        await page.locator('#clean:enabled').waitFor();
        const pixelHash = await pixels(page);
        if(name !== 'smiley.png') assert.match(await page.locator('#findings').textContent(), /Editable scene found/);
        await page.locator('#clean').click(); await page.locator('#download:enabled').waitFor();
        assert.equal(await pixels(page),pixelHash); assert.match(await page.locator('#summary').textContent(), /^0 text/);
        results.cases.push({officialFixture:name, pixelSha256:pixelHash, cleanedPixelIdentical:true, sceneDecoded:name!=='smiley.png'});
      }
      await page.close();
    }
    fs.writeFileSync(path.join(run,'browser-results.json'), JSON.stringify(results,null,2)+'\n');
    console.log(JSON.stringify(results,null,2));
  } finally { await browser.close(); server.close(); }
})().catch(err=>{ server.close(); console.error(err); process.exitCode=1; });
