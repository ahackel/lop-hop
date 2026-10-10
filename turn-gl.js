// The 3D animal (turn3d.js) drawn on the GPU (WebGL 1, as Safari 15 has it), for the turn lab: the same model, the same
// rules, in two passes. The first finds what each pixel sees and keeps it in a texture: its color, its group (1: the
// body; a chain: 2…; the balls sunk into it: 200) and its depth (16 bits, in the last two channels). It does that one
// of two ways:
//   march  a ray down every pixel, stepping through all the model's parts (uniforms: three vec4s a part) till it is on
//          one; parts of the body melt into each other (as the CPU's: the same pixels)
//   parts  each part drawn on its own, as a box round it on the screen, each of its pixels working out exactly where its
//          ray meets that ball, ellipsoid or capsule (no steps) and the nearest kept (the depth test: EXT_frag_depth);
//          only the pixels a part covers do any work, but parts meet in a crease, nothing melts
//   mesh   a skinned, textured mesh (tools/turn-mesh.js: triangles, each vertex moved by up to four bones, its color
//          from a texture), drawn as any 3D game draws one
// The second outlines (round it; inside where a neighbour is nearer: another part, or the same one across air, the
// point half way between them worked out again from the two depths) and sticks on the eyes, the nose and the dots
// (where they sit on the surface worked out once a pose, on the CPU: decalPoints in turn3d.js). At the game's
// resolution (createGL) it writes palette indices, read back for the lab to paint, compare and time; at the screen's
// (createGLHi) colors, outlined as thick as you like, the marks on the surface, flat or lit.
import { DEPTH, model, modelPosed, view, decalsAt, decalPoints, GX, GY, GW, GH, PIVOT3, FLOOR3 } from './turn3d.js';
import { buildMesh, bonesFor } from './turn-mesh.js';
import { FOOT, COLOR } from './art.js';

