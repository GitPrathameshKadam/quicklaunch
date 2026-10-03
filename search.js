// Local relevance ranking. Cached normalized fields avoid repeatedly copying
// large snippet bodies while typing. No query or saved content leaves the device.
globalThis.QuickLaunchSearch = (() => {
  const cache = new WeakMap();
  const normalize = value => String(value ?? '').normalize('NFKD')
    .replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

  function fieldsFor(item, getFields) {
    const values = getFields(item);
    let entry = cache.get(item);
    if (!entry || values.length !== entry.values.length || values.some((value, i) => value !== entry.values[i])) {
      entry = { values, fields: Array(values.length) };
      cache.set(item, entry);
    }
    return entry;
  }

  function match(query, text, fuzzy) {
    if (!text) return Infinity;
    if (text === query) return 0;
    if (text.startsWith(query)) return 10;
    const at = text.indexOf(query);
    if (at >= 0) return /[\s\p{P}]/u.test(text[at - 1]) ? 20 : 30;
    if (!fuzzy) return Infinity;
    let next = 0;
    for (let i = 0; i < text.length && next < query.length; i++) {
      if (text[i] === query[next]) next++;
    }
    return next === query.length ? 80 : Infinity;
  }

  function rank(items, rawQuery, getFields) {
    const query = normalize(rawQuery);
    if (!query) return [...items];
    const terms = [...new Set(query.split(' '))];
    const bestMatch = (term, entry, ceiling = Infinity) => {
      let score = ceiling;
      for (let i = 0; i < entry.values.length; i++) {
        const offset = i === 0 ? 0 : i === 1 ? 35 : 60;
        if (score <= offset) break;
        // A body cannot outrank a strong title/tag match. Normalize long text
        // only when it can affect the result, and reuse it on later queries.
        if (entry.fields[i] === undefined) entry.fields[i] = normalize(entry.values[i]);
        score = Math.min(score, match(term, entry.fields[i], i < 2) + offset);
      }
      return score;
    };
    return items.map((item, index) => {
      const entry = fieldsFor(item, getFields);
      const termScores = terms.map(term => bestMatch(term, entry));
      // Every term must match; body text uses literal matches to avoid noisy,
      // expensive subsequence matches against long prompts.
      const score = termScores.some(value => !Number.isFinite(value)) ? Infinity
        : bestMatch(query, entry, 40 + termScores.reduce((sum, n) => sum + n, 0) / terms.length);
      return { item, index, score };
    }).filter(result => Number.isFinite(result.score))
      .sort((a, b) => a.score - b.score || a.index - b.index).map(result => result.item);
  }
  return { rank, normalize };
})();
