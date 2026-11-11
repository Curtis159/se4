# Update 20 — compact interface and design management

Open `OpenSE4_Compact_Interface_20.html` and load your existing save. No new game is required. Previous builds and original saves remain unchanged.

## Interface

- Maps, Colonies, Research, Designs, Ships, Log and Status remain fixed at the bottom at every width.
- The compact top bar shows reserves, resource icons and signed income. Positive and negative changes retain green/red styling. Content and fitted-parts panels account for the sticky header height.
- Scrollable panels allow scroll chaining: the mouse wheel continues scrolling the page when a panel cannot scroll farther.
- Resource amounts use number-then-icon formatting in construction, design costs, resource reports, research costs and intelligence project costs.
- Construction cards separate the heading, progress and resource amounts. Each resource shows spent / total below the progress bar; its tooltip also gives the exact remainder. Component icons are collapsed behind Components until opened.
- Hold is now **Pause Construction**, with **Resume Construction** to continue. It pauses the selected queue and retains its items and accumulated work; the other construction lanes can continue.
- Cargo displays used / capacity with units, such as 0 kt / 150 kt. Component descriptions state the capacity each part adds. Engine power is labeled separately from the ship's final movement. Raw unused fields such as 150/0 and movement 1/0 are removed from ability descriptions.

The compact status chips and spacing were informed by the user's Worst to First reference and supplied screenshot. Original game artwork is retained.

## Ship designs

Each saved design has an **Actions** dropdown with Build at shipyard, Edit, Retrofit, Copy into Designer, Make obsolete/Restore design, and Delete.

**Edit** changes an unused prototype in place. A design already built, retrofitted to or queued opens as a new revision instead, preserving existing ships and construction. **Retrofit** upgrades components to the latest researched replacements from their existing component families, preserving component counts, mounts and hull. It opens the upgraded design for review before saving; invalid or over-capacity designs cannot be saved. A design already using its latest researched parts shows Retrofit disabled. This is blueprint upgrading, not an automatic physical refit of existing ships.

**Make obsolete** removes a design from new construction choices while preserving ships and work already queued. **Show obsolete** exposes it for restoration. **Delete** requires confirmation and is available only for unused prototypes. Deleted designs do not reappear in the obsolete list.

The native design-in-use check now includes the separate planetary shipyard queues, closing a gap that otherwise allowed queued prototypes to be changed or deleted. Existing ships and queued items continue showing their original design artwork and information even after the design is obsolete.

## Verification

- Actual optimized WASM tests exercise prototype editing, researched component upgrades, obsolete/restore/delete, blocked edit/delete for queued designs, revision safety, and save/load.
- Packaged UI tests exercise those Actions controls, deletion confirmation, compact queue structure, component disclosure, icon ordering, Pause/Resume, resource forecasts and the broader gameplay flow.
- A real in-app browser check at 1280×800, 390×844 and 320×780 verified bottom navigation and no horizontal page overflow. Scrolling over a queue card moved the page from scrollY 181 to 435. Resource icons were visually checked after their numbers. Screenshots and browser geometry are included alongside this note. These viewport checks are not physical Android/iPhone device testing.
- The previous Hegemon stack regression still passes with the user's save under a 0.5 MiB worker stack: turns 1–3 have the same checksums and zero AI errors/fallbacks. The private save is excluded from distributed source.
- Hosted tests verify compressed engine downloads and hashes, genuine AI operation, complete offline asset caching and offline navigation.

`SE4_Netlify_20.zip` contains the complete hosted app. Supabase migration requirements are unchanged; see `SE4_Setup_20.md`. No site deployment, production migration or real push notification was performed by this update.
