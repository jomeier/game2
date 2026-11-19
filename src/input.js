// Keyboard state for game2 (DG-P-02).
// Input: browser key events. Output: a small map of held keys.
// This module knows the key names and nothing about the game.

// The arrows, A/D, and Q/Z, so the game answers to the layout the player has.
const LEFT = ['ArrowLeft', 'KeyA', 'KeyQ'];
const RIGHT = ['ArrowRight', 'KeyD'];
const JUMP = ['Space', 'KeyW', 'ArrowUp', 'KeyZ'];
const RESTART = ['KeyR'];
// The page must not scroll under the player's fingers.
const HANDLED = new Set([...LEFT, ...RIGHT, ...JUMP, ...RESTART]);

/** Return an object with the held-key flags and a restart latch. */
export function createInput(target) {
  const keys = { left: false, right: false, jump: false, restartLatch: false };

  /** Fold a key code into the flags. A press of restart latches until read. */
  function apply(code, down) {
    if (LEFT.includes(code)) keys.left = down;
    else if (RIGHT.includes(code)) keys.right = down;
    else if (JUMP.includes(code)) keys.jump = down;
    else if (RESTART.includes(code) && down) keys.restartLatch = true;
  }

  /** Hand the restart latch to one caller and clear it. */
  function takeRestart() {
    const latch = keys.restartLatch;
    keys.restartLatch = false;
    return latch;
  }

  target.addEventListener('keydown', (event) => {
    if (!HANDLED.has(event.code)) return;
    event.preventDefault();
    if (event.repeat) return;
    apply(event.code, true);
  });
  target.addEventListener('keyup', (event) => apply(event.code, false));
  // A focus loss must not leave a key held.
  target.addEventListener('blur', () => {
    keys.left = false;
    keys.right = false;
    keys.jump = false;
  });

  return { keys, takeRestart };
}
