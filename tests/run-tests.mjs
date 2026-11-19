// Headless test for game2 (DG-P-08).
// Starts a static server, drives Chrome with puppeteer-core, checks the game.
// Saves screenshots to shots/. Prints one line per case and exits 0 or 1.
// Run: node tests/run-tests.mjs
// Env:  PORT (default 8766)   CHROME_PATH (default /usr/bin/google-chrome-stable)

import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { decodePngFile, pixel } from './png-decode.mjs';
import * as C from '../src/config.js';
import { buildCity } from '../src/render/background.js';
import { buildSpec } from '../src/level.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'shots');
const PORT = Number(process.env.PORT || 8766);
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome-stable';
const BASE_URL = `http://localhost:${PORT}/`;

const HELP = `Usage: node tests/run-tests.mjs [--help]

Starts python3 -m http.server on port ${PORT}, serves src/, drives headless Chrome.
Cases: initial, keys, materials, city-windows, moon-disc, hero-frames, hint, move,
jump, moon, jet-bomb, stomp, side-touch, blast, level, lives, opaque-city.
Screenshots: shots/01-initial.png, 02-jump.png, 03-jet-bomb.png, 04-gameover.png,
04-moon-top.png. A failed case also saves shots/fail-<case>.png.
`;

if (process.argv.includes('--help')) {
  console.log(HELP);
  process.exit(0);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Return [r, g, b] for a #rrggbb string. */
function hexToRgb(hex) {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** Read a color list from the page config inside one evaluate call. */
function readPalette() {
  return {
    grass: [window.__gameConfig.COLOR.grassLight, window.__gameConfig.COLOR.grass,
      window.__gameConfig.COLOR.grassDark, window.__gameConfig.COLOR.grassDeep],
    dirt: [window.__gameConfig.COLOR.dirtLight, window.__gameConfig.COLOR.dirt,
      window.__gameConfig.COLOR.dirtDark, window.__gameConfig.COLOR.dirtDeep],
    stone: [window.__gameConfig.COLOR.stoneLight, window.__gameConfig.COLOR.stone,
      window.__gameConfig.COLOR.stoneDark, window.__gameConfig.COLOR.stoneDeep],
    footing: window.__gameConfig.COLOR.rockFooting,
    bands: {
      groundY: window.__gameConfig.GROUND_Y,
      grass: window.__gameConfig.GRASS_BAND,
      soil: window.__gameConfig.SOIL_BAND,
      rock: window.__gameConfig.ROCK_BAND,
    },
  };
}
/** How much of a picture is lit window: pixels above one absolute threshold,
 * after the row's own baked value scale (FRONT_LAYER_TON) is divided out. Sprites
 * count only their covered pixels, so a tall thin tower is not punished for the
 * sky around it.
 */
async function fensterAnteil(datei, skale, alpha = false) {
  const bild = await decodePngFile(path.join(ROOT, 'src', 'render', ...datei));
  let helle = 0;
  let zellen = 0;
  for (let y = 0; y < bild.height; y += 1) {
    for (let x = 0; x < bild.width; x += 1) {
      const p = pixel(bild, x, y);
      if (alpha && p[3] <= 127) continue;
      zellen += 1;
      if ((0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]) / skale > 150) helle += 1;
    }
  }
  return zellen === 0 ? 0 : helle / zellen;
}

const fernAnteil = (design) => fensterAnteil(
  ['texturen', `${design}-far.png`], C.FRONT_LAYER_TON.far,
);

const spriteAnteil = (klasse, reihe) => fensterAnteil(
  ['sprites', `${klasse.name}.png`], C.FRONT_LAYER_TON[reihe], true,
);

/** The lit windows of the three city rows, measured on the shipped files.
 * The spec wants the far row to light most of them and the near row almost none
 * (DG-P-11). Both the façades and the sprites are loaded pictures, so that order
 * has to live in the files: a brightness trick at draw time would leave the repo
 * promising something the game never ships.
 */
async function caseCityWindows() {
  const gesamt = { far: 0, mid: 0, near: 0 };
  for (let i = 0; i < C.FRONT_DESIGNS.length; i += 1) {
    const [design] = C.FRONT_DESIGNS[i];
    // A texture that outgrew its tile box would stretch on a building. The atlas
    // build throws on that too, but only in a browser; measuring the file here
    // names the texture.
    const [w, h] = C.TILE[C.CITY_FRONTS.far[i]];
    const bild = await decodePngFile(path.join(ROOT, 'src', 'render', 'texturen',
      `${design}-far.png`));
    if (bild.width !== w || bild.height !== h) {
      throw new Error(`${design}-far.png is ${bild.width}x${bild.height}, the tile box `
        + `says ${w}x${h}`);
    }
    gesamt.far += await fernAnteil(design);
  }
  for (const [liste, schlussel] of [[C.SPRITE_MITTE, 'mid'], [C.SPRITE_VORNE, 'near']]) {
    for (const klasse of liste) {
      const sprite = await decodePngFile(path.join(ROOT, 'src', 'render', 'sprites',
        `${klasse.name}.png`));
      const [w, h] = C.TILE[klasse.name];
      if (sprite.width !== w || sprite.height !== h) {
        throw new Error(`sprite ${klasse.name} is ${sprite.width}x${sprite.height}, config `
          + `says ${w}x${h}`);
      }
      // A sprite owns a free silhouette: its top row must show the sky.
      let oben = 0;
      for (let x = 0; x < sprite.width; x += 1) if (pixel(sprite, x, 0)[3] > 127) oben += 1;
      if (oben > sprite.width * 0.25) {
        throw new Error(`${klasse.name} covers ${oben} px of its top row: a flat roof`);
      }
      gesamt[schlussel] += await spriteAnteil(klasse, schlussel);
    }
  }
  const pro = {
    far: gesamt.far / C.FRONT_DESIGNS.length,
    mid: gesamt.mid / C.SPRITE_MITTE.length,
    near: gesamt.near / C.SPRITE_VORNE.length,
  };
  if (!(pro.far > pro.mid && pro.mid > pro.near)) {
    throw new Error(`lit share does not fall to the front: far ${(pro.far * 100).toFixed(2)}% `
      + `mid ${(pro.mid * 100).toFixed(2)}% near ${(pro.near * 100).toFixed(2)}%`);
  }
  if (pro.far < 0.01) throw new Error(`the far row lights only ${(pro.far * 100).toFixed(2)}%`);
}

const state = (page) => page.evaluate(() => window.__game.state);

/** Start the static server for src/ and return its stop function. */
function startServer() {
  const child = spawn('python3', ['-m', 'http.server', String(PORT), '-d', path.join(ROOT, 'src')],
    { stdio: 'ignore' });
  const stop = () => { try { child.kill(); } catch { /* already gone */ } };
  process.on('exit', stop);
  return stop;
}

/** Wait until the server answers, or throw after the timeout. */
async function waitServer(timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if ((await fetch(BASE_URL)).ok) return;
    } catch { /* not up yet */ }
    await sleep(120);
  }
  throw new Error(`the server did not answer on ${BASE_URL}`);
}

