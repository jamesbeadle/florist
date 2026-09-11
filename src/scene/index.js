// The director: renderer, light, environment, the facade, drifting petals,
// and a camera that moves along the building as the page scrolls.
//
// Public API (used by main.js):
//   const scene = initScene(canvas)
//   scene.setProgress({ arch, travel, window, outro })   // each 0..1
//   scene.setPointer(x, y)                                // -1..1, desktop parallax
//   scene.resize()

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildFacade } from './facade.js';
import { buildPetals } from './petals.js';
import { makeMaterials, makeSpecies, smoothstep } from './flora.js';

const IVORY = '#f7f3ec';

export function pickQuality() {
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  const lowMem = navigator.deviceMemory && navigator.deviceMemory <= 4;
  // ?quality=mobile|desktop and ?shadows=0 let you test either tier on any device
  const params = new URLSearchParams(location.search);
  const forced = params.get('quality');
  const mobile = forced ? forced === 'mobile' : small || coarse || lowMem;
  const q = mobile
    ? {
        mobile: true,
        shadows: false,
        dpr: Math.min(window.devicePixelRatio || 1, 1.6),
        doorFlowers: 140,
        doorFoliage: 80,
        doorTrail: 22,
        urnFlowers: 24,
        urnFoliage: 14,
        windowFlowers: 90,
        windowFoliage: 55,
        windowTrail: 16,
        petals: 80,
      }
    : {
        mobile: false,
        shadows: true,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
        doorFlowers: 260,
        doorFoliage: 150,
        doorTrail: 40,
        urnFlowers: 42,
        urnFoliage: 24,
        windowFlowers: 170,
        windowFoliage: 100,
        windowTrail: 30,
        petals: 220,
      };
  if (params.get('shadows') === '0') q.shadows = false;
  if (params.get('shadows') === '1') q.shadows = true;
  return q;
}

