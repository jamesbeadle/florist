// Drifting petals: a cloud of soft sprites that falls slowly around whatever
// the camera is looking at. Intensity fades them in as the flowers appear.

import * as THREE from 'three';
import { makePetalSpriteTexture } from './geometry.js';

export function buildPetals({ count, area = { x: 7, y: 5, z: 4 } }) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const vel = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  const palette = ['#fbf6ee', '#ffffff', '#f6eddc', '#f1e2c6', '#ffffff'].map((c) => new THREE.Color(c));

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * area.x;
    positions[i * 3 + 1] = Math.random() * area.y;
    positions[i * 3 + 2] = (Math.random() - 0.5) * area.z;
    vel[i * 3] = (Math.random() - 0.5) * 0.15;
    vel[i * 3 + 1] = -(0.12 + Math.random() * 0.22);
    vel[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
    phase[i] = Math.random() * Math.PI * 2;
    const c = palette[Math.floor(Math.random() * palette.length)];
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.075,
    map: makePetalSpriteTexture(),
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;

  const group = new THREE.Group();
  group.add(points);

  let intensity = 0;

  return {
    group,
    setIntensity(v) {
      intensity = v;
    },
    update(dt, time) {
      mat.opacity += (intensity * 0.7 - mat.opacity) * Math.min(1, dt * 2);
      if (mat.opacity < 0.01) return;
      const p = geo.attributes.position.array;
      for (let i = 0; i < count; i++) {
        const k = i * 3;
        p[k] += (vel[k] + Math.sin(time * 0.8 + phase[i]) * 0.12) * dt;
        p[k + 1] += vel[k + 1] * dt;
        p[k + 2] += (vel[k + 2] + Math.cos(time * 0.6 + phase[i]) * 0.08) * dt;
        if (p[k + 1] < -0.2) {
          p[k] = (Math.random() - 0.5) * area.x;
          p[k + 1] = area.y;
          p[k + 2] = (Math.random() - 0.5) * area.z;
        }
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}
