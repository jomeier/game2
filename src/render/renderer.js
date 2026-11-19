// The WebGL2 drawing layer of game2 (DG-P-02, DG-P-09, DG-P-10).
// It owns the context, the atlas texture, and the draw queue. A draw* call only
// pushes work; flush() sorts the queue by program and layer and runs it once.
// This module reads world state and never changes it: the sprite frame an entity
// shows is derived from world.time here, so an animation needs no extra state.

import * as C from '../config.js';
import { createPrograms } from './shaders.js';
import { createAtlas } from './textures.js';
import { buildCity, moonPos, starField, horizonBand } from './background.js';

// One shared unit quad, uploaded once: a_unit spans [-1, 1].
const QUAD = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

// The layer numbers of the DG-P-09 draw order. A bigger number draws later.
const LAYER = {
  sky: 0, horizon: 5, star: 10, moonGlow: 20, moon: 21,
  city: 30, ground: 40, platform: 50, shadow: 60, jet: 61, bomb: 62,
  enemy: 63, hero: 64, blast: 70, hint: 80, heart: 90,
};

/** Return [r, g, b, a] in 0..1 for a #rrggbb string or a rgba() string. */
export function parseColor(text) {
  if (text.startsWith('#')) {
    const value = parseInt(text.slice(1), 16);
    return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255, 1];
  }
  const parts = text.match(/[\d.]+/g).map(Number);
  return [parts[0] / 255, parts[1] / 255, parts[2] / 255, (parts[3] ?? 1) / 1];
}

/** Return how many times a tile of tilePx fills px pixels, at least once. */
function tileCount(px, tilePx) {
  return Math.max(1, Math.round(px / tilePx));
}

/** Return the tile record mirrored on x, so a right-facing sprite faces left. */
function mirrored(tile) {
  return { uv: [tile.uv[2], tile.uv[1], tile.uv[0], tile.uv[3]], w: tile.w, h: tile.h };
}

/** Return the sprite frame name a hero shows now. Run, idle, jump, fall, or hurt. */
function heroFrame(atlas, hero, player, time) {
  if (!player.alive) return hero.hurt;
  if (!player.landed) return player.vy < 0 ? hero.jump : hero.fall;
  if (Math.abs(player.vx) > 1) {
    const step = Math.floor(time * C.ANIM_RUN_FPS) % hero.run.length;
    return hero.run[step];
  }
  const step = Math.floor(time * C.ANIM_IDLE_FPS) % hero.idle.length;
  return hero.idle[step];
}

/** Return the sprite frame name an enemy shows now. */
function enemyFrame(atlas, frames, enemy) {
  const list = enemy.dir > 0 ? frames.right : frames.left;
  const step = Math.floor((enemy.x + (enemy.dir > 0 ? 0 : 999)) / 8) % list.length;
  return list[Math.abs(step) % list.length];
}

