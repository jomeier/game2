# src

The game. Logic modules read state and change state; the `render/` folder only
draws it. `index.html` loads `main.js` as an ES module, so the folder needs no
build step. See `design-guidelines/game2.md` for the rules behind the numbers.

## The files

| File | Task |
|---|---|
| `index.html` | The page: the canvas, the GAME OVER headline, the module load. |
| `main.js` | The game loop, the module wiring, the camera, the `window.__game` hook. |
| `config.js` | Every tuning number and every color. A test reads them through `window.__gameConfig`. |
| `input.js` | The held-key map from the browser key events. |
| `physics.js` | Movement, landing, the stomp test, the ground probe for a walker. |
| `entities.js` | One fixed step: the player, the enemies, the jet, the bombs, the blasts. |
| `level.js` | The platform layout, the enemy spawns, the fresh world for a level. |
| `hud.js` | The hearts for the lives, in screen space. |
| `hook.js` | The shape of the test hook as a comment. Code does not import it. |
| `render/` | WebGL2: the context, the programs, the atlas, the sky, the city. |

## Run it

```bash
python3 -m http.server 8766 -d src      # then open http://localhost:8766
```

The game needs WebGL2. A headless run needs Chrome with SwiftShader; the test
script passes those flags. See [../tests/README.md](../tests/README.md).

## Keys

| Key | Action |
|---|---|
| A / D | move left, move right |
| Space / W | jump |
| R | restart after GAME OVER |

## The module rule

`config.js` holds every number. Logic modules import `config.js` and each other;
no logic module imports from `render/`. `main.js` calls logic first, then render.
Render never changes state. See rule `DG-P-02`.

`main.js` also owns the test hook `window.__game`. It publishes plain JSON only,
and it rebuilds the object every frame, so a test must read the values inside a
`page.evaluate` call and never keep a reference across a frame.
