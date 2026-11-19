// The runtime pixel-art atlas of game2 (DG-P-10).
// No image file ships with the game: this module paints every tile and sprite
// frame into one offscreen canvas at startup and uploads it once as a texture.
// Ground and stone take their tone field from ./kacheln.js - numbers, not pixels -
// and everything else is drawn here. Each material has a small ramp of 4 shades,
// so surfaces read as one hue with depth instead of as noise. Sprites are painted
// as frame strips: the renderer picks a frame from the world time, so the player
// runs and the enemies shuffle. A fixed seed keeps every pixel identical across
// runs, so shots stay comparable.

import * as C from '../config.js';
import { muster } from './kacheln.js';

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
/** Paint one tile from a baked tone field: one ramp shade per index.
 * The field carries the form, the ramp carries the colour, so a material keeps its
 * four shades no matter which sheet the form came from. A field that does not fit
 * its tile throws: a scaled tile would break the pixel grid.
 */
function paintField(buf, x0, y0, w, h, ramp, name) {
  const feld = muster(name);
  if (feld.w !== w || feld.h !== h) {
    throw new Error(`pattern ${name} is ${feld.w}x${feld.h}, the tile is ${w}x${h}`);
  }
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      buf.set(x0 + x, y0 + y, ramp[feld.pixel[y * w + x]]);
    }
  }
}

function paintGrass(buf, x0, y0, w, h, ramp, seed) {
  const random = seeded(seed);
  const noise = Array.from({ length: w }, () => random());
  for (let x = 0; x < w; x += 1) {
    // Tips vary over three rows, so the top edge is ragged instead of ruled.
    const tip = noise[x] > 0.78 ? 0 : noise[x] > 0.42 ? 1 : 2;
    for (let y = 0; y < h; y += 1) {
      let color = ramp[2];
      if (y < tip) color = ramp[0];
      else if (y < tip + 2) color = ramp[1];
      else if (y > h - 2) color = ramp[3];
      buf.set(x0 + x, y0 + y, color);
    }
    if (noise[(x + 3) % w] > 0.88) buf.set(x0 + x, y0 + tip + 1, ramp[0]);
  }
  // A shade band under the tips separates grass from the soil below it.
  buf.fill(x0, y0 + h - 2, w, 2, ramp[3]);
  for (let i = 0; i < 8; i += 1) {
    buf.set(x0 + Math.floor(random() * w), y0 + 2 + Math.floor(random() * (h - 5)), ramp[0]);
  }
}

/** Paint grass blades in clumps, rising above the line the feet stand on.
 * One blade every few pixels would stand as a comb and hide the ground line, so
 * the clumps are separated by bare ground.
 */
