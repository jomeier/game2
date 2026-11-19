// The runtime pixel-art atlas of game2 (DG-P-10).
// No image file ships with the game: this module paints every tile and sprite
// frame into one offscreen canvas at startup and uploads it once as a texture.
// Each material has a small ramp of 4 shades, so surfaces read as one hue with
// depth instead of as noise. Sprites are painted as frame strips: the renderer
// picks a frame from the world time, so the player runs and the enemies shuffle.
// A fixed seed keeps every pixel identical across runs, so shots stay comparable.

import * as C from '../config.js';

// One dark outline hue for every sprite, so a figure separates from any layer.
const OUTLINE = '#05070f';

/** Return a deterministic generator: same seed means the same picture. */
function seeded(seed) {
  let state = (seed || 1) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Return [r, g, b] for a #rrggbb string. */
function rgb(hex) {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** Wrap a paint buffer: set pixels, read pixels, and fill rects by ramp index.
 * A paint job sets `clip` first, so a brush that reaches past its own cell cannot
 * bleed into the neighbour: the atlas stays one clean grid of materials. */
function createBuffer(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(width, height);
  const data = image.data;

  let clip = null;

  /** Restrict every later write to this rect. Pass null to lift the limit. */
  function setClip(rect) {
    clip = rect;
  }

  /** Say whether a pixel lies inside the buffer and inside the clip rect. */
  function inside(px, py) {
    if (px < 0 || py < 0 || px >= width || py >= height) return false;
    if (!clip) return true;
    return px >= clip.x && py >= clip.y && px < clip.x + clip.w && py < clip.y + clip.h;
  }

  /** Write one pixel. Coordinates outside the cell are dropped. */
  function set(x, y, color, alpha = 255) {
    const px = Math.round(x);
    const py = Math.round(y);
    if (!inside(px, py)) return;
    const at = (py * width + px) * 4;
    data[at] = color[0];
    data[at + 1] = color[1];
    data[at + 2] = color[2];
    data[at + 3] = alpha;
  }

  /** Write a rect of one color. */
  function fill(x, y, w, h, color, alpha = 255) {
    for (let py = 0; py < h; py += 1) {
      for (let px = 0; px < w; px += 1) set(x + px, y + py, color, alpha);
    }
  }

  /** Copy the painted pixels into the canvas. */
  function commit(x, y) {
    ctx.putImageData(image, 0, 0);
    void x;
    void y;
  }

  return { canvas, ctx, set, fill, commit, setClip, width, height, image };
}

// ---------------------------------------------------------------- materials --

/** Paint a tileable grass top: bright tips, mid body, dark base, few dew points. */
function paintGrass(buf, x0, y0, w, h, ramp, seed) {
  const random = seeded(seed);
  const noise = Array.from({ length: w }, () => random());
  for (let x = 0; x < w; x += 1) {
    // Blade height varies by one pixel, and the tip line stays inside the tile.
    const tip = 1 + (noise[x] > 0.62 ? 1 : 0);
    for (let y = 0; y < h; y += 1) {
      let color = ramp[2];
      if (y < tip) color = ramp[0];
      else if (y < tip + 2) color = ramp[1];
      else if (y > h - 2) color = ramp[3];
      buf.set(x0 + x, y0 + y, color);
    }
    if (noise[(x + 3) % w] > 0.9) buf.set(x0 + x, y0 + tip + 1, ramp[0]);
  }
  for (let i = 0; i < 6; i += 1) {
    buf.set(x0 + Math.floor(random() * w), y0 + 2 + Math.floor(random() * (h - 4)), ramp[0]);
  }
}

/** Paint a tileable dirt body: strata bands, pebbles with a lit top, thin roots. */
function paintDirt(buf, x0, y0, w, h, ramp, seed) {
  const random = seeded(seed);
  for (let y = 0; y < h; y += 1) {
    const band = ramp[(y % 5 === 0 ? 2 : y % 3 === 0 ? 3 : 1)];
    for (let x = 0; x < w; x += 1) {
      buf.set(x0 + x, y0 + y, random() > 0.88 ? ramp[0] : band);
    }
  }
  for (let i = 0; i < 7; i += 1) {
    const px = Math.floor(random() * (w - 4));
    const py = 2 + Math.floor(random() * (h - 5));
    const size = 2 + Math.floor(random() * 2);
    buf.fill(x0 + px, y0 + py, size, size, ramp[2]);
    buf.fill(x0 + px, y0 + py, size, 1, ramp[0]);
    buf.set(x0 + px, y0 + py + size, ramp[3]);
  }
  for (let i = 0; i < 4; i += 1) {
    let px = Math.floor(random() * w);
    let py = Math.floor(random() * (h - 6));
    for (let s = 0; s < 5; s += 1) {
      buf.set(x0 + px, y0 + py, ramp[3]);
      px += random() > 0.5 ? 1 : -1;
      py += 1;
    }
  }
}

/** Paint tileable stone courses: mortar gaps, per-block value, bevel, chips. */
function paintStone(buf, x0, y0, w, h, ramp, seed) {
  const random = seeded(seed);
  const courseH = 8;
  const blockW = 16;
  buf.fill(x0, y0, w, h, ramp[3]);
  for (let row = 0, y = 0; y < h; y += courseH, row += 1) {
    const offset = row % 2 === 0 ? 0 : blockW / 2;
    for (let bx = -blockW; bx < w; bx += blockW) {
      const x = bx + offset;
      const bw = blockW - 1;
      const bh = courseH - 1;
      const body = ramp[1 + (random() > 0.62 ? 2 : random() > 0.3 ? 1 : 0) % 3];
      buf.fill(x0 + x + 1, y0 + y + 1, bw, bh, body);
      // Bevel: light along the top and the left, dark along the bottom and right.
      buf.fill(x0 + x + 1, y0 + y + 1, bw, 1, ramp[0]);
      buf.set(x0 + x + 1, y0 + y + 2, ramp[0]);
      buf.fill(x0 + x + 1, y0 + y + 1 + bh, bw, 1, ramp[2]);
      for (let i = 0; i < 5; i += 1) {
        buf.set(x0 + x + 1 + Math.floor(random() * bw), y0 + y + 2 + Math.floor(random() * (bh - 1)),
          random() > 0.5 ? ramp[0] : ramp[2]);
      }
    }
  }
}

/** Paint the light cap of a standable surface: a bright line over a dark seam. */
function paintCap(buf, x0, y0, w, h, light, mid, dark) {
  buf.fill(x0, y0, w, h, mid);
  buf.fill(x0, y0, w, 1, light);
  buf.fill(x0, y0 + h - 1, w, 1, dark);
  for (let x = 0; x < w; x += 3) buf.set(x0 + x, y0, light);
}

/** Paint one tileable building façade: floors, window grid with sills, grime. */
function paintFacade(buf, x0, y0, w, h, wall, glass, seed, litChance) {
  const random = seeded(seed);
  const floorH = 8;
  const bay = 8;
  for (let y = 0; y < h; y += 1) {
    // A vertical grime gradient pushes the bottom of a tower into shadow.
    const shade = wall[y / h > 0.72 ? 3 : 2];
    for (let x = 0; x < w; x += 1) buf.set(x0 + x, y0 + y, random() > 0.9 ? wall[1] : shade);
  }
  for (let fy = 0; fy < h; fy += floorH) {
    buf.fill(x0, y0 + fy, w, 1, wall[0]);          // floor line catches the light
    buf.fill(x0, y0 + fy + 1, w, 1, wall[3]);      // and drops a shadow below it
    for (let bx = 0; bx < w; bx += bay) {
      const lit = random() < litChance;
      const wx = x0 + bx + 2;
      const wy = y0 + fy + 3;
      buf.fill(wx, wy, 3, 4, lit ? (random() > 0.7 ? glass[1] : glass[0]) : glass[2]);
      buf.fill(wx, wy, 3, 1, lit ? glass[1] : glass[3]);
      buf.fill(wx - 1, wy + 4, 5, 1, wall[0]);      // window sill
      if (lit) buf.set(wx + 1, wy + 2, glass[1]);
    }
  }
}

/** Paint a roof prop silhouette: antenna, water tank, or vent stack. */
function paintProp(buf, x0, y0, w, h, color, kind) {
  if (kind === 'antenna') {
    buf.fill(x0 + Math.floor(w / 2), y0, 1, h, color);
    buf.fill(x0 + Math.floor(w / 2) - 2, y0 + 2, 5, 1, color);
    buf.set(x0 + Math.floor(w / 2), y0, '#ff6b5e');
  } else if (kind === 'tank') {
    buf.fill(x0 + 2, y0 + 2, w - 4, h - 2, color);
    buf.fill(x0 + 2, y0 + 2, w - 4, 1, '#3a4272');
    buf.fill(x0 + 3, y0 + h, 1, 1, color);
    buf.fill(x0 + w - 4, y0 + h, 1, 1, color);
  } else {
    buf.fill(x0 + 3, y0 + 3, 4, h - 3, color);
    buf.fill(x0 + 2, y0 + 2, 6, 1, '#3a4272');
  }
}

/** Paint a real moon: spherical shading, maria, craters with lit rims. */
function paintMoon(buf, x0, y0, size, ramp, seed) {
  const random = seeded(seed);
  const r = size / 2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x + 0.5 - r;
      const dy = y + 0.5 - r;
      const dist = Math.hypot(dx, dy);
      if (dist > r) continue;                      // outside the disc stays clear
      // The surface normal of a sphere gives the light falloff toward the rim.
      const z = Math.sqrt(Math.max(0, r * r - dist * dist)) / r;
      const light = z * 1.05 - (dx / r) * 0.22 - 0.06;
      const grain = random() * 0.12;
      buf.set(x0 + x, y0 + y, ramp.pick(light + grain), Math.round(255 * Math.min(1, z * 8 + 0.4)));
    }
  }
  // Maria: broad flat dark seas on the lit face.
  for (let i = 0; i < 7; i += 1) {
    const cx = r + (random() - 0.5) * r * 1.1;
    const cy = r + (random() - 0.5) * r * 1.1;
    const rad = 3 + random() * 7;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d > rad || Math.hypot(x + 0.5 - r, y + 0.5 - r) > r - 1) continue;
        const at = ((y0 + y) * buf.width + (x0 + x)) * 4;
        const mix = 0.55 * (1 - d / rad);
        buf.image.data[at] = Math.round(buf.image.data[at] * (1 - mix) + ramp.dark[0] * mix);
        buf.image.data[at + 1] = Math.round(buf.image.data[at + 1] * (1 - mix) + ramp.dark[1] * mix);
        buf.image.data[at + 2] = Math.round(buf.image.data[at + 2] * (1 - mix) + ramp.dark[2] * mix);
      }
    }
  }
  // Craters: dark floor, a lit rim on the sun side, a bright ejecta line.
  for (let i = 0; i < 26; i += 1) {
    const angle = random() * Math.PI * 2;
    const dist = Math.sqrt(random()) * (r - 3);
    const cx = r + Math.cos(angle) * dist;
    const cy = r + Math.sin(angle) * dist;
    const rad = 1 + random() * 3.2;
    for (let y = Math.floor(cy - rad - 1); y <= cy + rad + 1; y += 1) {
      for (let x = Math.floor(cx - rad - 1); x <= cx + rad + 1; x += 1) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d > rad + 0.6 || Math.hypot(x + 0.5 - r, y + 0.5 - r) > r - 1) continue;
        if (d > rad - 0.4) {
          const litSide = (cx - r) * -1 + (cy - r) * -0.4 > 0 ? 1 : 0;
          buf.set(x0 + x, y0 + y, litSide ? ramp.rim : ramp.shade);
        } else {
          buf.set(x0 + x, y0 + y, ramp.floor);
        }
      }
    }
  }
}

