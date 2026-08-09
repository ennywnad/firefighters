# Firefighter Adventures — Painted (v3)

The Rampage-inspired city block with a smooth painted cartoon look (hi-res canvas,
gradients, soft glows). Same gameplay as v2; the original game in the repo root and
the 16-bit v2 are untouched.

**Play:** open `v3/index.html` in a browser. No build step, no dependencies
(the only network fetch is the display font, and the game works without it).

## How it plays

Two control modes (CONTROLS in the options menu):

**STEPS (default, v1-style):** the truck drives in, then tap the truck to connect the
hose, tap the hydrant to turn on the water, and then the nozzle firefighter aims
wherever you point — press and hold to spray. The stream is aim-assisted (the arc
lands right on the pointer), so hitting a window is forgiving.

**TAP (simplest):** tap a burning window and the truck handles everything — drives
over, raises the ladder, sprays. One tap per fire.

Both modes: huge tap targets, no fail states, a star per fire, confetti at the goal.

## The city block

The view is a wide panorama (512x240 world) so more of the city fits on screen.
Four buildings can all catch fire: a tan walk-up (3x3 windows), the tall red
hotel (4x5), a slate rowhouse (2x4), and a second tan hotel (3x4). Clear every
fire in a building and it goes **safe** — a green shield appears and no new fires
start there until the cooldown runs out, so a player can extinguish a whole
building and keep it that way.

## Backup ladder trucks (walkie-talkie)

A walkie-talkie sits at the bottom-right with two buttons — red calls Ladder 2
(rolls in from the right), green calls Ladder 3 (rolls in from the left). Once a
truck arrives, **one tap on it** sends the crew to work: a firefighter hops out
and walks to the hydrant, hooks up the supply hose, the outriggers drop, and the
ladder comes off the rack. Tapping a deployed truck packs the ladder; tapping
again redeploys (the hose stays connected). Works in both control modes.

Who works the ladder is up to you — **BACKUP LADDERS** in the options:

- **YOU (default):** the ladder follows your finger. Point anywhere and it swings
  and extends to reach; **hold** and the cannon firefighter at the tip soaks
  whatever you are pointing at. Rest the ladder tip on a window with trapped
  people and they climb down to the meeting point. Both backup ladders follow
  you at once, so you can steer two streams of water.
- **AUTO:** the original behaviour — the crew picks its own targets, sprays
  fires and performs rescues by itself (rescues first).

## Switching versions (the fire truck badge)

The v1 / v2 / v3 links no longer sit on the screen edge. A fire truck badge sits in
the upper middle, beside the instruction pill, and it is shared with v1 and v2
(see [`shared/`](../shared/)):

- **Click the truck** — it honks, zooms off the left edge, wraps around and drives
  back to the middle. Pure easter egg.
- **Hover it (or tap it on a touch screen)** — `v1 · v2 · v3` drops down underneath,
  each labelled with what it is: CLASSIC, ARCADE, PAINTED.
- **Pick one** — the screen dips to black, and the version you land on opens with
  the arcade titles: the truck charges in from the left, the 3D FIRE RESCUE! logo
  from the right, they bounce off each other, settle with the version name, and the
  game fades up out of the dark. Tap to skip.

TITLE INTRO in OPTIONS → EXTRA controls when the titles play: when switching
versions (default), every single launch, or never.

## Wet surfaces

Every water drop now lands somewhere real: drops deposit a damp, glossy patch on
whichever wall or window they actually hit (the aim-assisted stream lands right
on the pointer, so soaked areas follow the hose), heavy patches dribble down the
brick, and runoff pools into visible blue puddles on the sidewalk and street.
Trucks caught in the spray get a glossy wet sheen with dribbles running off.
Walls dry out faster than puddles.

## The hand ladder (truck 1's crew on foot)

The two backup trucks park in fixed spots, so the far-left end of the block —
the top two floors of the tan walk-up — sits outside the reach of both their
ladders. Trapped people there used to be unrescuable in steps mode.

Now truck 1 carries a portable ladder. **Tap the trapped people** and a
firefighter walks over with it, steps up onto the kerb, swings the ladder
against the wall, climbs up and brings them down to the meeting point, then
carries it back to the truck. It reaches sills up to 80px above the sidewalk —
about two storeys. Tap someone higher than that and the game says so:
*TOO HIGH! CALL THE BIG LADDER!*

With BACKUP LADDERS set to *crew drives*, the hand ladder goes out on its own
whenever trapped people are stranded beyond every truck ladder's reach.

## People rules + rescues

Nobody is ever shown in a burning window. When a window catches fire, its
occupant evacuates to the **meeting point** — a little crowd gathers on the
sidewalk in front of their building (and hops with joy when it goes safe).
Sometimes neighbors get **trapped**: a couple of people appear at a nearby
window waving with a HELP bubble and a glowing ring. Any ladder can rescue
them — rest a backup ladder tip on their window yourself (or let the crew do it
with BACKUP LADDERS = crew drives), tap low windows to send truck 1's crew over
on foot with the hand ladder, and in tap mode you can tap the window to send
truck 1 driving.
Rescues earn a star, and a building can't go
"safe" while someone is still trapped. When backup is needed (a rescue waiting,
or 2+ fires) the walkie-talkie pulses and the HUD calls it out.

