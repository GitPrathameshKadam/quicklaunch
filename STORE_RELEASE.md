# QuickLaunch 2.7 review submission

Prepared September 30, 2026; submission checkpoint updated October 4 after installed-Chrome acceptance on October 3–4. The user explicitly authorized **submission for review with deferred publication**. Native acceptance below is complete for the recorded methods, not a universal production or policy certification. The Store confirmed submission of **2.7** on October 4 and now shows **Pending review**. Automatic publication after review was disabled; published version remains **2.6**. Version 2.7 has not been approved or publicly deployed.

- After submission on October 4, the dashboard Package Information tables showed draft **2.7** and published **2.6**. The September 30 public-listing verification remains a historical checkpoint.
- Next version: **2.7**, minimum Chrome **114**; permissions are unchanged.
- Build with `npm run package`; it requires regression and structural checks to pass before writing an archive.
- Upload candidate: `dist/quicklaunch-v2.7.zip`, **127,477 bytes / 26 files**, SHA-256 `94d84a2b269721277a9fc4bb1fccbfa7de8d01094cda0d033b9c7ca706ef53eb`. Archive CRC and every packaged byte match current source; adjacent hash records are current.
- Tested source commit: `cea8a2cae7f22ac43797c4189803584a6c1e297e`, pushed to the reviewed GitHub branch. [CI run 37158126755](https://github.com/GitPrathameshKadam/quicklaunch/actions/runs/37158126755) and package job `111305717569` completed successfully: **96 tests passed / 0 failed**, **26** packaged files passed structural checks, and the package step verified the same final SHA-256 and current-source parity.
- Installed-Chrome acceptance: [CHROME_ACCEPTANCE_2026-10-03.md](docs/CHROME_ACCEPTANCE_2026-10-03.md), covering the October 3–4 methods and limits.
- Earlier source review and historical checkpoints: [REVIEW_2026-09-30.md](docs/REVIEW_2026-09-30.md).
- Interface review and current rendered evidence: [UI_REVIEW_2026-09-30.md](docs/UI_REVIEW_2026-09-30.md).
- Latest workflow additions and rendered evidence: [WORKFLOW_REVIEW_2026-09-30.md](docs/WORKFLOW_REVIEW_2026-09-30.md).
- Earlier false-conflict fix and focused native Brave saves: [STORAGE_CONFLICT_FIX_2026-09-30.md](docs/STORAGE_CONFLICT_FIX_2026-09-30.md). Normal-Chrome results supersede that limited native checkpoint.
- Copyright, privacy and listing artifact review: [POLICY_REVIEW_2026-10-02.md](docs/POLICY_REVIEW_2026-10-02.md).
- Source production audit: [PRODUCTION_REVIEW_2026-09-30.md](docs/PRODUCTION_REVIEW_2026-09-30.md), including delayed-operation regressions, legacy fixtures and build failure injection. Its earlier submission hold describes the prior checkpoint.
- Public privacy policy is deployed and byte-matches the packaged policy. The Store Privacy draft was inspected and saved with updated permission justifications; free/public/all-regions Distribution was inspected. At-rest encryption applicability remains unresolved, as described in the policy review. Review submission does not certify an exemption or complete policy clearance.

## Proposed release notes

Protects saved data from concurrent edits and reports failed saves clearly. Fixes clipboard placeholder failures, backup restore and workspace merge problems, numeric hotkeys, and compact grid overlap. Snippet previews now render only when expanded. Tab-group launches run in the background, and keyboard accessibility has improved.

Redesigned popup and Settings with consistent layered surfaces, spacing, typography, and aligned controls. Snippet Copy actions use a compact icon/text button with a neutral keyboard hint. Added smooth view changes and snippet expansion with reduced-motion support. Popup editors keep Save and Cancel visible, and keyboard focus stays inside dialogs.

Search now ranks relevant titles, supports multiple words and accents, and identifies each shortcut's workspace. Enter uses the first search result; Cmd/Ctrl+F focuses search and Escape clears it. A new Behavior option keeps the popup open for repeated snippet copying with stable card feedback. Fixed lost first-character input, misleading number hints, and narrow-popup error messages.

Fixed false save conflicts caused by object-field ordering during storage round-trips. Meaningful concurrent changes and list-order changes remain protected.

Prevents edits before saved data loads, repeated collection actions during saves, and delayed callbacks opening obsolete editors. Fixes stale Settings row targets, launch/permission error handling and incomplete backup exports. Improves bulk snippet import performance and preserves all partial-launch warnings.

## Completed acceptance and submission work

- [x] Load the extracted candidate in signed-out **QuickLaunch QA**, normal Chrome **154.0.8037.95 arm64**; upgrade from the byte-verified 2.6 archive at the same unpacked identity with representative shortcuts, two workspaces, snippets, counts and view preferences preserved.
- [x] Verify first Settings save and meaningful concurrent-save recovery. The deliberate stale-save test produced one expected conflict error, preserved both saved datasets and offered reload; it was recorded and cleared only in the QA console. October 4 Options Console contained zero messages after the successful paths.
- [x] Save a new snippet and immediately dismiss the popup with Escape, then use native `chrome://restart` and reopen the existing QA profile. Saved title/body, preferences, workspaces and counts survived. The resulting local QA export has SHA-256 `5a4b7985bf8f16e702cb60713d11945ca0faff001a5144ff83222233ec41254c` and confirmed Google/Wikipedia/English-Wikipedia counts **8 / 4 / 1**.
- [x] Verify actual export/restore with sample data; repeated snippet copying, default close behavior, Enter/number hotkeys, and clipboard permission **deny/grant/revoke**. Clipboard-read access is off at the final checkpoint.
- [x] Launch Google in current-tab mode: it replaced the Wikipedia tab without adding a tab, displayed a native Google favicon, and Quick Add detected the existing Google title/URL without increasing the three-shortcut count.
- [x] Launch the Design workspace: a real two-tab Wikipedia group completed after the popup closed. Wikipedia's count rose **3→4** and English Wikipedia's **0→1**.
- [x] Verify final inline rename to **Google Search** and all three accessible tile labels. Observe native Appearance view changes and scroll, select System mode, exercise Chrome Rendering's `prefers-reduced-motion: reduce` override, then restore **No emulation**. Final QA state retains clipboard access off, Keep popup open enabled and current-tab launch mode.
- [x] Pass **96/96** regressions and package structure checks; verify **26** shipping files, CRC, final source parity and hash. Delayed startup/save, forced quota/read failures, clipboard read failure, drag cancellation/pointer races and partial group failure are covered by regression tests; they were not deliberately forced in the native profile. These classifications are recorded in the acceptance report.
- [x] Publish the reviewed privacy policy: public HTTP 200 and exact live/package policy parity verified; inspect/save Store Privacy justifications and retain the accurate unencrypted-storage disclosure.
- [x] Capture and inspect three final native 1280×800 RGB PNGs, upload them to the draft, and remove the old screenshots after user confirmation. Inventory and hashes: [RELEASE_IMAGES.md](promo/RELEASE_IMAGES.md). Older synthetic JPGs, including the light mid-transition capture, are superseded; the 380×510 popup JPG remains QA-only.
- [x] Reload the Store Listing on October 4 and verify the three thumbnails show final dark Settings, dark Snippets and light Appearance. Click **Save draft** and observe **Item saved**. This records the pre-submission listing-image checkpoint; the update was subsequently submitted as recorded below.
- [x] Reconcile final source/docs/images on the reviewed GitHub branch, rebuild there and compare the final hash before upload. Pushed source commit `cea8a2c` and successful CI run `37158126755` verified the recorded final package.
- [x] Upload the final ZIP; the dashboard accepted version **2.7** with unchanged permissions and the recorded package hash.
- [x] Submit for review with **deferred publication**; observe the confirmation and **Pending review** status. No full policy clearance, Google approval or public deployment is implied by submitting.

The September 30 folder-picker problem is historical; the October 3–4 normal-Chrome acceptance run completed. The documented methods do not certify every crash, OS condition, capacity limit or fault scenario. Obtain authoritative clarification of the at-rest encryption question, or a designed/tested implementation, before claiming that requirement is satisfied. The prepared support inquiry remains unsent.

---

# Historical QuickLaunch 2.6 Chrome Web Store release

The following is the archived September 25 submission record and original guidance. Its unchecked checklist is historical and does not describe the remaining work for the current 2.7 review submission.

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

## October 4 upload checkpoint

Before submission, the dashboard accepted `quicklaunch-v2.7.zip` at the recorded final hash. Package tables showed draft 2.7 and published 2.6 with the same permission list. The three native listing images persisted after reload, and Save draft reported Item saved. Saved 496-character reviewer instructions describe ordinary unencrypted local storage and the core testing steps; no credentials were provided. This is the historical upload/listing checkpoint, followed by the confirmed submission below.

## Submission record (4 October 2026)

- Chrome Web Store item ID: `dihfnkdobkjncafdlhephnongepaiphf`.
- Submitted version: **2.7**, archive `quicklaunch-v2.7.zip`, **127,477 bytes / 26 entries**, SHA-256 `94d84a2b269721277a9fc4bb1fccbfa7de8d01094cda0d033b9c7ca706ef53eb`.
- In the submission dialog, **Publish 'QuickLaunch' automatically after it has passed review** was unchecked; its value was observed changing from **1 to 0** before the final Submit action. No new terms were presented.
- Confirmation heading: **Your extension was submitted for review**. The dialog stated that items staged for later publication expire **30 days after they have passed review**.
- After confirming the dialog, the header displayed **Pending review**. The Status view's Draft tab displayed **This draft is pending review**. A subsequent Package Information check showed draft **2.7** and published **2.6**.
- Publication is **deferred/manual**. Google approval has not been granted at this checkpoint; version 2.7 is not live. After review approval, a separate publication action is required. The at-rest encryption applicability question remains unresolved; review submission and any later approval must not be described as a blanket policy exemption. The support inquiry remains unsent.
