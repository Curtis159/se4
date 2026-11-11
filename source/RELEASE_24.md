# OpenSE4 Update 24

## Included

- Research now uses unlock cards, eight proposed categories, search, native order within categories, and a selected-technology panel. Phones have two columns and four cards per page; desktop pages have eight cards. Native research rules, costs, prerequisites and allocation remain unchanged. Even splitting remains off by default.
- Survey cards show native resource values for planets and asteroid fields. Finite games show remaining stocks. Planet details include conditions, projected capacity for your race (with domed reductions), ruins, local abilities and system effects. Ruins and effects are flagged in the summary. Asteroids do not show inapplicable colony capacity figures.
- Human colonization asks for a colony type, including simultaneous games. Choose an existing type or add a custom one. Types are stored natively, shown in colony summaries/map labels, and editable on non-homeworld colonies. Homeworld type stays fixed by the engine.
- Status → Known Designs groups visible encounters and learned designs by empire. Unknown designs expose names and hull sizes, with no components. Native design knowledge reveals the exact learned design, without revealing other designs on the same hull. Visible colony units show names/counts without leaking unknown components. Learned designs remain reviewable and survive save/load. Foreign construction queues, facility lists and ship cargo remain private.
- Movement lines require explicit selection of a ship/fleet card in the open sector. Another sector or Close clears the lines; different ships in one sector display their own routes.
- Empty shipyards have a persistent Do Nothing assignment. Adding work clears it. Pause Construction remains independent for existing builds.
- Design-type dropdowns are consistent and alphabetical, including persistent custom names.
- The original data gives Counter-Intelligence 1 zero technology prerequisites. Level 2 requires Applied Intelligence 1; Level 3 requires Applied Intelligence 2. The page explains when no intelligence points/production are available.

## Validation

38 unit checks; native C++ surveys/design privacy/serialization; actual WASM idle yards, colony types, research/intelligence and construction; packaged UI integration including two ships with different routes; hosted compressed engine/offline cache/Classic parity; private Hegemon three-turn regression with unchanged checksums and no fallbacks. Real Chromium viewport checks at 320, 390 and 1280 pixels. Physical Android/iPhone testing remains.

## Files

OpenSE4_Research_24.html is the standalone PC browser build for solo play. SE4_Netlify_24.zip is the hosted/PWA package. SE4_Source_Update_24.zip is a cumulative source overlay excluding original game data, private campaigns and server secrets.

No Supabase schema change or deployment is needed for this update. See SE4_Setup_24.md for hosting and online configuration.
