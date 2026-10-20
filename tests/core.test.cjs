'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const make = require('../scripts/make-samples.cjs');
const core = require('../png-core.js')();
const base = make.makePng(960, 600);
test('known CRC vector and minimal image dimensions', async () => {
  assert.equal(core.crc32(Buffer.from('123456789')), 0xcbf43926);
  const r = await core.inspect(base); assert.equal(r.width, 960); assert.equal(r.height, 600); assert.equal(r.textCount, 0);
});
test('current compressed Excalidraw bstring and legacy direct scene', async () => {
  for (const payload of [make.scenePayload(['Visible', 'Synthetic outside-view note']), make.scenePayload(['Visible', 'Synthetic outside-view note'], false), Buffer.from('application/vnd.excalidraw+json\0' + JSON.stringify({ type:'excalidraw', elements:[{type:'text', text:'Legacy'}] }))]) {
    const r = await core.inspect(make.insert(base, 'tEXt', payload));
    assert.equal(r.scenes.length, 1); assert.ok(r.scenes[0].texts.length > 0);
  }
});
test('text formats, UTF-8, EXIF and trailing data are removed without re-encoding', async () => {
  let png = make.insert(base, 'tEXt', Buffer.from('Author\0Demo'));
  png = make.insert(png, 'zTXt', Buffer.concat([Buffer.from('Comment\0\0'), zlib.deflateSync(Buffer.from('Compressed note'))]));
  png = make.insert(png, 'iTXt', Buffer.concat([Buffer.from('Title\0\0\0en\0\0'), Buffer.from('示例 ✓') ]));
  png = make.insert(png, 'iTXt', Buffer.concat([Buffer.from('Title\0\x01\0\0\0'), zlib.deflateSync(Buffer.from('Unicode 数据')) ]));
  png = make.insert(png, 'eXIf', Buffer.from('synthetic-exif'));
  png = Buffer.concat([png, Buffer.from('trailing synthetic bytes')]);
  const r = await core.clean(png);
  assert.deepEqual(r.before.metadata.map(m=>m.preview), ['Demo', 'Compressed note', '示例 ✓', 'Unicode 数据']);
  assert.equal(r.after.textCount, 0); assert.equal(r.after.exifCount, 0); assert.equal(r.after.trailingBytes, 0);
  assert.equal(r.before.imageDataHash, r.after.imageDataHash); assert.deepEqual(Buffer.from(r.bytes), base);
  assert.equal(core.report(r).imageDataUnchanged, true);
});
test('color chunks and unknown ancillary data are preserved and disclosed', async () => {
  const png = make.insert(make.insert(base, 'gAMA', Buffer.from([0,0,177,143])), 'vpAg', Buffer.from('retained data'));
  const r = await core.clean(png);
  assert.deepEqual(Buffer.from(r.bytes), png); assert.deepEqual(r.after.unknownChunks, ['vpAg']);
  assert.ok(r.after.warnings.some(w=>w.includes('vpAg')));
});
test('metadata values and scene text are excluded from exported report', async () => {
  const r = await core.clean(make.insert(base, 'tEXt', make.scenePayload(['DO_NOT_INCLUDE_ME_IN_REPORT'])));
  assert.equal(JSON.stringify(core.report(r)).includes('DO_NOT_INCLUDE_ME_IN_REPORT'), false);
  assert.equal('metadata' in core.report(r).before, false);
});
test('corrupt CRC, signature, bounds and incomplete files fail closed', async () => {
  const corrupt = Buffer.from(base); corrupt[30] ^= 1;
  const badLength = Buffer.from(base); badLength.writeUInt32BE(0x7fffffff, 33);
  for (const png of [Buffer.alloc(40), corrupt, badLength, base.subarray(0, base.length-3), Buffer.alloc(core.LIMITS.file+1)]) await assert.rejects(core.inspect(png));
});
test('unknown critical chunk, duplicate header and nonconsecutive IDAT fail', async () => {
  await assert.rejects(core.inspect(make.insert(base, 'ABCD', Buffer.alloc(0))), /critical/);
  await assert.rejects(core.inspect(make.insert(base, 'IHDR', base.subarray(16, 29))), /IHDR/);
  let png = make.insert(base, 'tEXt', Buffer.from('x\0y'));
  png = make.insert(png, 'IDAT', Buffer.alloc(0));
  await assert.rejects(core.inspect(png), /consecutive/);
});
test('animation is explicitly rejected', async () => {
  await assert.rejects(core.inspect(make.insert(base, 'acTL', Buffer.alloc(8))), /Animated/);
});
test('bad text and decompression bombs remain removable with bounded decoding', async () => {
  const bomb = Buffer.concat([Buffer.from('Bomb\0\0'), zlib.deflateSync(Buffer.alloc(core.LIMITS.expanded + 1, 65))]);
  const malformed = make.insert(make.insert(base, 'zTXt', bomb), 'iTXt', Buffer.from('bad\0\x02\0\0\0x'));
  const r = await core.clean(malformed);
  assert.equal(r.before.metadata.length, 2); assert.ok(r.before.metadata.every(m=>m.error));
  assert.deepEqual(Buffer.from(r.bytes), base);
});
test('HTML and scripts remain text, without evaluation or interpolation', async () => {
  const payload = '<img src=x onerror="globalThis.pwned=true">';
  const r = await core.inspect(make.insert(base, 'tEXt', make.scenePayload([payload])));
  assert.equal(r.scenes[0].texts[0], payload); assert.equal(globalThis.pwned, undefined);
});
test('all text chunks removed even after the decode entry limit', async () => {
  let png = base; for (let i=0;i<130;i++) png = make.insert(png, 'tEXt', Buffer.from('x\0y'));
  const r = await core.clean(png); assert.equal(r.before.metadata.length, 128); assert.equal(r.before.textCount, 130);
  assert.equal(r.after.textCount, 0); assert.ok(r.before.warnings.some(w=>w.includes('128')));
});
test('repeated cleaning is idempotent and leaves originals untouched', async () => {
  const original = make.insert(base, 'tEXt', make.scenePayload(['Synthetic'])); const snapshot = Buffer.from(original);
  const first = await core.clean(original), second = await core.clean(first.bytes);
  assert.deepEqual(original, snapshot); assert.deepEqual(first.bytes, second.bytes); assert.equal(second.removedChunks.length, 0);
});
