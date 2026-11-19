# game2

A 2D platformer. It runs in the browser. It uses JavaScript and WebGL2.

The game is a sibling of `game1`. Both games follow the same spec. This project
was built from the documentation of `game1`, not from its code.

## Read first

- Shared rules: `standards/rules/` (a link to the rules clone)
- Project guidelines: `design-guidelines/`
- Game spec (source of truth): `docs/spec.md`
- Lessons learned (read before touching art, geometry, or tooling): `docs/lessons.md`
- User documentation: `docs/`

## Project facts

- `docs/spec.md` is the source of truth for game behaviour.
- Start the game with `python3 -m http.server 8766 -d src`. Open `http://localhost:8766`. `game1` serves its game on 8765, so both run at the same time.
- Run the headless test with `node tests/run-tests.mjs`. It writes screenshots to `shots/`.
- Game code lives in `src/`. Tests live in `tests/`. Each code folder has its own `README.md`.
- `standards/` is a symbolic link. Never commit content of it. It sits in `.gitignore`.

## Before you commit

1. Run `python3 standards/scripts/check_docs.py docs design-guidelines`.
2. Run `python3 standards/scripts/check_readmes.py .`.
3. Run `node --check <file>` for every JavaScript file you changed.
4. Run the headless test. Check that it passes.
5. Update `docs/` when the behaviour changes.
6. Read the `README.md` of every folder you changed and fix what no longer matches.

## Where changes go

| Change | Folder |
|---|---|
| Game code | `src/` |
| Tests | `tests/` |
| Behaviour change | `docs/spec.md` |
| Design decision | `design-guidelines/game2.md` |

## What you must not do

- Do not copy code from `game1`. This project builds from its documentation.
- Do not edit files through `standards`. That path is a link to one shared clone. See rule R-R-05.
