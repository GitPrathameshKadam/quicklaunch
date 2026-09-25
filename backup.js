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

  function workspaces(value) {
    const items = [];
    const seen = new Set();
    if (!Array.isArray(value)) return [defaultWorkspace];
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
      items.unshift(defaultWorkspace);
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
    for (const key of ['showTitles', 'showBadges', 'openInNewTab']) {
      if (typeof value[key] === 'boolean') result[key] = value[key];
    }
    for (const [key, choices] of Object.entries({
      theme: ['dark', 'light', 'system'], iconShape: ['circle', 'rounded', 'square'],
      hotkeyAction: ['launch', 'type'], searchPosition: ['top', 'bottom']
    })) {
      if (choices.includes(value[key])) result[key] = value[key];
    }
    if (value.accentColor === '' ||
        (typeof value.accentColor === 'string' && /^#[0-9a-f]{6}$/i.test(value.accentColor))) {
      result.accentColor = value.accentColor;
    }
    result.workspaces = workspaces(value.workspaces ?? defaults.workspaces);
    return result;
  }

  return { webUrl, safeIcon, workspaces, shortcuts, snippets, usageCounts, settings };
})();
