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

// Band heights inside the 60 px ground strip (VIEW_H - GROUND_Y): grass on top,
// soil in the middle, a rock footing at the bottom. The three add up to 60.
// Each band height equals the height of the tile that fills it, so a tile never
// stretches: see the size table in render/README.md.
export const GRASS_BAND = 12;
export const SOIL_BAND = 21;
export const ROCK_BAND = 27;
export const CAP_BAND = 5;

// Sprite animation speeds in frames per second (DG-P-10). The run cycle has six
// frames, so 12 fps gives a half-second stride. The hint strip shows for HINT_SECONDS.
export const ANIM_RUN_FPS = 12;
export const ANIM_IDLE_FPS = 2;
export const HINT_SECONDS = 7;
export const HINT_Y = 74;

// Parallax factors from DG-P-04. A layer moves at camera * factor.
export const PARALLAX = { far: 0.15, mid: 0.35, near: 0.6 };
export const CITY_SEED = 20261119;

// Curtain-wall fronts (DG-P-10). A mid-layer tower of at least GLASS_MIN_H draws
// one of GLASS_TILES with GLASS_CHANCE, so a few glass skyscrapers stand between
// the brick towers and the skyline never looks ruled.
export const GLASS_TILES = ['glassMidA', 'glassMidB', 'glassMidC'];
export const GLASS_CHANCE = 0.42;
export const GLASS_MIN_H = 176;

// Ten comic skyscraper fronts, and the tint each design wears: 0 base, 1 warm,
// 2 cool. Ten designs read as ten buildings; the three tints share the value steps
// of their layer, so a layer stays one distance and one haze (DG-P-11).
export const FRONT_DESIGNS = [
  ['grid', 0], ['ribbed', 1], ['arched', 0], ['banded', 2], ['bay', 1],
  ['escape', 0], ['corniced', 2], ['pierred', 1], ['chequer', 2], ['slit', 0],
];

// The wall tile of a design inside a layer: far + Grid, mid + Grid, near + Grid.
export const CITY_FRONTS = {};
for (const [layer, prefix] of Object.entries({ far: 'far', mid: 'mid', near: 'near' })) {
  CITY_FRONTS[layer] = FRONT_DESIGNS.map(([design]) => prefix
    + design[0].toUpperCase() + design.slice(1));
}

// The tile boxes of the atlas, one source for render/textures.js and for the
// tile-fit test. A box must divide the surface it fills: the ground bands, the cap
// band, a platform body row, LEVEL_WIDTH, a building's width and height, and the
// moon disc. Where it does not, the tile is scaled and the pixel grid is gone.
export const TILE = {
  grass: [80, 12], tufts: [80, 6], dirt: [160, 21], rock: [160, 27],
  stone: [32, 16], stoneCap: [32, 5], grassCap: [16, 5],
  moon: [88, 88], shadow: [32, 8],
  hintMove: [156, 24], jet: [52, 14], bomb: [12, 14], spark: [8, 8],
  heartFull: [16, 16], heartSpent: [16, 16],
  propAntenna: [12, 15], propTank: [14, 13], propVent: [12, 12],
};
// City walls and curtain walls all share one box, so any building width that is a
// whole number of 16 and any height that is a whole number of 32 fits exactly.
// The value scale baked into the façade textures per city layer (DG-P-11: far the
// lightest, near almost black). tools/comfy/fronttexturen.mjs scales by these
// numbers when it writes the files, and the city-windows test divides them out
// again, so "how many windows burn" is measurable in absolute terms.
export const FRONT_LAYER_TON = { far: 1.06, mid: 0.82, near: 0.46 };

// The grid a building lands on: its width is a whole number of CITY_GRID.w and its
// height a whole number of CITY_GRID.h, so a front texture is never stretched.
export const CITY_GRID = { w: 32, h: 64 };

for (const front of [
  ...CITY_FRONTS.far, ...CITY_FRONTS.mid, ...CITY_FRONTS.near, ...GLASS_TILES,
]) {
  TILE[front] = [CITY_GRID.w, CITY_GRID.h];
}

// Stepped crowns (DG-P-11): the silhouette that reads as a comic skyscraper. A
// tower of at least SETBACK_MIN_H gets up to SETBACK_TIERS blocks stacked on its
// roof, each 16 px wide by 32 px tall - the wall grid, so a tier never stretches.
export const SETBACK_CHANCE = 0.45;
export const SETBACK_MIN_H = 160;
export const SETBACK_TIERS = 2;

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
  // Near windows sit far from the eye's light source: dimmer and cooler, so the
  // foreground reads as mass and the mid layer keeps the sparkle.
  windowNearWarm: '#8d7a58',
  windowNearCool: '#6c7a99',
  // Three clear value steps: the far layer is hazed and light, the near layer is
  // almost black, so the city reads as depth without any transparency (DG-P-11).
  // Each layer owns a trio of ramps: the base and two near relatives. A relative
  // keeps the four value steps of its layer and only turns the hue a little, so a
  // skyline of three tints still reads as one layer at one distance.
  wallFar: ['#5a6593', '#48517a', '#38405f', '#2a3149'],
  wallFarWarm: ['#61668a', '#4f5271', '#3f4156', '#313240'],
  wallFarCool: ['#556995', '#43557c', '#334461', '#25354b'],
  wallMid: ['#2c3560', '#212a48', '#161d33', '#0f1426'],
  wallMidWarm: ['#333657', '#282b3f', '#1d1e2a', '#16151d'],
  wallMidCool: ['#273962', '#1c2e4a', '#112135', '#0a1828'],
  // Four shades for a glass curtain wall: cool sky tones, lightest at the top.
  // A glass tower is the brightest object inside its own layer, but it stays
  // under the brightest shade of the layer behind it, so the value order of
  // DG-P-11 still holds. Glass only exists in the mid layer: the near layer
  // carries silhouette and no detail.
  glassMid: ['#545f8b', '#3a4468', '#28304a', '#171c2e'],
  // The near layer carries silhouette, not detail: it stays dark and nearly blind
  // so the mid layer keeps the window pattern and the eye has a place to rest.
  wallNear: ['#1c2342', '#141a33', '#0d1226', '#070a17'],
  wallNearWarm: ['#232439', '#1b1b2a', '#14131d', '#0e0b0e'],
  wallNearCool: ['#172744', '#0f1e35', '#081628', '#020e19'],
  edgeLightFar: '#6a76a8',
  edgeLightMid: '#3d4878',
  edgeLightNear: '#3f4a7a',
  edgeDark: '#04060f',
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
  grassLight: '#5b9557',
  grass: '#39703f',
  grassDark: '#254f2c',
  grassDeep: '#15301e',
  dirtLight: '#5a4130',
  dirt: '#43301f',
  dirtDark: '#332316',
  dirtDeep: '#1f150e',
  stoneLight: '#5d6793',
  stone: '#414a6c',
  stoneDark: '#2f374f',
  stoneDeep: '#1b2032',
  stoneCapLight: '#6f7aab',
  stoneCapMid: '#414a6c',
  stoneCapDark: '#232a40',
  // Four shades for the rock footing under the soil. It stays darker than the
  // platform stone: a bright masonry band at the bottom would compete with the
  // lit city behind it.
  rockFooting: ['#3e4666', '#333b57', '#282e45', '#161a27'],
  grassCapLight: '#6ba265',
  grassCapMid: '#3b7040',
  grassCapDark: '#1c4125',
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
