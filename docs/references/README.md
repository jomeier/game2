# Art references

Reference screenshots from shipped 2D platformers, plus the material sheets this
project generated itself. The research fed `DG-P-10` and `DG-P-11`. These files are
research material only, and nothing from other games ships in `src/` and nothing was
copied from an asset pack. Generated pictures do ship in two shapes: the far row of
the city and the twenty-four houses of the two nearer rows are cut from sheets this
project generated, and the ground surfaces reached the game as tone fields - numbers
in `src/render/kacheln.js`.

The screenshots are the same set as in `game1`, because both games follow the same
art decisions. The four generated material sheets under the second heading exist
only here.

Each row names the lesson the project takes from the image. The images come
from the official Steam store pages of each game.

| File | Game | Source | Lesson |
|---|---|---|---|
| `celeste-01.jpg` | Celeste | [Steam CDN](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/504230/ss_1ad297c2044cdcf450ee83e56350cafb590da755.1920x1080.jpg?t=1714089525) | Dark night scene. Tile interiors use one shared dark infill, so ground never competes with the player or hazards. Warm lit windows give depth without detail. |
| `celeste-02.jpg` | Celeste | [Steam CDN](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/504230/ss_03bfe6bd5ddac7f747c8d2aa1a4f82cfd53c6dcb.1920x1080.jpg?t=1714089525) | The saturated pink player pops against both dark rock and pale sky. Background clouds stay desaturated and softer than the solid ledges. |
| `hollow-knight-01.jpg` | Hollow Knight | [Steam CDN](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/367520/ss_5384f9f8b96a0b9934b2bc35a4058376211636d2.1920x1080.jpg?t=1776125684) | Crisp foreground platforms against a hazy, low-contrast hall. A bright zone sits behind the player, so the dark figure always separates. |
| `hollow-knight-02.jpg` | Hollow Knight | [Steam CDN](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/367520/ss_d5b6edd94e77ba6db31c44d8a3c09d807ab27751.1920x1080.jpg?t=1776125684) | Fog and low contrast push the skull background back. Near-black foreground plants frame the scene and never cover the walkable plane. |
| `dead-cells-01.jpg` | Dead Cells | [Steam CDN](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/588650/ss_ac28000ade40cc2fe5c128f32ac98ba33c008a7a.1920x1080.jpg?t=1779086887) | Saturated, hazy, blurred background. Dark solid platforms form a clean stage, and the bright characters stay the sharpest shapes. |
| `super-meat-boy-01.jpg` | Super Meat Boy | [Steam CDN](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/40800/ss_652092068cc0d5e75fe3f199ad1bbc395806c1f2.1920x1080.jpg?t=1700669950) | Hard-edged, high-saturation terrain in front of a pale, washed-out sky. Opaque layers split plane and depth with value, not blur. |
| `ori-01.jpg` | Ori and the Blind Forest | [Steam CDN](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/261570/ss_c617379b9d195eed0342f3ecf86898513e702b96.1920x1080.jpg?t=1667504148) | Painterly layers with light shafts. The small glowing spirit is the brightest, smallest object, so it reads instantly. |
| `ori-02.jpg` | Ori and the Blind Forest | [Steam CDN](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/261570/ss_38552fb1001c03b5ccce2e3979270b2ecfd944c2.1920x1080.jpg?t=1667504148) | Dark warm hall with depth from lighter distant layers. One bright silhouette carries the whole focal point. |
| `sonic-mania-01.jpg` | Sonic Mania | [Steam CDN](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/584400/ss_27efb8f61892a9bd732952c76dae9dd7ad1b6748.1920x1080.jpg?t=1785856230) | Retro palette tiles and saturated sprites. Horizontal parallax bands (sea, sand, palms, water) stack opaque layers for depth. |

## Generated material sheets

The surfaces of the atlas come from sheets this project generated itself with the
local ComfyUI (0.45.0) and the SDXL checkpoint `lustifySDXLNSFW_apexV8`: ten
architecture sheets at 640 x 1280 (one per front design) and eight surface sheets
at 1024 px, 32 steps, `dpmpp_2m` with `karras`, cfg 5.5, seed 20261130 plus the
index of the sheet. The bake that turns a sheet into a tile lives outside this
repo, together with the prompt list and the downloaded sheets, so the sheets are
not copied in here: eighteen PNGs would weigh about 25 MB. `README.md` in that
folder names the prompts, and re-running the tool with the same seed reproduces
every sheet.

What the bake does, and what it cost: an isotropic crop at the exact tile box (no
squashing), mirrored borders so a tile closes on itself, and four tones at
20 / 40 / 25 / 15 percent because equal quarters read as noise. A front keeps a
light mask of the warm windows in the sheet, and the game decides per layer how
many of them burn.

Ten of those sheets became the far row's fronts, and they are **not** numbers: the
architecture sheets are 640 x 1280, and shrinking one into a 16 x 32 tile costs a
factor of 40 per axis and every recognisable window. They ship instead as ten PNG
files in `src/render/texturen/`, at the tile box of 32 x 64 (a factor of 20, and no
stretch on a building). The tool that cuts them mirrors the borders and sets the
row's value step and lit-window share in the file itself, so the depth order and the
window density are measurable on disk.