/** Paint a soft elliptical ground shadow for an entity. */
function paintShadow(buf, x0, y0, w, h, color) {
  const rxA = w / 2;
  const ryA = h / 2;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const dx = (x + 0.5 - rxA) / rxA;
      const dy = (y + 0.5 - ryA) / ryA;
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      buf.set(x0 + x, y0 + y, color, Math.round(150 * (1 - d)));
    }
  }
}

// ------------------------------------------------------------------- sprites --

/** Draw one frame body: torso, head, visor, limbs. All coordinates are pixels. */
function paintHero(buf, x0, y0, pose, colors) {
  const { body, light, mid, dark, outline, visor } = colors;
  const bob = pose.bob;
  const cx = 13;
  buf.fill(x0 + cx - 6, y0 + 0, 12, 12, outline);            // head shell
  buf.fill(x0 + cx - 5, y0 + 1, 10, 10, body);
  buf.fill(x0 + cx - 5, y0 + 1, 10, 2, light);               // top of the helmet
  buf.fill(x0 + cx - 4, y0 + 4, 8, 3, visor);                // visor band
  buf.set(x0 + cx + 2, y0 + 4, light);
  buf.fill(x0 + cx - 5, y0 + 12, 10, 13, outline);           // torso
  buf.fill(x0 + cx - 4, y0 + 13 + bob, 8, 11, mid);
  buf.fill(x0 + cx - 4, y0 + 13 + bob, 8, 2, body);
  buf.fill(x0 + cx - 4, y0 + 21 + bob, 8, 3, dark);          // belt
  // Backpack on the back side, arms swing with the legs.
  buf.fill(x0 + cx - 8, y0 + 13 + bob, 3, 8, dark);
  buf.fill(x0 + cx + pose.armX - 1, y0 + 14 + bob, 3, 7, body);
  buf.fill(x0 + cx + pose.armX - 1, y0 + 20 + bob, 3, 2, light);
  // Two legs, each lifted by its own phase.
  buf.fill(x0 + cx - 4 + pose.legA, y0 + 24 + bob, 4, 8 - pose.legLiftA, mid);
  buf.fill(x0 + cx - 4 + pose.legA, y0 + 30 + bob - pose.legLiftA, 5, 3, dark);
  buf.fill(x0 + cx + 1 + pose.legB, y0 + 24 + bob, 4, 8 - pose.legLiftB, mid);
  buf.fill(x0 + cx + 1 + pose.legB, y0 + 30 + bob - pose.legLiftB, 5, 3, dark);
}

