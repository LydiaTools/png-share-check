'use strict';
// Optional upstream integration experiment. Nothing from the SDK enters the app or offline ZIP.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const sdk = path.resolve(process.env.PNG_EDITOR_SDK_DIR || 'missing-sdk-directory');
const out = path.join(root, 'runs', 'editor-export');
const core = require('../png-core.js')();
const sdkIntegrity = 'sha512-6i5Gt7IDTOH//qa0Z315Ly5iVRhjWpu2whrlQFqkuwrkKUWgRsMk0P5qdE7bpyDpai7jeLeWYkyj1eVAfni1lw==';
const marker = 'SYNTHETIC NOTE: internal draft';
fs.mkdirSync(out, { recursive:true });
const lock = JSON.parse(fs.readFileSync(path.join(sdk, 'package-lock.json')));
assert.equal(lock.packages['node_modules/@excalidraw/excalidraw'].version, '0.18.1');
assert.equal(lock.packages['node_modules/@excalidraw/excalidraw'].integrity, sdkIntegrity);
const entry = path.join(sdk, 'entry.js');
fs.writeFileSync(entry, `import { convertToExcalidrawElements, exportToBlob } from '@excalidraw/excalidraw';
window.editorSdk = { convertToExcalidrawElements, exportToBlob };\n`);
require(path.join(sdk, 'node_modules/esbuild')).buildSync({
  entryPoints:[entry], outfile:path.join(sdk, 'bundle.js'), bundle:true, format:'iife',
  platform:'browser', define:{'process.env.NODE_ENV':'"production"'}, logLevel:'warning',
  loader:{'.woff2':'file','.woff':'file','.ttf':'file'},
});
fs.copyFileSync(path.join(sdk, 'package-lock.json'), path.join(out, 'sdk-package-lock.json'));
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.woff2':'font/woff2'};
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (pathname === '/sdk.html') {
    res.setHeader('Content-Type','text/html');
    res.end('<!doctype html><meta charset="utf-8"><title>Original SDK export experiment</title><script src="/sdk/bundle.js"></script>'); return;
  }
  const base = pathname.startsWith('/sdk/') ? sdk : root;
  const relative = pathname.startsWith('/sdk/') ? pathname.slice(5) : pathname === '/' ? 'index.html' : pathname.slice(1);
  const file = path.resolve(base, relative);
  if (!file.startsWith(base+path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file,(error,bytes)=>{
    if(error) {res.writeHead(404).end(); return;}
    res.setHeader('Content-Type',mime[path.extname(file)] || 'application/octet-stream');res.end(bytes);
  });
});
async function raster(page, base64) {
  return page.evaluate(async data => {
    const image = new Image();image.src='data:image/png;base64,'+data;await image.decode();
    const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
    const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
    const bytes=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    const hash=await crypto.subtle.digest('SHA-256',bytes);
    return {width:canvas.width,height:canvas.height,rgbaSha256:Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('')};
  },base64);
}
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true});
  try {
    const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
    const external=[], errors=[];
    await context.route('**/*',route=>{
      const url=route.request().url();
      if(url.startsWith(base+'/')||url.startsWith('blob:')||url.startsWith('data:')) return route.continue();
      external.push(url);return route.abort();
    });
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/sdk.html');await page.waitForFunction(()=>!!window.editorSdk);
    const generated=await page.evaluate(async marker=>{
      const {convertToExcalidrawElements,exportToBlob}=window.editorSdk;
      const exports=[];
      for(const [name,lastLine,embedScene] of [
        ['frame-embedded',marker,true],
        ['frame-alternate-note','SYNTHETIC NOTE: alternate draft',true],
        ['frame-no-embed',marker,false],
      ]) {
        const elements=convertToExcalidrawElements([
          {type:'frame',id:'public-frame',name:'Original synthetic share frame',x:100,y:100,width:560,height:200,children:['public-text'],seed:1},
          {type:'text',id:'public-text',x:125,y:120,fontSize:24,fontFamily:2,lineHeight:1.25,strokeColor:'#162b37',text:['Public plan','Share the picture','','','','','',lastLine].join('\n'),seed:2},
        ],{regenerateIds:false});
        const frame=elements.find(e=>e.id==='public-frame');
        const appState={viewBackgroundColor:'#ffffff',exportBackground:true,exportEmbedScene:embedScene,exportWithDarkMode:false,exportScale:1};
        const blob=await exportToBlob({elements,appState,files:{},exportingFrame:frame,exportPadding:0,mimeType:'image/png'});
        const bytes=new Uint8Array(await blob.arrayBuffer());
        let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
        exports.push({name,base64:btoa(binary),scene:{type:'excalidraw',version:2,source:'Original PNG Share Check SDK experiment',elements,appState,files:{}},frame:{id:frame.id,x:frame.x,y:frame.y,width:frame.width,height:frame.height}});
      }
      return exports;
    },marker);
    const cases=[];
    for(const item of generated) {
      const bytes=Buffer.from(item.base64,'base64');
      fs.writeFileSync(path.join(out,item.name+'.png'),bytes);
      fs.writeFileSync(path.join(out,item.name+'.excalidraw'),JSON.stringify(item.scene,null,2)+'\n');
      const inspection=await core.inspect(bytes), rendered=await raster(page,item.base64);
      assert.equal(rendered.width,item.frame.width);assert.equal(rendered.height,item.frame.height);
      if(item.name==='frame-no-embed') assert.equal(inspection.scenes.length,0);
      else assert.equal(inspection.scenes.length,1);
      cases.push({name:item.name,bytes:bytes.length,rendered,sceneCount:inspection.scenes.length,sceneTexts:inspection.scenes.flatMap(s=>s.texts),frame:item.frame});
    }
    assert.deepEqual(cases[0].rendered,cases[1].rendered);
    assert.deepEqual(cases[0].rendered,cases[2].rendered);
    assert.ok(cases[0].sceneTexts.some(t=>t.includes(marker)));
    assert.ok(cases[1].sceneTexts.some(t=>t.includes('SYNTHETIC NOTE: alternate draft')));
    await page.goto(base+'/');
    await page.locator('#file').setInputFiles(path.join(out,'frame-embedded.png'));
    await page.getByRole('heading',{name:'Editable scene found'}).waitFor();
    assert.ok((await page.locator('.scene-text').textContent()).includes(marker));
    await page.locator('#clean:enabled').waitFor();
    await page.screenshot({path:path.join(out,'sdk-frame-inspection.jpg'),type:'jpeg',quality:88,fullPage:true});
    await page.locator('#clean').click();await page.locator('#download:enabled').waitFor();
    const event=page.waitForEvent('download');await page.locator('#download').click();const download=await event;
    const cleanedPath=path.join(out,'frame-cleaned.png');await download.saveAs(cleanedPath);
    const cleaned=await core.clean(fs.readFileSync(path.join(out,'frame-embedded.png')));
    assert.deepEqual(fs.readFileSync(cleanedPath),Buffer.from(cleaned.bytes));
    assert.equal(cleaned.after.textCount,0);assert.equal(cleaned.after.scenes.length,0);assert.equal(cleaned.imageDataUnchanged,true);
    const cleanedRaster=await raster(page,fs.readFileSync(cleanedPath).toString('base64'));
    assert.deepEqual(cleanedRaster,cases[0].rendered);
    await page.locator('#file').setInputFiles(cleanedPath);await page.locator('#clean:enabled').waitFor();
    assert.match(await page.locator('#summary').textContent(),/^0 text/);
    assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
    const result={completed:true,createdAt:new Date().toISOString(),sdk:{name:'@excalidraw/excalidraw',version:'0.18.1',integrity:sdkIntegrity},browser:browser.version(),cases,
      lastLineChangedButRgbaIdentical:true,embedOnOffRgbaIdentical:true,actualUiDownloadMatchesCore:true,cleanedRgbaUnchanged:true,remainingTextChunks:0,remainingScenes:0,
      scope:'Actual official npm SDK exportToBlob with two supplied elements and exportingFrame; original synthetic content; embed scene explicitly on. This does not test the hosted editor UI or prove its selection behavior.',
      externalRequests:external.length,pageErrors:errors.length};
    fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify({completed:true,sdk:result.sdk.version,cases:cases.length,lastLineChangedButRgbaIdentical:true,actualUiDownloadMatchesCore:true,cleanedRgbaUnchanged:true}));
    await context.close();
  } finally {await browser.close();server.close();}
})().catch(error=>{server.close();console.error(error);process.exitCode=1;});
