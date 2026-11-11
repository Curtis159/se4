# OpenSE4 browser update 14

The offline build includes transparent sprites and icons, live resource icons/income, the redesigned research catalog and active-project list, and the idle-shipyard turn-guide fix.

New Game uses the original C++ setup model. Its eight pages cover quadrant generation/preview/map files, events, technology and allowed areas, player starting conditions, players and random opponents, victory rules, game settings, and mechanics. Solo, hotseat and file-based email play support sequential and simultaneous turns. Human empires start with no ships or saved designs.

Create/edit a race under Players. The editor uses native racial-point pricing and trait restrictions. Save race and use downloads an OpenSE4 TOML empire file; Load race file reuses it. Map import/export also uses OpenSE4 TOML. Original binary .emp/.map files can also be imported or exported through the native converters; conversion notes appear before continuing. Use TOML to retain OpenSE4-specific settings; for example, a custom empire color returns to automatic when round-tripped through the original .emp format. Advanced empire fields include minister style, password, color, demeanor and design-name list. A password checks the local hotseat handoff; it does not encrypt the save or secure the browser against its owner.

Hotseat hides the board at a player handoff. Email mode downloads a complete native save when the active player changes; send it yourself and have the next player use Load Game. These are trusted-player local modes, not authenticated online sessions. Simultaneous mode collects each human's choices on the same machine/file, then calls the native full-turn processor once everyone is ready. Browser autosave downloads occur only after a completed game turn at the selected interval.

## Online preparation — not enabled or deployed

The local Supabase package contains a database migration with membership policies, expiring email-bound invite tokens, host-only checkpoints, per-player views, revision checks, idempotent order packets, a notification outbox, a REST client adapter, a push service worker, and a private Edge Function that drains the outbox.

It is a foundation, not a working online multiplayer release. The browser lobby/auth screens, host order-processing loop, per-player view publication, reconnect UI and invite-email delivery still need integration once a Supabase project is available. Live/Async choices explain that dependency and cannot begin an offline game under an online label.

Use one New Game setup with a play-mode choice. A separate Online Games lobby should list hosted/joined games, invites, connection state and whose turn it is. Live and async can share the same transport and saved-state protocol; live processes orders while participants are connected, async waits for the active player's submission and notifies the next player. With browser hosting, processing pauses whenever the host browser is unavailable. Supabase persists the game and delivers invitations/notifications; it does not run the C++ engine in this design.

## Supabase deployment handoff

1. Create a Supabase project and authenticated accounts, configure email confirmation and permitted HTTPS redirect URLs. Supply only the project URL and publishable key to the browser. Keep service-role and VAPID private keys in Edge Function secrets.
2. Review/apply `supabase/migrations/202611090001_multiplayer.sql` in a development project. Run two-account database authorization tests before production. No migration or function was deployed or database-tested in this update.
3. Generate VAPID keys. Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `APP_ORIGIN` and a random `PUSH_WORKER_SECRET` for `send-turn-push`. The function also uses Supabase's server-only service-role environment values.
4. Deploy `send-turn-push`. Its JWT gateway check is disabled because the function authenticates a private worker bearer secret. Schedule an authenticated periodic POST to drain the durable notification outbox; never expose that worker secret in a browser.
5. Serve the game and `sw.js` on the same HTTPS origin. A local file cannot register a push service worker. Request notification permission only after the user explicitly chooses to enable it. The included adapter supports standard Web Push endpoints for Android Chrome, Firefox and Apple. iPhone behavior still needs device testing.
6. Integrate the prepared REST adapter with the lobby and native host loop. Host reads/validates submitted commands with C++, publishes only each player's redacted snapshot, atomically advances the revision, and retains the canonical checkpoint privately. Invite tokens must be accepted while signed in with the invited email. Add an email delivery function/provider or an explicit share-invite action; the migration alone does not send mail.

Reference: [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security), [securing database functions](https://supabase.com/docs/guides/database/functions), [Edge Function authentication](https://supabase.com/docs/guides/functions/auth), [Apple Web Push](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers).

## Verification

Native/WASM parity and DOM event tests exercise real compiled C++ rules. Pixel audits verify the original black transparency key across 1,996 world/component/facility/race sprites, plus resource/navigation icons and 16 portraits. These checks do not establish visual correctness on a phone. Android Chrome and iPhone browser testing remain outstanding; no Supabase deployment, live invite, email delivery or push delivery has been tested.
