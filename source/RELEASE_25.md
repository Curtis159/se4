# OpenSE4 Update 25

- Technology selection now lists research areas made available by its next level, under New research. Construction 1 shows Fighters, Troops and Mines when their other native prerequisites are met. This is calculated with the real engine's researchability checks on a temporary empire copy; research rules, progression and campaign state are unchanged.
- Research cards can show a research branch as their benefit when no equipment is unlocked, and research search includes those branch names. The empty-state wording is now No new unlocks at this level.
- Log entries now offer destination buttons using the engine's stored event destination. Construction and colonization events use View location to open the event's system and sector. Research, intelligence, diplomacy and design entries open their respective screens. Entries without a native destination have no inactive button. Map navigation clears stale movement selection and route lines.
- Existing saves remain compatible. No Supabase migration or configuration change is required.

## Verified

39 unit checks passed. Native C++ tests verify Construction's research branches against prerequisite rules, unchanged campaign checksums after preview, and location/screen/no-destination log metadata. Actual packaged WASM UI tests complete Construction and confirm its listed branches become researchable, build a real ship and navigate from its log entry, and colonize a planet and navigate to it from its log entry. Full gameplay UI tests, hosted compression/offline caching and Classic parity passed. The private Hegemon regression retains its three expected checksums with zero AI fallbacks. Phone browser checks confirm research branch names and functioning log buttons at 390px and no log overflow at 320px. Physical Android/iPhone checks remain.

OpenSE4_Research_25.html is the standalone local PC browser build. SE4_Netlify_25.zip is the hosted/PWA upload package. SE4_Source_Update_25.zip contains cumulative source updates, excluding original game data, private campaigns and server secrets.
