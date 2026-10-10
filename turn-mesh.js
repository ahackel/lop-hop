// The 3D animal as a skinned, textured mesh, as a model from Blender would be, made here from its parts (turn3d.js) for
// the turn lab: triangles over its surface at rest (surface nets: a vertex in every little cube the surface passes
// through, pulled onto it; a quad across every cube edge it crosses), each vertex tied to the parts near it (its bones:
// up to four, weighted by how near), and a texture painted on it (the eyes, the nose, the dots, the inside of the ears;
// open eyes and shut) through UV charts: its triangles split by part and by which way they face (toward its near side
// or its far side), each chart flattened from the side and laid out in the texture. Each frame the bones say how each
// part moved from rest to the pose (bonesFor), and the GPU moves each vertex by its bones (turn-gl.js).
import { model, view, decalPoints, scene, sdPrim } from './turn3d.js';

const OUT = 1, FUR = 2, EAR_IN = 40; // (palette indices: the outline's, white, a soft pink)
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len = (a) => Math.hypot(a[0], a[1], a[2]), norm = (a) => mul(a, 1 / (len(a) || 1));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// → { data: per corner of every triangle (pos 3, uv 2, bones 4, weights 4, group 1, corner 3: 17 floats), count:
// corners, groups: the groups' names (a corner's group: an index into them), rest: the parts at rest (the bones),
// texture: { w, h, open, shut: palette indices, texels: how many an art pixel }, triangles }. h: the cubes' size, size:
// the texture's (size × size texels)
export function buildMesh(kind, { depth, smooth = 1, h = 0.6, size = 64 } = {}) {
  const rest = model(kind, 'idle', 0, { depth, smooth, marks: 'none' });
  view(rest, 0, 0); // (the ellipsoids' turns, for their distances)
  const info = {}, sd = (p) => scene(rest, p[0], p[1], p[2], info);
  const grad = (p) => { const e = 0.01; return norm([sd([p[0] + e, p[1], p[2]]) - sd([p[0] - e, p[1], p[2]]), sd([p[0], p[1] + e, p[2]]) - sd([p[0], p[1] - e, p[2]]), sd([p[0], p[1], p[2] + e]) - sd([p[0], p[1], p[2] - e])]); };

  // the distance on a grid round it all
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const q of rest.prims) {
    const pts = q.type === 'ell' ? [q.c] : [q.a, q.b], r = q.type === 'ell' ? Math.max(...q.r) : q.r;
    for (const c of pts) for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], c[i] - r - 1); hi[i] = Math.max(hi[i], c[i] + r + 1); }
  }
  const n = [0, 1, 2].map((i) => Math.ceil((hi[i] - lo[i]) / h) + 1), [nx, ny, nz] = n;
  const at = (i, j, k) => [lo[0] + i * h, lo[1] + j * h, lo[2] + k * h], gi = (i, j, k) => (k * ny + j) * nx + i;
  const field = new Float32Array(nx * ny * nz);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) field[gi(i, j, k)] = sd(at(i, j, k));

  // a vertex in each cube the surface passes through: where its edges cross it, on average, pulled onto it
  const CORNERS = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const cellVert = new Int32Array(nx * ny * nz).fill(-1), verts = [];
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const d = CORNERS.map(([a, b, c]) => field[gi(i + a, j + b, k + c)]);
    if (d.every((x) => x < 0) || d.every((x) => x >= 0)) continue;
    let p = [0, 0, 0], m = 0;
    for (const [a, b] of EDGES) {
      if (d[a] < 0 === d[b] < 0) continue;
      const t = d[a] / (d[a] - d[b]), pa = at(i + CORNERS[a][0], j + CORNERS[a][1], k + CORNERS[a][2]), pb = at(i + CORNERS[b][0], j + CORNERS[b][1], k + CORNERS[b][2]);
      p = add(p, add(pa, mul(sub(pb, pa), t))); m++;
    }
    p = mul(p, 1 / m);
    for (let s = 0; s < 3; s++) p = sub(p, mul(grad(p), sd(p)));
    cellVert[gi(i, j, k)] = verts.length;
    verts.push({ p, n: grad(p) });
  }
  // a quad across each grid edge the surface crosses, from the four cubes round it
  const quads = [];
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const inside = field[gi(i, j, k)] < 0;
    for (const [dx, dy, dz, cells] of [
      [1, 0, 0, [[0, -1, -1], [0, 0, -1], [0, 0, 0], [0, -1, 0]]],
      [0, 1, 0, [[-1, 0, -1], [0, 0, -1], [0, 0, 0], [-1, 0, 0]]],
      [0, 0, 1, [[-1, -1, 0], [0, -1, 0], [0, 0, 0], [-1, 0, 0]]],
    ]) {
      if (i + dx >= nx || j + dy >= ny || k + dz >= nz || (field[gi(i + dx, j + dy, k + dz)] < 0) === inside) continue;
      const q = cells.map(([a, b, c]) => cellVert[gi(i + a, j + b, k + c)]);
      if (q.every((v) => v >= 0)) quads.push(q);
    }
  }

  // each vertex: its group (the nearest part's), its bones: the parts of that group nearest it (up to four), weighted
  const groups = [], groupOf = (g) => { let x = groups.indexOf(g); if (x < 0) { x = groups.length; groups.push(g); } return x; };
  for (const v of verts) {
    sd(v.p);
    v.g = info.group; v.color = info.prim.color;
    const near = rest.prims.map((q, b) => ({ b, d: q.group === v.g ? sdPrim(q, v.p[0], v.p[1], v.p[2]) : Infinity })).sort((a, b) => a.d - b.d).slice(0, 4).filter((x) => x.d < Infinity);
    const w = near.map((x) => Math.exp(-(x.d - near[0].d) / 0.5)), sum = w.reduce((a, b) => a + b, 0);
    v.bones = [0, 1, 2, 3].map((i) => near[i]?.b ?? 0); v.weights = [0, 1, 2, 3].map((i) => (near[i] ? w[i] / sum : 0));
  }

  // triangles, each in a chart: its group, and which way it faces (toward its near side or its far side)
  const tris = [];
  for (const [a, b, c, d] of quads) for (const t of [[a, b, c], [a, c, d]]) {
    const vs = t.map((x) => verts[x]), g = vs.filter((v) => v.g === vs[0].g).length >= 2 ? vs[0].g : vs[1].g;
    const nz2 = vs[0].n[2] + vs[1].n[2] + vs[2].n[2];
    tris.push({ t, g, chart: `${g}${nz2 >= 0 ? ' +' : ' -'}`, color: vs.map((v) => v.color).sort((x, y) => vs.filter((v) => v.color === y).length - vs.filter((v) => v.color === x).length)[0] });
  }
  // the charts, each flattened from the side (x, y) and laid out in rows in the texture
  const charts = {};
  for (const tr of tris) {
    const c = charts[tr.chart] || (charts[tr.chart] = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity });
    for (const x of tr.t) { const p = verts[x].p; c.x0 = Math.min(c.x0, p[0]); c.y0 = Math.min(c.y0, p[1]); c.x1 = Math.max(c.x1, p[0]); c.y1 = Math.max(c.y1, p[1]); }
  }
  // laid out in rows, as many texels an art pixel as fit the texture (size × size)
  const PAD = 1, W = size, H = size;
  const pack = (tx) => {
    let x = 0, y = 0, row = 0;
    for (const c of Object.values(charts).sort((a, b) => b.y1 - b.y0 - (a.y1 - a.y0))) {
      c.w = Math.ceil((c.x1 - c.x0) * tx) + 2 * PAD; c.h = Math.ceil((c.y1 - c.y0) * tx) + 2 * PAD;
      if (x + c.w > W) { x = 0; y += row; row = 0; }
      if (c.w > W) return false;
      c.u = x; c.v = y; x += c.w; row = Math.max(row, c.h);
    }
    return y + row <= H;
  };
  let texels = 64;
  while (!pack(texels) && texels > 0.1) texels *= 0.95;
  const uvOf = (p, c) => [c.u + PAD + (p[0] - c.x0) * texels, c.v + PAD + (p[1] - c.y0) * texels]; // (in texels)

  // the texture: each triangle painted from where on the animal each point of it is (at rest), three by three points a
  // texel: the eyes (open: with a glint, where there is room for one; shut: a lid's line), the nose, the dots (a texel
  // theirs where they cover a third of it, as the game stamps them: never lost between texels), the inside of the ears
  // pink; then grown a texel past each chart's edge (no seams)
  const marks = decalPoints(model(kind, 'idle', 0, { depth, smooth, marks: 'decals' }));
  const glint = texels >= 4;
  const markAt = (p, shut) => {
    for (const mk of marks) {
      const e = sub(p, mk.p);
      if (mk.eye) {
        if (shut) { if (len([e[0] / 0.6, (e[1] - 1) / 0.3, e[2] / 0.6]) < 1) return OUT; continue; }
        if (len([e[0] / 0.6, (e[1] - 0.5) / 1.05, e[2] / 0.6]) < 1) return glint && len([e[0] - 0.12, e[1] + 0.1, e[2]]) < 0.24 ? FUR : OUT;
      } else if (len(e) < 0.6) return mk.color;
    }
    return 0;
  };
  const bake = (shut) => {
    const base = new Uint8Array(W * H), mark = new Uint8Array(W * H), markN = new Uint8Array(W * H);
    for (const tr of tris) {
      const c = charts[tr.chart], P = tr.t.map((i) => verts[i].p), T = P.map((p) => uvOf(p, c));
      const inner = tr.g.startsWith('ear') && (tr.g.endsWith('far') ? tr.chart.endsWith('+') : tr.chart.endsWith('-')); // (the inside of an ear: the side toward the head)
      const color = inner ? EAR_IN : tr.color;
      const x0 = Math.floor(Math.min(T[0][0], T[1][0], T[2][0])), x1 = Math.ceil(Math.max(T[0][0], T[1][0], T[2][0]));
      const y0 = Math.floor(Math.min(T[0][1], T[1][1], T[2][1])), y1 = Math.ceil(Math.max(T[0][1], T[1][1], T[2][1]));
      const area = (T[1][0] - T[0][0]) * (T[2][1] - T[0][1]) - (T[2][0] - T[0][0]) * (T[1][1] - T[0][1]);
      if (Math.abs(area) < 1e-12) continue;
      for (let sy = y0 * 3; sy < y1 * 3; sy++) for (let sx = x0 * 3; sx < x1 * 3; sx++) {
        const px = (sx + 0.5) / 3, py = (sy + 0.5) / 3, tx = Math.floor(px), ty = Math.floor(py);
        if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
        const b1 = ((px - T[0][0]) * (T[2][1] - T[0][1]) - (T[2][0] - T[0][0]) * (py - T[0][1])) / area;
        const b2 = ((T[1][0] - T[0][0]) * (py - T[0][1]) - (px - T[0][0]) * (T[1][1] - T[0][1])) / area, b0 = 1 - b1 - b2;
        if (b0 < 0 || b1 < 0 || b2 < 0) continue;
        const t = ty * W + tx, mk = markAt(add(add(mul(P[0], b0), mul(P[1], b1)), mul(P[2], b2)), shut);
        base[t] ||= color;
        if (mk) { mark[t] = mk; markN[t]++; }
      }
      // (a triangle smaller than a texel: its middle's texel at least)
      const m = [(T[0][0] + T[1][0] + T[2][0]) / 3, (T[0][1] + T[1][1] + T[2][1]) / 3], t = Math.floor(m[1]) * W + Math.floor(m[0]);
      if (m[0] >= 0 && m[1] >= 0 && m[0] < W && m[1] < H) base[t] ||= color;
    }
    const tex = base.map((b, t) => (markN[t] >= 3 ? mark[t] : b));
    for (let pass = 0; pass < PAD + 1; pass++) {
      const was = tex.slice();
      for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
        if (was[ty * W + tx]) continue;
        const nb = [tx > 0 && was[ty * W + tx - 1], tx < W - 1 && was[ty * W + tx + 1], ty > 0 && was[(ty - 1) * W + tx], ty < H - 1 && was[(ty + 1) * W + tx]].find((v) => v);
        if (nb) tex[ty * W + tx] = nb;
      }
    }
    return tex;
  };

  // per corner: its place at rest, its texel (0…1), its bones and weights, its group, which corner it is (for lines)
  const data = new Float32Array(tris.length * 3 * 17);
  tris.forEach((tr, ti) => tr.t.forEach((vi, k) => {
    const v = verts[vi], [u, w] = uvOf(v.p, charts[tr.chart]);
    data.set([...v.p, u / W, w / H, ...v.bones, ...v.weights, groupOf(tr.g), k === 0 ? 1 : 0, k === 1 ? 1 : 0, k === 2 ? 1 : 0], (ti * 3 + k) * 17);
  }));
  return { data, count: tris.length * 3, triangles: tris.length, vertices: verts.length, groups, rest: rest.prims, texture: { w: W, h: H, texels, open: bake(false), shut: bake(true) } };
}

