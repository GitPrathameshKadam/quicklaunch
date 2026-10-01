# QuickLaunch 2.7 copyright and Chrome Web Store review

Reviewed October 2, 2026 against the [current program policies](https://developer.chrome.com/docs/webstore/program-policies/policies), [privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy), [local-data privacy FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq), and [listing-image requirements](https://developer.chrome.com/docs/webstore/images).

**Verdict: the identified attribution and disclosure issues are corrected in the candidate. Hold Store submission until the public policy and dashboard agree with this version and the installed-Chrome acceptance checklist passes.** This source review cannot establish ownership of every historical asset, trademark clearance or Google's approval decision.

## Copyright and asset provenance

| Asset | Evidence and action |
| --- | --- |
| Marked 15.0.12 | MIT notice is included. Bundled license bytes match the version-tagged upstream `LICENSE.md`. |
| Highlight.js 11.9.0 and Atom One Dark theme | BSD 3-Clause notice and Daniel Gamage theme attribution are included. License bytes match the version-tagged upstream license. |
| Inline SVG controls | Edit, settings, grid, file and modified trash/copy paths match [Feather v4.29.2](https://github.com/feathericons/feather/tree/v4.29.2). Their license notice was missing. Added Cole Bemis attribution and the complete [MIT license](https://github.com/feathericons/feather/blob/v4.29.2/LICENSE) to the shipping allowlist. |
| QuickLaunch app icon | The repo's `assets/icon.svg`, already present in historical commit `c9dd5bf`, consists of a gradient rounded rectangle and a lightning polygon. It matches the visible app branding. The 16/48/128 PNG dimensions are correct. Repo history is provenance evidence, not independent proof of exclusive legal ownership. No unrelated company logo was added to the app icon. |
| Fonts | CSS uses installed system font families. No font binaries are redistributed. |
| Website icons/names | Runtime favicons identify destinations chosen by users; they are not a QuickLaunch endorsement. New listing screenshots use generic destinations and letter icons, avoiding third-party logo reuse. Old locally cached promotional logos/composites are excluded from this public update and from the ZIP. |
| User screenshots/backups | Native captures containing the user's browser context and the downloaded backup remain local. They are excluded from GitHub and the package. Public QA captures contain sample data. |

The three upstream license files were compared byte-for-byte on October 2. No copyleft component was identified among these bundled libraries/icons. A new license for the user's own code was not invented. The name QuickLaunch was not subjected to a jurisdiction-wide trademark search; this review does not certify name exclusivity.

## Policy and privacy findings

| Area | Candidate result |
| --- | --- |
| Single purpose | Saved-site shortcuts and reusable text snippets, with related workspaces, search, tab grouping and backup. Listing copy states these features directly. |
| Permissions | Every required permission has an implemented feature and a justification in `STORE_RELEASE.md`. No host permissions, content scripts, external message receiver or install-time clipboard-read grant. Optional clipboard read remains user-triggered. |
| Remote code | Runtime scripts and syntax assets are bundled; no runtime eval, dynamic function generation, analytics endpoint or remotely hosted script path was found. CSP limits scripts to self and blocks connects. User-selected destination navigation is disclosed. |
| Data handling | URLs, snippets, drafts, workspace state and per-URL counts remain in `chrome.storage.local`. No developer upload, advertising or sale was found. Imported content is validated and Markdown resources/raw HTML are neutralized. Local storage is not encrypted; the policy says not to save secrets. |
| Privacy wording | Replaced absolute claims that browser/OS activity can never leave the device with precise claims about QuickLaunch's own behavior. Documented both snippet and shortcut-URL copying, 2.7 clipboard failure handling, error notifications, local storage, export and Limited Use. |
| Public policy | HTTP 200 verified October 2, but the live page still says it applies to 2.6. The candidate policy now applies to 2.6/2.7. A source push to `main` alone does not update the policy because the existing Pages source is the separate `codex/privacy-policy-site` branch. A reviewed policy change must reach that publishing branch and then be verified at the public URL before submission. |
| Dashboard | The current signed-in privacy/distribution fields were not inspected or changed. Verify permissions, no remote code, data-use definitions and certifications against actual local processing and the published policy. Local-only handling still requires a public policy; do not infer dashboard data-category answers from permissions alone. |
| Marketing | No Google approval badge, ranking claim, misleading OS warning or unsupported service affiliation was added. New listing images depict the actual UI with synthetic APIs/data, are 1280×800 full bleed and need comparison with the extracted installed-Chrome candidate. |
| Functionality | 96 regression tests and package structure checks pass locally. Native Brave save/export evidence is limited; clean Chrome upgrade, permission prompts and worker restart checks remain open. Broken functionality is prohibited by Store policy, so passing simulations alone does not authorize submission. |

## Release artifacts and repository

- Updated candidate policy, license notices, README, release notes and acceptance checklist. The public policy update is committed on `codex/privacy-2-7-readiness` and prepared as [draft PR #1](https://github.com/GitPrathameshKadam/quicklaunch/pull/1) targeting the existing Pages branch. It is not merged/deployed.
- New image inventory: [RELEASE_IMAGES.md](../promo/RELEASE_IMAGES.md).
- Shipping archive contains 26 allowlisted files. The Feather license is the only added shipping file in this policy round. Development assets, private browser captures, user backups, `.claude/`, tests, promo files and repository metadata are excluded.
- Added read-only GitHub CI to run the same gated package build on pushes and pull requests. Official checkout/setup-node actions are pinned to version-resolved commit hashes verified from their GitHub release refs.
- The public release branch is based on fetched `origin/main`, preserving its 2.6 publication history. The original dirty development checkout is retained. Do not force-push or replace the published branch's history.
- Archive/per-file hashes, tests and sizes are recorded in `release-candidate-2026-10-02.json`. Native acceptance and public policy publication are still separate gates.

## Before Store submission

1. Finish the installed-Chrome checks in [STORE_RELEASE.md](../STORE_RELEASE.md), particularly same-identity upgrade preservation, save/close/restart, clipboard deny/grant/revoke and real backup restore.
2. Publish the reviewed privacy file through the existing Pages branch; GET the public URL and confirm its body matches the packaged policy. Verify the dashboard points to that URL and the declarations agree.
3. Compare/upload the new images and verify current Store metadata/contact/distribution fields. The last independently verified Store listing checkpoint was 2.6 on September 30; today's web fetch of the listing failed, so that version is not presented as newly verified.
4. Rebuild from the approved commit, compare its package hash with the reviewed candidate, then upload only after the remaining gates pass.

No Store upload, submission, permission grant, Pages deployment or automatic merge was performed by this review.
