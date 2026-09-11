// Procedural geometry and textures. Nothing here is loaded from a file:
// petals, flower heads, foliage sprays and the limestone/paving textures are
// all generated at start-up, so the site stays light and loads fast on phones.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ---------------------------------------------------------------------------
// Petals and heads
// ---------------------------------------------------------------------------

/**
 * One petal. Base at the origin, tip along +Y, placed on a ring around +Y.
 *   cup     – curvature across the petal (bowl shape)
 *   curl    – how the tip bends: negative folds inward (young petals), positive
 *             rolls back outward (open garden-rose petals)
 *   ruffle  – wavy edge amplitude, strongest near the tip
 *   shade   – vertex-colour multiplier (inner petals slightly deeper in tone)
 */
function petal({ width, height, cup = 1, curl = 0, tilt = 0.6, radius = 0.05, angle = 0, ruffle = 0, ruffleFreq = 3, shade = 1, lean = 0, segW = 3, segH = 6 }) {
  const g = new THREE.PlaneGeometry(1, 1, segW, segH);
  const pos = g.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i);
    const v = pos.getY(i) + 0.5;
    const profile = Math.pow(Math.sin(Math.PI * Math.pow(v, 0.55)), 0.45);
    const x = u * profile * width;
    const y = v * height;
    let z = -(x * x) * cup + v * v * curl * height;
    if (ruffle) z += ruffle * Math.sin(ruffleFreq * Math.PI * (u + 0.5) + v * 2.0) * Math.pow(v, 1.5) * Math.min(1, Math.abs(u) * 2.2 + 0.2);
    pos.setXYZ(i, x + lean * v * v, y, z);
    // a touch darker at the base, lighter at the tip
    const c = shade * (0.66 + 0.34 * v);
    colors[i * 3] = c;
    colors[i * 3 + 1] = c;
    colors[i * 3 + 2] = c;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.rotateX(-tilt);
  g.translate(0, 0, radius);
  g.rotateY(angle);
  g.computeVertexNormals();
  return g;
}

function ringsToHead(rings, extra = []) {
  const parts = [];
  rings.forEach((r, ri) => {
    const jitter = r.jitter ?? 0.06;
    for (let i = 0; i < r.count; i++) {
      const angle = (i / r.count) * Math.PI * 2 + ri * 0.37 + ((i % 3) - 1) * jitter;
      parts.push(petal({ ...r, angle, tilt: r.tilt + ((i % 2) - 0.5) * 0.08 }));
    }
  });
  parts.push(...extra);
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged;
}