/** Return the six run poses of a walk cycle, in the order the cycle plays them. */
function heroRunPoses() {
  return [
    { bob: 0, legA: -3, legB: 3, legLiftA: 2, legLiftB: 0, armX: 5 },
    { bob: 1, legA: -1, legB: 1, legLiftA: 0, legLiftB: 0, armX: 4 },
    { bob: 2, legA: 2, legB: -3, legLiftA: 0, legLiftB: 3, armX: 2 },
    { bob: 1, legA: 3, legB: -1, legLiftA: 0, legLiftB: 0, armX: 1 },
    { bob: 0, legA: -2, legB: 4, legLiftA: 3, legLiftB: 0, armX: 4 },
    { bob: 1, legA: 0, legB: 0, legLiftA: 0, legLiftB: 1, armX: 3 },
  ];
}

/** Paint one blob enemy frame: squash, eyes, stubby legs, a horn ridge. */
function paintBlob(buf, x0, y0, frame, colors, dir) {
  const { body, light, dark, outline, eye } = colors;
  const squash = frame % 2 === 0 ? 0 : 1;
  const w = 24;
  const h = 22 - squash;
  const y = y0 + (22 - h);
  buf.fill(x0 + 1, y, w - 2, h, outline);
  buf.fill(x0 + 2, y + 1, w - 4, h - 1, body);
  buf.fill(x0 + 2, y + 1, w - 4, 3, light);
  buf.fill(x0 + 2, y + h - 5, w - 4, 4, dark);
  // A ridge of three horns along the back, on the side it walks away from.
  for (let i = 0; i < 3; i += 1) {
    const hx = dir > 0 ? 3 + i * 3 : w - 6 - i * 3;
    buf.fill(x0 + hx, y + (i % 2), 2, 3, dark);
  }
  const eyeX = dir > 0 ? w - 9 : 5;
  buf.fill(x0 + eyeX, y + 5, 4, 4, outline);
  buf.fill(x0 + eyeX + 1, y + 6, 2, 2, eye);
  // Two legs alternate with the frame, so the shuffle reads as a walk.
  const stepA = frame % 4 < 2 ? 0 : 2;
  const stepB = frame % 4 < 2 ? 2 : 0;
  buf.fill(x0 + 5 - stepA, y + h, 4, 2, dark);
  buf.fill(x0 + w - 9 + stepB, y + h, 4, 2, dark);
}

