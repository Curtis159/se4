# Build 29 — combat round limit and replay timeline

Battles with hostile survivors now play all 30 configured rounds. Quiet rounds are recorded, so the viewer no longer mistakes the last shot or movement for the end of combat. Combat can still end earlier when no hostile sides remain. The 30-round setting previously executed only 29 full rounds.

Existing campaigns remain loadable. New simulations and battles use the fix; old saved replays cannot recover quiet rounds that were never recorded. No Supabase changes are required.

For GitHub: merge the GitHub patch into your existing build 28 repository, preserve your site/online-config.json, commit, push, and run the Pages deployment workflow. The installed app should report Build 29 after applying the update. Netlify ZIP is a complete prebuilt site. The standalone HTML supports local solo play.

Validation: 47 JavaScript checks; real WebAssembly simulator verifies two surviving unarmed hostile ships reach round 30, an overwhelming force wins before round 30, and simulation leaves the campaign unchanged. Hosted worker checks validate the packaged engine and update cache.
