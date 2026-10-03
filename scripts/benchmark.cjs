// Rendering benchmark in jsdom: useful comparison, not native Chrome timing.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const { backend, ui, source } = require('../tests/helpers.cjs');
const archive = path.resolve(__dirname, '../quicklaunch-v2.6-store-fixed.zip');
const oldFiles = JSON.parse(cp.execFileSync('python3', ['-c', 'import json,sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); print(json.dumps({n:z.read(n).decode() for n in z.namelist() if n.endswith((".js",".html"))}))', archive], { maxBuffer: 1024 * 1024 }));
const data = { shortcuts: [], snippets: Array.from({ length: 200 }, (_, i) => ({ id: 'n' + i,
  title: 'Note ' + i, text: '# Review\n\n' + 'Reusable prompt with some **bold** text.\n'.repeat(100), tags: ['review'] })) };
(async () => {
  for (const [name, read] of [['published 2.6', file => oldFiles[file] ?? source(file)], ['candidate 2.7', source]]) {
    const page = await ui('popup', backend(data), read);
    let parses = 0; const parse = page.w.marked.parse;
    page.w.marked = { ...page.w.marked, parse: (...args) => { parses++; return parse(...args); } };
    const start = performance.now(); page.find('modeSnippetsBtn').click(); const elapsed = performance.now() - start;
    console.log(`${name}: ${elapsed.toFixed(1)} ms, ${parses} Markdown parses, ${data.snippets.length} collapsed cards`);
    page.dispose();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
