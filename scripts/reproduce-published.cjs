// Reproduce actual 2.6 defects from the byte-verified submitted archive.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { backend, ui, tick, source } = require('../tests/helpers.cjs');
const archive = path.resolve(__dirname, '../quicklaunch-v2.6-store-fixed.zip');
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex'), 'd0239707c0475fa67f407992dc119b51597fd5cdb002f7b6a783a6f98ece94ad');
const files = JSON.parse(cp.execFileSync('python3', ['-c', 'import json,sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); print(json.dumps({n:z.read(n).decode() for n in z.namelist() if n.endswith((".js",".html"))}))', archive], { maxBuffer: 1024 * 1024 }));
const read = name => files[name] ?? source(name);
const data = () => ({ settings: { workspaces: [{ id: 'w_default', name: 'Main' }] },
  shortcuts: [{ title: 'Site', url: 'https://site.test', workspaceId: 'w_default' }],
  snippets: [{ id: 'a', title: 'Template', text: 'Hello {{clipboard}}', tags: [] }] });
(async () => {
  {
    const server = backend(data(), read); server.chrome.clipboardPermission = false;
    const page = await ui('popup', server, read);
    page.find('modeSnippetsBtn').click(); page.w.document.querySelector('.snippet-item').click(); await tick();
    assert.equal(page.clipboardWrites[0], 'Hello ');
    console.log('REPRODUCED 2.6: denied clipboard read overwrites clipboard with an incomplete snippet.');
    page.dispose();
  }
  {
    const page = await ui('popup', backend(data(), read), read);
    let parses = 0; const parse = page.w.marked.parse;
    page.w.marked = { ...page.w.marked, parse: (...args) => { parses++; return parse(...args); } };
    page.find('modeSnippetsBtn').click();
    assert.equal(parses, 1);
    console.log('REPRODUCED 2.6: collapsed snippet eagerly parses its Markdown.');
    page.dispose();
  }
  {
    const server = backend(data(), read), page = await ui('options', server, read);
    server.events.menu({ menuItemId: 'add-to-quicklaunch', linkUrl: 'https://new.test' }, {}); await tick();
    page.find('addShortcutBtn').click(); page.input('shortcutTitle', 'Older tab'); page.input('shortcutUrl', 'https://old.test');
    page.find('saveModalBtn').click(); await tick();
    assert.equal(server.state.shortcuts.some(s => s.url === 'https://new.test'), false);
    console.log('REPRODUCED 2.6: stale settings page silently erases a newer context-menu shortcut.');
    page.dispose();
  }
  {
    const server = backend(data(), read);
    for (const url of ['https://first.test', 'https://second.test']) server.events.menu({ menuItemId: 'add-to-quicklaunch', linkUrl: url }, {});
    await tick();
    assert.equal(server.state.shortcuts.length, 2);
    console.log('REPRODUCED 2.6: two overlapping context-menu additions lose one shortcut.');
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
