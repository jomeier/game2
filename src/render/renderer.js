// The WebGL2 drawing layer of game2 (DG-P-02, DG-P-09).
// It owns the context, the atlas texture, and the draw queue.
// A draw* call only pushes work; draw() sorts it by program and runs it once.
// This module reads world state and never changes it.

import * as C from '../config.js';
import { createPrograms } from './shaders.js';
import { createAtlas } from './textures.js';
import { buildCity, layerTiles, moonPos, starField } from './background.js';

// Three programs mean at most three uploads of the shared unit quad.
const QUAD = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

/** Return [r, g, b, a] in 0..1 for a #rrggbb string or a rgba() string. */
export function parseColor(text) {
  if (text.startsWith('#')) {
    const value = parseInt(text.slice(1), 16);
    return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255, 1];
  }
  const parts = text.match(/[\d.]+/g).map(Number);
  return [parts[0] / 255, parts[1] / 255, parts[2] / 255, (parts[3] ?? 1)];
}

/** Return a new renderer for one canvas. */
export function createRenderer(canvas) {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false });
  if (!gl) throw new Error('WebGL2 is not available');
  const programs = createPrograms(gl);
  const atlas = createAtlas(gl);
  const city = buildCity(C.CITY_SEED, C.LEVEL_WIDTH);
  const stars = starField(C.CITY_SEED);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);
  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  let queue = [];

  /** Reset the queue for one frame. */
  function beginFrame() {
    queue = [];
  }

  /** Push one draw item. `order` keeps the layer order of DG-P-09. */
  function push(order, item) {
    queue.push({ order, ...item });
  }

  /** Run one queued item against its program. */
  function run(item) {
    const program = programs[item.program];
    gl.useProgram(program.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(program.aUnit);
    gl.vertexAttribPointer(program.aUnit, 2, gl.FLOAT, false, 0, 0);
    for (const [name, value] of Object.entries(item.uniforms)) {
      const location = program.uniforms[name];
      if (location === undefined) continue;
      if (typeof value === 'number') gl.uniform1f(location, value);
      else if (value.length === 4) gl.uniform4fv(location, value);
      else if (value.length === 3) gl.uniform3fv(location, value);
      else gl.uniform2fv(location, value);
    }
    if (item.texture) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, atlas.texture);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /** Sort the queue by program and layer order, then draw every item. */
  function flush() {
    const first = { quad: 0, glow: 1, atlas: 2 };
    queue.sort((a, b) => (a.order - b.order) || (first[a.program] - first[b.program]));
    for (const item of queue) run(item);
  }

  /** One frame: the sky first, then the world in camera space, then the HUD. */
  function draw(world, cameraX) {
    beginFrame();
    gl.clearColor(...parseColor(C.COLOR.skyTop), 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    drawSky(world);
    drawWorld(world, cameraX, atlas);
    drawHud(world, atlas);
    flush();
  }

  /** Queue the sky gradient, the stars, and the moon. */
  function drawSky(world) {
    push(0, {
      program: 'quad',
      uniforms: {
        u_rect: [0, 0, C.VIEW_W, C.VIEW_H],
        u_color: parseColor(C.COLOR.skyTop),
        u_color2: parseColor(C.COLOR.skyBottom),
        u_grad: 1,
      },
    });
    for (const star of stars) {
      push(10, {
        program: 'quad',
        uniforms: { u_rect: [star.x, star.y, star.size, star.size], u_color: parseColor(C.COLOR.star), u_color2: parseColor(C.COLOR.star), u_grad: 0 },
      });
    }
    const moon = moonPos(world.moonTime);
    if (moon.y < C.VIEW_H + C.MOON_R) {
      push(20, {
        program: 'glow',
        uniforms: {
          u_circle: [moon.x, moon.y, C.MOON_R * 3.4],
          u_color: parseColor(C.COLOR.moon),
          u_inner: 0.24,
          u_intensity: 0.55,
        },
      });
      push(21, {
        program: 'quad',
        uniforms: { u_rect: [moon.x - C.MOON_R, moon.y - C.MOON_R, C.MOON_R * 2, C.MOON_R * 2], u_color: parseColor(C.COLOR.moon), u_color2: parseColor(C.COLOR.moon), u_grad: 0 },
      });
    }
  }

  /** Queue one textured rect in screen pixels. `shift` moves it with the camera. */
  function worldRect(order, tile, shift, x, y, w, h, tilesX = 1, tilesY = 1) {
    push(order, {
      program: 'atlas',
      texture: true,
      uniforms: {
        u_rect: [x - shift, y, w, h],
        u_uv: tile.uv,
        u_tiles: [tilesX, tilesY],
      },
    });
  }

  /** Queue the city layers, the platforms, and every entity in DG-P-09 order. */
  function drawWorld(world, cameraX, atlas) {
    const layers = layerTiles().map((key) => atlas[key]);
    for (let index = 0; index < city.length; index += 1) {
      const layer = city[index];
      for (const shape of layer.shapes) {
        const x = shape.x - cameraX * layer.factor;
        if (x + shape.w < 0 || x > C.VIEW_W) continue;
        worldRect(30 + index, layers[index], 0, x, shape.y, shape.w, shape.h,
          Math.max(1, Math.round(shape.w / 16)), Math.max(1, Math.round(shape.h / 16)));
      }
    }
    drawSolids(world, cameraX, atlas);
    drawEntities(world, cameraX, atlas);
  }

  /** Queue the ground and the platforms: rock body plus one cap row on top. */
  function drawSolids(world, cameraX, atlas) {
    for (const solid of [world.ground, ...world.platforms]) {
      const x = solid.x - cameraX;
      if (x + solid.w < 0 || x > C.VIEW_W) continue;
      worldRect(50, atlas.rock, 0, x, solid.y + 3, solid.w, solid.h - 3,
        Math.max(1, Math.round(solid.w / 16)), 1);
      worldRect(51, atlas.cap, 0, x, solid.y, solid.w, 3, Math.max(1, Math.round(solid.w / 16)), 1);
    }
  }

  /** Queue the enemies, the jet, the bombs, the player, and the blast flashes. */
  function drawEntities(world, cameraX, atlas) {
    for (const enemy of world.enemies) {
      const tile = enemy.dir > 0 ? atlas.enemyRight : atlas.enemyLeft;
      const height = enemy.dead ? Math.max(4, enemy.h * (enemy.squash / C.ENEMY_SQUASH_S)) : enemy.h;
      worldRect(60, tile, cameraX, enemy.x, enemy.y + enemy.h - height, enemy.w, height);
    }
    if (world.jet.active) {
      worldRect(61, atlas.jet, cameraX, world.jet.x, C.JET_Y, C.JET_W, C.JET_H, 3, 1);
    }
    for (const bomb of world.bombs) {
      worldRect(62, atlas.bomb, cameraX, bomb.x - C.BOMB_R, bomb.y - C.BOMB_R, C.BOMB_R * 2, C.BOMB_R * 2);
    }
    const player = world.player;
    worldRect(63, atlas.player, cameraX, player.x, player.y, player.w, player.h,
      Math.max(1, Math.round(player.w / 16)), Math.max(1, Math.round(player.h / 16)));
    for (const blast of world.blasts) {
      push(70, {
        program: 'glow',
        uniforms: {
          u_circle: [blast.x - cameraX, blast.y, blast.radius],
          u_color: parseColor(C.COLOR.blast),
          u_inner: 0.1,
          u_intensity: 1 - blast.age / C.BLAST_FLASH_S,
        },
      });
    }
  }

  /** Queue the hearts in screen space: no camera shift, drawn last (DG-P-09). */
  function drawHud(world, atlas) {
    for (const heart of world.hearts) {
      const tile = heart.full ? atlas.heartFull : atlas.heartSpent;
      push(90, {
        program: 'atlas',
        texture: true,
        uniforms: {
          u_rect: [heart.x, heart.y, heart.w, heart.h],
          u_uv: tile.uv,
          u_tiles: [1, 1],
        },
      });
    }
  }

  return { draw, beginFrame, gl, programs, atlas };
}
