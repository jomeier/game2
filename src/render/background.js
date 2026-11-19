// Sky, stars, moon, and the three city layers of game2 (DG-P-04, DG-P-05, DG-P-11).
// buildCity() returns the silhouette shapes for one fixed seed, so every run and
// every screenshot shows the same city. The renderer draws the shapes from atlas
// tiles; nothing here touches WebGL.
// The layers hold no alpha: DG-P-11 wants opaque silhouettes, so depth comes from
// the value steps alone.

import * as C from '../config.js';
import { MOON_CX, MOON_CY, MOON_RX, MOON_RY, MOON_PERIOD_S } from '../config.js';

/** Return a small seeded generator. Same seed means the same city. */
function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Return the moon center for a level time. The formula is DG-P-05. */
export function moonPos(moonTime) {
  const u = (moonTime % MOON_PERIOD_S) / MOON_PERIOD_S;
  return {
    u,
    x: MOON_CX - MOON_RX * Math.cos(Math.PI * u),
    y: MOON_CY - MOON_RY * Math.sin(Math.PI * u),
  };
}

/** Return a fixed list of small stars in the upper half of the screen. */
export function starField(seed) {
  const random = seeded(seed + 7);
  const stars = [];
  for (let index = 0; index < 70; index += 1) {
    stars.push({
      x: random() * C.VIEW_W,
      y: random() * 300,
      size: random() < 0.8 ? 1 : 2,
    });
  }
  return stars;
}

/** Return the tile keys of the three layers, back layer first. */
export function layerTiles() {
  // The renderer owns the atlas, so this module only names the tiles.
  return ['cityFar', 'cityMid', 'cityNear'];
}

/** Build one layer: a row of buildings with gaps, heights, and widths from a seed. */
function buildLayer(seed, factor, width, minH, maxH, gapMax) {
  const random = seeded(seed);
  const shapes = [];
  let x = -200;
  while (x < width + 200) {
    const w = 40 + Math.round(random() * 90);
    const h = minH + Math.round(random() * (maxH - minH));
    shapes.push({ x, y: C.GROUND_Y - h, w, h });
    x += w + Math.round(random() * gapMax);
  }
  return { factor, shapes };
}

/** Return the three city layers from DG-P-04: far, mid, near. */
export function buildCity(seed, levelWidth) {
  // A wider layer span keeps the parallax shift covered over the whole level.
  const span = levelWidth + C.VIEW_W;
  return [
    buildLayer(seed, C.PARALLAX.far, span, 150, 330, 26),
    buildLayer(seed + 101, C.PARALLAX.mid, span, 110, 270, 34),
    buildLayer(seed + 202, C.PARALLAX.near, span, 80, 210, 44),
  ];
}
