const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { source } = require('./helpers.cjs');
function search() { const context = vm.createContext({}); vm.runInContext(source('search.js'), context); return context.QuickLaunchSearch; }
const fields = item => [item.title, (item.tags || []).join(' '), item.text || ''];
const titles = items => Array.from(items, item => item.title);

test('search ranks title exact and prefix matches above tags, body text and subsequences', () => {
  const items = [{ title: 'Other', text: 'review' }, { title: 'Ready every visitor into every window' },
    { title: 'Tagged', tags: ['review'] }, { title: 'Review notes' }, { title: 'Review' }];
  assert.deepEqual(titles(search().rank(items, 'review', fields)),
    ['Review', 'Review notes', 'Tagged', 'Other', 'Ready every visitor into every window']);
});

test('all query words can match different fields and arrive in a different order', () => {
  const items = [{ title: 'Market review', tags: ['daily'], text: 'Prepare decisions' },
    { title: 'Market review' }, { title: 'Daily summary' }];
  assert.deepEqual(titles(search().rank(items, 'daily market', fields)), ['Market review']);
  assert.deepEqual(titles(search().rank(items, 'review market', fields)), ['Market review', 'Market review']);
});

test('search ignores accents, case and repeated whitespace', () => {
  const items = [{ title: 'Café notes', text: 'Résumé draft' }];
  assert.deepEqual(titles(search().rank(items, '  CAFE   NOTES ', fields)), ['Café notes']);
  assert.deepEqual(titles(search().rank(items, 'resume', fields)), ['Café notes']);
});

test('equal scores preserve input order and ranking does not mutate that order', () => {
  const items = [{ title: 'Docs two' }, { title: 'Docs one' }, { title: 'Docs' }];
  const before = [...items];
  assert.deepEqual(titles(search().rank(items, 'docs', fields)), ['Docs', 'Docs two', 'Docs one']);
  assert.deepEqual(items, before);
});

test('long body text cannot create irrelevant subsequence matches', () => {
  const items = [{ title: 'Note', text: 'x'.repeat(100000) + 'alpha beta gamma' }];
  assert.equal(search().rank(items, 'abg', fields).length, 0);
  assert.equal(search().rank(items, 'gamma', fields).length, 1);
});

test('edited titles, tags and bodies invalidate cached search fields', () => {
  const engine = search(), item = { title: 'Old', tags: ['old'], text: 'Old content' };
  assert.equal(engine.rank([item], 'old', fields).length, 1);
  item.title = 'New'; item.tags = ['fresh']; item.text = 'Current content';
  assert.equal(engine.rank([item], 'old', fields).length, 0);
  assert.equal(engine.rank([item], 'fresh current', fields).length, 1);
});
