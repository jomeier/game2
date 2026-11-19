# src/render/texturen

Thirty façade textures: the ten front designs of `FRONT_DESIGNS` in
[../../config.js](../../config.js), one variant per city layer.

| Name | Size | Content |
|---|---|---|
| `<design>-far.png` | 32 x 64 | hazier and lightest, almost every window lit |
| `<design>-mid.png` | 32 x 64 | the layer's own value step, fewer windows lit |
| `<design>-near.png` | 32 x 64 | near black silhouette, few windows left |

`<design>` is one of `grid`, `ribbed`, `arched`, `banded`, `bay`, `escape`,
`corniced`, `pierred`, `chequer`, `slit`.

The size is the tile box from `TILE` for the city fronts, so a building - whose
width is a whole number of 32 and whose height a whole number of 64 - shows a
texture without any stretching. `textures.js` loads these files before the first
frame and draws each one into the atlas cell of its layer; the only thing the atlas
adds is the hue turn of the design's tint.

Both the depth order (`DG-P-11`: far the brightest, near the darkest) and the lit
window share per layer live **in these files**, not in a draw-time effect, so
`tests/run-tests.mjs` can measure them on disk. The depth step is the value scale
`FRONT_LAYER_TON` in [../../config.js](../../config.js) - far 1.06, mid 0.82, near
0.46 - which the generating tool multiplies in and the test divides out again before
it counts lit windows on one absolute brightness threshold. A pull toward a flat
haze tone stays small (3 to 5 percent): a stronger one lifted the layer mean and
drowned the lit windows of the far layer.

They are not art assets from outside: each one is an isotropic crop of a sheet the
project generated with the local ComfyUI, mirrored at its borders so the tile
closes when it repeats. The sheets, the prompts and the tool live outside this repo
and are described in [../../../docs/references/README.md](../../../docs/references/README.md).
Regenerate with `node tools/comfy/fronttexturen.mjs` from the machine's tool folder.

No texture here is loaded at runtime from a network, and there is no build step: the
game reads them as ordinary files over the same static server it comes from.