/** A small coloured sphere with its own vertex colour (used for centres / berries). */
function tintedSphere(r, shade, segs = 8) {
  const g = new THREE.SphereGeometry(r, segs, Math.max(4, segs - 2));
  const n = g.attributes.position.count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    colors[i * 3] = shade[0];
    colors[i * 3 + 1] = shade[1];
    colors[i * 3 + 2] = shade[2];
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

/** Garden rose — a tight, spiralled centre opening to rolled-back outer petals. ~0.85 across. */
export function makeRose() {
  return ringsToHead([
    { count: 3, radius: 0.008, tilt: 0.12, width: 0.14, height: 0.2, cup: 4.5, curl: -0.35, shade: 0.78 },
    { count: 5, radius: 0.025, tilt: 0.4, width: 0.2, height: 0.26, cup: 2.6, curl: -0.15, shade: 0.84 },
    { count: 7, radius: 0.05, tilt: 0.75, width: 0.27, height: 0.3, cup: 1.6, curl: 0.12, shade: 0.9 },
    { count: 9, radius: 0.08, tilt: 1.05, width: 0.31, height: 0.32, cup: 1.1, curl: 0.38, shade: 0.96 },
    { count: 11, radius: 0.11, tilt: 1.32, width: 0.33, height: 0.32, cup: 0.8, curl: 0.55, shade: 1 },
  ]);
}

/** Peony — big, ruffled, almost spherical. ~1.1 across. */
export function makePeony() {
  return ringsToHead([
    { count: 6, radius: 0.01, tilt: 0.22, width: 0.2, height: 0.3, cup: 2.4, curl: -0.25, ruffle: 0.03, ruffleFreq: 4, shade: 0.8 },
    { count: 9, radius: 0.035, tilt: 0.5, width: 0.28, height: 0.36, cup: 1.8, curl: -0.1, ruffle: 0.045, ruffleFreq: 4, shade: 0.86 },
    { count: 12, radius: 0.065, tilt: 0.82, width: 0.34, height: 0.4, cup: 1.3, curl: 0.1, ruffle: 0.05, ruffleFreq: 5, shade: 0.92 },
    { count: 15, radius: 0.1, tilt: 1.12, width: 0.38, height: 0.4, cup: 0.9, curl: 0.3, ruffle: 0.05, ruffleFreq: 5, shade: 0.97 },
    { count: 16, radius: 0.13, tilt: 1.38, width: 0.4, height: 0.38, cup: 0.6, curl: 0.45, ruffle: 0.045, ruffleFreq: 4, shade: 1 },
  ]);
}

/** Ranunculus — dozens of thin, flat, tightly layered petals. ~0.6 across. */
export function makeRanunculus() {
  const centre = tintedSphere(0.03, [0.35, 0.42, 0.3], 8);
  centre.translate(0, 0.09, 0);
  return ringsToHead(
    [
      { count: 8, radius: 0.006, tilt: 0.25, width: 0.11, height: 0.11, cup: 1.2, curl: -0.2, shade: 0.8, segH: 4 },
      { count: 12, radius: 0.02, tilt: 0.5, width: 0.16, height: 0.15, cup: 1.0, curl: -0.1, shade: 0.86, segH: 4 },
      { count: 16, radius: 0.04, tilt: 0.8, width: 0.2, height: 0.19, cup: 0.9, curl: 0, shade: 0.92, segH: 4 },
      { count: 20, radius: 0.06, tilt: 1.12, width: 0.23, height: 0.22, cup: 0.7, curl: 0.12, shade: 0.97, segH: 4 },
      { count: 22, radius: 0.08, tilt: 1.42, width: 0.24, height: 0.22, cup: 0.5, curl: 0.25, shade: 1, segH: 4 },
    ],
    [centre]
  );
}

/** Hydrangea — a dome of small four-petal florets. ~0.6 across. */
export function makeHydrangea() {
  const parts = [];
  const n = 34;
  const R = 0.22;
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    // fibonacci hemisphere
    const y = 1 - (i / (n - 1)) * 0.92; // 1 .. 0.08
    const r = Math.sqrt(1 - y * y);
    const phi = i * 2.399963;
    const dir = new THREE.Vector3(Math.cos(phi) * r, y, Math.sin(phi) * r);
    const floret = ringsToHead(
      [{ count: 4, radius: 0.004, tilt: 1.25, width: 0.085, height: 0.1, cup: 0.4, curl: 0.15, shade: 0.9 + 0.1 * y, segW: 2, segH: 3 }],
      [tintedSphere(0.012, [0.7, 0.72, 0.6], 6)]
    );
    const q = new THREE.Quaternion().setFromUnitVectors(up, dir);
    floret.applyQuaternion(q);
    floret.translate(dir.x * R, dir.y * R, dir.z * R);
    parts.push(floret);
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged;
}

/** Gypsophila sprig — wiry twigs with tiny white florets. ~0.45 across. */
export function makeGypsophila() {
  const parts = [];
  const twigShade = [0.62, 0.66, 0.5];
  const addTwig = (from, to, r = 0.004) => {
    const d = to.clone().sub(from);
    const len = d.length();
    const g = new THREE.CylinderGeometry(r * 0.7, r, len, 4, 1);
    const n = g.attributes.position.count;
    const colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      colors[i * 3] = twigShade[0];
      colors[i * 3 + 1] = twigShade[1];
      colors[i * 3 + 2] = twigShade[2];
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.translate(0, len / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
    g.translate(from.x, from.y, from.z);
    parts.push(g);
  };
  const origin = new THREE.Vector3(0, 0, 0);
  const seeds = [0.9, 2.1, 3.4, 4.9, 5.8];
  seeds.forEach((a, k) => {
    const spread = 0.12 + (k % 2) * 0.06;
    const tip = new THREE.Vector3(Math.cos(a) * spread, 0.26 + (k % 3) * 0.05, Math.sin(a) * spread);
    addTwig(origin, tip);
    // side florets
    for (let j = 0; j < 3; j++) {
      const t = 0.45 + j * 0.25;
      const p = origin.clone().lerp(tip, t);
      const off = new THREE.Vector3(Math.cos(a + 1.3 + j) * 0.05, 0.05, Math.sin(a + 1.3 + j) * 0.05);
      const end = p.clone().add(off);
      addTwig(p, end, 0.0025);
      const b = tintedSphere(0.016 + (j % 2) * 0.004, [1, 1, 1], 6);
      b.translate(end.x, end.y, end.z);
      parts.push(b);
    }
    const b = tintedSphere(0.02, [1, 1, 1], 6);
    b.translate(tip.x, tip.y, tip.z);
    parts.push(b);
  });
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged;
}

/** Rose bud — just the closed inner rings. ~0.3 across. */
export function makeBud() {
  return ringsToHead([
    { count: 3, radius: 0.006, tilt: 0.1, width: 0.13, height: 0.2, cup: 4, curl: -0.35, shade: 0.8 },
    { count: 5, radius: 0.02, tilt: 0.3, width: 0.17, height: 0.24, cup: 3, curl: -0.25, shade: 0.88 },
    { count: 6, radius: 0.032, tilt: 0.55, width: 0.2, height: 0.25, cup: 2.2, curl: -0.05, shade: 0.95 },
  ]);
}

// ---------------------------------------------------------------------------
// Foliage
// ---------------------------------------------------------------------------

function leafBlade({ length, width, fold = 0.5, droop = 0.15, serrate = 0, pointed = 0.8, shade = 1, segW = 2, segH = 6 }) {
  const g = new THREE.PlaneGeometry(1, 1, segW, segH);
  const pos = g.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i);
    const v = pos.getY(i) + 0.5;
    let profile = Math.sin(Math.PI * Math.pow(v, pointed));
    if (serrate) profile *= 1 + serrate * Math.sin(26 * v) * Math.abs(u) * 2;
    const x = u * profile * width;
    const y = v * length;
    const z = Math.abs(x) * fold - v * v * droop * length;
    pos.setXYZ(i, x, y, z);
    const c = shade * (0.85 + 0.15 * v);
    colors[i * 3] = c;
    colors[i * 3 + 1] = c;
    colors[i * 3 + 2] = c;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

function stemGeo(from, to, r, shade) {
  const d = to.clone().sub(from);
  const len = d.length();
  const g = new THREE.CylinderGeometry(r * 0.8, r, len, 5, 1);
  const n = g.attributes.position.count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    colors[i * 3] = shade[0];
    colors[i * 3 + 1] = shade[1];
    colors[i * 3 + 2] = shade[2];
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  g.translate(from.x, from.y, from.z);
  return g;
}

/** Rose foliage — three serrated leaflets on a short stem. ~0.45 long. */
export function makeRoseLeaf() {
  const parts = [];
  const o = new THREE.Vector3(0, 0, 0);
  const top = new THREE.Vector3(0, 0.22, 0);
  parts.push(stemGeo(o, top, 0.006, [0.55, 0.5, 0.4]));
  const centre = leafBlade({ length: 0.26, width: 0.16, serrate: 0.05, shade: 1 });
  centre.translate(0, 0.2, 0);
  parts.push(centre);
  [-1, 1].forEach((s) => {
    const l = leafBlade({ length: 0.2, width: 0.13, serrate: 0.05, shade: 0.94 });
    l.rotateZ(s * 0.95);
    l.translate(0, 0.14, 0.01 * s);
    parts.push(l);
  });
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged;
}

/** Eucalyptus spray — a wiry stem with round, alternating leaves. ~0.6 long. */
export function makeEucalyptus() {
  const parts = [];
  const pts = [];
  for (let i = 0; i <= 6; i++) pts.push(new THREE.Vector3(Math.sin(i * 0.5) * 0.04, i * 0.1, -i * i * 0.004));
  for (let i = 0; i < 6; i++) parts.push(stemGeo(pts[i], pts[i + 1], 0.006, [0.5, 0.45, 0.38]));
  for (let i = 1; i <= 6; i++) {
    const s = i % 2 ? 1 : -1;
    const l = leafBlade({ length: 0.13 - i * 0.004, width: 0.12 - i * 0.004, fold: 0.2, droop: 0.1, pointed: 0.55, shade: 0.9 + i * 0.015, segW: 2, segH: 4 });
    l.rotateZ(s * 1.35);
    l.rotateX(-0.3);
    const p = pts[i];
    l.translate(p.x, p.y, p.z);
    parts.push(l);
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged;
}

/** Ruscus / Italian ruscus — a stem of glossy lance-shaped leaves. ~0.65 long. */
export function makeRuscus() {
  const parts = [];
  const pts = [];
  for (let i = 0; i <= 7; i++) pts.push(new THREE.Vector3(0, i * 0.09, -i * i * 0.006));
  for (let i = 0; i < 7; i++) parts.push(stemGeo(pts[i], pts[i + 1], 0.005, [0.45, 0.55, 0.35]));
  for (let i = 1; i <= 7; i++) {
    const s = i % 2 ? 1 : -1;
    const l = leafBlade({ length: 0.2 - i * 0.008, width: 0.06, fold: 0.6, droop: 0.2, pointed: 1.0, shade: 0.9 + i * 0.012, segW: 2, segH: 4 });
    l.rotateZ(s * 1.0);
    l.rotateX(-0.2);
    const p = pts[i];
    l.translate(p.x, p.y, p.z);
    parts.push(l);
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged;
}

/** Trailing ivy/greenery strand for cascades. ~0.9 long, hangs down -Y when rotated. */
export function makeTrail() {
  const parts = [];
  const pts = [];
  for (let i = 0; i <= 8; i++) pts.push(new THREE.Vector3(Math.sin(i * 0.9) * 0.03, i * 0.11, Math.cos(i * 0.7) * 0.02));
  for (let i = 0; i < 8; i++) parts.push(stemGeo(pts[i], pts[i + 1], 0.005, [0.45, 0.5, 0.35]));
  for (let i = 1; i <= 8; i++) {
    const s = i % 2 ? 1 : -1;
    const l = leafBlade({ length: 0.1, width: 0.09, fold: 0.3, droop: 0.1, pointed: 0.6, shade: 0.88 + i * 0.012, segW: 2, segH: 3 });
    l.rotateZ(s * 1.2);
    const p = pts[i];
    l.translate(p.x, p.y, p.z);
    parts.push(l);
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged;
}

// ---------------------------------------------------------------------------
// Textures
// ---------------------------------------------------------------------------

function canvasTexture(w, h, draw, { repeat = [1, 1], srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  return t;
}

function speckle(ctx, w, h, n, rnd, dark = true) {
  for (let i = 0; i < n; i++) {
    const a = 0.03 + rnd() * 0.05;
    ctx.fillStyle = dark ? `rgba(80,70,55,${a})` : `rgba(255,255,255,${a})`;
    const r = 0.6 + rnd() * 1.6;
    ctx.beginPath();
    ctx.arc(rnd() * w, rnd() * h, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Ashlar limestone: coursed blocks with fine joints. One tile = 4 blocks × 8 courses. */
export function makeAshlarTexture(rnd, { repeat = [1, 1] } = {}) {
  return canvasTexture(
    1024,
    1024,
    (ctx, w, h) => {
      ctx.fillStyle = '#bfae92'; // joints
      ctx.fillRect(0, 0, w, h);
      const rows = 8;
      const cols = 4;
      const bh = h / rows;
      const bw = w / cols;
      for (let r = 0; r < rows; r++) {
        const off = r % 2 ? bw / 2 : 0;
        for (let c = -1; c <= cols; c++) {
          const x = c * bw + off;
          const y = r * bh;
          const t = rnd();
          const base = [214 + t * 12 - 6, 199 + t * 10 - 5, 170 + t * 10 - 5];
          const g = ctx.createLinearGradient(x, y, x + bw, y + bh);
          g.addColorStop(0, `rgb(${base[0] + 4},${base[1] + 3},${base[2] + 2})`);
          g.addColorStop(1, `rgb(${base[0] - 5},${base[1] - 5},${base[2] - 6})`);
          ctx.fillStyle = g;
          ctx.fillRect(x + 2, y + 2, bw - 4, bh - 4);
          // subtle tooled edge highlight
          ctx.fillStyle = 'rgba(255,255,255,0.18)';
          ctx.fillRect(x + 2, y + 2, bw - 4, 2);
          ctx.fillStyle = 'rgba(70,60,45,0.12)';
          ctx.fillRect(x + 2, y + bh - 4, bw - 4, 2);
        }
      }
      speckle(ctx, w, h, 9000, rnd, true);
      speckle(ctx, w, h, 3000, rnd, false);
      // faint mineral veins
      ctx.strokeStyle = 'rgba(120,105,85,0.08)';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 40; i++) {
        ctx.beginPath();
        let x = rnd() * w;
        let y = rnd() * h;
        ctx.moveTo(x, y);
        for (let k = 0; k < 6; k++) {
          x += (rnd() - 0.5) * 120;
          y += (rnd() - 0.3) * 60;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    },
    { repeat }
  );
}

/** Plain dressed limestone for columns, mouldings, urns — no joints. */
export function makeStoneTexture(rnd, { repeat = [1, 1] } = {}) {
  return canvasTexture(
    512,
    512,
    (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#dbcdb3');
      g.addColorStop(1, '#d1c1a4');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      speckle(ctx, w, h, 4000, rnd, true);
      speckle(ctx, w, h, 1500, rnd, false);
    },
    { repeat }
  );
}

/** York-stone style paving flags. One tile = 4 × 3 flags. */
export function makePavingTexture(rnd, { repeat = [1, 1] } = {}) {
  return canvasTexture(
    1024,
    768,
    (ctx, w, h) => {
      ctx.fillStyle = '#b8ad9a';
      ctx.fillRect(0, 0, w, h);
      const cols = 4;
      const rows = 3;
      const fw = w / cols;
      const fh = h / rows;
      for (let r = 0; r < rows; r++) {
        const off = r % 2 ? fw * 0.35 : 0;
        for (let c = -1; c <= cols; c++) {
          const x = c * fw + off;
          const y = r * fh;
          const t = rnd();
          const base = [204 + t * 14 - 7, 195 + t * 12 - 6, 176 + t * 12 - 6];
          ctx.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
          ctx.fillRect(x + 3, y + 3, fw - 6, fh - 6);
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          ctx.fillRect(x + 3, y + 3, fw - 6, 3);
        }
      }
      speckle(ctx, w, h, 8000, rnd, true);
      speckle(ctx, w, h, 2000, rnd, false);
    },
    { repeat }
  );
}

/** Grey-noise bump map to give stone a little tooth. */
export function makeNoiseBump(rnd) {
  return canvasTexture(
    256,
    256,
    (ctx, w, h) => {
      const img = ctx.createImageData(w, h);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 118 + rnd() * 20;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    },
    { repeat: [6, 6], srgb: false }
  );
}

/** Radial shadow blob for cheap contact shadows. */
export function makeShadowTexture() {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(60,45,35,0.5)');
  grad.addColorStop(0.5, 'rgba(60,45,35,0.2)');
  grad.addColorStop(1, 'rgba(60,45,35,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Soft petal sprite for the drifting petals. */
export function makePetalSpriteTexture() {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.translate(size / 2, size / 2);
  ctx.scale(1, 0.62);
  const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, size / 2 - 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.75, 'rgba(255,255,255,0.8)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, size / 2 - 2, 0, Math.PI * 2);
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
