// Tuning constants and the color palette for game2.
// Every physics number, timing value, and color lives in this file.
// DG-P-03 fixes the physics values. DG-P-09 fixes the colors.
// A test reads these values through window.__gameConfig, so keep the names.

export const VIEW_W = 960;
export const VIEW_H = 540;
export const LEVEL_WIDTH = 3200;
export const GROUND_Y = 480;

export const FIXED_STEP = 1 / 120;
export const MAX_STEPS = 5;

export const PLAYER_W = 26;
export const PLAYER_H = 40;
export const PLAYER_SPAWN_X = 100;
export const GRAVITY = 2400;
export const JUMP_VY = -820;
export const MOVE_SPEED = 320;
export const MAX_FALL = 1100;
export const LAND_BAND = 10;

export const ENEMY_W = 26;
export const ENEMY_H = 24;
export const ENEMY_SPEED = 60;
export const ENEMY_SQUASH_S = 0.3;
export const STOMP_BOUNCE = -380;
// A stomp needs the pre-move foot above the enemy top plus this slack. DG-P-03.
export const STOMP_GRACE = 26;
export const DEATH_FREEZE_S = 1.0;
export const LIVES_START = 3;

export const JET_INTERVAL_S = 6;
export const JET_SPEED = 300;
export const JET_Y = 60;
export const JET_W = 52;
export const JET_H = 14;
export const JET_DROP_DIST = 50;
export const BOMB_CLAMP = 40;
export const BOMB_GRAVITY = 1400;
export const BOMB_R = 6;
export const BLAST_RADIUS = 90;
export const BLAST_FLASH_S = 0.2;

export const MOON_PERIOD_S = 10;
export const MOON_CX = 480;
export const MOON_CY = 560;
export const MOON_RX = 560;
export const MOON_RY = 470;
export const MOON_R = 44;

// The layout rule from docs/spec.md: gaps shrink to 90 % and stay at least 90 px.
export const PLATFORM_GAP_STEP = 0.9;
export const PLATFORM_GAP_MIN = 90;

// Parallax factors from DG-P-04. A layer moves at camera * factor.
export const PARALLAX = { far: 0.15, mid: 0.35, near: 0.6 };
export const CITY_SEED = 20261119;

// The DG-P-09 night palette.
export const COLOR = {
  skyTop: '#0b1026',
  skyBottom: '#241b45',
  star: '#cfd8ff',
  moon: '#f7e8c0',
  far: '#262c52',
  mid: '#141a33',
  near: '#0c1024',
  platform: '#0a0d1e',
  platformTop: '#2c3563',
  window: '#ffc46b',
  windowCool: '#c3d4ff',
  farEdge: '#3a4272',
  midEdge: '#242d54',
  nearEdge: '#1c2445',
  player: '#54e0f0',
  enemy: '#f0544e',
  jet: '#a8d4ff',
  bomb: '#ffd23f',
  blast: '#ff8a3d',
  beacon: '#ff6b5e',
};

// DG-P-08: the heart rule is state, so a test can read lives from __game.state.
export const HUD_HEART = '#f0544e';
export const HUD_SPENT = '#2a2f4a';
export const HEART_SIZE = 18;
export const HEART_GAP = 8;
export const HEART_X = 18;
export const HEART_Y = 18;
