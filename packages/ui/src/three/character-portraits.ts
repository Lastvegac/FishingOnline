import * as THREE from 'three';
import { buildCharacter, type CharacterVisual } from './character';
import { createRenderer, tokenColor, disposeObject } from './core';
let renderer: THREE.WebGLRenderer | null = null;
let idle: ReturnType<typeof setTimeout> | undefined;
const cache = new Map<string, string>();
let queue = Promise.resolve();
/** Grid portraits share one renderer. Images are always renders of the real rig. */
export function characterPortrait(
  visual: CharacterVisual,
  host: Element,
): Promise<string | null> {
  const key = JSON.stringify(visual),
    cached = cache.get(key);
  if (cached) return Promise.resolve(cached);
  const result = queue.then(
    () =>
      new Promise<string | null>((resolve) => {
        requestAnimationFrame(() => {
          if (idle) clearTimeout(idle);
          renderer ??= createRenderer({ preserveDrawingBuffer: true });
          if (!renderer) {
            resolve(null);
            return;
          }
          renderer.setPixelRatio(1);
          renderer.setSize(240, 280, false);
          const scene = new THREE.Scene();
          scene.background = tokenColor('--color-studio-wall', host);
          scene.add(
            new THREE.HemisphereLight(
              tokenColor('--color-scene-light', host),
              tokenColor('--color-studio-floor', host),
              2,
            ),
          );
          const light = new THREE.DirectionalLight(
            tokenColor('--color-scene-light', host),
            3,
          );
          light.position.set(2, 4, 3);
          scene.add(light);
          const model = buildCharacter(visual, host);
          scene.add(model.group);
          model.animate(0, 'IDLE', true);
          const camera = new THREE.PerspectiveCamera(30, 240 / 280, 0.05, 20);
          camera.position.set(0.8, 1.2, 3.5);
          camera.lookAt(0, 0.92, 0);
          renderer.render(scene, camera);
          const src = renderer.domElement.toDataURL('image/png');
          cache.set(key, src);
          if (cache.size > 192) cache.delete(cache.keys().next().value!);
          model.destroy();
          disposeObject(scene);
          idle = setTimeout(() => {
            renderer?.dispose();
            renderer?.forceContextLoss();
            renderer = null;
          }, 30000);
          resolve(src);
        });
      }),
  );
  queue = result.then(() => {}).catch(() => {});
  return result;
}