/** Paint the jet: hull, swept wing, tail fin, cockpit glass, beacon, exhaust. */
function paintJet(buf, x0, y0, w, h, colors) {
  const { hull, dark, glass, hot, outline } = colors;
  const mid = Math.floor(h * 0.55);
  // Hull: a tapering body, nose to the right.
  for (let x = 0; x < w; x += 1) {
    const taper = x > w - 10 ? 1 : 0;
    buf.fill(x0 + x, y0 + mid - 2 + taper, 1, 4 - taper, outline);
    buf.fill(x0 + x, y0 + mid - 1 + taper, 1, 2, hull);
    buf.set(x0 + x, y0 + mid - 1 + taper, dark);
  }
  buf.fill(x0 + w - 3, y0 + mid - 1, 3, 2, hull);
  // Wing and tail fin.
  buf.fill(x0 + Math.floor(w * 0.42), y0 + mid + 1, 12, 3, dark);
  buf.fill(x0 + 6, y0 + mid - 5, 5, 4, dark);
  buf.fill(x0 + 6, y0 + mid - 5, 5, 1, hull);
  // Cockpit glass at the nose and the beacon on the tail.
  buf.fill(x0 + w - 12, y0 + mid - 3, 6, 2, glass);
  buf.set(x0 + 7, y0 + mid - 6, hot);
  // Exhaust plume behind the tail.
  buf.fill(x0 - 0, y0 + mid - 1, 3, 2, hot);
}

