# Build 30 — clearer orders, planet prompts and named saves

- Empty planets ask to Build a facility when slots remain, or Choose planet focus when full. Active construction or an active focus satisfies the planet prompt; shipyards remain independent.
- Warp always asks you to select the destination warp point, even if the ship is already on one.
- Status tabs and ship orders use uniform icon buttons with original SE4 artwork and visible labels.
- Scores use a compact two-column table that fits phone widths.
- Collapsed planet cards show colony, working shipyard, resupply and dome indicators. Private enemy facility information stays hidden.
- Manual Save game asks for a filename, remembers it, adds .json, validates names and allows cancellation. Automatic turn/checkpoint saves keep working without prompts.
- Includes build 29's combat fix: up to 30 full rounds, with quiet rounds recorded in new replays.

Existing campaigns remain compatible. No Supabase migration or configuration change is required.

## Update GitHub Pages

1. Download and extract SE4_GitHub_Update_30.zip. Open the extracted folder.
2. In GitHub Desktop select se4, then Repository > Show in Explorer. Your current repository is C:/Users/curti/OneDrive/Documents/GitHub/se4.
3. Copy the CONTENTS of the extracted update folder into that repository folder. Merge folders and replace matching files. Do not put the ZIP or its outer folder inside site/. The update includes site/ and source/ at its top level.
4. The update deliberately excludes site/online-config.json, preserving your existing Supabase URL, public key and push-notification settings.
5. Back in GitHub Desktop, review Changes. Enter Update game to build 30 in Summary, then Commit to main and Push origin.
6. Open https://github.com/Curtis159/se4/actions. Choose Publish game to GitHub Pages > Run workflow > main > Run workflow. Wait for the green success check. Your workflow is manual: pushing alone does not publish.
7. Open https://curtis159.github.io/se4/ online. In the installed game select Menu > Check for updates. When ready, select Save & update. Confirm the menu says Build 30. A new campaign or clearing app data is not needed.

SE4_GitHub_Update_30.zip updates complete build 28 or 29 repositories. SE4_GitHub_30.zip is the complete repository bundle for a fresh setup; preserve an existing site/online-config.json if using that instead. SE4_Netlify_30.zip is the complete static website with index.html at its root. OpenSE4_Quick_Game_30.html is the standalone offline game for PC.

The filename dialog works in desktop and mobile browsers. The browser handles the download location and any duplicate-file naming. Physical Android/iPhone visual testing remains for the player; this environment could not open the browser preview.
