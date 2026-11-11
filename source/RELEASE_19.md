# Update 19 — colony, construction and movement

Open `OpenSE4_Colony_Movement_19.html` for local play. Save from the previous build, then Load Game in this build. The previous HTML remains available. No public deployment or production database change was made.

- Design a ship opens Designs directly.
- Colonies start as expandable summaries with population, mood, facilities, units, native resource/point production and active planet/shipyard work. Output follows the native colony screen: before system modifiers and delivery, rather than an allocated share of empire net income.
- Expanded colonies reveal facilities, units and construction. Planet and shipyard queues have separate tabs. Combined/parallel yard modes retain their native behavior. Build choices show effects and costs. Ship/unit choices and queued designs display component icons with hover and tap information.
- Movement follows the selected ship. Existing orders show the engine's planned-route lines and turn numbers: 0 means remaining movement now, 1 means next turn. Display planning uses a separate RNG and preserves the save checksum.
- Reaching a warp point with movement left offers Warp now / Stay here. Known route damage, warp turbulence, tagged minefields and foreign occupants prompt Continue anyway / Choose another route / Cancel. Unexplored dangers cannot be predicted. Native encounter decisions remain in Ships and appear in turn guidance.
- End Turn retains a pre-turn checkpoint. Failure attempts to restore it and offers a diagnostic recovery file even if restoration fails.

## Hegemon turn stack failure

The exact “Maximum call stack size exceeded” error was reproduced using the latest user-provided Hegemon Quick Game save in a worker limited to 0.5 MiB of native stack. The previous unoptimized browser build overflows that limit. Optimizing browser C++ and the final Hegemon WASM reduces call overhead without switching AI or changing simulation rules. The updated build advances the same save through turns 1, 2 and 3 under that same 0.5 MiB limit, with the exact baseline checksums and zero Hegemon errors or fallbacks. All 15 turns of the standard Hegemon regression also match the pre-optimization checksums. The private save is excluded from the source archive.

The hamburger is now a floating dropdown with text options, instead of expanding the header into buttons. It closes after selection, outside tap or Escape.

Browser-file navigation was blocked by the browser tool's URL policy, so this is a constrained-worker reproduction and fix, not a real-device browser verification claim. The pre-turn recovery download remains available if another runtime failure occurs.

## Online lifecycle included from the preceding work

Leave transfers hosting when necessary and pauses a vacant human seat; the host can invite a replacement or use AI. End stops turns and retains the checkpoint for 30 days. Delete requires the host and a typed game name, with a local-copy download offered first. Scheduled cleanup warns before removing inactive games after 90 days or closed games after 30 days, allowing at least seven days after warning even if the job ran late. Game deletion preserves user accounts and device subscriptions.

A loaded local save can create a new online lobby and campaign ID after cleanup. At least two living empires must be human, including the saved active player. Finish partially submitted simultaneous rounds before conversion. A restored lobby preserves the campaign rather than generating a new map. Continuing a completed campaign requires explicit consent and disables its old victory triggers; eliminated empires remain eliminated. Normal turn submission overwrites one current checkpoint.

## Hosting and validation

`SE4_Netlify_19.zip` is the complete hosted build, approximately 26.2 MB unpacked with engine chunks at most 8 MiB. Keep the larger offline HTML separate. See `SE4_Setup_19.md`.

Actual native/WASM checks cover shipyards, route points and turn labels, preview checksums, research and save/load. Packaged UI checks use jsdom and the real WASM worker, including task navigation, queue tabs, component tap details, turn recovery, hotseat/email handoff and tutorials. Hegemon completes 15 sequential turns, simultaneous games and deterministic replay without fallback. Lifecycle tests run the real migrations in isolated PostgreSQL. Hosted tests verify compressed downloads, checksums and offline-cache handlers over local HTTP. These are not real Android/iPhone rendering tests or live multi-device push tests.

On November 10 the supplied Supabase project returned PGRST205 for `se4_games`: game tables are not deployed. Only public-key read-only checks were made. Online asynchronous sequential handoff is implemented; live online play remains unfinished. Play-by-email still requires sending/sharing the file. No private server or push keys are included.
