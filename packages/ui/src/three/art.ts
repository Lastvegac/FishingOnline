import * as THREE from 'three';
import {
  createRenderer,
  disposeObject,
  prefersReducedMotion,
  tokenColor,
  watchVisibility,
} from './core';
import { buildEquipment, buildFish, fishSpecies } from './models';

export type ArtSubject = {
  type: 'fish' | 'equipment';
  id: string;
  lengthCm?: number;
};

const measuredScale = (subject: ArtSubject) =>
  subject.lengthCm
    ? THREE.MathUtils.clamp(subject.lengthCm / 60, 0.35, 1.6)
    : 1;

function framingSize(subject: ArtSubject, pivot: THREE.Group) {
  if (subject.type !== 'fish') return undefined;
  const size = new THREE.Box3()
    .setFromObject(pivot)
    .getSize(new THREE.Vector3());
  // Use a constant camera for measured catches of the same species. Fitting
  // each scaled box would cancel the visible difference between small/large fish.
  return subject.lengthCm
    ? size.multiplyScalar(1.6 / measuredScale(subject))
    : size;
}

const VIEW = {
  fish: { width: 640, height: 320, yaw: -0.35, pitch: 0.12 },
  equipment: { width: 400, height: 260, yaw: -0.35, pitch: 0.28 },
} as const;

function buildSubject(subject: ArtSubject, element?: Element) {
  const model =
    subject.type === 'fish'
      ? buildFish(subject.id, element)
      : buildEquipment(subject.id, element);
  const pivot = new THREE.Group();
  pivot.add(model);
  // Center on the bounding box so every species/item frames the same way.
  const box = new THREE.Box3().setFromObject(model);
  model.position.sub(box.getCenter(new THREE.Vector3()));
  if (subject.type === 'fish' && subject.lengthCm) {
    const scale = measuredScale(subject);
    pivot.scale.setScalar(scale);
    // Slightly fuller bodies for larger adults, while preserving species silhouette.
    model.scale.y = 0.9 + Math.min(1, scale) * 0.1;
  }
  return {
    pivot,
    model,
    radius:
      (box.getSize(new THREE.Vector3()).length() / 2) *
      (subject.lengthCm ? 1.5 : 1),
  };
}

function stage(element?: Element) {
  const scene = new THREE.Scene();
  scene.add(
    new THREE.HemisphereLight(
      tokenColor('--color-scene-sky-top', element),
      tokenColor('--color-scene-water-bottom', element),
      1.6,
    ),
  );
  const key = new THREE.DirectionalLight(
    tokenColor('--color-scene-light', element),
    2.4,
  );
  key.position.set(-3, 5, 6);
  const rim = new THREE.DirectionalLight(
    tokenColor('--color-scene-sky-bottom', element),
    1.2,
  );
  rim.position.set(4, 2, -5);
  scene.add(key, rim);
  return scene;
}

function frame(
  camera: THREE.PerspectiveCamera,
  radius: number,
  pitch: number,
  fishSize?: THREE.Vector3,
) {
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const fitHeight = radius / Math.sin(fov / 2);
  const fitWidth =
    radius / Math.sin(Math.atan(Math.tan(fov / 2) * camera.aspect));
  // A fish is much wider than it is tall: fitting a bounding sphere leaves it
  // tiny in a landscape card. Fit its projected dimensions with breathing room.
  const distance = fishSize
    ? Math.max(
        fishSize.x / (2 * Math.tan(fov / 2) * camera.aspect),
        (fishSize.y * Math.cos(pitch) + fishSize.z * Math.sin(pitch)) /
          (2 * Math.tan(fov / 2)),
      ) *
        1.22 +
      (fishSize.z * Math.cos(pitch) + fishSize.y * Math.sin(pitch)) / 2
    : Math.max(fitHeight, fitWidth) * 0.92;
  camera.position.set(
    0,
    Math.sin(pitch) * distance,
    Math.cos(pitch) * distance,
  );
  camera.lookAt(0, 0, 0);
}

