// Resolve only the original template tokens. Clipboard text is opaque and must
// not interpret replacement patterns ($&, $', etc.) or additional placeholders.
globalThis.QuickLaunchSnippet = (() => {
  async function expand(text, { now = new Date(), hasPermission, readClipboard }) {
    let clipboard;
    if (/\{\{clipboard\}\}/i.test(text)) {
      if (!await hasPermission()) throw new Error('Enable clipboard access in Settings to use {{clipboard}}');
      try { clipboard = await readClipboard(); }
      catch { throw new Error('Could not read clipboard. The snippet was not copied.'); }
    }
    const tokens = { date: now.toLocaleDateString(), time: now.toLocaleTimeString(),
      datetime: now.toLocaleString(), clipboard };
    return text.replace(/\{\{(date|time|datetime|clipboard)\}\}/gi,
      (_, token) => tokens[token.toLowerCase()]);
  }
  return { expand };
})();
