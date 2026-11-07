import * as THREE from 'three';
import { readCanvasColor, type ColorToken } from '../colors';

/** Resolve a semantic CSS token into a WebGL color; no literal colors live in 3D code. */
export function tokenColor(token: ColorToken, element?: Element) {
  return new THREE.Color(readCanvasColor(token, element));
}

/** `var(--color-…)` strings from art-palette.ts become WebGL colors. */
export function cssVarColor(value: string, element?: Element) {
  const token = value.match(/var\((--color-[\w-]+)\)/)?.[1];
  if (!token) throw new Error(`Expected a design token reference: ${value}`);
  return tokenColor(token as ColorToken, element);
}

export function createRenderer(options: {
  alpha?: boolean;
  preserveDrawingBuffer?: boolean;
  shadows?: boolean;
}): THREE.WebGLRenderer | null {
  try {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: options.alpha ?? false,
      preserveDrawingBuffer: options.preserveDrawingBuffer ?? false,
      powerPreference: 'low-power',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    if (options.shadows) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    return renderer;
  } catch {
    // WebGL unavailable (old device, blocked GPU): callers keep the token-colored fallback.
    return null;
  }
}

export function disposeObject(root: THREE.Object3D) {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    mesh.geometry?.dispose();
    const material = mesh.material as
      THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(material)) material.forEach((m) => m.dispose());
    else material?.dispose();
  });
}

/** Capsule spanning two points — the building block for limbs, rods and reeds. */
export function limb(
  from: THREE.Vector3,
  to: THREE.Vector3,
  radius: number,
  material: THREE.Material,
  radialSegments = 10,
) {
  const direction = new THREE.Vector3().subVectors(to, from);
  const length = direction.length();
  const mesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(
      radius,
      Math.max(length, 0.001),
      4,
      radialSegments,
    ),
    material,
  );
  mesh.position.copy(from).addScaledVector(direction, 0.5);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  );
  mesh.castShadow = true;
  return mesh;
}

/** Tapered cylinder between two points (rods, trunks). */
export function taper(
  from: THREE.Vector3,
  to: THREE.Vector3,
  radiusFrom: number,
  radiusTo: number,
  material: THREE.Material,
) {
  const direction = new THREE.Vector3().subVectors(to, from);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTo, radiusFrom, direction.length(), 10),
    material,
  );
  mesh.position.copy(from).addScaledVector(direction, 0.5);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  );
  mesh.castShadow = true;
  return mesh;
}

/** Deterministic layout so scenes look identical between visits and screenshots. */
export function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

/** Pause rendering when the canvas is off-screen or the tab is hidden. */
export function watchVisibility(
  element: Element,
  onChange: (visible: boolean) => void,
) {
  let onScreen = true;
  const emit = () => onChange(onScreen && !document.hidden);
  const observer =
    'IntersectionObserver' in window
      ? new IntersectionObserver((entries) => {
          onScreen = entries.some((entry) => entry.isIntersecting);
          emit();
        })
      : null;
  observer?.observe(element);
  document.addEventListener('visibilitychange', emit);
  return () => {
    observer?.disconnect();
    document.removeEventListener('visibilitychange', emit);
  };
}