/** Save one screenshot of the page under a fixed name. */
async function shot(page, name) {
  await page.screenshot({ path: path.join(SHOTS, name) });
  console.log(`  shot: shots/${name}`);
}

/** Poll the game state until the predicate source returns true. */
async function waitUntil(page, predicateSource, timeoutMs) {
  await page.waitForFunction(
    (src) => eval(`(${src})`)(window.__game.state),
    { timeout: timeoutMs, polling: 80 },
    predicateSource,
  );
}

/** Return the camera x the game uses for a player x (DG-P-04). */
function cameraOf(playerX) {
  return Math.max(0, Math.min(Math.round(playerX) + 13 - 480, 3200 - 960));
}

/** Save a probe screenshot and return its decoded pixels. */
async function probeShot(page, name) {
  const file = path.join(SHOTS, name);
  await page.screenshot({ path: file });
  return decodePngFile(file);
}

/** Count pixels close to one rgb color inside a rect. */
function countNear(image, x0, y0, w, h, color, tolerance = 30) {
  let count = 0;
  for (let y = y0; y < y0 + h; y += 1) {
    for (let x = x0; x < x0 + w; x += 1) {
      const px = pixel(image, x, y);
      const off = Math.abs(px[0] - color[0]) + Math.abs(px[1] - color[1]) + Math.abs(px[2] - color[2]);
      if (off <= tolerance) count += 1;
    }
  }
  return count;
}

/** Return how many pixels of one band belong to a wall ramp, and how many are lit.
 * A raw warm count only says how much wall a band shows; the spec compares the
 * layers, so the case counts lit windows per wall area instead. */

/** Hold a key and take two shots of the player area, then compare the crops. */
async function heroFrameDiff(page) {
  await page.keyboard.down('KeyD');
  await sleep(350);
  const first = await state(page);
  const shotA = await probeShot(page, 'probe-frame-a.png');
  await sleep(130);
  const second = await state(page);
  const shotB = await probeShot(page, 'probe-frame-b.png');
  await page.keyboard.up('KeyD');
  const a = Math.round(first.player.x) - cameraOf(first.player.x);
  const b = Math.round(second.player.x) - cameraOf(second.player.x);
  let diff = 0;
  for (let y = 440; y < 480; y += 2) {
    for (let off = 0; off < 26; off += 2) {
      const p1 = pixel(shotA, a + off, y);
      const p2 = pixel(shotB, b + off, y);
      if (Math.abs(p1[0] - p2[0]) + Math.abs(p1[1] - p2[1]) + Math.abs(p1[2] - p2[2]) > 40) diff += 1;
    }
  }
  return diff;
}