const MAXP = 32, MAXD = 8, OUT = 1, MARKS = 200; // (the group of balls sunk into the body: no line between them)
const f = (v) => (Number.isInteger(v) ? `${v}.0` : String(v));
const COMMON = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
const float GX = ${f(GX)}, GY = ${f(GY)}, GW = ${f(GW)}, GH = ${f(GH)}, FLOOR = ${f(FLOOR3)};
const vec3 PIVOT = vec3(${PIVOT3.map(f).join(', ')});
uniform int uCount;
uniform vec4 uP0[${MAXP}], uP1[${MAXP}], uP2[${MAXP}]; // (type, k, group, color); ellipsoid: (c, cos), (r, sin); capsule: (a, r), (b, 0)
uniform vec4 uView; // cos, sin of the turn; of the tilt
uniform vec2 uAt; // where the picture's corner is in what it is drawn into (a tile of the objects layer's atlas; else 0)
float sdOf(vec4 p0, vec4 p1, vec4 p2, vec3 p) {
  if (p0.x < 0.5) {
    vec3 d = p - p1.xyz;
    vec3 l = vec3((d.x * p1.w + d.y * p2.w) / p2.x, (-d.x * p2.w + d.y * p1.w) / p2.y, d.z / p2.z);
    float k0 = length(l);
    if (k0 < 1e-6) return -min(p2.x, min(p2.y, p2.z));
    return k0 * (k0 - 1.0) / length(l / p2.xyz);
  }
  vec3 ba = p2.xyz - p1.xyz, pa = p - p1.xyz;
  float bb = dot(ba, ba), h = clamp(dot(pa, ba) / (bb > 0.0 ? bb : 1.0), 0.0, 1.0);
  return length(pa - ba * h) - p1.w;
}
float smin(float a, float b, float k) {
  if (k <= 0.0) return min(a, b);
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}
// the scene's distance; the group nearest (1: the body), the color of the part nearest in it
float scene(vec3 p, out float group, out float color) {
  float body = 1e9, best = 1e9;
  color = 0.0;
  for (int i = 0; i < ${MAXP}; i++) {
    if (i >= uCount) break;
    vec4 a = uP0[i];
    if (a.z > 1.5) continue;
    float d = sdOf(a, uP1[i], uP2[i], p);
    body = smin(body, d, a.y);
    if (d < best) { best = d; color = a.w; }
  }
  float d = body;
  group = 1.0;
  for (int i = 0; i < ${MAXP}; i++) {
    if (i >= uCount) break;
    vec4 a = uP0[i];
    if (a.z < 1.5) continue;
    float e = sdOf(a, uP1[i], uP2[i], p);
    if (e < d) { d = e; group = a.z; color = a.w; }
  }
  return d;
}
vec3 toWorld3(vec3 v) {
  vec3 q = v - PIVOT;
  float y = q.y * uView.z - q.z * uView.w, zz = q.y * uView.w + q.z * uView.z;
  return vec3(q.x * uView.x + zz * uView.y, y, -q.x * uView.y + zz * uView.x) + PIVOT;
}
`;
// the march: a ray down the middle of every pixel (uS screen pixels an art pixel, the picture uH high in them, drawn
// uLift art pixels higher), from the sphere round the model, till it is within uEps of a part
const MARCH = `${COMMON}
uniform vec3 uMid, uDir;
uniform float uR, uS, uH, uLift, uEps;
uniform int uSteps;
void main() {
  float vx = GX + (gl_FragCoord.x - uAt.x) / uS, vy = GY + (uH - gl_FragCoord.y + uAt.y) / uS + uLift, ox = vx - uMid.x, oy = vy - uMid.y;
  gl_FragColor = vec4(0.0);
  if (vy >= FLOOR || ox * ox + oy * oy > uR * uR) return;
  float zIn = uMid.z + sqrt(uR * uR - ox * ox - oy * oy), t = 0.0, g, c;
  vec3 o = toWorld3(vec3(vx, vy, zIn));
  for (int n = 0; n < 160; n++) {
    if (n >= uSteps || t >= 2.0 * uR) break;
    float d = scene(o + uDir * t, g, c);
    if (d < uEps) {
      float z = floor(clamp((zIn - t + 64.0) / 128.0, 0.0, 1.0) * 65535.0);
      gl_FragColor = vec4(c / 255.0, g / 255.0, floor(z / 256.0) / 255.0, mod(z, 256.0) / 255.0);
      return;
    }
    t += max(d * 0.8, uEps);
  }
}`;
// part by part: a box (two triangles) round each part, in view (a0…a2: the part, as the uniforms have it, the same at
// every corner); each pixel in it meets the part exactly or is left alone
const CONSTS = `const float GX = ${f(GX)}, GY = ${f(GY)}, GW = ${f(GW)}, GH = ${f(GH)}, FLOOR = ${f(FLOOR3)};`;
const PARTS_VERT = `${CONSTS}
attribute vec2 p;
attribute vec4 a0, a1, a2;
uniform float uLift;
varying vec4 v0, v1, v2;
void main() {
  v0 = a0; v1 = a1; v2 = a2;
  gl_Position = vec4((p.x - GX) / GW * 2.0 - 1.0, 1.0 - (p.y - uLift - GY) / GH * 2.0, 0.0, 1.0);
}`;
const PARTS = `#extension GL_EXT_frag_depth : require
${COMMON}
uniform vec3 uDir;
uniform float uZ0, uR, uS, uH, uLift; // uZ0: where the rays start (in front of it all), in view
varying vec4 v0, v1, v2;
// where a ray (o, d: d of length 1) first meets the part: how far along it; none: -1
float ball(vec3 o, vec3 d, vec3 c, float r) {
  vec3 oc = o - c;
  float b = dot(d, oc), h = b * b - dot(oc, oc) + r * r;
  return h < 0.0 ? -1.0 : -b - sqrt(h);
}
float meet(vec3 o, vec3 d) {
  if (v0.x < 0.5) { // an ellipsoid: in its own turned and stretched space, a ball of 1
    vec3 e = o - v1.xyz;
    vec3 lo = vec3(e.x * v1.w + e.y * v2.w, -e.x * v2.w + e.y * v1.w, e.z) / v2.xyz;
    vec3 ld = vec3(d.x * v1.w + d.y * v2.w, -d.x * v2.w + d.y * v1.w, d.z) / v2.xyz;
    float a = dot(ld, ld), b = dot(lo, ld), h = b * b - a * (dot(lo, lo) - 1.0);
    return h < 0.0 ? -1.0 : (-b - sqrt(h)) / a;
  }
  // a capsule (Inigo Quilez's): its side, else the ball at the end nearer; one as long as it is wide: a ball
  vec3 pa = v1.xyz, ba = v2.xyz - pa, oa = o - pa;
  float r = v1.w, baba = dot(ba, ba);
  if (baba < 1e-6) return ball(o, d, pa, r);
  float bard = dot(ba, d), baoa = dot(ba, oa), a = baba - bard * bard, b = baba * dot(d, oa) - baoa * bard;
  float h = b * b - a * (baba * dot(oa, oa) - baoa * baoa - r * r * baba);
  if (h < 0.0) return -1.0;
  float t = (-b - sqrt(h)) / a, y = baoa + t * bard;
  if (y > 0.0 && y < baba) return t;
  return ball(o, d, y <= 0.0 ? pa : v2.xyz, r);
}
void main() {
  float vx = GX + (gl_FragCoord.x - uAt.x) / uS, vy = GY + (uH - gl_FragCoord.y + uAt.y) / uS + uLift;
  if (vy >= FLOOR) discard;
  float t = meet(toWorld3(vec3(vx, vy, uZ0)), uDir);
  if (t < 0.0) discard;
  float z = floor(clamp((uZ0 - t + 64.0) / 128.0, 0.0, 1.0) * 65535.0);
  gl_FragColor = vec4(floor(v0.w + 0.5) / 255.0, floor(v0.z + 0.5) / 255.0, floor(z / 256.0) / 255.0, mod(z, 256.0) / 255.0);
  gl_FragDepthEXT = clamp(t / (2.0 * uR), 0.0, 1.0);
}`;
const FINISH = `${COMMON}
uniform sampler2D uTex;
uniform vec2 uTexSize; // the first pass's texture (the picture at uAt in it)
uniform float uGap, uBlink, uColor; // color: palette colors out (the sky clear), not palette indices
uniform sampler2D uPal;
uniform int uDecals;
uniform vec4 uD0[${MAXD}], uD1[${MAXD}]; // (v, -), (nv.x, nv.y, color, eye)
vec4 at(float i, float j) { return texture2D(uTex, vec2((uAt.x + i + 0.5) / uTexSize.x, (uAt.y + GH - 1.0 - j + 0.5) / uTexSize.y)); }
float grp(vec4 s) { return floor(s.g * 255.0 + 0.5); }
float col(vec4 s) { return floor(s.r * 255.0 + 0.5); }
float dep(vec4 s) { return (floor(s.b * 255.0 + 0.5) * 256.0 + floor(s.a * 255.0 + 0.5)) / 65535.0 * 128.0 - 64.0; }
void main() {
  float i = floor(gl_FragCoord.x - uAt.x), j = GH - 1.0 - floor(gl_FragCoord.y - uAt.y), g, c;
  vec4 me = at(i, j);
  float myG = grp(me), myZ = dep(me), outc = col(me);
  for (int k = 0; k < 4; k++) {
    vec2 o = k == 0 ? vec2(1.0, 0.0) : k == 1 ? vec2(-1.0, 0.0) : k == 2 ? vec2(0.0, 1.0) : vec2(0.0, -1.0);
    float a = i + o.x, b = j + o.y;
    if (a < 0.0 || b < 0.0 || a >= GW || b >= GH) continue;
    vec4 nb = at(a, b);
    float nG = grp(nb);
    if (nG < 0.5) continue;
    if (myG < 0.5) { if (GY + j < FLOOR) outc = ${f(OUT)}; break; }
    float nZ = dep(nb);
    if (nZ <= myZ + 0.3 || nG == ${f(MARKS)} || myG == ${f(MARKS)}) continue;
    if (nG != myG) { outc = ${f(OUT)}; break; }
    if (uGap < 0.0) continue; // (gap < 0: no line inside a part across air, the shape not worked out again)
    vec3 mid = (toWorld3(vec3(GX + i + 0.5, GY + j + 0.5, myZ)) + toWorld3(vec3(GX + a + 0.5, GY + b + 0.5, nZ))) * 0.5;
    if (scene(mid, g, c) > uGap) { outc = ${f(OUT)}; break; }
  }
  for (int d = 0; d < ${MAXD}; d++) {
    if (d >= uDecals) break;
    vec4 a = uD0[d], b = uD1[d];
    float di = floor(a.x) - GX, dj = floor(a.y) - GY;
    if (di >= 0.0 && dj >= 0.0 && di < GW && dj < GH && grp(at(di, dj)) < 0.5) { if (abs(b.x) >= abs(b.y)) di -= sign(b.x); else dj -= sign(b.y); }
    if (di < 0.0 || dj < 0.0 || di >= GW || dj >= GH) continue;
    vec4 tg = at(di, dj);
    if (abs(grp(tg) - 1.0) > 0.5 || a.z < dep(tg) - 2.0) continue;
    if (b.w > 0.5) {
      if (i == di && j == dj + 1.0 && myG > 0.5) outc = ${f(OUT)};
      if (i == di && j == dj && uBlink < 0.5) outc = ${f(OUT)};
    } else if (i == di && j == dj) outc = b.z;
  }
  gl_FragColor = uColor < 0.5 ? vec4(outc / 255.0, 0.0, 0.0, 1.0) : outc < 0.5 ? vec4(0.0) : vec4(texture2D(uPal, vec2((outc + 0.5) / 64.0, 0.5)).rgb, 1.0);
}`;
// a skinned mesh: each corner moved by its bones (uB: three rows of an affine map a bone), turned into view; its color
// from the texture (palette indices), its group (uG: by the mesh's group's index), lines along its triangles' edges
// (uWire)
const MESH_VERT = `${CONSTS}
const vec3 PIVOT = vec3(${PIVOT3.map(f).join(', ')});
attribute vec3 pos;
attribute vec2 uv;
attribute vec4 bi, bw;
attribute float grp;
attribute vec3 bary;
uniform vec4 uB[${3 * MAXP}];
uniform float uG[8];
uniform vec4 uView;
uniform float uLift, uZ0, uR;
varying vec2 vUv;
varying vec3 vV, vBary;
varying float vG;
vec3 bone(float b, vec3 p) {
  int k = int(b + 0.5) * 3;
  vec4 q = vec4(p, 1.0);
  return vec3(dot(uB[k], q), dot(uB[k + 1], q), dot(uB[k + 2], q));
}
void main() {
  vec3 w = bone(bi.x, pos) * bw.x + bone(bi.y, pos) * bw.y + bone(bi.z, pos) * bw.z + bone(bi.w, pos) * bw.w - PIVOT;
  float x1 = w.x * uView.x - w.z * uView.y, z1 = w.x * uView.y + w.z * uView.x;
  vec3 v = vec3(x1, w.y * uView.z + z1 * uView.w, -w.y * uView.w + z1 * uView.z) + PIVOT;
  vUv = uv; vV = v; vBary = bary;
  vG = 1.0;
  for (int i = 0; i < 8; i++) if (float(i) == grp) vG = uG[i];
  gl_Position = vec4((v.x - GX) / GW * 2.0 - 1.0, 1.0 - (v.y - uLift - GY) / GH * 2.0, clamp((uZ0 - v.z) / (2.0 * uR), 0.0, 1.0) * 2.0 - 1.0, 1.0);
}`;
const MESH = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
${CONSTS}
uniform sampler2D uSkin;
uniform float uWire;
varying vec2 vUv;
varying vec3 vV, vBary;
varying float vG;
void main() {
  if (vV.y >= FLOOR) discard;
  float c = floor(texture2D(uSkin, vUv).r * 255.0 + 0.5);
  if (uWire > 0.5 && min(vBary.x, min(vBary.y, vBary.z)) < 0.04) c = ${f(OUT)};
  float z = floor(clamp((vV.z + 64.0) / 128.0, 0.0, 1.0) * 65535.0);
  gl_FragColor = vec4(c / 255.0, floor(vG + 0.5) / 255.0, floor(z / 256.0) / 255.0, mod(z, 256.0) / 255.0);
}`;
const VERT = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }';

