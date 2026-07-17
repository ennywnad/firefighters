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

The view is a wide panorama (512x216 world) so more of the city fits on screen.
Four buildings can all catch fire: a tan walk-up (3x3 windows), the tall red
hotel (4x5), a slate rowhouse (2x4), and a second tan hotel (3x4). Clear every
fire in a building and it goes **safe** — a green shield appears and no new fires
start there until the cooldown runs out, so a player can extinguish a whole
building and keep it that way.

## Backup ladder trucks (walkie-talkie)

A walkie-talkie sits at the bottom-right with two buttons — red calls Ladder 2
(rolls in from the right), green calls Ladder 3 (rolls in from the left). Once a
truck arrives, **one tap on it** makes the crew do the needful: a firefighter hops
out and walks to the hydrant, hooks up the supply hose, the outriggers drop, the
ladder raises and extends, and the cannon firefighter at the tip automatically
soaks any fire within reach — retargeting on his own as new fires break out.
Tapping a deployed truck packs the ladder; tapping again redeploys (the hose
stays connected). Works in both control modes.

## Wet surfaces

Every water drop now lands somewhere real: drops deposit a damp, glossy patch on
whichever wall or window they actually hit (the aim-assisted stream lands right
on the pointer, so soaked areas follow the hose), heavy patches dribble down the
brick, and runoff pools into visible blue puddles on the sidewalk and street.
Trucks caught in the spray get a glossy wet sheen with dribbles running off.
Walls dry out faster than puddles.

## People rules + rescues

Nobody is ever shown in a burning window. When a window catches fire, its
occupant evacuates to the **meeting point** — a little crowd gathers on the
sidewalk in front of their building (and hops with joy when it goes safe).
Sometimes neighbors get **trapped**: a couple of people appear at a nearby
window waving with a HELP bubble and a glowing ring. Any ladder can rescue
them — backup trucks prioritize rescues automatically, and in tap mode you can
tap the window to send truck 1. Rescues earn a star, and a building can't go
"safe" while someone is still trapped. When backup is needed (a rescue waiting,
or 2+ fires) the walkie-talkie pulses and the HUD calls it out.

## Options menu (⚙️ button)

Everything persists in localStorage and applies live; the game pauses while the
menu is open.

| Setting | Options | What it does |
|---|---|---|
| CONTROLS | steps / tap | v1-style step sequence + aim, or one-tap auto |
| PEOPLE | on / off | occupants in windows |
| NEW FIRES | chill / normal / busy | how often fires appear (10s / 6s / 3s) |
| FIRES AT ONCE | 1 / 2 / 3 | max simultaneous fires |
| FIRE SPREAD | off / slow / fast | fires jump to adjacent windows (14s / 7s) |
| WATER POWER | gentle / strong | how long spraying takes |
| SAFE TIME | short / medium / long | building cooldown (10s / 25s / 60s) |
| STARS TO WIN | 5 / 8 / 12 | round length |

## Growing with the player

- **Built:** tap mode (one-tap auto) and steps mode (setup sequence + manual aim)
- **Planned:** aim from the ladder top after positioning it, drive the truck for
  ladder reach, window rescues

## Architecture

Plain scripts (works from `file://`), one global namespace `FF`, low-res canvas
(384x216) scaled up with pixel-perfect nearest-neighbor for the 16-bit look.

| File | Owns |
|---|---|
| `js/sprites.js` | palette + string-map pixel sprites (firefighters, occupants) |
| `js/settings.js` | options schema, localStorage persistence, menu UI |
| `js/scene.js` | sky, skyline, 4-building block, window grids + states, street, hydrants |
| `js/particles.js` | flames, water drops, steam, confetti, star pops, wet surfaces |
| `js/truck.js` | truck state machine: drive → deploy → raise → extend → spray |
| `js/units.js` | walkie-talkie + two backup ladder trucks with self-deploying crews |
| `js/audio.js` | dependency-free WebAudio synth (siren, spray, chimes, fanfare) |
| `js/game.js` | round flow, input, HUD, water-vs-fire collision |
| `js/main.js` | boot, letterboxing, main loop |

Static art (sky, skyline, brick facade) is pre-rendered once to offscreen canvases;
only dynamic things draw per frame.
