# Classic AI and Hegemon — decision differences

The original-style opponent is named **Classic AI**. Both opponents are programmed strategy systems. Hegemon runs Python planners inside the game's embedded MicroPython runtime; it does not call an LLM or require an AI API subscription.

| Decision | Classic AI | Hegemon |
|---|---|---|
| Overall approach | Original race profiles, AI states, minister rules and priority tables, with responses to the current game state. | Coordinates expansion, arming and war phases using threats, enemy estimates and economic capacity. |
| Research | Selects available areas from the race's research rows and current AI state; falls back to a seeded random choice when no row supplies a project. | Scores improvements unlocked by technology, prerequisites, research cost and time; balances civilian and military priorities and keeps research already in progress. |
| Construction | Uses the original facility/vehicle priorities and colony roles. | Values facility output and upgrades against construction time, resource needs and delivery; budgets construction while keeping funds for maintenance and colony development. |
| Ship design | Uses race templates with tonnage windows, required abilities, weapon preferences and fixed fitting order; normally takes the largest allowed hull. | Searches researched hulls and equipment combinations for each role, checks designs through native engine queries, and scores combat power, survivability and cost. |
| Expansion | Uses the original colony/exploration ministers and profile rules. | Scores reachable colony targets by capacity, resource values, habitability, distance and danger, while checking supplies. |
| War and diplomacy | Original anger, relationship, personality and relative-strength thresholds drive diplomatic actions and military plans. | Seeks peace with non-target rivals, concentrates fleets, remembers enemy sightings, checks repair/supply needs and seeks favorable strikes against a selected rival. |

Hegemon should particularly improve economic development and coordinated expansion. It is not guaranteed to be better in every battle. The bundled upstream README reports 88% score/victory wins in its 156-game evaluation against Classic, but also says it eliminated no empire in those 150-turn games. Those are the author's measurements, not a benchmark of this browser port.

The shipped `config.py` matters: some experimental policies are disabled. For example, scarcity weighting specifically in ship-design costs is disabled even though the main economy uses resource prices. The browser integration keeps the bundled Hegemon policies unchanged.

Implementation source: `upstream/src/game/ai_research.cpp`, `ai_design.cpp`, `ai_economy.cpp`, `ai_diplomacy.cpp`, and `upstream/mods/hegemon/ai/hegemon/{strategy,research,construction,designer,expansion,military,diplomacy,config}.py`. The bundled `upstream/mods/hegemon/README.md` describes the evaluation and its limits.

## Browser integration

Build 15 embeds the original MicroPython interpreter, SDK and Hegemon Python files. The browser port supplies WebAssembly garbage-collection root scanning and runs SDK work synchronously inside the existing dedicated game Worker. Requests are serialized because the interpreter permits one active call at a time. No Hegemon decision logic was rewritten in JavaScript.

Choose **Hegemon** under Quick Game → Computer AI, or New Game → Players → Computer AI. Classic remains available. The choice applies to computer empires; neutral empires retain their original behavior. The AI mode is stored in the save file.

This build is larger because it includes the interpreter and SDK. Actual Android Chrome and iPhone rendering/performance still require device testing.

## Supabase project

The supplied project URL and publishable key are stored in `web/online-config.json`. The public Auth settings endpoint returned HTTP 200. The multiplayer table check returned HTTP 404 / `PGRST205`: `public.se4_games` does not exist in the API schema cache yet.

The public key is sufficient for the eventual authenticated browser client. Installing the prepared migration requires the project's SQL editor or an administrator database connection. No schema, account, invitation or push notification was created during this update. The multiplayer lobby and host/browser protocol still need integration and end-to-end testing after database setup.

For the runtime port, MicroPython's official [WebAssembly port](https://github.com/micropython/micropython/tree/master/ports/webassembly) supplies the relevant Emscripten/GC approach.
