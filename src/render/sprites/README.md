# src/render/sprites

Twenty-four house sprites: the six mid-row and six near-row designs of
`SPRITE_MITTE` and `SPRITE_VORNE` in [../../config.js](../../config.js), each in the
two size classes of `SPRITE_KLASSEN`. Every class is 128 px wide - a narrow
generation frame paints an obelisk, and an obelisk has no wall to hang windows on.
The near row has no short class: a 112 px house in front of a 256 px mid tower read
as a dwarf, and a foreground plane that scrambles for attention stops anchoring the
picture.

| Name | Size | Row |
|---|---|---|
| `deco-256.png`, `tank-256.png`, `slab-256.png`, `spire-256.png`, `wedge-256.png`, `twin-256.png` | 128 x 256 | mid |
| the same six with `-192` | 128 x 192 | mid |
| `ziggurat-208.png`, `gable-208.png`, `trusses-208.png`, `sawtooth-208.png`, `twinsets-208.png`, `antenna-208.png` | 128 x 208 | near |
| the same six with `-160` | 128 x 160 | near |

One file is one building. The picture carries the whole silhouette - crown, spire,
masts, outline, lit roof edge - and **alpha everywhere the sky shows through**, so
these rows are not a row of rectangles. A sprite owns its box: the building is
exactly as wide and tall as the file, nothing is tiled and nothing is stretched, and
the renderer paints no edge bands over it.

The row's place on the night ladder (`DG-P-11`) is baked into the pixels: the tool
measures each sheet's own mean and scales it onto the rung named by `FRONT_TIEFE` in
[../../config.js](../../config.js), so distance is darkness in this night scene and a
design whose sheet came out bright does not float in front of its row. It then dims
all but the brightest window runs until the row holds its share of lit windows.
`tests/run-tests.mjs` reads the ladder and the window share straight off these
files. Every sprite also has to leave its top row mostly empty: a flat roof belongs to
the tiled far row.

They are generated, not drawn by hand: one sheet per sprite from the local ComfyUI,
cut to size by `node tools/comfy/hochhaus.mjs` in the machine's tool folder. The
sheets, the prompts and the provenance are described in
[../../../docs/references/README.md](../../../docs/references/README.md). No file
here is fetched at runtime and there is no build step; the game reads them as
ordinary files over the same static server it comes from.