Seven fields ship as numbers in `src/render/kacheln.js`. I measured two surfaces
and put them back to drawn: the masonry sheet at the 32 x 16 box of a platform
body became fine scratching instead of courses, and the moon sheet sat off-centre
so a straight edge fell inside the disc. None of the sheets tiles seamlessly on its
own (the edge difference ran from 3 to 241 where 0 would mean seamless), which is
exactly why the bake mirrors its borders instead of trusting the prompt.

| Sheet | Surface | Edge difference x / y | Colour bins | Lesson |
|---|---|---|---|---|
| `material-erdreich.png` | ground strip | 89 / 105 | 2094 | A ground cross-section reads as grass lip, then gravel, then larger stones. Pebble size grows with depth, which is the order the three bands follow. |
| `material-kopfsteinsohle.png` | rock footing | 103 / 59 | 376 | Cobbles sit in irregular packs, not courses, each with a lit back over a dark seat. |
| `material-plattformstein.png` | platform body | 62 / 60 | 401 | Unequal courses with chipped corners stayed in the game's cold blue-grey - but at 32 x 16 it lost the structure, so the body is drawn. |

The ten architecture sheets (`front-grid` … `front-slit`, 640 x 1280 each) are not
copied into this repo; they weigh about 15 MB between them. They live in the tool
folder next to their prompts and regenerate with one command.

## Generated house sprites

The mid row and the near row are one picture per building, so the picture has to own
a silhouette. `tools/comfy/hochhaus.mjs` sends one SDXL sheet per design and size
class (the mid row 128 x 192 and 128 x 256, the short near row 128 x 112 and
128 x 160, each sheet at four times its box), then
`LoadBackgroundRemovalModel` + `RemoveBackground` (BiRefNet, `birefnet.safetensors`,
444 MB in `models/background_removal/`) + `InvertMask` + `SaveImageWithAlpha` return
an RGBA sheet. Three findings came out of that step and each one is now a step in
the tool:

- A chroma key does not work. "flat solid magenta background #ff00ff" produced a
  dark grey wall, and a flood fill from the borders found no background at all.
- `RemoveBackground` reports the object as white, while the alpha saver expects
  white to mean transparent. Without `InvertMask` between them every house arrived
  as a hole in an opaque plate.
- BiRefNet segments *the salient thing*, and a glowing moon behind a tower is more
  salient than the tower. So the prompt bans moons and sky detail, and the tool
  sends three candidates per sprite and keeps the one that scores best: a real
  building is wide at its feet, stands on the bottom edge, and fills the frame of
  its own silhouette. A moon remnant or a needle scores near nothing.

A contact sheet (`tools/comfy/kontaktbogen.mjs`) puts all twenty-four sprites over
the game's sky, because a soft mask edge that draws a dark seam around a house stays
invisible in a statistics line. The tool therefore drops a cell that covers less than
a third of its source: alpha in these files is hard.

The sheets again stay in the tool folder (about 8 MB). The tool multiplies the row's
value step (`FRONT_LAYER_TON`) in while it cuts, so `tests/run-tests.mjs` can divide
it out and measure the window density of each row on disk.

## Reading list

Design breakdowns behind the guidelines:

- Celeste art direction: <https://ferdwolf.github.io/teemo.dev/games/celeste.html>
- Celeste tilesets: <https://aran.ink/2020-07-27/a-tale-of-two-platformers-part-2/>
- Hollow Knight art direction: <https://ferdwolf.github.io/teemo.dev/games/hollow-knight.html>
- Hollow Knight visual clarity: <https://www.youtube.com/watch?v=8vW0bLX_s2Q>
- Dead Cells art deep dive: <https://www.gamedeveloper.com/design/a-visual-analysis-of-the-art-of-i-dead-cells-i->
- Super Meat Boy analysis: <https://www.mandible.net/writing/super-meat-boy>
- Super Meat Boy design study: <https://www.styledex.com/design/super-meat-boy/>
- Ori art pipeline: <https://airborn-studios.com/news/ori-pc-launch>
- Ori GDC talk: <https://www.gdcvault.com/play/1022203/Creating-the-Art-of>
- Sonic Mania post-mortem: <https://www.gamedeveloper.com/design/the-sound-of-a-platformer-a-sonic-mania-post-mortem>

Parallax-city rules behind the sprite rows (read 2026-11-19, all five agree on the
depth order and on a varied top edge):

- Planes get simpler and quieter with distance, and the foreground frames without
  covering the play area: <https://piximelon.com/guides/pixel-art-backgrounds/>
- Three planes, silhouettes before texture, the darkest pixels last, near-plane
  accents only: <https://pixeli.pebbly.space/knowledge/rules/61-landscapes-and-terrain>
- Layer authoring: transparent above the silhouette, solid at the bottom, seam edge
  equals edge, and a top edge with rhythm instead of a regular zigzag:
  <https://pixeli.pebbly.space/knowledge/rules/62-parallax-backgrounds>
- Further layers sit closer to the sky in value, lose saturation and interior
  detail; build each layer by mixing toward the sky colour:
  <https://comfyengine.org/blog/pixel-art-backgrounds-parallax/>
- Landmark shapes every one to two screens (spire, helipad, slanted crown, stepped
  deco, crane): <https://mmorwynn.itch.io/metropolis> and
  <https://kelano-studio.itch.io/skyline-buildings-30-2d-skyscrapers-64x64>
