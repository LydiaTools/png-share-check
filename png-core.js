/* Independent PNG text inspection. No third-party parser is bundled. */
function PNGShareFactory() {
  'use strict';
  const LIMITS = Object.freeze({ file: 12 * 1024 * 1024, pixels: 12000000, chunks: 2048, expanded: 1024 * 1024, totalExpanded: 4 * 1024 * 1024, entries: 128 });
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  const removable = new Set(['tEXt', 'zTXt', 'iTXt']);
  const known = new Set(['IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS', 'cHRM', 'gAMA', 'iCCP', 'sBIT', 'sRGB', 'cICP', 'mDCV', 'cLLI', 'bKGD', 'hIST', 'pHYs', 'sPLT', 'tIME', 'tEXt', 'zTXt', 'iTXt', 'eXIf']);
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  function fail(message) { throw new Error(message); }
  function bytes(input) {
    if (input instanceof Uint8Array) return input;
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    return fail('Expected PNG bytes.');
  }
  function crc32(input) {
    let c = 0xffffffff;
    for (const b of input) c = table[(c ^ b) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function latin(input) {
    let s = '';
    for (const b of input) s += String.fromCharCode(b);
    return s;
  }
  function utf8(input) { return new TextDecoder('utf-8', { fatal: true }).decode(input); }
  function concat(parts) {
    const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let at = 0;
    for (const p of parts) { out.set(p, at); at += p.length; }
    return out;
  }
  async function hash(input) {
    const b = bytes(input);
    const result = await crypto.subtle.digest('SHA-256', b.slice().buffer);
    return Array.from(new Uint8Array(result), x => x.toString(16).padStart(2, '0')).join('');
  }
  function scan(input) {
    const data = bytes(input);
    if (data.length > LIMITS.file) fail('PNG exceeds the 12 MiB limit.');
    if (data.length < 33 || !signature.every((v, i) => data[i] === v)) fail('This file does not have a PNG signature.');
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let at = 8, width = 0, height = 0, idat = false, endedIdat = false, ended = false;
    const chunks = [];
    while (at < data.length) {
      if (chunks.length >= LIMITS.chunks) fail('PNG has too many chunks.');
      if (data.length - at < 12) fail('Truncated PNG chunk.');
      const size = view.getUint32(at);
      if (size > 0x7fffffff || size > data.length - at - 12) fail('PNG chunk length exceeds the file.');
      const type = latin(data.subarray(at + 4, at + 8));
      if (!/^[A-Za-z]{4}$/.test(type) || type[2] !== type[2].toUpperCase()) fail('Invalid PNG chunk type.');
      const end = at + size + 12;
      if (crc32(data.subarray(at + 4, end - 4)) !== view.getUint32(end - 4)) fail('PNG CRC mismatch in ' + type + '.');
      if (!chunks.length && (type !== 'IHDR' || size !== 13)) fail('PNG must start with a 13-byte IHDR.');
      if (type === 'IHDR') {
        if (chunks.length || size !== 13) fail('Duplicate or invalid IHDR.');
        width = view.getUint32(at + 8); height = view.getUint32(at + 12);
        if (!width || !height || width * height > LIMITS.pixels) fail('PNG exceeds the 12 megapixel limit or has empty dimensions.');
        const depth = data[at + 16], color = data[at + 17];
        const depths = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };
        if (!depths[color]?.includes(depth) || data[at + 18] || data[at + 19] || data[at + 20] > 1) fail('Unsupported or invalid IHDR fields.');
      }
      if (['acTL', 'fcTL', 'fdAT'].includes(type)) fail('Animated PNG is not supported in this preview. Use a static PNG.');
      if (type[0] === type[0].toUpperCase() && !['IHDR', 'PLTE', 'IDAT', 'IEND'].includes(type)) fail('Unknown critical PNG chunk: ' + type + '.');
      if (type === 'IDAT') {
        if (endedIdat) fail('PNG IDAT chunks must be consecutive.');
        idat = true;
      } else if (idat) endedIdat = true;
      if (type === 'PLTE' && (idat || size === 0 || size % 3 || size > 768 || chunks.some(c => c.type === 'PLTE'))) fail('Invalid PLTE chunk.');
      const payload = data.subarray(at + 8, end - 4);
      chunks.push({ type, size, start: at, end, payload });
      at = end;
      if (type === 'IEND') {
        if (size || !idat) fail('PNG needs image data and an empty IEND.');
        ended = true; break;
      }
    }
    if (!ended) fail('PNG has no complete IEND.');
    if (data[25] === 3 && !chunks.some(c => c.type === 'PLTE')) fail('Indexed PNG has no palette.');
    return { data, chunks, width, height, trailing: data.length - at };
  }
  async function inflate(input, budget) {
    if (typeof DecompressionStream !== 'function') fail('This browser cannot decompress text. Try a recent Chrome, Firefox or Safari.');
    const reader = new Blob([input]).stream().pipeThrough(new DecompressionStream('deflate')).getReader();
    let length = 0;
    const parts = [];
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        length += value.length;
        budget.used += value.length;
        if (length > LIMITS.expanded || budget.used > LIMITS.totalExpanded) {
          await reader.cancel().catch(() => {});
          fail('Expanded metadata exceeds the inspection limit.');
        }
        parts.push(value);
      }
    } finally { reader.releaseLock(); }
    return concat(parts);
  }
  function charge(input, budget) {
    budget.used += input.length;
    if (input.length > LIMITS.expanded || budget.used > LIMITS.totalExpanded) fail('Metadata exceeds the inspection limit.');
    return input;
  }
  function field(data, start) {
    const end = data.indexOf(0, start);
    if (end < 0) fail('Missing text field separator.');
    return { value: data.subarray(start, end), next: end + 1 };
  }
  async function decodeText(chunk, budget) {
    const data = chunk.payload;
    const keyword = field(data, 0);
    if (keyword.value.length < 1 || keyword.value.length > 79) fail('Invalid text keyword length.');
    let text;
    if (chunk.type === 'tEXt') text = latin(charge(data.subarray(keyword.next), budget));
    if (chunk.type === 'zTXt') {
      if (data[keyword.next] !== 0) fail('Unsupported zTXt compression.');
      text = latin(await inflate(data.subarray(keyword.next + 1), budget));
    }
    if (chunk.type === 'iTXt') {
      const flag = data[keyword.next], method = data[keyword.next + 1];
      if (![0, 1].includes(flag) || method !== 0) fail('Invalid iTXt compression fields.');
      const lang = field(data, keyword.next + 2);
      const translated = field(data, lang.next);
      const content = data.subarray(translated.next);
      text = utf8(flag ? await inflate(content, budget) : charge(content, budget));
    }
    return { keyword: latin(keyword.value), text };
  }
  async function sceneFrom(text, budget) {
    let scene = JSON.parse(text);
    if (scene && typeof scene.encoded === 'string') {
      if (scene.encoding !== 'bstring' || ![true, false].includes(scene.compressed)) fail('Unsupported Excalidraw envelope.');
      if (scene.encoded.length > LIMITS.expanded) fail('Scene envelope exceeds the inspection limit.');
      const encoded = new Uint8Array(scene.encoded.length);
      for (let i = 0; i < encoded.length; i++) {
        const code = scene.encoded.charCodeAt(i);
        if (code > 255) fail('Invalid Excalidraw byte string.');
        encoded[i] = code;
      }
      scene = JSON.parse(utf8(scene.compressed ? await inflate(encoded, budget) : charge(encoded, budget)));
    }
    if (!scene || scene.type !== 'excalidraw' || !Array.isArray(scene.elements)) fail('Text is not a supported Excalidraw scene.');
    const elements = scene.elements.filter(e => e && e.type === 'text' && typeof e.text === 'string');
    return { format: 'Excalidraw', elements: scene.elements.length, textCount: elements.length,
      texts: elements.slice(0, 100).map(e => e.text.slice(0, 8000)), truncated: elements.length > 100 || elements.some(e => e.text.length > 8000),
      fileCount: scene.files && typeof scene.files === 'object' ? Object.keys(scene.files).length : 0 };
  }
  async function inspect(input) {
    const parsed = scan(input);
    const metadata = [], scenes = [], warnings = [], budget = { used: 0 };
    let textCount = 0;
    for (const chunk of parsed.chunks) {
      if (!['tEXt', 'zTXt', 'iTXt'].includes(chunk.type)) continue;
      textCount++;
      if (textCount > LIMITS.entries) continue;
      const entry = { type: chunk.type, bytes: chunk.size };
      try {
        const result = await decodeText(chunk, budget);
        entry.keyword = result.keyword;
        entry.preview = result.text.slice(0, 8000);
        entry.truncated = result.text.length > 8000;
        if (result.keyword === 'application/vnd.excalidraw+json') {
          try { const scene = await sceneFrom(result.text, budget); scenes.push(scene); entry.scene = scene; }
          catch (err) { entry.error = 'Scene not decoded: ' + err.message; }
        }
      } catch (err) { entry.error = err.message; }
      metadata.push(entry);
    }
    if (textCount > LIMITS.entries) warnings.push('Only the first 128 text chunks were decoded; cleaning removes all text chunks.');
    const unknown = [...new Set(parsed.chunks.filter(c => !known.has(c.type)).map(c => c.type))];
    if (unknown.length) warnings.push('Unrecognized ancillary chunks are retained: ' + unknown.join(', ') + '.');
    if (metadata.some(e => e.error)) warnings.push('Some text data could not be decoded. It can still be removed.');
    const idat = concat(parsed.chunks.filter(c => c.type === 'IDAT').map(c => c.payload));
    return {
      version: 1, bytes: parsed.data.length, width: parsed.width, height: parsed.height,
      chunks: parsed.chunks.map(c => ({ type: c.type, bytes: c.size, removedByCleaning: removable.has(c.type) })),
      textCount, exifCount: parsed.chunks.filter(c => c.type === 'eXIf').length,
      trailingBytes: parsed.trailing, metadata, scenes, unknownChunks: unknown, warnings,
      imageDataHash: await hash(idat), fileHash: await hash(parsed.data)
    };
  }
  async function clean(input, options = {}) {
    if (!options || typeof options !== 'object' || (options.removeExif !== undefined && typeof options.removeExif !== 'boolean')) fail('Invalid cleaning choices.');
    const removeExif = options.removeExif === true;
    const selected = type => removable.has(type) || (removeExif && type === 'eXIf');
    const parsed = scan(input);
    const output = concat([parsed.data.subarray(0, 8), ...parsed.chunks.filter(c => !selected(c.type)).map(c => parsed.data.subarray(c.start, c.end))]);
    const before = await inspect(parsed.data), after = await inspect(output);
    before.chunks = before.chunks.map(c => ({ ...c, removedByCleaning:selected(c.type) }));
    if (before.imageDataHash !== after.imageDataHash) fail('Image data verification failed. No download was created.');
    return { bytes: output, before, after, removedChunks: before.chunks.filter(c => c.removedByCleaning).map(c => c.type),
      removedTrailingBytes: before.trailingBytes, imageDataUnchanged: true, removeExif };
  }
  function report(result) {
    function summary(r) {
      return { bytes: r.bytes, width: r.width, height: r.height, chunks: r.chunks,
        textChunks: r.textCount, exifChunks: r.exifCount, trailingBytes: r.trailingBytes,
        supportedSceneCount: r.scenes.length, unknownChunksRetained: r.unknownChunks,
        fileSha256: r.fileHash, compressedImageDataSha256: r.imageDataHash };
    }
    return { tool: 'PNG Share Check', version: '0.1.1', before: summary(result.before), after: summary(result.after),
      imageDataUnchanged: result.imageDataUnchanged, removedChunks: result.removedChunks,
      removedTrailingBytes: result.removedTrailingBytes, choices: { removeExif:result.removeExif === true },
      scope: 'Removes tEXt, zTXt, iTXt and bytes after IEND. EXIF removal is optional and may change displayed orientation. Retained chunks and compressed image data are copied exactly. Does not certify privacy.' };
  }
  return { LIMITS, crc32, scan, inspect, clean, report, hash, concat };
}
if (typeof module === 'object' && module.exports) module.exports = PNGShareFactory;
else globalThis.PNGShareFactory = PNGShareFactory;
