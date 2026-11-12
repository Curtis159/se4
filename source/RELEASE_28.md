# OpenSE4 build 28 — simulator visibility and update feedback

## Cause

The published build 27 already contained the simulator. A legacy worker could fetch its newer HTML while returning cached build 26 modules. That made Check for updates visible in HTML without a working handler and left Status running old code without the simulator. The issue was reproduced in a browser using the legacy worker, then corrected through the same cache with this build. It was not caused by the campaign save.

## Changes

- Build-qualified URLs for the app, every imported module, worker, engine module, engine manifest, compressed payloads, metadata and stylesheet. Service-worker registration keeps its stable URL and bypasses the HTTP script cache during update checks.
- Navigation uses the active release's cached HTML with its matching code. A complete new offline cache activates only after the player's explicit save/restart.
- Check for updates displays persistent Checking, Downloading, Up to date, Update available or Failure feedback, including the running build number.
- Save & update shows Update complete after restart and retains its campaign checkpoint/restore behavior.
- The hamburger displays Build 28. Status includes Combat Simulator; it is not gated by game turn or campaign research.

## Validation

47 unit tests passed. The supplied OpenSE4-save (5).json loads in the actual WASM worker and displays both the simulator tab and force selectors. UI checks preserve its campaign checksum and verify all manual update-check outcomes and the consumed completion notice. The actual hosted worker verifies compressed engine integrity, native parity, Hegemon conversion, GitHub Pages subpath handling, offline navigation, and build-qualified module loading. A legacy unversioned code cache cannot mask the new entry point. Browser migration checks are recorded separately.

No native game rules, balance values or Supabase database/function changes were made. The prior Hegemon SDK/queue-planning findings remain documented in the build 27 AI audit. Old game saves remain compatible. Private campaign contents are excluded from all public packages.

## Publish

Use SE4_GitHub_28.zip to update the existing repository; preserve any customized site/online-config.json. Commit, Push origin, then run the manual Pages workflow and wait for success. Save and close/reopen the installed game online. Confirm Build 28 in the menu, then Status → Combat Simulator. Do not change the site's origin or clear browser storage. The separate offline HTML can load the provided save immediately.