/** Return a new renderer for one canvas. */
export async function createRenderer(canvas) {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false });
  if (!gl) throw new Error('WebGL2 is not available');
  const programs = createPrograms(gl);
  const atlas = await createAtlas(gl);
  const city = buildCity(C.CITY_SEED, C.LEVEL_WIDTH);
  // One light rim hue per layer, back to front.
  const edgeKeys = ['edgeLightFar', 'edgeLightMid', 'edgeLightNear'];
  const stars = starField(C.CITY_SEED);
  const horizon = horizonBand();

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);
  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  let queue = [];

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
      // Two textures, one sampler: the house sprites live on their own upload
      // because they arrive as pictures, so the draw says which unit the sampler
      // should read. Only the city layers ever switch, a handful of times a frame.
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, atlas.texture);
      gl.uniform1i(program.uniforms.u_atlas, 0);
      if (item.sprite) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, atlas.spriteTexture);
        gl.uniform1i(program.uniforms.u_atlas, 1);
      }
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /** Sort the queue by layer and program, then draw every item. */
  function flush() {
    const first = { quad: 0, glow: 1, atlas: 2 };
    queue.sort((a, b) => (a.order - b.order) || (first[a.program] - first[b.program]));
    for (const item of queue) run(item);
  }

  /** Queue one atlas tile over a pixel rect, tiled by whole repeats. A sprite tile
   * is drawn once, at its own size: it owns a whole building.
   */
  function rect(order, tile, x, y, w, h, tilesX, tilesY) {
    push(order, {
      program: 'atlas',
      texture: true,
      sprite: tile.sprite === true,
      uniforms: {
        u_rect: [x, y, w, h],
        u_uv: tile.uv,
        u_tiles: [tilesX ?? tileCount(w, tile.w), tilesY ?? tileCount(h, tile.h)],
      },
    });
  }

  /** Queue one flat color rect with an optional vertical gradient. */
  function solid(order, x, y, w, h, color, color2 = null, alpha = 1) {
    push(order, {
      program: 'quad',
      uniforms: {
        u_rect: [x, y, w, h],
        u_color: [...parseColor(color).slice(0, 3), alpha],
        u_color2: [...parseColor(color2 || color).slice(0, 3), alpha],
        u_grad: color2 ? 1 : 0,
      },
    });
  }

  /** Queue one soft radial disc. */
  function glow(order, x, y, radius, color, inner, intensity) {
    push(order, {
      program: 'glow',
      uniforms: {
        u_circle: [x, y, radius],
        u_color: parseColor(color),
        u_inner: inner,
        u_intensity: intensity,
      },
    });
  }

  /** Queue the sky, the horizon haze, the stars, and the moon. */
  function drawSky(world) {
    solid(LAYER.sky, 0, 0, C.VIEW_W, C.VIEW_H, C.COLOR.skyTop, C.COLOR.skyBottom);
    for (const band of horizon) {
      solid(LAYER.horizon, 0, band.y, C.VIEW_W, band.h, band.color, null, band.alpha);
    }
    for (const star of stars) {
      const twinkle = 0.55 + 0.45 * Math.sin(world.time * star.speed + star.phase);
      solid(LAYER.star, star.x, star.y, star.size, star.size, C.COLOR.star, null, twinkle);
      if (star.size > 2) rect(LAYER.star, atlas.tiles.spark, star.x - 3, star.y - 3, 8, 8);
    }
    const moon = moonPos(world.moonTime);
    if (moon.y < C.VIEW_H + C.MOON_R) {
      glow(LAYER.moonGlow, moon.x, moon.y, C.MOON_R * 3.6, C.COLOR.moon, 0.2, 0.5);
      const size = C.MOON_R * 2;
      rect(LAYER.moon, atlas.tiles.moon, moon.x - C.MOON_R, moon.y - C.MOON_R, size, size, 1, 1);
    }
  }

  /** Queue the three city rows. The far row is a tiled wall with a light rim; the
   * mid and the near row are sprites that carry their own crown, outline and lit
   * roof edge, so nothing is painted over them.
   */
  function drawCity(world, cameraX) {
    city.forEach((layer, index) => {
      const edgeLight = C.COLOR[edgeKeys[index]];
      for (const shape of layer.shapes) {
        const x = Math.round(shape.x - cameraX * layer.factor);
        if (x + shape.w < -20 || x > C.VIEW_W + 20) continue;
        const tile = atlas.tiles[shape.wall];
        rect(LAYER.city + index, tile, x, shape.y, shape.w, shape.h);
        if (tile.sprite) continue;
        if (shape.prop) {
          const prop = atlas.tiles[shape.prop];
          rect(LAYER.city + index, prop, x + Math.round(shape.w / 2 - prop.w / 2),
            shape.y - prop.h, prop.w, prop.h, 1, 1);
        }
        // The two side bands separate one tiled tower from the next. No band across
        // the top: the sprite rows in front are taller, so a horizontal line at the
        // head of a far tower would float free in the sky.
        solid(LAYER.city + index, x, shape.y, 1, shape.h, edgeLight);
        solid(LAYER.city + index, x + shape.w - 1, shape.y, 1, shape.h, C.COLOR.edgeDark);
      }
    });
  }

  /** Queue the grass ground and the stone platforms, both with a lit top edge. */
  function drawSolids(world, cameraX) {
    const ground = world.ground;
    const gx = ground.x - cameraX;
    // Soil, then the rock footing under it, so the band below the grass has mass.
    const soilH = Math.min(C.SOIL_BAND, ground.h - C.GRASS_BAND - C.ROCK_BAND);
    rect(LAYER.ground, atlas.tiles.grass, gx, ground.y, ground.w, C.GRASS_BAND);
    rect(LAYER.ground, atlas.tiles.dirt, gx, ground.y + C.GRASS_BAND, ground.w, soilH);
    rect(LAYER.ground, atlas.tiles.rock, gx, ground.y + C.GRASS_BAND + soilH, ground.w,
      ground.h - C.GRASS_BAND - soilH);
    // Blades rise above the line the feet stand on.
    const tuft = atlas.tiles.tufts;
    rect(LAYER.ground, tuft, gx, ground.y - tuft.h, ground.w, tuft.h,
      tileCount(ground.w, tuft.w), 1);
    for (const platform of world.platforms) {
      const x = platform.x - cameraX;
      if (x + platform.w < 0 || x > C.VIEW_W) continue;
      rect(LAYER.platform, atlas.tiles.stone, x, platform.y + C.CAP_BAND, platform.w,
        platform.h - C.CAP_BAND);
      rect(LAYER.platform, atlas.tiles.stoneCap, x, platform.y, platform.w, C.CAP_BAND,
        tileCount(platform.w, atlas.tiles.stoneCap.w), 1);
    }
  }

  /** Queue one entity with its ground shadow: the hero, or one blob enemy. */
  function drawEntity(box, frameName, cameraX, order) {
    const tile = atlas.tiles[frameName];
    const x = Math.round(box.x - cameraX);
    const shadow = atlas.tiles.shadow;
    // The shadow is drawn at its own tile width, so it is never scaled: the tile
    // is already a little wider than the 26 px box it sits under.
    const wide = shadow.w;
    rect(LAYER.shadow, shadow, x - Math.round((wide - box.w) / 2), box.y + box.h - 3,
      wide, shadow.h, 1, 1);
    const drawTile = box.facingLeft ? mirrored(tile) : tile;
    // The sprite is anchored on its feet, so its bottom stays on the platform.
    rect(order, drawTile, x - Math.round((tile.w - box.w) / 2),
      Math.round(box.y + box.h - tile.h), tile.w, tile.h, 1, 1);
  }

  /** Queue the enemies, the jet, the bombs, the hero, and the blast effects. */
  function drawEntities(world, cameraX) {
    for (const enemy of world.enemies) {
      const name = enemyFrame(atlas, atlas.enemy, enemy);
      if (enemy.dead) {
        const tile = atlas.tiles[name];
        const squashed = Math.max(5, Math.round(tile.h * (enemy.squash / C.ENEMY_SQUASH_S)));
        rect(LAYER.enemy, mirrored(tile), Math.round(enemy.x - cameraX),
          Math.round(enemy.y + enemy.h - squashed), tile.w, squashed, 1, 1);
        continue;
      }
      drawEntity({ ...enemy, facingLeft: enemy.dir < 0 }, name, cameraX, LAYER.enemy);
    }
    if (world.jet.active) {
      const x = Math.round(world.jet.x - cameraX);
      const tile = atlas.tiles.jet;
      glow(LAYER.jet, x + C.JET_W / 2, C.JET_Y + C.JET_H / 2, 30, C.COLOR.jet, 0.1, 0.22);
      rect(LAYER.jet, tile, x, C.JET_Y, tile.w, tile.h, 1, 1);
    }
    for (const bomb of world.bombs) {
      const tile = atlas.tiles.bomb;
      rect(LAYER.bomb, tile, Math.round(bomb.x - tile.w / 2 - cameraX), Math.round(bomb.y - tile.h),
        tile.w, tile.h, 1, 1);
    }
    const player = world.player;
    drawEntity({ ...player, facingLeft: player.facing < 0 },
      heroFrame(atlas, atlas.hero, player, world.time), cameraX, LAYER.hero);
    for (const blast of world.blasts) {
      const life = 1 - blast.age / C.BLAST_FLASH_S;
      glow(LAYER.blast, blast.x - cameraX, blast.y, blast.radius, C.COLOR.blast, 0.05, life);
      glow(LAYER.blast, blast.x - cameraX, blast.y, blast.radius * 0.5, C.COLOR.blastHot, 0, life);
      for (let i = 0; i < 7; i += 1) {
        const angle = (i / 7) * Math.PI * 2;
        const reach = blast.radius * (1 - life * 0.6);
        solid(LAYER.blast, blast.x - cameraX + Math.cos(angle) * reach - 2,
          blast.y + Math.sin(angle) * reach - 2, 5, 5, C.COLOR.blast, null, life);
      }
    }
  }

  /** Queue the control hint during the first seconds of the level (DG-P-13). */
  function drawHint(world) {
    if (world.time > C.HINT_SECONDS || world.gameOver) return;
    const tile = atlas.tiles.hintMove;
    solid(LAYER.hint - 1, Math.round(C.VIEW_W / 2 - tile.w / 2) - 6, C.HINT_Y - 5,
      tile.w + 12, tile.h + 10, C.COLOR.skyTop, null, 0.55);
    rect(LAYER.hint, tile, Math.round(C.VIEW_W / 2 - tile.w / 2), C.HINT_Y, tile.w, tile.h, 1, 1);
  }

  /** Queue the hearts in screen space, drawn last. */
  function drawHud(world) {
    for (const heart of world.hearts) {
      const tile = heart.full ? atlas.tiles.heartFull : atlas.tiles.heartSpent;
      rect(LAYER.heart, tile, heart.x, heart.y, tile.w, tile.h, 1, 1);
    }
  }

  /** One frame: the sky, the world in camera space, then the HUD. */
  function draw(world, cameraX) {
    queue = [];
    gl.clearColor(...parseColor(C.COLOR.skyTop), 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    drawSky(world);
    drawCity(world, cameraX);
    drawSolids(world, cameraX);
    drawEntities(world, cameraX);
    drawHint(world);
    drawHud(world);
    flush();
  }

  return { draw, gl, programs, atlas };
}
