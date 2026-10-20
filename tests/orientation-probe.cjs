'use strict';
// Regression for default preservation and explicit EXIF removal in the real UI.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const make = require('../scripts/make-samples.cjs');
const core = require('../png-core.js')();
const root = path.resolve(__dirname, '..');
const out = path.resolve(process.env.PNG_CHECK_RUN_DIR || path.join(root, 'runs'), 'orientation');
fs.mkdirSync(out, { recursive:true });
function makeOriented(orientation, littleEndian) {
  const tiff = make.exifOrientationPayload(orientation, littleEndian);
  const png = make.makePng();
  return make.insert(Buffer.concat([png.subarray(0, 33), make.chunk('eXIf', tiff), png.subarray(33)]), 'tEXt', Buffer.from('Comment\0Synthetic orientation note'));
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
  const result = { createdAt:new Date().toISOString(), regressionTest:true, cases:[] };
  const browser = await chromium.launch(process.env.CI ? { headless:true } : { channel:'chrome', headless:true });
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000}}); result.browser = browser.version();
    await page.route('**/*', route => {
      const url = route.request().url();
      return url.startsWith('file:') || url.startsWith('blob:') || url.startsWith('data:') ? route.continue() : route.abort();
    });
    await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
    for (const littleEndian of [true, false]) for (const orientation of [1,2,3,4,5,6,7,8]) {
      const label = `${orientation}-${littleEndian ? 'le' : 'be'}`;
      const input = makeOriented(orientation, littleEndian);
      await page.locator('#file').setInputFiles({ name:`synthetic-orientation-${label}.png`, mimeType:'image/png', buffer:input });
      await page.locator('#clean:enabled').waitFor(); const before = await raster(page);
      assert.equal(await page.locator('#remove-exif').isChecked(), false);
      await page.locator('#clean').click(); await page.locator('#download:enabled').waitFor(); const defaultAfter = await raster(page);
      assert.deepEqual(defaultAfter, before);
      await page.getByRole('heading', {name:'EXIF retained'}).waitFor();
      const cleaned = await core.clean(input);
      assert.equal(cleaned.after.exifCount, 1); assert.equal(cleaned.after.textCount, 0);
      await page.locator('#proof').evaluate(el=>el.open=true);
      assert.match(await page.locator('#proof-body').textContent(), /0 text chunks, 1 EXIF chunks, 0 trailing bytes/);
      if (label === '6-le') await page.screenshot({path:path.join(out,'exif-retained.jpg'),type:'jpeg',quality:88,fullPage:true});
      await page.locator('#remove-exif').check();
      assert.equal(await page.locator('#download').isVisible(), false);
      await page.locator('#clean:enabled').waitFor();
      await page.locator('#clean').click(); await page.locator('#download:enabled').waitFor(); const removeExifAfter = await raster(page);
      await page.getByText('EXIF removed. Image orientation may differ; compare the Original tab before sharing.', {exact:true}).waitFor();
      assert.equal(removeExifAfter.width, 960); assert.equal(removeExifAfter.height, 600);
      const explicit = await core.clean(input, {removeExif:true}); assert.equal(explicit.after.exifCount, 0);
      if (label === '6-le') {
        assert.notDeepEqual(removeExifAfter, before);
        await page.screenshot({path:path.join(out,'exif-removed.jpg'),type:'jpeg',quality:88,fullPage:true});
        const downloadEvent=page.waitForEvent('download');await page.locator('#download').click();const download=await downloadEvent;
        const file=path.join(out,'exif-removed-download.png');await download.saveAs(file);assert.deepEqual(fs.readFileSync(file),Buffer.from(explicit.bytes));
      }
      result.cases.push({ orientation, littleEndian, before, defaultAfter, removeExifAfter, idatUnchanged:cleaned.imageDataUnchanged,
        defaultRasterUnchanged:true, defaultExifCount:cleaned.after.exifCount, defaultTextCount:cleaned.after.textCount, explicitExifCount:explicit.after.exifCount });
    }
    result.completed = true;
    result.allDefaultRastersPreserved = result.cases.every(c=>c.defaultRasterUnchanged);
    fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify({completed:result.completed,browser:result.browser,cases:result.cases.length,allDefaultRastersPreserved:result.allDefaultRastersPreserved},null,2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
