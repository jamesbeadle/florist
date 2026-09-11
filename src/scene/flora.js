// Flora: species registry, palette, and "installations" — mixed clusters of
// instanced flower heads and foliage sprays that bloom in as progress 0 → 1.

import * as THREE from 'three';
import { makeBud, makeEucalyptus, makeGypsophila, makeHydrangea, makePeony, makeRanunculus, makeRose, makeRoseLeaf, makeRuscus, makeTrail } from './geometry.js';

// ---------------------------------------------------------------------------
// palette — ivory, blush, champagne, dusty pink, the odd burgundy
// ---------------------------------------------------------------------------

// A natural florist mix — whites are the base, not the whole story.
export const FLOWER_PALETTE = [
  ['#f4efe4', 2.6], // ivory
  ['#f6f1e6', 1.4], // white
  ['#efe3c9', 1.6], // cream
  ['#f0cfae', 1.6], // apricot
  ['#efc2b3', 1.6], // warm blush
  ['#e69a8c', 1.1], // coral
  ['#d9a2a9', 0.9], // soft rose
  ['#9b3a4c', 1.2], // deep rose
  ['#6e2633', 0.9], // burgundy
  ['#cbb6d6', 0.5], // lilac
];
export const ROSE_PALETTE = [
  ['#f4efe4', 2.6],
  ['#efe3c9', 1.8],
  ['#f0cfae', 1.6],
  ['#efc2b3', 1.6],
  ['#d9a2a9', 0.8],
  ['#9b3a4c', 1.2],
  ['#6e2633', 1.0],
];
export const RANUNCULUS_PALETTE = [
  ['#f4efe4', 2],
  ['#f0cfae', 2],
  ['#e69a8c', 1.6],
  ['#efc2b3', 1.4],
  ['#efe3c9', 1.2],
  ['#9b3a4c', 1.0],
  ['#cbb6d6', 0.6],
];
export const PEONY_PALETTE = [
  ['#f4efe4', 2],
  ['#efc2b3', 2],
  ['#e69a8c', 1.2],
  ['#d9a2a9', 1],
  ['#9b3a4c', 0.7],
];
export const PALE_PALETTE = [
  ['#f2ede3', 3], // hydrangea: white, green-white, lilac-white
  ['#e6ebdc', 1.5],
  ['#e8e0ec', 1.2],
];
export const FOLIAGE = {
  roseLeaf: ['#4f6b46', '#5b7a4f', '#476040'],
  eucalyptus: ['#9aab98', '#8fa38d', '#a7b5a3'],
  ruscus: ['#3f6a3e', '#4a7a48', '#47703f'],
  trail: ['#5a7f52', '#4f7349'],
};

export function pickWeighted(list, rnd) {
  const total = list.reduce((a, [, w]) => a + w, 0);
  let r = rnd() * total;
  for (const [v, w] of list) {
    r -= w;
    if (r <= 0) return v;
  }
  return list[list.length - 1][0];
}

export function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function bloom(p, t0, t1) {
  const s = smoothstep(t0, t1, p);
  return s * (1 + 0.18 * Math.sin(s * Math.PI));
}

export function randomUnit(rnd) {
  const z = rnd() * 2 - 1;
  const t = rnd() * Math.PI * 2;
  const r = Math.sqrt(1 - z * z);
  return new THREE.Vector3(r * Math.cos(t), r * Math.sin(t), z);
}

// ---------------------------------------------------------------------------
// species
// ---------------------------------------------------------------------------

export function makeSpecies() {
  return {
    rose: { geo: makeRose(), weight: 4.5, scale: [0.42, 0.58], palette: ROSE_PALETTE, kind: 'flower' },
    peony: { geo: makePeony(), weight: 1.4, scale: [0.42, 0.56], palette: PEONY_PALETTE, kind: 'flower' },
    ranunculus: { geo: makeRanunculus(), weight: 2.8, scale: [0.48, 0.64], palette: RANUNCULUS_PALETTE, kind: 'flower' },
    hydrangea: { geo: makeHydrangea(), weight: 0.55, scale: [0.65, 0.85], palette: PALE_PALETTE, kind: 'flower' },
    gypsophila: { geo: makeGypsophila(), weight: 1.8, scale: [0.8, 1.15], palette: [['#ffffff', 1]], kind: 'filler' },
    bud: { geo: makeBud(), weight: 1.3, scale: [0.5, 0.7], palette: ROSE_PALETTE, kind: 'flower' },
    roseLeaf: { geo: makeRoseLeaf(), weight: 3, scale: [0.6, 0.9], colors: FOLIAGE.roseLeaf, kind: 'foliage' },
    eucalyptus: { geo: makeEucalyptus(), weight: 3, scale: [0.65, 1.0], colors: FOLIAGE.eucalyptus, kind: 'foliage' },
    ruscus: { geo: makeRuscus(), weight: 2, scale: [0.65, 0.95], colors: FOLIAGE.ruscus, kind: 'foliage' },
    trail: { geo: makeTrail(), weight: 0, scale: [0.9, 1.4], colors: FOLIAGE.trail, kind: 'foliage' },
  };
}

