const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const files = JSON.parse(fs.readFileSync(path.join(__dirname, 'release-files.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
assert.equal(manifest.manifest_version, 3);
assert.match(manifest.version, /^\d+\.\d+(?:\.\d+){0,2}$/);
assert.equal(manifest.background.service_worker, 'background.js');
assert.deepEqual(manifest.optional_permissions, ['clipboardRead']);
assert.equal(manifest.host_permissions, undefined);
assert.equal(manifest.content_scripts, undefined);
assert.equal(manifest.content_security_policy.extension_pages.includes("connect-src 'none'"), true);
const allowed = new Set(files);
const systemDirectories = new Set(['_locales', '_metadata']);
assert.equal(fs.readdirSync(root).some(name => name.startsWith('_') && !systemDirectories.has(name)), false,
  'Unpacked Chrome extensions reject root names starting with _: use promo/ for development assets.');
for (const file of files) {
  assert.equal(fs.statSync(path.join(root, file)).isFile(), true, file);
  if (file.endsWith('.js')) cp.execFileSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'pipe' });
  if (/\.(html|css)$/.test(file)) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    for (const match of source.matchAll(/(?:src|href)="([^"]+)"/g)) {
      const target = match[1];
      if (/^(https?:|#|data:|$)/.test(target)) continue;
      assert.equal(allowed.has(target), true, `${file}: missing packaged reference ${target}`);
    }
  }
}
for (const file of ['popup.html', 'options.html']) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  assert.ok(source.indexOf('src="storage.js"') < source.indexOf(`src="${file.replace('.html', '.js')}"`));
  assert.ok(source.indexOf('src="storage-value.js"') < source.indexOf('src="storage.js"'));
  assert.ok(source.includes('lang="en"'));
  const ids = [...source.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, `${file}: duplicate element ID`);
  const script = fs.readFileSync(path.join(root, file.replace('.html', '.js')), 'utf8');
  for (const match of script.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)) {
    assert.ok(ids.includes(match[1]) || (file === 'popup.html' && match[1] === 'popupToast'),
      `${file}: JavaScript refers to missing element ${match[1]}`);
  }
}
for (const match of fs.readFileSync(path.join(root, 'background.js'), 'utf8').matchAll(/importScripts\(([^)]+)\)/g)) {
  for (const entry of match[1].matchAll(/['"]([^'"]+)['"]/g)) assert.ok(allowed.has(entry[1]), `Missing worker import: ${entry[1]}`);
}
cp.execFileSync('git', ['diff', '--check'], { cwd: root, stdio: 'pipe' });
console.log(`Release structure, references, JavaScript syntax and whitespace: passed (${files.length} packaged files).`);
