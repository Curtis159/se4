# OpenSE4 update 22 — Sentry and ship manifest

**Sentry** is available from ship cards, map actions and the colony-page ship manifest. It uses the original native order. Ships stay on sentry across turns and do not generate idle-order prompts. Enemy presence in the system or low supplies ends sentry under the original rules; combat can also end sentry. Giving another order replaces it, and Clear Orders cancels it. No Standby order or new save-format change was added.

The **Ship manifest** appears below the colonies. It lists all owned ships, bases and other deployed vehicles across all systems, including vehicles built from obsolete designs. Each collapsed summary shows the original portrait, movement, component condition, supply, location and orders. Expand it for components, cargo, Sentry, Clear Orders and **Go to ship**. That action selects the correct ship, system and sector on the map. Mobile shipyard queues appear inside their manifest entry.

The research page in the playable game remains unchanged in this release. Three interactive layout concepts and a research/design report are supplied for comparison. The user is now open to discussing technology-tree changes; the report distinguishes presentation improvements from optional rule changes that would require balance and compatibility work.

## Verification

- Actual WASM: Sentry persists for three turns and through save/load; another order replaces it; Clear Orders restores idle attention.
- Actual packaged UI: Sentry works from ship cards, map actions and the manifest. Manifest entries expand, retain their open state after orders and select the correct map location.
- Packaged gameplay UI regression suite passes, including construction, research, movement, save/load, multiplayer setup and tutorials.
- 28 unit checks pass. Hosted compressed-engine/offline-cache verification passes.
- Native source and engine bytes match update 21. This release exposes existing Sentry behavior and adds browser UI; no alternate native order remains.
- Real browser: phone and desktop manifest layouts inspected; phone Go to ship selected the expected ship and system. Physical Android and iPhone testing remains outstanding.

Open `OpenSE4_Sentry_Manifest_22.html` for local solo play and load an existing save. Publish the contents of `SE4_Netlify_22.zip` for the hosted/installable version. Existing update 21 saves remain supported. No private campaign save is distributed. Supabase activation is unchanged; see SETUP_22.md.