// how each bone (a part at rest) moved to the pose (the same part, by id, in m): three rows of an affine map each
// (12 floats a bone; a part the pose has not: where it was). An ellipsoid: moved, turned and stretched as it is; a
// capsule: its first end moved, turned toward its other, stretched along it
export function bonesFor(mesh, m) {
  const out = mesh.bones || (mesh.bones = new Float32Array(mesh.rest.length * 12)), byId = new Map(m.prims.map((q) => [q.id, q]));
  mesh.rest.forEach((r, i) => {
    const q = byId.get(r.id);
    let A = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], t = [0, 0, 0];
    if (q && r.type === 'ell' && q.type === 'ell') {
      const c0 = Math.cos(r.a), s0 = Math.sin(r.a), c1 = Math.cos(q.a), s1 = Math.sin(q.a), sx = q.r[0] / r.r[0], sy = q.r[1] / r.r[1], sz = q.r[2] / r.r[2];
      const R1 = [[c1, -s1, 0], [s1, c1, 0], [0, 0, 1]], SR0 = [[sx * c0, sx * s0, 0], [-sy * s0, sy * c0, 0], [0, 0, sz]]; // (R(a1) · S · R(-a0))
      A = R1.map((row) => [0, 1, 2].map((j) => row[0] * SR0[0][j] + row[1] * SR0[1][j] + row[2] * SR0[2][j]));
      t = sub(q.c, A.map((row) => dot(row, r.c)));
    } else if (q && r.type === 'cap' && q.type === 'cap') {
      const u0 = sub(r.b, r.a), u1 = sub(q.b, q.a), l0 = len(u0), l1 = len(u1);
      if (l0 > 1e-6 && l1 > 1e-6) {
        const a = mul(u0, 1 / l0), b = mul(u1, 1 / l1), v = cross(a, b), c = dot(a, b), k = 1 / (1 + c || 1e-6), s = l1 / l0;
        const R = c < -0.9999 ? [[-1, 0, 0], [0, -1, 0], [0, 0, 1]] : [ // (a onto b, the shortest way)
          [c + v[0] * v[0] * k, v[0] * v[1] * k - v[2], v[0] * v[2] * k + v[1]],
          [v[1] * v[0] * k + v[2], c + v[1] * v[1] * k, v[1] * v[2] * k - v[0]],
          [v[2] * v[0] * k - v[1], v[2] * v[1] * k + v[0], c + v[2] * v[2] * k]];
        const S = [0, 1, 2].map((ii) => [0, 1, 2].map((j) => (ii === j ? 1 : 0) + (s - 1) * a[ii] * a[j]));
        A = R.map((row) => [0, 1, 2].map((j) => row[0] * S[0][j] + row[1] * S[1][j] + row[2] * S[2][j]));
      }
      t = sub(q.a, A.map((row) => dot(row, r.a)));
    }
    out.set([...A[0], t[0], ...A[1], t[1], ...A[2], t[2]], i * 12);
  });
  return out;
}
