# OpenSE4 release 27: publish and install

Quick Game again starts with ONE shipyard and the original mineral facility restored. Existing saves retain their existing facilities. Learn on the main menu is disabled temporarily; scenario files remain in the source.

## Pick a hosting route

- Direct Netlify upload: use SE4_Netlify_27.zip. Its index.html is at the ZIP root. No build command.
- GitHub connected to Netlify: extract SE4_GitHub_27.zip into a repository; publish the CONTENTS, not the ZIP file. The root netlify.toml publishes site/. This is a prebuilt release; no C++/Emscripten build runs on Netlify.
- GitHub Pages instead of Netlify: the same GitHub bundle includes a manual Pages workflow. In repository Settings → Pages choose GitHub Actions, then run Publish game to GitHub Pages from Actions. This publishes only site/. Pages requires a plan/repository visibility that supports it. Do not run it if you only want Netlify hosting.

A GitHub repository stores files; Netlify or GitHub Pages serves the HTTPS app. Players install from the published WEBSITE, not the repository's Code/Download ZIP page. On Android Chrome/desktop Chrome or Edge use Install; on iPhone Safari use Share → Add to Home Screen. Let offline download finish online first. Keep one stable game URL; saves and app installations belong to that URL.

## Publish to GitHub with Git

From the extracted GitHub bundle folder, after creating your empty repository:

```text
git init
git add .
git commit -m "OpenSE4 release 27"
git branch -M main
git remote add origin https://github.com/YOURNAME/YOURREPOSITORY.git
git push -u origin main
```

You can use GitHub Desktop instead. Do not upload the ZIP itself. Use a private repository if you do not intend to publish the bundled game assets publicly; OpenSE4's GPL license does not relicense the original game assets.

## Connect Netlify to that repository

Import the existing GitHub repository in Netlify, select main as the production branch, leave the build command empty and use site as publish directory. netlify.toml supplies the publish directory. Each main-branch update can trigger a production deployment. Use a separate branch/pull request for testing and merge ready releases into main.

GitHub integration does NOT bypass Netlify billing. As checked November 11, 2026, credit-plan production deploys cost 15 credits and Deploy Previews/branch deploys cost zero deployment credits. Other usage can still consume credits. Older plans can have different limits. GitHub Pages has its own limits and uses no Netlify deployments when you do not host the app on Netlify.

## Supabase

See supabase/README.md. The database migrations, Edge Function, cleanup/push schedules, public config and key-generation script are included. Private VAPID keys and worker secret still need to be generated and configured in your account; no production deployment has been performed by this package.

For GitHub Pages, APP_ORIGIN and Auth redirect settings must include /YOURREPOSITORY. Test invitations and notification deep links after choosing your permanent URL.

## Contents

site/ = ready-to-host app, compiled engine and graphics.
source/ = cumulative source overlay and prior update documentation; see its SOURCE_UPDATE_README.txt for original data/build requirements.
supabase/ and scripts/ = server setup and private-key generator.
docs/ = setup, release notes and checks.

Standalone PC solo play: OpenSE4_Quick_Game_27.html is delivered separately. It is not needed in the hosted repository.

References:
- https://docs.netlify.com/deploy/create-deploys/
- https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/
- https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/
- https://github.com/actions/starter-workflows/blob/main/pages/static.yml