function shadowDisc(radius: number, element?: Element) {
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 40),
    new THREE.MeshBasicMaterial({
      color: tokenColor('--color-scene-outline', element),
      transparent: true,
      opacity: 0.07,
      depthWrite: false,
    }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.scale.set(1, 0.32, 1);
  return disc;
}

let shared: THREE.WebGLRenderer | null | undefined;
const cache = new Map<string, string>();

/** Renders a 3D model once through a single shared WebGL context and caches the PNG. */
export function renderArtImage(subject: ArtSubject, element?: Element) {
  const id = subject.type === 'fish' ? fishSpecies(subject.id) : subject.id;
  const key = `${subject.type}:${id}:${subject.lengthCm ?? ''}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (shared === undefined)
    shared = createRenderer({ alpha: true, preserveDrawingBuffer: true });
  if (!shared) return null;
  const view = VIEW[subject.type];
  shared.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  shared.setSize(view.width, view.height, false);
  shared.setClearColor(0, 0);
  const scene = stage(element);
  const { pivot, radius } = buildSubject(subject, element);
  pivot.rotation.y = view.yaw;
  scene.add(pivot);
  const shadow = shadowDisc(radius * 0.8, element);
  shadow.position.y = -radius * 0.55;
  scene.add(shadow);
  const camera = new THREE.PerspectiveCamera(
    28,
    view.width / view.height,
    0.1,
    100,
  );
  frame(camera, radius, view.pitch, framingSize(subject, pivot));
  shared.render(scene, camera);
  const url = shared.domElement.toDataURL('image/png');
  disposeObject(scene);
  cache.set(key, url);
  if (cache.size > 150) cache.delete(cache.keys().next().value!);
  return url;
}

/** Live turntable for detail views (collection modal, catch result). */
export function mountArtViewer(
  host: HTMLElement,
  subject: ArtSubject,
  options: { reducedMotion?: boolean } = {},
) {
  const renderer = createRenderer({ alpha: true });
  if (!renderer) return null;
  let reducedMotion = options.reducedMotion ?? prefersReducedMotion();
  const canvas = renderer.domElement;
  canvas.className = 'fwo-art__canvas';
  host.appendChild(canvas);
  const scene = stage(host);
  const { pivot, radius } = buildSubject(subject, host);
  scene.add(pivot);
  const shadow = shadowDisc(radius * 0.8, host);
  shadow.position.y = -radius * 0.55;
  scene.add(shadow);
  const view = VIEW[subject.type];
  const fishSize = framingSize(subject, pivot);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  const resize = () => {
    const width = host.clientWidth || view.width;
    const height = host.clientHeight || view.height;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    frame(camera, radius, view.pitch, fishSize);
    camera.updateProjectionMatrix();
  };
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);

  // Drag to turn the model; it eases back into a slow idle sway.
  let drag: { x: number; yaw: number } | null = null;
  let userYaw = 0;
  const onDown = (event: PointerEvent) => {
    drag = { x: event.clientX, yaw: userYaw };
    canvas.setPointerCapture(event.pointerId);
  };
  const onMove = (event: PointerEvent) => {
    if (drag) userYaw = drag.yaw + (event.clientX - drag.x) * 0.012;
  };
  const onUp = () => {
    drag = null;
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  const clock = new THREE.Clock();
  const tail = pivot.getObjectByName('tail');
  const tick = () => {
    const t = reducedMotion ? 0 : clock.getElapsedTime();
    if (!drag) userYaw *= 0.94;
    pivot.rotation.y = view.yaw + Math.sin(t * 0.6) * 0.45 + userYaw;
    pivot.position.y = Math.sin(t * 1.4) * radius * 0.03;
    if (tail) tail.rotation.y = Math.sin(t * 5) * 0.25;
    renderer.render(scene, camera);
  };
  const stopVisibility = watchVisibility(host, (visible) =>
    renderer.setAnimationLoop(visible ? tick : null),
  );
  renderer.setAnimationLoop(tick);
  return {
    setReducedMotion(next: boolean) {
      reducedMotion = next;
    },
    destroy() {
      renderer.setAnimationLoop(null);
      stopVisibility();
      resizeObserver.disconnect();
      disposeObject(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
