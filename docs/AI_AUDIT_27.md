# OpenSE4 AI audit — November 11, 2026

## Scope and results

Twelve genuine engine campaigns: six Classic, four Hegemon, two mixed. Four computer empires per campaign (Terran, Xiati, Sergetti, Phong), Medium difficulty, default research and equipment prices, split construction enabled, events disabled. Two seeds used matched 16-system Classic/Hegemon comparisons; additional 4-system turn-based and 6-system simultaneous maps encouraged contact. Runs stopped at 150 or 200 turns; score leaders are not winners. No campaign reached a declared victory.

Total: 2,200 global turns, 35 recorded combats, 23 rejected AI commands, and 0 Hegemon interpreter fallbacks.

| Campaign | Systems | Turns | Battles | Treaty offers | Accepted | Refused | AI rejections |
|---|---:|---:|---:|---:|---:|---:|---:|
| classic-12345-r0 | 16 | 200 | 8 | 53 | 9 | 44 | 0 |
| classic-43210-r0 | 16 | 200 | 8 | 32 | 1 | 31 | 0 |
| classic-12345-small | 4 | 200 | 0 | 38 | 17 | 17 | 0 |
| classic-43210-small | 4 | 200 | 13 | 56 | 18 | 38 | 0 |
| classic-24680-sim | 6 | 200 | 1 | 55 | 13 | 41 | 0 |
| classic-98765-sim | 6 | 200 | 1 | 60 | 16 | 44 | 0 |
| hegemon-12345-r0 | 16 | 200 | 0 | 0 | 0 | 0 | 5 |
| hegemon-43210-r0 | 16 | 200 | 0 | 0 | 0 | 0 | 12 |
| hegemon-12345-small | 4 | 150 | 0 | 0 | 0 | 0 | 3 |
| hegemon-43210-small | 4 | 150 | 1 | 0 | 0 | 0 | 2 |
| mixed-24680-r0 | 4 | 150 | 0 | 68 | 8 | 60 | 1 |
| mixed-24680-r1 | 4 | 150 | 3 | 16 | 8 | 8 | 0 |

## Engine and AI wiring findings

1. **Hegemon does not understand the new independent construction lanes.** Its SDK colony `queue` exposes shipyard lane zero on a yard-equipped colony, while its Python queue-target helper cannot select a yard lane. Its facility-upgrade planner therefore sometimes checks the wrong queue and issues duplicate upgrades. Classic explicitly iterates the planet and shipyard lanes in its economy planner. Hegemon still builds ships, researches and expands; the missing wiring concerns independent lane planning and the new queue controls. Sources: `upstream/src/sdk/view.cpp`, `upstream/python/opense4/cmd.py`, `upstream/mods/hegemon/ai/hegemon/construction.py`, `upstream/src/game/ai_economy.cpp`.
2. **Browser End Turn treats every rejected AI command as a failed turn.** The audit harness recorded these refusals and continued, as the native processor permits. The browser bridge currently throws for any rejection and restores its pre-turn save. The Hegemon duplicate-upgrade problem can consequently block a browser campaign. This remains a known issue requiring an SDK/planner correction; it is not evidence of an interpreter fallback. Source: `wasm/bridge.cpp`, End Turn.
3. **All-Hegemon diplomacy stalls in gift exchanges.** Those campaigns sent thousands of gifts and accepted gifts, but no treaty proposals; contacted pairs remained at None. Hegemon's anger-calming gift branch returns before considering a treaty and has no comparable gift cooldown. This is an AI policy problem to investigate, not evidence that treaty messages cannot be delivered. Classic and mixed campaigns demonstrably offered, accepted and refused treaties. Source: `upstream/mods/hegemon/ai/hegemon/diplomacy.py`.
4. **Small maps do not guarantee fighting.** One 4-system Classic run had no combat, another had 13 battles. Negotiation, diplomacy and expansion matter as much as map size. Thirty-five battles across this sample are insufficient for reliable weapon-versus-weapon balance conclusions.

## Suggested balance work

No facilities, components, tech requirements or prices were changed by this audit. Fix Hegemon's construction and diplomacy wiring before comparing strength or changing costs.

- Mineral Miner I produces 800 baseline minerals for 1,500 mineral build cost; II produces 900 for 2,000. Test upgrading versus using a free facility slot, including planetary resource percentages, maintenance and upgrade pricing. Do not equate list cost with upgrade cost.
- Research Center I/II provide 500/600 baseline research for 1,500/2,000 mineral build cost. Minerals and research are different currencies, so a simple payback division is misleading.
- A second Space Yard I adds 2,000 construction capacity per resource; upgrading one to II increases 2,000 to 2,500. The combined/separate queue extension may make extra yards attractive. Test equal-cost, equal-slot economies before changing either price or throughput.
- Ice/Gas Colonization each cost 500,000 RP. They are rarely acquired early in these runs, while rock-only expansion can already be extensive. A modest reduction is a candidate for a controlled test, not a recommendation to alter the live rules yet.
- Ion Engine II is deliberately an improvement over I and is slightly cheaper at the same size. The latest-researched filter addresses choice overload; this is not itself an imbalance.
- Weapon comparisons need controlled hull, range, supply, defenses and point-defense tests. The present campaign sample does not justify missile, cannon, shield or armor price changes.

## Reproduction and limits

Build with `OPENSE4_BUILD_AI_AUDIT=ON`; the default is OFF. `tests/ai-audit.cpp` uses the native turn processor. `tests/run-ai-audit.mjs` runs the same harness compiled with the real Hegemon MicroPython SDK. Parameters: mode, seed, turns, race rotation, simultaneous flag, system count. The included raw JSONL captures ten-turn checkpoints, delivered diplomatic messages, treaties and command refusals. Public artifacts contain no user campaigns.

The seeds, race presets, starting settings and AI policies are a limited sample. Acquired technology may include trades or ruins. Recorded refusals were allowed to continue in this harness, unlike the browser's current rollback behavior. These are bounded campaign tests, not exhaustive balance certification.
