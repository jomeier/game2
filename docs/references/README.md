# Art references

Reference screenshots from shipped 2D platformers, plus four material sheets this
project generated itself. The research fed `DG-P-10` and `DG-P-11`. These files
are research material only. Nothing from other games ships in `src/`, and none of
the generated sheets ships either: the game paints the atlas at runtime.

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

Four sheets the project generated itself with the local ComfyUI (0.45.0) and the
SDXL checkpoint `lustifySDXLNSFW_apexV8`, one 1024 px sheet per ground or façade
material: 32 steps, `dpmpp_2m` with `karras`, cfg 5.5, seeds 20261119 to
20261122, one sheet per seed. The driver script lives outside this repo, the
numbers in the last column came from its edge and tone report.

They are **form** references, not value references. None of the four tiles
seamlessly (an edge difference of 0 would mean seamless, 59 to 134 is a visible
break), and none holds the four shades per material that `DG-P-10` requires (the
sheets use 376 to 2094 colour bins). The soil sheet even came back in daylight
colours although the prompt asked for a night palette. So the sheets show how to
build each material, and no pixel of them reaches the game.

| File | Material | Edge difference x / y | Colour bins | Lesson |
|---|---|---|---|---|
| `material-erdreich.png` | ground strip | 89 / 105 | 2094 | A ground cross-section reads as grass lip, then gravel, then larger stones. Pebble size grows with depth, which is the same order the three bands of `DG-P-10` follow. |
| `material-kopfsteinsohle.png` | rock footing | 103 / 59 | 376 | Cobbles sit in irregular packs, not courses, and each one carries a lit back over a dark seat. Closest sheet to the game's footing, and the tone count is the lowest of the four. |
| `material-plattformstein.png` | platform stone | 62 / 60 | 401 | Courses of unequal blocks with chipped corners and dark mortar. Stays in the game's cold blue-grey, so it works as a value reference for the platform ramp. |
| `material-glasfassade.png` | curtain wall | 134 / 82 | 2208 | Real curtain wall: unlit panes differ more than the lit ones, and lit windows are rare and small. Confirms the mix the glass tiles in `DG-P-11` draw. |

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
