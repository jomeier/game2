// The runtime pixel-art atlas of game2 (DG-P-10).
// No image file ships with the game: this module paints every tile and sprite
// into an offscreen canvas at startup and uploads that canvas once as a texture.
// A fixed seed keeps the noise identical across runs, so shots stay comparable.
// Layout: one 16 px cell per tile in the left block; two 32 px cells for sprites.

const CELL = 16;
const SPRITE = 32;
const ROWS = 4;

// One dark infill for all solids, so ground never competes with the player.
const INFILL = '#0a0d1e';
const OUTLINE = '#04060f';

/** Return a small seeded generator. mulberry32 needs no library. */
function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Paint one 16 px tile of dark rock: the infill plus a little noise. */
function paintRock(ctx, col, seed) {
  const random = seeded(seed);
  ctx.fillStyle = INFILL;
  ctx.fillRect(col * CELL, 0, CELL, CELL);
  ctx.fillStyle = 'rgba(90, 110, 180, 0.10)';
  for (let i = 0; i < 26; i += 1) {
    const x = Math.floor(random() * CELL);
    const y = Math.floor(random() * CELL);
    ctx.fillRect(col * CELL + x, y, 1, 1);
  }
}

/** Paint one 16 px cap tile: rock below, the light 1 px line that names the edge. */
function paintCap(ctx, col, edge, seed) {
  const random = seeded(seed);
  ctx.fillStyle = INFILL;
  ctx.fillRect(col * CELL, 0, CELL, CELL);
  ctx.fillStyle = edge;
  ctx.fillRect(col * CELL, 0, CELL, 1);
  ctx.fillStyle = 'rgba(120, 140, 210, 0.16)';
  ctx.fillRect(col * CELL, 1, CELL, 1);
  ctx.fillStyle = 'rgba(70, 85, 145, 0.12)';
  for (let i = 0; i < 20; i += 1) {
    ctx.fillRect(col * CELL + Math.floor(random() * CELL), 2 + Math.floor(random() * 14), 1, 1);
  }
}

/** Paint one 16 px building cell: one hue and few lit windows. */
function paintBuilding(ctx, col, base, warm, cool, seed) {
  const random = seeded(seed);
  ctx.fillStyle = base;
  ctx.fillRect(col * CELL, 0, CELL, CELL);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.fillRect(col * CELL, 0, 1, CELL);
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      const roll = random();
      if (roll > 0.16) continue;
      ctx.fillStyle = roll < 0.05 ? cool : warm;
      ctx.fillRect(col * CELL + 2 + column * 5, 2 + row * 4, 2, 3);
    }
  }
}

/** Paint the player: a slim figure with a dark outline and a bright core. */
function paintPlayer(ctx, col) {
  const x = col * CELL;
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(x + 5, 2, 10, 14);
  ctx.fillStyle = '#54e0f0';
  ctx.fillRect(x + 6, 3, 8, 8);
  ctx.fillStyle = '#2a6f80';
  ctx.fillRect(x + 6, 11, 8, 4);
  ctx.fillStyle = '#d9fbff';
  ctx.fillRect(x + 8, 4, 4, 3);
}

/** Paint one patrolling enemy: a low body, two eyes, a dark outline. */
function paintEnemy(ctx, col, dir) {
  const x = col * CELL;
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(x, 6, CELL, 10);
  ctx.fillStyle = '#f0544e';
  ctx.fillRect(x + 1, 7, 14, 8);
  ctx.fillStyle = '#7d1f1c';
  ctx.fillRect(x + 1, 13, 14, 2);
  ctx.fillStyle = '#fff3d0';
  const eye = dir > 0 ? 10 : 4;
  ctx.fillRect(x + eye, 9, 2, 2);
}

/** Paint the jet seen from the side: a pale hull and a warm beacon. */
function paintJet(ctx, col) {
  const x = col * CELL;
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(x, 6, CELL, 5);
  ctx.fillStyle = '#a8d4ff';
  ctx.fillRect(x + 1, 7, 13, 3);
  ctx.fillStyle = '#5d7fa8';
  ctx.fillRect(x + 10, 7, 4, 3);
  ctx.fillStyle = '#ff6b5e';
  ctx.fillRect(x + 1, 7, 2, 2);
}

/** Paint one bomb: a round yellow body with a fuse spark. */
function paintBomb(ctx, col) {
  const x = col * CELL;
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(x + 4, 6, 8, 9);
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(x + 5, 7, 6, 7);
  ctx.fillStyle = '#8a6a10';
  ctx.fillRect(x + 5, 12, 6, 2);
  ctx.fillStyle = '#fff3d0';
  ctx.fillRect(x + 7, 4, 2, 2);
}

/** Paint a 32 px heart: full is warm, spent is a dull shell. */
function paintHeart(ctx, x, full) {
  const cells = [
    'XX..XX',
    'XXXXXX',
    'XXXXXX',
    '.XXXX.',
    '..XX..',
  ];
  const fill = full ? '#f0544e' : '#2a2f4a';
  const shine = full ? '#ff9b96' : '#3a4066';
  const block = SPRITE / 6;
  for (let row = 0; row < cells.length; row += 1) {
    for (let column = 0; column < cells[row].length; column += 1) {
      if (cells[row][column] !== 'X') continue;
      ctx.fillStyle = fill;
      ctx.fillRect(x + column * block, row * block, block, block);
    }
  }
  ctx.fillStyle = shine;
  ctx.fillRect(x + block, block, block, block);
}

/** Paint every cell and return the canvas with its tile rectangle table. */
function paintAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = 12 * CELL + 2 * SPRITE;
  canvas.height = ROWS * CELL;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  paintRock(ctx, 0, 11);
  paintCap(ctx, 1, '#2c3563', 23);
  paintBuilding(ctx, 2, '#262c52', '#ffc46b', '#c3d4ff', 37);
  paintBuilding(ctx, 3, '#141a33', '#ffc46b', '#c3d4ff', 41);
  paintBuilding(ctx, 4, '#0c1024', '#ffc46b', '#c3d4ff', 53);
  paintPlayer(ctx, 5);
  paintEnemy(ctx, 6, 1);
  paintEnemy(ctx, 7, -1);
  paintJet(ctx, 8);
  paintBomb(ctx, 9);
  paintHeart(ctx, 10 * CELL, true);
  paintHeart(ctx, 11 * CELL, false);
  return canvas;
}

/** Return the uv rectangle and the tile count for one cell of the atlas. */
function cellRect(x, width, height, tilesX, tilesY) {
  return {
    uv: [x / width, 0, (x + width) / width, height / (ROWS * CELL)],
    tiles: [tilesX, tilesY],
  };
}

/** Upload the painted canvas and return the tile table for the renderer. */
export function createAtlas(gl) {
  const canvas = paintAtlas();
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const w = canvas.width;
  const h = canvas.height;
  return {
    texture,
    width: w,
    height: h,
    rock: cellRect(0, CELL, CELL, 1, 1),
    cap: cellRect(CELL, CELL, CELL, 1, 1),
    cityFar: cellRect(2 * CELL, CELL, CELL, 1, 1),
    cityMid: cellRect(3 * CELL, CELL, CELL, 1, 1),
    cityNear: cellRect(4 * CELL, CELL, CELL, 1, 1),
    player: cellRect(5 * CELL, CELL, CELL, 1, 1),
    enemyRight: cellRect(6 * CELL, CELL, CELL, 1, 1),
    enemyLeft: cellRect(7 * CELL, CELL, CELL, 1, 1),
    jet: cellRect(8 * CELL, CELL, CELL, 1, 1),
    bomb: cellRect(9 * CELL, CELL, CELL, 1, 1),
    heartFull: cellRect(10 * CELL, CELL, CELL, 1, 1),
    heartSpent: cellRect(11 * CELL, CELL, CELL, 1, 1),
  };
}
