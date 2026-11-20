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

// The mid row and the near row are drawn as one sprite per building, not as a
// tiled wall (DG-P-10, DG-P-11). A sprite owns its whole silhouette, so its box is
// the building. Every class is 128 px wide on purpose: a narrow frame makes the
// model paint a needle, and a needle is not a building. The near row stays short -
// a foreground plane is a narrow dark strip at the bottom of the picture, not a
// second wall of towers, and the towers behind it have to stay visible.
// The size classes per row, all 128 px wide. The near row has no short class: a
// 112 px foreground house read as a dwarf in front of a 256 px mid tower, and a
// foreground plane should anchor the picture rather than scramble for attention.
export const SPRITE_KLASSEN = {
  mid: { 192: 128, 256: 128 },
  nah: { 160: 128, 208: 128 },
};
const spriteKlassen = (entwurfe, klassen) => entwurfe
  .flatMap((design) => Object.entries(klassen).map(([h, w]) => ({ design, name: `${design}-${h}`, w: Number(w), h: Number(h) })));
export const SPRITE_MITTE = spriteKlassen(['deco', 'tank', 'slab', 'spire', 'wedge', 'twin'], SPRITE_KLASSEN.mid);
export const SPRITE_VORNE = spriteKlassen(['ziggurat', 'gable', 'trusses', 'sawtooth', 'twinsets', 'antenna'], SPRITE_KLASSEN.nah);

// Ten comic skyscraper fronts, and the tint each design wears: 0 base, 1 warm,
// 2 cool. Ten designs read as ten buildings; the three tints share the value steps
// of their layer, so a layer stays one distance and one haze (DG-P-11).
export const FRONT_DESIGNS = [
  ['grid', 0], ['ribbed', 1], ['arched', 0], ['banded', 2], ['bay', 1],
  ['escape', 0], ['corniced', 2], ['pierred', 1], ['chequer', 2], ['slit', 0],
];

// The wall tile of a design in the far row, the only row still tiled (DG-P-10).
export const CITY_FRONTS = {
  far: FRONT_DESIGNS.map(([design]) => `far${design[0].toUpperCase()}${design.slice(1)}`),
};

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
// The far row's wall tiles all share one box.
// How far each row sits in the night: a value ladder, not a paint step. The scene
// is a night skyline, so distance is simulated by DARKNESS - the far row is a dark
// mass with lights in it, the near row stands closest and brightest. The number is
// the mean luminance a row's picture has to land on, as a share of 255.
// tools/comfy/fronttexturen.mjs and tools/comfy/hochhaus.mjs measure each sheet's
// own mean and scale it onto this rung, so every design of a row sits at the same
// distance no matter how bright its sheet came out. city-windows then reads the
// ladder straight off the shipped files - the files are the ladder.
// No rung goes near blown-out white: the window density of a row is measured as
// warm pixels standing out from that row's own median, and a wall at full white
// would stop being separable from its windows at all.
// The rungs are chosen so a sheet can reach its rung with a mild correction: the
// tools refuse to amplify a sheet more than 1.6x, because pulling a dark sheet up
// does not make it bright, it drags the sheet's own noise up as white speckle. A
// row that cannot reach its rung means its art was ordered wrong, and the fix is
// the prompt, not a bigger gain.
export const FRONT_TIEFE = { far: 0.235, mid: 0.35, near: 0.47 };

// The grid a building lands on: its width is a whole number of CITY_GRID.w and its
// height a whole number of CITY_GRID.h, so a front texture is never stretched.
export const CITY_GRID = { w: 32, h: 64 };

for (const front of CITY_FRONTS.far) TILE[front] = [CITY_GRID.w, CITY_GRID.h];

// A sprite tile is its own box: the building is exactly that wide and tall, so it
// is never tiled and never stretched.
for (const { name, w, h } of [...SPRITE_MITTE, ...SPRITE_VORNE]) TILE[name] = [w, h];

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
