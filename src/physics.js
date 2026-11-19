// Movement, collision, landing, and the stomp test for game2 (DG-P-03).
// Input: a box with x, y, w, h, vx, vy and a list of solid platform boxes.
// Output: the box at its new place, plus the events the move caused.
// Boxes are axis-aligned bounding boxes. The y axis grows downward.

import * as C from './config.js';

/** Return true when two boxes overlap on both axes. */
export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Return the center point of a box. A blast test needs the player center. */
export function center(box) {
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
}

/** Return the squared distance between two points. */
export function distanceSq(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/** Move the box on the x axis and push it out of any platform it enters. */
function resolveX(box, solids) {
  box.x += box.vx * C.FIXED_STEP;
  for (const solid of solids) {
    if (!overlaps(box, solid)) continue;
    if (box.vx > 0) box.x = solid.x - box.w;
    else if (box.vx < 0) box.x = solid.x + solid.w;
    box.hitWall = true;
  }
}

/** Move the box on the y axis. Report a landing on a platform top or the ground. */
function resolveY(box, solids) {
  const prevBottom = box.y + box.h;
  box.y += box.vy * C.FIXED_STEP;
  box.landed = false;
  for (const solid of solids) {
    if (!overlaps(box, solid)) continue;
    const footInside = prevBottom >= solid.y - C.LAND_BAND && prevBottom <= solid.y + 1;
    if (box.vy > 0 && footInside) {
      box.y = solid.y - box.h;
      box.vy = 0;
      box.landed = true;
    } else if (box.vy < 0) {
      box.y = solid.y + solid.h;
      box.vy = 0;
    }
  }
}

/** Apply gravity and the horizontal wish, then move on both axes. */
export function moveBox(box, wish, solids) {
  box.hitWall = false;
  box.vy = Math.min(box.vy + C.GRAVITY * C.FIXED_STEP, C.MAX_FALL);
  box.vx = wish * C.MOVE_SPEED;
  resolveX(box, solids);
  resolveY(box, solids);
  if (box.y + box.h >= C.GROUND_Y) {
    box.y = C.GROUND_Y - box.h;
    if (box.vy > 0) {
      box.vy = 0;
      box.landed = true;
    }
  }
  return box;
}

/** Say whether the falling mover stomps the target.
 * `prevBottom` is the mover's bottom before the move: it must have sat above the
 * target's top, and the mover must now overlap the target and fall. */
export function stomped(mover, target, prevBottom) {
  if (mover.vy <= 0) return false;
  const overlapsNow = mover.x < target.x + target.w && mover.x + mover.w > target.x
    && mover.y < target.y + target.h && mover.y + mover.h > target.y;
  if (!overlapsNow) return false;
  return prevBottom <= target.y + C.STOMP_GRACE;
}

/** Probe the ground just past the next foot of a walker. No ground means turn. */
export function groundAhead(box, dir, solids) {
  const probe = {
    x: dir > 0 ? box.x + box.w + 2 : box.x - 4,
    y: box.y + box.h + 2,
    w: 2,
    h: 4,
  };
  if (probe.y + probe.h >= C.GROUND_Y) return true;
  return solids.some((solid) => overlaps(probe, solid));
}