// a part's box on the screen, in view: its corners (a box round it in the world) turned, the widest
function boxOf(q, toView) {
  const pts = [];
  if (q.type === 'ell') {
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      const x = sx * q.r[0], y = sy * q.r[1];
      pts.push([q.c[0] + x * q.cos - y * q.sin, q.c[1] + x * q.sin + y * q.cos, q.c[2] + sz * q.r[2]]);
    }
  } else for (const e of [q.a, q.b]) for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) pts.push([e[0] + sx * q.r, e[1] + sy * q.r, e[2] + sz * q.r]);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const w of pts) { const v = toView(w); x0 = Math.min(x0, v[0]); y0 = Math.min(y0, v[1]); x1 = Math.max(x1, v[0]); y1 = Math.max(y1, v[1]); }
  return [x0 - 0.5, y0 - 0.5, x1 + 0.5, y1 + 0.5];
}

// what the renderers share: a WebGL canvas (a new one, or the page's: the objects layer's); the first pass (either way)
// into a texture as big as the picture (target(width, height)), or into a tile of a bigger one (the objects layer's
// atlas); the parts into uniforms (setParts) or boxes (the parts pass)
function core(canvasOpts, canvas = document.createElement('canvas')) {
  const gl = canvas.getContext('webgl', { antialias: false, depth: false, stencil: false, premultipliedAlpha: false, ...canvasOpts });
  if (!gl || gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) < 3 * MAXP + 2 * MAXD + 12) return null;
  const program = (vs, fs, attribs = ['p']) => {
    const p = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      gl.attachShader(p, s);
    }
    attribs.forEach((a, i) => gl.bindAttribLocation(p, i, a));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name.replace(/\[0\]$/, ''); u[name] = gl.getUniformLocation(p, name); }
    return { p, u };
  };
  const march = program(VERT, MARCH), parts = gl.getExtension('EXT_frag_depth') ? program(PARTS_VERT, PARTS, ['p', 'a0', 'a1', 'a2']) : null;
  const skinned = gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS) >= 3 * MAXP + 16 ? program(MESH_VERT, MESH, ['pos', 'uv', 'bi', 'bw', 'grp', 'bary']) : null;
  const tri = gl.createBuffer(), boxes = gl.createBuffer(), corners = new Float32Array(MAXP * 6 * 14);
  gl.bindBuffer(gl.ARRAY_BUFFER, tri);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); // (one triangle over it all)
  const full = () => { // (the one triangle, for a pass over every pixel)
    gl.bindBuffer(gl.ARRAY_BUFFER, tri);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    for (let i = 1; i < 6; i++) gl.disableVertexAttribArray(i);
  };
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  const fbo = gl.createFramebuffer(), depthBuf = gl.createRenderbuffer();
  // (into the first pass's texture, if not already: on a phone's or an iPad's GPU binding it again, even as it was,
  // ends what it is drawing and starts again, its whole picture written out and read back in, an object at a time)
  const onto = () => { if (gl.getParameter(gl.FRAMEBUFFER_BINDING) !== fbo) gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); };
  let size = '';
  const target = (width, height) => {
    if (size === `${width}x${height}`) return;
    size = `${width}x${height}`;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuf);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuf);
  };
  const P0 = new Float32Array(MAXP * 4), P1 = new Float32Array(MAXP * 4), P2 = new Float32Array(MAXP * 4);
  // the parts, as the shaders have them; drawn part by part, nothing melts (k 0: the outlines' and the light's
  // distances as hard as the parts are)
  let groups = null;
  const fill = (m, hard) => {
    groups = { body: 1, marks: MARKS };
    let next = 2;
    m.prims.slice(0, MAXP).forEach((q, i) => {
      const g = groups[q.group] || (groups[q.group] = next++);
      P0.set([q.type === 'ell' ? 0 : 1, hard ? 0 : q.k, g, q.color], i * 4);
      if (q.type === 'ell') { P1.set([...q.c, q.cos], i * 4); P2.set([...q.r, q.sin], i * 4); } else { P1.set([...q.a, q.r], i * 4); P2.set([...q.b, 0], i * 4); }
    });
  };
  const setParts = (u, m, v) => {
    gl.uniform1i(u.uCount, Math.min(MAXP, m.prims.length));
    gl.uniform4fv(u.uP0, P0); gl.uniform4fv(u.uP1, P1); gl.uniform4fv(u.uP2, P2);
    gl.uniform4f(u.uView, v.cy, v.sy, v.ct, v.st);
  };
  // a mesh on the GPU, the first time it is drawn: its corners, its textures (open eyes and shut)
  const meshes = new WeakMap();
  const upload = (mesh) => {
    let g = meshes.get(mesh);
    if (g) return g;
    g = { buf: gl.createBuffer() };
    gl.bindBuffer(gl.ARRAY_BUFFER, g.buf);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.data, gl.STATIC_DRAW);
    for (const k of ['open', 'shut']) {
      const t = (g[k] = gl.createTexture());
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, mesh.texture.w, mesh.texture.h, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, mesh.texture[k]);
      for (const [p, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, p, v);
    }
    meshes.set(mesh, g);
    return g;
  };
  // the first pass, into the texture (width × height, S screen pixels an art pixel, lift: drawn that much higher):
  // marched (eps: how near a part counts as on it; steps: at most), part by part, or a skinned mesh (skin: { mesh,
  // bones, shut, wire }); or into a tile of it (size: the texture's [w, h], at: the tile's corner in it; clear: false,
  // cleared already, each tile its own, see createLayer)
  const first = (m, v, { width, height, S, lift, byParts, eps, steps, skin, size = null, at = null, clear = true }) => {
    target(size ? size[0] : width, size ? size[1] : height);
    const ax = at ? at[0] : 0, ay = at ? at[1] : 0;
    fill(m, byParts); // (a mesh melted as the march's: its light and outlines from the melted parts)
    if (skin && skinned) {
      const g = upload(skin.mesh), B = new Float32Array(3 * MAXP * 4), G = new Float32Array(8);
      B.set(skin.bones.subarray(0, Math.min(skin.bones.length, B.length)));
      skin.mesh.groups.forEach((name, i) => { G[i] = groups[name] || 1; });
      onto();
      gl.viewport(ax, ay, width, height);
      if (clear) { gl.clearColor(0, 0, 0, 0); gl.clearDepth(1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); }
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS);
      gl.useProgram(skinned.p);
      gl.bindBuffer(gl.ARRAY_BUFFER, g.buf);
      [3, 2, 4, 4, 1, 3].forEach((k, i) => { gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, k, gl.FLOAT, false, 68, [0, 12, 20, 36, 52, 56][i] ); });
      gl.uniform4fv(skinned.u.uB, B); gl.uniform1fv(skinned.u.uG, G);
      gl.uniform4f(skinned.u.uView, v.cy, v.sy, v.ct, v.st);
      gl.uniform1f(skinned.u.uLift, lift); gl.uniform1f(skinned.u.uZ0, v.midV[2] + v.R); gl.uniform1f(skinned.u.uR, v.R);
      gl.uniform1f(skinned.u.uWire, skin.wire ? 1 : 0);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, skin.shut ? g.shut : g.open); gl.uniform1i(skinned.u.uSkin, 0);
      gl.drawArrays(gl.TRIANGLES, 0, skin.mesh.count);
      gl.disable(gl.DEPTH_TEST);
      full();
      return;
    }
    onto();
    gl.viewport(ax, ay, width, height);
    if (!byParts) {
      full();
      gl.useProgram(march.p); setParts(march.u, m, v); gl.uniform2f(march.u.uAt, ax, ay);
      gl.uniform3f(march.u.uMid, ...v.midV); gl.uniform3f(march.u.uDir, ...v.dirW); gl.uniform1f(march.u.uR, v.R);
      gl.uniform1f(march.u.uS, S); gl.uniform1f(march.u.uH, height); gl.uniform1f(march.u.uLift, lift);
      gl.uniform1f(march.u.uEps, eps); gl.uniform1i(march.u.uSteps, steps);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return;
    }
    const n = Math.min(MAXP, m.prims.length);
    for (let i = 0; i < n; i++) {
      const [x0, y0, x1, y1] = boxOf(m.prims[i], v.toView);
      [[x0, y0], [x1, y0], [x0, y1], [x0, y1], [x1, y0], [x1, y1]].forEach(([x, y], k) => {
        const o = (i * 6 + k) * 14;
        corners[o] = x; corners[o + 1] = y;
        corners.set(P0.subarray(i * 4, i * 4 + 4), o + 2); corners.set(P1.subarray(i * 4, i * 4 + 4), o + 6); corners.set(P2.subarray(i * 4, i * 4 + 4), o + 10);
      });
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, boxes);
    gl.bufferData(gl.ARRAY_BUFFER, corners.subarray(0, n * 6 * 14), gl.DYNAMIC_DRAW);
    [2, 4, 4, 4].forEach((k, i) => { gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, k, gl.FLOAT, false, 56, [0, 8, 24, 40][i]); });
    if (clear) { gl.clearColor(0, 0, 0, 0); gl.clearDepth(1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); }
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS);
    gl.useProgram(parts.p);
    gl.uniform4f(parts.u.uView, v.cy, v.sy, v.ct, v.st); gl.uniform2f(parts.u.uAt, ax, ay);
    gl.uniform3f(parts.u.uDir, ...v.dirW); gl.uniform1f(parts.u.uZ0, v.midV[2] + v.R); gl.uniform1f(parts.u.uR, v.R);
    gl.uniform1f(parts.u.uS, S); gl.uniform1f(parts.u.uH, height); gl.uniform1f(parts.u.uLift, lift);
    gl.drawArrays(gl.TRIANGLES, 0, n * 6);
    gl.disable(gl.DEPTH_TEST);
    full();
  };
  // a palette, into a row of 64 (the last: the sky) on texture unit 1
  const palTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, palTex);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  let palOf = null;
  const usePalette = (pal) => {
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, palTex);
    if (palOf !== pal) {
      palOf = pal;
      const rgb = new Uint8Array(64 * 4);
      for (let i = 0; i < 64; i++) { const h = i === 63 ? pal.bg : pal[i] || pal.bg, x = parseInt(h.slice(1, 7), 16); rgb.set([x >> 16, (x >> 8) & 255, x & 255, 255], i * 4); }
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 64, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgb);
    }
    gl.activeTexture(gl.TEXTURE0);
  };
  return { canvas, gl, program, first, fill, setParts, tex, fbo, full, usePalette, byParts: !!parts, skinned: !!skinned };
}

