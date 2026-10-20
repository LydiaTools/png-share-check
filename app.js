'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const copy = {
    en: {
      brandNote:'By LydiaTools', headline:'See what your PNG carries.', intro:'A diagram can keep its editable scene inside the image. Read the stored text before you share it.',
      local:'Files stay in this tab.\nNo upload. No account.', open:'Open a PNG', demo:'Try the demo PNG', drop:'Or drop one here. Static PNG · up to 12 MiB / 12 MP',
      initial:'Start with your PNG, or inspect the synthetic demo.', visible:'Visible image', empty:'Your image goes here.\nIts stored text appears next door.', noFile:'No file selected', forget:'Clear file',
      pixels:'Review the visible image too. Text and objects drawn into the pixels are not removed.', stored:'Stored data', waiting:'Waiting for PNG', original:'Original', cleaned:'Cleaned copy',
      findingsEmpty:'The preview checks PNG text chunks and EXIF, and reads supported Excalidraw scenes.', clean:'Remove text metadata', download:'Download cleaned PNG', report:'Download verification report',
      scope:'Removes text chunks and trailing bytes. EXIF removal is optional; other chunks and image data are retained.', proof:'What changed? Inspect the byte-level proof', what:'Why can an image contain an editable scene?',
      removeExif:'Also remove EXIF', exifNote:'EXIF can control image orientation. Keep this unchecked to retain it; EXIF may contain other information too.',
      exifKept:'EXIF retained', exifKeptNote:'No PNG text chunks remain. EXIF is still present, including any orientation and other information it contains.',
      exifRemoved:'EXIF removed. Image orientation may differ; compare the Original tab before sharing.', choicesChanged:'Cleaning choice changed. Create a new copy to review it.',
      explanation:'Some diagram editors offer an option to embed editing data in PNG exports. That lets you reopen and edit the drawing. It can include text beyond the visible export. Embedding is useful; inspect it when you intend to share pixels only.',
      docs:'Excalidraw export documentation', limits:'This preview is not a full PNG validator, a sensitive-data detector or a privacy certificate. It does not inspect pixel content, other editing formats or every ancillary chunk. Keep your editable original if you need it later.',
      footer:'Open source. Works offline. No AI needed.', more:'More tools by Lydia', loading:'Reading PNG locally…', cleaning:'Removing metadata and verifying image data…',
      ready:'Inspection complete. Review the stored data and visible image.', done:'Cleaned copy ready. Compressed image data is unchanged.', sample:'Synthetic demo: the embedded scene includes a note that is not drawn in the visible image.',
      found:'Editable scene found', textFound:'Text metadata found', exifFound:'EXIF or trailing data found', none:'No targeted metadata found',
      noneNote:'No PNG text chunks, EXIF or trailing bytes were found. Other chunks and the visible pixels may still carry information.',
      sceneNote:'The editable scene may contain more than the visible export. Read its stored text below.', sceneLabel:'Text stored in the editable scene', truncated:'Preview shortened by the inspection limit.',
      metadata:'View text metadata', encoded:'Encoded scene envelope', undecoded:'Could not decode this entry', removed:'Removed', kept:'Retained', before:'Original size', after:'Cleaned size', identical:'Identical IDAT SHA-256',
      check:'Re-inspection', verified:(r)=>`${r.textCount} text chunks, ${r.exifCount} EXIF chunks, ${r.trailingBytes} trailing bytes`, hashBefore:'Original file SHA-256', hashAfter:'Cleaned file SHA-256',
      noWorker:'This browser cannot run the local inspection worker. Use a recent desktop or mobile browser.', timeout:'Inspection timed out. Try a smaller PNG.', imageError:'The PNG cannot be displayed by this browser. No download was created.',
      tooLarge:'Choose a PNG under 12 MiB.', one:'Drop one PNG at a time.', count:(r)=>`${r.textCount} text / ${r.exifCount} EXIF`, textNote:(r)=>`${r.textCount} text chunk(s), ${r.exifCount} EXIF chunk(s), ${r.trailingBytes} trailing byte(s).`,
    },
    zh: {
      brandNote:'LydiaTools 出品', headline:'PNG 图片里，还存着什么？', intro:'一张图也可能带着可编辑的场景。分享之前，先看它保存了哪些文字。',
      local:'文件只在当前标签页处理。\n不上传，无需账号。', open:'打开 PNG 图片', demo:'试用示例 PNG', drop:'也可拖入图片。静态 PNG · 最大 12 MiB / 1200 万像素',
      initial:'打开你的 PNG，或先检查一张合成示例图。', visible:'可见画面', empty:'这里显示你的图片。\n右侧显示图片保存的文字数据。', noFile:'尚未选择文件', forget:'清空文件',
      pixels:'也请检查可见画面。已经画进像素里的文字和对象不会被删除。', stored:'存储的数据', waiting:'等待 PNG 图片', original:'原文件', cleaned:'清理后的副本',
      findingsEmpty:'此预览版检查 PNG 文本块和 EXIF，并读取支持的 Excalidraw 场景。', clean:'移除文本元数据', download:'下载清理后的 PNG', report:'下载校验报告',
      scope:'移除文本块和尾随字节。EXIF 可选择移除；保留其他数据块和图像数据。', proof:'具体改了什么？查看字节级校验', what:'为什么图片里会有可编辑的场景？',
      removeExif:'同时移除 EXIF', exifNote:'EXIF 可能控制图片方向。默认不勾选以保留它；其中也可能有其他信息。',
      exifKept:'已保留 EXIF', exifKeptNote:'已无 PNG 文本数据块。EXIF 仍保留，包括其中可能存储的方向和其他信息。',
      exifRemoved:'EXIF 已移除，图片显示方向可能变化。分享前可切换原文件对比。', choicesChanged:'清理选项已改变，请重新生成副本后检查。',
      explanation:'一些绘图工具允许在 PNG 中嵌入编辑数据，以便重新打开修改。场景可能含有导出画面之外的文字。如果你只打算分享画面，可以先检查这些数据。',
      docs:'Excalidraw 导出说明', limits:'此预览版不是完整 PNG 验证器、敏感信息检测器或隐私认证。它不检查画面内容、其他编辑格式或所有辅助数据块。以后还要编辑的话，请保留原文件。',
      footer:'开源，可离线使用，无需 AI。', more:'查看 Lydia 的更多工具', loading:'正在本地读取 PNG…', cleaning:'正在移除元数据并校验图像数据…',
      ready:'检查完成。请查看存储的数据和可见画面。', done:'清理副本已就绪，压缩图像数据保持一致。', sample:'合成示例：嵌入场景里有一条未画在图片中的说明文字。',
      found:'发现可编辑场景', textFound:'发现文本元数据', exifFound:'发现 EXIF 或尾随数据', none:'未发现目标元数据',
      noneNote:'未发现 PNG 文本块、EXIF 或尾随字节。其他数据块和可见像素仍可能含有信息。',
      sceneNote:'可编辑场景可能比可见画面保存了更多内容。下面是场景中的文字。', sceneLabel:'可编辑场景保存的文字', truncated:'受检查上限限制，部分预览已截短。',
      metadata:'查看文本元数据', encoded:'编码后的场景封装', undecoded:'无法解码此条数据', removed:'已移除', kept:'已保留', before:'原文件大小', after:'清理后大小', identical:'IDAT SHA-256 一致',
      check:'再次检查', verified:(r)=>`${r.textCount} 个文本块、${r.exifCount} 个 EXIF 块、${r.trailingBytes} 个尾随字节`, hashBefore:'原文件 SHA-256', hashAfter:'清理文件 SHA-256',
      noWorker:'当前浏览器无法运行本地检查。请使用近期版本的桌面或手机浏览器。', timeout:'检查超时，请尝试更小的 PNG。', imageError:'当前浏览器无法显示此 PNG，未生成下载文件。',
      tooLarge:'请选择小于 12 MiB 的 PNG。', one:'每次请拖入一张 PNG。', count:(r)=>`${r.textCount} 个文本 / ${r.exifCount} 个 EXIF`, textNote:(r)=>`${r.textCount} 个文本块、${r.exifCount} 个 EXIF 块、${r.trailingBytes} 个尾随字节。`,
    }
  };
  let lang = new URLSearchParams(location.search).get('lang') === 'zh' ? 'zh' : 'en';
  let state = null, cleaned = false, busy = false, worker = null, job = 0, statusKey = 'initial';
  const urls = new Set();
  const t = key => copy[lang][key];
  const element = (tag, text, className) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (className) el.className = className; return el; };
  function setStatus(key, error = false, literal = false) { statusKey = literal ? null : key; $('status').textContent = literal ? key : t(key); $('status').classList.toggle('error', error); }
  function localize() {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.title = lang === 'zh' ? 'PNG Share Check | 检查图片里的编辑数据' : 'PNG Share Check | See what your PNG carries';
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    $('language').textContent = lang === 'en' ? 'Chinese' : 'English';
    $('language').setAttribute('aria-label', lang === 'en' ? 'Switch to Chinese' : 'Switch to English');
    $('dropzone').setAttribute('aria-label', t('open')); $('tabs').setAttribute('aria-label', lang === 'en' ? 'Choose file version' : '选择文件版本');
    if (statusKey) $('status').textContent = t(statusKey);
    if (state) render();
  }
  function urlFor(bytes) { const url = URL.createObjectURL(new Blob([bytes], {type:'image/png'})); urls.add(url); return url; }
  function free() { for (const url of urls) URL.revokeObjectURL(url); urls.clear(); }
  function work(action, buffer, token, options) {
    return new Promise((resolve, reject) => {
      if (!globalThis.Worker) return reject(new Error(t('noWorker')));
      const source = `const api = (${PNGShareFactory.toString()})(); onmessage = async ({data}) => { try { postMessage({ok:true, result:await api[data.action](data.buffer,data.options)}); } catch(err) { postMessage({ok:false,error:err.message}); } };`;
      const workerURL = URL.createObjectURL(new Blob([source], {type:'text/javascript'}));
      let w;
      try { w = new Worker(workerURL); } catch (err) { URL.revokeObjectURL(workerURL); return reject(new Error(t('noWorker'))); }
      URL.revokeObjectURL(workerURL); worker = w;
      const timer = setTimeout(() => { w.terminate(); if (worker === w) worker = null; reject(new Error(t('timeout'))); }, 8000);
      const stop = () => { clearTimeout(timer); w.terminate(); if (worker === w) worker = null; };
      w.onmessage = ({data}) => { stop(); if (token !== job) return reject(new Error('Cancelled')); if (data.ok) resolve(data.result); else reject(new Error(data.error)); };
      w.onerror = () => { stop(); reject(new Error(t('noWorker'))); };
      w.postMessage({action, buffer, options});
    });
  }
  function displayImage(url, token) {
    return new Promise((resolve, reject) => {
      const probe = new Image(); const timer = setTimeout(() => reject(new Error(t('imageError'))), 8000);
      probe.onload = () => { clearTimeout(timer); if (token !== job) return reject(new Error('Cancelled')); resolve({width:probe.naturalWidth,height:probe.naturalHeight}); };
      probe.onerror = () => { clearTimeout(timer); reject(new Error(t('imageError'))); }; probe.src = url;
    });
  }
  function lock(value) {
    busy = value; $('open').disabled = value; $('demo').disabled = value; $('clean').disabled = value; $('download').disabled = value; $('report').disabled = value; $('forget').disabled = value;
    $('remove-exif').disabled = value;
    $('clean-tab').disabled = value || !state?.result; $('original-tab').disabled = value;
  }
  async function openFile(file, sample = false) {
    const token = ++job;
    let previewURL;
    if (worker) worker.terminate();
    if (file.size > PNGShareFactory().LIMITS.file) { setStatus('tooLarge', true); return; }
    lock(true); setStatus('loading');
    try {
      const buffer = await file.arrayBuffer();
      const inspection = await work('inspect', buffer, token);
      previewURL = urlFor(buffer);
      const originalDimensions = await displayImage(previewURL, token);
      if (token !== job) return;
      const previous = state; state = { name:file.name, buffer, inspection, originalURL:previewURL, originalDimensions, result:null, sample }; cleaned = false;
      $('remove-exif').checked = false;
      if (previous) for (const url of [previous.originalURL, previous.cleanURL]) if (url) { URL.revokeObjectURL(url); urls.delete(url); }
      render(); setStatus(sample ? 'sample' : 'ready');
    } catch (err) { if(previewURL) { URL.revokeObjectURL(previewURL); urls.delete(previewURL); } if (token === job) setStatus(err.message, true, true); }
    finally { if (token === job) lock(false); $('file').value = ''; }
  }
  function render() {
    if (!state) return;
    const r = cleaned ? state.result.after : state.inspection;
    $('empty').hidden = true; $('image').hidden = false; $('image').src = cleaned ? state.cleanURL : state.originalURL;
    $('image').alt = state.sample ? (lang === 'en' ? 'Synthetic diagram: Draft connected to Share' : '合成示例图：草稿连接到分享') : (lang === 'en' ? 'Selected PNG preview' : '所选 PNG 图片预览');
    const dimensions = cleaned ? state.cleanDimensions : state.originalDimensions;
    $('dimensions').textContent = `${dimensions.width} × ${dimensions.height}`;
    $('filename').textContent = cleaned ? cleanName(state.name) : state.name;
    $('forget').hidden = false; $('summary').textContent = t('count')(r);
    $('tabs').hidden = false; $('actions').hidden = false;
    $('exif-options').hidden = state.inspection.exifCount === 0;
    $('original-tab').setAttribute('aria-pressed', String(!cleaned)); $('clean-tab').setAttribute('aria-pressed', String(cleaned));
    $('clean-tab').disabled = !state.result || busy;
    $('clean').hidden = !!state.result; $('download').hidden = !state.result; $('report').hidden = !state.result;
    const area = $('findings'); area.replaceChildren();
    const has = r.textCount || r.exifCount || r.trailingBytes;
    const heading = element('h3', undefined, 'finding-heading');
    heading.append(element('span', '', 'indicator' + (has ? '' : ' clear')), document.createTextNode(cleaned && r.exifCount ? t('exifKept') : r.scenes.length ? t('found') : r.textCount ? t('textFound') : has ? t('exifFound') : t('none')));
    area.append(heading, element('p', has ? t('textNote')(r) : t('noneNote'), 'finding-note'));
    if (cleaned && r.exifCount) area.append(element('p', t('exifKeptNote'), 'finding-note'));
    if (cleaned && state.result.removeExif && state.inspection.exifCount) area.append(element('p', t('exifRemoved'), 'warning'));
    if (r.scenes.length) area.append(element('p', t('sceneNote'), 'finding-note'));
    for (const scene of r.scenes) {
      const block = element('div', undefined, 'scene-text'); block.append(element('h3', `${scene.format} · ${t('sceneLabel')} (${scene.textCount})`));
      const list = element('ul'); for (const text of scene.texts) list.append(element('li', text)); block.append(list);
      if (scene.truncated) block.append(element('p', t('truncated'), 'finding-note')); area.append(block);
    }
    if (r.metadata.length) {
      const detail = element('details', undefined, 'metadata-detail'); detail.append(element('summary', t('metadata')));
      for (const m of r.metadata) {
        detail.append(element('strong', `${m.type} / ${m.keyword || t('undecoded')} (${m.bytes} B)`));
        detail.append(element('pre', m.scene ? t('encoded') : m.error || m.preview));
        if (m.truncated && !m.scene) detail.append(element('p', t('truncated')));
      }
      area.append(detail);
    }
    for (const warning of r.warnings) area.append(element('p', warning, 'warning'));
    $('proof').hidden = !state.result;
    if (state.result) renderProof();
  }
  const size = bytes => bytes.toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US') + ' B';
  function renderProof() {
    const result = state.result, area = $('proof-body'); area.replaceChildren(); const dl = element('dl');
    const pair = (key, value, code = false, cls) => { dl.append(element('dt', t(key))); const dd = element('dd', undefined, cls); dd.append(element(code ? 'code' : 'span', value)); dl.append(dd); };
    pair('before', size(result.before.bytes)); pair('after', size(result.after.bytes));
    pair('removed', (result.removedChunks.join(', ') || '—') + ` / ${result.removedTrailingBytes} B ${lang === 'en' ? 'trailing' : '尾随'}`);
    pair('check', t('verified')(result.after)); pair('identical', result.after.imageDataHash, true, 'match');
    pair('kept', result.after.chunks.map(c=>c.type).join(', '));
    pair('hashBefore', result.before.fileHash, true); pair('hashAfter', result.after.fileHash, true); area.append(dl);
  }
  function cleanName(name) { return (name.replace(/\.png$/i, '').replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 100) || 'image') + '-without-text.png'; }
  function save(bytes, type, name) { const url = URL.createObjectURL(new Blob([bytes], {type})); const a = element('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  $('open').onclick = () => $('file').click();
  $('file').onchange = () => { if ($('file').files[0]) openFile($('file').files[0]); };
  $('demo').onclick = () => { const buffer = Uint8Array.from(atob(PNG_SHARE_DEMO_BASE64), c=>c.charCodeAt(0)); openFile(new File([buffer], 'synthetic-diagram-with-scene.png', {type:'image/png'}), true); };
  $('language').onclick = () => { lang = lang === 'en' ? 'zh' : 'en'; try { const u = new URL(location.href); if (lang === 'zh') u.searchParams.set('lang','zh'); else u.searchParams.delete('lang'); history.replaceState(null,'',u); } catch {} localize(); };
  $('original-tab').onclick = () => { if (state && !busy) { cleaned = false; render(); } };
  $('clean-tab').onclick = () => { if (state?.result && !busy) { cleaned = true; render(); } };
  $('clean').onclick = async () => {
    if (!state || busy) return; const token = job; lock(true); setStatus('cleaning');
    try { const result = await work('clean', state.buffer, token, {removeExif:$('remove-exif').checked}); const cleanURL = urlFor(result.bytes); const cleanDimensions = await displayImage(cleanURL, token); if (token !== job) return; state.result = result; state.cleanURL = cleanURL; state.cleanDimensions = cleanDimensions; cleaned = true; render(); setStatus('done'); }
    catch(err) { if (token === job) setStatus(err.message, true, true); } finally { if (token === job) lock(false); }
  };
  $('remove-exif').onchange = () => {
    if (!state || busy) return;
    if (state.cleanURL) { URL.revokeObjectURL(state.cleanURL); urls.delete(state.cleanURL); state.cleanURL = null; }
    state.result = null; cleaned = false; render(); setStatus('choicesChanged');
  };
  $('download').onclick = () => { if (state?.result && !busy) save(state.result.bytes, 'image/png', cleanName(state.name)); };
  $('report').onclick = () => { if (state?.result && !busy) save(JSON.stringify(PNGShareFactory().report(state.result), null, 2)+'\n', 'application/json', 'png-share-check-report.json'); };
  $('forget').onclick = () => { job++; if(worker) worker.terminate(); state = null; cleaned = false; free(); $('image').removeAttribute('src'); $('image').hidden = true; $('empty').hidden = false; $('dimensions').textContent = ''; ['tabs','actions','proof','forget'].forEach(id=>$(id).hidden = true); $('proof').open = false; $('findings').replaceChildren(element('p', t('findingsEmpty'), 'placeholder')); lock(false); setStatus('initial'); localize(); };
  const drop = $('dropzone');
  ['dragenter','dragover'].forEach(event=>drop.addEventListener(event, e=>{ e.preventDefault(); if(!busy) drop.classList.add('dragging'); }));
  ['dragleave','drop'].forEach(event=>drop.addEventListener(event, e=>{ e.preventDefault(); drop.classList.remove('dragging'); }));
  drop.addEventListener('drop', e=>{ if(busy) return; if(e.dataTransfer.files.length !== 1) return setStatus('one', true); openFile(e.dataTransfer.files[0]); });
  window.addEventListener('beforeunload', free);
  localize();
})();
