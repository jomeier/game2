// Sky, stars, moon, and the three city layers of game2 (DG-P-04, DG-P-05, DG-P-11).
// buildCity() returns the silhouette shapes for one fixed seed, so every run and
// every screenshot shows the same skyline. The renderer draws the shapes from
// façade tiles; nothing here touches WebGL.
// The layers hold no alpha: DG-P-11 wants opaque silhouettes, so depth comes from
// the value steps and the façade tiles of the three layers.

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

/** Return one building: a box plus a roof prop that fits its width. */
function building(random, x, width, height, props) {
  const shape = { x, y: C.GROUND_Y - height, w: width, h: height };
  if (props && width >= 34 && random() > 0.55) {
    shape.prop = props[Math.floor(random() * props.length)];
  }
  return shape;
}

/** Build one layer: a row of buildings whose widths and heights come from a seed. */
function buildLayer(seed, factor, wall, span, minH, maxH, gapMax, props) {
  const random = seeded(seed);
  const shapes = [];
  let x = -220;
  while (x < span + 220) {
    const width = 34 + Math.round(random() * 96);
    // Heights land on an 8 px step: the facade tile stays unscaled.
    const height = Math.round((minH + random() * (maxH - minH)) / 8) * 8;
    shapes.push(building(random, x, width, height, props));
    x += width + Math.round(random() * gapMax);
  }
  return { factor, wall, shapes };
}

/** Return the three city layers from DG-P-04: far, mid, near. */
export function buildCity(seed, levelWidth) {
  // A wider span keeps the parallax shift covered over the whole level.
  const span = levelWidth + C.VIEW_W;
  const props = ['propAntenna', 'propTank', 'propVent'];
  return [
    buildLayer(seed, C.PARALLAX.far, 'farWall', span, 150, 340, 26, props),
    buildLayer(seed + 101, C.PARALLAX.mid, 'midWall', span, 110, 280, 34, props),
    buildLayer(seed + 202, C.PARALLAX.near, 'nearWall', span, 70, 200, 46, []),
  ];
}
