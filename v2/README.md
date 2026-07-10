# Firefighter Adventures — Arcade (v2)

A ground-up visual remake inspired by Rampage (1986): one big city building, a grid of
windows, fires breaking out, and your crew saving the day. The original game in the repo
root is untouched.

**Play:** open `v2/index.html` in a browser. No build step, no dependencies
(the only network fetch is the pixel font, and the game works without it).

## How it plays

Two control modes (CONTROLS in the options menu):

**STEPS (default, v1-style):** the truck drives in, then tap the truck to connect the
hose, tap the hydrant to turn on the water, and then the nozzle firefighter aims
wherever you point — press and hold to spray. The stream is aim-assisted (the arc
lands right on the pointer), so hitting a window is forgiving.

**TAP (simplest):** tap a burning window and the truck handles everything — drives
over, raises the ladder, sprays. One tap per fire.

Both modes: a star per fire, confetti when you hit the goal, no fail states.

- Huge tap targets (window + 8px pad at 384x216 internal resolution)
- No fail state, no timer, fires don't hurt anyone
- Taps queue up, so mashing extra fires is fine

## The city block

Three buildings can all catch fire: a tan walk-up (3x3 windows), the tall red
hotel (4x5), and a slate rowhouse (2x4). Clear every fire in a building and it
goes **safe** — a green shield appears and no new fires start there until the
cooldown runs out, so a player can extinguish a whole building and keep it that way.

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

`FF.game.CONFIG.tier` is the hook for progressive controls:

- **Tier 1 (built):** tap the fire → full automatic sequence
- **Tier 2 (planned):** tap the truck first, then the fire (sequencing)
- **Tier 3 (planned):** hold and aim the spray onto the window yourself
- **Tier 4 (planned):** drive the truck for ladder reach, fires spread, window rescues

## Architecture

Plain scripts (works from `file://`), one global namespace `FF`, low-res canvas
(384x216) scaled up with pixel-perfect nearest-neighbor for the 16-bit look.

| File | Owns |
|---|---|
| `js/sprites.js` | palette + string-map pixel sprites (firefighters, occupants) |
| `js/settings.js` | options schema, localStorage persistence, menu UI |
| `js/scene.js` | sky, skyline, 3-building block, window grids + states, street |
| `js/particles.js` | flames, water drops, steam, confetti, star pops |
| `js/truck.js` | truck state machine: drive → deploy → raise → extend → spray |
| `js/audio.js` | dependency-free WebAudio synth (siren, spray, chimes, fanfare) |
| `js/game.js` | round flow, input, HUD, water-vs-fire collision |
| `js/main.js` | boot, letterboxing, main loop |

Static art (sky, skyline, brick facade) is pre-rendered once to offscreen canvases;
only dynamic things draw per frame.
