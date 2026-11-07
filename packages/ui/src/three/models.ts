import * as THREE from 'three';
import { fishArtPalette, defaultFishArtPalette } from '../art-palette';
import { cssVarColor, limb, smoothstep, taper, tokenColor } from './core';

const fishAliases: Record<string, string> = {
  carp: 'ca-chep',
  'grass-carp': 'ca-tram',
  tilapia: 'ca-ro-phi',
  snakehead: 'ca-loc',
  'walking-catfish': 'ca-tre',
  pangasius: 'ca-tra',
  'silver-carp': 'ca-me',
  'climbing-perch': 'ca-ro',
  'giant-gourami': 'ca-tai-tuong',
  'red-tilapia': 'ca-dieu-hong',
};
export const fishSpecies = (slug: string) => fishAliases[slug] ?? slug;

type FishShape = {
  length: number;
  height: number;
  width: number;
  pattern: 'plain' | 'bands' | 'spots' | 'scales' | 'silver';
  whiskers: boolean;
  spikyDorsal: boolean;
  longDorsal: boolean;
};

function shapeFor(species: string): FishShape {
  const base: FishShape = {
    length: 1.5,
    height: 0.62,
    width: 0.36,
    pattern: 'scales',
    whiskers: false,
    spikyDorsal: false,
    longDorsal: false,
  };
  switch (species) {
    case 'snakehead':
    case 'giant-snakehead':
    case 'ca-loc':
      return {
        ...base,
        length: 1.8,
        height: 0.44,
        width: 0.34,
        pattern: 'spots',
        longDorsal: true,
      };
    case 'ca-tram':
      return { ...base, length: 1.75, height: 0.47, width: 0.33 };
    case 'walking-catfish':
    case 'bagrid-catfish':
    case 'hemibagrus':
    case 'bagarius':
    case 'ca-tre':
      return {
        ...base,
        length: 1.8,
        height: 0.4,
        width: 0.33,
        pattern: 'plain',
        whiskers: true,
        longDorsal: true,
      };
    case 'pangasius':
    case 'ca-tra':
      return {
        ...base,
        length: 1.65,
        height: 0.52,
        width: 0.32,
        pattern: 'silver',
        whiskers: true,
      };
    case 'ca-me':
      return { ...base, pattern: 'silver' };
    case 'ca-ro':
      return {
        ...base,
        length: 1.35,
        height: 0.6,
        pattern: 'bands',
        spikyDorsal: true,
      };
    case 'ca-tai-tuong':
    case 'ca-ro-phi':
    case 'ca-dieu-hong':
      return {
        ...base,
        length: 1.38,
        height: 0.82,
        width: 0.32,
        pattern: species === 'ca-ro-phi' ? 'bands' : 'scales',
        spikyDorsal: true,
      };
    case 'barracuda':
    case 'spanish-mackerel':
      return {
        ...base,
        length: 2.15,
        height: 0.3,
        width: 0.23,
        pattern: 'silver',
      };
    case 'round-scad':
    case 'stream-minnow':
    case 'sillago':
      return {
        ...base,
        length: 1.6,
        height: 0.3,
        width: 0.2,
        pattern: 'silver',
      };
    case 'grouper':
    case 'giant-grouper':
    case 'barramundi':
      return {
        ...base,
        length: 1.8,
        height: 0.75,
        width: 0.48,
        pattern: 'spots',
        spikyDorsal: true,
      };
    case 'pompano':
    case 'spotted-scat':
    case 'giant-gourami':
      return {
        ...base,
        length: 1.2,
        height: 0.95,
        width: 0.25,
        pattern: species === 'spotted-scat' ? 'spots' : 'silver',
      };
    case 'featherback':
    case 'clown-featherback':
      return {
        ...base,
        length: 1.85,
        height: 0.72,
        width: 0.18,
        pattern: 'spots',
        longDorsal: true,
      };
    case 'river-goby':
    case 'mudskipper-goby':
    case 'stream-loach':
      return {
        ...base,
        length: 1.7,
        height: 0.28,
        width: 0.3,
        pattern: 'bands',
        longDorsal: true,
      };
    case 'mahseer':
    case 'spinibarbus':
    case 'hampala':
    case 'chub':
    case 'mullet':
      return {
        ...base,
        length: 1.8,
        height: 0.48,
        width: 0.32,
        pattern: 'silver',
      };
    case 'mangrove-snapper':
    case 'climbing-perch':
      return {
        ...base,
        length: 1.4,
        height: 0.65,
        width: 0.3,
        pattern: 'bands',
        spikyDorsal: true,
      };
    case 'snakeskin-gourami':
      return {
        ...base,
        length: 1.3,
        height: 0.75,
        width: 0.22,
        pattern: 'bands',
        longDorsal: true,
      };
    case 'giant-barb':
      return {
        ...base,
        length: 1.75,
        height: 0.85,
        width: 0.48,
        pattern: 'scales',
      };
    default:
      return base;
  }
}