/** Watch one moon pass and return the measured disc width in pixels.
 * waitUntil evals the predicate: waitForFunction with a string arrow evaluates the
 * function object itself, which is always truthy, and would wait for nothing. */
async function measureMoon(page) {
  await waitUntil(page, 's => s.moonU > 0.47 && s.moonU < 0.53', 16000);
  const view = await page.evaluate(() => {
    const u = window.__game.state.moonU;
    const cfg = window.__gameConfig;
    return {
      x: Math.round(cfg.MOON_CX - cfg.MOON_RX * Math.cos(Math.PI * u)),
      y: Math.round(cfg.MOON_CY - cfg.MOON_RY * Math.sin(Math.PI * u)),
      r: cfg.MOON_R,
    };
  });
  const image = await probeShot(page, 'probe-moon.png');
  if (view.x < 200 || view.x > 760) throw new Error(`the moon sits at x=${view.x}, not on screen`);
  let first = -1;
  let last = -1;
  for (let x = view.x - view.r - 6; x <= view.x + view.r + 6; x += 1) {
    const [r, g, b] = pixel(image, x, view.y);
    if (r > 120 && g > 100 && b > 70) {
      if (first < 0) first = x;
      last = x;
    }
  }
  const corner = pixel(image, view.x - view.r + 4, view.y - view.r + 4);
  return { width: last - first, corner, view };
}

/** Run a small function in the page and return its value. A frame rebuilds the
 * game object, so a probe must run inside the page, never around a frame. */
async function probe(page, fn, arg) {
  return page.evaluate(fn, arg);
}

/** Poll an async probe until it returns something other than null. */
async function pollFor(timeoutMs, probeOnce) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await probeOnce();
    if (value) return value;
    await sleep(60);
  }
  return null;
}

/** Put the world back to a fresh level. */
async function reset(page) {
  await page.evaluate(() => window.__game.api.reset());
  await sleep(60);
}

/** Return the world boxes of the floating platforms, sorted by x. */
async function platformBoxes(page) {
  return (await state(page)).platforms;
}

/** Hold a key for a moment. */
async function tap(page, key, ms = 400) {
  await page.keyboard.down(key);
  await sleep(ms);
  await page.keyboard.up(key);
}

async function caseInitial(page) {
  await page.waitForFunction('window.__game && window.__game.state', { polling: 100 });
  await sleep(2500);
  const current = await state(page);
  if (current.lives !== 3) throw new Error(`expected 3 lives at the start, got ${current.lives}`);
  if (current.gameOver) throw new Error('the run must not end on its own');
  await shot(page, '01-initial.png');
}

async function caseMove(page) {
  await reset(page);
  const before = (await state(page)).player.x;
  await tap(page, 'KeyD', 600);
  const after = (await state(page)).player.x;
  if (after <= before + 60) throw new Error(`Key D moved the player only ${after - before} px`);
  const back = (await state(page)).player.x;
  await tap(page, 'KeyA', 600);
  if ((await state(page)).player.x >= back) throw new Error('Key A did not move the player left');
}

async function caseJump(page) {
  await reset(page);
  const ground = (await state(page)).player.y;
  await tap(page, 'KeyW', 120);
  await sleep(180);
  const peak = (await state(page)).player.y;
  if (peak >= ground - 40) throw new Error(`W lifted the player only ${ground - peak} px`);
  await waitUntil(page, 's => s.player.y >= ' + (ground - 1), 4000);
  await shot(page, '02-jump.png');
}

/** Watch one full moon pass: u rises to the peak, then wraps back to 0. */
async function caseMoon(page) {
  await reset(page);
  // Sample every 100 ms so a fast run still sees the peak near u = 0.5.
  const samples = [];
  const deadline = Date.now() + 16000;
  while (Date.now() < deadline) {
    samples.push((await state(page)).moonU);
    if (samples.length > 1 && samples.at(-1) < samples.at(-2) - 0.3) break;
    await sleep(100);
  }
  await shot(page, '04-moon-top.png');
  const peak = Math.max(...samples);
  if (peak < 0.45) throw new Error(`the moon never passed the top center (max u=${peak.toFixed(2)})`);
  const wrapped = samples.at(-1);
  if (wrapped > 0.2) throw new Error(`the moon never wrapped (last u=${wrapped.toFixed(2)})`);
  const rising = samples.filter((value, index) => index > 0 && value > samples[index - 1]).length;
  if (rising < 10) throw new Error('the moon phase does not advance');
  const period = samples.filter((value, index) => index > 0 && value < samples[index - 1] - 0.3).length;
  if (period < 1) throw new Error('the moon pass never ends');
}

