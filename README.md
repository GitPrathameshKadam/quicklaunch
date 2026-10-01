# 🚀 QuickLaunch - Customizable Shortcut Extension (v2.7 candidate)

QuickLaunch is a premium, highly configurable Chrome extension that transforms your browser popup into a streamlined, beautiful grid of your favorite website shortcuts and text snippets. Built for speed, aesthetics, and maximum productivity.

## 2.7 interface and reliability update

- Shared saves are serialized in the background worker. A stale editor asks you to reload instead of overwriting newer saved data.
- Save comparisons ignore object-field order while preserving list order, avoiding false conflicts after browser storage round-trips. See [the native Brave fix verification](docs/STORAGE_CONFLICT_FIX_2026-09-30.md).
- Failed saves stop editing and show recovery instructions instead of a success message.
- Startup waits for saved data before enabling edits. Collection saves prevent repeated actions and stale dialog callbacks; queued saves retain their order during focus changes.
- Exports include empty collections and current committed preferences; bulk snippet merges avoid repeated full-list scans.
- Clipboard placeholders stop copying on permission or read failure; inserted clipboard text remains literal.
- Snippet previews render on expansion, with bounded Markdown and syntax highlighting work.
- Backup merge preserves workspace-specific shortcuts and ID collisions; partial restores preserve collections omitted from a backup.
- The popup adapts columns to the available width, with keyboard navigation following the rendered grid.
- Popup and Settings share layered dark/light surfaces, aligned controls, grouped settings, and responsive layouts.
- Short view transitions, spring hover feedback, and animated snippet expansion respect reduced-motion preferences. Popup editors keep Save and Cancel visible.
- Search ranks exact titles and prefixes, supports multiple words and accents, and labels shortcut results with their workspace. Press Enter to use the first result, Cmd/Ctrl+F to focus search, or Escape to clear it.
- Enable **Behavior → Keep popup open after copying** to copy several snippets in one session. Copy feedback stays on the card and preserves keyboard focus.
- Regression checks and a reproducible, allowlisted Store package are included. See [the review](docs/REVIEW_2026-09-30.md) for verification limits and remaining release checks.
- See [the UI review](docs/UI_REVIEW_2026-09-30.md) for the redesign and [the workflow follow-up](docs/WORKFLOW_REVIEW_2026-09-30.md) for the latest rendered checks, search measurements, and screenshots.
- See [the production follow-up](docs/PRODUCTION_REVIEW_2026-09-30.md) for delayed-operation regressions, native verification, build gates, and remaining acceptance limits.
- See [the copyright and Store policy review](docs/POLICY_REVIEW_2026-10-02.md) for license attribution, updated privacy wording, release images and submission requirements.

## ✨ Highlights

- **🧩 Snippet Placeholders**: Snippets can contain `{{clipboard}}`, `{{date}}`, `{{time}}`, and `{{datetime}}` tokens that are filled in at the moment you copy. Perfect for AI prompt templates — e.g. `Review this chart data: {{clipboard}}` pastes your copied data straight into the prompt.
- **🗂️ Open Workspace as Tab Group**: One click on the layers icon in the popup header opens every shortcut in the active workspace as a named, coloured Chrome tab group. Spin up your whole trading/work/research setup in a single action.

## Features

