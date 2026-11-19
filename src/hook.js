// The window.__game state the game writes every frame (DG-P-08).
// A test compares these numbers, so the shape is part of the contract.
/**
 * @typedef {Object} GameState
 * @property {number} time             seconds since the level start
 * @property {{x:number,y:number,vx:number,vy:number,alive:boolean}} player
 * @property {number} enemiesAlive     enemies not stomped yet
 * @property {Array<{x:number,y:number}>} bombs
 * @property {Array<{x:number,y:number,radius:number,age:number}>} blasts
 * @property {number} moonU            moon phase in [0, 1) from DG-P-05
 * @property {{active:boolean,x:number}} jet
 * @property {number} lives            lives left in the run
 * @property {number} deaths           deaths since the run start
 * @property {boolean} gameOver        true while GAME OVER shows
 */

// The test hook the game always exposes on window.
/**
 * @typedef {Object} GameHook
 * @property {GameState} state
 * @property {{reset:Function,setPlayerPos:Function,spawnBomb:Function}} api
 */
