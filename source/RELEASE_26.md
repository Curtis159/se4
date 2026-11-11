# OpenSE4 release 26

- Quick Game once again uses the original homeworld facility allocation: one shipyard, with the mineral facility restored. Verified against the original native factory at two seeds. Existing saved games retain their facilities.
- Learn is temporarily disabled and greyed out on the main menu. The scenarios remain available in the source for later revision.
- Ready-to-upload Netlify package, GitHub repository bundle and separate Supabase setup bundle are supplied. The GitHub bundle supports Netlify's site/ publish directory and an optional manual GitHub Pages workflow.
- Native combined/separate shipyard features remain available when the player builds additional yards. Multi-yard integration tests now build the second facility rather than modifying Quick Game's defaults.
- A Vault-backed push schedule SQL file and placeholder environment example are included for backend activation. Private keys have not been generated or included; no production Supabase deployment has been performed.

Verified: 39 unit checks; exact original Quick Game facility/checksum parity at two seeds; actual construction of a second yard with parallel/combined rates and facility upgrades; packaged UI including disabled Learn; hosted compressed engine and offline cache under /se4/ (repository-path simulation); local PostgreSQL schedule syntax and missing-secret guard. Physical device installation and live Supabase notifications still need account/device testing.

Multi-device push: the existing worker sends to every registered endpoint for the player. A new worker-level test verifies two-device delivery fan-out, expired endpoint isolation and retry behavior. Public online configuration now refreshes from the network before falling back to cache, so adding the VAPID public key after initial installation is picked up. No live push has been sent.