// → a renderer at the game's resolution ({ draw(m, yaw, tilt, { gap, blink, parts, skin, read }) → palette indices, as
// draw3d's (parts: part by part, not marched; skin: { mesh, bones, wire }: a skinned mesh (turn-mesh.js) instead; pal: in
// that palette's colors on a clear canvas instead, for a game to copy out, nothing read back; read: false: none, left in its canvas only, as a game would copy it out:
// no waiting for the GPU); canvas; info; byParts, skinned: whether it can draw part by part, a skinned mesh }), or null (no WebGL, or too few
// uniforms for the parts)
export function createGL() {
  const c = core({ preserveDrawingBuffer: true });
  if (!c) return null;
  const { canvas, gl, program, first, setParts, tex } = c;
  canvas.width = GW; canvas.height = GH;
  const finish = program(VERT, FINISH);
  const D0 = new Float32Array(MAXD * 4), D1 = new Float32Array(MAXD * 4), rgba = new Uint8Array(GW * GH * 4);
  return {
    canvas,
    byParts: c.byParts,
    skinned: c.skinned,
    info: `WebGL ${gl.getParameter(gl.VERSION)}; ${gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS)} uniform vectors${c.byParts ? '' : '; no EXT_frag_depth: not part by part'}`,
    draw(m, yaw, tilt, { gap = 0.25, blink = false, parts = false, skin = null, read = true, pal = null } = {}) {
      const v = view(m, yaw, tilt), decals = skin ? [] : decalsAt(m, v.toView).slice(0, MAXD); // (a mesh: its eyes in its texture)
      decals.forEach((d, i) => { D0.set([...d.v, 0], i * 4); D1.set([d.nv[0], d.nv[1], d.color, d.eye ? 1 : 0], i * 4); });
      first(m, v, { width: GW, height: GH, S: 1, lift: 0, byParts: parts && c.byParts, eps: 0.01, steps: 120, skin: skin && { ...skin, shut: blink } });
      // outlines and what is stuck on, onto the canvas; read back
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, GW, GH);
      gl.useProgram(finish.p); setParts(finish.u, m, v);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(finish.u.uTex, 0);
      gl.uniform2f(finish.u.uTexSize, GW, GH); gl.uniform2f(finish.u.uAt, 0, 0);
      gl.uniform1f(finish.u.uGap, gap); gl.uniform1f(finish.u.uBlink, blink ? 1 : 0);
      gl.uniform1i(finish.u.uDecals, decals.length); gl.uniform4fv(finish.u.uD0, D0); gl.uniform4fv(finish.u.uD1, D1);
      gl.uniform1f(finish.u.uColor, pal ? 1 : 0);
      if (pal) { c.usePalette(pal); gl.uniform1i(finish.u.uPal, 1); }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!read || pal) return null;
      gl.readPixels(0, 0, GW, GH, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
      const out = new Uint8Array(GW * GH);
      for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) out[j * GW + i] = rgba[((GH - 1 - j) * GW + i) * 4]; // (its rows bottom up)
      return out;
    },
  };
}

