// Storage round-trips do not promise JavaScript object insertion order.
// Compare JSON content consistently in both the UI and the worker, preserving
// array order because shortcut/snippet/workspace ordering is user data.
globalThis.QuickLaunchStorageValue = (() => {
  function encode(value) {
    return JSON.stringify(value === undefined ? null : value, (_key, entry) => {
      if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        return Object.fromEntries(Object.keys(entry).sort().map(key => [key, entry[key]]));
      }
      return entry;
    });
  }
  function matches(expected, value) {
    if (typeof expected !== 'string') return false;
    const current = encode(value);
    if (expected === current) return true;
    // A page open before an extension reload may still send the old JSON
    // representation. Accept equivalent content without relaxing conflicts.
    try { return encode(JSON.parse(expected)) === current; }
    catch { return false; }
  }
  return { encode, matches };
})();
