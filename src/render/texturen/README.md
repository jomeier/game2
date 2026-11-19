# src/render/texturen

Ten façade textures: the ten front designs of `FRONT_DESIGNS` in
[../../config.js](../../config.js), as the far row wears them. The mid row and the
near row are [../sprites/](../sprites/) instead, one picture per building.

| Name | Size | Content |
|---|---|---|
| `<design>-far.png` | 32 x 64 | haziest and lightest row, almost every window lit |

`<design>` is one of `grid`, `ribbed`, `arched`, `banded`, `bay`, `escape`,
`corniced`, `pierred`, `chequer`, `slit`.

The size is the tile box from `TILE` for the city fronts, so a building - whose
width is a whole number of 32 and whose height a whole number of 64 - shows a
texture without any stretching. `textures.js` loads these files before the first
frame and draws each one into its cell; the only thing the atlas adds is the hue
turn of the design's tint.

Both the depth order (`DG-P-11`: far the brightest, near the darkest) and the lit
window share live **in these files**, not in a draw-time effect, so
`tests/run-tests.mjs` can measure them on disk together with the sprites of the two
nearer rows. The depth step is the value scale `FRONT_LAYER_TON` in
[../../config.js](../../config.js) - far 1.06, mid 0.82, near 0.46 - which the
generating tool multiplies in and the test divides out again before it counts lit
windows on one absolute brightness threshold. A pull toward a flat haze tone stays
small (3 to 5 percent): a stronger one lifted the layer mean and drowned the lit
windows of the far layer.

They are not art assets from outside: each one is an isotropic crop of a sheet the
project generated with the local ComfyUI, mirrored at its borders so the tile
closes when it repeats. The sheets, the prompts and the tool live outside this repo
and are described in [../../../docs/references/README.md](../../../docs/references/README.md).
Regenerate with `node tools/comfy/fronttexturen.mjs` from the machine's tool folder
(`--schichten far`; the two nearer rows come from `hochhaus.mjs`).

No texture here is loaded at runtime from a network, and there is no build step: the
game reads them as ordinary files over the same static server it comes from.
