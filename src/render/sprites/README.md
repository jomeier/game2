# src/render/sprites

Twenty-four house sprites: the six mid-row and six near-row designs of
`SPRITE_MITTE` and `SPRITE_VORNE` in [../../config.js](../../config.js), each in the
two size classes of `SPRITE_KLASSEN`. Every class is 128 px wide - a narrow
generation frame paints an obelisk, and an obelisk has no wall to hang windows on.
The near row stays short: a foreground plane is a narrow dark strip along the bottom
of the picture, and the towers behind it have to stay visible.

| Name | Size | Row |
|---|---|---|
| `deco-256.png`, `tank-256.png`, `slab-256.png`, `spire-256.png`, `wedge-256.png`, `twin-256.png` | 128 x 256 | mid |
| the same six with `-192` | 128 x 192 | mid |
| `ziggurat-160.png`, `gable-160.png`, `trusses-160.png`, `sawtooth-160.png`, `twinsets-160.png`, `antenna-160.png` | 128 x 160 | near |
| the same six with `-112` | 128 x 112 | near |

One file is one building. The picture carries the whole silhouette - crown, spire,
masts, outline, lit roof edge - and **alpha everywhere the sky shows through**, so
these rows are not a row of rectangles. A sprite owns its box: the building is
exactly as wide and tall as the file, nothing is tiled and nothing is stretched, and
the renderer paints no edge bands over it.

The row's value step (`DG-P-11`) is baked into the pixels: the tool multiplies by
`FRONT_LAYER_TON` (mid 0.82, near 0.46) while it cuts the file and dims a lit window
per cell until the row holds its share of them, and `tests/run-tests.mjs` divides the
scale out again before it counts lit windows, so the depth order and the window
density are measurable on disk. Every sprite also has to leave its top row mostly
empty: a flat roof belongs to the tiled far row.

They are generated, not drawn by hand: one sheet per sprite from the local ComfyUI,
cut to size by `node tools/comfy/hochhaus.mjs` in the machine's tool folder. The
sheets, the prompts and the provenance are described in
[../../../docs/references/README.md](../../../docs/references/README.md). No file
here is fetched at runtime and there is no build step; the game reads them as
ordinary files over the same static server it comes from.