- **📝 Collapsible Snippets UI**: Snippet cards collapse by default to show only titles, preserving popup space. Click the "V"-shaped down-arrow button to expand and view the full content (tags, code blocks, and markdown).
- **📝 Markdown & Code Highlighting in Snippets**: Local text and code formatting via bundled `marked.js` and `highlight.js`. Remote images and raw HTML are not loaded in previews.
- **🏷️ Snippet Tags & Search**: Organize snippets using comma-separated tags. Search titles, tags, and body text with multiple words in any order.
- **🖱️ Relocated Workspace Tabs**: Tabs are now docked stickily at the bottom of the popup for a cleaner structure.
- **⌨️ Workspace Switching Hotkeys**: Navigate between workspaces instantly using `Ctrl+1-9` / `Cmd+1-9`.
- **🔒 Limited Tab Access**: Uses `activeTab` for user-triggered current-page actions and an optional clipboard-read permission for the clipboard placeholder.
- **🔍 Ranked Local Search**: Search shortcuts across workspaces, with workspace labels on results. Exact title and prefix matches rank ahead of weaker matches. Search ignores accents and repeated whitespace; subsequence matching is limited to titles, URLs, and tags to avoid irrelevant matches in long snippet bodies.
- **⌨️ Keyboard-First Control**:
  - **Global Toggle**: Open the extension instantly using `Ctrl+Shift+E` (or `Cmd+Shift+E` on Mac).
  - **Workspace Switching**: Press `Ctrl+1-9` / `Cmd+1-9` to switch workspaces instantly.
  - **Grid Navigation**: Use `Arrow Keys` to navigate between shortcut tiles. Press `ArrowDown` in the search bar to focus the first item, and `ArrowUp` on the top row to return to the search bar.
  - **Left/Right Arrow Keys**: Quickly switch between the Shortcuts and Snippets dashboards when the search bar is empty.
  - **Search Commands**: Press `Enter` in a nonempty search to launch or copy the first result. `Cmd/Ctrl+F` focuses and selects search; `Escape` clears it.
  - **Instant Hotkey Launch**: Press `1-9` or `0` to launch shortcuts (in Shortcuts mode) or copy a snippet (in Snippets mode). Copy closes the popup by default; enable **Keep popup open after copying** for repeated use.
  - **Modal Shortcuts**: Save edits or additions instantly using `Cmd/Ctrl+Enter`, or close/cancel with `Escape`.
- **🔗 Context Menus & Notifications**: Save web pages or web links to the last selected workspace via the right-click menu, with a brief confirmation notification.
- **✨ Onboarding Quick-Start Chips**: Interactive recommendation chips show up on empty workspaces, letting you populate standard shortcuts (Google, YouTube, GitHub, ChatGPT) with a single click.
- **🪄 Premium Micro-Interactions**:
  - Short transitions when switching views and workspaces.
  - Subtle spring hover on shortcut tiles, with steady targets in edit/drag mode.
  - Smooth snippet expansion and copy confirmation feedback.
  - Reduced-motion support throughout the popup and Settings.
- **📝 Snippets Dashboard**: Store and manage large text blocks (like complex AI prompts) that bypass macOS text-replacement length limits. Click-to-copy with card feedback and an optional repeated-copy workflow.
- **⚡ In-Popup URL & Title Editing**: Edit your URL shortcuts directly within the popup via a sleek slide-up bottom sheet—no need to open the full settings page.
- **🔄 Improved Drag & Drop**: Smooth manual reordering of shortcuts and snippets. Features an automatic warning alert if you attempt to rearrange items when a sorting mode other than **Manual** is active.
- **🗂️ Workspaces (Tabs)**: Organize your shortcuts into multiple tabs (e.g., Work, Social, Dev). Rename and reorder them to suit your workflow.
- **🎨 Premium Visuals & Refined Layout**:
  - Balanced button alignment in Edit Mode (Delete top-left, Edit top-right).
  - Compact interface with smooth transitions.
  - Configurable icon shapes (Circle, Rounded, Square) and sizes.
  - Dark, Light, and System color modes.
- **📊 Smart Sorting**: Choose between Manual, Alphabetical, and Most-Used sorting. Frequency tracking automatically prioritizes your most-visited shortcuts.
- **💾 Import/Export Everywhere**: Backup or transfer both your shortcuts and snippets configurations via JSON files directly from the popup banner or the options dashboard.
- **📋 Right-Click Copy**: Instantly copy any shortcut URL to your clipboard by right-clicking it in the popup.
- **⚙️ Hotkey Behavior**: Choose whether numeric keys (`1-9`, `0`) launch shortcuts instantly or type into the search bar.
- **🛡️ Danger Zone**: Fine-grained control to reset just usage counts or wipe all data.
- **📏 Expanded Grid**: Supports up to a 20x10 grid and up to 560px popup width.

