# Light Cone automation — test build

This build contains 162 Light Cone loot entries and their local transparent card preview images in the Star Rail Light Cones compendium. Former 3-star cones are 4-star. Passives follow the reviewed S1 conversion draft. Equip a cone in the existing character Light Cone slot; the actor must have its matching Path. Inventory ownership alone grants nothing.

## Setup and use

- GM combat menu → **Light Cones & DoT**. Assign categories to the actor's abilities: Basic, enhanced Basic, Skill, Ultimate, follow-up, Elation, or Break. Generic attack/damage effects do not require category tags; category-specific effects do.
- Use the existing HSR Skill/Ultimate buttons for resource-controlled actions. Their subsequent tagged Midi-QOL activity is associated with the button activation to avoid firing Skill/Ultimate triggers twice.
- Set memosprite ownership in the same panel. Linked memosprite combatant creation/removal and real turns supply summon, unsummon, and memosprite-turn events. A newly linked sprite already in combat counts as summoned.
- Cone options include optional HP sacrifice, the actor-specific Trailblazer gate, and Break partner. HP sacrifice is disabled until selected. Ally HP-cost interactions require the GM's explicit consent toggle for that actor.
- Add a DoT by selecting target, source, registered damage attribute, DoT type, dice, and turn count. Base: 1d4. A source cone may grant a die step or additional initial duration. Defaults and mappings remain editable.
- DoT rolls at the affected actor's real turn start, passes typed damage to the D&D system, decrements remaining turns, and removes itself after the last tick. It does not critically hit. Temporary Ultimate/action-advance/talent/Elation turns do not tick it again.
- Same source/type/attribute refreshes instead of creating duplicate instances. Different sources remain independent. No retroactive current-turn tick on application. Zero turns removes it without rolling.
- Interrupted damage applications are held rather than blindly retried. The GM should review HP and remove/reassign the held DoT; this prevents damage being applied twice after an interruption.
- Party auras apply to conscious active allies marked **Is in Main Party?**. Direct targeted support effects can affect other legal allies.

## Validation

Node tests cover slot and Path gating, target conditions, additive bonuses, die steps, refresh/expiry, duplicate tick protection, interrupted ticks, initiative restoration, all 162 compendium documents, and every local PNG. These are automated tests, not a live Foundry v14 integration test. Midi-QOL workflows, actor preparation, custom attributes, and your installed memosprite module need an in-world check before publication.

The published manifest and release have not been updated.

## Artwork

Game artwork © HoYoverse. Local preview images retrieved from the Mar-7th/StarRailRes catalogue, `image/light_cone_preview`. Original source URL is retained for each entry in `data/light-cones.json`. Conversion design is the Telys Light Cone Workshop Draft 2.

## Preview channel and rollback

Install manifest: https://raw.githubusercontent.com/Telynor/telys-star-rail-ultimates-v2/light-cones-preview/module.json

This branch publishes prereleases and does not change main. Back up your Foundry world before testing. To roll back, stop the world and replace the module with the v3.13.27 release. Restore your world backup if you need to undo actor or item changes made while testing.
