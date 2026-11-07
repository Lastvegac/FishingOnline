import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  createRenderer,
  tokenColor,
  disposeObject,
  watchVisibility,
  seeded,
} from './core';
import { buildCharacter, type CharacterVisual } from './character';
import type { CharacterAnimation } from '@fwo/contracts';

export function mountCharacterStudio(
  host: HTMLElement,
  visual: CharacterVisual,
  reducedMotion = false,
) {
  const renderer = createRenderer({
    shadows: true,
    preserveDrawingBuffer: true,
  });
  if (!renderer) return null;
  const canvas = renderer.domElement;
  canvas.className = 'fwo-art__canvas';
  host.appendChild(canvas);
  const scene = new THREE.Scene();
  scene.background = tokenColor('--color-studio-wall', host);
  scene.fog = new THREE.Fog(scene.background, 8, 26);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 60);
  camera.position.set(2.7, 1.7, 3.9);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.95, 0);
  controls.minDistance = 1.2;
  controls.maxDistance = 6;
  controls.maxPolarAngle = Math.PI * 0.82;
  controls.enablePan = false;
  controls.enableDamping = true;
  const hemi = new THREE.HemisphereLight(
    tokenColor('--color-scene-light', host),
    tokenColor('--color-studio-floor', host),
    1.6,
  );
  scene.add(hemi);
  const key = new THREE.DirectionalLight(
    tokenColor('--color-scene-light', host),
    3,
  );
  key.position.set(3, 5, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -3;
  key.shadow.camera.right = 3;
  key.shadow.camera.top = 3;
  key.shadow.camera.bottom = -3;
  key.shadow.normalBias = 0.015;
  scene.add(key);
  const rim = new THREE.DirectionalLight(
    tokenColor('--color-character-gold', host),
    1.3,
  );
  rim.position.set(-3, 2, -2);
  scene.add(rim);
  const env = new THREE.Group();
  scene.add(env);
  const material = (token: `--color-${string}`, roughness = 0.85) =>
    new THREE.MeshStandardMaterial({
      color: tokenColor(token, host),
      roughness,
    });
  const stone = material('--color-studio-floor'),
    wood = material('--color-scene-wood-dark'),
    roof = material('--color-character-ink'),
    water = material('--color-studio-water', 0.23),
    bamboo = material('--color-studio-bamboo');
  const box = (
    w: number,
    h: number,
    d: number,
    m: THREE.Material,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    env.add(mesh);
    return mesh;
  };
  box(18, 0.1, 16, stone, 0, -0.12, 0);
  const plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(1.12, 1.17, 0.11, 64),
    stone,
  );
  plinth.position.y = -0.045;
  plinth.receiveShadow = true;
  env.add(plinth);
  box(10, 0.015, 4, water, 0, -0.04, -5);
  // Pavilion: paired timber columns, curved tiled roof and hanging lanterns.
  for (const x of [-2.6, 2.6])
    for (const z of [-2.4, -4.4]) box(0.13, 2.8, 0.13, wood, x, 1.3, z);
  for (let i = 0; i < 5; i++) {
    const r = box(
      6.6 - i * 0.35,
      0.12,
      3.6 - i * 0.35,
      roof,
      0,
      2.65 + i * 0.16,
      -3.4,
    );
    r.rotation.z = 0;
  }
  box(5.5, 0.18, 0.18, wood, 0, 2.5, -2.4);
  const lanternMat = material('--color-studio-lantern');
  for (const x of [-2.1, 2.1]) {
    const lantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.19, 20, 16),
      lanternMat,
    );
    lantern.scale.y = 1.35;
    lantern.position.set(x, 2.12, -2.4);
    env.add(lantern);
    for (const y of [1.86, 2.37]) {
      const ring = new THREE.Mesh(
        new THREE.CylinderGeometry(0.095, 0.095, 0.04, 16),
        wood,
      );
      ring.position.set(x, y, -2.4);
      env.add(ring);
    }
    const light = new THREE.PointLight(
      tokenColor('--color-character-gold', host),
      1.7,
      4,
    );
    light.position.copy(lantern.position);
    scene.add(light);
  }
  const random = seeded(42);
  for (let i = 0; i < 18; i++) {
    const x = (i % 2 ? 1 : -1) * (3.4 + random() * 2),
      z = -1 - random() * 6,
      h = 2 + random() * 2;
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.035, h, 8),
      bamboo,
    );
    stem.position.set(x, h / 2 - 0.1, z);
    env.add(stem);
    for (let j = 0; j < 4; j++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), bamboo);
      leaf.scale.set(0.22, 0.018, 0.055);
      leaf.position.set(x + (j % 2 ? 0.13 : -0.13), h * (0.45 + j * 0.12), z);
      leaf.rotation.z = (j % 2 ? 1 : -1) * 0.5;
      env.add(leaf);
    }
  }
  for (let i = 0; i < 7; i++) {
    const mountain = new THREE.Mesh(
      new THREE.ConeGeometry(2 + random() * 2, 3 + random() * 4, 12, 4),
      material('--color-scene-hill-far'),
    );
    mountain.position.set(-10 + i * 3, 1, -14 - random() * 3);
    mountain.scale.z = 0.5;
    env.add(mountain);
  }
  for (let i = 0; i < 12; i++) {
    const pad = new THREE.Mesh(
      new THREE.CircleGeometry(0.18 + random() * 0.1, 16),
      bamboo,
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(-4 + random() * 8, -0.02, -3.2 - random() * 3);
    env.add(pad);
    if (i % 3 === 0)
      for (let j = 0; j < 5; j++) {
        const petal = new THREE.Mesh(
          new THREE.SphereGeometry(0.06, 10, 8),
          material('--color-scene-lotus'),
        );
        petal.scale.set(0.6, 1.7, 0.5);
        petal.position.set(
          pad.position.x + Math.cos(j * 1.257) * 0.05,
          0.03,
          pad.position.z + Math.sin(j * 1.257) * 0.05,
        );
        petal.rotation.z = Math.sin(j * 1.257) * 0.5;
        env.add(petal);
      }
  }
  let rig = buildCharacter(visual, host);
  scene.add(rig.group);
  let animation: CharacterAnimation = 'IDLE',
    reduced = reducedMotion,
    dirty = true;
  const resize = () => {
    const w = host.clientWidth || 600,
      h = host.clientHeight || 600;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dirty = true;
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  const clock = new THREE.Clock();
  const tick = () => {
    controls.update();
    if (reduced && !dirty) return;
    rig.animate(reduced ? 0 : clock.getElapsedTime(), animation, reduced);
    renderer.render(scene, camera);
    dirty = false;
  };
  controls.addEventListener('change', () => {
    dirty = true;
  });
  const visibility = watchVisibility(host, (next) => {
    renderer.setAnimationLoop(next ? tick : null);
  });
  renderer.setAnimationLoop(tick);
  return {
    setVisual(next: CharacterVisual) {
      rig.destroy();
      rig = buildCharacter(next, host);
      scene.add(rig.group);
      dirty = true;
    },
    setAnimation(next: CharacterAnimation) {
      animation = next;
      dirty = true;
    },
    setReducedMotion(next: boolean) {
      reduced = next;
      dirty = true;
    },
    setNight(night: boolean) {
      scene.background = tokenColor(
        night ? '--color-studio-night' : '--color-studio-wall',
        host,
      );
      (scene.fog as THREE.Fog).color.copy(scene.background);
      key.intensity = night ? 0.7 : 3;
      hemi.intensity = night ? 0.55 : 1.6;
      dirty = true;
    },
    rotate(angle: number) {
      const offset = camera.position.clone().sub(controls.target);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      camera.position.copy(controls.target).add(offset);
      dirty = true;
    },
    zoom(factor: number) {
      camera.position
        .sub(controls.target)
        .multiplyScalar(factor)
        .clampLength(1.2, 6)
        .add(controls.target);
      dirty = true;
    },
    portrait() {
      camera.position.set(0.45, 1.65, 1.15);
      controls.target.set(0, 1.48, 0);
      dirty = true;
    },
    fullBody() {
      camera.position.set(2.7, 1.7, 3.9);
      controls.target.set(0, 0.95, 0);
      dirty = true;
    },
    capture() {
      dirty = true;
      rig.animate(clock.getElapsedTime(), animation, reduced);
      renderer.render(scene, camera);
      return canvas.toDataURL('image/png');
    },
    destroy() {
      renderer.setAnimationLoop(null);
      visibility();
      observer.disconnect();
      controls.dispose();
      rig.destroy();
      disposeObject(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
