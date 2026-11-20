// Sky, stars, moon, and the three city layers of game2 (DG-P-04, DG-P-05, DG-P-11).
// buildCity() returns the silhouette shapes for one fixed seed, so every run and
// every screenshot shows the same skyline. Each shape names its own wall tile, its
// roof prop, and its own light edge, so the layers read as buildings and not as one
// repeated pattern. The renderer draws the shapes; nothing here touches WebGL.
// The layers hold no alpha: DG-P-11 wants opaque silhouettes, so depth comes from
// the value steps of the three layers and the warm haze above the skyline.

import * as C from '../config.js';
import { MOON_CX, MOON_CY, MOON_RX, MOON_RY, MOON_PERIOD_S } from '../config.js';

/** Return a small seeded generator. Same seed means the same city. */
function seeded(seed) {
  let state = (seed || 1) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Return the moon center and phase u for a level time. The formula is DG-P-05. */
export function moonPos(moonTime) {
  const u = (moonTime % MOON_PERIOD_S) / MOON_PERIOD_S;
  return {
    u,
    x: MOON_CX - MOON_RX * Math.cos(Math.PI * u),
    y: MOON_CY - MOON_RY * Math.sin(Math.PI * u),
  };
}

/** Return a fixed list of stars: mostly one pixel, a few bright ones with a spark. */
export function starField(seed) {
  const random = seeded(seed + 7);
  const stars = [];
  for (let index = 0; index < 110; index += 1) {
    const big = random() > 0.9;
    stars.push({
      x: random() * C.VIEW_W,
      y: random() * 260,
      size: big ? 3 : random() > 0.6 ? 2 : 1,
      speed: 0.7 + random() * 2.2,
      phase: random() * Math.PI * 2,
    });
  }
  return stars;
}

/** Return the warm haze bands that sit above the skyline. */
export function horizonBand() {
  return [
    { y: 300, h: 40, color: C.COLOR.horizonHigh, alpha: 0.34 },
    { y: 340, h: 60, color: C.COLOR.horizonMid, alpha: 0.22 },
    { y: 400, h: 80, color: C.COLOR.horizonLow, alpha: 0.12 },
  ];
}

/** Return one building: a box, one of the two wall tiles, and a roof prop. */
function building(random, x, width, height, layer) {
  const shape = { x, y: C.GROUND_Y - height, w: width, h: height };
  // A wider block carries a taller roof prop.
  if (width >= 40 && random() > 0.45) {
    shape.prop = layer.props[Math.floor(random() * layer.props.length)];
  }
  return shape;
}

/** The front designs of a layer as a shuffled deck of whole rounds. Inside a
 * round nothing repeats; at the join of two rounds a repeat is traded away, so
 * two neighbours never wear the same front.
 */
function gestapelteEntwuerfe(random, tiles) {
  const stapel = [];
  for (let runde = 0; runde < 8; runde += 1) {
    const karten = tiles.slice();
    for (let i = karten.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [karten[i], karten[j]] = [karten[j], karten[i]];
    }
    stapel.push(...karten);
  }
  for (let i = 1; i < stapel.length; i += 1) {
    if (stapel[i] !== stapel[i - 1]) continue;
    const tausch = stapel.findIndex((k, n) => n > i + 1
      && k !== stapel[i] && k !== stapel[i + 1]);
    if (tausch > 0) [stapel[i], stapel[tausch]] = [stapel[tausch], stapel[i]];
  }
  return stapel;
}

/** Build one layer: a row of buildings with sky between them.
 * Every block draws its wall from the layer's tiles, which differ in tint and in
 * window grid, and no tile turns up twice in a row. `glass` with `glassChance`
 * lets a tall block wear a curtain wall instead of a bricked façade; `glassMinH`
 * keeps short blocks out of it, because a glass front needs height before the
 * pane grid reads as a grid.
 */
/** Build one city row across the span.
 *
 * `spriten: true` hands out whole pictures: a sprite owns its silhouette, so the
 * building is exactly the sprite box and the card dealt from the deck says which
 * size class it wears. Without it the row tiles a wall texture, and width and height
 * land on the texture's own grid so nothing stretches.
 *
 * A shuffled deck hands out the designs in both modes: every design of the row shows
 * up, and no two neighbours wear the same one. Drawing them at random left a design
 * unused in a row, which the city-tints case then caught.
 */
function buildLayer(seed, factor, walls, span, gapMin, gapMax,
  { spriten = false, props = [] } = {}) {
  const random = seeded(seed);
  const shapes = [];
  const stapel = gestapelteEntwuerfe(random, walls);
  let stapelRand = 0;
  let x = -260;
  while (x < span + 260) {
    const wall = stapel[stapelRand % stapel.length];
    stapelRand += 1;
    const [width, height] = spriten
      ? C.TILE[wall]
      : [
        C.CITY_GRID.w * (1 + Math.round(random() * (128 / C.CITY_GRID.w - 1))),
        C.CITY_GRID.h * (3 + Math.round(random() * 2)),
      ];
    const shape = building(random, x, width, height, { props });
    shape.wall = wall;
    shapes.push(shape);
    x += width + gapMin + Math.round(random() * gapMax);
  }
  return { factor, walls, shapes };
}

/** Return the three city layers from DG-P-04: far, mid, near. */
export function buildCity(seed, levelWidth) {
  // A wider span keeps the parallax shift covered over the whole level.
  const span = levelWidth + C.VIEW_W;
  const props = ['propAntenna', 'propTank', 'propVent'];
  return [
    // The far row is a tiled wall: a distant tower is a wall of windows, and a
    // repeating tile reads as distance. 192 to 320 px tall on its own grid.
    buildLayer(seed, C.PARALLAX.far, C.CITY_FRONTS.far, span, 14, 40, { props }),
    // The mid row is a sprite per building: every tower brings its own crown, so
    // the skyline is a rhythm of shapes instead of a row of flat boxes.
    buildLayer(seed + 101, C.PARALLAX.mid, C.SPRITE_MITTE.map((k) => k.name), span, 18, 52,
      { spriten: true, props }),
    // The near row stands closest and sits highest on the night ladder, with room
    // between its houses so the mid towers stay visible and the mass never fuses
    // into one wall.
    buildLayer(seed + 202, C.PARALLAX.near, C.SPRITE_VORNE.map((k) => k.name), span, 80, 180,
      { spriten: true }),
  ];
}
