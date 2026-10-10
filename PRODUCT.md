# Clone Human

English/Korean single-player factory roguelike for the browser. Players build a production line on a terrain map, then observe automatic combat against eight enemy cores. The factory's placement and execution order determine its economy and attack synergies.

The user requested a polished single-player game in the existing GitHub repository, with improved graphics, a useful map, Factorio-inspired interaction, and music. They chose building between waves over continuous live construction.

The shipped first version has eight relocatable machine plots on a 12×7 grid, automatic conveyor connections, twelve module types, six starting builds, three factory upgrades, five sector types, and three objective types. Terrain bonuses follow machine coordinates. This is a compact factory strategy game; manual belt construction and free-form unlimited expansion are future design directions.

Runtime is static HTML/CSS/JavaScript with no account, server dependency, tracking or runtime CDN. Progress and audio preferences belong to the current browser origin. Music is an original local synthesizer score. Font and terrain assets are bundled with provenance recorded in docs/graphics-evidence.md.

Success means a new player can start, understand placement/order, make meaningful terrain choices, finish or lose a run with clear feedback, resume after closing the page, and play with keyboard or touch. Clear gameplay and stable saves take priority over adding more systems.

The first-play interface teaches route → machine → battle, with numeric cards and optional details. Combat occupies the top of the desktop sidebar and explicitly distinguishes clones, enemy health, and retaliation. Compatible orthogonal neighbors earn capped synergies, and two optional directed manual links support distant machines without changing execution order. Legacy saves remain readable; adjacency rules apply immediately to existing battles, and a first manual connector migrates the run to v2.
