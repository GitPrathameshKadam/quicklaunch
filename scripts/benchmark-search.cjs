// Search-only CPU measurements; excludes rendering and native popup startup.
const vm = require('node:vm');
const { source } = require('../tests/helpers.cjs');
const context = vm.createContext({}); vm.runInContext(source('search.js'), context);
const engine = context.QuickLaunchSearch;
const items = Array.from({ length: 200 }, (_, i) => ({ title: 'Market review ' + i,
  tags: i % 2 ? ['daily', 'research'] : ['weekly'], text: ('Notes for analysis and next actions.\n').repeat(750) + 'Unique phrase ' + i }));
const fields = item => [item.title, item.tags.join(' '), item.text];
const queries = ['market', 'market review', 'daily market', 'unique phrase', 'review 19', 'weekly', 'no-match'];
const sample = count => {
  const start = performance.now();
  for (let i = 0; i < count; i++) engine.rank(items, queries[i % queries.length], fields);
  return performance.now() - start;
};
console.log(`Synthetic corpus: ${items.length} snippets, ${(items.reduce((n, item) => n + item.text.length, 0) / 1024 / 1024).toFixed(2)} MiB of body text.`);
console.log(`First title search (body index stays lazy): ${sample(1).toFixed(2)} ms.`);
const bodyStart = performance.now(); engine.rank(items, 'unique phrase', fields);
console.log(`First body search including normalization: ${(performance.now() - bodyStart).toFixed(2)} ms.`);
sample(queries.length); // Warm the ranking paths before the repeat measurement.
console.log(`Warm ${queries.length * 10} queries: ${sample(queries.length * 10).toFixed(2)} ms total.`);
