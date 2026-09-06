# Tely's Star Rail Ultimates

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
- A configurable Item/Activity to execute as the Ultimate.
- A one-second, world-wide cinematic artwork splash (duration is configurable).
- Temporary interrupt turns inserted into the Combat Tracker.
- GM-defined custom Elements with uploaded icons and colors.
- Immediate GM-only manual Energy override on each character's Ultimate tab.
- Optional Element badge on the Ultimate orb.
- Midi-QOL support, with a core D&D 5e chat-message fallback.
- GM-authoritative socket handling for player Ultimate requests.

## Installation

Paste this manifest URL into Foundry's **Install Module** dialog:

`https://raw.githubusercontent.com/Telynor/telys-star-rail-ultimates-v2/main/module.json`

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
4. Enable the character, set Energy values and gains, select an Ultimate Item, upload HUD and splash artwork, select colors, and assign an Element.
5. Save. Owners of that actor receive an orb automatically. Use the HUD toggle in the Token Controls toolbar if an orb is closed.
6. At full Energy, click the orb to trigger the splash, interrupt turn, and configured Ultimate Item.

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