export async function initScene(canvas, initialProgress = {}) {
  const quality = pickQuality();
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const shadows = quality.shadows;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(quality.dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.82;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  if (shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(IVORY);
  scene.fog = new THREE.Fog(IVORY, 13, 27);

  const params = new URLSearchParams(location.search);
  const debug = params.get('debug') === '1';
  const t0 = performance.now();
  const mark = (label) => debug && console.log(`[scene] ${label}: ${(performance.now() - t0).toFixed(0)}ms`);

  // soft studio-style environment for the door gloss, brass and petal sheen
  if (params.get('env') !== '0') {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
  }
  mark('environment');

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);

  // --- light: high, warm, from front-left; cool fill from the right ---
  scene.add(new THREE.HemisphereLight('#fff9f2', '#bfb3a2', 0.32));
  const sun = new THREE.DirectionalLight('#fff1de', 2.0);
  sun.position.set(-5, 9, 7);
  scene.add(sun);
  scene.add(sun.target);
  if (shadows) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 40;
    sun.shadow.camera.left = -7;
    sun.shadow.camera.right = 7;
    sun.shadow.camera.top = 7;
    sun.shadow.camera.bottom = -4;
    sun.shadow.bias = -0.00035;
    sun.shadow.normalBias = 0.03;
    sun.shadow.radius = 3;
  }
  const fill = new THREE.DirectionalLight('#e9eef5', 0.35);
  fill.position.set(6, 4, 5);
  scene.add(fill);


  // --- flora & the building ---
  const species = makeSpecies();
  const materials = makeMaterials(0.4);
  mark('species');
  const facade = buildFacade({ species, materials, quality, shadows });
  scene.add(facade.group);
  mark('facade');

  const petals = buildPetals({ count: reduceMotion ? 1 : quality.petals });
  scene.add(petals.group);

  // --- camera choreography (focus point + offset from it) ---
  const df = facade.doorFocus;
  const wf = facade.windowFocus;
  const V = {
    door0: { focus: df.clone(), offset: new THREE.Vector3(0.4, -0.55, 9.3) },
    door1: { focus: df.clone().add(new THREE.Vector3(0.1, 0.35, 0)), offset: new THREE.Vector3(1.4, -0.3, 7.6) },
    win0: { focus: wf.clone(), offset: new THREE.Vector3(0.9, -0.45, 7.6) },
    win1: { focus: wf.clone().add(new THREE.Vector3(-0.3, -0.35, 0)), offset: new THREE.Vector3(-0.7, -0.35, 5.9) },
    outro: { focus: new THREE.Vector3((df.x + wf.x) / 2 + 0.3, 2.9, 0.3), offset: new THREE.Vector3(0.2, 0.9, 13.5) },
  };

  const progress = { arch: 0, travel: 0, window: 0, outro: 0, ...initialProgress };
  // ?view=cx,cy,cz,lx,ly,lz renders a fixed, fully bloomed view (used to make the placeholder images)
  const fixedView = params.get('view')?.split(',').map(Number);
  if (fixedView?.length === 6) Object.assign(progress, { arch: 1, travel: 1, window: 1, outro: 0 });
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };

  const focus = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const goalFocus = new THREE.Vector3();
  const goalOffset = new THREE.Vector3();
  const tmpF = new THREE.Vector3();
  const tmpO = new THREE.Vector3();

  function lerpView(a, b, t, outF, outO) {
    outF.lerpVectors(a.focus, b.focus, t);
    outO.lerpVectors(a.offset, b.offset, t);
  }

  let tvCache = 0;
  function computeGoal() {
    const ease = (x) => smoothstep(0, 1, x);
    lerpView(V.door0, V.door1, ease(progress.arch), goalFocus, goalOffset);
    const tv = ease(progress.travel);
    tvCache = tv;
    tmpF.copy(goalFocus);
    tmpO.copy(goalOffset);
    lerpView({ focus: tmpF, offset: tmpO }, V.win0, tv, goalFocus, goalOffset);
    // ease out from the wall a little mid-journey so the facade slides past
    goalOffset.z += Math.sin(tv * Math.PI) * 1.4;
    goalOffset.y += Math.sin(tv * Math.PI) * 0.5;
    const wv = ease(progress.window);
    tmpF.copy(goalFocus);
    tmpO.copy(goalOffset);
    lerpView({ focus: tmpF, offset: tmpO }, V.win1, wv, goalFocus, goalOffset);
    const ov = ease(progress.outro);
    tmpF.copy(goalFocus);
    tmpO.copy(goalOffset);
    lerpView({ focus: tmpF, offset: tmpO }, V.outro, ov, goalFocus, goalOffset);

    const aspect = camera.aspect;
    if (aspect < 1) {
      // portrait: pull back so the doorcase fits, and look lower so it sits above the hero text
      const kDoor = Math.pow(1 / aspect, 0.85);
      const kWin = Math.min(2.3, Math.pow(1 / aspect, 0.9));
      goalOffset.multiplyScalar(kDoor + (kWin - kDoor) * tv);
      const settle = 1 - 0.5 * smoothstep(0.75, 1, progress.arch);
      goalFocus.y -= 2.4 * (1 - tv) * settle + 0.5 * tv;
    } else if (aspect < 1.3) {
      goalOffset.multiplyScalar(1.15);
      goalFocus.y -= 0.3 * (1 - tv);
    } else {
      // wide screens: keep the doorway to the right of the hero text
      goalFocus.x -= 2.7 * (1 - tv);
    }
  }

  let first = true;
  let lastRenderKey = '';
  const timer = new THREE.Timer();
  let time = 0;
  const petalOffset = new THREE.Vector3(0, -1.6, 0.6);

  function frame() {
    requestAnimationFrame(frame);
    timer.update();
    const dt = Math.min(0.05, timer.getDelta());
    time += dt;

    computeGoal();
    if (first) {
      focus.copy(goalFocus);
      offset.copy(goalOffset);
      first = false;
    } else {
      const k = 1 - Math.exp(-dt * 5.5);
      focus.lerp(goalFocus, k);
      offset.lerp(goalOffset, k);
    }
    const pk = 1 - Math.exp(-dt * 3);
    pointer.sx += (pointer.x - pointer.sx) * pk;
    pointer.sy += (pointer.y - pointer.sy) * pk;

    camera.position.set(focus.x + offset.x + pointer.sx * 0.4, focus.y + offset.y + pointer.sy * 0.22, focus.z + offset.z);
    if (!reduceMotion) {
      camera.position.x += Math.sin(time * 0.22) * 0.05;
      camera.position.y += Math.sin(time * 0.29) * 0.03;
    }
    camera.lookAt(focus);
    if (fixedView) {
      camera.position.set(fixedView[0], fixedView[1], fixedView[2]);
      camera.lookAt(fixedView[3], fixedView[4], fixedView[5]);
    }

    // shadow camera follows whatever we're looking at
    const sx = tvCache < 0.5 ? df.x : wf.x;
    sun.target.position.set(sx, 2, 0.5);
    sun.position.set(sx - 5, 9, 7.5);

    const sway = reduceMotion ? 0 : 1;
    facade.updateDoorway(progress.arch, time, sway);
    facade.updateWindow(progress.window, time, sway);

    petals.group.position.copy(focus).add(petalOffset);
    const doorPetals = smoothstep(0.35, 0.85, progress.arch) * (1 - smoothstep(0, 0.5, progress.travel));
    const winPetals = smoothstep(0.25, 0.75, progress.window);
    petals.setIntensity(reduceMotion ? 0 : Math.max(doorPetals, winPetals));
    petals.update(dt, time);

    if (reduceMotion) {
      const key = `${progress.arch.toFixed(3)}|${progress.travel.toFixed(3)}|${progress.window.toFixed(3)}|${progress.outro.toFixed(3)}|${renderer.domElement.width}x${renderer.domElement.height}`;
      if (key === lastRenderKey && focus.distanceToSquared(goalFocus) < 1e-6) return;
      lastRenderKey = key;
    }
    renderer.render(scene, camera);
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  resize();

  // Warm up: compile every shader off the critical path, then draw one frame
  // at the current scroll position so the canvas can fade in already correct.
  computeGoal();
  focus.copy(goalFocus);
  offset.copy(goalOffset);
  first = false;
  const sway0 = reduceMotion ? 0 : 1;
  facade.updateDoorway(progress.arch, 0, sway0);
  facade.updateWindow(progress.window, 0, sway0);
  camera.position.set(focus.x + offset.x, focus.y + offset.y, focus.z + offset.z);
  camera.lookAt(focus);
  if (fixedView) {
    camera.position.set(fixedView[0], fixedView[1], fixedView[2]);
    camera.lookAt(fixedView[3], fixedView[4], fixedView[5]);
    facade.updateDoorway(1, 0, 0);
    facade.updateWindow(1, 0, 0);
  }
  try {
    if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
    else renderer.compile(scene, camera);
  } catch (err) {
    console.warn('shader warm-up skipped', err);
  }
  mark('compiled');
  renderer.render(scene, camera);
  mark('first frame');
  timer.update();
  requestAnimationFrame(frame);
  if (debug) {
    let frames = 0;
    const fpsT0 = performance.now();
    const tick = () => {
      frames++;
      if (frames === 10) console.log(`[scene] first 10 frames: ${(performance.now() - fpsT0).toFixed(0)}ms; shadows=${renderer.shadowMap.enabled}/${sun.castShadow} map=${!!sun.shadow.map} target=${sun.target.position.toArray().map((v) => v.toFixed(1))} pos=${sun.position.toArray().map((v) => v.toFixed(1))}`);
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  return {
    quality,
    setProgress(p) {
      Object.assign(progress, p);
    },
    setPointer(x, y) {
      pointer.x = x;
      pointer.y = y;
    },
    resize,
  };
}
