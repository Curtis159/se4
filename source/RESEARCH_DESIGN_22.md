# Making OpenSE4 research easier to approach

My recommendation is **unlock cards plus optional goals**, with the full tree available for planning. The current page gives too much visual weight to controls and repeated text. A clear interface should answer three questions first: what will I gain, when can I get it, and what am I currently funding?

## Lessons from other games

| Game/source | Established design | What I would borrow |
| --- | --- | --- |
| [Endless Space 2 official manual, pp. 21–22](https://cdn.steamstatic.com/steam/apps/392110/manuals/ES2_PC_OM_JAN_2018_210x297_UK_HR.PDF) | Research is organized into major domains, with inspectable benefits and a queue. | Group by purpose; keep concrete unlocks next to the selection. |
| [Civilization VII official update notes](https://support.civilization.com/hc/en-us/articles/40536897044243-Civilization-VII-Patch-Notes-April-22-2025) | Selecting a locked technology can queue the prerequisites needed to reach it. | Start by showing a goal's prerequisite route. Automatic goal queuing could follow once exact target-level behavior is supported and validated. |
| [Galactic Civilizations IV developer overview](https://galciv4.stardock.com/gameplay) | Supernova restored access to any technology whose prerequisites are met after the earlier limited-choice approach. | Simplify the display without hiding valid choices or forcing random technology offers. |
| [Galactic Civilizations IV UI developer journal](https://www.galciv4.com/article/536398/galciv-iv-dev-journal-102-ui-improvements-in-v30) | The developers consolidated important bonuses into one view and tucked less-used resources away. | Keep allocated points, available points and completion estimates together; disclose secondary controls. |
| [Sins of a Solar Empire II UI developer journal](https://www.sinsofasolarempire2.com/article/541363/sins-ii-dev-journal-new-ui-horizons-and-player-customization-pt-1) | Its refresh emphasizes readability, organization and consistent placement across screens. | Use consistent card geometry, aligned costs, stable selected-item details and restrained decoration. |

These are design references, not proof that one arrangement will suit every OpenSE4 player. The recommendations below are my application of those patterns to this game's phone and PC requirements.

## Three layout concepts

**Unlock cards — recommended.** Two compact columns, including on most phones. A card shows the technology, next benefit, cost and estimated time. Selecting it reveals exact equipment or effects in one shared details area. One Add to queue action replaces a separate large button on every card. The queue is compact and shows which project receives points this turn.

**Compact library.** A concise technology list beside a selected-item inspector. This fits many choices and is useful on desktop, but the split pane has less room on a small phone. It is the strongest option for experienced players who know technology names.

**Level planner.** Show the current, next and following level for the selected research area. It explains repeated upgrades well but is less efficient when browsing several unrelated areas. It would work as an optional planning view rather than the default page.

The interactive concepts use illustrative values and unlock labels, not live campaign data. They do not change the game's tree or simulate its complete allocation rules.

## Ideas for the technology tree itself

1. **Add optional goal paths.** Examples: build a larger ship, improve speed, establish a new planet type or strengthen shields. Show the real prerequisites and precise reward. Let the player pin a goal while retaining freedom to choose other research. No cost or balance change is needed for a goal display.
2. **Group by recognizable purpose.** Use navigation such as Expansion, Economy, Ship Systems, Weapons, Defense and Specialist Technology. These can be display tags over the original tree rather than changed internal dependencies.
3. **Make milestones explicit.** Show what the next level improves, including numerical changes, and indicate the next major unlock. Levels with no new equipment may still improve existing abilities, so audit those before deciding they are unnecessary.
4. **Collapse repetitive levels visually.** A technology family could occupy one expandable row with its levels inside it. This reduces clutter without deleting research steps or changing costs.
5. **Consider a separate streamlined ruleset later.** If presentation is still insufficient, audit long sequences of small upgrades and consolidate selected ones into fewer, more distinct tiers. This would require cost/progression balancing, prerequisite updates, AI testing and a new-game compatibility policy. It should be an explicit alternate ruleset first, with original rules still available.

I would implement the goal display and milestone descriptions first, then use playtesting to identify which actual research steps deserve consolidation. I would avoid an arbitrary era system, random limited choices or mandatory beginner paths: those introduce restrictions without establishing that they solve this game's usability problem.
