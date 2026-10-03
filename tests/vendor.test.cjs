const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { source } = require('./helpers.cjs');

test('bundled Markdown completes known advisory whitespace and representative hostile inputs under a hard VM deadline', () => {
  const context = vm.createContext({});
  vm.runInContext(source('assets/libs/marked.min.js'), context);
  for (const payload of ['\t\v\n', '['.repeat(60000), '[x]:' + ' '.repeat(1500) + 'x ' + ' '.repeat(1500) + ' x']) {
    context.payload = payload;
    const rendered = vm.runInContext('marked.parse(payload)', context, { timeout: 1000 });
    assert.equal(typeof rendered, 'string');
  }
});
