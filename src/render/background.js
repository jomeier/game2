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

/** Pick a tile other than the one the previous building wears: the same tile
 * twice in a row is the first pattern the eye finds.
 */
function pickTile(random, tiles, previous) {
  const name = tiles[Math.floor(random() * tiles.length)];
  if (name !== previous || tiles.length < 2) return name;
  return tiles[(tiles.indexOf(name) + 1) % tiles.length];
}

/** Build one layer: a row of buildings with sky between them.
 * Every block draws its wall from the layer's tiles, which differ in tint and in
 * window grid, and no tile turns up twice in a row. `glass` with `glassChance`
 * lets a tall block wear a curtain wall instead of a bricked façade; `glassMinH`
 * keeps short blocks out of it, because a glass front needs height before the
 * pane grid reads as a grid.
 */
function buildLayer(seed, factor, walls, props, span, minH, maxH, gapMin, gapMax,
  { glass = [], glassChance = 0, glassMinH = 0 } = {}) {
  const random = seeded(seed);
  const shapes = [];
  let x = -260;
  let lastGlass = '';
  // A shuffled deck hands out the front designs: every design of the layer shows
  // up, and no two neighbours wear the same one. Drawing them at random left a
  // design unused in a layer, which the city-tints case then caught.
  const stapel = gestapelteEntwuerfe(random, walls);
  let stapelRand = 0;
  while (x < span + 260) {
    // Width and height land on the wall tile's own grid, so a façade texture is
    // never stretched on any building.
    const width = C.CITY_GRID.w * (1 + Math.round(random() * (128 / C.CITY_GRID.w - 1)));
    const height = Math.round((minH + random() * (maxH - minH)) / C.CITY_GRID.h) * C.CITY_GRID.h;
    const shape = building(random, x, width, height, { props });
    // Glass is decided first and takes no card from the deck, so the wall designs
    // still spread over the whole layer.
    if (glass.length > 0 && height >= glassMinH && random() < glassChance) {
      shape.wall = pickTile(random, glass, lastGlass);
      lastGlass = shape.wall;
    } else {
      shape.wall = stapel[stapelRand % stapel.length];
      stapelRand += 1;
    }
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
    buildLayer(seed, C.PARALLAX.far, C.CITY_FRONTS.far, props, span, 160, 352, 14, 40),
    // Nearly half of the tall mid blocks wears a glass front, drawn per block, so
    // the skyline never shows the same front twice in a row.
    buildLayer(seed + 101, C.PARALLAX.mid, C.CITY_FRONTS.mid, props, span, 128, 288, 18, 52,
      { glass: C.GLASS_TILES, glassChance: C.GLASS_CHANCE, glassMinH: C.GLASS_MIN_H }),
    // The near layer is a row of dark rooftops: narrow, tall, far apart, so the sky
    // shows between them and the mass never fuses into one wall.
    buildLayer(seed + 202, C.PARALLAX.near, C.CITY_FRONTS.near, [], span, 96, 256, 64, 168),
  ];
}
