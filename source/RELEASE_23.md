# OpenSE4 update 23 — construction filters and planet details

## Construction

- Filters combine with AND: name, hull, design type, vehicle class, exact component, or component family with a minimum level. Multiple component filters can be combined, such as point-defense equipment and a specific Ion Engine version. Incomplete filter rows do not hide choices. Filter settings persist while navigating the current session, separately for each queue; they are not campaign rules or saved filter presets.
- Planet queues offer unit designs and facilities. Shipyard queues offer ships and bases. The native engine also rejects units in shipyard queues, including mobile yards. Existing legacy queue items are not silently deleted.
- Facilities can be filtered by their original Facility Group. Latest researched facilities is on by default and means the highest researched version in each native family, not facilities researched on the most recent turn. Turn it off to browse older researched versions.
- The ship designer exposes the native design-type list and accepts custom types. Types remain editable on both the hull and review steps.
- Upgrade facilities upgrades installed facilities on the selected colony through normal construction, one queue item per eligible family. It also updates queued facility builds to the highest researched version while preserving their counts and resources already spent. Individual family upgrades are selectable in the build list. Upgrades use the engine's original cost/count rules and do not add facility slots. The action is atomic at the browser boundary and unavailable outside the player's active turn.

## Planet selection

Planet construction now belongs to a distinct planet card above the ships, bases and units section. The bottom-right arrow expands native colony facts: population/capacity, mood and anger, growth, facilities, delivery, blockade, plague, conditions, colony type, production, resource values and production percentages. Finite resource stocks are labeled as remaining amounts rather than percentages. Facts for foreign colonies are not disclosed.

Planet construction and shipyard lanes have their own tabs. Combined mode uses one shared shipyard tab; Separate mode shows a tab for each shipyard facility. Component shipyards remain with their ships or bases, below the planet section. A previously selected ship in a different sector is no longer shown as if it were at this planet.

## Quick Game

New Quick Games start with two real homeworld shipyards so Combined and Separate modes can be tried immediately. The homeworld is already full: one duplicate mineral extractor is replaced by the second yard, keeping the normal facility limit and all essential starting facility roles. This changes starting mineral income and yard maintenance. Existing saves, authored lessons and New Game setups are not rewritten. The normal no-starting-ships/no-premade-designs rule remains.

## Research breakdown

`SE4_All_Tech_Categories_23.md` assigns all 85 technology areas from the original TechArea.txt to eight proposed larger categories. It includes racial and special-unlock areas, maximum levels, original groups and prerequisites. CSV and JSON versions accompany it. Every area is assigned once with no omissions. These are proposals; this update does not change research categories, dependencies, costs or the technology tree in the playable game.

## Validation

33 unit checks pass. Actual native/WASM checks cover two-yard rates, unit queue restrictions, metadata and paid facility upgrades. Real packaged UI checks cover combined filters, custom types, upgrade actions and the planet/vehicle hierarchy. The broader gameplay UI suite passes. The earlier Hegemon campaign retains its expected first three turn checksums with no AI fallback. Hosted compressed-engine and offline-cache checks pass.

Real browser checks cover phone and desktop layouts and the 320px overflow fix. Physical Android and iPhone testing remains outstanding.

Open `OpenSE4_Construction_23.html` for local solo play and load an existing save. Publish the contents of `SE4_Netlify_23.zip` for the installable hosted version. Supabase activation remains unchanged; see SETUP_23.md. Private campaign saves are excluded from distributed files.
