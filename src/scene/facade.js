// The setting: a limestone Georgian facade. A pedimented doorcase with Tuscan
// columns, fanlight, panelled door, stone steps, railings and urns — and,
// further along the same wall, a tall stone-surround sash window with urns.
// Two installations bloom on it: the doorway (hero) and the window (portfolio).

import * as THREE from 'three';
import { buildInstallation, domeAnchors, mixAnchors, mulberry32, pathAnchors } from './flora.js';
import { makeAshlarTexture, makeNoiseBump, makePavingTexture, makeShadowTexture, makeStoneTexture } from './geometry.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const gauss = (x, m, s) => Math.exp(-((x - m) * (x - m)) / (2 * s * s));

export const WINDOW_X = 9.6;

export function buildFacade({ species, materials, quality, shadows }) {
  const rnd = mulberry32(7331);
  const group = new THREE.Group();
  const texRnd = mulberry32(99);

  // --- materials ---
  const bump = makeNoiseBump(texRnd);
  const ashlarMat = new THREE.MeshStandardMaterial({ color: '#d3c5ab', map: makeAshlarTexture(texRnd, { repeat: [9, 2.2] }), bumpMap: bump, bumpScale: 0.012, roughness: 0.96, envMapIntensity: 0.15 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: '#dccfb6', map: makeStoneTexture(texRnd, { repeat: [2, 2] }), bumpMap: bump, bumpScale: 0.008, roughness: 0.9, envMapIntensity: 0.18 });
  const stoneDeepMat = new THREE.MeshStandardMaterial({ color: '#c6b699', roughness: 0.95, envMapIntensity: 0.2 });
  const pavingMat = new THREE.MeshStandardMaterial({ color: '#cfc4b0', map: makePavingTexture(texRnd, { repeat: [15, 10] }), bumpMap: bump, bumpScale: 0.01, roughness: 0.95, envMapIntensity: 0.2 });
  const doorMat = new THREE.MeshStandardMaterial({ color: '#1c2823', roughness: 0.3, metalness: 0.05, envMapIntensity: 0.9 });
  const doorRecessMat = new THREE.MeshStandardMaterial({ color: '#131c18', roughness: 0.35, metalness: 0.05, envMapIntensity: 0.7 });
  const brassMat = new THREE.MeshStandardMaterial({ color: '#c9a44a', roughness: 0.28, metalness: 0.95, envMapIntensity: 1.2 });
  const ironMat = new THREE.MeshStandardMaterial({ color: '#17181a', roughness: 0.45, metalness: 0.6, envMapIntensity: 0.6 });
  const paintMat = new THREE.MeshStandardMaterial({ color: '#f2ede3', roughness: 0.55, envMapIntensity: 0.4 });
  const glassMat = new THREE.MeshStandardMaterial({ color: '#2a3332', roughness: 0.3, metalness: 0.1, envMapIntensity: 0.5 });
  const shadowTex = makeShadowTexture();

  const add = (mesh, { cast = true, receive = true } = {}) => {
    mesh.castShadow = shadows && cast;
    mesh.receiveShadow = shadows && receive;
    group.add(mesh);
    return mesh;
  };
  const box = (w, h, d, mat, x, y, z, opts) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    return add(m, opts);
  };
  const blob = (x, z, w, h, opacity = 0.45) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.006, z);
    group.add(m);
  };

  // --- ground & wall ---
  const paving = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), pavingMat);
  paving.rotation.x = -Math.PI / 2;
  paving.position.set(4, 0, 12);
  add(paving, { cast: false });

  const wall = new THREE.Mesh(new THREE.PlaneGeometry(44, 9), ashlarMat);
  wall.position.set(4, 4.5, 0);
  add(wall, { cast: false });

  // plinth course, string course, parapet cornice — the horizontals that make it a building
  box(44, 0.5, 0.08, stoneDeepMat, 4, 0.25, 0.04);
  box(44, 0.16, 0.1, stoneMat, 4, 5.45, 0.05);
  box(44, 0.34, 0.28, stoneMat, 4, 8.6, 0.14);
  box(44, 0.1, 0.36, stoneMat, 4, 8.82, 0.18);

  // =========================================================================
  // THE DOORCASE (x = 0)
  // =========================================================================

  // steps
  const steps = [
    [4.4, 0.15, 1.55, 0.075],
    [4.1, 0.15, 1.25, 0.225],
    [3.8, 0.15, 0.95, 0.375],
  ];
  steps.forEach(([w, h, d, y]) => box(w, h, d, stoneMat, 0, y, d / 2));
  blob(0, 1.7, 6, 1.6, 0.3);

  // columns
  const colX = 1.2;
  const colZ = 0.55;
  const platformY = 0.45;
  [-colX, colX].forEach((x) => {
    box(0.52, 0.08, 0.52, stoneMat, x, platformY + 0.04, colZ);
    const torus = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 10, 28), stoneMat);
    torus.rotation.x = Math.PI / 2;
    torus.position.set(x, platformY + 0.11, colZ);
    add(torus);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 2.85, 28, 1), stoneMat);
    shaft.position.set(x, platformY + 0.15 + 1.425, colZ);
    add(shaft);
    const echinus = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.16, 0.13, 28, 1), stoneMat);
    echinus.position.set(x, platformY + 3.0 + 0.065, colZ);
    add(echinus);
    box(0.54, 0.1, 0.54, stoneMat, x, platformY + 3.13 + 0.05, colZ);
  });

  // entablature
  const entY = platformY + 3.23; // 3.68
  box(3.4, 0.16, 0.9, stoneMat, 0, entY + 0.08, 0.45);
  box(3.4, 0.28, 0.84, stoneDeepMat, 0, entY + 0.16 + 0.14, 0.42);
  box(3.7, 0.12, 1.02, stoneMat, 0, entY + 0.44 + 0.06, 0.51);
  box(3.85, 0.07, 1.12, stoneMat, 0, entY + 0.56 + 0.035, 0.56);

  // pediment
  const pedY = entY + 0.63;
  const tri = new THREE.Shape();
  tri.moveTo(-1.95, 0);
  tri.lineTo(1.95, 0);
  tri.lineTo(0, 0.95);
  tri.closePath();
  const ped = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 1.0, bevelEnabled: false }), stoneMat);
  ped.position.set(0, pedY, 0.05);
  add(ped);
  // recessed tympanum face for a little relief
  const tri2 = new THREE.Shape();
  tri2.moveTo(-1.6, 0.1);
  tri2.lineTo(1.6, 0.1);
  tri2.lineTo(0, 0.86);
  tri2.closePath();
  const tym = new THREE.Mesh(new THREE.ExtrudeGeometry(tri2, { depth: 0.04, bevelEnabled: false }), stoneDeepMat);
  tym.position.set(0, pedY, 1.05);
  add(tym, { cast: false });

  // door opening: reveal, door, panels, fanlight, surround
  const doorW = 1.4;
  const doorH = 2.5;
  const doorY0 = platformY;
  box(doorW + 0.3, 0.12, 0.2, stoneMat, 0, doorY0 - 0.06, 0.1); // threshold
  const door = box(doorW, doorH, 0.07, doorMat, 0, doorY0 + doorH / 2, 0.03);
  door.receiveShadow = shadows;
  // six recessed panels
  const panelRows = [
    [doorY0 + 2.2, 0.38],
    [doorY0 + 1.42, 0.86],
    [doorY0 + 0.55, 0.62],
  ];
  panelRows.forEach(([y, h]) => {
    [-0.34, 0.34].forEach((x) => box(0.5, h, 0.02, doorRecessMat, x, y, 0.062, { cast: false }));
  });
  // brass
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), brassMat);
  knob.position.set(0.48, doorY0 + 1.32, 0.1);
  add(knob);
  const knocker = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.014, 10, 28), brassMat);
  knocker.position.set(0, doorY0 + 1.75, 0.09);
  add(knocker);
  const knockerBoss = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), brassMat);
  knockerBoss.position.set(0, doorY0 + 1.82, 0.08);
  add(knockerBoss);
  box(0.34, 0.07, 0.015, brassMat, 0, doorY0 + 1.05, 0.075);

  // fanlight
  const fanR = 0.66;
  const fanY = doorY0 + doorH;
  const fanGlass = new THREE.Mesh(new THREE.CircleGeometry(fanR, 40, 0, Math.PI), glassMat);
  fanGlass.position.set(0, fanY, 0.02);
  add(fanGlass, { cast: false });
  const fanRim = new THREE.Mesh(new THREE.TorusGeometry(fanR, 0.03, 8, 40, Math.PI), paintMat);
  fanRim.position.set(0, fanY, 0.05);
  add(fanRim);
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * Math.PI;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(fanR, 0.025, 0.025), paintMat);
    bar.position.set(Math.cos(a) * fanR * 0.5, fanY + Math.sin(a) * fanR * 0.5, 0.045);
    bar.rotation.z = a;
    add(bar, { cast: false });
  }
  const fanInner = new THREE.Mesh(new THREE.TorusGeometry(fanR * 0.55, 0.02, 8, 32, Math.PI), paintMat);
  fanInner.position.set(0, fanY, 0.05);
  add(fanInner, { cast: false });
  box(doorW + 0.06, 0.06, 0.04, paintMat, 0, fanY, 0.05); // transom bar

  // door surround (architrave)
  const surW = 0.16;
  box(surW, doorH + 0.02, 0.1, stoneMat, -doorW / 2 - surW / 2, doorY0 + doorH / 2, 0.05);
  box(surW, doorH + 0.02, 0.1, stoneMat, doorW / 2 + surW / 2, doorY0 + doorH / 2, 0.05);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(fanR + surW / 2 + 0.03, surW / 2, 8, 48, Math.PI), stoneMat);
  arch.position.set(0, fanY, 0.05);
  arch.scale.z = 0.5;
  add(arch);
  // keystone
  box(0.2, 0.3, 0.14, stoneMat, 0, fanY + fanR + surW / 2 + 0.03, 0.07);

  // railings on the bottom step
  const railZ = [0.25, 1.45];
  [-2.05, 2.05].forEach((x) => {
    railZ.forEach((z) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 1.05, 10), ironMat);
      post.position.set(x, 0.15 + 0.525, z);
      add(post);
      const finial = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), ironMat);
      finial.position.set(x, 1.22, z);
      add(finial);
    });
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 1.2), ironMat);
    rail.position.set(x, 1.12, 0.85);
    add(rail);
    for (let i = 1; i <= 4; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.95, 6), ironMat);
      b.position.set(x, 0.15 + 0.48, 0.25 + i * 0.24);
      add(b, { cast: false });
    }
  });

  // --- urns ---
  const urnProfile = [
    [0.001, 0],
    [0.19, 0],
    [0.2, 0.05],
    [0.1, 0.09],
    [0.09, 0.2],
    [0.15, 0.3],
    [0.25, 0.44],
    [0.3, 0.58],
    [0.28, 0.66],
    [0.34, 0.69],
    [0.34, 0.75],
    [0.29, 0.76],
    [0.25, 0.7],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const urnGeo = new THREE.LatheGeometry(urnProfile, 36);
  const urnInstall = [];
  function urn(x, z, plinthH = 0.6) {
    box(0.6, plinthH, 0.6, stoneMat, x, plinthH / 2, z);
    box(0.68, 0.06, 0.68, stoneMat, x, plinthH + 0.03, z);
    const u = new THREE.Mesh(urnGeo, stoneMat);
    u.position.set(x, plinthH + 0.06, z);
    add(u);
    blob(x, z + 0.1, 1.4, 1.4, 0.35);
    return V3(x, plinthH + 0.06 + 0.7, z);
  }

  // =========================================================================
  // DOORWAY INSTALLATION — asymmetric: up the left column, heavy at the
  // top-left corner, thinning across the entablature; a small answer bottom right
  // =========================================================================
  const q = quality;
  const front = V3(0.05, 0.12, 1);
  const sweep = pathAnchors(
    [V3(-1.3, 1.9, 0.75), V3(-1.38, 2.7, 0.8), V3(-1.45, 3.4, 0.85), V3(-1.62, 3.95, 0.98), V3(-1.35, 4.25, 1.05), V3(-0.55, 4.32, 1.0), V3(0.35, 4.22, 0.95), V3(1.0, 4.12, 0.9)],
    { thickness: 0.34, front, density: (t) => 0.22 + 1.0 * gauss(t, 0.5, 0.11) + 0.5 * gauss(t, 0.22, 0.12) + 0.3 * gauss(t, 0.78, 0.1) }
  );
  const answer = pathAnchors([V3(1.32, 0.85, 0.78), V3(1.4, 1.35, 0.82), V3(1.34, 1.85, 0.8)], { thickness: 0.26, front, density: (t) => 0.4 + gauss(t, 0.45, 0.25), orderOffset: 0.55, orderScale: 0.45 });

  const doorwayMain = buildInstallation(rnd, species, materials, {
    anchors: mixAnchors([
      [sweep, 4],
      [answer, 0.9],
    ]),
    flowers: q.doorFlowers,
    foliage: q.doorFoliage,
    bloom: [0.04, 0.96],
    front,
    shadows,
  });
  group.add(doorwayMain.group);

  // cascade of trailing greenery from the corner
  const cascade = buildInstallation(rnd, species, materials, {
    anchors: pathAnchors([V3(-1.75, 4.0, 1.0), V3(-1.7, 3.6, 1.0), V3(-1.6, 3.2, 0.95)], { thickness: 0.18, front, density: (t) => 1 - t * 0.6, orderOffset: 0.55, orderScale: 0.3 }),
    flowers: 0,
    foliage: q.doorTrail,
    bloom: [0.45, 0.95],
    front,
    mix: { trail: 4, eucalyptus: 1, roseLeaf: 0, ruscus: 0 },
    trailing: true,
    shadows,
  });
  group.add(cascade.group);

  // urns flanking the steps
  const urnL = urn(-2.4, 1.15);
  const urnR = urn(2.4, 1.15);
  const urnInstallL = buildInstallation(rnd, species, materials, {
    anchors: domeAnchors(urnL, 0.5, { squash: 0.72 }),
    flowers: q.urnFlowers,
    foliage: q.urnFoliage,
    bloom: [0.12, 0.7],
    front: V3(0, 0.45, 1),
    mix: { trail: 1.2, hydrangea: 2 },
    shadows,
  });
  const urnInstallR = buildInstallation(rnd, species, materials, {
    anchors: domeAnchors(urnR, 0.5, { squash: 0.72 }),
    flowers: q.urnFlowers,
    foliage: q.urnFoliage,
    bloom: [0.2, 0.8],
    front: V3(0, 0.45, 1),
    mix: { trail: 1.2, hydrangea: 2 },
    shadows,
  });
  group.add(urnInstallL.group, urnInstallR.group);
  urnInstall.push(urnInstallL, urnInstallR);

  // =========================================================================
  // THE WINDOW (x = WINDOW_X)
  // =========================================================================
  const wx = WINDOW_X;
  const win = { w: 1.5, y0: 1.4, y1: 4.3 };
  const wh = win.y1 - win.y0;
  const wcy = (win.y0 + win.y1) / 2;
  // glass + frame + sash bars
  const glass = box(win.w, wh, 0.02, glassMat, wx, wcy, -0.01, { cast: false });
  glass.receiveShadow = false;
  const fr = 0.07;
  box(fr, wh, 0.06, paintMat, wx - win.w / 2 + fr / 2, wcy, 0.01);
  box(fr, wh, 0.06, paintMat, wx + win.w / 2 - fr / 2, wcy, 0.01);
  box(win.w, fr, 0.06, paintMat, wx, win.y1 - fr / 2, 0.01);
  box(win.w, fr, 0.06, paintMat, wx, win.y0 + fr / 2, 0.01);
  const meet = win.y0 + wh * 0.5;
  box(win.w, 0.07, 0.07, paintMat, wx, meet, 0.02); // meeting rail
  [-0.25, 0.25].forEach((dx) => box(0.032, wh, 0.04, paintMat, wx + dx, wcy, 0.015, { cast: false }));
  [win.y0 + wh * 0.25, win.y0 + wh * 0.75].forEach((y) => box(win.w, 0.032, 0.04, paintMat, wx, y, 0.015, { cast: false }));

  // stone surround, cornice, sill, apron
  const sw = 0.2;
  box(sw, wh + 0.3, 0.12, stoneMat, wx - win.w / 2 - sw / 2, wcy + 0.05, 0.06);
  box(sw, wh + 0.3, 0.12, stoneMat, wx + win.w / 2 + sw / 2, wcy + 0.05, 0.06);
  box(win.w + sw * 2, 0.22, 0.12, stoneMat, wx, win.y1 + 0.11, 0.06);
  box(win.w + sw * 2 + 0.3, 0.16, 0.3, stoneMat, wx, win.y1 + 0.3, 0.15);
  box(win.w + sw * 2 + 0.2, 0.14, 0.34, stoneMat, wx, win.y0 - 0.07, 0.17);
  box(win.w + 0.1, 0.55, 0.06, stoneDeepMat, wx, win.y0 - 0.45, 0.03);
  box(0.16, 0.26, 0.14, stoneMat, wx, win.y1 + 0.22, 0.09); // keystone-ish block

  // sill garland — heavy at the top-left corner, draped along the sill, cascading down the left
  const wfront = V3(0.05, 0.2, 1);
  const sillPath = pathAnchors(
    [V3(wx - 1.05, 0.55, 0.36), V3(wx - 1.02, 1.0, 0.36), V3(wx - 0.95, 1.5, 0.34), V3(wx - 0.45, 1.36, 0.33), V3(wx + 0.15, 1.3, 0.32), V3(wx + 0.75, 1.36, 0.32), V3(wx + 1.05, 1.5, 0.3)],
    { thickness: 0.3, front: wfront, density: (t) => 0.25 + 1.0 * gauss(t, 0.36, 0.1) + 0.45 * gauss(t, 0.12, 0.1) + 0.35 * gauss(t, 0.7, 0.12) }
  );
  const windowMain = buildInstallation(rnd, species, materials, {
    anchors: sillPath,
    flowers: q.windowFlowers,
    foliage: q.windowFoliage,
    bloom: [0.05, 0.9],
    front: wfront,
    shadows,
  });
  group.add(windowMain.group);
  const windowTrail = buildInstallation(rnd, species, materials, {
    anchors: pathAnchors([V3(wx - 1.1, 1.45, 0.4), V3(wx - 1.08, 1.1, 0.4), V3(wx - 1.0, 0.8, 0.4)], { thickness: 0.15, front: wfront, density: (t) => 1 - t * 0.5, orderOffset: 0.5, orderScale: 0.3 }),
    flowers: 0,
    foliage: q.windowTrail,
    bloom: [0.4, 0.95],
    front: wfront,
    mix: { trail: 4, eucalyptus: 1, roseLeaf: 0, ruscus: 0 },
    trailing: true,
    shadows,
  });
  group.add(windowTrail.group);

  const urnWL = urn(wx - 1.75, 0.6, 0.5);
  const urnWR = urn(wx + 1.75, 0.6, 0.5);
  const wUrnL = buildInstallation(rnd, species, materials, {
    anchors: domeAnchors(urnWL, 0.48, { squash: 0.72 }),
    flowers: q.urnFlowers,
    foliage: q.urnFoliage,
    bloom: [0.25, 0.85],
    front: V3(0, 0.45, 1),
    mix: { trail: 1.2, hydrangea: 2 },
    shadows,
  });
  const wUrnR = buildInstallation(rnd, species, materials, {
    anchors: domeAnchors(urnWR, 0.48, { squash: 0.72 }),
    flowers: q.urnFlowers,
    foliage: q.urnFoliage,
    bloom: [0.35, 0.95],
    front: V3(0, 0.45, 1),
    mix: { trail: 1.2, hydrangea: 2 },
    shadows,
  });
  group.add(wUrnL.group, wUrnR.group);

  return {
    group,
    doorFocus: V3(0, 2.35, 0.5),
    windowFocus: V3(wx, 2.4, 0.2),
    updateDoorway(p, time, sway) {
      doorwayMain.update(p, time, sway);
      cascade.update(p, time, sway);
      urnInstallL.update(p, time, sway);
      urnInstallR.update(p, time, sway);
    },
    updateWindow(p, time, sway) {
      windowMain.update(p, time, sway);
      windowTrail.update(p, time, sway);
      wUrnL.update(p, time, sway);
      wUrnR.update(p, time, sway);
    },
  };
}