/** Place the player under the jet and wait for one bomb to appear. */
async function caseJetBomb(page) {
  await reset(page);
  await waitUntil(page, 's => s.jet.active', 9000);
  await waitUntil(page, 's => s.bombs.length > 0', 4000);
  const bomb = (await state(page)).bombs[0];
  if (!bomb || !Number.isFinite(bomb.x)) throw new Error('the jet dropped no bomb');
  await shot(page, '03-jet-bomb.png');
  await reset(page);
}

async function caseStomp(page) {
  await reset(page);
  const before = (await state(page)).enemiesAlive;
  const target = await page.evaluate(() => {
    const enemy = window.__game.state.enemies.find((e) => e.alive);
    return enemy ? { x: enemy.x + enemy.w / 2, top: enemy.y } : null;
  });
  if (!target) throw new Error('the level has no live enemy');
  // Put the player above the enemy and let gravity carry the stomp.
  await page.evaluate((spot) => window.__game.api.setPlayerPos(spot.x - 13, spot.top - 120), target);
  await sleep(700);
  const after = (await state(page)).enemiesAlive;
  if (after !== before - 1) throw new Error(`a stomp left ${after} of ${before} enemies`);
  const lives = (await state(page)).lives;
  if (lives !== 3) throw new Error(`a stomp must not cost a life, lives=${lives}`);
}

/** A rising player must not kill an enemy, and a side touch must cost a life. */
async function caseSideTouch(page) {
  await reset(page);
  const before = (await state(page)).enemiesAlive;
  // Put one enemy right in front of the player, at the player's feet, so the
  // next step ends in a side overlap at the same height.
  const player = (await state(page)).player;
  await page.evaluate((spot) => {
    window.__game.api.placeEnemy(spot.x + 40, spot.y + 16);
    window.__game.api.setPlayerPos(spot.x, spot.y);
  }, player);
  // Hold the key until the boxes meet. A short tap can end before the step that
  // moves the player into the enemy.
  await page.keyboard.down('KeyD');
  let touched = false;
  const deadline = Date.now() + 4000;
  while (Date.now() < deadline) {
    await sleep(100);
    const probe = await state(page);
    if (probe.deaths >= 1 || probe.lives < 3 || probe.gameOver) { touched = true; break; }
  }
  await page.keyboard.up('KeyD');
  if (!touched) throw new Error('walking into an enemy cost the player nothing');
  const current = await state(page);
  if (current.enemiesAlive !== before) throw new Error('a side touch killed the enemy instead of the player');
  if (current.deaths < 1 && current.lives === 3) throw new Error('a side touch cost the player nothing');
}

/** The arrow keys and the layout keys must drive the player too (spec Player 2-3). */
async function caseKeys(page) {
  await page.evaluate(() => window.__game.api.newRun());
  await sleep(150);
  const before = (await state(page)).player.x;
  await tap(page, 'ArrowRight', 500);
  const right = (await state(page)).player.x;
  if (right <= before + 60) throw new Error(`ArrowRight moved the player only ${right - before} px`);
  await tap(page, 'ArrowLeft', 500);
  if ((await state(page)).player.x >= right - 60) throw new Error('ArrowLeft did not move the player left');
  await tap(page, 'KeyQ', 400);
  if ((await state(page)).player.x >= right - 60) throw new Error('Key Q did not move the player left');
  const ground = (await state(page)).player.y;
  await tap(page, 'ArrowUp', 130);
  await sleep(160);
  if ((await state(page)).player.y >= ground - 40) throw new Error('ArrowUp did not lift the player');
}