## 🛠️ Installation

### For Developers (Manual Load)

1. Download or clone this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the folder containing the extension files.

## 🚀 Usage

1. **Open QuickLaunch**: Press `Ctrl+Shift+E` / `Cmd+Shift+E` or click the extension icon in your toolbar.
2. **Switch Modes & Navigate**: 
   - Press Left/Right arrow keys (when the search bar is empty) to switch between `Shortcuts` and `Snippets` modes.
   - Press `Ctrl+1-9` / `Cmd+1-9` to switch workspaces instantly.
   - Use `Arrow Keys` to navigate between tiles. Press `ArrowDown` in the search bar to focus the first tile, and `ArrowUp` on the top row to return to search.
3. **Launch Fast / Copy Snippets**:
   - In Shortcuts: Click any tile or press `1-9` / `0` to open them instantly.
   - In Snippets: Click a card or its Copy button to copy the text. Expand/collapse snippets with the down arrow (`V`). Enable **Behavior → Keep popup open after copying** to copy several snippets without reopening the extension.
4. **Manage Items (Edit Mode)**: Click the pencil icon (📝) in the popup.
   - In Shortcuts: Rearrange by dragging (ensure sorting mode is Manual), delete (top-left), or click edit (top-right) to modify the title/URL.
   - In Snippets: Edit title/content or remove snippets.
5. **Add Items**: Click the `+` button to add the current tab as a shortcut, or add a custom snippet if in Snippets mode. Or right-click any link on a webpage and select "Add to QuickLaunch".
6. **Full Dashboard**: Click the gear icon (⚙️) to fine-tune your grid layout, themes, behavior, and manage all shortcuts and snippets in bulk.

## 📂 Project Structure

```text
QuickLaunch/
├── assets/          # High-resolution icons and assets
│   ├── libs/        # Third-party libraries (marked.js, highlight.js, styles)
│   └── ...          # App icons (icon16, icon48, icon128, etc.)
├── manifest.json    # Extension v3 configuration with global commands/shortcuts
├── background.js    # Service worker (Context menus, storage, and notifications)
├── popup.html       # The main interface (Shortcuts + Snippets support, onboarding)
├── backup.js        # Shared validation and import/restore rules
├── storage.js       # Checked UI saves
├── storage-value.js # Shared content comparison across storage round-trips
├── storage-worker.js # Serialized background commits
├── snippet.js       # Safe placeholder expansion
├── search.js        # Cached local relevance ranking
├── popup.js         # Search, edit mode, drag-and-drop, keyboard navigation
├── popup.css        # Premium styling with animations and transitions
├── options.html     # Configuration dashboard
├── options.js       # Settings, modal hotkeys, & bulk shortcuts/snippets CRUD
├── options.css      # Dashboard aesthetics
├── ui.css           # Shared appearance and accessibility
├── tests/           # Regression checks
└── scripts/         # Release validation, packaging, and visual preview
```

---

_Built with ❤️ for a faster browsing experience._

For the Chrome Web Store submission checklist and listing copy, see [STORE_RELEASE.md](STORE_RELEASE.md).

## Release checks

Use Node.js 22 or newer and Python 3. Test dependencies are development-only and are excluded from the Store package. Test files run sequentially to keep DOM fixtures and hard parser deadlines reliable on a busy development machine.

```sh
npm ci --ignore-scripts
npm run package
```

Packaging runs tests and structural checks before writing the candidate ZIP, SHA-256, and per-file hashes to `dist/`. Run `npm test` or `npm run check` independently during development. Only files in `scripts/release-files.json` are shipped. Browser fixtures, test data, documentation, repository metadata, and development dependencies are excluded. A failed build is not approval to upload an older ZIP left in `dist/`; use the reviewed archive hash.

For synthetic visual checks, run `node scripts/preview.cjs` and visit `http://127.0.0.1:4317/popup.html` or `/options.html`. This preview uses fake extension APIs and does not replace normal-Chrome testing.
