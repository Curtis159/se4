# Install and activate OpenSE4 update 25

One HTTPS address supplies the same locally running game on PC and phone. A player opens it and may choose Install / Add to Home Screen. The ZIP is an upload bundle, not a universal native installer. The offline HTML supports local play; file:// pages cannot register the push/offline service worker.

## Publish

1. Upload `SE4_Netlify_25.zip` to Netlify Drop, or extract and upload its folder. index.html is at the root. No build command is needed. Keep the separate offline HTML out of this upload.
2. Keep the assigned HTTPS netlify.app URL. A purchased domain is optional. One stable address simplifies invitations, updates and notification links.
3. Android Chrome and desktop Chrome/Edge: use Install or the browser's install menu. iPhone Safari: Share → Add to Home Screen. The in-game Install control provides guidance when an install prompt is unavailable.
4. Let the initial download and offline-cache installation finish online. Single-player then runs locally. Online saves still require internet. Export local saves before changing domains or clearing browser storage.

The hosted folder is approximately 26.2 MB, with engine chunks at most 8 MiB. Netlify recommends Drop deployments below 50 MB and warns that individual files over 10 MB may stall; larger projects should use CLI/Git. This is upload guidance, not a hard hosting limit. [Netlify documentation](https://docs.netlify.com/start/quickstarts/netlify-drop-quickstart/).

## Activate game data

The public project URL and publishable key are configured for boydalkiyyylhzhlweok. A read-only check on November 10 returned PGRST205: public.se4_games is absent. The public key cannot deploy database migrations or Edge Functions.

1. Sign in to the Supabase dashboard yourself and open SQL Editor.
2. On a new project, run `SE4_All_Migrations_25.sql` once. It contains migrations 001–003. Do not rerun it over an installed schema.
3. If 001 and 002 are already installed, apply only `SE4_Lifecycle_Migration_25.sql` (003). If only 001 is installed, apply 002 from the source archive before 003.
4. Run `SE4_Schedule_Cleanup_25.sql` once for daily cleanup. Warning delivery also requires the push worker. Cleanup permits at least seven days after creating a warning, even if the schedule ran late; device delivery still depends on subscriptions and permissions.
5. Enable Email/password authentication. Set Site URL and confirmation redirects to the actual HTTPS game origin. Retain email confirmation and row-level security. Players create and use their own app accounts.

The active player retrieves the current save inside the app, runs the simulation locally, and submits the next checkpoint. Revisions and active-player checks prevent stale/out-of-turn replacement. Full saves contain hidden world state, so this is intended for trusted private campaigns, not anti-cheat competitive play. Live online mode remains unfinished; asynchronous sequential handoff is connected.

## Leave, end, delete and restore

Online games → Game options offers Save local copy and Leave, plus host-only End/Delete. A departing host selects a successor. Vacant human seats pause the game until the host invites a replacement or chooses Use AI. End stops turns and retains the last checkpoint for 30 days. Delete requires typing the game name. Inactive games become eligible for cleanup after 90 days, with prior warning and Keep game. Game removal preserves accounts, device subscriptions and downloaded local copies.

To restart after cleanup: Load the local save, open Online games, and choose Create online game from loaded save. Select human empires and the host seat, then invite players. This creates a new game ID while preserving the campaign's map, turn, economy, designs and fleets. At least two living empires must become humans, including the saved active player. Finish a partially submitted simultaneous round first. Continuing a finished campaign requires explicit consent and disables its old victory triggers; eliminated empires are not resurrected. Start the lobby after every human seat joins.

## Push notifications

The following deployment instructions continue below. No production migration, invitation, account or push notification was created by this update.

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