function finShape(points: [number, number][]) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  shape.splineThru(points.slice(1).map(([x, y]) => new THREE.Vector2(x, y)));
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.035,
    bevelEnabled: true,
    bevelThickness: 0.009,
    bevelSize: 0.009,
    bevelSegments: 3,
    curveSegments: 8,
  });
  geometry.translate(0, 0, -0.0175);
  return geometry;
}

/**
 * Smooth, healthy fish with a pearl belly, continuous skin and rounded fins.
 * Species traits remain procedural; all colors resolve shared semantic tokens.
 */
export function buildFish(slug: string, element?: Element) {
  const species = fishSpecies(slug);
  const shape = shapeFor(species);
  const [darkRef, lightRef] = fishArtPalette[species] ?? defaultFishArtPalette;
  const dark = cssVarColor(darkRef, element);
  const light = cssVarColor(lightRef, element);
  const belly = tokenColor('--color-fish-belly', element);
  const { length: L, height: H, width: W } = shape;
  const thickness = (t: number) => 0.5 + 0.5 * smoothstep(0, 0.68, t);

  const body = new THREE.SphereGeometry(1, 80, 48);
  const position = body.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(position.count * 3);
  const color = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const t = (x + 1) / 2;
    const f = thickness(t);
    const px = x * L;
    // Slightly flatter belly and a tiny hump give a less "egg-like" silhouette.
    const py = y * H * f * (y < 0 ? 0.88 : 1) + (1 - Math.abs(x)) * 0.04;
    const pz = z * W * f;
    position.setXYZ(i, px, py, pz);
    let shade = smoothstep(-0.25, 0.95, y) * 0.68;
    // Soft natural markings, without the harsh blotches of the old mesh.
    const flank = smoothstep(-0.4, 0.05, y) * (1 - smoothstep(0.6, 0.95, y));
    if (shape.pattern === 'bands')
      shade += Math.pow((Math.cos(px * 9) + 1) / 2, 6) * flank * 0.16;
    if (shape.pattern === 'spots')
      shade += Math.pow((Math.sin(px * 6 + y * 5) + 1) / 2, 8) * flank * 0.08;
    color.copy(light).lerp(dark, shade);
    color.lerp(belly, (1 - smoothstep(-0.85, 0.12, y)) * 0.62);
    colors.set([color.r, color.g, color.b], i * 3);
  }
  body.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  body.computeVertexNormals();

  const silver = shape.pattern === 'silver';
  const skin = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    roughness: silver ? 0.28 : 0.34,
    metalness: silver ? 0.24 : 0.08,
    clearcoat: 0.55,
    clearcoatRoughness: 0.25,
  });
  const finMaterial = new THREE.MeshStandardMaterial({
    color: light.clone().lerp(dark, 0.48),
    roughness: 0.4,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const fish = new THREE.Group();
  fish.name = `fish:${species}`;
  const bodyMesh = new THREE.Mesh(body, skin);
  bodyMesh.castShadow = true;
  fish.add(bodyMesh);

  const surfaceTop = (px: number) => {
    const x = px / L;
    return H * thickness((x + 1) / 2) * Math.sqrt(Math.max(0, 1 - x * x));
  };

  const tail = new THREE.Mesh(
    finShape([
      [0.1, 0],
      [-0.22, 0.22],
      [-0.7, 0.6],
      [-0.82, 0.5],
      [-0.62, 0],
      [-0.82, -0.5],
      [-0.7, -0.6],
      [-0.22, -0.22],
    ]),
    finMaterial,
  );
  tail.position.x = -L * 0.9;
  tail.scale.setScalar(H / 0.62);
  tail.name = 'tail';
  fish.add(tail);
  // Delicate fin rays give the translucent tail structure without rough edges.
  const rayMaterial = new THREE.MeshStandardMaterial({
    color: light.clone().lerp(dark, 0.25),
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    roughness: 0.5,
  });
  for (let i = -3; i <= 3; i++) {
    const spread = i / 3;
    const ray = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.02, 0, 0.026),
      new THREE.Vector3(-0.34, spread * 0.2, 0.026),
      new THREE.Vector3(-0.6 - Math.abs(spread) * 0.14, spread * 0.49, 0.026),
    ]);
    tail.add(
      new THREE.Mesh(new THREE.TubeGeometry(ray, 16, 0.004, 4), rayMaterial),
    );
  }

  // Follow the curved back so the fin grows out of the body along its base.
  const dorsalPoints: [number, number][] = [];
  const dorsalStart = shape.longDorsal ? -0.78 : -0.62;
  const dorsalEnd = shape.longDorsal || shape.spikyDorsal ? 0.5 : 0.28;
  const finHeight =
    H * (shape.spikyDorsal ? 0.43 : shape.longDorsal ? 0.28 : 0.65);
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const x = L * THREE.MathUtils.lerp(dorsalStart, dorsalEnd, t);
    const crest = Math.pow(Math.sin(Math.PI * t), 0.75) * finHeight;
    dorsalPoints.push([x, surfaceTop(x) + crest - 0.025]);
  }
  for (let i = 16; i >= 0; i--) {
    const x = L * THREE.MathUtils.lerp(dorsalStart, dorsalEnd, i / 16);
    dorsalPoints.push([x, surfaceTop(x) - 0.065]);
  }
  const dorsal = new THREE.Mesh(finShape(dorsalPoints), finMaterial);
  fish.add(dorsal);

  const anal = new THREE.Mesh(
    finShape([
      [-0.32, 0],
      [-0.12, -0.32],
      [0.22, 0],
    ]),
    finMaterial,
  );
  anal.position.set(-0.35 * L, -surfaceTop(-0.35 * L) * 0.85 + 0.05, 0);
  fish.add(anal);

  for (const side of [-1, 1]) {
    const pectoral = new THREE.Mesh(
      finShape([
        [0, 0],
        [-0.38, 0.12],
        [-0.34, -0.14],
      ]),
      finMaterial,
    );
    const px = 0.42 * L;
    pectoral.position.set(px, -H * 0.25, side * W * thickness(0.71) * 0.82);
    pectoral.rotation.set(side * 0.6, side * -0.5, -0.3);
    fish.add(pectoral);
  }

  // Fine, skin-toned gill crease rather than a thick ring around the head.
  const gillMaterial = new THREE.MeshStandardMaterial({
    color: light.clone().lerp(dark, 0.42),
    roughness: 0.5,
  });
  for (const side of [-1, 1]) {
    const points = Array.from({ length: 17 }, (_, i) => {
      const t = i / 16;
      const x = 0.52 + Math.pow(t * 2 - 1, 2) * 0.1;
      const y = THREE.MathUtils.lerp(-0.62, 0.66, t);
      const f = thickness((x + 1) / 2);
      const z = W * f * Math.sqrt(Math.max(0, 1 - x * x - y * y));
      return new THREE.Vector3(
        x * L,
        y * H * f * (y < 0 ? 0.88 : 1) + (1 - Math.abs(x)) * 0.04,
        side * (z + 0.005),
      );
    });
    fish.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(points),
          32,
          0.008,
          6,
        ),
        gillMaterial,
      ),
    );
    const mouthPoints = Array.from({ length: 9 }, (_, i) => {
      const t = i / 8;
      const x = THREE.MathUtils.lerp(0.985, 0.89, t);
      const y = -0.08 - Math.sin(t * Math.PI) * 0.025;
      const f = thickness((x + 1) / 2);
      return new THREE.Vector3(
        x * L,
        y * H * f * 0.88 + (1 - x) * 0.04,
        side * (W * f * Math.sqrt(Math.max(0, 1 - x * x - y * y)) + 0.005),
      );
    });
    fish.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(mouthPoints),
          16,
          0.007,
          6,
        ),
        gillMaterial,
      ),
    );
  }

  const eyeWhite = new THREE.MeshStandardMaterial({
    color: tokenColor('--color-art-eye-light', element),
    roughness: 0.2,
  });
  const pupil = new THREE.MeshStandardMaterial({
    color: tokenColor('--color-art-eye-dark', element),
    roughness: 0.1,
    metalness: 0.2,
  });
  const eyeX = 0.76 * L;
  const eyeY = H * 0.18;
  const nx = eyeX / L;
  const f = thickness((nx + 1) / 2);
  const ny = eyeY / (H * f);
  const eyeZ = W * f * Math.sqrt(Math.max(0.02, 1 - nx * nx - ny * ny));
  const eyeRadius = Math.max(0.055, H * 0.105);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(eyeRadius, 24, 16),
      eyeWhite,
    );
    eye.scale.z = 0.5;
    eye.position.set(eyeX, eyeY, side * eyeZ);
    const iris = new THREE.Mesh(
      new THREE.SphereGeometry(eyeRadius * 0.72, 24, 16),
      pupil,
    );
    iris.position.set(
      eyeX + eyeRadius * 0.12,
      eyeY,
      side * (eyeZ + eyeRadius * 0.4),
    );
    iris.scale.z = 0.4;
    fish.add(eye, iris);
  }

  if (shape.whiskers) {
    const whisker = new THREE.MeshStandardMaterial({
      color: dark,
      roughness: 0.7,
    });
    for (const side of [-1, 1])
      for (const [drop, reach] of [
        [0.35, 0.55],
        [0.55, 0.35],
      ]) {
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(L * 0.95, -H * 0.12, side * W * 0.18),
          new THREE.Vector3(L * 1.05 + reach * 0.3, -H * 0.2, side * W * 0.45),
          new THREE.Vector3(
            L * 0.95 + reach * 0.35,
            -drop - H * 0.25,
            side * W * 0.7,
          ),
        ]);
        fish.add(
          new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.018, 5), whisker),
        );
      }
  }
  return fish;
}

