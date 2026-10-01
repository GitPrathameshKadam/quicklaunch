// Shared validation for user-supplied JSON backups. This file runs locally in
// the popup and options page; imported objects are never trusted as UI state.
globalThis.QuickLaunchBackup = (() => {
  const defaultWorkspace = { id: 'w_default', name: 'Main' };

  function webUrl(value) {
    if (typeof value !== 'string') return null;
    try {
      const trimmed = value.trim();
      const url = new URL(trimmed);
      return ['http:', 'https:'].includes(url.protocol) && url.hostname ? trimmed : null;
    } catch { return null; }
  }

  function safeIcon(value) {
    return typeof value === 'string' && /^data:image\/(?:png|jpeg|gif|webp|bmp);base64,/i.test(value)
      ? value : '';
  }

  function inputUrl(value) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (/^https?:\/\//i.test(trimmed)) return webUrl(trimmed);
    // Do not turn ftp:, javascript:, or other explicit schemes into web hosts.
    if (/^[a-z][a-z\d+.-]*:/i.test(trimmed) && !/^[^\s/:]+:\d+(?:\/|$)/.test(trimmed)) return null;
    return webUrl('https://' + trimmed);
  }

  const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

  // Export the authoritative committed snapshot, including empty collections.
  // A fresh install or an external reset must still produce a restorable file.
  function exportData(saved, defaults, version, now = new Date()) {
    const currentSettings = settings(saved.settings, defaults);
    currentSettings.searchPosition = ['top', 'bottom'].includes(saved.searchPosition)
      ? saved.searchPosition : (currentSettings.searchPosition || 'top');
    return { version, exportedAt: now.toISOString(),
      shortcuts: Array.isArray(saved.shortcuts) ? saved.shortcuts : [],
      snippets: Array.isArray(saved.snippets) ? saved.snippets : [],
      settings: currentSettings, usageCounts: usageCounts(saved.usageCounts),
      sortMode: ['manual', 'most-used', 'az'].includes(saved.sortMode) ? saved.sortMode : 'manual',
      searchPosition: currentSettings.searchPosition };
  }

  function importData(data, current, mode, newId) {
    if (!data || typeof data !== 'object' || Array.isArray(data) ||
        (!Array.isArray(data.shortcuts) && !Array.isArray(data.snippets))) {
      throw new Error('Not a QuickLaunch backup.');
    }
    for (const key of ['shortcuts', 'snippets']) {
      if (Object.hasOwn(data, key) && !Array.isArray(data[key])) {
        throw new Error('The backup contains an invalid collection. Your existing data was kept.');
      }
    }
    if (data.settings?.workspaces && (!Array.isArray(data.settings.workspaces) || data.settings.workspaces.length > 10 ||
        (data.settings.workspaces.length === 10 && !data.settings.workspaces.some(ws => ws?.id === 'w_default')))) {
      throw new Error('A backup can contain at most 10 workspaces.');
    }
    const importedWorkspaces = workspaces(data.settings?.workspaces);
    const nextSettings = mode === 'merge' ? { ...current.settings, workspaces: workspaces(current.settings.workspaces) }
      : settings(data.settings, current.settings);
    const remap = new Map();
    if (mode === 'merge') {
      for (const ws of importedWorkspaces) {
        const existing = nextSettings.workspaces.find(w => w.id === ws.id);
        if (existing && (existing.name === ws.name || ws.id === 'w_default')) { remap.set(ws.id, ws.id); continue; }
        const sameName = existing && nextSettings.workspaces.find(w => w.name === ws.name && w.id !== 'w_default');
        if (sameName) { remap.set(ws.id, sameName.id); continue; }
        if (nextSettings.workspaces.length >= 10) throw new Error('There is no room for the imported workspaces. Remove one or use restore in Settings.');
        const id = existing ? newId('w_') : ws.id;
        nextSettings.workspaces.push({ id, name: ws.name });
        remap.set(ws.id, id);
      }
    }
    const ids = new Set(nextSettings.workspaces.map(ws => ws.id));
    if (mode === 'replace' && !Object.hasOwn(data, 'shortcuts') &&
        current.shortcuts.some(item => !ids.has(item.workspaceId || 'w_default'))) {
      throw new Error('This partial backup would remove workspaces used by your existing shortcuts. Use merge or a full backup.');
    }
    const rawShortcuts = Array.isArray(data.shortcuts) ? data.shortcuts.map(item => item &&
      ({ ...item, workspaceId: remap.get(item.workspaceId) || item.workspaceId })) : [];
    const incoming = shortcuts(rawShortcuts, ids);
    const incomingSnippets = snippets(data.snippets);
    if ((rawShortcuts.length && !incoming.length) ||
        (Array.isArray(data.snippets) && data.snippets.length && !incomingSnippets.length)) {
      throw new Error('The backup contains an invalid collection. Your existing data was kept.');
    }
    // Partial restores preserve collections that are absent from the backup.
    const nextShortcuts = mode === 'merge' || !Object.hasOwn(data, 'shortcuts') ? [...current.shortcuts] : [];
    const nextSnippets = mode === 'merge' || !Object.hasOwn(data, 'snippets') ? [...current.snippets] : [];
    const seenLinks = new Set(nextShortcuts.map(s => JSON.stringify([s.workspaceId, s.url])));
    const contentKey = item => JSON.stringify([item.title, item.text, item.tags]);
    const seenContent = new Set(nextSnippets.map(contentKey));
    const seenIds = new Set(nextSnippets.map(item => item.id));
    let added = 0, addedSnippets = 0;
    for (const item of incoming) {
      const key = JSON.stringify([item.workspaceId, item.url]);
      if (!seenLinks.has(key)) { nextShortcuts.push(item); seenLinks.add(key); added++; }
    }
    for (const item of incomingSnippets) {
      const key = contentKey(item);
      if (seenContent.has(key)) continue;
      // Two independently created snippets may have the same old timestamp ID.
      if (seenIds.has(item.id)) {
        item.id = newId('snip_');
        if (typeof item.id !== 'string' || !item.id || seenIds.has(item.id)) throw new Error('Could not assign a unique snippet ID. Try the import again.');
      }
      seenContent.add(key);
      seenIds.add(item.id);
      nextSnippets.push(item); addedSnippets++;
    }
    if (!incoming.length && !incomingSnippets.length &&
        !((Array.isArray(data.shortcuts) && data.shortcuts.length === 0) || (Array.isArray(data.snippets) && data.snippets.length === 0))) {
      throw new Error('No valid shortcuts or snippets found.');
    }
    const counts = mode === 'merge' ? { ...current.usageCounts } : usageCounts(data.usageCounts);
    if (mode === 'merge') for (const [url, count] of Object.entries(usageCounts(data.usageCounts))) {
      counts[url] = Math.max(counts[url] || 0, count); // Repeated imports are idempotent.
    }
    return { shortcuts: shortcuts(nextShortcuts, ids), snippets: nextSnippets, settings: nextSettings,
      usageCounts: counts, sortMode: ['manual', 'most-used', 'az'].includes(data.sortMode) ? data.sortMode : current.sortMode,
      added, addedSnippets, skipped: rawShortcuts.length - added + (Array.isArray(data.snippets) ? data.snippets.length : 0) - addedSnippets };
  }

  function workspaces(value) {
    const items = [];
    const seen = new Set();
    if (!Array.isArray(value)) return [{ ...defaultWorkspace }];
    for (const ws of value) {
      if (!ws || typeof ws.id !== 'string' || typeof ws.name !== 'string') continue;
      const id = ws.id.trim();
      const name = ws.name.trim();
      if (!id || !name || seen.has(id)) continue;
      if (items.length >= 10) break;
      seen.add(id);
      items.push({ id, name });
    }
    if (!seen.has('w_default')) {
      items.unshift({ ...defaultWorkspace });
      items.length = Math.min(items.length, 10);
    }
    return items;
  }

  function shortcuts(value, validWorkspaceIds) {
    if (!Array.isArray(value)) return [];
    return value.flatMap(item => {
      const url = webUrl(item?.url);
      if (!url) return [];
      return [{
        title: typeof item.title === 'string' && item.title.trim() ? item.title.trim() : new URL(url).hostname,
        url,
        icon: safeIcon(item.icon),
        workspaceId: validWorkspaceIds.has(item.workspaceId) ? item.workspaceId : 'w_default'
      }];
    });
  }

  function snippets(value) {
    if (!Array.isArray(value)) return [];
    const seen = new Set();
    return value.flatMap(item => {
      if (!item || typeof item.id !== 'string' || !item.id || seen.has(item.id) || typeof item.text !== 'string') return [];
      seen.add(item.id);
      return [{
        id: item.id,
        title: typeof item.title === 'string' && item.title.trim() ? item.title.trim() : 'Untitled Snippet',
        text: item.text,
        tags: Array.isArray(item.tags) ? item.tags.filter(t => typeof t === 'string') : []
      }];
    });
  }

  function usageCounts(value) {
    const counts = {};
    if (!value || typeof value !== 'object' || Array.isArray(value)) return counts;
    for (const [url, count] of Object.entries(value)) {
      if (webUrl(url) && Number.isSafeInteger(count) && count >= 0) {
        Object.defineProperty(counts, url, { value: count, enumerable: true, writable: true, configurable: true });
      }
    }
    return counts;
  }

  function settings(value, defaults) {
    const result = { ...defaults, workspaces: workspaces(defaults.workspaces) };
    if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
    const numberInRange = (key, min, max) => {
      if (Number.isInteger(value[key]) && value[key] >= min && value[key] <= max) result[key] = value[key];
    };
    numberInRange('rows', 1, 20);
    numberInRange('cols', 1, 10);
    numberInRange('fontSize', 10, 18);
    numberInRange('gridGap', 4, 32);
    numberInRange('popupWidth', 300, 560);
    if ([32, 48, 64].includes(value.iconSize)) result.iconSize = value.iconSize;
    for (const key of ['showTitles', 'showBadges', 'openInNewTab', 'keepOpenAfterCopy']) {
      if (typeof value[key] === 'boolean') result[key] = value[key];
    }
    for (const [key, choices] of Object.entries({
      theme: ['dark', 'light', 'system'],
      iconShape: ['circle', 'rounded', 'square'],
      hotkeyAction: ['launch', 'type'], searchPosition: ['top', 'bottom']
    })) {
      if (choices.includes(value[key])) result[key] = value[key];
    }
    result.workspaces = workspaces(value.workspaces ?? defaults.workspaces);
    return result;
  }

  return { webUrl, inputUrl, safeIcon, workspaces, shortcuts, snippets, usageCounts, settings, importData, exportData, MAX_IMPORT_BYTES };
})();
