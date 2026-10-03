# Installed-Chrome acceptance: QuickLaunch 2.7

Executed October 3–4, 2026 in normal installed Google Chrome **154.0.8037.95 (Official Build), arm64**, macOS 27.0.1. All browser actions used native UI. The signed-out **QuickLaunch QA** profile is separate from the user's personal profile; only synthetic shortcuts, snippets and counts were imported. Following the user's request, the remaining live navigation checks used Google and Wikipedia.

## Candidate identity

- Final archive: `dist/quicklaunch-v2.7.zip`, **127,477 bytes**, **26 files**.
- SHA-256: `94d84a2b269721277a9fc4bb1fccbfa7de8d01094cda0d033b9c7ca706ef53eb`.
- Extracted byte-for-byte into `/private/tmp/quicklaunch-chrome-qa/extension`; no extra files.
- Native extension ID: `chlmobnfjoefmaanpeimffkjbnineaam`. First loaded the byte-verified 2.6 archive, then replaced that same unpacked folder with 2.7 and used Chrome's Reload control. Final accessibility fixes were reloaded at the same identity.
- The extension remained enabled after a full `chrome://restart` and reopening the existing QA profile. Chrome's startup settings did not reopen its QA website tabs; this is separate from extension data persistence.

## Observed acceptance results

| Check | Result and evidence |
| --- | --- |
| Real 2.6 → 2.7 upgrade | Passed: three shortcuts, three snippets, Main/Design workspaces, counts 7/3, dark theme and bottom search position survived. The first Settings snippet title save succeeded without the original false conflict. |
| Genuine concurrent write | Passed: kept an unsaved Settings edit open, saved a new snippet through the real popup and immediately closed it, then tried the stale Settings save. Recovery instructions appeared; reload preserved the committed title and popup snippet and discarded the stale unsaved title. |
| Clipboard permission denied | Passed: Chrome Deny kept the Behavior checkbox off. A clipboard-placeholder copy cancelled with an explanatory message and left the popup open. |
| Clipboard grant and revoke | Passed with explicit user confirmation: Chrome Allow enabled the checkbox. Copied a generic plain snippet first, then the placeholder snippet; pasting into an unsaved QA editor produced exactly `Reference: Hello team,` followed by the sample project-update text. Cancelled the editor, revoked permission, observed `Clipboard access removed`, and repeated placeholder copying: it cancelled safely. Final checkbox was **off**. No personal clipboard contents were used for expansion. |
| Repeated copy and default close | Passed: enabled preference kept the popup open with per-card success feedback. Disabled preference closed it after plain copy. The preference persisted through actual export/restore and Chrome restart. |
| Search and keyboard copy | Passed: multiword query selected the intended first result; Enter copied it; Escape cleared search; numeric 1 copied the first visible snippet. Copy buttons use aligned icon/text and neutral number hints. |
| Actual export/restore | Passed: Chrome downloaded `quicklaunch-backup-2026-10-02.json` (1,663 bytes). Restored its synthetic contents via the real Settings file picker and Replace confirmation; `Import successful!` appeared and bottom search/repeated-copy preference survived. SHA-256 `05607bcb5448ec7ec801c287ac5b3306ed79e88a95b03bafd012333ebfde4a75`. |
| Inactive worker context-menu wake | Passed: with extension pages/DevTools closed, Chrome displayed `service worker (Inactive)`. The real Add to QuickLaunch link context-menu command persisted a fourth shortcut, visible on reopening the popup. |
| Current-tab launch and favicon | Passed: imported Google/Wikipedia-only synthetic shortcuts. Current-tab mode replaced Wikipedia with Google without adding a tab. The saved Google tile displayed Chrome's cached Google favicon. Add current tab read Google's title and URL; adding the existing URL preserved three shortcuts. |
| Workspace launch after popup closure | Passed: Design's Wikipedia and English Wikipedia shortcuts opened as a native **Design – 2 Tabs** group after the action popup closed. |
| Immediate save and browser restart | Passed on the final package: saved `Cold restart note`, immediately pressed Escape, fully restarted Chrome, reopened the QA profile and observed the exact saved note. A real export confirmed three shortcuts, four snippets, two workspaces, `Google Search`, bottom search, repeated-copy enabled, current-tab mode, and usage counts Google **8**, Wikipedia **4**, English Wikipedia **1**. Export SHA-256 `5a4b7985bf8f16e702cb60713d11945ca0faff001a5144ff83222233ec41254c`. |
| Drag, rename, cancel and scroll | Passed: reordered two native shortcut tiles; committed an inline title rename; an edited dialog title was cancelled without changing the saved title. Corrected stale accessible names found during this check and re-tested the final build: the card, Edit and Remove controls immediately said `Google Search`. Settings content scrolling remained usable. |
| Theme and reduced motion | Passed: Light and System selected in native Settings, then restored Dark. On October 4, Chrome Rendering explicitly showed `prefers-reduced-motion: reduce`; Appearance view change and scrolling rendered normally, with 0 console messages. Restored `No emulation` afterward. Timing and cancellation branches also have regression coverage. |
| Accessibility and runtime | Passed for observed flows: corrected four orphan caption labels and verified native DevTools `No issues detected`. Final Options console showed **0 messages**. The deliberately conflicting stale save generated one expected `QuickLaunch storage: ... Reload before saving` diagnostic; it was recorded and only the disposable QA error history was cleared. This diagnostic is intentional conflict protection, not an uncaught exception. |
| Listing captures | Three actual final Options captures, 1280×800 desktop/DPR 1, viewed individually. Opaque native PNGs normalized to 24-bit RGB with identical visible pixel bytes. Final file inventory and hashes: [RELEASE_IMAGES.md](../promo/RELEASE_IMAGES.md). Older synthetic JPGs are superseded. |

## Evidence and limits

Synthetic-profile captures are under [visual-qa/chrome-2026-10-03](visual-qa/chrome-2026-10-03/): upgrade Settings, copy/preview, conflict protection/recovery, Light theme, expected conflict diagnostic, Google favicon, saved snippets after restart and native reduced-motion settings. Personal Brave screenshots and personal backup files are excluded from publication.

The final `npm run package` completed **96/96 regression tests**, structural/reference/syntax/whitespace checks and exact 26-file archive/source comparison. Deliberately delayed startup, quota/storage failures, clipboard API read failure, partial group failures, hostile Markdown and parser failures are covered by controlled regression fixtures; they were **not forced in installed Chrome**. Native denial/revocation, normal startup, cold worker wake and browser restart cover the real browser boundaries. Do not describe mocked fault injection as native acceptance or claim that testing guarantees absence of every production bug.

The public privacy policy has been deployed and matched byte-for-byte to the packaged page. Local-storage encryption applicability remains an accurately disclosed policy review risk, detailed in [POLICY_REVIEW_2026-10-02.md](POLICY_REVIEW_2026-10-02.md). The user explicitly authorized submission for Google review; use deferred publication and make no unsupported encryption certification. Submission/CI status belongs in [STORE_RELEASE.md](../STORE_RELEASE.md) and the candidate JSON, and must be updated only after the dashboard reports the actual outcome.