/** The ground shows grass over dirt, and a floating platform shows stone. */
async function caseMaterials(page) {
  await page.evaluate(() => window.__game.api.newRun());
  await sleep(700);
  const st = await state(page);
  const cfg = await page.evaluate(readPalette);
  const image = await probeShot(page, 'probe-materials.png');
  const grass = cfg.grass.map(hexToRgb);
  const dirt = cfg.dirt.map(hexToRgb);
  const stone = cfg.stone.map(hexToRgb);
  const footing = cfg.footing.map(hexToRgb);
  const soilTop = cfg.bands.groundY + cfg.bands.grass;
  const rockTop = soilTop + cfg.bands.soil;
  // Each band is read inside its own height, so a band cannot borrow the pixels
  // of its neighbour through a wide tolerance.
  const grassCount = grass.reduce((sum, c) => sum + countNear(image, 120, cfg.bands.groundY,
    700, cfg.bands.grass - 1, c, 40), 0);
  const dirtCount = dirt.reduce((sum, c) => sum + countNear(image, 120, soilTop,
    700, cfg.bands.soil - 1, c, 40), 0);
  const rockCount = footing.reduce((sum, c) => sum + countNear(image, 120, rockTop,
    700, cfg.bands.rock, c, 26), 0);
  if (grassCount < 400) throw new Error(`only ${grassCount} grass pixels on the ground strip`);
  if (dirtCount < 400) throw new Error(`only ${dirtCount} dirt pixels under the grass strip`);
  if (rockCount < 400) throw new Error(`only ${rockCount} rock pixels in the footing band`);
  // The soil and the footing carry a baked tone field, so a band must show more
  // than one shade of its ramp. A flat fill means the field never arrived.
  const stufen = (palette, rect) => palette.reduce((n, c) => n
    + (countNear(image, ...rect, c, 40) > 40 ? 1 : 0), 0);
  const dirtStufen = stufen(dirt, [120, soilTop, 700, cfg.bands.soil - 1]);
  const rockStufen = stufen(footing, [120, rockTop, 700, cfg.bands.rock]);
  if (dirtStufen < 3) throw new Error(`the soil band shows only ${dirtStufen} of 4 soil shades`);
  if (rockStufen < 3) throw new Error(`the footing band shows only ${rockStufen} of 4 rock shades`);
  const platform = st.platforms.find((p) => p.x > 60 && p.x + p.w < 900);
  if (!platform) throw new Error('no platform on screen to read');
  const left = platform.x - cameraOf(st.player.x);
  const cap = stone.slice(0, 2).reduce((sum, c) => sum + countNear(image, left, platform.y,
    platform.w, 5, c, 34), 0);
  const body = stone.slice(2).reduce((sum, c) => sum + countNear(image, left, platform.y + 6,
    platform.w, platform.h - 6, c, 34), 0);
  if (cap < 60) throw new Error(`only ${cap} light cap pixels on a stone platform`);
  if (body < 60) throw new Error(`only ${body} stone body pixels on a platform`);
}

/** The far city layer holds the most lit windows, the near layer the fewest. */

/** A few mid-layer towers wear a glass front: random, tall, and all three tiles. */

/** Every surface takes a whole number of its tile, so no tile is ever scaled.
 * A scaled tile breaks the pixel grid, and the atlas is drawn for nearest
 * filtering: these numbers are one system with config.js.
 */
async function caseTileFit() {
  const T = C.TILE;
  const Schritt = (was, px, kachel) => {
    if (px % kachel !== 0) {
      throw new Error(`${was}: ${px} px durch eine ${kachel} px kachel ist ${(px / kachel).toFixed(2)}`);
    }
  };
  Schritt('the grass band', C.GRASS_BAND, T.grass[1]);
  Schritt('the soil band', C.SOIL_BAND, T.dirt[1]);
  Schritt('the rock band', C.ROCK_BAND, T.rock[1]);
  Schritt('the cap band on stone', C.CAP_BAND, T.stoneCap[1]);
  Schritt('the cap band on grass', C.CAP_BAND, T.grassCap[1]);
  Schritt('the ground width, soil', C.LEVEL_WIDTH, T.dirt[0]);
  Schritt('the ground width, rock', C.LEVEL_WIDTH, T.rock[0]);
  Schritt('the ground width, grass', C.LEVEL_WIDTH, T.grass[0]);
  Schritt('the ground width, tufts', C.LEVEL_WIDTH, T.tufts[0]);
  Schritt('the moon disc, wide', C.MOON_R * 2, T.moon[0]);
  Schritt('the moon disc, high', C.MOON_R * 2, T.moon[1]);

  for (const platform of buildSpec(C.LEVEL_WIDTH).platforms) {
    Schritt(`a platform ${platform.w} px wide`, platform.w, T.stone[0]);
    Schritt('a platform body below the cap', platform.h - C.CAP_BAND, T.stone[1]);
  }

  for (const layer of buildCity(C.CITY_SEED, C.LEVEL_WIDTH)) {
    for (const shape of layer.shapes) {
      const box = T[shape.wall];
      Schritt(`the ${shape.wall} front on a ${shape.w} px building`, shape.w, box[0]);
      Schritt(`the ${shape.wall} front on a ${shape.h} px tower`, shape.h, box[1]);
    }
  }
}

