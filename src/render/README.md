# src/render

The WebGL2 drawing layer. It owns the context, the shader programs, the texture
atlas, the sky, and the city. It reads world state and never changes it. See rule
`DG-P-02`.

| File | Task |
|---|---|
| `renderer.js` | The context, the draw queue, the camera shift, the layer order, the sprite frame choice. `createRenderer` is async: the atlas waits for the façade textures. |
| `shaders.js` | The three programs: `quad`, `glow`, `atlas`. |
| `textures.js` | The atlas: a cell allocator, material tiles, roof props, the moon, sprite frame strips, a 3x5 pixel font. |
| `kacheln.js` | Seven baked tone fields for the ground and the cap edges, two bits per pixel: form only, the shade comes from the ramp. |
| `texturen/` | Thirty façade PNGs (ten designs, three layers) at their tile box. `textures.js` loads them before the first frame. |
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
| 30-32 | city far, mid, near: wall, roof prop, light rim, cornice, dark seam | `atlas`, `quad` |
| 40 | ground: grass band, soil, rock footing, blades above the line | `atlas` |
| 50 | platforms: stone body, then the light cap row | `atlas` |
| 60 | contact shadow under the hero and every enemy | `atlas` |
| 61-64 | jet, bombs, enemies, hero | `atlas`, `glow` |
| 70 | blast: two glows and seven debris squares | `glow`, `quad` |
| 79-80 | control hint with its dark backing, first `HINT_SECONDS` only | `quad`, `atlas` |
| 90 | hearts, in screen space | `atlas` |

The city layers are fully opaque, so buildings cover the moon where they overlap.
See rule `DG-P-11`.

## The atlas

`textures.js` paints the atlas into an offscreen canvas at startup, drops the thirty
façade PNGs of `texturen/` onto their cells, and uploads the whole 1024 x 512 sheet
once with `NEAREST` filtering. Painting and loading are asynchronous, so
`createAtlas(gl)`, `createRenderer(canvas)` and the first line of `main.js` await
them: `createAtlas` returns `{ texture, tiles, hero, enemy }`. Each entry in `tiles`
is `{ uv, w, h }`, and the uv is inset by half a texel so a neighbour cannot bleed
in.

No file names an atlas position. `createLayout` hands out the next free cell to
every tile, and `paintAtlas` throws with both names when two cells still share a
pixel. Hand-placed cells caused the first real art bug of this project: the jet
cell sat on top of the head rows of three run frames, so the hero showed stray
pixels at the helmet every other stride.

| Tile | Used for | Where its form comes from |
|---|---|---|
| `grass`, `tufts`, `dirt`, `rock` | the ground: grass band, blades above the standable line, soil, rock footing | a sheet in `docs/references/`, baked |
| `stone` | a platform body with block joints and chips | drawn here |
| `stoneCap`, `grassCap` | the light top edge of a platform, a grass edge | a sheet in `docs/references/`, baked |
| `farGrid` … `nearSlit` | the ten front designs in three layers: slab grid, art-deco ribs, arched gothic, moderne bands, bay windows, brick tenement with fire escapes, corniced storeys, broad piers, lit chequer, brutalist slits | one sheet per design, baked, recoloured per layer |
| `glassMidA/B/C` | the curtain-wall fronts of the mid layer: three pane grids, three sheen phases | drawn here (a reflection model, not a surface) |
| `propAntenna`, `propTank`, `propVent` | roof silhouettes | drawn here |
| `moon` | the moon disc: sphere shading, maria, craters, alpha outside the disc | drawn here |
| `shadow`, `spark` | the contact shadow under an entity, the bright star cross | drawn here |
| `heartFull`, `heartSpent` | the HUD hearts | drawn here |
| `jet`, `bomb`, `hintMove` | the jet, a falling bomb, the control hint text | drawn here |

Sprite frame lists come back as names: `hero.idle` (2), `hero.run` (6),
`hero.jump`, `hero.fall`, `hero.hurt`, and `enemy.right` / `enemy.left` (4 each).
The renderer picks a frame from `world.time` for the hero and from the walked
distance for an enemy, so no module keeps animation state.

## Rules that keep the picture clean

- One ramp of four shades per material. The ramps are built from `COLOR` in
  [../config.js](../config.js).
- The ground is three bands whose heights add up to the strip depth: `GRASS_BAND`,
  `SOIL_BAND` and `ROCK_BAND`. Its tiles are wide on purpose (grass 80 px, soil and
  rock 160 px, all three divisors of `LEVEL_WIDTH`): a 16 px tile repeats two
  hundred times across the world and the eye finds the grid, which is what made the
  soil read as woven cloth. The atlas itself is 1024 x 512 since the fronts moved to
  32 x 64.
- A band must not step to a new shade at one fixed height, and its patches must not
  be plain rectangles: both read as stacked planks, so the soil is painted as blobs
  with a jittered span per row.
- A curtain wall is a reflection, not a light grid. Each pane picks its shade from
  the sky above, the street below, one sheen band and the reflected horizon; the
  per-pane noise stays under a third of a shade step. Wider noise turns the front
  into confetti, and lit panes then read as polka dots. Glass exists in the mid
  layer only: the near layer carries silhouette, not detail.
- A city layer owns ten front designs (`FRONT_DESIGNS` in [../config.js](../config.js)):
  a slab grid, art-deco ribs, arched gothic, moderne bands, bay windows, a brick
  tenement with fire escapes, corniced storeys, broad piers, a lit chequer, and
  brutalist slits. Each design keeps one colour personality (base, warm, or cool)
  while the layer owns the value steps, so ten different towers still read as one
  distance. `CITY_FRONTS` names the tile of a design inside a layer, and the layer's
  value step (`FRONT_LAYER_TON`) and lit-window share are baked into the PNG of that
  tile rather than applied while drawing.
- Each paint job carries a clip box and may only write inside its own atlas cell.
  Before the allocator existed, the stone mortar bled into the dirt cell and made
  the ground read blue.
- Every tile box lives in `TILE` in [../config.js](../config.js), and every surface
  takes a whole number of its tile: the ground bands equal their tile heights,
  `LEVEL_WIDTH` divides by each ground tile width, a building is a whole number of
  32 px columns and 64 px rows, a platform body is one 16 px row. A tile that does
  not fit is scaled, and scaling kills the pixel grid, so `paintAtlas` throws on a
  painter that asks for another box and the `tile-fit` case checks the surfaces.
- Seven surfaces paint from a baked tone field in `kacheln.js`: two bits per
  pixel, form only, four shades of the material's ramp. The fields came from
  sheets in `docs/references/`, cropped at the exact box, mirrored at the edges so
  the tile closes, and split at 20 / 40 / 25 / 15 percent - equal quarters turned
  every material into noise. A window in a façade texture burns as a whole run:
  thinning each pixel on its own shredded the windows into tinsel. Four surfaces
  stayed drawn after measurement: a platform body (`stone`) became
  fine scratching at its 32 x 16 box, the moon sheet sat off-centre and left a
  straight edge inside the disc, and the glass fronts are a reflection model
  rather than a surface. Sprites, the five pixel font and the props are drawn
  anyway - a sheet cannot hold a six frame run cycle or a readable glyph.
- Building heights land on `CITY_GRID.h` (64 px) and widths on `CITY_GRID.w`
  (32 px), the façade texture's own grid, so a façade texture never stretches. The
façade tiles carry no full width floor lines: those made the three layers read as
one wallpaper pattern.
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
