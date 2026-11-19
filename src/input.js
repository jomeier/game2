// Keyboard state for game2 (DG-P-02).
// Input: browser key events. Output: a small map of held keys.
// This module knows the key names and nothing about the game.

const LEFT = ['KeyA'];
const RIGHT = ['KeyD'];
const JUMP = ['Space', 'KeyW'];
const RESTART = ['KeyR'];

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
    if (event.repeat) return;
    apply(event.code, true);
    if (JUMP.includes(event.code) || RESTART.includes(event.code)) event.preventDefault();
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
