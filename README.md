# 🚀 QuickLaunch - Customizable Shortcut Extension (v2.6)

QuickLaunch is a premium, highly configurable Chrome extension that transforms your browser popup into a streamlined, beautiful grid of your favorite website shortcuts and text snippets. Built for speed, aesthetics, and maximum productivity.

## ✨ Highlights

- **🧩 Snippet Placeholders**: Snippets can contain `{{clipboard}}`, `{{date}}`, `{{time}}`, and `{{datetime}}` tokens that are filled in at the moment you copy. Perfect for AI prompt templates — e.g. `Review this chart data: {{clipboard}}` pastes your copied data straight into the prompt.
- **🗂️ Open Workspace as Tab Group**: One click on the layers icon in the popup header opens every shortcut in the active workspace as a named, coloured Chrome tab group. Spin up your whole trading/work/research setup in a single action.

## Features

- **📝 Collapsible Snippets UI**: Snippet cards collapse by default to show only titles, preserving popup space. Click the "V"-shaped down-arrow button to expand and view the full content (tags, code blocks, and markdown).
- **📝 Markdown & Code Highlighting in Snippets**: Local text and code formatting via bundled `marked.js` and `highlight.js`. Remote images and raw HTML are not loaded in previews.
- **🏷️ Snippet Tags & Fuzzy Search**: Organize and search snippets using comma-separated tags. Search bar uses fuzzy search across snippet tags, titles, and text contents.
- **🖱️ Relocated Workspace Tabs**: Tabs are now docked stickily at the bottom of the popup for a cleaner structure.
- **⌨️ Workspace Switching Hotkeys**: Navigate between workspaces instantly using `Ctrl+1-9` / `Cmd+1-9`.
- **🔒 Limited Tab Access**: Uses `activeTab` for user-triggered current-page actions and an optional clipboard-read permission for the clipboard placeholder.
- **🔍 Fuzzy Search Integration**: Typos are no longer an issue. Find your shortcuts and snippets instantly with advanced fuzzy match ranking.
- **⌨️ Keyboard-First Control**:
  - **Global Toggle**: Open the extension instantly using `Ctrl+Shift+E` (or `Cmd+Shift+E` on Mac).
  - **Workspace Switching**: Press `Ctrl+1-9` / `Cmd+1-9` to switch workspaces instantly.
  - **Grid Navigation**: Use `Arrow Keys` to navigate between shortcut tiles. Press `ArrowDown` in the search bar to focus the first item, and `ArrowUp` on the top row to return to the search bar.
  - **Left/Right Arrow Keys**: Quickly switch between the Shortcuts and Snippets dashboards when the search bar is empty.
  - **Instant Hotkey Launch**: Press `1-9` or `0` to launch shortcuts instantly (in Shortcuts mode) or copy the snippet text to your clipboard and close the popup (in Snippets mode).
  - **Modal Shortcuts**: Save edits or additions instantly using `Cmd/Ctrl+Enter`, or close/cancel with `Escape`.
- **🔗 Context Menus & Notifications**: Save web pages or web links to the last selected workspace via the right-click menu, with a brief confirmation notification.
- **✨ Onboarding Quick-Start Chips**: Interactive recommendation chips show up on empty workspaces, letting you populate standard shortcuts (Google, YouTube, GitHub, ChatGPT) with a single click.
- **🪄 Premium Micro-Interactions**:
  - Beautiful staggered grid entrance animations.
  - Elastic "springy" hover states on all interactive elements.
  - Temporary copy confirmation checkmarks on snippets.
- **📝 Snippets Dashboard**: Store and manage large text blocks (like complex AI prompts) that bypass macOS text-replacement length limits. Click-to-copy with instant toast feedback.
- **⚡ In-Popup URL & Title Editing**: Edit your URL shortcuts directly within the popup via a sleek slide-up bottom sheet—no need to open the full settings page.
- **🔄 Improved Drag & Drop**: Smooth manual reordering of shortcuts and snippets. Features an automatic warning alert if you attempt to rearrange items when a sorting mode other than **Manual** is active.
- **🗂️ Workspaces (Tabs)**: Organize your shortcuts into multiple tabs (e.g., Work, Social, Dev). Rename and reorder them to suit your workflow.
- **🎨 Premium Visuals & Refined Layout**:
  - Balanced button alignment in Edit Mode (Delete top-left, Edit top-right).
  - Dynamic Glassmorphism UI with smooth transitions.
  - Configurable icon shapes (Circle, Rounded, Square) and sizes.
  - Custom accent colors with native theme support (Dark, Light, System).
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
   - In Snippets: Click any card to copy the text to your clipboard. Expand/collapse snippets by clicking the down arrow (`V`) button to see the full content.
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
├── backup.js        # Shared validation for imported JSON backups
├── popup.js         # Search, edit mode, drag-and-drop, keyboard navigation
├── popup.css        # Premium styling with animations and transitions
├── options.html     # Configuration dashboard
├── options.js       # Settings, modal hotkeys, & bulk shortcuts/snippets CRUD
└── options.css      # Dashboard aesthetics
```

---

_Built with ❤️ for a faster browsing experience._

Read the [privacy policy](https://gitprathameshkadam.github.io/quicklaunch/privacy.html) and [third-party notices](THIRD_PARTY_NOTICES.md).