export type EquipmentKind = 'ROD' | 'LINE' | 'HOOK' | 'BAIT';

export function buildEquipment(kind: string, element?: Element) {
  const group = new THREE.Group();
  const mat = (
    token: Parameters<typeof tokenColor>[0],
    metal = 0,
    rough = 0.45,
  ) =>
    new THREE.MeshStandardMaterial({
      color: tokenColor(token, element),
      metalness: metal,
      roughness: rough,
    });
  if (kind === 'BAIT') {
    const points = Array.from({ length: 9 }, (_, i) => {
      const t = i / 8;
      return new THREE.Vector3(
        -1.5 + t * 3,
        Math.sin(t * Math.PI * 2.2) * 0.45,
        Math.cos(t * Math.PI * 1.6) * 0.35,
      );
    });
    const curve = new THREE.CatmullRomCurve3(points);
    const worm = new THREE.TubeGeometry(curve, 120, 0.2, 14);
    // Taper the worm toward both ends and add segment rings.
    const p = worm.attributes.position as THREE.BufferAttribute;
    const center = new THREE.Vector3();
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      const u = Math.floor(i / 15) / 120;
      curve.getPointAt(Math.min(1, u), center);
      v.fromBufferAttribute(p, i).sub(center);
      const scale =
        (0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, u))) *
        (1 + 0.06 * Math.sin(u * 160));
      v.multiplyScalar(scale).add(center);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    worm.computeVertexNormals();
    group.add(new THREE.Mesh(worm, mat('--color-art-bait-dark', 0, 0.35)));
    const band = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points.slice(5, 7)),
      12,
      0.23,
      14,
    );
    group.add(new THREE.Mesh(band, mat('--color-art-bait-light', 0, 0.4)));
  } else if (kind === 'LINE') {
    const metal = mat('--color-art-metal-light', 0.6, 0.3);
    const flange = new THREE.CylinderGeometry(1.15, 1.15, 0.12, 48);
    for (const z of [-0.5, 0.5]) {
      const side = new THREE.Mesh(flange, metal);
      side.rotation.x = Math.PI / 2;
      side.position.z = z;
      group.add(side);
    }
    const wound = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.85, 0.9, 48),
      mat('--color-art-line', 0.1, 0.55),
    );
    wound.rotation.x = Math.PI / 2;
    group.add(wound);
    for (let i = 0; i < 9; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.86, 0.025, 6, 48),
        mat('--color-art-metal-dark', 0.3, 0.5),
      );
      ring.position.z = -0.4 + i * 0.1;
      group.add(ring);
    }
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 1.25, 24),
      mat('--color-art-metal-center', 0.5, 0.3),
    );
    hub.rotation.x = Math.PI / 2;
    group.add(hub);
    const loose = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.6, -0.6, 0),
      new THREE.Vector3(1.6, -1.1, 0.3),
      new THREE.Vector3(2.1, -0.4, 0.2),
    ]);
    group.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(loose, 30, 0.018, 5),
        mat('--color-art-metal-dark'),
      ),
    );
  } else if (kind === 'HOOK') {
    const metal = mat('--color-art-metal', 0.85, 0.25);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1.4, 0),
      new THREE.Vector3(0, 0.2, 0),
      new THREE.Vector3(-0.15, -0.55, 0),
      new THREE.Vector3(-0.7, -0.75, 0),
      new THREE.Vector3(-1.1, -0.35, 0),
      new THREE.Vector3(-1.05, 0.1, 0),
    ]);
    group.add(
      new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.08, 12), metal),
    );
    const eye = new THREE.Mesh(
      new THREE.TorusGeometry(0.2, 0.06, 10, 28),
      metal,
    );
    eye.position.y = 1.65;
    eye.rotation.y = Math.PI / 2;
    group.add(eye);
    const point = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.32, 10), metal);
    point.position.set(-1.05, 0.22, 0);
    group.add(point);
    const barb = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 8), metal);
    barb.position.set(-0.98, 0.0, 0);
    barb.rotation.z = -2.6;
    group.add(barb);
  } else {
    const blank = mat('--color-art-rod', 0.15, 0.35);
    const base = new THREE.Vector3(-1.8, -1, 0);
    const tip = new THREE.Vector3(1.9, 1.15, 0);
    group.add(taper(base, tip, 0.07, 0.022, blank));
    group.add(
      taper(
        base,
        base.clone().lerp(tip, 0.24),
        0.12,
        0.1,
        mat('--color-art-grip', 0, 0.85),
      ),
    );
    const reelAt = base.clone().lerp(tip, 0.3);
    const reel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.18, 32),
      mat('--color-art-reel', 0.4, 0.35),
    );
    reel.position.copy(reelAt).add(new THREE.Vector3(0.05, -0.3, 0));
    reel.rotation.x = Math.PI / 2;
    group.add(
      reel,
      limb(reelAt, reel.position, 0.035, mat('--color-art-metal-dark', 0.5)),
    );
    for (const u of [0.45, 0.62, 0.78, 0.92]) {
      const guide = new THREE.Mesh(
        new THREE.TorusGeometry(0.05, 0.012, 6, 16),
        mat('--color-art-metal-dark', 0.6),
      );
      guide.position
        .copy(base.clone().lerp(tip, u))
        .add(new THREE.Vector3(0.03, -0.06, 0));
      guide.rotation.y = Math.PI / 2;
      group.add(guide);
    }
    const line = new THREE.CatmullRomCurve3([
      tip,
      new THREE.Vector3(2.2, 0.4, 0),
      new THREE.Vector3(2.1, -0.6, 0),
    ]);
    group.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(line, 30, 0.01, 4),
        mat('--color-art-line'),
      ),
    );
  }
  group.name = `equipment:${kind}`;
  return group;
}