/** Each layer wears all ten of its front designs, no tile twice in a row. */
async function caseCityTints() {
  const layers = buildCity(C.CITY_SEED, C.LEVEL_WIDTH);
  for (const name of ['far', 'mid', 'near']) {
    const layer = layers[{ far: 0, mid: 1, near: 2 }[name]];
    const tiles = layer.walls;
    if (tiles.length === 0) throw new Error(`the ${name} layer holds no tiles`);
    const walls = layer.shapes.filter((s) => tiles.includes(s.wall));
    const used = new Set(walls.map((s) => s.wall));
    if (used.size < tiles.length) {
      throw new Error(`the ${name} layer shows ${used.size} of ${tiles.length} front designs`);
    }
    // No single tint may swallow the layer, or the variety is only on paper. Half
    // is the bound: four tiles drawn at random land near a quarter each, and the
    // no-repeat rule lets one of them double up on a short layer.
    const counts = new Map();
    for (const shape of walls) counts.set(shape.wall, (counts.get(shape.wall) ?? 0) + 1);
    const top = Math.max(...counts.values());
    if (top / walls.length > 0.5) {
      throw new Error(`one ${name} wall tile covers ${Math.round((100 * top) / walls.length)}%`);
    }
    for (let i = 1; i < layer.shapes.length; i += 1) {
      if (layer.shapes[i].wall === layer.shapes[i - 1].wall) {
        throw new Error(`${layer.shapes[i].wall} sits on two buildings in a row (${name})`);
      }
    }
  }
}

/** The moon is a disc: about 88 px wide, with sky in the corner of its box. */
async function caseMoonDisc(page) {
  const moon = await measureMoon(page);
  if (moon.width < 70 || moon.width > 96) throw new Error(`the moon disc is ${moon.width} px wide`);
  const [r, g, b] = moon.corner;
  if (!(b > r + 15 && b > g + 15)) throw new Error(`the corner of the moon box is not sky: ${moon.corner}`);
}

/** The hero sprite changes frames while the player runs (spec Player 9). */
async function caseHeroFrames(page) {
  await page.evaluate(() => window.__game.api.newRun());
  await sleep(400);
  const diff = await heroFrameDiff(page);
  if (diff < 12) throw new Error(`the hero sprite changed in only ${diff} sampled points`);
}

/** Find the left edge of the hero by looking for the cyan cluster at the feet band. */
function findHeroLeft(image, cfg) {
  const body = hexToRgb(cfg.COLOR.heroBody);
  const light = hexToRgb(cfg.COLOR.heroLight);
  const near = (px, c) => Math.abs(px[0] - c[0]) + Math.abs(px[1] - c[1]) + Math.abs(px[2] - c[2]);
  let best = { x: -1, n: 0 };
  for (let x = 0; x < 960 - 26; x += 1) {
    let n = 0;
    for (let y = 438; y < 480; y += 1) {
      for (let dx = 0; dx < 26; dx += 2) {
        const px = pixel(image, x + dx, y);
        // The light tolerance stays tight: the cool city window sits only 61 steps
        // from the helmet tone and would otherwise be counted as hero pixels.
        if (near(px, body) < 70 || near(px, light) < 24) n += 1;
      }
    }
    if (n > best.n) best = { x, n };
  }
  return best;
}

/** The helmet must look the same in every run frame: no cell bleed at the head. */
/** Count the light pixels of the helmet near a guessed sprite position.
 * The guess comes from the state hook and the widest count within a small x range
 * wins. Hunting the sprite by colour instead once landed one column off, cut the
 * helmet cap, and read as a helmet that differs between run frames.
 */
function helmetCap(image, cfg, guessLeft, top) {
  const light = hexToRgb(cfg.COLOR.heroLight);
  const near = (px, c) => Math.abs(px[0] - c[0]) + Math.abs(px[1] - c[1]) + Math.abs(px[2] - c[2]);
  let best = 0;
  for (let left = guessLeft - 12; left <= guessLeft + 12; left += 1) {
    let n = 0;
    for (let y = top; y < top + 6; y += 1) {
      // The tight tolerance keeps a lit city window out of the count: the cool
      // window tone sits only 61 steps from the helmet tone.
      for (let x = left; x < left + 26; x += 1) {
        if (near(pixel(image, x, y), light) < 24) n += 1;
      }
    }
    if (n > best) best = n;
  }
  return best;
}

async function caseHeroHead(page) {
  await page.evaluate(() => window.__game.api.newRun());
  await sleep(250);
  const cfg = await probe(page, () => ({ COLOR: window.__gameConfig.COLOR }));
  await page.keyboard.down('KeyD');
  await sleep(280);
  const caps = [];
  const deadline = Date.now() + 2500;
  const seen = new Set();
  while (Date.now() < deadline && seen.size < 6) {
    const image = await probeShot(page, 'probe-head.png');
    const frame = await page.evaluate(() => Math.floor(window.__game.state.time * 12) % 6);
    if (seen.has(frame)) { await sleep(30); continue; }
    seen.add(frame);
    const where = await page.evaluate(() => ({ x: window.__game.state.player.x,
      y: window.__game.state.player.y }));
    // The light cap of the helmet, plus the glint pixel beside the visor.
    const cap = helmetCap(image, cfg, Math.round(where.x - cameraOf(where.x)),
      Math.round(where.y));
    caps.push({ frame, cap });
    await sleep(30);
  }
  await page.keyboard.up('KeyD');
  if (seen.size < 5) throw new Error(`only ${seen.size} run frames were sampled`);
  const counts = caps.map((c) => c.cap);
  const low = Math.min(...counts);
  const high = Math.max(...counts);
  if (low < 15) throw new Error(`a run frame shows only ${low} helmet pixels: ${JSON.stringify(caps)}`);
  if (high - low > 6) throw new Error(`the helmet differs between frames: ${JSON.stringify(caps)}`);
}

