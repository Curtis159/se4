# Update 17

## Construction

New games have separate native production lanes: the planet builds facilities and units at its planetary rate, while Space Yard facilities build ships and bases. Multiple yard facilities can be constructed within the planet's facility slots.

Choose Combined to pool their resource rates into one ship queue, or Separate to build different ships in parallel. Each queue pays its own construction cost from the shared treasury. Combining queues preserves their items and paid progress. If a yard is lost, work waits for replacement capacity or moves to a surviving lane; capture or transfer clears the previous owner's yard queues.

Ships and bases with Space Yard components expose their own queues and use their own native component construction rates. Planetary and shipyard queues can progress in the same turn. A combined queue still completes at most one item per turn, following the native queue processing rule; separate lanes can each complete an item.

Save format is now 13. Earlier formats still load with their original mixed-queue rules. Start a new game to use the separate production model. This avoids silently changing the balance of an existing campaign.

## Maps and orders

Colony and shipyard attention prompts open the relevant map sector. Occupied sectors have an empire-color tint, colony banners and visible ship markers. Selection details stay below the map on phones rather than covering it. The main map remains directly tappable.

A selected ship has an action bar. Move displays translucent one-turn range bubbles and numeric estimates farther away, using the native known-route pathfinder. Colonize is offered for capable ships; the engine validates the chosen world. Attack targets a visible ship or colony. Resupply finds a reachable depot by shortest travel path; Repair routes to a reachable shipyard. Cargo controls appear when storage or carried cargo permits them. Explore, Stop, fleet creation and leaving a fleet are also available where appropriate.

Movement estimates are planning estimates: actual travel can be affected by combat, hazards, supply, group movement and changing conditions. Fleet movement still follows native group orders. Fleet creation selects ships sharing a sector.

The task count text is removed. Skip is beside the blue task/gold End Turn button. A hamburger menu contains Main menu, Save game, Load game and Learn.

## Research and setup

Research shows the unallocated total for this turn. Each active project shows points added, points remaining, funding this turn and its native estimated turns to finish. Unlocks lists the actual next-level equipment and component/facility ability values, including additional technology requirements where relevant. Native technology order is preserved.

The turn guide checks unspent research, not merely whether a project exists. The native engine already resets the research pool when research is processed; unused research does not accumulate. The original opening rule grants starting resources plus production as the first research budget, which explains the much larger first-turn amount. Later turns refill from income. Intelligence funding retains the native project's rules.

Generate replaces Preview map. There is one Save action with a file-format choice, and the redundant Use generated map action is removed. A custom star-system count of 0 uses the selected galaxy size; it does not mean an empty galaxy. The duplicate play-mode control and the tagline are removed.

Victory values are grouped beneath their enabled condition. The score-lead option states the original engine's special rule: it replaces the absolute score/time-limit tests. For example, 200% means twice the next rival's score. One game turn advances the date by 0.1 years; the numeric duration controls are explicitly labeled in turns. Delay postpones victory checks rather than adding another victory target.

Defaults are 500 ships/bases and 2,000 deployed units per empire. They are performance guardrails for phone turn processing and map usability, rather than a save-file-size requirement. The original unit cap applies when units are deployed into space, not to all units in cargo. Larger settings remain available; large late-game mobile performance has not been benchmarked.

Show complete technology tree reveals future areas and their prerequisites without granting technology. Autosave is optional, defaults off, and stores a recovery save in this browser's IndexedDB at the chosen turn interval. Restore autosave is on the main menu. It does not download a file each turn. Browser data clearing can remove it; manual Save game remains available.

## Status and learning

Status groups Empire, Scores, Diplomacy and Intelligence. Scores obey native visibility rules. Diplomacy supports messages, treaty proposals, responses, breaking treaties and declaring war, with native team restrictions. Intelligence offers researched projects, target selection, counter-intelligence and queue removal. It uses native SetIntel commands.

Learn is available from the main menu and hamburger menu. Seven browser-adapted tutorials use the upstream native lesson parser, condition tracker, prepared-game setup and command tracking. They cover first steps, exploration/colonization, research/construction, ship design, fleets/movement/supply, strategic combat, and diplomacy/intelligence. A First steps walkthrough is checked end to end through the packaged UI. Other lessons can be stepped through or skipped; they still need human playtesting on devices.

The original OpenSE4 training missions and reference manual are included. Training uses native objectives, deadlines and briefings. Tutorials with prepared ships generate them specifically for learning; ordinary games still start with no human ships or designs. Tutorial saves retain lesson identity and active step. Resuming a training save re-evaluates objectives from its loaded game; it does not restore a complete historical lesson tracker.

The desktop combat simulator, tactical battle interface, spotlight/input lock and desktop keyboard shortcuts are not copied into the browser. The browser combat lesson teaches strategic attacks and automatic resolution instead. Original upstream learning source files remain in the source archive alongside the adaptations.

## Online games

The asynchronous UI retrieves and loads its save inside the app. End Turn uploads the new checkpoint and returns to Online games instead of displaying the next player's game locally. A failed upload shows Retry and a recovery-file option. Opening a notification link retrieves the correct turn after authentication. No manual file selection is needed for the online flow.

The installable HTTPS package caches the game locally. Supabase holds the current checkpoint, turn ownership, revision, membership and push subscriptions. The simulation remains on the active player's device. The current implementation uses a JSON checkpoint in Postgres; measured early-game saves are about 137–139 KB. A future private Storage-object transport can retain the same automatic in-app loading flow for larger campaigns.

Live online sessions remain unconnected. Asynchronous local handoff is sequential and intended for trusted private players, since each active player receives a complete save. PBEM and hotseat remain separate modes. Invitations are shareable codes; automatic invitation email is not configured.

Database migrations and the push worker are prepared locally, not deployed. See SE4_Online_Setup_17.md for activation steps. Notifications require HTTPS, a service worker, browser/OS permission, VAPID credentials and a scheduled push worker. The game page need not be open, but background restrictions, network connectivity and device state can delay notifications. Actual cross-device delivery is not yet tested.

## Verification

Checks include native construction scheduling and rate pooling, parallel ships plus planetary work, yard-component construction on a base, native/WASM exact parity, movement range and depot/yard routing, research allocation and expiry, saves and older-save compatibility, team rules, Hegemon turns with zero fallbacks, deterministic replay, packaged worker startup, UI design/build/research/order flows, and automatic online retrieval/upload using mock REST with the actual WASM engine.

The online test sends no real notification and does not prove the Supabase deployment. Real Android Chrome/iPhone rendering, large-game phone performance, live multiplayer, and real push delivery remain to be tested.
