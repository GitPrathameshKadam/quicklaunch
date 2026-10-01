# QuickLaunch 2.7 release candidate

Prepared September 30, 2026. This is a local candidate pending the real-Chrome checks below.

- Published listing was last verified on September 30 as **2.6**, updated September 26, 2026. Recheck its live state before submission.
- Next version: **2.7**, minimum Chrome **114**; permissions are unchanged.
- Build with `npm run package`; it requires regression and structural checks to pass before writing an archive.
- Upload candidate: `dist/quicklaunch-v2.7.zip`, with hash and source parity records beside it.
- Detailed review and outstanding acceptance checks: [REVIEW_2026-09-30.md](docs/REVIEW_2026-09-30.md).
- Interface review and current rendered evidence: [UI_REVIEW_2026-09-30.md](docs/UI_REVIEW_2026-09-30.md).
- Latest workflow additions and rendered evidence: [WORKFLOW_REVIEW_2026-09-30.md](docs/WORKFLOW_REVIEW_2026-09-30.md).
- False-conflict fix and successful native Brave saves: [STORAGE_CONFLICT_FIX_2026-09-30.md](docs/STORAGE_CONFLICT_FIX_2026-09-30.md). Broader Chrome acceptance checks below remain open.
- Copyright, privacy and listing artifact review: [POLICY_REVIEW_2026-10-02.md](docs/POLICY_REVIEW_2026-10-02.md).
- Latest production audit: [PRODUCTION_REVIEW_2026-09-30.md](docs/PRODUCTION_REVIEW_2026-09-30.md), including startup/pending-operation data-loss fixes, native Brave save/download checks, legacy fixtures and build failure injection. **Submission remains on hold.**

## Proposed release notes

Protects saved data from concurrent edits and reports failed saves clearly. Fixes clipboard placeholder failures, backup restore and workspace merge problems, numeric hotkeys, and compact grid overlap. Snippet previews now render only when expanded. Tab-group launches run in the background, and keyboard accessibility has improved.

Redesigned popup and Settings with consistent layered surfaces, spacing, typography, and aligned controls. Snippet Copy actions use a compact icon/text button with a neutral keyboard hint. Added smooth view changes and snippet expansion with reduced-motion support. Popup editors keep Save and Cancel visible, and keyboard focus stays inside dialogs.

Search now ranks relevant titles, supports multiple words and accents, and identifies each shortcut's workspace. Enter uses the first search result; Cmd/Ctrl+F focuses search and Escape clears it. A new Behavior option keeps the popup open for repeated snippet copying with stable card feedback. Fixed lost first-character input, misleading number hints, and narrow-popup error messages.

Fixed false save conflicts caused by object-field ordering during storage round-trips. Meaningful concurrent changes and list-order changes remain protected.

Prevents edits before saved data loads, repeated collection actions during saves, and delayed callbacks opening obsolete editors. Fixes stale Settings row targets, launch/permission error handling and incomplete backup exports. Improves bulk snippet import performance and preserves all partial-launch warnings.

## Required before submission

- [ ] Load the extracted candidate ZIP in a clean normal-Chrome profile and verify there are no service-worker, CSP, or extension errors.
- [ ] Verify upgrade from the byte-verified 2.6 archive with shortcuts, two workspaces, snippets, counts, and search-position settings preserved.
- [ ] Save from the popup while Settings is open; confirm a stale conflicting save shows reload instructions and preserves both saved datasets.
- [ ] Close the popup immediately during a shortcut/group launch and immediately after Save; verify persisted content and counts after reopening and a browser restart.
- [ ] Verify delayed startup/save interaction and actual export/restore with synthetic data in installed Chrome. Native Brave reload/save/download checks are recorded; they do not complete this Chrome gate.
- [ ] Verify clipboard permission **deny, grant, revoke**, and read failure on Settings/Behavior. Grant/revoke require the user to handle Chrome's permission prompt.
- [ ] Verify repeated snippet copying with Keep popup open enabled, default close behavior when disabled, Enter/number copy matching the ranked list, and the new preference surviving upgrade/export/restore.
- [ ] Confirm drag, cancel, scroll, and inline rename in the real popup, including reduced-motion and System theme behavior.
- [ ] Verify actual cached favicons, current-tab launch, and partial group failure in Chrome.
- [ ] Publish the reviewed privacy policy so the public page describes 2.7 clipboard failure behavior and error notifications.
- [ ] Compare the new 1280×800 `promo/v2.7-settings-dark.jpg`, `promo/v2.7-snippets-dark.jpg` and `promo/v2.7-appearance-light.jpg` with the extracted candidate in installed Chrome, then replace the old listing images. These captures use real UI code with synthetic APIs/data. `promo/v2.7-popup-copy.jpg` is a 380×510 QA image, not a valid Store screenshot size. See `promo/RELEASE_IMAGES.md`.
- [ ] Re-run release checks, verify the ZIP hash, then submit the approved package.

The native folder picker prevented completion of the normal-Chrome load in the September 30 review. The synthetic browser preview and mocked API checks are recorded separately in the detailed report.