/** Paint a 3x5 pixel digit or letter for the control hint. */
function paintGlyph(buf, x0, y0, rows, color, scale = 1) {
  for (let y = 0; y < rows.length; y += 1) {
    for (let x = 0; x < rows[y].length; x += 1) {
      if (rows[y][x] !== 'X') continue;
      buf.fill(x0 + x * scale, y0 + y * scale, scale, scale, color);
    }
  }
}

// -------------------------------------------------------------------- atlas ---

const GLYPHS = {
  A: ['XXX', 'X X', 'XXX', 'X X', 'X X'],
  D: ['XX ', 'X X', 'X X', 'X X', 'XX '],
  S: ['XXX', 'X  ', 'XXX', '  X', 'XXX'],
  P: ['XX ', 'X X', 'XX ', 'X  ', 'X  '],
  C: ['XXX', 'X  ', 'X  ', 'X  ', 'XXX'],
  E: ['XXX', 'X  ', 'XXX', 'X  ', 'XXX'],
  R: ['XX ', 'X X', 'XX ', 'X X', 'X X'],
  T: ['XXX', ' X ', ' X ', ' X ', ' X '],
  O: ['XXX', 'X X', 'X X', 'X X', 'XXX'],
  W: ['X X', 'X X', 'X X', 'XXX', 'XXX'],
  L: ['X  ', 'X  ', 'X  ', 'X  ', 'XXX'],
  F: ['XXX', 'X  ', 'XX ', 'X  ', 'X  '],
  I: ['XXX', ' X ', ' X ', ' X ', 'XXX'],
  N: ['X X', 'XX ', 'XX ', 'X X', 'X X'],
  U: ['X X', 'X X', 'X X', 'X X', 'XXX'],
  '/': ['  X', '  X', ' X ', 'X  ', 'X  '],
  ' ': ['   ', '   ', '   ', '   ', '   '],
};