export function makeMaterials(envIntensity = 0.45) {
  return {
    petal: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.78, metalness: 0, side: THREE.DoubleSide, vertexColors: true, envMapIntensity: envIntensity }),
    leaf: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, metalness: 0, side: THREE.DoubleSide, vertexColors: true, envMapIntensity: envIntensity }),
  };
}

// ---------------------------------------------------------------------------
// instanced cluster
// ---------------------------------------------------------------------------

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _qs = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _c = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0);

export class InstancedCluster {
  constructor(geometry, material, items, { shadows = false } = {}) {
    this.items = items;
    this.mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, items.length));
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = shadows;
    this.mesh.receiveShadow = shadows;
    items.forEach((it, i) => {
      this.mesh.setColorAt(i, _c.set(it.color));
      this.mesh.setMatrixAt(i, _m.makeScale(0, 0, 0));
    });
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    if (items.length === 0) this.mesh.count = 0;
  }

  update(progress, time, sway = 1) {
    const items = this.items;
    const mesh = this.mesh;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const b = bloom(progress, it.t0, it.t1);
      if (b <= 0.0001) {
        mesh.setMatrixAt(i, _m.makeScale(0, 0, 0));
        continue;
      }
      const sc = it.scale * b;
      const twist = (1 - Math.min(1, b)) * 0.9;
      const a = sway * it.swayAmp;
      _e.set(Math.sin(time * it.swaySpeed + it.swayPhase) * a, twist + it.spin, Math.cos(time * it.swaySpeed * 0.8 + it.swayPhase) * a);
      _qs.setFromEuler(_e);
      _q.copy(it.quat).multiply(_qs);
      _s.set(sc, sc, sc);
      mesh.setMatrixAt(i, _m.compose(it.pos, _q, _s));
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
}

function quatFromDir(dir) {
  return new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
}

// ---------------------------------------------------------------------------
// anchors — where flowers can sit, with an outward normal and a bloom order
// ---------------------------------------------------------------------------

/**
 * Anchors along a polyline "garland": points[] in order, `thickness` is how far
 * flowers spread from the line, `front` is the direction that faces the viewer
 * (flowers mass towards it), `density(t)` weights where the mass is heavy.
 */
export function pathAnchors(points, { thickness = 0.28, front = new THREE.Vector3(0, 0, 1), density = () => 1, orderOffset = 0, orderScale = 1 }) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.3);
  let maxD = 0;
  for (let i = 0; i <= 50; i++) maxD = Math.max(maxD, density(i / 50));
  return (rnd) => {
    let t;
    for (;;) {
      t = rnd();
      if (rnd() * maxD < density(t)) break;
    }
    const p = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    // random direction in the plane perpendicular to the tangent, biased to `front`
    let n = randomUnit(rnd);
    n.sub(tangent.clone().multiplyScalar(n.dot(tangent))).normalize();
    n.lerp(front, 0.55 + rnd() * 0.3).normalize();
    const r = thickness * Math.pow(rnd(), 0.6);
    return { pos: p.clone().add(n.clone().multiplyScalar(r)), normal: n, order: orderOffset + t * orderScale, depth: r / thickness };
  };
}

/** Anchors over a dome (an urn arrangement): hemisphere of radius R on `centre`, squashed by `squash`. */
export function domeAnchors(centre, R, { squash = 0.8, front = new THREE.Vector3(0, 0.4, 1), orderOffset = 0, orderScale = 1 } = {}) {
  return (rnd) => {
    let n = randomUnit(rnd);
    n.y = Math.abs(n.y) * 0.9 + 0.1;
    n.normalize();
    const pos = centre.clone().add(new THREE.Vector3(n.x * R, n.y * R * squash, n.z * R));
    const nn = n.clone().lerp(front, 0.25).normalize();
    return { pos, normal: nn, order: orderOffset + (1 - n.y) * orderScale, depth: 0 };
  };
}

