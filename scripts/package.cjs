'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const destination = process.argv[2] || path.join(root, 'dist');
const output = path.resolve(destination);
if (output === root || root.startsWith(output + path.sep)) throw new Error('Choose a separate output directory.');
fs.mkdirSync(output, { recursive:true });
// Explicit allowlist: no accounts, test artifacts, dependencies or local evidence.
for (const name of ['index.html', 'style.css', 'app.js', 'png-core.js', 'LICENSE', 'README.md', 'README.zh-CN.md', 'assets/inspection.jpg', 'assets/inspection-zh.jpg', 'samples/demo.js', 'samples/diagram-with-scene.png', 'samples/diagram-pixels-only.png', 'samples/diagram-with-exif.png', 'samples/README.md', 'docs/scope.md']) {
  const target = path.join(output, name); fs.mkdirSync(path.dirname(target), {recursive:true}); fs.copyFileSync(path.join(root,name), target);
}
console.log('Packaged static app into ' + output);