## Options menu (⚙️ button)

Everything persists in localStorage (key `firefighterV3Settings`) and applies
live; the game pauses while the menu is open. The options are split across four
tabs so they stay thumb-sized.

Each row in the menu carries a plain-English line saying what it actually changes,
so nothing depends on guessing what a value means.

### PLAY — how the game behaves

| Setting | Options | What it does |
|---|---|---|
| CONTROLS | set up + aim / one tap | tap truck then hydrant and hold to aim the hose, or tap a fire and the crew does the rest |
| BACKUP LADDERS | you drive / crew drives | who works ladder trucks 2 and 3 once they are set up |
| STARS TO WIN | 5 / 8 / 12 | fires out plus rescues before the confetti |
| NEW FIRES | chill / normal / busy | how long until the next window lights: 10s / 6s / 3s |
| FIRES AT ONCE | 1 / 2 / 3 | most windows burning at the same time |
| FIRE SPREAD | never / slow / fast | fire jumps next door after 14s / 7s |
| WATER POWER | gentle / strong | how fast your spray puts a fire out |
| SAFE TIME | short / medium / long | how long a cleared building stays fireproof: 10s / 25s / 60s |
| RESCUES | rare / some / lots | how often neighbours get trapped and need a ladder |
| TRUCK SPEED | slow / normal / fast | how quickly trucks drive in |
| TAP SIZE | normal / big / huge | how much space around a target still counts as tapping it |

### LOOKS — what you see

| Setting | Options | What it does |
|---|---|---|
| PEOPLE IN WINDOWS | on / off | neighbours at their windows and at the meeting point |
| PETS | on / off | a cat on the sill, carried out with the family |
| TIME OF DAY | dusk / night / day | sky, skyline, moon or sun, streetlamps |
| WEATHER | clear / rain / snow | falling weather over the block (looks only) |
| TRUCK DETAIL | plain / fancy | chevrons, gear doors and pinstripes on every truck |
| ENGINE COLOR | red / lime / blue / orange | paint for truck 1 |
| LADDER 2 / LADDER 3 COLOR | red / lime / blue / orange | paint for each backup truck, matching its walkie-talkie button |
| HYDRANT | classic / modern | brass pumper, or chrome and red |
| HOUSE LIGHTS | never / slow / normal | how often windows flick their lights |
| TRUCK BEACONS | when driving / always on | whether roof lights keep flashing while parked |
| WATER DROPS | normal / big | droplet size — looks only, WATER POWER is the one that matters |

### SOUND

| Setting | Options | What it does |
|---|---|---|
| HOSE SOUND | bright / deep / rumbly / off | the hiss while spraying (the speaker button mutes everything) |
| VOICE | off / on | reads the instruction at the top out loud |

### EXTRA

| Setting | Options | What it does |
|---|---|---|
| TITLE INTRO | when switching / every time / off | the truck-and-logo titles |
| DEBUG | off / on | frame rate, unit states and tap areas on screen |
| START OVER | reset | puts every option back to its default |

## Growing with the player

- **Built:** tap mode (one-tap auto), steps mode (setup sequence + manual aim),
  player-driven backup ladders (aim from the ladder top, hold to spray, ladder
  rescues), window rescues, the hand ladder carried on foot
- **Planned:** drive the truck yourself for ladder reach

## Architecture

Plain scripts (works from `file://`), one global namespace `FF`, a 512x240 world
drawn to a letterboxed hi-res canvas (device-pixel-ratio aware, smoothed) for the
painted look.

| File | Owns |
|---|---|
| `js/sprites.js` | palette + string-map pixel sprites (firefighters, occupants) |
| `js/settings.js` | options schema (labels, help text, defaults), persistence, tabbed menu UI |
| `../shared/fire-rescue-bar.*` | truck badge, version picker and arcade titles, shared with v1 and v2 |
| `js/voice.js` | optional spoken instructions (speech synthesis, off by default) |
| `js/scene.js` | sky, skyline, 4-building block, window grids + states, street, hydrants |
| `js/particles.js` | flames, water drops, steam, confetti, star pops, wet surfaces |
| `js/truck.js` | truck state machine: drive → deploy → raise → extend → spray, plus the hand-ladder crew |
| `js/units.js` | walkie-talkie + two backup ladder trucks (player-aimed or automatic) |
| `js/audio.js` | dependency-free WebAudio synth (siren, spray, chimes, fanfare) |
| `js/game.js` | round flow, input, HUD, water-vs-fire collision |
| `js/main.js` | boot, letterboxing, main loop |

Static art (sky, skyline, brick facade) is pre-rendered once to offscreen canvases;
only dynamic things draw per frame.
