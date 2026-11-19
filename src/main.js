// Game loop, module wiring, and the window.__game hook for game2 (DG-P-08).
// Input: browser time and the held-key map from input.js.
// Output: one fixed-step update per step and one draw per frame.
// main.js calls logic first, then render. Render never changes state.
// A death spends one life; the third death ends the run and shows GAME OVER.

import * as C from './config.js';
import { createInput } from './input.js';
import { updateWorld, killPlayer } from './entities.js';
import { buildSpec, freshWorld } from './level.js';
import { heartQuads } from './hud.js';
import { createRenderer } from './render/renderer.js';
import { moonPos } from './render/background.js';

const canvas = document.getElementById('game');
const banner = document.getElementById('gameover');
// The atlas waits for the ten facade textures, so the first frame needs an await.
const renderer = await createRenderer(canvas);
const input = createInput(window);
const spec = buildSpec(C.LEVEL_WIDTH);
// The step input and the per-frame results, so the hook never reads a world an
// update already replaced. A test may hold a reference to state or counters.
const hookState = {};
// The counters of the whole run, so a reset cannot hide a blast from a test.
const countersOut = { blasts: 0, bombAdds: 0 };

let world = freshWorld(spec);
let lastMs = performance.now();
let accumulator = 0;
let prevJump = false;

/** Keep the player at the screen center and clamp the camera to the level. */
function cameraFor(world) {
  const center = world.player.x + world.player.w / 2;
  return Math.min(Math.max(center - C.VIEW_W / 2, 0), Math.max(0, spec.width - C.VIEW_W));
}

/** Spend one life, or end the run when the last life is gone. */
function respawn() {
  const lives = world.lives - 1;
  adoptWorld(freshWorld(spec, world.deaths + 1, Math.max(lives, 0)));
  if (lives <= 0) world.gameOver = true;
}

/** R on the game-over screen starts a fresh run with three lives. */
function maybeRestart() {
  if (!world.gameOver || !input.takeRestart()) return;
  adoptWorld(freshWorld(spec));
  accumulator = 0;
}

/** Copy the held keys, and drop them all while GAME OVER shows. */
function stepKeys() {
  if (world.gameOver) return { left: false, right: false, jump: false };
  return { left: input.keys.left, right: input.keys.right, jump: input.keys.jump };
}

/** Run the fixed steps that the real time allows, at most MAX_STEPS of them. */
function step(ms) {
  accumulator += Math.min((ms - lastMs) / 1000, 0.25);
  lastMs = ms;
  let steps = 0;
  while (accumulator >= C.FIXED_STEP && steps < C.MAX_STEPS) {
    maybeRestart();
    const dead = updateWorld(world, stepKeys(), prevJump);
    prevJump = input.keys.jump;
    if (dead) {
      // The freeze is over: take the life, publish the new number, and let the
      // next frame draw the fresh world. A test that polls lives sees both.
      respawn();
      publish();
    }
    accumulator -= C.FIXED_STEP;
    steps += 1;
  }
  if (steps === C.MAX_STEPS) accumulator = 0;
}

/** Numbers about the whole run, so a reset cannot hide an event from a test. */
const runCounters = { blasts: 0, bombAdds: 0 };

/** Swap in a fresh world and carry the blast counter of the run into it. */
function adoptWorld(next) {
  next.stats.blasts = runCounters.blasts + next.stats.blasts;
  runCounters.blasts = next.stats.blasts;
  world = next;
}

/** Copy the run counters into the shared objects (DG-P-08). */
function publishCounters() {
  countersOut.blasts = runCounters.blasts;
  countersOut.bombAdds = runCounters.bombAdds;
}

function publish() {
  publishCounters();
  const player = world.player;
  hookState.time = world.time;
  hookState.player = {
    x: player.x, y: player.y, vx: player.vx, vy: player.vy, alive: player.alive,
  };
  hookState.enemiesAlive = world.enemies.filter((enemy) => !enemy.dead).length;
  hookState.bombs = world.bombs.map((bomb) => ({ x: bomb.x, y: bomb.y }));
  hookState.blasts = world.blasts.map((blast) => ({
    x: blast.x, y: blast.y, radius: blast.radius, age: blast.age,
  }));
  hookState.moonU = moonPos(world.moonTime).u;
  hookState.jet = { active: world.jet.active, x: world.jet.x };
  hookState.platforms = world.platforms.map((p) => ({ x: p.x, y: p.y, w: p.w, h: p.h }));
  hookState.enemies = world.enemies.map((e) => ({
    x: e.x, y: e.y, w: e.w, h: e.h, alive: !e.dead, dir: e.dir,
  }));
  hookState.lives = world.lives;
  hookState.deaths = world.deaths;
  countersOut.deaths = world.deaths;
  hookState.gameOver = world.gameOver;
  window.__game = {
    state: hookState,
    counters: countersOut,
    api: {
      reset: () => adoptWorld(freshWorld(spec)),
      // A full new run: fresh lives and zero deaths, for a test case that starts
      // from the beginning of a run.
      newRun: () => {
        adoptWorld(freshWorld(spec));
        runCounters.deaths = 0;
      },
      setPlayerPos: (x, y) => {
        world.player.x = x;
        world.player.y = y;
        world.player.vy = 0;
        world.player.landed = false;
      },
      // A bomb in screen space above the player, for the blast tests (DG-P-08).
      spawnBombAbove: (offset = 40) => {
        runCounters.bombAdds += 1;
        world.bombs.push({
          x: world.player.x + world.player.w / 2,
          y: world.player.y - offset,
          vx: 0,
          vy: 0,
        });
      },
      // Explode a blast at a world point, so a test can check the blast itself
      // without waiting for a bomb to fall (DG-P-08).
      makeBlast: (x, y) => {
        world.blasts.push({ x, y, radius: C.BLAST_RADIUS, age: 0 });
        world.stats.blasts += 1;
        runCounters.blasts += 1;
        if (Math.hypot(world.player.x + world.player.w / 2 - x,
          world.player.y + world.player.h / 2 - y) <= C.BLAST_RADIUS) killPlayer(world);
        return world.stats.blasts;
      },
      // Put one live enemy at a spot, for the side-touch test.
      placeEnemy: (x, y) => {
        const enemy = world.enemies.find((candidate) => !candidate.dead);
        if (!enemy) return false;
        enemy.x = x;
        enemy.y = y;
        enemy.platform = world.platforms[0];
        return true;
      },
    },
  };
}

/** One animation frame: update the logic, then draw the world. */
function frame(ms) {
  step(ms);
  world.hearts = heartQuads(world);
  banner.style.display = world.gameOver ? 'flex' : 'none';
  renderer.draw(world, cameraFor(world));
  publish();
  requestAnimationFrame(frame);
}

window.__gameConfig = C;
// The held-key map, so a test can see and release a key it forgot to lift.
window.__gameTestKeys = input.keys;
requestAnimationFrame(frame);
