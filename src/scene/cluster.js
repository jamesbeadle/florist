// A Cluster is a bunch of instanced flower heads + leaves that "bloom in" as a
// progress value goes 0 → 1. Each item has its own bloom window (t0..t1) so a
// cluster fills gradually, and a little sway so it never looks frozen.

import * as THREE from 'three';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _qSway = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _c = new THREE.Color();

export const PALETTE = {
  flowers: [
    ['#f6c9c4', 3], // blush
    ['#e8a2ae', 3], // dusty rose
    ['#fbf1e3', 2], // cream
    ['#f5c6a5', 1.5], // peach
    ['#c9738a', 1.5], // deep rose
    ['#fff9f3', 2], // white
    ['#dcbcd9', 1], // lilac
  ],
  leaves: ['#8aa47c', '#a5b892', '#6f8c66', '#9fb3a2', '#b6c4a6'],
};

export function pickWeighted(list, rnd = Math.random) {
  const total = list.reduce((a, [, w]) => a + w, 0);
  let r = rnd() * total;
  for (const [v, w] of list) {
    r -= w;
    if (r <= 0) return v;
  }
  return list[list.length - 1][0];
}

/** Seeded random so the arrangement is the same on every visit. */
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

/** Bloom curve: eases in, pops a touch past 1, settles. */
export function bloom(p, t0, t1) {
  const s = smoothstep(t0, t1, p);
  return s * (1 + 0.22 * Math.sin(s * Math.PI));
}

/**
 * items: [{ pos: Vector3, quat: Quaternion, scale: number, color: '#hex',
 *           t0, t1, swayAmp, swayPhase, swaySpeed }]
 */
export class InstancedCluster {
  constructor(geometry, material, items) {
    this.items = items;
    this.mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, items.length));
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    items.forEach((it, i) => {
      this.mesh.setColorAt(i, _c.set(it.color));
      this.mesh.setMatrixAt(i, _m.makeScale(0, 0, 0));
    });
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.lastProgress = -1;
  }

  /** progress 0..1, time seconds, sway 0..1 (0 = perfectly still) */
  update(progress, time, sway = 1) {
    const items = this.items;
    const mesh = this.mesh;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const b = bloom(progress, it.t0, it.t1);
      if (b <= 0.0001) {
        if (this.lastProgress > it.t0 || this.lastProgress < 0) mesh.setMatrixAt(i, _m.makeScale(0, 0, 0));
        continue;
      }
      const sc = it.scale * b;
      // unfurl: a little twist as it opens
      const twist = (1 - Math.min(1, b)) * 0.8;
      const a = sway * it.swayAmp;
      _e.set(
        Math.sin(time * it.swaySpeed + it.swayPhase) * a,
        twist,
        Math.cos(time * it.swaySpeed * 0.8 + it.swayPhase) * a
      );
      _qSway.setFromEuler(_e);
      _q.copy(it.quat).multiply(_qSway);
      _p.copy(it.pos);
      if (it.offset) _p.add(it.offset);
      _s.set(sc, sc, sc);
      mesh.setMatrixAt(i, _m.compose(_p, _q, _s));
    }
    mesh.instanceMatrix.needsUpdate = true;
    this.lastProgress = progress;
  }
}

/** Quaternion that points +Y along `dir`. */
export function quatFromDir(dir) {
  const q = new THREE.Quaternion();
  q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return q;
}

export function randomUnit(rnd) {
  const z = rnd() * 2 - 1;
  const t = rnd() * Math.PI * 2;
  const r = Math.sqrt(1 - z * z);
  return new THREE.Vector3(r * Math.cos(t), r * Math.sin(t), z);
}

export function makeItem(rnd, { pos, dir, scale, color, t0, t1, swayAmp = 0.05 }) {
  return {
    pos,
    quat: quatFromDir(dir),
    scale,
    color,
    t0,
    t1,
    swayAmp,
    swayPhase: rnd() * Math.PI * 2,
    swaySpeed: 0.6 + rnd() * 0.8,
  };
}
