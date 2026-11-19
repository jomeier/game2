// Lives and hearts in screen space for game2 (DG-P-09, docs/spec.md).
// Input: the world. Output: heart quads in screen pixels.
// The hearts stay fixed on the screen: the caller draws them without the camera.

import * as C from './config.js';

/** Return one heart per life in the run, plus the spent hearts up to the start. */
export function heartQuads(world) {
  const quads = [];
  for (let index = 0; index < C.LIVES_START; index += 1) {
    const full = index < world.lives;
    quads.push({
      x: C.HEART_X + index * (C.HEART_SIZE + C.HEART_GAP),
      y: C.HEART_Y,
      w: C.HEART_SIZE,
      h: C.HEART_SIZE,
      color: full ? C.COLOR.heartFull : C.COLOR.heartSpent,
      full,
    });
  }
  return quads;
}
