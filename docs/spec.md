# Game spec

This file is the source of truth for what the game does. Code follows this file.

The text is the game1 spec. The two games follow the same rules, so a value in
this file is the same value in `game1`.

## Scope

The game is a 2D platformer. It runs in the browser. It uses JavaScript and WebGL.

## Player

1. The player is a figure on platforms.
2. Key A moves the player left. Key D moves the player right.
3. The Space key jumps. The W key also jumps.
4. Gravity pulls the player down. The player lands on platforms.
5. A side touch from an enemy kills the player.
6. A bomb blast kills the player.
7. After death, the game takes one life and restarts the level.

## Enemies

1. Enemies walk back and forth on platforms.
2. They turn at the platform edge.
3. A stomp on top of an enemy kills the enemy.
4. A stomp needs a falling player. A rising player does not kill.

## Jet and bombs

1. A jet flies over the screen every few seconds.
2. The jet drops a bomb near the player.
3. The bomb falls. The bomb explodes on the ground.
4. The blast kills the player inside the blast radius.
5. The player must dodge.

## Background

1. Houses and towers fill the background.
2. The background moves slower than the player. This is a parallax effect.
3. The game uses three layers or more.
4. The three city layers are fully opaque. The moon and stars never show through buildings.
5. The game draws city layers, platforms, and entities from 2D textures. It does not use flat color rectangles for them.

## Level geometry

1. The gap between neighbouring platforms is at most 90 percent of the previous layout. No gap is smaller than 90 px.
2. Platform gaps and widths vary along the level.

## Lives and game over

1. The player starts with 3 lives.
2. The game shows the lives as hearts at the top-left of the screen. The hearts stay fixed on the screen. They do not move with the camera.
3. A death costs one life and restarts the level.
4. At 0 lives the game shows "GAME OVER" and stops. The player presses R to restart with 3 lives.

## Moon

1. A moon crosses the sky.
2. It rises at the left bottom. It passes the top middle. It sets at the right bottom.
3. The path is an ellipse arc.
4. One pass takes about 10 seconds.

## Test

1. A test script starts the game in a headless browser.
2. The script presses keys and checks the game state.
3. The script saves screenshots to `shots/`.
