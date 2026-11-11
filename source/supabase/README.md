# Supabase setup for OpenSE4 release 26

This bundle is prepared locally; it does not deploy or change your project. The browser is already configured for boydalkiyyylhzhlweok using its public publishable key. Multiplayer still requires the database and function setup below.

## Database

For a NEW, empty project, run SE4_All_Migrations_26.sql once in Supabase SQL Editor. For an existing installation, apply only missing numbered files from supabase/migrations; do not apply the combined file over an installed schema. Release 26 adds no schema migration.

Enable Email/password auth, retain email confirmation, and set Auth Site URL/allowed confirmation redirects to your actual HTTPS game address. For GitHub Pages this includes the repository path, e.g. https://YOURNAME.github.io/REPOSITORY/.

## Push notifications

Install Node and Supabase CLI. From this bundle/repository root run:

```powershell
node scripts/create-push-keys.mjs ../push-private.env
```

Add VAPID_SUBJECT=mailto:YOUR_EMAIL and APP_ORIGIN=https://YOUR-SITE.netlify.app to that private file. For GitHub Pages use the full URL https://YOURNAME.github.io/REPOSITORY, without trailing slash.

Copy ONLY VAPID_PUBLIC_KEY into site/online-config.json as vapidPublicKey (online-config.json in a direct Netlify upload). Publish that public-config change. Do not put the private key or worker secret in site/, Git, or the standalone HTML. The example env file contains placeholders only; use generated values, not those placeholders.

Then run from the bundle root:

```powershell
supabase login
supabase link --project-ref boydalkiyyylhzhlweok
supabase secrets set --env-file ../push-private.env
supabase functions deploy send-turn-push --no-verify-jwt
```

The function authenticates its scheduled caller using PUSH_WORKER_SECRET. Supabase supplies its server-side project/service-role environment automatically.

In Supabase Vault create a secret named se4_push_worker_secret containing the SAME PUSH_WORKER_SECRET from your private env file. Then run supabase/schedule-push.sql to create/update the minute notification job. Run supabase/schedule-cleanup.sql for daily game cleanup. Enable the Vault extension if it is not already available. If your project ref differs, update online-config.json, the CLI link command and schedule-push.sql URL before deploying.

These are two different schedules: push delivers notifications; cleanup applies the existing game-retention rules. The save is downloaded inside the app, not inside the push message.

## Test with two players

Create two accounts, create/invite/start a small asynchronous game, enable notifications on both devices and finish a turn. Confirm the next player can load the correct turn from Online games. Then close their game page, finish another turn and verify their notification opens the game. Delivery depends on browser/OS permissions and background settings. Live online play remains unfinished; asynchronous handoff is the connected mode.

Original setup guide: docs/SETUP_26.md in the GitHub bundle or SETUP_26.md in the Supabase bundle.

Supabase reference: https://supabase.com/docs/guides/functions/schedule-functions

## All your devices

Sign into the SAME game account and choose Enable notifications on EACH device/browser installation. Installing alone does not register push permission. Subscriptions are stored per account and endpoint, so registering a phone does not replace a PC subscription. The worker sends each turn notice to every registered endpoint for the player. Devices must use the same published app and public VAPID key.

Each device independently controls permission and delivery. Android Chrome and supported PC browsers can receive while the game page is closed, subject to OS/browser background settings. iPhone requires an installed Home Screen web app on iOS 16.4 or later. Offline devices, Focus/Do Not Disturb and revoked permission can delay or prevent display. Opening the notification retrieves the save inside the app; the notification itself does not contain the save.

Supabase Free currently includes 500,000 Edge Function invocations/month; the minute worker uses about 43,200 runs in a 30-day month and sends to multiple devices in one run. Database size/save egress have separate limits, and free projects can pause after inactivity. This is feasible for a private campaign, not a promise of unlimited or guaranteed delivery. Live two-device testing is still required after deployment.

References: https://supabase.com/pricing and https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers
