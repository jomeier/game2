// Player, enemies, jet, and bombs for game2 (DG-P-06 and DG-P-07).
// Input: the world from level.js plus the held-key map. Output: state changes.
// One update handles one fixed step. Death handling lives in one place.

import * as C from './config.js';
import * as Phys from './physics.js';

/** Return the wish direction from the held keys: -1, 0, or 1. */
function wishDir(keys) {
  return (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
}

/** Start a death: the freeze timer gives the player one second of the scene. */
export function killPlayer(world) {
  if (!world.player.alive || world.freeze > 0) return;
  world.player.alive = false;
  world.freeze = C.DEATH_FREEZE_S;
}

/** Jump when the player stands. A step in the air does nothing. */
function tryJump(world, keys, prevJump) {
  if (!keys.jump || prevJump) return;
  if (!world.player.landed) return;
  world.player.vy = C.JUMP_VY;
  world.player.landed = false;
}

/** Move the player and read a stomp or a side touch against each enemy. */
function updatePlayer(world, keys, prevJump) {
  const player = world.player;
  tryJump(world, keys, prevJump);
  const wish = wishDir(keys);
  if (wish !== 0) player.facing = wish;
  const prevBottom = player.y + player.h;
  Phys.moveBox(player, wish, world.solidsView);
  for (const enemy of world.enemies) {
    if (enemy.dead) continue;
    // A stomp is decided on the pre-move boxes: the player must fall from above.
    if (Phys.stomped(player, enemy, prevBottom)) {
      enemy.dead = true;
      enemy.squash = C.ENEMY_SQUASH_S;
      player.vy = C.STOMP_BOUNCE;
      player.y = enemy.y - player.h;
    } else if (Phys.overlaps(player, enemy)) {
      killPlayer(world);
    }
  }
}

/** Walk each enemy and flip it at a platform edge or a wall. */
function updateEnemies(world) {
  for (const enemy of world.enemies) {
    if (enemy.dead) {
      enemy.squash = Math.max(enemy.squash - C.FIXED_STEP, 0);
      continue;
    }
    const step = C.ENEMY_SPEED * C.FIXED_STEP;
    const left = enemy.platform.x;
    const right = enemy.platform.x + enemy.platform.w - enemy.w;
    if (enemy.x <= left && enemy.dir < 0) enemy.dir = 1;
    else if (enemy.x >= right && enemy.dir > 0) enemy.dir = -1;
    else if (!Phys.groundAhead(enemy, enemy.dir, world.solidsView)) enemy.dir = -enemy.dir;
    enemy.x = Math.min(Math.max(enemy.x + enemy.dir * step, left), right);
  }
}

/** Fly the jet and drop one bomb near the player. */
function updateJet(world) {
  const jet = world.jet;
  if (!jet.active) {
    world.jetTimer -= C.FIXED_STEP;
    if (world.jetTimer > 0) return;
    jet.active = true;
    jet.x = -C.JET_W;
    jet.dropped = false;
    return;
  }
  jet.x += C.JET_SPEED * C.FIXED_STEP;
  const playerCenter = Phys.center(world.player);
  const near = Math.abs(jet.x + C.JET_W / 2 - playerCenter.x) <= C.JET_DROP_DIST;
  if (near && !jet.dropped) {
    jet.dropped = true;
    const bombX = Math.min(Math.max(jet.x + C.JET_W / 2, playerCenter.x - C.BOMB_CLAMP),
      playerCenter.x + C.BOMB_CLAMP);
    world.bombs.push({ x: bombX, y: C.JET_Y + C.JET_H, vx: 0, vy: 0 });
  }
  if (jet.x > world.width) {
    jet.active = false;
    world.jetTimer = C.JET_INTERVAL_S;
  }
}

/** Fall each bomb and explode it on the first solid it touches. */
function updateBombs(world) {
  const alive = [];
  for (const bomb of world.bombs) {
    bomb.vy = Math.min(bomb.vy + C.BOMB_GRAVITY * C.FIXED_STEP, C.MAX_FALL);
    bomb.y += bomb.vy * C.FIXED_STEP;
    const point = { x: bomb.x - C.BOMB_R, y: bomb.y, w: C.BOMB_R * 2, h: C.BOMB_R * 2 };
    const hit = world.solidsView.some((solid) => Phys.overlaps(point, solid));
    if (!hit) {
      alive.push(bomb);
      continue;
    }
    const player = world.player;
    // The blast kills on the player center inside the radius (DG-P-06). Use the
    // pre-move center: at a 120 Hz step the player moves little, but the check
    // must read the same instant as the explosion, not one step later.
    const playerCenter = Phys.center(player);
    world.blasts.push({ x: bomb.x, y: bomb.y, radius: C.BLAST_RADIUS, age: 0 });
    world.stats.blasts += 1;
    if (Phys.distanceSq(playerCenter, bomb) <= C.BLAST_RADIUS * C.BLAST_RADIUS) killPlayer(world);
  }
  world.bombs = alive;
}

/** Age every blast and drop the finished ones. */
function updateBlasts(world) {
  world.blasts = world.blasts
    .map((blast) => ({ ...blast, age: blast.age + C.FIXED_STEP }))
    .filter((blast) => blast.age < C.BLAST_FLASH_S);
}

/** One fixed step of the world. The player dies and respawns one step later. */
export function updateWorld(world, keys, prevJump) {
  world.solidsView = [world.ground, ...world.platforms];
  if (world.gameOver) return false;
  if (world.freeze > 0) {
    world.freeze -= C.FIXED_STEP;
    return world.freeze <= 0;
  }
  world.time += C.FIXED_STEP;
  world.moonTime += C.FIXED_STEP;
  updatePlayer(world, keys, prevJump);
  updateEnemies(world);
  updateJet(world);
  updateBombs(world);
  updateBlasts(world);
  return !world.player.alive;
}
