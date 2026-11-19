# src/render

The WebGL2 drawing layer. It owns the context, the shader programs, the texture
atlas, the sky, and the city. It reads world state and never changes it. See rule
`DG-P-02`.

| File | Task |
|---|---|
| `renderer.js` | The context, the draw queue, the camera shift, the layer order, the sprite frame choice. |
| `shaders.js` | The three programs: `quad`, `glow`, `atlas`. |
| `textures.js` | The atlas: material tiles, roof props, the moon, sprite frame strips, a 3x5 pixel font. |
| `background.js` | Stars, the horizon haze, the moon arc, the three city layers and their roof props. |

## Commands

These files are ES modules loaded by `src/index.html`; they have no entry point
of their own. Run the game or the test instead:

```bash
python3 -m http.server 8766 -d src      # the game
node tests/run-tests.mjs                # the headless test
```

## The draw order

A `rect`, `solid`, or `glow` call only pushes a layer number. One `flush()` at the
end of the frame sorts by layer, then by program, so the shared unit quad uploads
at most three times.

| Layer | What draws | Program |
|---|---|---|
| 0 | sky gradient | `quad` |
| 5 | horizon haze bands | `quad` |
| 10 | stars, and a spark on the bright ones | `quad`, `atlas` |
| 20-21 | moon halo, then the moon disc | `glow`, `atlas` |
| 30-32 | city far, mid, near, each with its roof props | `atlas` |
| 40 | ground: grass strip over a dirt body | `atlas` |
| 50 | platforms: stone body, then the light cap row | `atlas` |
| 60 | contact shadow under the hero and every enemy | `atlas` |
| 61-64 | jet, bombs, enemies, hero | `atlas`, `glow` |
| 70 | blast: two glows and seven debris squares | `glow`, `quad` |
| 80 | control hint, first 7 seconds only | `atlas` |
| 90 | hearts, in screen space | `atlas` |

The city layers are fully opaque, so buildings cover the moon where they overlap.
See rule `DG-P-11`.

## The atlas

`textures.js` paints the atlas into an offscreen canvas at startup and uploads it
once with `NEAREST` filtering. `createAtlas(gl)` returns `{ texture, tiles, hero,
enemy }`. Each entry in `tiles` is `{ uv, w, h }`, and the uv is inset by half a
texel so a neighbour cannot bleed in.

| Tile | Used for |
|---|---|
| `grass`, `dirt` | the ground strip and its body |
| `stone`, `stoneCap`, `grassCap` | a platform body, its light top edge, a grass edge |
| `farWall`, `midWall`, `nearWall` | the three city layers |
| `propAntenna`, `propTank`, `propVent` | roof silhouettes |
| `moon` | the moon disc: sphere shading, maria, craters, alpha outside the disc |
| `shadow`, `spark` | the contact shadow under an entity, the bright star cross |
| `heartFull`, `heartSpent` | the HUD hearts |
| `jet`, `bomb`, `hintMove` | the jet, a falling bomb, the control hint text |

Sprite frame lists come back as names: `hero.idle` (2), `hero.run` (6),
`hero.jump`, `hero.fall`, `hero.hurt`, and `enemy.right` / `enemy.left` (4 each).
The renderer picks a frame from `world.time` for the hero and from the walked
distance for an enemy, so no module keeps animation state.

## Rules that keep the picture clean

- One ramp of four shades per material. The ramps are built from `COLOR` in
  [../config.js](../config.js).
- Each paint job carries a clip box and may only write inside its own atlas cell.
  An unclipped brush bled stone colors into the dirt tile and made the ground look
  blue.
- Building heights land on an 8 px step, so a façade tile never stretches.
- A mirrored sprite swaps the uv x pair; see `mirrored()` in `renderer.js`.

## Debugging a black or wrong frame

A shader that fails to compile throws with the compiler message, and
`shaders.js` throws when a uniform name is missing, so a silent black frame means
an empty queue. Check in this order: does `window.__game.state.time` advance, does
the tile name exist in `tiles`, and is the draw inside the camera window.

`rect()` reads a tile by name, so a typo throws on `tile.uv` of undefined in the
console, at the first frame of the affected layer. When a whole material looks
wrong, look at its cell in `textures.js` first: the clip and the uv inset are the
two places a cell can pick up its neighbour's pixels.