// ------------------------------------------------------------------------------------------- at screen resolution
const FINISH_HI = `${COMMON}
uniform sampler2D uTex, uPal;
uniform vec2 uSize; // the picture, in screen pixels
uniform float uS, uLift, uGap, uLine, uLook, uBlink; // look: 0 flat, 1 two tones, 2 smooth light
uniform vec3 uLight; // toward the light, in the world
uniform int uDecals;
uniform vec4 uD0[${MAXD}], uD1[${MAXD}]; // (p, eye), (color, -, -, -): in the world
vec4 at(vec2 q) { return texture2D(uTex, (q + 0.5) / uSize); }
float grp(vec4 s) { return floor(s.g * 255.0 + 0.5); }
float col(vec4 s) { return floor(s.r * 255.0 + 0.5); }
float dep(vec4 s) { return (floor(s.b * 255.0 + 0.5) * 256.0 + floor(s.a * 255.0 + 0.5)) / 65535.0 * 128.0 - 64.0; }
vec3 pal(float i) { return texture2D(uPal, vec2((i + 0.5) / 64.0, 0.5)).rgb; }
vec3 viewAt(vec2 q, float z) { return vec3(GX + (q.x + 0.5) / uS, GY + (uSize.y - q.y - 0.5) / uS + uLift, z); }
void main() {
  vec2 q = floor(gl_FragCoord.xy);
  vec4 me = at(q);
  float myG = grp(me), myZ = dep(me), g, c, line = uLine * uS;
  vec3 v = viewAt(q, myZ);
  if (myG < 0.5) {
    // the sky (the ground line), or the outline round it: any of it within an art pixel
    float row = GY + (uSize.y - q.y - 0.5) / uS;
    vec3 sky = row >= ${f(FOOT)} && row < ${f(FOOT + 1)} ? pal(${f(COLOR.INK)}) : pal(63.0);
    bool edge = false;
    for (int k = 0; k < 16; k++) {
      float a = float(k) * 0.3927;
      for (int r = 1; r <= 2; r++) {
        vec2 o = floor(vec2(cos(a), sin(a)) * line * float(r) * 0.5 + 0.5);
        if (grp(at(q + o)) > 0.5) edge = true;
      }
    }
    gl_FragColor = vec4(edge && v.y < FLOOR + uLift ? pal(1.0) : sky, 1.0);
    return;
  }
  vec3 w = toWorld3(v);
  // inside: outlined where a neighbour within an art pixel is nearer, another part or the same one across air
  bool edge = false;
  for (int k = 0; k < 16; k++) {
    float a = float(k) * 0.3927;
    vec2 o = floor(vec2(cos(a), sin(a)) * line + 0.5);
    vec4 nb = at(q + o);
    float nG = grp(nb), nZ = dep(nb);
    if (nG < 0.5 || nZ <= myZ + 0.3 || nG == ${f(MARKS)} || myG == ${f(MARKS)}) continue;
    if (nG != myG) { edge = true; break; }
    vec3 mid = (w + toWorld3(viewAt(q + o, nZ))) * 0.5;
    if (scene(mid, g, c) > uGap) { edge = true; break; }
  }
  float ci = col(me);
  // stuck on: within a mark's reach of where it sits on the surface (an eye: an upright oval, two art pixels high)
  if (myG < 1.5) for (int d = 0; d < ${MAXD}; d++) {
    if (d >= uDecals) break;
    vec4 a = uD0[d];
    vec3 e = w - a.xyz;
    if (a.w > 0.5) {
      if (uBlink > 0.5) { e.y -= 1.0; if (length(e / vec3(0.6, 0.35, 0.6)) < 1.0) ci = ${f(OUT)}; }
      else { e.y -= 0.5; if (length(e / vec3(0.6, 1.05, 0.6)) < 1.0) ci = ${f(OUT)}; }
    } else if (length(e) < 0.6) ci = uD1[d].x;
  }
  vec3 rgb = pal(ci);
  if (uLook > 0.5 && ci != ${f(OUT)}) {
    float h = 0.02, s0 = scene(w, g, c);
    vec3 n = normalize(vec3(scene(w + vec3(h, 0, 0), g, c) - s0, scene(w + vec3(0, h, 0), g, c) - s0, scene(w + vec3(0, 0, h), g, c) - s0));
    float l = dot(n, uLight);
    rgb *= uLook < 1.5 ? (l < -0.15 ? 0.82 : 1.0) : 0.8 + 0.28 * max(l, 0.0) - 0.08 * max(-l, 0.0);
  }
  gl_FragColor = vec4(edge ? pal(1.0) : rgb, 1.0);
}`;