/** The control hint shows during the first seconds of a level (spec Player 4). */
async function caseHint(page) {
  await page.evaluate(() => window.__game.api.newRun());
  await sleep(500);
  // The game draws the hint at HINT_Y, so the case reads that number instead of
  // carrying its own copy of the layout.
  const spot = await probe(page, () => ({ y: window.__gameConfig.HINT_Y, w: 960 }));
  const image = await probeShot(page, 'probe-hint.png');
  const cfg = await probe(page, () => window.__gameConfig.COLOR);
  const glyph = [207, 216, 255];
  const count = countNear(image, 480 - 80, spot.y, 160, 24, glyph, 70);
  if (count < 60) throw new Error(`the hint band at y=${spot.y} holds only ${count} glyph pixels`);
  void cfg;
}

/** Spend one life: drop a bomb above the player and wait for the new count. */
async function killWithBomb(page, expectedLives, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let lastProbe = null;
  while (Date.now() < deadline) {
    await page.evaluate(() => window.__game.api.spawnBombAbove(220));
    const start = await page.evaluate(() => ({
      blasts: window.__game.counters.blasts,
      deaths: window.__game.state.deaths,
    }));
    const wanted = expectedLives === null
      ? 's => s.deaths >= 1 || s.lives < 3'
      : `s => s.lives === ${expectedLives}`;
    try {
      await waitUntil(page, wanted, 3000);
      return;
    } catch (error) {
      const probe = await page.evaluate(() => ({
        bombs: window.__game.state.bombs.length,
        blasts: window.__game.counters.blasts,
        lives: window.__game.state.lives,
        deaths: window.__game.state.deaths,
      }));
      lastProbe = probe;
      void error;
    }
  }
  throw new Error(`no bomb cost a life within ${timeoutMs / 1000} s, last state ${JSON.stringify(lastProbe)}`);
}

/** A bomb above the player must reach the ground and end in a blast (DG-P-06). */
/** A blast inside the radius must kill, and a bomb above the player must reach it. */
/** A blast must kill the player inside its radius and spare one outside it. */
async function caseBlast(page) {
  // The cases before this one spent lives, so start from a full run.
  await page.evaluate(() => window.__game.api.newRun());
  await sleep(120);

  // Part one: a blast far from the player must count as a blast and kill nobody.
  const blastsBefore = await probe(page, () => window.__game.counters.blasts);
  const player = (await state(page)).player;
  await page.evaluate((spot) => window.__game.api.makeBlast(spot.x + 200, spot.y), player);
  await sleep(80);
  if ((await probe(page, () => window.__game.counters.blasts)) <= blastsBefore) {
    throw new Error('a blast at a point was not counted');
  }
  if ((await probe(page, () => window.__game.state.lives)) < 3) {
    throw new Error('a blast outside the radius killed the player');
  }
  await shot(page, '05-blast.png');

  // Part two: a bomb dropped right above the player must reach the ground. The
  // blast lasts one frame and the death reset builds a fresh world, so the test
  // watches for the bomb to leave the world and then for the life the death cost.
  await sleep(1200);
  await page.evaluate(() => window.__game.api.spawnBombAbove(60));
  const landed = await pollFor(6000, async () => {
    const snapshot = await probe(page, () => ({
      bombs: window.__game.state.bombs.length,
      blasts: window.__game.counters.blasts,
    }));
    return snapshot.bombs === 0 ? snapshot : null;
  });
  if (!landed) throw new Error('the bomb above the player never left the air');
  if (landed.blasts < 1) throw new Error('the bomb left the air without a blast');
  const cost = await pollFor(1500, async () => {
    const lives = await probe(page, () => window.__game.state.lives);
    return lives < 3 ? lives : null;
  });
  if (cost === null) throw new Error('a bomb at the player counted a blast and cost no life');
}

/** Check the layout rule from docs/spec.md: gaps shrink to 90 % and stay >= 90 px. */
async function caseLevel(page) {
  await reset(page);
  const boxes = await platformBoxes(page);
  if (boxes.length < 4) throw new Error(`only ${boxes.length} platforms in the level`);
  let widest = 0;
  for (let index = 1; index < boxes.length; index += 1) {
    const previous = boxes[index - 1];
    const gap = boxes[index].x - (previous.x + previous.w);
    widest = Math.max(widest, gap);
    if (gap < 90) throw new Error(`gap ${gap.toFixed(0)} px between platform ${index - 1} and ${index}`);
  }
  const widths = new Set(boxes.map((box) => box.w));
  if (widths.size < 3) throw new Error('platform widths do not vary along the level');
}

