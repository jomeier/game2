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
  let lastWall = '';
  let lastGlass = '';
  while (x < span + 260) {
    // Width and height land on the wall tile's own grid (16 wide, 32 tall), so a
    // façade tile is never stretched on any building.
    const width = 32 + Math.round(random() * 6) * 16;    // 32 .. 128
    const height = Math.round((minH + random() * (maxH - minH)) / 32) * 32;
    const shape = building(random, x, width, height, { props });
    // The two lists need their own memory: a glass front has to differ from the
    // previous *glass* tower, and a bricked wall from the previous bricked wall.
    // Against the neighbour the two lists still hold each other off, because a
    // glass name is never a wall name.
    let wall = pickTile(random, walls, lastWall);
    if (glass.length > 0 && height >= glassMinH && random() < glassChance) {
      wall = pickTile(random, glass, lastGlass);
      lastGlass = wall;
    }
    shape.wall = wall;
    lastWall = wall;
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
    buildLayer(seed, C.PARALLAX.far, C.CITY_WALLS.far, props, span, 160, 352, 14, 40),
    // Nearly half of the tall mid blocks wears a glass front, drawn per block, so
    // the skyline never shows the same front twice in a row.
    buildLayer(seed + 101, C.PARALLAX.mid, C.CITY_WALLS.mid, props, span, 128, 288, 18, 52,
      { glass: C.GLASS_TILES, glassChance: C.GLASS_CHANCE, glassMinH: C.GLASS_MIN_H }),
    // The near layer is a row of dark rooftops: narrow, tall, far apart, so the sky
    // shows between them and the mass never fuses into one wall.
    buildLayer(seed + 202, C.PARALLAX.near, C.CITY_WALLS.near, [], span, 96, 256, 64, 168),
  ];
}