// → a renderer at screen resolution ({ canvas, byParts, draw(m, yaw, tilt, { width, height, lift, gap, line, look, blink,
// pal, parts, skin }) }), or null. width, height: in screen pixels (the canvas made that big); line: how thick the outlines
// are (art pixels); look: 'flat', 'cel' (lit and in shadow) or 'lit'; pal: a palette (the sky: its bg); parts: part by
// part, not marched
export function createGLHi() {
  const c = core({ preserveDrawingBuffer: true });
  if (!c) return null;
  const { canvas, gl, program, first, setParts, tex } = c;
  const finish = program(VERT, FINISH_HI);
  const D0 = new Float32Array(MAXD * 4), D1 = new Float32Array(MAXD * 4);
  return {
    canvas,
    byParts: c.byParts,
    skinned: c.skinned,
    draw(m, yaw, tilt, { width, height, lift = 0, gap = 0.25, line = 1, look = 'flat', blink = false, pal, parts = false, skin = null }) {
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      const v = view(m, yaw, tilt), S = width / GW, decals = skin ? [] : decalPoints(m).slice(0, MAXD);
      decals.forEach((d, i) => { D0.set([...d.p, d.eye ? 1 : 0], i * 4); D1.set([d.color, 0, 0, 0], i * 4); });
      const light = v.toWorld3([PIVOT3[0] - 0.45, PIVOT3[1] - 0.75, PIVOT3[2] + 0.5]).map((x, i) => x - PIVOT3[i]), ll = Math.hypot(...light);
      first(m, v, { width, height, S, lift, byParts: parts && c.byParts, eps: 0.002, steps: 160, skin: skin && { ...skin, shut: blink } });
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, width, height);
      gl.useProgram(finish.p); setParts(finish.u, m, v);
      gl.uniform1f(finish.u.uS, S); gl.uniform1f(finish.u.uLift, lift);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(finish.u.uTex, 0);
      c.usePalette(pal); gl.uniform1i(finish.u.uPal, 1);
      gl.uniform2f(finish.u.uSize, width, height);
      gl.uniform1f(finish.u.uGap, gap); gl.uniform1f(finish.u.uLine, line); gl.uniform1f(finish.u.uBlink, blink ? 1 : 0);
      gl.uniform1f(finish.u.uLook, { flat: 0, cel: 1, lit: 2 }[look] ?? 0);
      gl.uniform3f(finish.u.uLight, ...light.map((x) => x / ll));
      gl.uniform1i(finish.u.uDecals, decals.length); gl.uniform4fv(finish.u.uD0, D0); gl.uniform4fv(finish.u.uD1, D1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.activeTexture(gl.TEXTURE0);
    },
  };
}

