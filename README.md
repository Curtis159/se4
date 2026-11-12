# OpenSE4 build 28 — installed-app update repair

This release fixes new HTML being combined with old cached JavaScript. It includes the Combat Simulator from build 27 and gives Check for updates explicit feedback.

## Update your existing GitHub Pages game

1. Save a local game copy.
2. Extract SE4_GitHub_28.zip. Copy its contents into your existing repository folder, merging/replacing files. Keep any site/online-config.json settings you customized (especially your public VAPID key).
3. In GitHub Desktop, commit to main and Push origin.
4. On GitHub.com, run Actions → Publish game to GitHub Pages → Run workflow → main. Wait for the successful deployment.
5. Close the installed game and other game tabs, then reopen online. The hamburger should say Build 28. Status includes Combat Simulator. Load the same save if needed.

No browser-data clearing or fresh campaign is required. No Supabase migration or server-function deployment is needed for this update.

The code, worker, engine metadata and compressed payload URLs carry the same build identity, so a legacy unversioned cache cannot substitute old files. The active worker keeps its own cached HTML with its matching code until Save & update activates the next complete release.

Check for updates now displays checking, downloading, up to date, ready or failure messages. Save & update checkpoints a running campaign, restarts, restores it, and shows Update complete. The menu identifies the running app build.

site/ is the prebuilt website; source/ contains the cumulative GPL source overlay and tests. supabase/ is retained setup material, unchanged. The optional Pages workflow publishes site/; Netlify can also publish site/ with the included netlify.toml. The separate Netlify ZIP has index.html at its root. The standalone HTML is for local/offline play and cannot update itself.
