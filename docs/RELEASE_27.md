# OpenSE4 update 27 — Combat, fleets and compact selections

Built November 12, 2026. Existing saves supported. Quick Game still starts with one shipyard and its original mineral facilities. Learn remains disabled.

## Playable changes

- Selecting a sector opens a compact object list: image, name, type/owner and colony population. Select one row to see details/actions for only that planet, ship, fleet or enemy contact. Back returns to the list. The turn guide and Go to ship links open their specific target directly.
- Colonies and Ships have separate tabs on the colony page. Construction choices appear above queued builds.
- Galaxy presence colors and shared-system markers call the original OpenSE4 presence logic, including its detection rules. Visible enemy ships have hull artwork on the map and their contact card; components stay hidden until their exact design is known.
- Diplomacy uses native sendable/reply message lists, all native treaty types, package choices, resource amounts, tone and third-empire/system/planet selectors. Leader portraits come from the original race art. Only the latest unanswered conversation is shown; answered/superseded messages disappear from the conversation panel. Native history remains available for game logic.
- Exhausted ships do not trigger idle-order prompts. The browser Attack order now supplies the sector required by turn-based combat. Your private save reproduced zero remaining movement and next-turn movement; after advancing a test copy, Engage entered the enemy sector and produced a battle.
- Warp is an explicit ship action. Standing on a warp point no longer repeatedly prompts. Known hazards are checked only for an ordered route; cross-system warnings do not expose destinations without own presence unless omnipresent is enabled. Empty visible destinations proceed without a generic confirmation. Native encounter decisions still apply to detected hostile forces.
- Combat replay uses OpenSE4's CombatPlayback controller, original recorded events, piece positions and game artwork. Play/pause, restart, speed and event-position controls are available. Turn-based command/turn combat opens the viewer; every participant can revisit records from Log in both turn styles. Simultaneous games show their records after processing. This is strategic combat viewing; tactical multiplayer remains disabled.
- New combat summaries record whether each colony survived, was captured or destroyed, plus population killed and remaining. Old records cannot retrospectively recover population losses they did not store.
- Status → Combat Simulator assembles both sides with own/known enemy designs, visible planets and carried known units. It calls the native simulator on a sandbox copy and does not change the campaign. Each side can group ships into a fleet with a native formation and strategy. Foreign planets use visible population and known units; unknown defenses are excluded rather than exposed.
- Campaign fleet options expose formation, strategy, leader, join/leave and disband. Existing native fleet movement and combat grouping remain authoritative.
- Ship designer has a remembered, checked-by-default Latest researched only filter. It keeps the newest researched component in each compatible family; unchecking reveals older versions, and fitted old components are retained.
- Research pagination fills three-column desktop pages with nine cards, two-column pages with eight, and phone pages with four.
- Installed app Update available / Save & update / Later flow saves and restores a local campaign checkpoint before restart; failed checkpoint storage prevents activation.

## Verification

44 JavaScript unit tests passed. The actual packaged WASM UI integration covers construction, research, designs, movement, turn prompts, hotseat/email handoffs, save/load, Hegemon startup and failure recovery. Native browser-view tests cover survey/privacy/save persistence and participant-only combat playback. A private copy of the supplied campaign verified attack/Engage, battle replay, isolated simulator checksum, native fleet options, contact images and queue ordering; it is excluded from all public packages. Hosted compressed-engine, offline-cache and path-prefix tests passed.

Browser checks at desktop and 390px phone width verified compact sector selection, separate colony/ship tabs and full research rows. A real waiting service worker displayed Update available, saved/restarted and restored unchanged resources. Physical Android and iPhone testing remains outstanding. Browser tooling restarted during the final pass; the simulator's final integration is covered by actual WASM tests rather than a final visual device check.

## AI audit and remaining issue

The separate report and raw-data ZIP cover 12 campaigns / 2,200 global turns / 35 battles, including treaty offers, accepts and refusals. No prices or tech-tree rules were changed.

Hegemon still has a construction SDK gap: it cannot plan all independent lanes and can issue duplicate facility upgrades. The browser currently rolls back turns containing rejected AI commands, so that issue can block an affected Hegemon campaign. All-Hegemon games also showed a repeating gift policy with no treaty progression. These findings are documented with reproduction data; Classic and mixed runs did negotiate treaties. They require AI/SDK corrections before drawing strong balance conclusions.

## Files

- OpenSE4_Quick_Game_27.html — standalone offline PC build.
- SE4_Netlify_27.zip — hosted files, index.html at root.
- SE4_GitHub_27.zip — site/, cumulative source/, Supabase setup, optional Pages workflow.
- SE4_Source_Update_27.zip — cumulative GPL source overlay; original game data/toolchain required to rebuild.
- SE4_Supabase_27.zip — unchanged backend setup/reference, not deployed.
- SE4_AI_Audit_27.md / .csv / .zip — findings, campaign table and raw checkpoints.
