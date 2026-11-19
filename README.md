# Build 31 — online fetch repair

Fixes Failed to execute fetch on Window: Illegal invocation after signing in. The online adapter now calls the browser fetch function through its owning global object. Authenticated lobby loading, game requests and turn RPCs use the corrected call. No Supabase configuration, database migration, password reset or new account is needed.

The regression test reproduces the failure in build 30 using the browser receiver check. Build 31 passes that check and the signed-in lobby integration test. The Supabase authentication health endpoint also returned HTTP 200 during diagnosis. The C++ engine and gameplay rules are unchanged.

## Publish this update

1. Extract SE4_GitHub_Update_31.zip.
2. In GitHub Desktop select se4, then Repository > Show in Explorer.
3. Copy the extracted contents into C:/Users/curti/OneDrive/Documents/GitHub/se4. Merge folders and replace matching files. The ZIP contains site/ and source/; do not put the outer extracted folder inside site/.
4. Commit to main with summary Fix online games fetch, then Push origin.
5. Open https://github.com/Curtis159/se4/actions. Choose Publish game to GitHub Pages > Run workflow > main > Run workflow. Wait for its green success check.
6. In the installed game use Menu > Check for updates > Save & update. Confirm Build 31 in the menu, then open Online games again.

This small update applies to build 30. It deliberately excludes site/online-config.json and preserves existing Supabase and notification settings. Existing campaigns and sign-in storage remain compatible.

SE4_GitHub_31.zip is a complete repository bundle; preserve an existing site/online-config.json when using the full bundle. SE4_Netlify_31.zip is a complete static site. OpenSE4_Quick_Game_31.html is the standalone PC game.