// ----------------------------------------------------------------------------------------------------- the game's
// the game's (?turn3d): an animal drawn on the GPU at its own resolution, in its palette on a clear canvas, copied onto
// the game's at the corner of its box; how: 'mesh' (a skinned, textured mesh: made at once for each kind given, so the
// first one drawn has no wait), 'rays' (stepping rays) or 'parts' (part by part). → { draw(ctx, kind, move, frame, yaw
// (degrees), x, y, pal, { blink, chains, swing, snap }): a move's frame turned; posed(ctx, kind, P, x, y, pal, { blink,
// chains, snap }): as art.js has posed it (any of its pictures), from the side }, or null (no WebGL: the game draws on
// the CPU)
export function createSprites({ how = 'mesh', kinds = [] } = {}) {
  const r = createGL();
  if (!r || (how === 'mesh' && !r.skinned) || (how === 'parts' && !r.byParts)) return null;
  const meshes = {}, meshOf = (k) => meshes[k] || (meshes[k] = buildMesh(k, { depth: DEPTH[k] }));
  if (how === 'mesh') kinds.forEach(meshOf);
  const put = (ctx, kind, m, yaw, x, y, pal, blink, snap) => {
    const skin = how === 'mesh' ? { mesh: meshOf(kind), bones: null } : null;
    if (skin) skin.bones = bonesFor(skin.mesh, m);
    r.draw(m, (yaw * Math.PI) / 180, 0, { blink, parts: how === 'parts', skin, pal });
    ctx.drawImage(r.canvas, snap(x + GX), snap(y + GY));
  };
  const marks = how === 'mesh' ? 'none' : 'decals';
  return {
    how,
    draw(ctx, kind, move, frame, yaw, x, y, pal, { blink = false, chains = null, swing = null, snap = (v) => v } = {}) {
      put(ctx, kind, model(kind, move, frame, { chains, swing, marks }), yaw, x, y, pal, blink, snap);
    },
    posed(ctx, kind, P, x, y, pal, { blink = false, chains = null, snap = (v) => v } = {}) {
      put(ctx, kind, modelPosed(kind, P, { chains, marks }), 0, x, y, pal, blink, snap);
    },
  };
}

