# OpenSE4 update 21

- Colony expand/collapse arrow is at the bottom right of its summary.
- Ship cards and selected ships on the map show original artwork, movement remaining/maximum, undamaged/total components and a blue supply bar. Components and loaded cargo have separate expandable views. Damage, supply capacity and population by race come from the native engine.
- Planet construction offers ongoing **Labor Focus**: Minerals, Organics, Radioactives, Research or Intelligence when available. It adds 5% to that colony's selected output, rounded down, until stopped or planetary construction is added. Independent shipyards remain separate. Finite deposits constrain extraction. Zero output remains zero.
- Focus persists in existing colony metadata; the save format remains version 13. Focused planets no longer generate idle planet construction prompts. Idle shipyards still do.
- New Quick Game/New Game human empires default to priority research allocation. Existing saves and authored tutorials retain their settings. Research rules, prerequisites, costs and the tech tree are unchanged.
- Research offers Available/All technologies and category filters. Repeat and even splitting remain under Allocation. Original technology order is preserved.
- Ship design resource costs are horizontal. Focus outlines stay inside controls to avoid overlapping adjacent boxes.

27 unit checks pass. The packaged gameplay UI suite and actual WASM integration tests pass for Labor Focus economics, persistence, eligibility, construction replacement, ship status, loaded cargo and disclosures. Hosted compressed-worker and offline-cache checks pass. The previously failing Hegemon campaign advances three turns under the small stack with unchanged campaign checksums and no AI fallback.

Real browser layouts were inspected at 320, 390 and 1280 pixels. Physical Android Chrome and iPhone Safari testing remains outstanding.

Open `OpenSE4_Labor_Ships_21.html`, then Load Game to continue an existing save. For Netlify, publish the contents of `SE4_Netlify_21.zip`. The source overlay includes earlier changes. Private campaign saves are excluded.

Supabase configuration is unchanged; this package does not deploy database migrations or activate push delivery. See SETUP_21.md.
