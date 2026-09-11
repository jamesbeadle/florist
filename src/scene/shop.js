// Setting two: a plain little shopfront whose window fills with buckets of
// flowers, a garland along the frame and planters by the door — the "shop
// window display" that appears behind the portfolio section.

import * as THREE from 'three';
import { InstancedCluster, PALETTE, makeItem, mulberry32, pickWeighted, quatFromDir, randomUnit, smoothstep } from './cluster.js';
import { makeTextTexture } from './geometry.js';

const WIN = { x0: -1.7, x1: 1.7, y0: 0.55, y1: 2.95 };

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();

function box(w, h, d, color, opts = {}) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...opts }));
}

/** A container of stems: bucket/vase mesh + stems that grow + heads that open. */
function makeBunch(rnd, { pos, radius, count, stemLen, t0, t1, tilt = 0.35, colorPick }) {
  const stems = [];
  for (let i = 0; i < count; i++) {
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd()) * radius * 0.7;
    const base = new THREE.Vector3(pos.x + Math.cos(a) * r, pos.y, pos.z + Math.sin(a) * r);
    const dir = new THREE.Vector3(Math.cos(a) * tilt * (0.4 + rnd() * 0.8), 1, Math.sin(a) * tilt * (0.4 + rnd() * 0.6) + 0.15).normalize();
    const len = stemLen * (0.75 + rnd() * 0.5);
    const st0 = t0 + rnd() * (t1 - t0) * 0.6;
    const st1 = st0 + (t1 - t0) * 0.4;
    const faceDir = dir.clone().lerp(new THREE.Vector3(0, 0.3, 1), 0.5).normalize();
    stems.push({
      base,
      dir,
      quat: quatFromDir(dir),
      len,
      t0: st0,
      t1: st1,
      head: makeItem(rnd, {
        pos: base.clone(),
        dir: faceDir,
        scale: 0.3 + rnd() * 0.2,
        color: colorPick ? colorPick(rnd) : pickWeighted(PALETTE.flowers, rnd),
        t0: st0 + 0.04,
        t1: st1 + 0.06,
        swayAmp: 0.05,
      }),
      isBud: rnd() < 0.25,
    });
  }
  return stems;
}

