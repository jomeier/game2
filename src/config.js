// Tuning constants and the color palette for game2.
// Every physics number, timing value, and draw color lives in this file.
// The material ramps that paint the atlas are texture source data and live in
// render/textures.js; they are built from the DG-P-09 palette below.
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

// Band heights: the grass strip on the ground and the cap row on a platform.
export const GRASS_BAND = 9;
export const CAP_BAND = 5;

// Sprite animation speeds in frames per second (DG-P-10). The run cycle has six
// frames, so 12 fps gives a half-second stride. The hint strip shows for HINT_SECONDS.
export const ANIM_RUN_FPS = 12;
export const ANIM_IDLE_FPS = 2;
export const HINT_SECONDS = 7;

// Parallax factors from DG-P-04. A layer moves at camera * factor.
export const PARALLAX = { far: 0.15, mid: 0.35, near: 0.6 };
export const CITY_SEED = 20261119;

// The DG-P-09 night palette.
export const COLOR = {
  skyTop: '#0b1026',
  skyBottom: '#241b45',
  star: '#cfd8ff',
  moon: '#f7e8c0',
  moonRamp: ['#fff6dd', '#f7e8c0', '#dcc49b', '#a8977a'],
  far: '#262c52',
  mid: '#141a33',
  near: '#0c1024',
  platform: '#0a0d1e',
  platformTop: '#2c3563',
  window: '#ffc46b',
  windowCool: '#c3d4ff',
  windowDark: '#0d1226',
  wallFar: ['#3a4272', '#2a3158', '#1e2444', '#151a32'],
  wallMid: ['#242d54', '#18203c', '#101529', '#0a0e1d'],
  wallNear: ['#171d38', '#0d1226', '#080b18', '#04060f'],
  farEdge: '#3a4272',
  midEdge: '#242d54',
  nearEdge: '#1c2445',
  player: '#54e0f0',
  enemy: '#f0544e',
  enemyLight: '#ff9b96',
  enemyDark: '#8f2b28',
  enemyOutline: '#2a0a0d',
  blastLight: '#ff9b96',
  heartSpentLight: '#3a4066',
  heartFull: '#f0544e',
  heartSpent: '#2a2f4a',
  jet: '#a8d4ff',
  bomb: '#ffd23f',
  blast: '#ff8a3d',
  beacon: '#ff6b5e',
  jetDark: '#5d7fa8',
  // Material ramps for the atlas (DG-P-10). Four shades of one hue each, light
  // to dark. render/textures.js builds the ramps from these values.
  grassLight: '#63a55c',
  grass: '#3d7c46',
  grassDark: '#265429',
  grassDeep: '#16341f',
  dirtLight: '#5a4130',
  dirt: '#43301f',
  dirtDark: '#332316',
  dirtDeep: '#1f150e',
  stoneLight: '#5d6793',
  stone: '#414a6c',
  stoneDark: '#2f374f',
  stoneDeep: '#1b2032',
  stoneCapLight: '#8b96c9',
  stoneCapMid: '#4a5478',
  stoneCapDark: '#232a40',
  grassCapLight: '#7cb86b',
  grassCapMid: '#417f47',
  grassCapDark: '#1d4527',
  propSteel: '#232a40',
  propSteelLight: '#3a4272',
  bombBody: '#ffd23f',
  bombLight: '#fff0a8',
  bombDark: '#a37b14',
  bombFuse: '#8a6a10',
  bombOutline: '#241a05',
  sparkLight: '#fff6dd',
  hintGlyph: '#cfd8ff',
  heroBody: '#54e0f0',
  heroLight: '#d9fbff',
  heroMid: '#2fa8bd',
  heroDark: '#175d6d',
  heroVisor: '#0b2630',
  spriteOutline: '#05070f',
  blastHot: '#fff0a8',
  // Warm haze above the skyline, so the city sits in air and not on the sky.
  horizonHigh: '#3a2b52',
  horizonMid: '#54365a',
  horizonLow: '#6b3f57',
};

export const HEART_SIZE = 18;
export const HEART_GAP = 8;
export const HEART_X = 18;
export const HEART_Y = 18;
