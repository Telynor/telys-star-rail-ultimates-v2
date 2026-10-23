# Tely's Star Rail Ultimates

## Midi-QOL compatibility (preview.27)

For a D&D5e **6.0.6** world, use **Midi-QOL 14.6.0** and **DAE 14.6.0** on Foundry **14.368 or newer**. The authors publish these through the [Midi-QOL 14.6 manifest](https://gitlab.com/tposney/midi-qol/-/releases/v14.6.0/downloads/module.json) and [DAE 14.6 manifest](https://gitlab.com/tposney/dae/-/releases/v14.6.0/downloads/module.json). The catalog's Midi 14.0 line targets D&D5e 5.x; changing an HSR module cannot make that upstream version support D&D5e 6. D&D5e 5.3.3 worlds retain their Midi/DAE 14.0 integration.

Update **Ultimates to preview.27**, **Memosprites to 1.4.2**, and **Planar Ornaments to 1.0.17** together. Install or update this preview using its existing [preview manifest](https://raw.githubusercontent.com/Telynor/telys-star-rail-ultimates-v2/light-cones-preview/module.json).

Midi 14.6 pre-roll payloads and chat-message UUID workflow lookup now preserve per-attack Elements. Resource and summon attribution waits for a completed, non-aborted workflow and ignores repeated completion notifications. Light Cone attacks/saves and manual combat buffs use the D&D5e 6 roll fields and v14 Active Effect data, while retaining D&D5e 5 paths. Existing party, artwork, summon and actor configuration is retained.

Validation: 314 Node tests, including the official D&D5e 5.3.3/6.0.6 native placement/summoning source tests, plus headless browser and DOM regressions. Compatibility-specific cases cover modern pre-roll payloads, target Energy/Toughness deduplication, multi-part damage attribution, modern roll bonuses and continued legacy behavior. Browser fixtures substitute Foundry persistence; this is not a live-world or full Midi combat certification.

## Party position rules and Element badges (preview.26)

An Item-unlocked character can use any of the five positions, including when the source sheet belongs to the GM. Trial Characters must use **position 5 (Optional Character)**, even when the party also holds their unlocking Item. Dropdowns and Swap slots now support valid moves between the main four and position five without duplicating or removing either member. Preset saves and lineup locks enforce the same rules for players and GMs. The Element image now sits behind the level badge, to the left of the character name and Path.

## Party presets, optional companions and floor shadows (preview.25)

Party Setup now uses a shared starfield and floor, perspective-sized poses and shadows projected from each character’s selected artwork. Nameplates show sheet level, sheet name and Element image, with the configured Path image and name below. Trial Characters display a bold red **TRIAL** label.

Use **01–06** to load shared party configurations. Name a preset and use **Save preset** to store it without changing active membership, or **Lock in changes** to save and apply it. Unsaved local drafts survive switching between presets while the window is open. Existing player protection, GM requirements and revision checks apply to every preset.

The right-hand **Optional Character** slot accepts one Trial Character or an item-unlocked character. The GM links **Unlocking item** under **HSR Settings → Character → Party membership** by dropping an Item. That character becomes selectable when the main party holds the Item or a source-matched copy. Same-name Items, zero quantities and inactive holders do not unlock it. Inventory changes update the open party menu; the GM checks eligibility again when saving or applying a formation. The optional character follows the main four on the combat HUD.

## Shared Party Setup and encounter fixes (preview.24)

Update Memosprites to **1.4.1** as well. Open **Party Setup** from the combat HUD, HSR toolbar, phone hub or main-character selector. Four position dropdowns and **Swap slots** arrange the shared party while protecting active player characters. **Lock in changes** saves the order used by every client's combat HUD. Concurrent edits preserve stale drafts and require reloading the current party before saving.

The GM configures four independent artworks per character under **Configure slot artwork**, with image selection, alignment, scale and flip for each position. Moving a character between positions selects the matching artwork automatically. Under **Party Requires**, drag up to four world character sheets into the requirement slots and save the list. Its on/off toggle retains the assigned characters; when enabled, every required character must be present before anyone can lock in a lineup or change their main character.

Boss phase changes now isolate each token's Actor, serialize transitions, preserve embedded item/effect references, recover failed transitions, and follow the active phase's initiative artwork. This release also fixes deleted-Combat and D&D5e movement access errors, avoids stale prepared bonuses, and reduces repeated stat and HUD work. Memosprites 1.4.1 supplies matching HUD refresh and damage attribution fixes.

## Summon resources and replacement (preview.23)

Update Memosprites to **1.4.0** as well. Every live summon supplies its own HP semicircle, including when an older saved design hid the arc. In each Skill or Ultimate summon row, choose **Show resource? → None / Dots (3) / Percentage / HP**, its initial value and maximum, and **Uses own initiative / Takes its turn with you**. Dots float without an enclosing shape. Direct Skill companions default to dots; spell summons, including spells cast by Skills, default to no extra resource. **Abilities → Skill → Spell summons** lists each summon profile from the character's spells with independent settings.

An occupied companion slot opens **“you still have a summon out, do you wish to dismiss and summon your new creature?”** with Yes/No. No or cancelled placement keeps the existing creature and its turn. Yes followed by completed placement removes the old scene token, its synthetic Actor, and its initiative entries before the replacement appears with its new portrait, HP and resource. Multiple creatures from the same cast are dismissed together. Source Actors in the Actors directory remain available for later summons. The default gives each new creature a rolled initiative; **Takes its turn with you** gives it no separate tracker turn.

## Native spell-style summon placement (preview.22)

Skill/Ultimate creature lists and Memosprites 1.3.3 now use D&D5e’s native token placement, the same preview used by summon spells. Move the token preview, left-click to place each copy, and right-click or Escape to cancel the whole pending cast. No custom PIXI square overlay is used. Invalid positions reopen the native preview with a warning. The GM still validates range, occupancy and lighting walls before creation; existing cancellation/refund, initiative and live HP/portrait behavior remains. Update both Ultimates and Memosprites.

## Summon size and lighting

Summon collision checks now resolve the caster’s Level document correctly, allowing valid placement in mapped rooms and on open maps. With no lighting-blocking walls or surfaces on that level, only the selected square must be in range and on the map; larger creatures may extend beyond the zone or map edge. Full-size occupancy checks still apply. Maps with lighting barriers retain full-footprint checks. Skills, Ultimates, native spell summons and Memosprites share these placement rules.

## Compact Actor controls and NPC allies

Toughness, Multitype, NPC Enemy/Ally, Planar Relics and Boss Encounter share a compact Actor sheet header area. The Toughness dialog also links directly to Multitype. Ally NPCs use blue initiative frames and hide/disable Toughness; Enemy NPCs use red and enable it. Current/max Toughness, weaknesses and ability settings are retained. Unlinked summons retain independent combat state. The NPC header’s crop icon (also in Toughness → Format Initiative Portrait) opens the visual initiative picture editor: drop/browse an image, drag, zoom and flip. Framing saves on the source NPC and applies to all of its existing and future token copies across scenes, whether Ally or Enemy. Duplicating a configured world NPC retains the same portrait source. Normal and enhanced portraits remain separate designs.

Planar Ornaments 1.0.16 adds its compact Relics and Original/Buffed stats icons to the same area and excludes spell/ability usage windows. Search **NPC ally** or **compact header** in Help Documentation for the illustrated guide.

## Multitype Elements for every Actor

Enable **Multitype?** on any PC, NPC or summoned creature. On PC sheets use **HSR Settings → Combat → Multitype & Element Change**; the GM can also use the **HSR Element Settings** shuffle button in any Actor sheet header.

- **Multitype attacks** (mode switch OFF): assign an HSR Element to an owned Item or individual activity. Resolution is activity → Item → Actor. Open **Assign attack Elements** or the Item sheet’s **HSR Attack Elements** button. Each dropdown saves immediately.
- **Type Changer** (mode switch ON): hot-swap the Actor’s Assigned Element from its sheet, **Star Rail GM Panel → Element Change**, or **DM Combat → Element Change**. Linked tokens share their world Actor; unlinked NPCs and summons use their own token Actor row.

Standard D&D5e and MidiQOL use the same captured attack Element for Toughness matching. MidiQOL respects confirmed hits; repeated notifications apply once per damage event/target. Existing rolls retain their captured Element after live changes. This does not rewrite D&D5e damage types or resistances. Disabling Multitype preserves attack assignments and the last Actor Element.

Open **Star Rail → Help Documentation** and search **multitype**, **type changer** or **attack element** for the illustrated guide and detailed field reference. New controls include hover and keyboard help.

## Illustrated help and hover documentation (preview.16)

Open **Star Rail rocket on the left rail → Help Documentation**, below the other tools. GMs and players can search the entire manual, browse grouped contents or use its A–Z index. The 54 guides include worked examples, screenshots, diagrams and individual field/control references. Click an illustration to expand it. Try `alt ult`, `pet range`, `HP cost`, `art` or `memosprite dots`; multiple keywords narrow results. Press `/` to focus search and Escape to clear it.

Hover or keyboard-focus controls throughout character HSR settings, GM Panel, DM Combat, Star Rail apps and installed Memosprite configuration for meanings, units, limits and disabled/current state. Dynamic rows receive the same help. Contextual **? Help** buttons open the relevant guide. Reading help never spends resources or changes configuration. The current in-game manual takes precedence over older README feature notes.

The documentation and illustrations are bundled in `docs/` inside the release ZIP and require no external documentation service. Companion hover help is supplied by Ultimates when the separate Memosprites addon is installed.

## Skill and Ultimate summons (preview.15)

In a character’s **HSR Settings → Abilities → Skill**, or **Ultimates → Ultimate Summoning**, enable **Summons creature?**. Drag existing world Actors from the Actors directory into the list, or choose **Add existing Actor**. Drag rows to reorder them; **Count** sets how many copies of the selected creature to place. Skill and Ultimate lists and radii are independent. These settings also apply to the character’s enhanced abilities, with no Path requirement.

Set **Summoning radius** in the scene’s distance units (for example, 30 ft on a 5-ft grid). Using the ability opens the creature menu, then opens the same native token preview used by D&D5e summon spells. Move the full-sized preview, left-click to place each copy, or use **Esc** or right-click to cancel the entire pending cast. Tokens inherit the source Actor’s prototype-token size and settings and appear with a brief summoning animation. Existing Actors are referenced; their base documents are not modified.

With lighting boundaries present, the entire footprint must be inside the radius and scene. Without those boundaries, only the selected square must fit inside the radius and scene. The full creature must always be clear of other tokens. A lighting-blocking wall prevents summoning across it or straddling it, even if that wall allows movement. Open doors and walls on other levels are respected. The active GM validates ownership, the saved creature choice, quantity, size, range, occupancy and barriers before creating tokens; a connected GM is required for player casts.

Invalid placements show **Cannot Fit**. If nothing fits or placement is cancelled, no SP, HP or Ultimate charge is spent. Queued Ultimates create their creatures when their Ultimate turn begins; if the chosen space is no longer available, the player can reposition. A blocked or cancelled queued summon restores the original Energy or alternate counters and continues initiative. Partial token-creation failures are cleaned up, and ending combat restores reserved summoning charges.

In **Abilities → Skill**, **Skill point cost:** offers **0–5** or **Custom**, retaining existing numeric costs. A successful cast automatically deducts that amount from the shared SP bar. **Has HP requirement?** adds **Half HP**, **10% HP**, a **Custom constant**, or a **Custom roll (xDy)** such as `2d6`. Percentages can use **Current HP** (default) or **Maximum HP**; costs round down. Dice are rolled once by the GM, and the character must have enough actual HP to pay; temporary HP is not consumed. A cost may reduce HP to zero. Blocked summons do not trigger Skill/Ultimate cast rewards.


## Character sheet ability scores

The **REGEN** (Energy Regen) and **BREAK** (Break Effect) cards use the native D&D5e ability-card shape, colors, modifier and score-box styling. Hover either card for its full name. All eight scores share a responsive row: cards, labels and score fields scale together as the sheet width or sidebar changes, keeping the row inside the sheet. Owners and GMs can edit the added scores directly; the saved values and modifier calculations are unchanged.

## Alternate Ultimate orb builder

Check **Character sheet → HSR Settings → Alternate Ultimate → Alternate Ultimate?** to replace that character's Energy orb with a custom orb. The builder button appears while checked. Uncheck to restore the normal orb; the saved design and counters are retained.

The mode checkbox saves immediately. Alternate mode replaces the standard image and Energy fill in the floating orb, combat HUD, and sheet previews, including while an enhanced stance is active. Unchecking restores that stance's normal Ultimate artwork. Other sheet autosaves preserve the mode switch.

- Open **Ultimate Orb Builder**. Add components, browse existing images, upload multiple images, or drop images/Items onto the canvas. Transparent artwork keeps its shape.
- Select each component, drag to position it, and use the corner/rotation handles, wheel, or numeric fields to scale and rotate it. Layers can be reordered or duplicated.
- Choose an active image and optional off image. Without an off image, the active image appears greyed out. The builder detects the image's main color for its glow; the color, per-component glow, and overall glow can be changed.
- Preview all on, all off, or live counters, then **Save orb design**. Preview switches do not change live progress.
- Choose **Activation mode → Free activation** for individual GM checkboxes. Choose **Circular counter** for a single cumulative charge counter: select the **Starting icon**, assign each component a unique **Sequence order**, and set the **First activation number** (default 1). The sequence wraps after the last order; increasing the counter lights the next icon while keeping earlier ones lit. A first activation number of 3 means values 0–2 light nothing, 3 lights the starting icon, 4 lights the next, and so on.
- In **GM Panel → Character Resources**, or **DM Combat Menu → Alt Ultimates**, use the component checkboxes in free mode or the number/−/+ counter controls in circular mode. Decreasing the circular counter turns later icons off for corrections. Every component must be on before the Ultimate is available. Using it resets all counters. Normal Energy gains (including direct Energy flag awards) are blocked while alternate mode is enabled.

The custom artwork appears in both the floating orb and party HUD. Hotbar activation uses the same counters. Existing ownership checks, enhanced stances, splash art, descriptions, and interrupt/queued turns still apply. Normal Energy is retained separately while alternate mode is used. Casting either alternate mode resets both its independent switches and its circular counter to zero. Existing preview.6 designs default to Free activation.

The combat HUD's ready glow sits above the portrait and behind the Ultimate orb. Its edge is inset beneath the artwork, with a soft halo that pulses in brightness without growing away from the orb. Consuming an Energy, free alternate, or circular alternate Ultimate removes the ready glow.


## Enhanced alternate Ultimates

In **HSR Settings → Enhanced Form → Enhanced Ultimate**, enable **Enhance Ultimate?**, then use the **Enhanced Ultimate type** switch: **OFF = Standard**, **ON = Alternate**. Standard shows an Energy orb preview, the shared Current/Maximum Energy and Energy Regen settings, and enhanced orb artwork. Alternate shows its custom orb preview and design controls. Enhanced splash artwork, description and optional automation apply to either type. Description and automation fields are optional; enabling the enhanced Ultimate and meeting its charge requirements is sufficient to activate it.

With Alternate selected, **Use regular alternate configuration** immediately copies the regular alternate orb's saved images, layout, off artwork, colors, glow, activation mode, sequence and start settings into the enhanced orb. **Design different layout** opens the independent enhanced designer to add or change its own elements. These copies remain editable independently. Copying and switching types preserve both forms' saved designs and live progress. Standard Energy controls edit the character's existing shared Energy pool and remain subject to its current Energy gain rules.

Regular and enhanced forms can each use Energy or their own alternate orb. Their designs, free switches and circular counters are independent. The active form determines the combat HUD, floating orb, hotbar readiness, GM combat controls, Energy-gain blocking and which counters are consumed. Switching forms restores that form's saved progress.

The regular designer has **Copy design to Enhanced**; the enhanced designer has **Use regular orb design**. These copy the layout, images, off images, colors, glow, mode, sequence, starting icon and first activation number into an editable enhanced draft. Press **Save orb design** to apply it and enable the enhanced alternate Ultimate. Copying a design preserves both forms' existing live counters, and later edits do not change the other design.

Existing characters whose enhanced alternate mode has never been configured retain the previous shared regular-orb behavior. Changing the enhanced alternate checkbox or saving an enhanced design makes that form independent. Unchecking it uses Energy while enhanced; the normal form keeps its own saved mode.

## Character settings menus and search

GM character settings are grouped into **Character**, **Ultimates**, **Abilities**, **Enhanced Form**, **Artwork**, and **Combat**. Related controls stay together; token transitions start collapsed, and sections retain their saved collapse state. Changes still autosave, with the explicit Save Configuration action available.

Every menu has the shared search bar. Search **All menus**, or choose **This menu**; selecting a menu while searching narrows results to that menu. Nonmatching settings disappear without changing their values. Clear or Escape restores the menu. Search temporarily reveals matching controls inside collapsed or conditional groups; clear the search to see related enabling switches.

Keywords combine to narrow results: `alt` or `alt ult` finds alternate Ultimates, `art` finds artwork and image controls, `picture crop` finds portrait positioning, and `token skin` finds token artwork. Related terms, field names, partial words and small spelling mistakes (such as `portriat`) are supported. Search is local and does not send character information to an external service.

## Ultimate automation

**HSR Character Settings → Ultimate & Splash Artwork → Ultimate code** runs the character's saved `ultimateScript` once when a charged Ultimate begins. It works from floating orbs, combat HUD buttons, and hotbar macros, with either Energy or alternate counters. It supports asynchronous JavaScript with `actor`, `token`, `combat`, `combatantId`, `config`, `game`, `canvas`, `ui`, `foundry`, `Hooks`, `punchline`, `talent`, `skillPoints`, and `tsru` helpers. The separate Ultimate Text remains descriptive and is posted to chat.

Enhanced Ultimate can use its own optional code. Leaving that field blank uses the ordinary Ultimate code. Queued Ultimates execute when their temporary turn begins, after the current allied turn finishes; the Ultimate Complete button still completes that turn. Player activation results use the accepted action, including alternate Ultimates which retain their Energy.

If a cast is blocked, the notification identifies a disabled Ultimate system, missing component artwork, or the current Energy/counter progress. Partial charge never runs the code or consumes resources.

Preview.9 repairs the full queued sequence on Foundry v14: the turn order is rebuilt before selecting the temporary Ultimate combatant and again before resuming the interrupted turn. A waiting cast also watches for the allied turn to end, so a missed or suppressed combat hook cannot leave it stuck. Temporary Elation, Talent, Aha, and Action Advance turns do not count as the normal allied turn that must finish first.

Splash artwork renders above application windows. Existing descriptions saved in the older script field are recovered as text without rewriting the actor on read; genuine saved JavaScript still runs. Scripts returning a description or their own ChatMessage are supported, and a failed automation still posts the configured description and cleans up its temporary turn. Explicitly disabled Ultimate systems remain disabled.

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
- Skill, Ultimate, and Elation Action descriptions are descriptive text. Ultimate automation has a separate optional GM JavaScript field. Their normal resource, animation, and turn behavior still resolves when the description is empty.

## Talents and Talent Points

- Talent Text is the character’s displayed description. Combat Talent Points have separate current, trigger-maximum and overcap values.
- Held points reset for a new combat; the configured limits are preserved. Eligible actors need the active combat/battlefield context.
- Reaching a positive trigger threshold queues the supported Talent turn flow. GMs can assign points through the live resource controls.
- The current general event dispatcher forwards supported events to Light Cones. A legacy Talent script field is not a promise of arbitrary event-driven kit automation; implement custom mechanics through an explicit supported workflow or deliberate code.

A Foundry Virtual Tabletop v14 module for D&D 5e that recreates Honkai: Star Rail-style Ultimate energy and interrupt turns.

## Features

- A reusable **Star Rail Materials** Item compendium containing Nameless Honor materials plus 95 HSR synthesis outputs, every required reagent, and a green unlock card for every bundled recipe.
- Original HSR artwork for crafted items and reagents, with the original HSR effect retained in a GM-only description and a restrained D&D 5e adaptation shown to players.
- Automatic, non-destructive installation of bundled HSR recipes into Party Crafting. Existing GM-customized recipes are preserved, and every card unlocks its corresponding recipe through the normal party-wide redemption rules.
- The GM recipe menu lists and searches recipes; each opens in its own editor, and New Recipe opens a separate editor.
- The GM Mission Manager shows mission cards by type. New missions begin hidden until activated, and missions completed after reward distribution move into the player's Archived Missions tab.
- Character sheet settings group Energy, Ultimate, splash artwork, and orb controls together with quick section navigation. Phone wallpapers appear inside the app screen behind the buttons.
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

## Menu shortcuts and phone wallpapers

Open **Game Settings → Configure Settings → Tely's Star Rail Ultimates → Menu Keyboard Shortcuts** to record a shortcut for each menu. Each user's shortcuts are personal; only GMs see and can bind GM menus. Existing Foundry and module shortcuts are checked before saving a new combination. The same actions are also available in Foundry's Configure Controls panel.

In the **Phone Hub Designer**, use **Each Character's Wallpaper** to browse and save an image for each PC. Each card saves only that character's wallpaper. Select **Edit Phone** to set its crop, position, zoom, and button layout.

In a character's GM-only **Character Settings → Enhanced Stance**, enable the controls and choose replacement Combat HUD, Skill, Talent, and initiative portraits. Check **Enhance Ultimate** for alternate splash and orb art, an alternate description, and an extra effect posted to chat. The GM panel then shows an ON/OFF button for that character; OFF immediately uses the original artwork and Ultimate text again.

## Star Rail Materials compendium maintenance

The editable Item sources live in `packs/_source/star-rail-materials`; the normalized recipe source is `data/hsr-recipe-catalog.json`. After changing either the catalog or the conversion rules in `tools/build-star-rail-materials.mjs`, run `npm install` once and then `npm run build:materials` to rebuild the Foundry LevelDB pack and `data/star-rail-recipes.json`. HSR item and recipe IDs are stored in module flags so future additions can be deduplicated reliably. Increment `HSR_RECIPE_CATALOG_VERSION` when shipping catalog changes so existing worlds receive only newly bundled recipes without overwriting GM edits.
- Cinematic Ultimate title cards with configurable title/subtitle placement, custom TTF/OTF/WOFF fonts, geometric accents, and live preview
- Title-card squares and underline automatically inherit the assigned Element's charging color
- Editable Energy Regen ability card beside the six standard character abilities; all automatic Energy gains use its D&amp;D-style modifier
- GM-only Aha Instant floating button with configurable artwork, color, and synchronized WebM playback beneath the Foundry interface

## Skill spell casting and live summon HUD (preview.19)

In HSR Settings → Abilities → Skill, enable **Casts spell?**, then flip **Spell source** between **Spell known** (an existing owned spell) and **Other** (drop a spell from a compendium). Other imports/reuses an owned copy for correct caster and effect attribution. The Skill pays its SP/HP price before normal spell use; cancellation, failed summoning or Cannot Fit refunds those payments. Native slot and Item resource consumption are replaced by the configured Skill price for this cast.

Update Memosprites to **1.3.2** as well. Full token footprints must clear lighting barriers at selection and creation. Character, ability and native spell summons temporarily use their exact token HP and colored artwork on the summoner’s companion HUD. At zero HP or token/scene removal, the HP arc hides and saved portrait/default settings return. Companion summoning supports all Paths. Search the illustrated field manual for **Spell known**, **Other**, **compendium**, **Cannot Fit** or **live summon HP** for detailed setup and tooltips.

Preview.20 also preserves the shared SP balance when one character cancels a spell while another character’s Skill payment is still being saved.