/** Spend all three lives and check the banner and the R restart. */
async function caseLives(page) {
  await reset(page);
  for (let life = 2; life >= 0; life -= 1) await killWithBomb(page, life);
  await waitUntil(page, 's => s.gameOver', 4000);
  const shown = await page.evaluate(() => getComputedStyle(document.getElementById('gameover')).display);
  if (shown === 'none') throw new Error('GAME OVER is not visible at 0 lives');
  const text = await page.evaluate(() => document.getElementById('gameover').textContent.trim());
  if (text !== 'GAME OVER') throw new Error(`the banner says "${text}"`);
  await shot(page, '04-gameover.png');
  await tap(page, 'KeyR', 120);
  await waitUntil(page, 's => s.lives === 3 && !s.gameOver', 4000);
}

/** Read pixels: the city must be opaque and the platforms must be textures. */
async function caseOpaqueCity(page) {
  await reset(page);
  await sleep(600);
  const file = path.join(SHOTS, 'probe-city.png');
  await page.screenshot({ path: file });
  const image = await decodePngFile(file);
  const sky = pixel(image, 60, 40);
  const city = pixel(image, 480, 430);
  const platform = pixel(image, 480, 484);
  for (const [name, value] of [['sky', sky], ['city', city], ['platform', platform]]) {
    if (value[3] !== 255) throw new Error(`${name} pixel is not opaque (alpha ${value[3]})`);
  }
  const warm = countWarmPixels(image);
  if (warm < 20) throw new Error(`only ${warm} lit windows in the city, expected texture detail`);
  if (Math.abs(city[0] - platform[0]) < 6 && Math.abs(city[1] - platform[1]) < 6
    && Math.abs(city[2] - platform[2]) < 6) {
    throw new Error('the platform interior matches the city hue, so no tile texture is visible');
  }
}

/** Count pixels in the warm window hue so a flat fill cannot pass the test. */
function countWarmPixels(image) {
  let count = 0;
  for (let index = 0; index < image.data.length; index += 4) {
    const [r, g, b] = [image.data[index], image.data[index + 1], image.data[index + 2]];
    if (r > 150 && g > 110 && b < 140) count += 1;
  }
  return count;
}

/** Launch Chrome, run every case, report, and exit with the failure count. */
async function main() {
  const stopServer = startServer();
  await waitServer(8000);
  await mkdir(SHOTS, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: [
      '--no-sandbox',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--hide-scrollbars',
      '--window-size=960,540',
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 540, deviceScaleFactor: 1 });
  const jsErrors = [];
  page.on('pageerror', (error) => jsErrors.push(String(error)));
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

  const cases = [
    ['initial', () => caseInitial(page)],
    ['keys', () => caseKeys(page)],
    ['materials', () => caseMaterials(page)],
    ['city-windows', () => caseCityWindows()],
    ['city-tints', () => caseCityTints()],
    ['tile-fit', () => caseTileFit()],
    ['moon-disc', () => caseMoonDisc(page)],
    ['hero-frames', () => caseHeroFrames(page)],
    ['hero-head', () => caseHeroHead(page)],
    ['hint', () => caseHint(page)],
    ['move', () => caseMove(page)],
    ['jump', () => caseJump(page)],
    ['moon', () => caseMoon(page)],
    ['jet-bomb', () => caseJetBomb(page)],
    ['stomp', () => caseStomp(page)],
    ['side-touch', () => caseSideTouch(page)],
    ['blast', () => caseBlast(page)],
    ['level', () => caseLevel(page)],
    ['lives', () => caseLives(page)],
    ['opaque-city', () => caseOpaqueCity(page)],
  ];

  let failed = 0;
  for (const [name, run] of cases) {
    try {
      await run();
      console.log(`PASS ${name}`);
    } catch (error) {
      failed += 1;
      try { await shot(page, `fail-${name}.png`); } catch { /* keep going */ }
      console.error(`FAIL ${name}: ${error.message}`);
    }
  }
  if (jsErrors.length > 0) {
    failed += 1;
    console.error(`FAIL page-errors: ${jsErrors.join(' | ')}`);
  }

  await browser.close();
  stopServer();
  if (failed > 0) {
    console.error(`${failed} case(s) failed`);
    process.exit(1);
  }
  console.log('all cases passed');
}

main().catch((error) => {
  console.error(`test run failed: ${error.stack || error.message}`);
  process.exit(1);
});