/** Paint the control hint strip the game shows during the first seconds. */
function paintHint(buf, x0, y0, color, text) {
  let cursor = 0;
  for (const char of text) {
    const glyph = GLYPHS[char] || GLYPHS[' '];
    paintGlyph(buf, x0 + cursor, y0, glyph, color, 2);
    cursor += glyph[0].length * 2 + 2;
  }
  return cursor;
}

/** Build a 4-step ramp with a helper that maps a light value to a shade. */
function makeRamp(hexes) {
  const shades = hexes.map(rgb);
  return {
    shades,
    dark: shades[3],
    shade: shades[2],
    floor: shades[3],
    rim: shades[0],
    /** Return the shade for a light value in 0..1. */
    pick(light) {
      const clamped = Math.max(0, Math.min(0.999, light));
      return shades[Math.floor(clamped * shades.length)];
    },
  };
}

// The ramps come from the palette in config.js, the one place a color is named.
const P = C.COLOR;
const RAMPS = {
  grass: makeRamp([P.grassLight, P.grass, P.grassDark, P.grassDeep]),
  dirt: makeRamp([P.dirtLight, P.dirt, P.dirtDark, P.dirtDeep]),
  stone: makeRamp([P.stoneLight, P.stone, P.stoneDark, P.stoneDeep]),
  far: makeRamp(P.wallFar),
  mid: makeRamp(P.wallMid),
  near: makeRamp(P.wallNear),
  moon: makeRamp(P.moonRamp),
};

const GLASS = { warm: rgb(P.window), cool: rgb(P.windowCool), unlit: rgb(P.windowDark), sill: rgb('#080b18') };
const HERO = {
  body: rgb(P.heroBody), light: rgb(P.heroLight), mid: rgb(P.heroMid),
  dark: rgb(P.heroDark), outline: rgb(P.spriteOutline), visor: rgb(P.heroVisor),
};
const BLOB = {
  body: rgb(P.enemy), light: rgb(P.enemyLight), dark: rgb(P.enemyDark),
  outline: rgb(P.enemyOutline), eye: rgb(P.sparkLight),
};

