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
function building(random, index, x, width, height, layer) {
  const shape = { x, y: C.GROUND_Y - height, w: width, h: height };
  // Two wall tiles alternate, so no two neighbours show the same window grid.
  shape.wall = layer.walls[index % layer.walls.length];
  // A wider block carries a taller roof prop.
  if (width >= 40 && random() > 0.45) {
    shape.prop = layer.props[Math.floor(random() * layer.props.length)];
  }
  return shape;
}

/** Build one layer: a row of buildings with sky between them. */
function buildLayer(seed, factor, walls, props, span, minH, maxH, gapMin, gapMax) {
  const random = seeded(seed);
  const shapes = [];
  let x = -260;
  let index = 0;
  while (x < span + 260) {
    const width = 30 + Math.round(random() * 92);
    // Heights land on an 8 px step, so a wall tile never stretches.
    const height = Math.round((minH + random() * (maxH - minH)) / 8) * 8;
    shapes.push(building(random, index, x, width, height, { walls, props }));
    x += width + gapMin + Math.round(random() * gapMax);
    index += 1;
  }
  return { factor, walls, shapes };
}

/** Return the three city layers from DG-P-04: far, mid, near. */
export function buildCity(seed, levelWidth) {
  // A wider span keeps the parallax shift covered over the whole level.
  const span = levelWidth + C.VIEW_W;
  const props = ['propAntenna', 'propTank', 'propVent'];
  return [
    buildLayer(seed, C.PARALLAX.far, ['farWallA', 'farWallB'], props, span, 168, 352, 14, 40),
    buildLayer(seed + 101, C.PARALLAX.mid, ['midWallA', 'midWallB'], props, span, 112, 288, 18, 52),
    // The near layer is a row of dark rooftops: tall, far apart, so the sky shows
    // between them and the mass never becomes one wall.
    buildLayer(seed + 202, C.PARALLAX.near, ['nearWallA', 'nearWallB'], [], span, 48, 232, 52, 132),
  ];
}
