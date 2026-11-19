# src/render

The WebGL2 drawing layer. It owns the context, the shader programs, the texture
atlas, the sky, and the city. It reads world state and never changes it. See rule
`DG-P-02`.

| File | Task |
|---|---|
| `renderer.js` | The context, the draw queue, the camera shift, the layer order. |
| `shaders.js` | The three programs: `quad`, `glow`, `atlas`. |
| `textures.js` | The pixel-art atlas, painted at runtime, plus its tile table. |
| `background.js` | The sky gradient, the stars, the moon arc, the three city layers. |

## The draw order

`renderer.js` pushes draw items with a layer number and one `flush()` at the end
of the frame. The sort first groups by program, so the shared unit quad uploads
at most three times.

| Order | Layer | Program |
|---|---|---|
| 0 | sky gradient | `quad` |
| 10 | stars | `quad` |
| 20-21 | moon halo and disc | `glow`, `quad` |
| 30-32 | city far, mid, near | `atlas` |
| 50-51 | platform rock body, then the light cap row | `atlas` |
| 60-63 | enemies, jet, bombs, player | `atlas` |
| 70 | blast flash | `glow` |
| 90 | hearts, in screen space | `atlas` |

The city layers are fully opaque. The moon shows only in the gaps between
silhouettes. See rule `DG-P-11`.

## The atlas

`textures.js` paints the tiles into an offscreen canvas at startup and uploads it
once. No image file ships with the game. `createAtlas(gl)` returns the texture and
the tile table; each entry holds the uv rectangle and the tile count for one cell.

| Tile | Used for |
|---|---|
| `rock`, `cap` | platforms: the dark infill and the light top edge |
| `cityFar`, `cityMid`, `cityNear` | the three silhouette layers |
| `player`, `enemyRight`, `enemyLeft`, `jet`, `bomb` | the entities |
| `heartFull`, `heartSpent` | the HUD hearts |

A fixed seed keeps the painted noise identical across runs, so a screenshot of
today matches the screenshot of tomorrow. See rule `DG-P-10`.

## Debugging a black frame

A shader that fails to compile throws with the compiler message, so a black
canvas with no error means the queue is empty or the uniforms are wrong. Print the
queue:

```bash
python3 -m http.server 8766 -d src    # open the page, then in the console:
# window.__game.state.time          -> advances? then the loop runs
```

`shaders.js` throws when a uniform name is missing from a program, so a typo
fails at startup instead of drawing nothing.