/** Paint the whole atlas and return the canvas with its tile table. */
function paintAtlas() {
  const width = 384;
  const height = 256;
  const buf = createBuffer(width, height);
  const rects = {};

  /** Reserve one rect, paint it inside its own bounds, and remember it. */
  function put(name, x, y, w, h, paint) {
    rects[name] = { x, y, w, h };
    buf.setClip({ x, y, w, h });
    paint(buf, x, y, w, h);
    buf.setClip(null);
  }

  // Materials: grass and dirt for the ground, stone and its cap for platforms.
  put('grass', 0, 0, 16, 8, (b, x, y, w, h) => paintGrass(b, x, y, w, h, RAMPS.grass.shades, 11));
  put('dirt', 16, 0, 16, 16, (b, x, y, w, h) => paintDirt(b, x, y, w, h, RAMPS.dirt.shades, 23));
  put('stone', 32, 0, 32, 16, (b, x, y, w, h) => paintStone(b, x, y, w, h, RAMPS.stone.shades, 37));
  put('stoneCap', 64, 0, 32, 4, (b, x, y, w, h) => paintCap(b, x, y, w, h,
    rgb(P.stoneCapLight), rgb(P.stoneCapMid), rgb(P.stoneCapDark)));
  put('grassCap', 96, 0, 16, 4, (b, x, y, w, h) => paintCap(b, x, y, w, h,
    rgb(P.grassCapLight), rgb(P.grassCapMid), rgb(P.grassCapDark)));

  // Façades: one tile per parallax layer, tileable in both directions.
  put('farWall', 128, 0, 16, 32, (b, x, y, w, h) => paintFacade(b, x, y, w, h, RAMPS.far.shades,
    { 0: GLASS.warm, 1: GLASS.cool, 2: GLASS.unlit, 3: GLASS.sill }, 41, 0.26));
  put('midWall', 144, 0, 16, 32, (b, x, y, w, h) => paintFacade(b, x, y, w, h, RAMPS.mid.shades,
    { 0: GLASS.warm, 1: GLASS.cool, 2: GLASS.unlit, 3: GLASS.sill }, 53, 0.16));
  put('nearWall', 160, 0, 16, 32, (b, x, y, w, h) => paintFacade(b, x, y, w, h, RAMPS.near.shades,
    { 0: GLASS.warm, 1: GLASS.cool, 2: GLASS.unlit, 3: GLASS.sill }, 67, 0.09));

  // Roof props for the skyline silhouette.
  const steel = rgb(P.propSteel);
  put('propAntenna', 176, 0, 12, 14, (b, x, y, w, h) => paintProp(b, x, y, w, h, steel, 'antenna'));
  put('propTank', 188, 0, 12, 12, (b, x, y, w, h) => paintProp(b, x, y, w, h, steel, 'tank'));
  put('propVent', 200, 0, 12, 12, (b, x, y, w, h) => paintProp(b, x, y, w, h, steel, 'vent'));

  // The moon: a shaded sphere with maria and craters, alpha outside the disc.
  put('moon', 240, 0, 64, 64, (b, x, y, w) => paintMoon(b, x, y, w, RAMPS.moon, 71));
  put('shadow', 0, 32, 24, 8, (b, x, y, w, h) => paintShadow(b, x, y, w, h, rgb('#04060f')));
  put('spark', 24, 32, 8, 8, (b, x, y, w) => {
    const c = rgb(P.sparkLight);
    for (let i = 0; i < w; i += 1) {
      b.set(x + i, y + 3, c);
      b.set(x + 3, y + i, c);
    }
  });

  // Heart HUD: full and spent, one 16x16 cell each.
  const heartShape = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
  const putHeart = (name, fill, shine) => put(name, name === 'heartFull' ? 32 : 48, 32, 16, 16,
    (b, x, y) => {
      const block = 2;
      heartShape.forEach((row, ry) => {
        for (let rx = 0; rx < row.length; rx += 1) {
          if (row[rx] !== 'X') continue;
          b.fill(x + 1 + rx * block, y + 1 + ry * block, block, block, fill);
        }
      });
      b.fill(x + 3, y + 3, 2, 2, shine);
    });
  putHeart('heartFull', rgb(P.heartFull), rgb(P.blastLight));
  putHeart('heartSpent', rgb(P.heartSpent), rgb(P.heartSpentLight));

  // Hero frames: idle, run cycle, jump, fall. All face right; the atlas flips them.
  const heroFrames = {};
  const idle = [{ bob: 0, legA: 0, legB: 0, legLiftA: 0, legLiftB: 0, armX: 3 },
    { bob: 1, legA: 0, legB: 0, legLiftA: 0, legLiftB: 0, armX: 3 }];
  const poses = [...idle, ...heroRunPoses()];
  heroFrames.idle = [0, 1].map((index) => putHero(buf, index * 26, 64, poses[index], `idle${index}`));
  heroFrames.run = [2, 3, 4, 5, 6, 7].map((index, slot) => putHero(buf, 156 + slot * 26, 64,
    poses[index], `run${slot}`));
  heroFrames.jump = putHero(buf, 52, 64, { bob: 0, legA: -2, legB: 2, legLiftA: 3, legLiftB: 1, armX: 6 });
  heroFrames.fall = putHero(buf, 78, 64, { bob: 1, legA: 2, legB: -2, legLiftA: 1, legLiftB: 3, armX: 5 });
  heroFrames.hurt = putHero(buf, 104, 64, { bob: 3, legA: 3, legB: -3, legLiftA: 0, legLiftB: 0, armX: 7 });

  // Enemy frames: four shuffle steps per direction.
  const enemyFrames = { right: [], left: [] };
  for (let frame = 0; frame < 4; frame += 1) {
    enemyFrames.right.push(putBlob(buf, 0 + frame * 26, 104, frame, BLOB, 1, 'right'));
    enemyFrames.left.push(putBlob(buf, 0 + frame * 26, 128, frame, BLOB, -1, 'left'));
  }

  // The jet that drops the bombs.
  put('jet', 240, 64, 52, 14, (b, x, y, w, h) => paintJet(b, x, y, w, h, {
    hull: rgb(P.jet), dark: rgb(P.jetDark), glass: rgb(P.windowCool),
    hot: rgb(P.beacon), outline: rgb(P.spriteOutline),
  }));

  // Bomb and the control hint strip.
  put('bomb', 104, 104, 12, 14, (b, x, y) => {
    b.fill(x + 2, y + 4, 8, 9, rgb(P.bombOutline));
    b.fill(x + 3, y + 5, 6, 7, rgb(P.bombBody));
    b.fill(x + 3, y + 5, 6, 2, rgb(P.bombLight));
    b.fill(x + 3, y + 10, 6, 2, rgb(P.bombDark));
    b.fill(x + 5, y + 1, 2, 3, rgb(P.bombFuse));
    b.set(x + 6, y, rgb(P.sparkLight));
  });
  put('hintMove', 156, 104, 150, 12, (b, x, y) => {
    paintHint(b, x, y + 1, rgb(P.hintGlyph), 'A/D WALK');
    paintHint(b, x, y + 8, rgb(P.hintGlyph), 'SPACE JUMP');
  });

  buf.commit();
  return { canvas: buf.canvas, rects, heroFrames, enemyFrames };
}