---

# QuickLaunch 2.6 Chrome Web Store release

## Submission record (25 September 2026)

- Chrome Web Store item ID: `dihfnkdobkjncafdlhephnongepaiphf`.
- Dashboard state after submission: **Pending review**. Automatic publication after approval was selected; this is not yet a live Store listing.
- Submitted archive: `quicklaunch-v2.6-store-fixed.zip`, SHA-256 `d0239707c0475fa67f407992dc119b51597fd5cdb002f7b6a783a6f98ece94ad` (19 verified entries).
- Public privacy policy: <https://gitprathameshkadam.github.io/quicklaunch/privacy.html> (verified HTTP 200), served from the `codex/privacy-policy-site` branch.
- Public source and homepage were synced to 2.6 on GitHub `main` at commit `8fd1b8e` after submission; release package files match the submitted archive.
- Bundled library licenses and theme attribution are in `THIRD_PARTY_NOTICES.md` and `third_party_licenses/` inside the archive.
- Release checks completed: ZIP entry comparison, four backup tests, `git diff --check`, Chrome for Testing extension smoke and import/security flows, and dashboard acceptance of listing, disclosures, and images. A real-browser clipboard permission prompt remains the one manual functional check to repeat after review.

## Store listing copy

**Single purpose:** Quick access to saved websites and reusable text snippets from the browser toolbar.

**Short description:** Save and launch website shortcuts, organize workspaces, and copy reusable snippets from a keyboard-friendly popup.

**Detailed description:**

QuickLaunch keeps your frequently used websites and text snippets within reach. Save the current page or a web link, organize shortcuts into workspaces, search by title or URL, and open a workspace as a tab group. Use number keys to launch visible shortcuts, or switch to Snippets to copy reusable text and Markdown-formatted notes. Settings include theme, grid layout, sorting, and JSON backup and restore.

Shortcuts, snippets, and settings are stored in Chrome's local extension storage. QuickLaunch has no account, analytics, ads, or developer-operated data service. Opening a shortcut sends a normal browser request to that website. Clipboard reading is optional and only used when copying a snippet containing `{{clipboard}}`.

## Permission explanations for the Privacy tab

| Permission | Reason |
| --- | --- |
| `storage` | Save shortcuts, snippets, preferences, drafts, and usage counts locally. |
| `activeTab` | Read a page URL and title after the user opens the popup or chooses the context menu. |
| `contextMenus` | Add the user-triggered “Add to QuickLaunch” page/link action. |
| `notifications` | Confirm the result of that context-menu action. |
| `tabGroups` | Name and color a group of tabs opened from a workspace. |
| `favicon` | Show icons from Chrome's local favicon cache. |
| `clipboardWrite` | Copy snippets or shortcut URLs when selected. |
| Optional `clipboardRead` | Expand `{{clipboard}}` when the user enables this in Settings. |

The extension handles saved URLs, local per-URL counts, snippets and optional clipboard text. Explain that processing is local and there is no developer collection, sale, analytics or server upload. Review the current dashboard definitions when selecting data-usage categories; do not treat a permission declaration as proof of off-device collection or omit local processing from the privacy policy. Certify Limited Use, no sale, no unrelated use and no credit/lending use only after checking the actual fields. The live dashboard answers were not inspected in this round; keep them consistent with the published policy and candidate behavior.

## Submission checklist

- [ ] Publish `privacy.html` at a stable public HTTPS URL and enter it in the dashboard's privacy-policy field. The file in the ZIP alone is not a public policy URL.
- [ ] Confirm the public page contains the same version, data practices, and Limited Use statement as the packaged page.
- [ ] Complete the dashboard Store Listing, Privacy, Distribution, and developer-account fields; enable account two-step verification.
- [ ] Upload `assets/icon128.png` and `promo/small-promo-tile.png` (440×280). `promo/quicklaunch-screenshot-settings.png` is a 1280×800 capture of the real settings UI with sample data; verify it against an unpacked Chrome build before using it. The existing `promo/quicklaunch-screenshot-1.png` is a promotional composite; use a genuine UI capture for the primary screenshot slot.
- [ ] On Chrome, load the unpacked extension in a fresh profile. Check initial empty state, add page/link, last-workspace context menu, search, numeric keys, snippets-only keyboard use, clipboard permission on/off, tab group confirmation, settings, and both import modes.
- [ ] In DevTools Network, preview a snippet containing Markdown and raw-HTML image URLs. Confirm there are no remote requests from preview. Check popup, options page, and service-worker consoles for errors.
- [ ] Upload `quicklaunch-v2.6-store-fixed.zip` after the browser checks above. The older `quicklaunch-v2.6-store.zip` predates these fixes. Defer publication until Store review is complete if a final manual check is desired.

Official references: [program policies](https://developer.chrome.com/docs/webstore/program-policies/policies), [privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy), [listing images](https://developer.chrome.com/docs/webstore/images), [publishing](https://developer.chrome.com/docs/webstore/publish/).