function paintTufts(buf, x0, y0, w, h, ramp, seed) {
  const random = seeded(seed);
  for (let i = 0; i < 7; i += 1) {
    const start = Math.floor(random() * w);
    const spread = 3 + Math.floor(random() * 5);
    for (let c = 0; c < spread; c += 1) {
      if (random() > 0.75) continue;                    // a lean blade, not a wall
      const x = (start + c) % w;
      const height = 2 + Math.floor(random() * (h - 1));
      buf.fill(x0 + x, y0 + h - height, 1, height, random() > 0.5 ? ramp[0] : ramp[1]);
      buf.set(x0 + x, y0 + h - height, ramp[0]);        // a lit tip
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

/** Paint one tileable building façade: a wall gradient plus a window grid.
 * `bay` sets the window pitch and `shift` moves the whole grid, so the A and the B
 * variant of a layer do not line up. No full width floor lines: those turned the
 * three layers into one wallpaper. */
function paintFacade(buf, x0, y0, w, h, wall, glass, o) {
  const random = seeded(o.seed);
  // `pane` is the window width and `bay` the distance between two windows: one
  // tile can hold few small windows or many, without a window growing out of the
  // pixel scale of the layer.
  const windowW = o.pane;
  const windowH = o.step / 2;
  for (let y = 0; y < h; y += 1) {
    // One vertical value step per third: a tower reads taller with it.
    const third = y < h / 3 ? 1 : y < (2 * h) / 3 ? 2 : 3;
    for (let x = 0; x < w; x += 1) {
      buf.set(x0 + x, y0 + y, random() > 0.93 ? wall[third - 1] : wall[third]);
    }
  }
  // The first row sits where the tile's floor step says it does, so a step that
  // divides the tile height keeps the rhythm even across the tile seam.
  for (let fy = o.fy0; fy + windowH + 1 < h; fy += o.step) {
    for (let bx = o.shift; bx + windowW <= w; bx += o.bay) {
      const lit = random() < o.lit;
      const wx = x0 + bx;
      const wy = y0 + fy;
      // `cool` is the share of the lit windows that burn cool white. Tying the
      // light mix to the wall tint is what makes one tower read as one building.
      buf.fill(wx, wy, windowW, windowH, lit
        ? (random() < o.cool ? glass[1] : glass[0]) : glass[2]);
      if (lit) {
        buf.fill(wx, wy, windowW, 1, glass[1]);
        buf.set(wx + 1, wy + 2, glass[1]);
      } else {
        buf.fill(wx, wy, windowW, 1, glass[3]);
      }
      buf.fill(wx - 1, wy + windowH, windowW + 2, 1, wall[0]);   // sill catches the light
    }
  }
}

/** Paint a glass curtain wall: a mullion grid whose panes reflect the sky.
 * A pane picks its shade from a reflection value: bright where the sky is, dark
 * toward the street, plus a sheen band that crosses the front on a diagonal.
 * Without that band every tower shows the same flat gradient, which is what makes
 * a curtain wall boring. Some panes hold a closed blind, a few hold a light, so
 * the wall reads as a building and not as a mirror.
 */
function paintGlassFront(buf, x0, y0, w, h, ramp, glass, seed, litChance, bay, phase) {
  const random = seeded(seed);
  buf.fill(x0, y0, w, h, ramp[3]);                    // the mullion field
  const pane = bay - 1;                               // one pixel of mullion between
  for (let fy = 0; fy + bay <= h; fy += bay) {
    for (let fx = 0; fx + bay <= w; fx += bay) {
      const u = (fx + 0.5) / w;
      const v = (fy + 0.5) / h;
      const sky = 1 - v * 0.8;                        // sky above, street below
      const sheen = Math.max(0, 1 - Math.abs(u * 0.9 + v * 0.9 - phase) / 0.34);
      // A curtain wall mirrors the bright band at the horizon, so one row of panes
      // across the front carries it. Without that band the glass stays flat and
      // reads as a dull wall next to the lit brick towers.
      const horizon = Math.max(0, 1 - Math.abs(v - (0.34 + phase * 0.22)) / 0.09);
      // The reflection has to walk over all four shades from the roof to the
      // street, and it has to stay louder than the per-pane noise: a wide noise
      // term turns a curtain wall into confetti and the reflection is gone.
      const value = random() > 0.93 ? 0.08
        : sky * 0.72 + sheen * 0.5 + horizon * 0.5 + random() * 0.08;
      const shade = Math.max(0, Math.min(3, 3 - Math.floor(value * 3.99)));
      const px = x0 + fx;
      const py = y0 + fy;
      if (random() < litChance) {
        // Mostly a cool lamp behind the glass: warm panes in a grid read as a
        // polka-dot pattern, because the eye links them into rows.
        buf.fill(px, py, pane, pane, random() > 0.35 ? glass[1] : glass[0]);
        buf.fill(px, py, pane, 1, glass[1]);          // the frame above a lit pane
      } else {
        buf.fill(px, py, pane, pane, ramp[shade]);
        // One lighter pixel along the top is what sells the grid as glass.
        buf.fill(px, py, pane, 1, ramp[Math.max(0, shade - 1)]);
        if (shade === 0) buf.set(px, py, glass[3]);   // a glint on the brightest pane
      }
    }
  }
}

/** Paint a roof prop: a mast with a light, a tank on legs, or a capped vent.
 * Each one stands on the roof line and holds to it with legs or a base, so it
 * never reads as a box floating above the building. */
function paintProp(buf, x0, y0, w, h, color, shine, kind) {
  if (kind === 'antenna') {
    const mid = Math.floor(w / 2);
    buf.fill(x0 + mid, y0 + 1, 1, h - 1, color);
    buf.fill(x0 + mid - 2, y0 + 3, 5, 1, color);
    buf.fill(x0 + mid - 1, y0 + 6, 3, 1, color);
    buf.set(x0 + mid, y0, shine);
  } else if (kind === 'tank') {
    const left = 3;
    const bodyW = w - 2 * left;
    buf.fill(x0 + left, y0 + 2, bodyW, 6, color);
    buf.fill(x0 + left, y0 + 2, bodyW, 1, shine);           // rim light on the band
    buf.fill(x0 + left + 1, y0 + 1, bodyW - 2, 1, color);   // the lid
    buf.fill(x0 + left, y0 + 8, 1, h - 8, color);           // legs down to the roof
    buf.fill(x0 + w - left - 1, y0 + 8, 1, h - 8, color);
  } else {
    buf.fill(x0 + 3, y0 + 4, 5, h - 4, color);
    buf.fill(x0 + 2, y0 + 3, 7, 1, shine);                  // cap catches the light
    buf.fill(x0 + 4, y0 + 6, 3, 1, shine);
  }
}

/** Paint a real moon as a lit sphere with seas and a few large craters.
 * The disc is only 64 pixels wide, so detail has to be sparse and generous: small
 * craters turn into confetti and per-pixel grain turns into noise. Light comes from
 * the upper left. A crater gets a shadowed wall on the light side and a lit rim on
 * the far side, which is what reads as a hollow at this size.
 */
function paintMoon(buf, x0, y0, size, ramp, seed) {
  const random = seeded(seed);
  const r = size / 2;
  const at = (x, y) => ((y0 + y) * buf.width + (x0 + x)) * 4;
  const read = (x, y) => { const i = at(x, y); return [buf.image.data[i], buf.image.data[i+1], buf.image.data[i+2]]; };
  const write = (x, y, c) => { const i = at(x, y); buf.image.data[i]=c[0]; buf.image.data[i+1]=c[1]; buf.image.data[i+2]=c[2]; };
  const onDisc = (x, y) => Math.hypot(x + 0.5 - r, y + 0.5 - r) <= r - 0.5;
  const tones = ramp.shades;   // 0 lightest .. 3 darkest

  // 1) the sphere: one clear tone per band, brightest at the light, dark at the limb
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (x + 0.5 - r) / r;
      const dy = (y + 0.5 - r) / r;
      const dist = Math.hypot(dx, dy);
      if (dist > 1) continue;
      const z = Math.sqrt(Math.max(0, 1 - dist * dist));
      // 1 at the sub-solar point, low at the limb and on the night side
      const light = 0.24 + 0.92 * z - 0.24 * dx - 0.13 * dy;
      const stufe = 3 - Math.max(0, Math.min(3, Math.floor(light * 3.2)));
      buf.set(x0 + x, y0 + y, tones[stufe],
        Math.round(255 * Math.min(1, (1 - dist) * 14 + 0.5)));
    }
  }

  // 2) three seas: large, soft, and clearly darker than the highland tone
  const sea = tones[2];
  for (let i = 0; i < 3; i += 1) {
    const cx = r + (random() - 0.5) * r * 0.95;
    const cy = r + (random() - 0.5) * r * 0.8;
    const rad = 10 + random() * 6;
    for (let y = Math.floor(cy - rad); y <= cy + rad; y += 1) {
      for (let x = Math.floor(cx - rad); x <= cx + rad; x += 1) {
        if (!onDisc(x, y)) continue;
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / rad;
        if (d > 1) continue;
        // a dithered edge keeps the sea soft without smearing the tone
        if (d > 0.72 && random() > (1 - d) / 0.28) continue;
        write(x, y, mixTone(read(x, y), sea, 0.55));
      }
    }
  }

  // 3) eight craters, each a shadowed wall and a lit rim
  for (let i = 0; i < 8; i += 1) {
    const place = Math.sqrt(random()) * (r - 7);
    const cx = r + Math.cos(random() * Math.PI * 2) * place;
    const cy = r + Math.sin(random() * Math.PI * 2) * place;
    const rad = 3 + random() * 2.5;
    for (let y = Math.floor(cy - rad - 1); y <= cy + rad + 1; y += 1) {
      for (let x = Math.floor(cx - rad - 1); x <= cx + rad + 1; x += 1) {
        if (!onDisc(x, y)) continue;
        const ox = x + 0.5 - cx;
        const oy = y + 0.5 - cy;
        const d = Math.hypot(ox, oy);
        if (d > rad + 0.8) continue;
        const farSide = ox + oy > 0;                  // light from the upper left
        if (d > rad - 0.6) {
          write(x, y, farSide ? tones[1] : tones[3]);  // one pixel of rim or shade
        } else if (d > rad * 0.45) {
          write(x, y, farSide ? tones[2] : tones[2]);
        }
      }
    }
  }
}

/** Return a blend of two [r,g,b] tones, share of b in 0..1. */
function mixTone(a, b, share) {
  return [
    Math.round(a[0] * (1 - share) + b[0] * share),
    Math.round(a[1] * (1 - share) + b[1] * share),
    Math.round(a[2] * (1 - share) + b[2] * share),
  ];
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
  buf.fill(x0 + cx - 5, y0 + 0, 10, 11, outline);            // head shell
  buf.fill(x0 + cx - 4, y0 + 1, 8, 9, body);
  buf.fill(x0 + cx - 4, y0 + 1, 8, 2, light);                // top of the helmet
  buf.fill(x0 + cx - 3, y0 + 4, 6, 3, visor);                // visor band
  buf.set(x0 + cx + 1, y0 + 4, light);
  buf.fill(x0 + cx - 2, y0 + 11, 4, 2, dark);                // neck sets head off torso
  buf.fill(x0 + cx - 5, y0 + 12, 10, 13, outline);           // torso
  buf.fill(x0 + cx - 4, y0 + 13 + bob, 8, 11, mid);
  buf.fill(x0 + cx - 4, y0 + 13 + bob, 8, 2, body);
  buf.fill(x0 + cx - 4, y0 + 21 + bob, 8, 3, dark);          // belt
  // Backpack on the back side, arms swing with the legs.
  buf.fill(x0 + cx - 8, y0 + 13 + bob, 3, 8, dark);
  buf.fill(x0 + cx + pose.armX - 1, y0 + 14 + bob, 3, 7, body);
  buf.fill(x0 + cx + pose.armX - 1, y0 + 20 + bob, 3, 2, body);
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
  // Round the top corners so the body reads as a creature rather than a tile.
  buf.set(x0 + 1, y, outline);
  buf.set(x0 + w - 2, y, outline);
  buf.fill(x0 + 2, y, 1, 1, outline);
  buf.fill(x0 + w - 3, y, 1, 1, outline);
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
  W: ['X X', 'X X', 'XXX', 'XXX', 'X X'],
  L: ['X  ', 'X  ', 'X  ', 'X  ', 'XXX'],
  F: ['XXX', 'X  ', 'XX ', 'X  ', 'X  '],
  I: ['XXX', ' X ', ' X ', ' X ', 'XXX'],
  N: ['X X', 'XX ', 'XX ', 'X X', 'X X'],
  U: ['X X', 'X X', 'X X', 'X X', 'XXX'],
  K: ['X X', 'X X', 'XX ', 'X X', 'X X'],
  J: ['  X', '  X', '  X', 'X X', 'XXX'],
  M: ['X X', 'XXX', 'XXX', 'X X', 'X X'],
  G: ['XXX', 'X  ', 'X X', 'XXX', 'XXX'],
  B: ['XX ', 'X X', 'XX ', 'X X', 'XX '],
  H: ['X X', 'X X', 'XXX', 'X X', 'X X'],
  V: ['X X', 'X X', 'X X', 'X X', ' X '],
  X: ['X X', 'X X', ' X ', 'X X', 'X X'],
  '0': ['XXX', 'X X', 'X X', 'X X', 'XXX'],
  '-': ['   ', '   ', 'XXX', '   ', '   '],
  '/': ['  X', '  X', ' X ', 'X  ', 'X  '],
  ' ': ['   ', '   ', '   ', '   ', '   '],
};

/** Paint the control hint strip the game shows during the first seconds.
 * A letter the font lacks would vanish silently, so an unknown character throws. */
function paintHint(buf, x0, y0, color, text) {
  let cursor = 0;
  for (const char of text) {
    const glyph = GLYPHS[char];
    if (!glyph) throw new Error(`the hint font has no glyph for "${char}"`);
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
  footing: makeRamp(P.rockFooting),
  glassMid: makeRamp(P.glassMid),
  far: makeRamp(P.wallFar),
  farWarm: makeRamp(P.wallFarWarm),
  farCool: makeRamp(P.wallFarCool),
  mid: makeRamp(P.wallMid),
  midWarm: makeRamp(P.wallMidWarm),
  midCool: makeRamp(P.wallMidCool),
  near: makeRamp(P.wallNear),
  nearWarm: makeRamp(P.wallNearWarm),
  nearCool: makeRamp(P.wallNearCool),
  moon: makeRamp(P.moonRamp),
};

// Index order matters: paintFacade reads [lit warm, lit cool, unlit, frame].
// Index order matters: paintFacade reads [lit warm, lit cool, unlit, frame].
const GLASS = [rgb(P.window), rgb(P.windowCool), rgb(P.windowDark), rgb(P.propSteelLight)];
const GLASS_NEAR = [rgb(P.windowNearWarm), rgb(P.windowNearCool), rgb(P.windowDark),
  rgb(P.propSteelLight)];
const HERO = {
  body: rgb(P.heroBody), light: rgb(P.heroLight), mid: rgb(P.heroMid),
  dark: rgb(P.heroDark), outline: rgb(P.spriteOutline), visor: rgb(P.heroVisor),
};
const BLOB = {
  body: rgb(P.enemy), light: rgb(P.enemyLight), dark: rgb(P.enemyDark),
  outline: rgb(P.enemyOutline), eye: rgb(P.sparkLight),
};

// The sprite boxes match the world boxes, so a sprite needs no scaling.
const HERO_W = 26;
const HERO_H = 40;
const ENEMY_W = 26;
const ENEMY_H = 24;
const ATLAS_W = 512;
const ATLAS_H = 256;
const GUTTER = 1;

/** Return a row-based cell allocator for the atlas.
 * Every tile asks for its size and gets a free cell, so two tiles can never share
 * pixels: the hand-placed cells of an earlier version put the jet tile right over
 * the head rows of three run frames. */
function createLayout(width, height) {
  const taken = [];
  let x = 0;
  let y = 0;
  let rowH = 0;

  /** Take the next free cell of w by h pixels. */
  function take(name, w, h) {
    if (x + w > width) {
      x = 0;
      y += rowH + GUTTER;
      rowH = 0;
    }
    if (y + h > height) throw new Error(`atlas is full: ${name} does not fit below y=${y}`);
    const rect = { name, x, y, w, h };
    taken.push(rect);
    x += w + GUTTER;
    rowH = Math.max(rowH, h);
    return rect;
  }

  /** Return the name pair of two cells that share pixels, or null. */
  function collision() {
    for (let i = 0; i < taken.length; i += 1) {
      for (let j = i + 1; j < taken.length; j += 1) {
        const a = taken[i];
        const b = taken[j];
        const apart = a.x + a.w <= b.x || b.x + b.w <= a.x
          || a.y + a.h <= b.y || b.y + b.h <= a.y;
        if (!apart) return `${a.name} and ${b.name}`;
      }
    }
    return null;
  }

  return { take, collision, count: () => taken.length };
}

/** Paint the whole atlas and return the canvas with its tile table. */
function paintAtlas() {
  const buf = createBuffer(ATLAS_W, ATLAS_H);
  const layout = createLayout(ATLAS_W, ATLAS_H);
  const rects = {};

  /** Take a cell for one tile and paint it inside its own bounds. */
  function put(name, w, h, paint) {
    // TILE in config.js is the source of the box, and the tile-fit test compares it
    // against the surfaces. A painter that asks for another box would break the
    // fit, so it throws here instead of quietly drawing a different size.
    const box = C.TILE[name];
    if (box && (box[0] !== w || box[1] !== h)) {
      throw new Error(`tile ${name} asks for ${w}x${h}, config says ${box[0]}x${box[1]}`);
    }
    const rect = layout.take(name, w, h);
    rects[name] = rect;
    buf.setClip(rect);
    paint(buf, rect.x, rect.y, rect.w, rect.h);
    buf.setClip(null);
    return rect;
  }

  // Materials: grass and dirt for the ground, stone and its cap for platforms.
  // Every box below equals the surface it fills: the ground bands, the cap band,
  // the platform body row, and LEVEL_WIDTH (3200) divided by the tile width. A
  // tile that does not divide its surface is scaled, and scaling breaks the pixel
  // grid, so the numbers here and in config.js are one system.
  // Ground takes its tone field from kacheln.js: one shade of the material's ramp
  // per index. Everything else is drawn here, because the same sheets lost their
  // structure at these sizes - see the note in ../design-guidelines/game2.md on
  // DG-P-10: at 32 x 16 the masonry sheet became fine noise, and the grass band
  // became speckle. Blades and courses are drawn, soil and footing are baked.
  put('grass', 80, 12, (b, x, y, w, h) => paintGrass(b, x, y, w, h, RAMPS.grass.shades, 11));
  put('tufts', 80, 6, (b, x, y, w, h) => paintTufts(b, x, y, w, h, RAMPS.grass.shades, 17));
  put('dirt', 160, 21, (b, x, y, w, h) => {
    paintField(b, x, y, w, h, RAMPS.dirt.shades, 'dirt');
    b.fill(x, y, w, 1, RAMPS.dirt.shades[3]);       // dark contact line under grass
  });
  put('rock', 160, 27, (b, x, y, w, h) => paintField(b, x, y, w, h, RAMPS.footing.shades, 'rock'));
  put('stone', 32, 16, (b, x, y, w, h) => paintStone(b, x, y, w, h, RAMPS.stone.shades, 37));
  put('stoneCap', 32, 5, (b, x, y, w, h) => paintCap(b, x, y, w, h,
    rgb(P.stoneCapLight), rgb(P.stoneCapMid), rgb(P.stoneCapDark)));
  put('grassCap', 16, 5, (b, x, y, w, h) => paintCap(b, x, y, w, h,
    rgb(P.grassCapLight), rgb(P.grassCapMid), rgb(P.grassCapDark)));

  // Facades: two tiles per parallax layer, tileable in both directions.
  // Four façade tiles per layer: the base tint twice on two window grids, then
  // the warm and the cool relative, one with wide windows and one with a denser
  // floor step. Each tile also carries the light mix that suits its tint, so a
  // warm tower lights warm and a cool tower lights cool.
  const facades = [
    ['farWallA', RAMPS.far, { seed: 41, lit: 0.3, bay: 8, pane: 3, shift: 1, step: 10, fy0: 4,
      cool: 0.35 }],
    ['farWallB', RAMPS.far, { seed: 47, lit: 0.24, bay: 8, pane: 3, shift: 5, step: 10, fy0: 4,
      cool: 0.5 }],
    ['farWallC', RAMPS.farWarm, { seed: 131, lit: 0.27, bay: 12, pane: 5, shift: 2, step: 10,
      fy0: 4, cool: 0.14 }],
    ['farWallD', RAMPS.farCool, { seed: 137, lit: 0.21, bay: 8, pane: 3, shift: 3, step: 8,
      fy0: 0, cool: 0.76 }],
    ['midWallA', RAMPS.mid, { seed: 53, lit: 0.17, bay: 8, pane: 3, shift: 1, step: 10, fy0: 4,
      cool: 0.35 }],
    ['midWallB', RAMPS.mid, { seed: 59, lit: 0.13, bay: 8, pane: 3, shift: 5, step: 10, fy0: 4,
      cool: 0.5 }],
    ['midWallC', RAMPS.midWarm, { seed: 139, lit: 0.15, bay: 12, pane: 5, shift: 2, step: 10,
      fy0: 4, cool: 0.14 }],
    ['midWallD', RAMPS.midCool, { seed: 149, lit: 0.12, bay: 8, pane: 3, shift: 3, step: 8,
      fy0: 0, cool: 0.76 }],
    ['nearWallA', RAMPS.near, { seed: 67, lit: 0.045, bay: 8, pane: 3, shift: 1, step: 10,
      fy0: 4, cool: 0.3, glass: GLASS_NEAR }],
    ['nearWallB', RAMPS.near, { seed: 71, lit: 0.03, bay: 8, pane: 3, shift: 5, step: 10,
      fy0: 4, cool: 0.45, glass: GLASS_NEAR }],
    ['nearWallC', RAMPS.nearWarm, { seed: 151, lit: 0.04, bay: 12, pane: 5, shift: 2, step: 10,
      fy0: 4, cool: 0.12, glass: GLASS_NEAR }],
    ['nearWallD', RAMPS.nearCool, { seed: 157, lit: 0.025, bay: 8, pane: 3, shift: 3, step: 8,
      fy0: 0, cool: 0.7, glass: GLASS_NEAR }],
  ];
  for (const [name, ramp, style] of facades) {
    put(name, 16, 32, (b, x, y, w, h) => paintFacade(b, x, y, w, h, ramp.shades,
      style.glass || GLASS, style));
  }

  // Three curtain-wall fronts for the mid layer. They differ in pane grid, in
  // how many lights are on, and in where the sheen band falls, so two glass
  // towers next to each other never show the same front.
  const glassFronts = [
    // All three are 16 x 32: a pane grid only closes on itself when the bay
    // divides the tile, and a building is 16 px wide by its own grid.
    ['glassMidA', 16, 32, 83, 0.025, 4, 0.62],
    ['glassMidB', 16, 32, 89, 0.02, 8, 1.15],
    ['glassMidC', 16, 32, 97, 0.03, 4, 0.3],
  ];
  for (const [name, tw, th, seed, lit, bay, phase] of glassFronts) {
    // The dim window palette: a curtain wall reflects the sky, so its own lights
    // stay quiet next to the bright panes.
    put(name, tw, th, (b, x, y, w, h) => paintGlassFront(b, x, y, w, h,
      RAMPS.glassMid.shades, GLASS_NEAR, seed, lit, bay, phase));
  }

  // Roof props for the skyline silhouette.
  const steel = rgb(P.propSteel);
  const shine = rgb(P.propSteelLight);
  put('propAntenna', 12, 15, (b, x, y, w, h) => paintProp(b, x, y, w, h, steel, rgb(P.beacon), 'antenna'));
  put('propTank', 14, 13, (b, x, y, w, h) => paintProp(b, x, y, w, h, steel, shine, 'tank'));
  put('propVent', 12, 12, (b, x, y, w, h) => paintProp(b, x, y, w, h, steel, shine, 'vent'));

  // The moon: a shaded sphere with maria and craters, alpha outside the disc.
  // The moon tile is drawn at MOON_R * 2 = 88 px and the shadow at its own width,
  // so neither is scaled. Both sizes match the numbers in config.js and renderer.js.
  put('moon', 88, 88, (b, x, y, w) => paintMoon(b, x, y, w, RAMPS.moon, 71));
  put('shadow', 32, 8, (b, x, y, w, h) => paintShadow(b, x, y, w, h, rgb(P.spriteOutline)));
  put('spark', 8, 8, (b, x, y, w) => {
    const c = rgb(P.sparkLight);
    for (let i = 0; i < w; i += 1) {
      b.set(x + i, y + 3, c);
      b.set(x + 3, y + i, c);
    }
  });

  // Heart HUD: full and spent.
  const heartShape = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
  const paintHeart = (fillHex, shineHex) => (b, x, y) => {
    const block = 2;
    heartShape.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx += 1) {
        if (row[rx] !== 'X') continue;
        b.fill(x + 1 + rx * block, y + 1 + ry * block, block, block, rgb(fillHex));
      }
    });
    b.fill(x + 3, y + 3, 2, 2, rgb(shineHex));
  };
  put('heartFull', 16, 16, paintHeart(P.heartFull, P.blastLight));
  put('heartSpent', 16, 16, paintHeart(P.heartSpent, P.heartSpentLight));

  // Hero frames: two idle, six run, and one each for jump, fall, and hurt.
  const idlePoses = [
    { bob: 0, legA: 0, legB: 0, legLiftA: 0, legLiftB: 0, armX: 3 },
    { bob: 1, legA: 0, legB: 0, legLiftA: 0, legLiftB: 0, armX: 3 },
  ];
  const heroFrames = {
    idle: idlePoses.map((pose, slot) => putHero(put, `idle${slot}`, pose)),
    run: heroRunPoses().map((pose, slot) => putHero(put, `run${slot}`, pose)),
    jump: putHero(put, 'jump', { bob: 0, legA: -2, legB: 2, legLiftA: 3, legLiftB: 1, armX: 6 }),
    fall: putHero(put, 'fall', { bob: 1, legA: 2, legB: -2, legLiftA: 1, legLiftB: 3, armX: 5 }),
    hurt: putHero(put, 'hurt', { bob: 3, legA: 3, legB: -3, legLiftA: 0, legLiftB: 0, armX: 7 }),
  };

  // Enemy frames: four shuffle steps per direction.
  const enemyFrames = {
    right: [0, 1, 2, 3].map((frame) => putBlob(put, 'right', frame, 1)),
    left: [0, 1, 2, 3].map((frame) => putBlob(put, 'left', frame, -1)),
  };

  // The jet that drops the bombs, one bomb, and the control hint strip.
  put('jet', 52, 14, (b, x, y, w, h) => paintJet(b, x, y, w, h, {
    hull: rgb(P.jet), dark: rgb(P.jetDark), glass: rgb(P.windowCool),
    hot: rgb(P.beacon), outline: rgb(P.spriteOutline),
  }));
  put('bomb', 12, 14, (b, x, y) => {
    b.fill(x + 2, y + 4, 8, 9, rgb(P.bombOutline));
    b.fill(x + 3, y + 5, 6, 7, rgb(P.bombBody));
    b.fill(x + 3, y + 5, 6, 2, rgb(P.bombLight));
    b.fill(x + 3, y + 10, 6, 2, rgb(P.bombDark));
    b.fill(x + 5, y + 1, 2, 3, rgb(P.bombFuse));
    b.set(x + 6, y, rgb(P.sparkLight));
  });
  put('hintMove', 156, 24, (b, x, y) => {
    paintHint(b, x, y + 2, rgb(P.hintGlyph), 'A/D WALK');
    paintHint(b, x, y + 14, rgb(P.hintGlyph), 'SPACE JUMP');
  });

  const clash = layout.collision();
  if (clash) throw new Error(`atlas cells overlap: ${clash}`);
  buf.commit();
  return { canvas: buf.canvas, rects, heroFrames, enemyFrames };
}

/** Take a cell and paint one hero pose into it. */
function putHero(put, slot, pose) {
  const name = `hero_${slot}`;
  put(name, HERO_W, HERO_H, (b, x, y) => paintHero(b, x, y, pose, HERO));
  return name;
}

/** Take a cell and paint one enemy shuffle frame into it. */
function putBlob(put, side, frame, dir) {
  const name = `enemy_${side}_${frame}`;
  put(name, ENEMY_W, ENEMY_H, (b, x, y) => paintBlob(b, x, y, frame, BLOB, dir));
  return name;
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

  return {
    texture,
    width: canvas.width,
    height: canvas.height,
    tiles,
    hero: heroFrames,
    enemy: enemyFrames,
  };
}
