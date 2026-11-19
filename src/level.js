// Platforms, enemy spawns, and the fresh world for game2 (DG-P-07).
// Input: the level width. Output: the solid boxes and a fresh world object.
// The layout follows docs/spec.md: gaps shrink by 10 % per step, min 90 px.

import * as C from './config.js';

/** Return the solid boxes: the ground strip and the floating platforms. */
export function buildSpec(width) {
  const platforms = [];
  let x = 420;
  let gap = 150;
  let index = 0;
  while (x + 200 < width - 60) {
    // Width is a whole number of the 32 px stone tile and the height is the cap
    // band plus one whole tile row, so the platform draws without stretching.
    const widthOf = 224 + (index % 3) * 32;
    const top = 300 + (index % 2) * 60 + (index % 3) * 25;
    platforms.push({ x, y: top, w: widthOf, h: C.CAP_BAND + 16 });
    gap = Math.max(gap * C.PLATFORM_GAP_STEP, C.PLATFORM_GAP_MIN);
    x += widthOf + Math.round(gap + (index % 2) * 30);
    index += 1;
  }
  const ground = { x: 0, y: C.GROUND_Y, w: width, h: C.VIEW_H - C.GROUND_Y };
  return { width, solids: [ground, ...platforms], platforms };
}

/** Return one enemy per platform, placed at its left end, walking right. */
function spawnEnemies(spec) {
  return spec.platforms.map((platform, index) => ({
    x: platform.x + 10,
    y: platform.y - C.ENEMY_H,
    w: C.ENEMY_W,
    h: C.ENEMY_H,
    vx: 0,
    vy: 0,
    dir: index % 2 === 0 ? 1 : -1,
    platform,
    squash: 0,
    dead: false,
  }));
}

/** Return a brand new world for the run. A death and a restart share this path. */
export function freshWorld(spec, deaths = 0, lives = C.LIVES_START) {
  const [ground, ...platforms] = spec.solids;
  return {
    time: 0,
    deaths,
    lives,
    gameOver: false,
    freeze: 0,
    moonTime: 0,
    jetTimer: C.JET_INTERVAL_S,
    ground,
    platforms,
    player: {
      x: C.PLAYER_SPAWN_X,
      y: C.GROUND_Y - C.PLAYER_H,
      w: C.PLAYER_W,
      h: C.PLAYER_H,
      vx: 0,
      vy: 0,
      alive: true,
      facing: 1,
    },
    enemies: spawnEnemies(spec),
    bombs: [],
    blasts: [],
    stats: { blasts: 0, bombAdds: 0 },
    jet: { active: false, x: 0, dropped: false },
    cameraX: 0,
  };
}
