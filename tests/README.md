# tests

The headless test for the game. It starts a static server, drives Chrome with
`puppeteer-core`, asserts the numbers from the `window.__game` hook, checks
pixels in a screenshot, and writes the shots to `shots/`. See rule `DG-P-08`.

## Run it

```bash
npm test                        # every case, port 8766
node tests/run-tests.mjs        # the same, without npm
node tests/run-tests.mjs --help # usage and the case list
PORT=8801 node tests/run-tests.mjs   # another port, so two games can run at once
```

| Variable | Meaning | Default |
|---|---|---|
| `PORT` | the port of the static server | `8766` |
| `CHROME_PATH` | the Chrome binary | `/usr/bin/google-chrome-stable` |

The run needs the system Chrome and the pinned `puppeteer-core` from
`package.json`. It downloads no browser. `node_modules/` and `shots/` stay out of
Git. Exit is 0 when every case passed, 1 with the failed names.

## The files

| File | Task |
|---|---|
| `run-tests.mjs` | The server, the browser, the cases, the report. |
| `png-decode.mjs` | A small PNG reader with no library, for the pixel checks. |

## The cases

| Case | What it checks |
|---|---|
| `initial` | the hook answers, the run starts with 3 lives |
| `keys` | ArrowRight, ArrowLeft, and Q move; ArrowUp jumps |
| `materials` | grass over dirt on the ground, stone body and light cap on a platform |
| `city-windows` | the far layer holds the most lit windows, the near layer the fewest |
| `city-glass` | a few mid-layer towers wear a glass front: random, tall, all three tiles, never the same one twice in a row |
| `moon-disc` | the moon measures about 88 px wide and its box corner is sky |
| `hero-frames` | the hero sprite shows different frames while the player runs |
| `hero-head` | the helmet cap is identical in all six run frames, so no atlas cell overlaps the head |
| `hint` | the control hint shows during the first seconds of a level |
| `move` | D moves right, A moves left |
| `jump` | W lifts the player and gravity brings them back |
| `moon` | one full pass: u rises past the top center, then wraps to 0 |
| `jet-bomb` | the jet crosses the screen and drops a bomb |
| `stomp` | a fall onto an enemy kills it and costs no life |
| `side-touch` | walking into an enemy costs the player a life, not the enemy |
| `blast` | a blast far away kills nobody, a bomb above the player costs a life |
| `level` | gaps are at least 90 px and widths vary along the level |
| `lives` | three deaths show GAME OVER, R restarts the run with 3 lives |
| `opaque-city` | sky, city, and platform pixels are opaque; the city holds lit windows |

Run one case by hand while you work on the picture: the script prints one line per
case and writes `shots/probe-*.png` for the pixel cases.

## Reading the hook

`src/main.js` rebuilds `window.__game` every frame. Read a value inside
`page.evaluate` and return it, never keep a reference to the object across a
frame:

```js
const lives = await page.evaluate(() => window.__game.state.lives);
```

`state` holds the world as plain JSON. `counters` holds the numbers of the whole
run: `blasts` survives the reset that follows a death, so a test can wait for an
explosion even when the death already built a new world. `api` can reset the
level (`reset`), start a full new run (`newRun`), place the player
(`setPlayerPos`), place an enemy (`placeEnemy`), drop a bomb above the player
(`spawnBombAbove`), and explode a blast at a point (`makeBlast`).

A failed case also writes `shots/fail-<case>.png`. Read that image before you
change the game: it shows what the player saw at the failed moment.

A predicate for `page.waitForFunction` as a plain string of an arrow function is
always true, because the page evaluates the function object. Use `waitUntil(page,
's => ...', ms)`; it evals the source and calls it with the state.
