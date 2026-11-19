// The three WebGL2 shader programs of game2 (DG-P-02, DG-P-10).
// quad: a flat rectangle or a vertical gradient, used for the sky and the hearts.
// glow: a soft radial disc for the moon halo, the windows, and a blast flash.
// tex:  a piece of the runtime atlas stretched over a pixel rectangle.
// createPrograms(gl) compiles the programs and caches every uniform location,
// so a draw call never asks for a location again.

const VERSION = '#version 300 es\n';

// The logical viewport is 960 x 540 pixels (DG-P-04), so the mapping is fixed.
const TO_CLIP = 'gl_Position = vec4(p.x / 480.0 - 1.0, 1.0 - p.y / 270.0, 0.0, 1.0);';

// a_unit spans [-1, 1]. v_up is 1 at the top of the rect and 0 at its bottom.
const QUAD_VS = VERSION + `
in vec2 a_unit;
uniform vec4 u_rect;
out float v_up;
void main() {
  vec2 p = u_rect.xy + (a_unit * 0.5 + 0.5) * u_rect.zw;
  v_up = (1.0 - a_unit.y) * 0.5;
  ${TO_CLIP}
}`;

const QUAD_FS = VERSION + `
precision mediump float;
in float v_up;
uniform vec4 u_color;
uniform vec4 u_color2;
uniform float u_grad;
out vec4 frag;
void main() {
  frag = mix(u_color, u_color2, v_up * u_grad);
}`;

const GLOW_VS = VERSION + `
in vec2 a_unit;
uniform vec4 u_circle;
out vec2 v_rel;
void main() {
  v_rel = a_unit;
  vec2 p = u_circle.xy + a_unit * u_circle.z;
  ${TO_CLIP}
}`;

const GLOW_FS = VERSION + `
precision mediump float;
in vec2 v_rel;
uniform vec4 u_color;
uniform float u_inner;
uniform float u_intensity;
out vec4 frag;
void main() {
  float d = length(v_rel);
  float a = 1.0 - smoothstep(u_inner, 1.0, d);
  frag = vec4(u_color.rgb, u_color.a * a * u_intensity);
}`;

const ATLAS_VS = VERSION + `
in vec2 a_unit;
uniform vec4 u_rect;
out vec2 v_t;
void main() {
  v_t = a_unit * 0.5 + 0.5;
  vec2 p = u_rect.xy + v_t * u_rect.zw;
  ${TO_CLIP}
}`;

const ATLAS_FS = VERSION + `
precision highp float;
in vec2 v_t;
uniform vec4 u_uv;
uniform vec2 u_tiles;
uniform sampler2D u_atlas;
out vec4 frag;
void main() {
  vec2 cell = fract(v_t * u_tiles);
  frag = texture(u_atlas, mix(u_uv.xy, u_uv.zw, cell));
}`;

/** Compile one shader stage. A failure throws with the compiler message. */
function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`shader ${type}: ${gl.getShaderInfoLog(shader)}`);
  }
  return shader;
}

/** Link one program and cache the uniform and attribute locations it exposes. */
function link(gl, vertexSource, fragmentSource, uniformNames) {
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`link: ${gl.getProgramInfoLog(program)}`);
  }
  const uniforms = {};
  for (const name of uniformNames) {
    const location = gl.getUniformLocation(program, name);
    if (location === null) throw new Error(`uniform ${name} is missing from the program`);
    uniforms[name] = location;
  }
  const aUnit = gl.getAttribLocation(program, 'a_unit');
  if (aUnit < 0) throw new Error('attribute a_unit is missing from the program');
  return { program, aUnit, uniforms };
}

/** Build the three programs for one WebGL2 context. */
export function createPrograms(gl) {
  return {
    quad: link(gl, QUAD_VS, QUAD_FS, ['u_rect', 'u_color', 'u_color2', 'u_grad']),
    glow: link(gl, GLOW_VS, GLOW_FS, ['u_circle', 'u_color', 'u_inner', 'u_intensity']),
    atlas: link(gl, ATLAS_VS, ATLAS_FS, ['u_rect', 'u_uv', 'u_tiles', 'u_atlas']),
  };
}
