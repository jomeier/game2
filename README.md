# game2

A 2D platformer in the browser. JavaScript with WebGL2.

The game is a sibling of `game1`. It follows the same spec and the same design
decisions, rebuilt from that documentation instead of from its code. See
[docs/spec.md](docs/spec.md) and [design-guidelines/game2.md](design-guidelines/game2.md).

Start: `python3 -m http.server 8766 -d src` then open `http://localhost:8766`.
Test: `npm test`, which runs `node tests/run-tests.mjs`. Screenshots land in `shots/`.

See [AGENTS.md](AGENTS.md) for the rules and [docs/spec.md](docs/spec.md) for the game spec.

## What the game does

- A player runs and jumps over platforms: keys A and D, Space or W to jump.
- Enemies patrol platforms. A stomp from above kills them, a side touch kills the player.
- A jet crosses the sky every 6 seconds and drops a bomb that explodes on the ground.
- Three opaque city layers move with parallax; a moon crosses the sky on an ellipse arc.
- Three lives, hearts at the top-left, GAME OVER with R to restart.

## Folders

| Folder | Purpose |
|---|---|
| `src/` | The game. Logic modules and the `render/` folder. |
| `tests/` | The headless Chrome test and its PNG decoder. |
| `docs/` | The spec and the art references. |
| `design-guidelines/` | The design decisions for this project. |
| `shots/` | Test screenshots. Not in Git. |
| `standards` | Symbolic link to the rules clone. Not in Git. |