// ------------------------------------------------------------------------------------------------ the objects layer
// Every object drawn live each frame, all of them on the GPU, with nothing copied back to the CPU or into a 2D canvas
// (each such copy waits for the GPU: 0.5 to 1 ms an object, where drawing one takes 0.04). Three passes a frame, each
// with one target: the first pass of every object into its own tile of a big texture (an atlas); the outlines and
// colors of each into the same tile of a second one; then each tile drawn onto the page's canvas (a WebGL canvas over
// the game's 2D one, clear where nothing is), as big as the game draws its art pixels and where it would put that
// object's sprite, to the screen pixel
const TILE_VERT = `
attribute vec2 p, uv;
attribute float a;
uniform vec2 uScreen, uAtlas;
varying vec2 vUv;
varying float vA;
void main() {
  vUv = uv / uAtlas; vA = a;
  gl_Position = vec4(p.x / uScreen.x * 2.0 - 1.0, 1.0 - p.y / uScreen.y * 2.0, 0.0, 1.0);
}`;
const TILE = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uTex;
varying vec2 vUv;
varying float vA;
void main() { vec4 c = texture2D(uTex, vUv); gl_FragColor = vec4(c.rgb * c.a * vA, c.a * vA); }`;
const AW = 512, AH = 256, COLS = Math.floor(AW / GW), ROWS = Math.floor(AH / GH); // (the atlas: 11 × 8 tiles: as many objects at most)

// → the objects layer on a canvas of the page ({ how, marks, info, size(width, height, scale, ox, oy): the canvas's
// pixels, screen pixels an art pixel and where the art's 0, 0 is on it (as the game's transform); add(kind, m, x, y, {
// yaw (degrees), tilt, pal, blink, alpha, gap }): an object this frame (m: its model, made with marks as the layer says;
// x, y: where the game would draw its sprite); flush(): draws them all, the canvas cleared first }), or null (no WebGL,
// or it can't draw that way). how: 'parts' (part by part) or 'mesh' (a skinned mesh, made for each kind the first time
// it is added). res: 'screen' (the canvas has the screen's pixels: each object placed to the screen pixel) or 'art' (one
// pixel an art pixel, the page scaling it up: a 49th of the pixels at 7 screen pixels an art pixel; placed to the art
// pixel; size says where the canvas goes). iOS can take the GPU away from a page in the background: it is made again
// when it comes back. stats: the CPU's time in each pass of the last flush (ms). opaque: the canvas not see-through, its
// sky (bg: the color) drawn by the layer (the whole game in WebGL, nothing under it); mesh: buildMesh's options (h: its
// grid, coarser: fewer triangles); sync: waits for the GPU after each pass (stats then the GPU's time too: to measure)
export function createLayer(canvas, { how = 'parts', res = 'screen', opaque = false, bg = '#000000', mesh = {}, sync = false } = {}) {
  let c = null, finish, tile, atlas, atlasFbo, quads, lost = false;
  const make = () => {
    c = core({ alpha: !opaque, premultipliedAlpha: true }, canvas);
    if (!c) return;
    const { gl, program } = c;
    finish = program(VERT, FINISH);
    tile = program(TILE_VERT, TILE, ['p', 'uv', 'a']);
    atlas = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, atlas);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, AW, AH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    atlasFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, atlasFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, atlas, 0);
    quads = gl.createBuffer();
  };
  make();
  if (!c || (how === 'mesh' && !c.skinned) || (how === 'parts' && !c.byParts)) return null;
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; });
  canvas.addEventListener('webglcontextrestored', () => { make(); lost = !c; });
  const meshes = {}, meshOf = (k) => meshes[k] || (meshes[k] = buildMesh(k, { depth: DEPTH[k], ...mesh }));
  const D0 = new Float32Array(MAXD * 4), D1 = new Float32Array(MAXD * 4), list = [], sky = opaque ? parseInt(bg.slice(1, 7), 16) : 0;
  let corners = new Float32Array(0), scale = 1, ox = 0, oy = 0;
  return {
    how,
    marks: how === 'mesh' ? 'none' : 'decals',
    info: `WebGL ${c.gl.getParameter(c.gl.VERSION)}`,
    stats: { first: 0, finish: 0, tiles: 0 },
    // → where the canvas goes on the screen, in its pixels ({ left, top, width, height }): at the art's resolution a
    // little left of and above the screen's corner, its art pixels on the world's
    size(width, height, s, x0, y0) {
      let left = 0, top = 0, w = width, h = height;
      if (res === 'art') {
        left = x0 % s ? (x0 % s) - s : 0; top = y0 % s ? (y0 % s) - s : 0;
        w = Math.ceil((width - left) / s); h = Math.ceil((height - top) / s);
        scale = 1; ox = (x0 - left) / s; oy = (y0 - top) / s;
      } else { scale = s; ox = x0; oy = y0; }
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      return { left, top, width: res === 'art' ? w * s : w, height: res === 'art' ? h * s : h };
    },
    add(kind, m, x, y, { yaw = 0, tilt = 0, pal, blink = false, alpha = 1, gap = 0.25 } = {}) {
      if (list.length < COLS * ROWS) list.push({ kind, m, x, y, yaw, tilt, pal, blink, alpha, gap });
    },
    flush() {
      const n = list.length, gl = c && c.gl;
      if (lost || !gl || gl.isContextLost()) { list.length = 0; return; }
      const parts = how === 'parts', t0 = performance.now();
      // 1: what each pixel of each object sees, into its tile (the first: the whole atlas cleared)
      for (let i = 0; i < n; i++) {
        const o = list[i];
        o.at = [(i % COLS) * GW, Math.floor(i / COLS) * GH];
        o.v = view(o.m, (o.yaw * Math.PI) / 180, (o.tilt * Math.PI) / 180);
        const skin = parts ? null : { mesh: meshOf(o.kind), bones: null, shut: o.blink };
        if (skin) skin.bones = bonesFor(skin.mesh, o.m);
        c.first(o.m, o.v, { width: GW, height: GH, S: 1, lift: 0, byParts: parts, eps: 0.01, steps: 120, skin, size: [AW, AH], at: o.at, clear: i === 0 });
      }
      if (sync) gl.finish();
      const t1 = performance.now();
      // 2: its outlines, what is stuck on and its colors, into the same tile of the second atlas (every pixel of it)
      if (n) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, atlasFbo);
        gl.useProgram(finish.p); c.full();
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, c.tex); gl.uniform1i(finish.u.uTex, 0);
        gl.uniform2f(finish.u.uTexSize, AW, AH); gl.uniform1f(finish.u.uColor, 1); gl.uniform1i(finish.u.uPal, 1);
        for (let i = 0; i < n; i++) {
          const o = list[i], decals = parts ? decalsAt(o.m, o.v.toView).slice(0, MAXD) : []; // (a mesh: its eyes in its texture)
          decals.forEach((d, k) => { D0.set([...d.v, 0], k * 4); D1.set([d.nv[0], d.nv[1], d.color, d.eye ? 1 : 0], k * 4); });
          gl.viewport(o.at[0], o.at[1], GW, GH);
          c.fill(o.m, parts); c.setParts(finish.u, o.m, o.v);
          gl.uniform2f(finish.u.uAt, o.at[0], o.at[1]);
          gl.uniform1f(finish.u.uGap, o.gap); gl.uniform1f(finish.u.uBlink, o.blink ? 1 : 0);
          gl.uniform1i(finish.u.uDecals, decals.length); gl.uniform4fv(finish.u.uD0, D0); gl.uniform4fv(finish.u.uD1, D1);
          c.usePalette(o.pal);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
      }
      if (sync) gl.finish();
      const t2 = performance.now();
      // 3: the tiles onto the canvas, in the order added (the later in front), each corner on a screen pixel
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (opaque) gl.clearColor((sky >> 16) / 255, ((sky >> 8) & 255) / 255, (sky & 255) / 255, 1);
      else gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (n) {
        if (corners.length < n * 30) corners = new Float32Array(n * 30 * 2);
        const w = GW * scale, h = GH * scale;
        for (let i = 0; i < n; i++) {
          const o = list[i], x = Math.round(ox + (o.x + GX) * scale), y = Math.round(oy + (o.y + GY) * scale), [u, t] = o.at;
          [[x, y, u, t + GH], [x + w, y, u + GW, t + GH], [x, y + h, u, t], [x, y + h, u, t], [x + w, y, u + GW, t + GH], [x + w, y + h, u + GW, t]]
            .forEach((q, k) => { corners.set(q, (i * 6 + k) * 5); corners[(i * 6 + k) * 5 + 4] = o.alpha; });
        }
        gl.useProgram(tile.p);
        gl.bindBuffer(gl.ARRAY_BUFFER, quads);
        gl.bufferData(gl.ARRAY_BUFFER, corners.subarray(0, n * 30), gl.DYNAMIC_DRAW);
        [2, 2, 1].forEach((k, i) => { gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, k, gl.FLOAT, false, 20, [0, 8, 16][i]); });
        for (let i = 3; i < 6; i++) gl.disableVertexAttribArray(i);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, atlas); gl.uniform1i(tile.u.uTex, 0);
        gl.uniform2f(tile.u.uScreen, canvas.width, canvas.height); gl.uniform2f(tile.u.uAtlas, AW, AH);
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.drawArrays(gl.TRIANGLES, 0, n * 6);
        gl.disable(gl.BLEND);
      }
      list.length = 0;
      if (sync) gl.finish();
      Object.assign(this.stats, { first: t1 - t0, finish: t2 - t1, tiles: performance.now() - t2 });
    },
  };
}

// what this browser's WebGL can do (for the bench: why a way can't be drawn)
export function glInfo() {
  const gl = document.createElement('canvas').getContext('webgl');
  if (!gl) return { webgl: false };
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  return {
    version: gl.getParameter(gl.VERSION),
    renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    fragmentUniforms: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS), vertexUniforms: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
    fragDepth: !!gl.getExtension('EXT_frag_depth'), instancing: !!gl.getExtension('ANGLE_instanced_arrays'),
    webgl2: !!document.createElement('canvas').getContext('webgl2'),
    extensions: gl.getSupportedExtensions(),
  };
}
