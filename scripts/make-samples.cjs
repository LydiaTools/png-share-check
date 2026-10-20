'use strict';
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const core = require('../png-core.js')();
function chunk(type, payload) {
  const body = Buffer.concat([Buffer.from(type), Buffer.from(payload)]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(payload.length, 0); body.copy(out, 4); out.writeUInt32BE(core.crc32(body), out.length - 4);
  return out;
}
function insert(png, type, payload) {
  return Buffer.concat([png.subarray(0, png.length - 12), chunk(type, payload), png.subarray(png.length - 12)]);
}
function exifOrientationPayload(orientation, littleEndian = true) {
  if (!Number.isInteger(orientation) || orientation < 1 || orientation > 8) throw new Error('Expected an EXIF orientation from 1 to 8.');
  const payload = Buffer.alloc(26);
  payload.write(littleEndian ? 'II' : 'MM', 0, 'ascii');
  const short = (value, offset) => littleEndian ? payload.writeUInt16LE(value, offset) : payload.writeUInt16BE(value, offset);
  const long = (value, offset) => littleEndian ? payload.writeUInt32LE(value, offset) : payload.writeUInt32BE(value, offset);
  short(42, 2); long(8, 4); short(1, 8); short(0x112, 10); short(3, 12); long(1, 14); short(orientation, 18);
  return payload;
}
function makePng(width = 960, height = 600) {
  const data = Buffer.alloc(height * (width * 4 + 1));
  const colors = { bg: [244, 249, 251, 255], paper: [255, 255, 255, 255], ink: [28, 47, 57, 255], blue: [185, 224, 242, 255], accent: [219, 85, 64, 255] };
  const pixel = (x, y, c) => { if (x >= 0 && y >= 0 && x < width && y < height) data.set(c, y * (width * 4 + 1) + 1 + x * 4); };
  function box(x, y, w, h, c) { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) pixel(xx, yy, c); }
  box(0, 0, width, height, colors.bg);
  box(48, 48, 864, 504, colors.ink); box(51, 51, 858, 498, colors.paper);
  box(96, 202, 252, 152, colors.ink); box(99, 205, 246, 146, colors.blue);
  box(612, 202, 252, 152, colors.ink); box(615, 205, 246, 146, colors.blue);
  box(348, 275, 264, 6, colors.ink);
  // Original 5 x 7 bitmap lettering; no external font or image asset.
  const font = { A:['01110','10001','10001','11111','10001','10001','10001'], B:['11110','10001','10001','11110','10001','10001','11110'], C:['01111','10000','10000','10000','10000','10000','01111'], D:['11110','10001','10001','10001','10001','10001','11110'], E:['11111','10000','10000','11110','10000','10000','11111'], F:['11111','10000','10000','11110','10000','10000','10000'], G:['01111','10000','10000','10111','10001','10001','01110'], H:['10001','10001','10001','11111','10001','10001','10001'], I:['11111','00100','00100','00100','00100','00100','11111'], J:['00111','00010','00010','00010','10010','10010','01100'], K:['10001','10010','10100','11000','10100','10010','10001'], L:['10000','10000','10000','10000','10000','10000','11111'], M:['10001','11011','10101','10101','10001','10001','10001'], N:['10001','11001','10101','10011','10001','10001','10001'], O:['01110','10001','10001','10001','10001','10001','01110'], P:['11110','10001','10001','11110','10000','10000','10000'], Q:['01110','10001','10001','10001','10101','10010','01101'], R:['11110','10001','10001','11110','10100','10010','10001'], S:['01111','10000','10000','01110','00001','00001','11110'], T:['11111','00100','00100','00100','00100','00100','00100'], U:['10001','10001','10001','10001','10001','10001','01110'], V:['10001','10001','10001','10001','10001','01010','00100'], W:['10001','10001','10001','10101','10101','10101','01010'], X:['10001','10001','01010','00100','01010','10001','10001'], Y:['10001','10001','01010','00100','00100','00100','00100'], Z:['11111','00001','00010','00100','01000','10000','11111'], ' ':['00000','00000','00000','00000','00000','00000','00000'] };
  function text(label, x, y, scale = 4) { for (const letter of label) { const glyph = font[letter] || font[' ']; glyph.forEach((row, gy) => [...row].forEach((v, gx) => { if (v === '1') box(x + gx * scale, y + gy * scale, scale, scale, colors.ink); })); x += scale * 6; } }
  text('SYNTHETIC DEMO', 96, 102, 5);
  text('DRAFT', 156, 264, 5); text('SHARE', 672, 264, 5);
  text('VISIBLE PIXELS STAY THE SAME', 96, 446, 4);
  const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(data)), chunk('IEND', Buffer.alloc(0))]);
}
function scenePayload(texts, compressed = true) {
  const scene = { type: 'excalidraw', version: 2, source: 'PNG Share Check synthetic fixture', elements: texts.map((text, i) => ({ type: 'text', id: 'synthetic-' + i, text })), appState: {}, files: {} };
  const sceneBytes = Buffer.from(JSON.stringify(scene));
  const encoded = (compressed ? zlib.deflateSync(sceneBytes) : sceneBytes).toString('latin1');
  return Buffer.from('application/vnd.excalidraw+json\0' + JSON.stringify({ version: '1', encoding: 'bstring', compressed, encoded }), 'latin1');
}
function writeSamples() {
  const folder = path.join(__dirname, '..', 'samples');
  fs.mkdirSync(folder, { recursive: true });
  const plain = makePng();
  const withScene = insert(plain, 'tEXt', scenePayload(['Draft', 'Share', 'Synthetic note outside the exported view: review launch timing.']));
  fs.writeFileSync(path.join(folder, 'diagram-with-scene.png'), withScene);
  fs.writeFileSync(path.join(folder, 'diagram-pixels-only.png'), plain);
  const oriented = Buffer.concat([plain.subarray(0,33), chunk('eXIf', exifOrientationPayload(6)), plain.subarray(33)]);
  fs.writeFileSync(path.join(folder, 'diagram-with-exif.png'), insert(oriented, 'tEXt', Buffer.from('Comment\0Synthetic orientation note')));
  // A local script tag makes the sample available directly from file://, without fetch.
  fs.writeFileSync(path.join(folder, 'demo.js'), "globalThis.PNG_SHARE_DEMO_BASE64 = '" + withScene.toString('base64') + "';\n");
}
if (require.main === module) writeSamples();
module.exports = { chunk, insert, makePng, scenePayload, exifOrientationPayload, writeSamples };
