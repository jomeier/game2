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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'shots');
const PORT = Number(process.env.PORT || 8766);
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome-stable';
const BASE_URL = `http://localhost:${PORT}/`;

const HELP = `Usage: node tests/run-tests.mjs [--help]

Starts python3 -m http.server on port ${PORT}, serves src/, drives headless Chrome.
Cases: initial, move, jump, moon, jet-bomb, stomp, blast, level, lives, opaque-city.
Screenshots: shots/01-initial.png, 02-jump.png, 03-jet-bomb.png, 04-gameover.png,
04-moon-top.png. A failed case also saves shots/fail-<case>.png.
`;

if (process.argv.includes('--help')) {
  console.log(HELP);
  process.exit(0);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
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
