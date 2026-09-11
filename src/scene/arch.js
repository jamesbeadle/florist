// Setting one: a bare wooden ceremony arch on a lawn that blooms into a full
// asymmetric floral arch as the hero scrolls.

import * as THREE from 'three';
import { InstancedCluster, PALETTE, makeItem, mulberry32, pickWeighted, randomUnit, smoothstep } from './cluster.js';

const ARCH_W = 1.55; // half width
const LEG_H = 2.1;

/** Point along the arch, t 0..1 from the base of the left leg to the base of the right. */
function archPoint(t, out = new THREE.Vector3()) {
  if (t < 0.3) return out.set(-ARCH_W, (t / 0.3) * LEG_H, 0);
  if (t > 0.7) return out.set(ARCH_W, (1 - (t - 0.7) / 0.3) * LEG_H, 0);
  const a = Math.PI - ((t - 0.3) / 0.4) * Math.PI;
  return out.set(Math.cos(a) * ARCH_W, LEG_H + Math.sin(a) * ARCH_W * 0.85, 0);
}

class ArchCurve extends THREE.Curve {
  getPoint(t, out = new THREE.Vector3()) {
    return archPoint(t, out);
  }
}

const gauss = (x, m, s) => Math.exp(-((x - m) * (x - m)) / (2 * s * s));

// Where the flowers cluster: heavy top-left, a drape on the right leg, light elsewhere.
function density(t) {
  return 0.18 + 1.0 * gauss(t, 0.38, 0.09) + 0.75 * gauss(t, 0.88, 0.07) + 0.35 * gauss(t, 0.62, 0.05);
}

function sampleT(rnd) {
  for (;;) {
    const t = rnd();
    if (rnd() * 1.25 < density(t)) return t;
  }
}

export function buildArch({ materials, geometries, shadowTexture, quality }) {
  const rnd = mulberry32(20240915);
  const group = new THREE.Group();

  // --- the arch itself ---
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(new ArchCurve(), 96, 0.06, 10, false),
    new THREE.MeshStandardMaterial({ color: '#c9a98a', roughness: 0.75, metalness: 0 })
  );
  group.add(tube);

  // crossbar for stability (and a place for flowers to hang from)
  const bar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, ARCH_W * 2, 8),
    new THREE.MeshStandardMaterial({ color: '#c9a98a', roughness: 0.75 })
  );
  bar.rotation.z = Math.PI / 2;
  bar.position.y = LEG_H - 0.15;
  group.add(bar);

  // feet
  [-ARCH_W, ARCH_W].forEach((x) => {
    const foot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.13, 0.08, 12),
      new THREE.MeshStandardMaterial({ color: '#b39377', roughness: 0.9 })
    );
    foot.position.set(x, 0.04, 0);
    group.add(foot);
    const sh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 1.1),
      new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false })
    );
    sh.rotation.x = -Math.PI / 2;
    sh.position.set(x, 0.005, 0);
    group.add(sh);
  });

  // broad soft shadow under the whole arch
  const big = new THREE.Mesh(
    new THREE.PlaneGeometry(5.5, 3.2),
    new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, opacity: 0.5 })
  );
  big.rotation.x = -Math.PI / 2;
  big.position.set(0, 0.003, 0.2);
  group.add(big);

  // --- flowers ---
  const flowerCount = quality.archFlowers;
  const leafCount = quality.archLeaves;
  const flowers = [];
  const buds = [];
  const leaves = [];
  const tmp = new THREE.Vector3();

  for (let i = 0; i < flowerCount; i++) {
    const t = sampleT(rnd);
    archPoint(t, tmp);
    // offset away from the tube, biased forwards (towards the camera) so it reads as a mass
    const off = randomUnit(rnd);
    off.z = Math.abs(off.z) * 1.3 + 0.2;
    off.normalize().multiplyScalar(0.08 + rnd() * 0.28);
    const pos = tmp.clone().add(off);
    const dir = off.clone().normalize().lerp(new THREE.Vector3(0, 0.25, 1), 0.45).normalize();
    // bloom sweeps from the left foot, over the top, down the right — with scatter
    const order = 0.75 * t + 0.25 * rnd();
    const t0 = 0.04 + order * 0.72;
    const item = makeItem(rnd, {
      pos,
      dir,
      scale: 0.28 + rnd() * 0.24,
      color: pickWeighted(PALETTE.flowers, rnd),
      t0,
      t1: t0 + 0.14,
      swayAmp: 0.04,
    });
    (rnd() < 0.22 ? buds : flowers).push(item);
  }

  for (let i = 0; i < leafCount; i++) {
    const t = sampleT(rnd);
    archPoint(t, tmp);
    const off = randomUnit(rnd);
    off.z = Math.abs(off.z) * 0.8 + 0.1;
    off.normalize().multiplyScalar(0.05 + rnd() * 0.36);
    const pos = tmp.clone().add(off);
    const dir = off.clone().normalize().lerp(randomUnit(rnd), 0.5).normalize();
    const order = 0.75 * t + 0.25 * rnd();
    const t0 = 0.0 + order * 0.7; // foliage arrives just ahead of the flowers
    leaves.push(
      makeItem(rnd, {
        pos,
        dir,
        scale: 0.32 + rnd() * 0.3,
        color: PALETTE.leaves[Math.floor(rnd() * PALETTE.leaves.length)],
        t0,
        t1: t0 + 0.12,
        swayAmp: 0.08,
      })
    );
  }

  const flowerCluster = new InstancedCluster(geometries.flower, materials.petal, flowers);
  const budCluster = new InstancedCluster(geometries.bud, materials.petal, buds);
  const leafCluster = new InstancedCluster(geometries.leaf, materials.leaf, leaves);
  group.add(leafCluster.mesh, flowerCluster.mesh, budCluster.mesh);

  // a few tufts of grass/wildflowers at the feet so the lawn isn't bare
  const tufts = [];
  for (let i = 0; i < quality.archTufts; i++) {
    const side = rnd() < 0.5 ? -1 : 1;
    const pos = new THREE.Vector3(side * ARCH_W + (rnd() - 0.5) * 1.2, 0.02, (rnd() - 0.4) * 0.9);
    const dir = new THREE.Vector3((rnd() - 0.5) * 0.6, 1, (rnd() - 0.5) * 0.6);
    tufts.push(
      makeItem(rnd, {
        pos,
        dir,
        scale: 0.35 + rnd() * 0.4,
        color: PALETTE.leaves[Math.floor(rnd() * PALETTE.leaves.length)],
        t0: rnd() * 0.3,
        t1: 0.35 + rnd() * 0.2,
        swayAmp: 0.1,
      })
    );
  }
  const tuftCluster = new InstancedCluster(geometries.leaf, materials.leaf, tufts);
  group.add(tuftCluster.mesh);

  return {
    group,
    /** progress 0..1 */
    update(p, time, sway) {
      leafCluster.update(p, time, sway);
      flowerCluster.update(p, time, sway);
      budCluster.update(p, time, sway);
      tuftCluster.update(p, time, sway);
      big.material.opacity = 0.25 + 0.35 * smoothstep(0, 1, p);
    },
    focus: new THREE.Vector3(0, LEG_H * 0.85, 0),
  };
}
