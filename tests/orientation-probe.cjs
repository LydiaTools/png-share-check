'use strict';
// Diagnostic: a completed run does not mean that display preservation passed.
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const make = require('../scripts/make-samples.cjs');
const core = require('../png-core.js')();
const root = path.resolve(__dirname, '..');
const out = path.resolve(process.env.PNG_CHECK_RUN_DIR || path.join(root, 'runs'), 'orientation');
fs.mkdirSync(out, { recursive:true });
function makeOriented(orientation) {
  // PNG eXIf uses a TIFF profile without the JPEG Exif prefix.
  const tiff = Buffer.alloc(26);
  tiff.write('II', 0, 'ascii'); tiff.writeUInt16LE(42, 2); tiff.writeUInt32LE(8, 4);
  tiff.writeUInt16LE(1, 8); tiff.writeUInt16LE(0x112, 10); tiff.writeUInt16LE(3, 12);
  tiff.writeUInt32LE(1, 14); tiff.writeUInt16LE(orientation, 18);
  const png = make.makePng();
  return Buffer.concat([png.subarray(0, 33), make.chunk('eXIf', tiff), png.subarray(33)]);
}
async function raster(page) {
  return page.evaluate(async () => {
    const image = document.getElementById('image'); await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
    const digest = await crypto.subtle.digest('SHA-256', ctx.getImageData(0, 0, canvas.width, canvas.height).data);
    return { width:canvas.width, height:canvas.height, sha256:Array.from(new Uint8Array(digest), b=>b.toString(16).padStart(2, '0')).join('') };
  });
}
(async () => {
  const result = { createdAt:new Date().toISOString(), diagnosticOnly:true, cases:[] };
  const browser = await chromium.launch(process.env.CI ? { headless:true } : { channel:'chrome', headless:true });
  try {
    const page = await browser.newPage(); result.browser = browser.version();
    await page.route('**/*', route => {
      const url = route.request().url();
      return url.startsWith('file:') || url.startsWith('blob:') || url.startsWith('data:') ? route.continue() : route.abort();
    });
    await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
    for (const orientation of [1, 6]) {
      const input = makeOriented(orientation);
      fs.writeFileSync(path.join(out, `orientation-${orientation}.png`), input);
      await page.locator('#file').setInputFiles({ name:`synthetic-orientation-${orientation}.png`, mimeType:'image/png', buffer:input });
      await page.locator('#clean:enabled').waitFor(); const before = await raster(page);
      await page.locator('#clean').click(); await page.locator('#download:enabled').waitFor(); const after = await raster(page);
      const cleaned = await core.clean(input);
      fs.writeFileSync(path.join(out, `orientation-${orientation}-cleaned.png`), cleaned.bytes);
      result.cases.push({ orientation, before, after, idatUnchanged:cleaned.imageDataUnchanged, rasterUnchanged:JSON.stringify(before) === JSON.stringify(after) });
    }
    result.completed = true;
    result.displayMismatchReproduced = result.cases.some(c => !c.rasterUnchanged);
    fs.writeFileSync(path.join(out, 'diagnostic.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