/** Sequence several anchor functions with relative weights. */
export function mixAnchors(list) {
  const total = list.reduce((a, [, w]) => a + w, 0);
  return (rnd) => {
    let r = rnd() * total;
    for (const [fn, w] of list) {
      r -= w;
      if (r <= 0) return fn(rnd);
    }
    return list[list.length - 1][0](rnd);
  };
}

// ---------------------------------------------------------------------------
// installation — a mixed, instanced arrangement that blooms in
// ---------------------------------------------------------------------------

/**
 * options:
 *   anchors      – anchor function (see above)
 *   flowers      – how many flower heads
 *   foliage      – how many foliage sprays
 *   bloom        – [start, end] in the parent's progress space
 *   front        – viewer direction for facing
 *   mix          – optional per-species weight overrides { rose: 4, trail: 2, ... }
 *   trailing     – if true, foliage hangs downward (cascade)
 */
export function buildInstallation(rnd, species, materials, { anchors, flowers, foliage, bloom: [b0, b1] = [0, 1], front = new THREE.Vector3(0, 0.15, 1), mix = {}, trailing = false, shadows = false }) {
  const items = {};
  const weightOf = (name) => mix[name] ?? species[name].weight;

  const flowerNames = Object.keys(species).filter((k) => species[k].kind !== 'foliage');
  const foliageNames = Object.keys(species).filter((k) => species[k].kind === 'foliage');
  const flowerList = flowerNames.map((k) => [k, weightOf(k)]).filter(([, w]) => w > 0);
  const foliageList = foliageNames.map((k) => [k, weightOf(k)]).filter(([, w]) => w > 0);
  for (const k of Object.keys(species)) items[k] = [];

  const span = b1 - b0;
  const makeCommon = (it, sc, color, t0, t1, swayAmp) => ({
    pos: it.pos,
    quat: quatFromDir(it.dir),
    scale: sc,
    color,
    t0,
    t1,
    swayAmp,
    swayPhase: rnd() * Math.PI * 2,
    swaySpeed: 0.5 + rnd() * 0.7,
    spin: rnd() * Math.PI * 2,
  });

  for (let i = 0; i < flowers; i++) {
    const a = anchors(rnd);
    const name = pickWeighted(flowerList, rnd);
    const sp = species[name];
    const [s0, s1] = sp.scale;
    // heads nearer the surface of the mass are a touch larger
    const sc = (s0 + rnd() * (s1 - s0)) * (0.9 + 0.2 * a.depth);
    const dir = a.normal.clone().lerp(front, 0.35 + rnd() * 0.3).normalize();
    const t0 = b0 + Math.min(0.85, a.order * 0.82 + rnd() * 0.06) * span;
    items[name].push(makeCommon({ pos: a.pos.clone().add(a.normal.clone().multiplyScalar(0.03 + rnd() * 0.05)), dir }, sc, pickWeighted(sp.palette, rnd), t0, t0 + span * 0.16, 0.035));
  }

  for (let i = 0; i < foliage; i++) {
    const a = anchors(rnd);
    const name = pickWeighted(foliageList, rnd);
    const sp = species[name];
    const [s0, s1] = sp.scale;
    const sc = s0 + rnd() * (s1 - s0);
    let dir;
    if (trailing || name === 'trail') {
      dir = new THREE.Vector3((rnd() - 0.5) * 0.5, -1, 0.25 + rnd() * 0.3).normalize();
    } else {
      dir = a.normal.clone().lerp(randomUnit(rnd), 0.55).normalize();
      if (dir.y < -0.2) dir.y = -0.2;
    }
    const pos = a.pos.clone().add(a.normal.clone().multiplyScalar(-(0.06 + rnd() * 0.12)));
    const t0 = b0 + Math.min(0.85, a.order * 0.82 + rnd() * 0.06) * span - span * 0.05;
    items[name].push(makeCommon({ pos, dir }, sc, sp.colors[Math.floor(rnd() * sp.colors.length)], Math.max(b0, t0), Math.max(b0, t0) + span * 0.14, 0.06));
  }

  const clusters = [];
  const group = new THREE.Group();
  // foliage first so heads draw on top in the same depth range
  for (const name of [...foliageNames, ...flowerNames]) {
    if (!items[name].length) continue;
    const sp = species[name];
    const c = new InstancedCluster(sp.geo, sp.kind === 'foliage' ? materials.leaf : materials.petal, items[name], { shadows });
    clusters.push(c);
    group.add(c.mesh);
  }

  return {
    group,
    update(p, time, sway) {
      for (const c of clusters) c.update(p, time, sway);
    },
  };
}