/** Put one hero pose into the atlas at x, y and return its tile. */
function putHero(buf, x, y, pose, slot) {
  const name = `hero${slot === undefined ? 'X' : slot}_${x}_${y}`;
  buf.setClip({ x, y, w: 26, h: 40 });
  paintHero(buf, x, y, pose, HERO);
  buf.setClip(null);
  return { x, y, w: 26, h: 40, name };
}

/** Put one enemy frame into the atlas at x, y and return its tile. */
function putBlob(buf, x, y, frame, colors, dir, side) {
  buf.setClip({ x, y, w: 26, h: 24 });
  paintBlob(buf, x, y, frame, colors, dir);
  buf.setClip(null);
  return { x, y, w: 26, h: 24, name: `enemy_${side}_${frame}` };
}

/** Upload the painted canvas and return the tile table for the renderer. */
export function createAtlas(gl) {
  const { canvas, rects, heroFrames, enemyFrames } = paintAtlas();
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  /** Return the tile record of one painted rect. The uv is inset by half a texel. */
  const tile = (rect) => ({
    uv: [
      (rect.x + 0.5) / canvas.width,
      (rect.y + 0.5) / canvas.height,
      (rect.x + rect.w - 0.5) / canvas.width,
      (rect.y + rect.h - 0.5) / canvas.height,
    ],
    w: rect.w,
    h: rect.h,
  });

  const tiles = {};
  for (const [name, rect] of Object.entries(rects)) tiles[name] = tile(rect);
  for (const frame of heroFrames.run.concat(heroFrames.idle, [heroFrames.jump, heroFrames.fall,
    heroFrames.hurt])) tiles[frame.name] = tile(frame);
  for (const frame of enemyFrames.right.concat(enemyFrames.left)) tiles[frame.name] = tile(frame);

  return {
    texture,
    width: canvas.width,
    height: canvas.height,
    tiles,
    hero: {
      idle: heroFrames.idle.map((frame) => frame.name),
      run: heroFrames.run.map((frame) => frame.name),
      jump: heroFrames.jump.name,
      fall: heroFrames.fall.name,
      hurt: heroFrames.hurt.name,
    },
    enemy: {
      right: enemyFrames.right.map((frame) => frame.name),
      left: enemyFrames.left.map((frame) => frame.name),
    },
  };
}
