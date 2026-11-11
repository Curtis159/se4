# Online turns and device notifications

The game runs on each player's device. Opening an online game retrieves its current save inside the app; players do not handle files. Ending a turn uploads the new state, advances its revision and notifies the next player. Tapping a notification opens that game and retrieves its turn after sign-in.

This release prepares that flow locally. The database migrations and push worker still need deployment to your Supabase project. No production migration, account creation, invitation or notification has been sent by this update.

## 1. Install the web app

Extract `SE4_Installable_Web_App_17.zip` to a static HTTPS host. Keep `index.html`, `sw.js`, `manifest.webmanifest`, `icon.svg` and `online-config.json` together. The engine and artwork are inside index.html. Use a private hosting arrangement appropriate for your original game assets.

On Android Chrome, open that HTTPS address and choose Install app / Add to Home screen. On Windows Chrome or Edge, use the browser's install-app command. The service worker caches the game so it can launch locally without an internet connection. Internet access is required to retrieve or submit an online turn. A desktop localhost server can also support service workers, but a phone needs its own reachable secure origin; a downloaded file:// HTML cannot register one.

The same app address on every device gives the simplest invitations, updates and notification links. This does not put the simulation on the web server: WASM runs locally. Independently hosted copies can use the same Supabase database, but notification links must target the app origin each device subscribed from; the supplied worker currently uses one APP_ORIGIN.

## 2. Prepare Supabase

Project: `boydalkiyyylhzhlweok`. The public project URL and publishable key are already in `online-config.json`.

1. Open the project's SQL Editor.
2. Run `SE4_Online_Migrations_17.sql` once. It creates private games, membership/invites, turn checkpoints, revision checks and notification subscriptions. If migration 202611090001 was already installed, run only the second migration, `202611090002_local_turn_handoff.sql`, from the source archive. The first migration is deliberately not repeatable.
3. Under Authentication, enable Email/password sign-in. Set the Site URL and allowed confirmation redirects to your HTTPS app origin. Keep email confirmation enabled; players confirm their account and then sign in inside the app.
4. Keep the game tables private. The migrations enable row-level security and grant only the relevant authenticated-user operations. Do not make the checkpoint table publicly readable.

The active player can retrieve the complete save through the authenticated take-turn function. Only that player can hand it on, and an outdated revision is rejected. This is intended for trusted private games: the complete save contains hidden world state. It does not prevent a technically skilled participant from inspecting a save or altering a local simulation. The older host-authoritative/redacted-orders preparation remains separate; live online play is not connected in this release.

The current small saves are stored as a JSON checkpoint in Postgres. Only the current checkpoint is retained, rather than an unlimited copy per turn. The two measured early-game fixtures were 136,917 and 139,187 bytes. The roughly 84 MB game download is not part of a turn save. For much larger campaigns, private Supabase Storage objects plus a revision/path record are the better next step; the app can retrieve either automatically. [Supabase Storage limits](https://supabase.com/docs/guides/storage/uploads/file-limits) and [upload guidance](https://supabase.com/docs/guides/storage/uploads/standard-uploads).

## 3. Configure web push

Install the Supabase CLI and Node locally if they are not available. In the extracted source project:

```powershell
node scripts/create-push-keys.mjs ..\push-private.env
```

This creates a private file containing VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and PUSH_WORKER_SECRET. Keep it outside the hosted folder and source archives. Copy only VAPID_PUBLIC_KEY into `online-config.json` as `vapidPublicKey`.

Add these extra lines to that private environment file, substituting your actual address:

```text
VAPID_SUBJECT=mailto:you@example.com
APP_ORIGIN=https://your-game.example
```

Then authenticate the CLI yourself and deploy:

```powershell
supabase login
supabase link --project-ref boydalkiyyylhzhlweok
supabase secrets set --env-file ..\push-private.env
supabase functions deploy send-turn-push --no-verify-jwt
```

The function checks PUSH_WORKER_SECRET itself and uses the Supabase service-role key supplied to its server environment. Never put either secret into online-config.json or the HTML.

Create a scheduled job in Supabase Cron to POST to:

```text
https://boydalkiyyylhzhlweok.supabase.co/functions/v1/send-turn-push
```

Use an Authorization header with `Bearer YOUR_PUSH_WORKER_SECRET` and an empty JSON body. Store the secret in Supabase Vault; use the Cron/HTTP configuration UI or a Vault-backed pg_net job rather than publishing it in SQL source. A one-minute interval is a straightforward starting point. The worker reads the pending notification outbox and removes expired push subscriptions. Without this scheduled invocation, turns still sync inside the app, but push notifications will not be sent.

Open Online games, sign in, and choose Enable notifications on each device after adding the public VAPID key. Permission must be granted by the player. [Supabase Edge Functions](https://supabase.com/docs/guides/functions), [Web Push](https://developer.mozilla.org/en-US/docs/Web/API/Push_API) and [Microsoft's desktop PWA guidance](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/push).

## 4. Play a private asynchronous game

1. In New Game choose Asynchronous, configure the game, and add every human and computer player. Human slots need separate accounts; slot 0 belongs to the host. Combat is automatic. This local handoff mode uses sequential turns.
2. Finish setup and sign in on the Online lobby page. Create the lobby from the setup.
3. Create an invitation for each human's email and empire slot, then send the displayed invitation code to that player. Codes are not emailed automatically.
4. Each invitee signs in with the matching email and enters the code under Online games.
5. The host starts the lobby after every human slot has joined.
6. Each player opens Online games and chooses Play turn. The app retrieves and loads the correct save. A notification deep link does this directly after authentication.
7. Use the normal task/End Turn control. The new save is sent automatically. If sending fails, keep the app open and use Retry or Save recovery file; the app does not intentionally pass control to the next player locally.

The first activation test should use two accounts on two devices: invite, start, finish one turn, retrieve the next turn, enable notifications, close the game page, then finish another turn and tap the notification.

## Notifications while closed

The game page need not be open for a service worker to receive a web push. Windows Chrome/Edge and Android Chrome can show system notifications, subject to permissions, OS/background settings and network availability. A shut-down device receives nothing until it reconnects; closing the browser completely or disabling its background activity may prevent or delay delivery. Installed-app behavior still needs testing on your devices.

For iPhone, use an installed Home Screen web app on a supported iOS version and request notifications from a user action. The PC/Android workflow is the testing priority. [Apple web push documentation](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers) and [service worker requirements](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API).
