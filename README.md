# Tely's Star Rail Ultimates

## Eidolon Resonance

Character sheets include a shared GM/player Eidolon tab with six sequential unlocks. GMs can configure the background, five-shard glass layer, isolated E3 layer, title font, per-Eidolon artwork, titles, crop position, zoom, activation state, and a per-character Item used as activation currency.

## Shared Skill Points

- One synchronized, party-wide Skill Point pool with configurable maximum and combat-start values.
- Uploadable illuminated and empty point artwork, configurable points per row, and right-to-left row drain order.
- A movable and resizable meter plus per-character movable Skill buttons.
- GM-authored per-character Skill descriptions. Using a Skill deducts one point and posts its formatted text to chat.

## Elation and Punchline

- A world-level “Elation on Team?” switch controls Punchline and every Aha Instant feature.
- Choose a saved Path as the Elation Path. Matching characters generate their configured Punchline amount on damage; other player characters generate +1.
- The shared movable Punchline counter supports custom mask artwork and a custom number font.
- Punchline number font size is independently adjustable from Aha Config.
- When Aha's turn begins, matching Elation Path characters receive temporary portrait-backed Elation Action turns immediately after Aha, ordered by their existing initiative from highest to lowest.
- Each temporary turn posts that character's Elation Action text to chat and waits for its owner to press **Complete Elation Action**. After the final action, Punchline resets to zero, the temporary turns disappear, and combat resumes.
- Skills, Ultimates, and Elation Actions are descriptive text fields rather than executable JavaScript. Their normal resource, animation, and turn behavior still resolves when the description is empty.

## Programmable Talents

- Every character has a GM-authored Talent script plus editable current and maximum Talent Points.
- Held Talent Points reset to zero whenever combat starts; the configured maximum is preserved.
- Talent scripts receive event-driven conditions for combat, turns, damage, Energy, Skill Points, Punchline, Skills, Ultimates, Elation Actions, and Talent Point changes.
- Scripts receive `event`, `punchline`, and actor-specific `talent.get/max/add/spend/set` helpers. Execution is GM-authoritative with recursion and duplicate-event protection.

A Foundry Virtual Tabletop v14 module for D&D 5e that recreates Honkai: Star Rail-style Ultimate energy and interrupt turns.

## Features

- A movable and resizable circular Ultimate orb for every configured player character.
- Bottom-to-top animated Energy fill.
- Element-defined charging and fully charged colors inherited by every assigned character.
- Green **Ultimate Ready** text at 100% Energy.
- Per-user saved orb position, size, and visibility.
- Automatic Energy gain when a character attacks or is attacked.
- Configurable Energy score, maximum, and base gains.
- Energy modifier: `floor((Energy Regen score - 10) / 2)`.
- A GM-only Ultimate tab injected into D&D 5e character sheets.
- Formatted Skill, Ultimate, and Elation Action chat cards.
- A one-second, world-wide cinematic artwork splash (duration is configurable).
- Temporary interrupt turns inserted into the Combat Tracker.
- GM-defined custom Elements with uploaded icons and colors.
- GM-defined Paths with browseable or drag-and-drop icons; assigned Element and Path badges appear beside the character portrait.
- Immediate GM-only manual Energy override on each character's Ultimate tab.
- Per-character GM-only Skill, Ultimate, and Elation Action description editors.
- A left-side GM panel for live Energy, Punchline, Skill Point, Talent Point, and gain-value adjustments.
- GM Action Advance turns that interrupt combat for a selected initiative participant, then resume the interrupted turn.
- Per-token temporary Toughness weakness checklists in the GM panel. Permanent sheet selections remain checked and locked, targeted enemies are highlighted, and temporary weaknesses remain visible until reset.
- Per-enemy temporary Toughness weaknesses from the GM panel, layered over permanent sheet selections.
- Per-enemy and Scene-wide controls that remove temporary weaknesses and return to permanent selections without changing the NPC sheet configuration.
- GM-only enemy Toughness bars with configurable maximum/current values and Element weaknesses.
- Matching player Elements automatically deal Toughness damage equal to the attack's raw dice results, excluding flat modifiers.
- Players can see enemy Toughness bars, but weakness dots remain hidden until that Element successfully deals Toughness damage.
- Player-owned character attacks launched from hotbar macros can transmit their raw damage dice and selected targets to the GM-authoritative Toughness system.
- Midi-QOL support, with a core D&D 5e chat-message fallback.
- GM-authoritative socket handling for player Ultimate requests.

## Installation

Paste this manifest URL into Foundry's **Install Module** dialog:

`https://github.com/Telynor/telys-star-rail-ultimates-v2/releases/latest/download/module.json`

The GitHub repository is `telys-star-rail-ultimates-v2` under the `Telynor` account.

## GitHub release setup

1. Open the public GitHub repository named `telys-star-rail-ultimates-v2`.
2. Upload the contents of this project to its `main` branch. `module.json` must be at the repository root.
3. Push changes to `main` (or run the release workflow manually).
4. The included GitHub Action reads the manifest version and automatically creates the matching release and installation ZIP.
5. The ZIP contains `module.json` at its root, as Foundry requires.

## Using the module

1. Enable the module in a D&D 5e world.
2. As GM, open **Game Settings → Configure Settings → Module Settings → Manage Elements** and create the campaign's Elements.
3. Open a player character sheet and select the GM-only **Ultimate** tab.
4. Enable the character, set Energy values and gains, write its ability descriptions, upload HUD and splash artwork, and assign an Element and Path.
5. Save. Owners of that actor receive an orb automatically. Use the HUD toggle in the Token Controls toolbar if an orb is closed.
6. At full Energy, click the orb to trigger the splash, interrupt turn, and formatted Ultimate chat card.

## Energy rules

For both attack and attacked gains:

`final gain = max(0, configured base gain + Energy Regen modifier)`

The modifier is calculated like a D&D ability modifier:

`floor((Energy Regen score - 10) / 2)`

"Attacked" can be configured per actor to mean either targeted or hit. Midi-QOL provides exact hit detection. Without Midi-QOL, the module uses targets recorded on the D&D 5e chat message; if hit data is unavailable, the configured targeted/hit fallback is used.

## Notes

- A connected GM must be present for player activation requests and authoritative Energy automation.
- Character and unlinked-token actors are supported, but actor ownership controls who sees each orb.
- The module stores its data in Foundry flags and does not modify the D&D 5e system schema.
- Prevent duplicate attack awards by letting Midi-QOL take priority whenever it is active.

## Updating

When publishing a new version, change `version` and the release filename in `module.json`, then create a matching GitHub release tag.
- Cinematic Ultimate title cards with configurable title/subtitle placement, custom TTF/OTF/WOFF fonts, geometric accents, and live preview
- Title-card squares and underline automatically inherit the assigned Element's charging color
- Editable Energy Regen ability card beside the six standard character abilities; all automatic Energy gains use its D&amp;D-style modifier
- GM-only Aha Instant floating button with configurable artwork, color, and synchronized WebM playback beneath the Foundry interface