export function buildShop({ materials, geometries, shadowTexture, quality }) {
  const rnd = mulberry32(8675309);
  const group = new THREE.Group();

  // --- the building ---
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(80, 16), new THREE.MeshStandardMaterial({ color: '#d3ddc9', roughness: 1, transparent: true, opacity: 0 }));
  wall.position.set(0.8, 8, -0.5);
  wall.renderOrder = -1;
  group.add(wall);

  // window interior (dark so the flowers glow) + display floor + back shelf
  const interior = new THREE.Mesh(
    new THREE.PlaneGeometry(WIN.x1 - WIN.x0, WIN.y1 - WIN.y0),
    new THREE.MeshStandardMaterial({ color: '#6a5854', roughness: 1 })
  );
  interior.position.set(0, (WIN.y0 + WIN.y1) / 2, -0.49);
  group.add(interior);

  const floor = box(WIN.x1 - WIN.x0, 0.06, 0.5, '#e9dccb');
  floor.position.set(0, WIN.y0 + 0.03, -0.25);
  group.add(floor);

  const shelf = box(3.1, 0.05, 0.32, '#e9dccb');
  shelf.position.set(0, 1.78, -0.32);
  group.add(shelf);

  // glass
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(WIN.x1 - WIN.x0, WIN.y1 - WIN.y0),
    new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.15, metalness: 0, transparent: true, opacity: 0.09, depthWrite: false })
  );
  glass.position.set(0, (WIN.y0 + WIN.y1) / 2, 0.02);
  group.add(glass);

  // frame
  const frameColor = '#f7f1e6';
  const fw = 0.13;
  const fd = 0.16;
  const left = box(fw, WIN.y1 - WIN.y0 + fw * 2, fd, frameColor);
  left.position.set(WIN.x0 - fw / 2, (WIN.y0 + WIN.y1) / 2, 0.04);
  const right = left.clone();
  right.position.x = WIN.x1 + fw / 2;
  const top = box(WIN.x1 - WIN.x0 + fw * 2, fw, fd, frameColor);
  top.position.set(0, WIN.y1 + fw / 2, 0.04);
  const sill = box(WIN.x1 - WIN.x0 + 0.5, 0.14, 0.42, frameColor);
  sill.position.set(0, WIN.y0 - 0.07, 0.1);
  group.add(left, right, top, sill);

  // stall riser under the window, fascia above
  const riser = box(WIN.x1 - WIN.x0 + 0.5, WIN.y0 - 0.14, 0.22, '#a9bb9e');
  riser.position.set(0, (WIN.y0 - 0.14) / 2, -0.06);
  group.add(riser);

  const fascia = box(4.6, 0.62, 0.14, frameColor);
  fascia.position.set(0.1, 3.5, 0.02);
  group.add(fascia);

  const signPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(3.9, 0.73),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  signPlane.position.set(0.1, 3.5, 0.095);
  group.add(signPlane);
  makeTextTexture("Amy's Little Florist").then((tex) => {
    signPlane.material.map = tex;
    signPlane.material.opacity = 1;
    signPlane.material.needsUpdate = true;
  });

  // door
  const doorX = 2.75;
  const door = box(1.0, 2.35, 0.08, '#93a889');
  door.position.set(doorX, 1.175, -0.04);
  const doorFrame = box(1.22, 2.5, 0.12, frameColor);
  doorFrame.position.set(doorX, 1.25, -0.1);
  const doorPane = box(0.62, 1.1, 0.02, '#6a5854');
  doorPane.position.set(doorX, 1.65, 0.01);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshStandardMaterial({ color: '#d4b36a', roughness: 0.3, metalness: 0.7 }));
  knob.position.set(doorX - 0.36, 1.1, 0.03);
  const step = box(1.3, 0.07, 0.55, '#d9ccb9');
  step.position.set(doorX, 0.035, 0.22);
  group.add(door, doorFrame, doorPane, knob, step);

  // soft shadows on the pavement
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, opacity: 0.55 });
  const pavementShadow = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.6), shadowMat);
  pavementShadow.rotation.x = -Math.PI / 2;
  pavementShadow.position.set(0.8, 0.004, 0.3);
  group.add(pavementShadow);

  // --- containers ---
  const bucketMat = new THREE.MeshStandardMaterial({ color: '#aeb1ac', roughness: 0.45, metalness: 0.6 });
  const vaseMat = new THREE.MeshStandardMaterial({ color: '#f3e7d8', roughness: 0.5 });
  const bucketGeo = new THREE.CylinderGeometry(0.17, 0.14, 0.36, 18, 1, true);
  const bucketGeoBase = new THREE.CylinderGeometry(0.14, 0.14, 0.01, 18);
  const vaseGeo = new THREE.LatheGeometry(
    [new THREE.Vector2(0.001, 0), new THREE.Vector2(0.09, 0), new THREE.Vector2(0.12, 0.08), new THREE.Vector2(0.08, 0.2), new THREE.Vector2(0.07, 0.26), new THREE.Vector2(0.085, 0.3)],
    18
  );

  const containers = []; // { mesh, y, t0, t1 }
  const bunches = []; // stems arrays

  const floorY = WIN.y0 + 0.06;
  const bucketSpots = [
    [-1.15, -0.26],
    [-0.42, -0.1],
    [0.36, -0.28],
    [1.08, -0.12],
  ];
  bucketSpots.forEach(([x, z], i) => {
    const m = new THREE.Group();
    const side = new THREE.Mesh(bucketGeo, bucketMat);
    side.material.side = THREE.DoubleSide;
    side.position.y = 0.18;
    const base = new THREE.Mesh(bucketGeoBase, bucketMat);
    base.position.y = 0.005;
    m.add(side, base);
    m.position.set(x, floorY - 0.6, z);
    group.add(m);
    const t0 = 0.02 + i * 0.05;
    containers.push({ mesh: m, y: floorY, t0, t1: t0 + 0.14, rise: 0.6 });
    bunches.push(
      makeBunch(rnd, {
        pos: new THREE.Vector3(x, floorY + 0.3, z),
        radius: 0.15,
        count: quality.stemsPerBucket,
        stemLen: 0.62,
        t0: t0 + 0.08,
        t1: t0 + 0.55,
      })
    );
  });

  const shelfY = 1.805;
  [-1.05, 0.0, 0.95].forEach((x, i) => {
    const v = new THREE.Mesh(vaseGeo, vaseMat);
    v.position.set(x, shelfY, -0.32);
    v.scale.setScalar(0.001);
    group.add(v);
    const t0 = 0.22 + i * 0.06;
    containers.push({ mesh: v, y: shelfY, t0, t1: t0 + 0.12, pop: true });
    bunches.push(
      makeBunch(rnd, {
        pos: new THREE.Vector3(x, shelfY + 0.28, -0.32),
        radius: 0.07,
        count: quality.stemsPerVase,
        stemLen: 0.42,
        t0: t0 + 0.06,
        t1: t0 + 0.5,
        tilt: 0.5,
      })
    );
  });

  // planters by the door
  [
    [doorX - 0.85, 0.42],
    [doorX + 0.85, 0.42],
  ].forEach(([x, z], i) => {
    const m = new THREE.Group();
    const side = new THREE.Mesh(bucketGeo, bucketMat);
    side.material.side = THREE.DoubleSide;
    side.position.y = 0.18;
    m.add(side);
    m.scale.setScalar(0.001);
    m.position.set(x, 0, z);
    group.add(m);
    const t0 = 0.45 + i * 0.08;
    containers.push({ mesh: m, y: 0, t0, t1: t0 + 0.12, pop: true });
    bunches.push(
      makeBunch(rnd, {
        pos: new THREE.Vector3(x, 0.3, z),
        radius: 0.15,
        count: quality.stemsPerPlanter,
        stemLen: 0.55,
        t0: t0 + 0.08,
        t1: t0 + 0.45,
      })
    );
  });

  // --- stems (one instanced mesh for all) + heads ---
  const allStems = bunches.flat();
  const stemGeo = new THREE.CylinderGeometry(0.011, 0.015, 1, 5, 1);
  stemGeo.translate(0, 0.5, 0);
  const stemMesh = new THREE.InstancedMesh(stemGeo, materials.stem, Math.max(1, allStems.length));
  stemMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  stemMesh.frustumCulled = false;
  group.add(stemMesh);

  const headItems = allStems.filter((s) => !s.isBud).map((s) => s.head);
  const budItems = allStems.filter((s) => s.isBud).map((s) => s.head);
  const heads = new InstancedCluster(geometries.flower, materials.petal, headItems);
  const buds = new InstancedCluster(geometries.bud, materials.petal, budItems);
  group.add(heads.mesh, buds.mesh);

  // stem leaves: one or two per stem, ride along at a fraction of the height
  const stemLeaves = [];
  allStems.forEach((s) => {
    const n = rnd() < 0.6 ? 1 : 2;
    for (let i = 0; i < n; i++) {
      const frac = 0.35 + rnd() * 0.4;
      const dir = randomUnit(rnd);
      dir.y = Math.abs(dir.y) * 0.4 + 0.2;
      dir.normalize();
      stemLeaves.push({
        stem: s,
        frac,
        item: makeItem(rnd, {
          pos: s.base.clone(),
          dir,
          scale: 0.35 + rnd() * 0.25,
          color: PALETTE.leaves[Math.floor(rnd() * PALETTE.leaves.length)],
          t0: s.t0 + 0.02,
          t1: s.t1,
          swayAmp: 0.07,
        }),
      });
    }
  });
  const stemLeafCluster = new InstancedCluster(geometries.leaf, materials.leaf, stemLeaves.map((l) => l.item));
  group.add(stemLeafCluster.mesh);

  // --- garland along the top of the frame, cascading down the right ---
  const garlandFlowers = [];
  const garlandLeaves = [];
  const gp = new THREE.Vector3();
  const garlandPoint = (t) => {
    if (t < 0.62) return gp.set(WIN.x0 - 0.1 + (t / 0.62) * (WIN.x1 - WIN.x0 + 0.2), WIN.y1 + 0.08, 0.1);
    const u = (t - 0.62) / 0.38;
    return gp.set(WIN.x1 + 0.12 + Math.sin(u * 2.2) * 0.12, WIN.y1 + 0.08 - u * 1.5, 0.1 + u * 0.05);
  };
  const gDensity = (t) => 0.35 + 0.9 * Math.exp(-((t - 0.05) ** 2) / 0.012) + 0.7 * Math.exp(-((t - 0.7) ** 2) / 0.02) + 0.3 * Math.exp(-((t - 0.4) ** 2) / 0.01);
  const sampleG = () => {
    for (;;) {
      const t = rnd();
      if (rnd() * 1.3 < gDensity(t)) return t;
    }
  };
  for (let i = 0; i < quality.garlandFlowers; i++) {
    const t = sampleG();
    garlandPoint(t);
    const off = randomUnit(rnd);
    off.z = Math.abs(off.z) + 0.3;
    off.normalize().multiplyScalar(0.05 + rnd() * 0.2);
    const pos = gp.clone().add(off);
    const dir = off.clone().lerp(new THREE.Vector3(0, 0.2, 1), 0.5).normalize();
    const t0 = 0.4 + (0.7 * t + 0.3 * rnd()) * 0.5;
    garlandFlowers.push(makeItem(rnd, { pos, dir, scale: 0.2 + rnd() * 0.18, color: pickWeighted(PALETTE.flowers, rnd), t0, t1: t0 + 0.12, swayAmp: 0.04 }));
  }
  for (let i = 0; i < quality.garlandLeaves; i++) {
    const t = sampleG();
    garlandPoint(t);
    const off = randomUnit(rnd);
    off.z = Math.abs(off.z) * 0.6 + 0.2;
    off.normalize().multiplyScalar(0.04 + rnd() * 0.24);
    const pos = gp.clone().add(off);
    const dir = off.clone().lerp(randomUnit(rnd), 0.5).normalize();
    const t0 = 0.36 + (0.7 * t + 0.3 * rnd()) * 0.5;
    garlandLeaves.push(makeItem(rnd, { pos, dir, scale: 0.35 + rnd() * 0.35, color: PALETTE.leaves[Math.floor(rnd() * PALETTE.leaves.length)], t0, t1: t0 + 0.1, swayAmp: 0.07 }));
  }
  const garlandF = new InstancedCluster(geometries.flower, materials.petal, garlandFlowers);
  const garlandL = new InstancedCluster(geometries.leaf, materials.leaf, garlandLeaves);
  group.add(garlandL.mesh, garlandF.mesh);

  const stemQuatUp = new THREE.Quaternion();

  return {
    group,
    wall,
    focus: new THREE.Vector3(0.55, 1.75, 0),
    update(p, time, sway) {
      // containers rise or pop into place
      for (const c of containers) {
        const s = smoothstep(c.t0, c.t1, p);
        if (c.rise) {
          c.mesh.position.y = c.y - c.rise * (1 - s);
        } else {
          const k = Math.max(0.001, s * (1 + 0.2 * Math.sin(s * Math.PI)));
          c.mesh.scale.setScalar(k);
        }
      }
      // stems grow; heads and leaves ride the tips
      for (let i = 0; i < allStems.length; i++) {
        const s = allStems[i];
        const g = smoothstep(s.t0, s.t1, p);
        const swayX = Math.sin(time * 0.9 + i) * 0.015 * sway * g;
        _q.copy(s.quat);
        if (swayX) {
          stemQuatUp.setFromAxisAngle(new THREE.Vector3(0, 0, 1), swayX);
          _q.multiply(stemQuatUp);
        }
        _s.set(1, Math.max(0.0001, s.len * g), 1);
        stemMesh.setMatrixAt(i, _m.compose(s.base, _q, _s));
        _p.copy(s.dir).multiplyScalar(s.len * g).add(s.base);
        s.head.pos.copy(_p);
      }
      stemMesh.instanceMatrix.needsUpdate = true;
      for (const l of stemLeaves) {
        const g = smoothstep(l.stem.t0, l.stem.t1, p);
        l.item.pos.copy(l.stem.dir).multiplyScalar(l.stem.len * g * l.frac).add(l.stem.base);
      }
      heads.update(p, time, sway);
      buds.update(p, time, sway);
      stemLeafCluster.update(p, time, sway);
      garlandL.update(p, time, sway);
      garlandF.update(p, time, sway);
    },
  };
}
