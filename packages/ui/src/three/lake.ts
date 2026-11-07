import * as THREE from 'three';
import { getCanvasPalette } from '../colors';
import {
  createRenderer,
  disposeObject,
  limb,
  prefersReducedMotion,
  seeded,
  smoothstep,
  taper,
  watchVisibility,
} from './core';
import { buildFish } from './models';
import {
  biomeTheme,
  buildBiomeProps,
  type BiomeProps,
  type BiomeTheme,
} from './biomes';
import { localHour, nightAmount } from '../time-of-day';
import { applyFlowingWater, createWaterUniforms } from './water';
import { buildCharacter, CAST_RELEASE, type CharacterRig } from './character';
import type {
  CharacterDto,
  CharacterAnimation,
  LakeParticipantDto,
} from '@fwo/contracts';
import type {
  Environment,
  SimulatorView,
  WaterConditions,
} from '@fwo/contracts';

/** Visual-only fishing state; the server snapshot is mapped to this by the game page. */
export type LakeFishingView = {
  /** Line is in the water (casting, waiting, bite, fighting, reeling). */
  active: boolean;
  bite: boolean;
  fighting: boolean;
  /** 0–100 reel progress, pulls the bobber toward the dock. */
  progress: number;
  casting?: boolean;
  simulator?: SimulatorView;
  environment?: Environment;
  previewAim?: number;
  previewPower?: number;
  conditions?: WaterConditions;
};

export type LakeWorldOptions = {
  reducedMotion?: boolean;
  fishing?: LakeFishingView;
  onTap?: (aim?: number) => void;
  /** Lower detail for decorative illustrations. */
  decorative?: boolean;
  /** Terrain shown before any server conditions arrive (e.g. map cards). */
  environment?: Environment;
};

export type LakeWorld = {
  setCharacter(character: CharacterDto, animation: CharacterAnimation): void;
  setCharacters(characters: LakeParticipantDto[], localUserId: string): void;
  setFishing(view: LakeFishingView): void;
  setReducedMotion(reduced: boolean): void;
  destroy(): void;
};

type Palette = ReturnType<typeof getCanvasPalette>;

const BOBBER_REST = new THREE.Vector3(3.6, 0, 0.6);
const BOBBER_REELED = new THREE.Vector3(-1.6, 0, 2.4);

function material(
  palette: Palette,
  role: keyof Palette,
  extra: THREE.MeshStandardMaterialParameters = {},
) {
  const created = new THREE.MeshStandardMaterial({
    color: palette[role],
    roughness: 0.85,
    flatShading: true,
    ...extra,
  });
  // Lets each fishing spot recolour the shared scenery from its own palette.
  created.userData.role = role;
  return created;
}

function paintSky(
  geometry: THREE.BufferGeometry,
  top: THREE.Color,
  bottom: THREE.Color,
) {
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const attribute = geometry.attributes.color as THREE.BufferAttribute;
  const c = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    c.copy(bottom).lerp(top, smoothstep(-10, 120, position.getY(i)));
    attribute.setXYZ(i, c.r, c.g, c.b);
  }
  attribute.needsUpdate = true;
}

function buildSky(palette: Palette) {
  const geometry = new THREE.SphereGeometry(220, 32, 16);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  geometry.setAttribute(
    'color',
    new THREE.BufferAttribute(new Float32Array(position.count * 3), 3),
  );
  paintSky(
    geometry,
    new THREE.Color(palette.skyTop),
    new THREE.Color(palette.skyBottom),
  );
  return new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    }),
  );
}

function buildHills(palette: Palette, random: () => number) {
  const group = new THREE.Group();
  const layers: [keyof Palette, number, number, number][] = [
    ['hillFar', -70, 26, 16],
    ['hillMiddle', -52, 18, 11],
    ['hillNear', -38, 12, 7],
  ];
  for (const [role, z, radius, height] of layers) {
    const mat = material(palette, role);
    for (let x = -95; x <= 95; x += radius * 1.15) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(
          radius * (0.8 + random() * 0.5),
          height * (0.7 + random() * 0.6),
          6 + Math.floor(random() * 3),
          2,
        ),
        mat,
      );
      cone.position.set(x + random() * radius * 0.6, -0.5, z + random() * 6);
      cone.rotation.y = random() * Math.PI;
      cone.scale.z = 0.6;
      group.add(cone);
    }
  }
  return group;
}

function buildTreeLine(palette: Palette, random: () => number, count: number) {
  const group = new THREE.Group();
  const trunkGeometry = new THREE.CylinderGeometry(0.12, 0.18, 1, 6);
  const coneGeometry = new THREE.ConeGeometry(1, 1, 7);
  const trunks = new THREE.InstancedMesh(
    trunkGeometry,
    material(palette, 'woodDark'),
    count,
  );
  const dark = new THREE.InstancedMesh(
    coneGeometry,
    material(palette, 'tree'),
    count * 2,
  );
  const light = new THREE.InstancedMesh(
    coneGeometry,
    material(palette, 'treeLight'),
    count * 2,
  );
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  let darkIndex = 0;
  let lightIndex = 0;
  for (let i = 0; i < count; i++) {
    const x = -42 + (84 * i) / count + (random() - 0.5) * 1.5;
    const z = -11.5 - random() * 6;
    const h = 2.4 + random() * 2.4;
    const r = 0.8 + random() * 0.45;
    trunks.setMatrixAt(
      i,
      m.compose(p.set(x, 0.9, z), q.identity(), s.set(1, 1.2, 1)),
    );
    const target = random() > 0.45 ? dark : light;
    for (let tier = 0; tier < 2; tier++) {
      const tierH = h * (tier ? 0.55 : 0.75);
      const y = 1.3 + tier * h * 0.38 + tierH / 2;
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, random() * Math.PI);
      m.compose(
        p.set(x, y, z),
        q,
        s.set(r * (tier ? 0.72 : 1), tierH, r * (tier ? 0.72 : 1)),
      );
      target.setMatrixAt(target === dark ? darkIndex++ : lightIndex++, m);
    }
  }
  dark.count = darkIndex;
  light.count = lightIndex;
  for (const mesh of [trunks, dark, light]) {
    mesh.castShadow = true;
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  }
  const bank = new THREE.Mesh(
    new THREE.BoxGeometry(110, 1, 12),
    material(palette, 'grass'),
  );
  bank.position.set(0, -0.2, -16);
  bank.receiveShadow = true;
  group.add(bank);
  return group;
}

function buildWater(palette: Palette, decorative: boolean) {
  const geometry = new THREE.PlaneGeometry(
    120,
    44,
    decorative ? 60 : 96,
    decorative ? 22 : 36,
  );
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, 0, 3);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(position.count * 3);
  const far = new THREE.Color(palette.waterTop);
  const near = new THREE.Color(palette.waterBottom);
  const c = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    c.copy(far).lerp(near, smoothstep(-12, 12, position.getZ(i)));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const surface = new THREE.MeshStandardMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.86,
    roughness: 0.12,
    metalness: 0.1,
  });
  const uniforms = createWaterUniforms(palette.foam, palette.skyBottom);
  applyFlowingWater(surface, uniforms);
  const mesh = new THREE.Mesh(geometry, surface);
  mesh.receiveShadow = true;
  const base = Float32Array.from(position.array as Float32Array);
  let normalsAt = -1;
  return {
    mesh,
    uniforms,
    recolor(top: number, bottom: number) {
      far.set(top);
      near.set(bottom);
      for (let i = 0; i < position.count; i++) {
        c.copy(far).lerp(near, smoothstep(-12, 12, base[i * 3 + 2]));
        colors.set([c.r, c.g, c.b], i * 3);
      }
      (geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    },
    animate(t: number, wind = 2, current = 0.1, scale = 1) {
      const wave = (0.6 + wind * 0.12) * scale;
      // Surface current runs right-to-left across the view (downstream).
      uniforms.time.value = t;
      uniforms.flow.value.set(-current, current * 0.08);
      uniforms.chop.value = 0.7 + wind * 0.1 + scale * 0.25;
      for (let i = 0; i < position.count; i++) {
        const x = base[i * 3];
        const z = base[i * 3 + 2];
        position.setY(
          i,
          (Math.sin(x * 0.55 + t * (0.9 + current)) * 0.05 +
            Math.cos(z * 0.8 + t * 0.7 + x * 0.2) * 0.045) *
            wave,
        );
      }
      position.needsUpdate = true;
      if (t - normalsAt > 0.1) {
        geometry.computeVertexNormals();
        normalsAt = t;
      }
    },
  };
}

function buildShore(palette: Palette, random: () => number) {
  const group = new THREE.Group();
  const mound = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1, 2),
    material(palette, 'grassLight'),
  );
  mound.position.set(-14.5, -1.1, 4.5);
  mound.scale.set(7.5, 2.6, 6.5);
  mound.receiveShadow = true;
  const back = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1, 2),
    material(palette, 'grass'),
  );
  back.position.set(-15, -0.6, 0.5);
  back.scale.set(6.5, 2.4, 4.5);
  back.receiveShadow = true;
  group.add(mound, back);
  const blade = new THREE.ConeGeometry(0.06, 0.7, 4);
  const bladeMat = material(palette, 'grassDark');
  for (let i = 0; i < 46; i++) {
    const tuft = new THREE.Mesh(blade, bladeMat);
    const angle = random() * Math.PI * 0.9 - 0.3;
    const radius = 0.55 + random() * 0.4;
    tuft.position.set(
      -14.5 + Math.cos(angle) * 7.5 * radius,
      0.15 + random() * 0.4,
      4.5 + Math.sin(angle) * 5 * radius,
    );
    tuft.rotation.set((random() - 0.5) * 0.5, 0, (random() - 0.5) * 0.5);
    group.add(tuft);
  }
  // Big foreground tree framing the top-left corner.
  const trunk = taper(
    new THREE.Vector3(-15, 0, 1),
    new THREE.Vector3(-13.5, 6.8, 1.5),
    0.55,
    0.32,
    material(palette, 'woodDark'),
  );
  trunk.userData.shoreTree = true;
  group.add(trunk);
  const crowns: [number, number, number, number, keyof Palette][] = [
    [-13, 8, 1.5, 3.2, 'tree'],
    [-10.4, 7.2, 2.5, 2.4, 'treeLight'],
    [-14.8, 6.4, 3.2, 2.6, 'tree'],
    [-11.8, 9.2, 0, 2.2, 'treeLight'],
  ];
  for (const [x, y, z, r, role] of crowns) {
    const crown = new THREE.Mesh(
      new THREE.IcosahedronGeometry(r, 1),
      material(palette, role),
    );
    crown.position.set(x, y, z);
    crown.castShadow = true;
    crown.userData.shoreTree = true;
    group.add(crown);
  }
  for (let i = 0; i < 5; i++) {
    const stone = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.35 + random() * 0.3),
      material(palette, 'stone'),
    );
    stone.position.set(-8.8 + random() * 1.2, 0, 5.4 + random() * 2.5);
    stone.scale.y = 0.6;
    group.add(stone);
  }
  return group;
}

function buildDock(palette: Palette) {
  const group = new THREE.Group();
  const plank = new THREE.BoxGeometry(0.55, 0.14, 2.3);
  const mats = [material(palette, 'woodLight'), material(palette, 'wood')];
  for (let i = 0; i < 12; i++) {
    const board = new THREE.Mesh(plank, mats[i % 2]);
    board.position.set(-10.4 + i * 0.58, 0.82, 3);
    board.rotation.z = (i % 3) * 0.008;
    board.castShadow = board.receiveShadow = true;
    group.add(board);
  }
  const beamMat = material(palette, 'woodDark');
  for (const z of [1.95, 4.05]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(7, 0.22, 0.18), beamMat);
    beam.position.set(-7.2, 0.62, z);
    beam.castShadow = true;
    group.add(beam);
  }
  for (const x of [-9.6, -6.6, -3.9])
    for (const z of [1.95, 4.05]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.15, 2.6, 8),
        beamMat,
      );
      post.position.set(x, -0.35, z);
      post.castShadow = true;
      group.add(post);
    }
  return group;
}

function buildAngler(palette: Palette) {
  const group = new THREE.Group();
  const shirt = material(palette, 'shirt', {
    flatShading: false,
    roughness: 0.75,
  });
  const pants = material(palette, 'pants', { flatShading: false });
  const skin = material(palette, 'skin', {
    flatShading: false,
    roughness: 0.6,
  });
  const hatMat = material(palette, 'hat', { roughness: 0.9 });
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  // Seated on the dock edge, facing the water (+x).
  const hip = v(-4.55, 1.12, 3);
  const torso = new THREE.Group();
  torso.position.copy(hip);
  torso.add(limb(v(0, 0, 0), v(0.18, 0.75, 0), 0.34, shirt, 14));
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 20, 16), skin);
  head.position.set(0.26, 1.35, 0);
  head.castShadow = true;
  const brim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.62, 0.04, 28),
    hatMat,
  );
  brim.position.set(0.27, 1.52, 0);
  brim.rotation.z = -0.12;
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.36, 24), hatMat);
  crown.position.set(0.26, 1.7, 0);
  crown.rotation.z = -0.12;
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 0.05, 24),
    material(palette, 'hatShadow'),
  );
  band.position.set(0.265, 1.59, 0);
  band.rotation.z = -0.12;
  for (const mesh of [brim, crown]) mesh.castShadow = true;
  torso.add(head, brim, crown, band);
  // Arms reach forward to the rod grip.
  const hands = v(0.95, 0.55, 0);
  for (const side of [-1, 1]) {
    const shoulder = v(0.2, 0.95, side * 0.3);
    const elbow = v(0.55, 0.55, side * 0.34);
    torso.add(
      limb(shoulder, elbow, 0.1, shirt),
      limb(elbow, hands.clone().setZ(side * 0.08), 0.085, skin),
    );
  }
  group.add(torso);
  for (const side of [-1, 1]) {
    const knee = v(-3.75, 1.02, 3 + side * 0.2);
    const foot = v(-3.62, 0.25, 3 + side * 0.24);
    group.add(
      limb(hip.clone().setZ(3 + side * 0.17), knee, 0.15, pants),
      limb(knee, foot, 0.12, pants),
    );
    const shoe = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.12, 0.17),
      material(palette, 'outline'),
    );
    shoe.position.copy(foot).add(v(0.08, -0.08, 0));
    group.add(shoe);
  }
  // Rod pivots at the hands so bites and fights can bend it.
  const rod = new THREE.Group();
  rod.position.copy(hands).add(hip);
  const butt = v(-0.55, -0.35, 0);
  const tipLocal = v(3.9, 3.05, -0.5);
  rod.add(
    taper(
      butt,
      tipLocal,
      0.055,
      0.018,
      material(palette, 'rod', { flatShading: false, roughness: 0.4 }),
    ),
  );
  const reel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 0.12, 20),
    material(palette, 'reel', { flatShading: false, metalness: 0.4 }),
  );
  reel.position.set(-0.15, -0.28, 0);
  reel.rotation.x = Math.PI / 2;
  rod.add(reel);
  const tip = new THREE.Object3D();
  tip.position.copy(tipLocal);
  rod.add(tip);
  group.add(rod);
  return { group, torso, rod, tip };
}

function buildBobber(palette: Palette) {
  const group = new THREE.Group();
  const top = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    material(palette, 'bobber', { flatShading: false, roughness: 0.4 }),
  );
  const bottom = new THREE.Mesh(
    new THREE.SphereGeometry(
      0.16,
      18,
      10,
      0,
      Math.PI * 2,
      Math.PI / 2,
      Math.PI / 2,
    ),
    material(palette, 'bobberLight', { flatShading: false, roughness: 0.4 }),
  );
  const stick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.35, 8),
    material(palette, 'bobber'),
  );
  stick.position.y = 0.3;
  for (const mesh of [top, bottom, stick]) mesh.castShadow = true;
  group.add(top, bottom, stick);
  return group;
}

function buildLotus(palette: Palette, random: () => number) {
  const group = new THREE.Group();
  const padMat = material(palette, 'lotusPad', {
    side: THREE.DoubleSide,
    flatShading: false,
    roughness: 0.6,
  });
  const petalMat = material(palette, 'lotus', {
    flatShading: false,
    roughness: 0.5,
  });
  const heartMat = material(palette, 'lotusHeart', { flatShading: false });
  const spots: [number, number, number, boolean][] = [
    [6.8, 3.6, 0.75, true],
    [7.9, 4.6, 0.55, false],
    [5.8, 4.9, 0.5, false],
    [9.4, 2.4, 0.7, true],
    [-1.2, -3.5, 0.6, false],
    [0.2, -4.6, 0.75, true],
    [-2.4, -5.2, 0.45, false],
    [12, -2, 0.6, false],
  ];
  const items: THREE.Object3D[] = [];
  for (const [x, z, r, flower] of spots) {
    const lily = new THREE.Group();
    const pad = new THREE.Mesh(
      new THREE.CircleGeometry(r, 24, 0.3, Math.PI * 2 - 0.45),
      padMat,
    );
    pad.rotation.x = -Math.PI / 2;
    pad.receiveShadow = true;
    lily.add(pad);
    if (flower) {
      for (let ring = 0; ring < 2; ring++)
        for (let i = 0; i < 7; i++) {
          const petal = new THREE.Mesh(
            new THREE.SphereGeometry(0.16, 10, 8),
            petalMat,
          );
          petal.scale.set(0.55, 1.35, 0.4);
          const a = (i / 7) * Math.PI * 2 + ring * 0.45;
          const spread = ring ? 0.09 : 0.17;
          petal.position.set(
            Math.cos(a) * spread,
            0.18 + ring * 0.05,
            Math.sin(a) * spread,
          );
          petal.lookAt(Math.cos(a) * 2, 2.4, Math.sin(a) * 2);
          petal.castShadow = true;
          lily.add(petal);
        }
      const heart = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.06, 0.08, 12),
        heartMat,
      );
      heart.position.y = 0.2;
      lily.add(heart);
    }
    lily.position.set(x, 0.04, z);
    lily.rotation.y = random() * Math.PI * 2;
    lily.userData.phase = random() * Math.PI * 2;
    items.push(lily);
    group.add(lily);
  }
  return { group, items };
}

function buildReeds(palette: Palette, random: () => number) {
  const group = new THREE.Group();
  const stalkMat = material(palette, 'grassDark', { flatShading: false });
  const altMat = material(palette, 'grass', { flatShading: false });
  const headMat = material(palette, 'reed', {
    flatShading: false,
    roughness: 0.95,
  });
  const stalks: THREE.Object3D[] = [];
  for (let i = 0; i < 16; i++) {
    const reed = new THREE.Group();
    const h = 1.8 + random() * 1.6;
    const lean = (random() - 0.5) * 0.3;
    reed.add(
      taper(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(lean, h, 0),
        0.045,
        0.02,
        i % 2 ? stalkMat : altMat,
      ),
    );
    if (i % 3 === 0) {
      const head = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.07, 0.35, 4, 8),
        headMat,
      );
      head.position.set(lean * 0.85, h * 0.85, 0);
      reed.add(head);
    }
    reed.position.set(9.6 + random() * 2.6, -0.2, 5.8 + random() * 2.2);
    reed.userData.phase = random() * Math.PI * 2;
    stalks.push(reed);
    group.add(reed);
  }
  return { group, stalks };
}

function buildClouds(palette: Palette, random: () => number) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: palette.light,
    roughness: 1,
    flatShading: true,
    transparent: true,
    opacity: 0.92,
  });
  for (let c = 0; c < 5; c++) {
    const cloud = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const puff = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.4 + random(), 1),
        mat,
      );
      puff.position.set(i * 1.6 - 2.4, random() * 0.6, random() * 0.8);
      puff.scale.y = 0.6;
      cloud.add(puff);
    }
    cloud.position.set(
      -60 + c * 30 + random() * 10,
      18 + random() * 8,
      -75 - random() * 15,
    );
    group.add(cloud);
  }
  return group;
}

function buildBirds(palette: Palette) {
  const mat = new THREE.MeshBasicMaterial({
    color: palette.bird,
    side: THREE.DoubleSide,
  });
  return [0, 1].map((i) => {
    const bird = new THREE.Group();
    const wing = new THREE.BoxGeometry(0.7, 0.03, 0.18);
    const left = new THREE.Mesh(wing, mat);
    left.position.x = -0.32;
    const right = new THREE.Mesh(wing, mat);
    right.position.x = 0.32;
    const leftPivot = new THREE.Group();
    leftPivot.add(left);
    const rightPivot = new THREE.Group();
    rightPivot.add(right);
    bird.add(leftPivot, rightPivot);
    bird.userData = { leftPivot, rightPivot, offset: i * 1.7 };
    return bird;
  });
}

function buildUnderwaterFish() {
  return ['ca-chep', 'ca-ro-phi', 'ca-tram', 'ca-dieu-hong'].map((slug, i) => {
    const fish = buildFish(slug);
    fish.scale.setScalar(0.32 + (i % 2) * 0.08);
    fish.userData.phase = i * 1.6;
    return fish;
  });
}

/**
 * Hồ Sen as a real-time 3D world: lake with animated faceted water, lotus,
 * tree line, hills, dock and a seated angler whose rod/line/bobber follow
 * the fishing view. Returns null when WebGL is unavailable.
 */
export function createLakeWorld(
  parent: HTMLElement,
  options: LakeWorldOptions = {},
): LakeWorld | null {
  const decorative = options.decorative ?? false;
  const renderer = createRenderer({ shadows: true });
  if (!renderer) return null;
  const palette = getCanvasPalette(parent);
  const random = seeded(20261107);
  let reducedMotion = options.reducedMotion ?? prefersReducedMotion();
  let fishing: LakeFishingView = options.fishing ?? {
    active: false,
    bite: false,
    fighting: false,
    progress: 0,
  };

  const canvas = renderer.domElement;
  canvas.className = 'fwo-art__canvas';
  parent.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(palette.skyBottom, 34, 120);
  const sky = buildSky(palette);
  scene.add(sky);

  const ambient = new THREE.HemisphereLight(
    palette.skyTop,
    palette.grass,
    1.35,
  );
  scene.add(ambient);
  const sunLight = new THREE.DirectionalLight(palette.light, 2.3);
  sunLight.position.set(14, 18, 8);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(
    decorative ? 1024 : 2048,
    decorative ? 1024 : 2048,
  );
  Object.assign(sunLight.shadow.camera, {
    left: -20,
    right: 20,
    top: 16,
    bottom: -12,
    near: 1,
    far: 70,
  });
  sunLight.shadow.camera.updateProjectionMatrix();
  sunLight.shadow.bias = -0.0008;
  sunLight.shadow.normalBias = 0.03;
  scene.add(sunLight);

  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(5, 32, 16),
    new THREE.MeshBasicMaterial({ color: palette.sun, fog: false }),
  );
  sun.position.set(38, 30, -110);
  scene.add(sun);

  const hills = buildHills(palette, random);
  scene.add(hills);
  const treeLine = buildTreeLine(palette, random, decorative ? 44 : 60);
  scene.add(treeLine);
  const water = buildWater(palette, decorative);
  scene.add(water.mesh);
  const bed = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 44),
    new THREE.MeshStandardMaterial({ color: palette.fishShadow, roughness: 1 }),
  );
  bed.rotation.x = -Math.PI / 2;
  bed.position.set(0, -1.6, 3);
  scene.add(bed);
  const shore = buildShore(palette, random);
  scene.add(shore);
  scene.add(buildDock(palette));
  const angler = buildAngler(palette);
  scene.add(angler.group);
  let localRig: CharacterRig | null = null;
  let localVersion = '';
  let localAnimation: CharacterAnimation = 'IDLE';
  let localUserId = '';
  let characters: LakeParticipantDto[] = [];
  const characterPeers = new Map<
    string,
    { rig: CharacterRig; version: string; label: HTMLSpanElement }
  >();

  const lotus = buildLotus(palette, random);
  scene.add(lotus.group);
  const reeds = buildReeds(palette, random);
  scene.add(reeds.group);
  const clouds = buildClouds(palette, random);
  scene.add(clouds);
  const birds = buildBirds(palette);
  scene.add(...birds);
  const fishes = buildUnderwaterFish();
  scene.add(...fishes);
  const rainGeometry = new THREE.BufferGeometry();
  const rainPositions = new Float32Array(240 * 3);
  for (let i = 0; i < 240; i++) {
    rainPositions[i * 3] = random() * 36 - 12;
    rainPositions[i * 3 + 1] = random() * 12;
    rainPositions[i * 3 + 2] = random() * 20 - 10;
  }
  rainGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(rainPositions, 3),
  );
  const rainBase = Float32Array.from(rainPositions);
  const rain = new THREE.Points(
    rainGeometry,
    new THREE.PointsMaterial({
      color: palette.ripple,
      size: 0.045,
      transparent: true,
      opacity: 0.65,
    }),
  );
  scene.add(rain);

  // Night sky: stars and a moon that follow the player's real local hour.
  const starPositions = new Float32Array(320 * 3);
  for (let i = 0; i < 320; i++) {
    const a = random() * Math.PI * 2;
    const elevation = 0.12 + random() * 1.3;
    starPositions.set(
      [
        Math.cos(a) * Math.cos(elevation) * 200,
        Math.sin(elevation) * 200,
        -Math.abs(Math.sin(a) * Math.cos(elevation) * 200),
      ],
      i * 3,
    );
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(starPositions, 3),
  );
  const starMaterial = new THREE.PointsMaterial({
    color: palette.star,
    size: 1.1,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false,
  });
  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(3.4, 24, 12),
    new THREE.MeshBasicMaterial({ color: palette.moon, fog: false }),
  );
  scene.add(moon);

  // Terrain kit for the current fishing spot (colours, props, fog, waves).
  let theme: BiomeTheme = biomeTheme('FRESHWATER_LAKE', palette);
  let effective: Palette = palette;
  let props: BiomeProps | null = null;
  const cloudMaterials = new Set<THREE.MeshStandardMaterial>();
  clouds.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.isMesh)
      cloudMaterials.add(mesh.material as THREE.MeshStandardMaterial);
  });
  const applyBiome = (environment: Environment) => {
    theme = biomeTheme(environment, palette);
    effective = { ...palette, ...theme.colors };
    scene.traverse((node) => {
      const mesh = node as THREE.Mesh;
      const list = Array.isArray(mesh.material)
        ? mesh.material
        : mesh.material
          ? [mesh.material]
          : [];
      for (const item of list) {
        const role = item.userData.role as keyof Palette | undefined;
        if (role && 'color' in item)
          (item as THREE.MeshStandardMaterial).color.set(effective[role]);
      }
    });
    birds.forEach((bird) =>
      bird.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (mesh.isMesh)
          (mesh.material as THREE.MeshBasicMaterial).color.set(effective.bird);
      }),
    );
    water.recolor(effective.waterTop, effective.waterBottom);
    (bed.material as THREE.MeshStandardMaterial).color.set(
      environment === 'STREAM' ? effective.stone : effective.fishShadow,
    );
    bed.position.y = -theme.bedDepth;
    water.uniforms.foam.value = theme.foam;
    lotus.group.visible = theme.lotus;
    reeds.group.visible = theme.reeds;
    hills.visible = theme.hills;
    hills.scale.y = theme.hillHeight;
    treeLine.visible = theme.treeLine;
    treeLine.children.forEach((child) => {
      if (child instanceof THREE.InstancedMesh)
        child.scale.y = theme.treeHeight;
    });
    shore.traverse((node) => {
      if (node.userData.shoreTree) node.visible = theme.shoreTree;
    });
    if (props) {
      scene.remove(props.group);
      disposeObject(props.group);
    }
    props = buildBiomeProps(
      environment,
      palette,
      seeded(20261107 + environment.length),
      theme,
      decorative,
    );
    scene.add(props.group);
    skyKey = '';
  };

  // Lighting keyframes across the local day; values blend smoothly between them.
  type SkyKey = {
    top: keyof Palette;
    bottom: keyof Palette;
    light: keyof Palette;
    sun: number;
    ambient: number;
  };
  const NIGHT: SkyKey = {
    top: 'nightSkyTop',
    bottom: 'nightSkyBottom',
    light: 'moonLight',
    sun: 0.45,
    ambient: 0.32,
  };
  const keyframes: [number, SkyKey][] = [
    [0, NIGHT],
    [4.8, NIGHT],
    [
      5.9,
      {
        top: 'dawnSkyTop',
        bottom: 'dawnSkyBottom',
        light: 'goldenLight',
        sun: 1.3,
        ambient: 0.85,
      },
    ],
    [
      7.4,
      {
        top: 'skyTop',
        bottom: 'skyBottom',
        light: 'light',
        sun: 2.3,
        ambient: 1.35,
      },
    ],
    [
      16.2,
      {
        top: 'skyTop',
        bottom: 'skyBottom',
        light: 'light',
        sun: 2.3,
        ambient: 1.35,
      },
    ],
    [
      17.3,
      {
        top: 'skyTop',
        bottom: 'goldenLight',
        light: 'goldenLight',
        sun: 1.9,
        ambient: 1.05,
      },
    ],
    [
      18.3,
      {
        top: 'duskSkyTop',
        bottom: 'duskSkyBottom',
        light: 'duskLight',
        sun: 0.9,
        ambient: 0.6,
      },
    ],
    [19.4, NIGHT],
    [24, NIGHT],
  ];
  const skyTop = new THREE.Color();
  const skyBottom = new THREE.Color();
  const scratchColor = new THREE.Color();
  let skyKey = '';
  let night = 0;
  const applyTime = (
    hour: number,
    weather: WaterConditions['weather'] | undefined,
  ) => {
    const h = ((hour % 24) + 24) % 24;
    const key = `${h.toFixed(2)}|${weather ?? ''}`;
    if (key === skyKey) return;
    skyKey = key;
    const index = keyframes.findIndex(
      ([at], i) => h >= at && h < keyframes[i + 1]![0],
    );
    const [fromAt, from] = keyframes[index]!;
    const [toAt, to] = keyframes[index + 1]!;
    const k = smoothstep(0, 1, (h - fromAt) / (toAt - fromAt));
    const blend = (role: 'top' | 'bottom' | 'light', target: THREE.Color) =>
      target
        .set(effective[from[role]])
        .lerp(scratchColor.set(effective[to[role]]), k);
    const wet = weather === 'RAIN' || weather === 'STORM';
    const grey =
      weather === 'FOG' || wet
        ? weather === 'STORM'
          ? 0.55
          : 0.38
        : weather === 'CLOUDY'
          ? 0.15
          : 0;
    blend('top', skyTop).lerp(scratchColor.set(effective.rock), grey);
    blend('bottom', skyBottom).lerp(
      scratchColor.set(effective.rock),
      grey * 0.8,
    );
    paintSky(sky.geometry, skyTop, skyBottom);
    blend('light', sunLight.color);
    night = nightAmount(h);
    const sunPower =
      THREE.MathUtils.lerp(from.sun, to.sun, k) * (1 - grey * 0.9);
    sunLight.intensity = sunPower;
    ambient.intensity =
      THREE.MathUtils.lerp(from.ambient, to.ambient, k) * theme.shade;
    ambient.color.copy(skyTop).lerp(scratchColor.set(effective.light), 0.5);
    // Sun rises on the left around 06:00 and sets on the right around 18:00.
    const sunArc = ((h - 6) / 12) * Math.PI;
    sun.position.set(-Math.cos(sunArc) * 80, Math.sin(sunArc) * 52 - 4, -110);
    sun.visible = !wet && grey < 0.3 && sun.position.y > -2;
    const moonArc = (((h + 6) % 24) / 12) * Math.PI;
    moon.position.set(-Math.cos(moonArc) * 80, Math.sin(moonArc) * 46, -105);
    moon.visible = night > 0.05 && moon.position.y > 0 && grey < 0.5;
    const lightSource =
      night > 0.5 && moon.visible ? moon.position : sun.position;
    sunLight.position.set(
      lightSource.x * 0.18,
      Math.max(5, lightSource.y * 0.4),
      8,
    );
    starMaterial.opacity = night * (1 - grey);
    stars.visible = starMaterial.opacity > 0.02;
    cloudMaterials.forEach((cloud) =>
      cloud.color
        .set(effective.light)
        .lerp(scratchColor.set(effective.nightSkyBottom), night * 0.75)
        .lerp(scratchColor.set(effective.rock), grey),
    );
    if (scene.fog instanceof THREE.Fog) {
      const [near, far] = theme.fog;
      const fog = weather === 'FOG';
      scene.fog.near = fog ? near * 0.35 : near;
      scene.fog.far = fog ? far * 0.45 : wet ? far * 0.7 : far;
      scene.fog.color.copy(skyBottom);
    }
    water.uniforms.sky.value.copy(skyBottom);
  };

  const bobber = buildBobber(palette);
  scene.add(bobber);
  const linePoints = 32;
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(
    Array.from({ length: linePoints }, () => new THREE.Vector3()),
  );
  const line = new THREE.Line(
    lineGeometry,
    new THREE.LineBasicMaterial({
      color: palette.line,
      transparent: true,
      opacity: 0.9,
    }),
  );
  line.frustumCulled = false;
  scene.add(line);
  const ringGeometry = new THREE.RingGeometry(0.86, 1, 48);
  ringGeometry.rotateX(-Math.PI / 2);
  const ripples = [0, 1, 2].map(() => {
    const ring = new THREE.Mesh(
      ringGeometry,
      new THREE.MeshBasicMaterial({
        color: palette.ripple,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    scene.add(ring);
    return ring;
  });
  // Spray thrown up when the rig lands or a hooked fish thrashes at the surface.
  const dropGeometry = new THREE.SphereGeometry(0.045, 6, 4);
  const dropMaterial = new THREE.MeshBasicMaterial({
    color: palette.ripple,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const drops = Array.from({ length: 18 }, () => {
    const drop = new THREE.Mesh(dropGeometry, dropMaterial);
    drop.visible = false;
    drop.userData = {
      born: -1,
      vel: new THREE.Vector3(),
      origin: new THREE.Vector3(),
    };
    scene.add(drop);
    return drop;
  });
  let nextDrop = 0;
  const splash = (
    at: THREE.Vector3,
    now: number,
    count: number,
    power: number,
  ) => {
    for (let i = 0; i < count; i++) {
      const drop = drops[nextDrop++ % drops.length]!;
      const angle = Math.random() * Math.PI * 2;
      const out = (0.4 + Math.random() * 0.8) * power;
      drop.userData.born = now;
      drop.userData.origin.set(at.x, 0.05, at.z);
      drop.userData.vel.set(
        Math.cos(angle) * out,
        (1.6 + Math.random() * 1.6) * power,
        Math.sin(angle) * out,
      );
    }
  };
  const streakGeometry = new THREE.PlaneGeometry(1, 0.05);
  streakGeometry.rotateX(-Math.PI / 2);
  const streaks = Array.from({ length: 14 }, (_, i) => {
    const streak = new THREE.Mesh(
      streakGeometry,
      new THREE.MeshBasicMaterial({
        color: palette.ripple,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
    );
    streak.scale.x = 0.8 + (i % 4) * 0.5;
    streak.userData = {
      x: -20 + ((i * 37) % 40),
      z: -8 + ((i * 13) % 16),
      dir: i % 2 ? 1 : -1,
    };
    scene.add(streak);
    return streak;
  });

  const camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 400);
  let frozenRendered = false;
  const resize = () => {
    frozenRendered = false;
    const width = parent.clientWidth || 960;
    const height = parent.clientHeight || 520;
    renderer.setSize(width, height, false);
    const aspect = width / height;
    camera.aspect = aspect;
    // Keep the angler and the bobber in frame from wide desktop to tall phones.
    const halfWidth = THREE.MathUtils.lerp(
      6.4,
      10.5,
      smoothstep(0.7, 1.9, aspect),
    );
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const distance = Math.max(14, halfWidth / (tanHalf * aspect));
    const target = new THREE.Vector3(
      THREE.MathUtils.lerp(-0.6, 0.6, smoothstep(0.8, 1.8, aspect)),
      1.7,
      1.5,
    );
    camera.position.set(
      target.x - 0.6,
      target.y + distance * 0.2,
      target.z + distance,
    );
    camera.lookAt(target);
    camera.updateProjectionMatrix();
  };
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(parent);

  const onPointer = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    options.onTap?.(
      THREE.MathUtils.clamp((event.clientX - rect.left) / rect.width, 0, 1),
    );
  };
  canvas.addEventListener('pointerdown', onPointer);

  const clock = new THREE.Clock();
  const tipWorld = new THREE.Vector3();
  const control = new THREE.Vector3();
  const bobberTop = new THREE.Vector3();
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(),
    control,
    bobberTop,
  );
  const scratch = new THREE.Vector3();
  let rodBend = 0;
  let pull = 0;
  let castStartedAt = -1;
  let previousCasting = false;
  let castLanded = true;
  let previousActive = false;
  let retrieveAt = -1;
  let landedAt = -1;
  let nextThrash = 0;
  const hang = new THREE.Vector3();
  const hangVelocity = new THREE.Vector3();
  const releaseFrom = new THREE.Vector3();
  const retrieveFrom = new THREE.Vector3();
  let lastEnvironment: Environment | undefined;
  let lastMinute = 0;
  const landed = new THREE.Vector3();

  let lastFrame = 0;
  const tick = () => {
    // Reduced motion still follows the clock: redraw once a minute for the sky.
    const minute = Math.floor(Date.now() / 60000);
    if (minute !== lastMinute) {
      lastMinute = minute;
      frozenRendered = false;
    }
    if (reducedMotion && frozenRendered) return;
    const t = reducedMotion ? 0 : clock.getElapsedTime();
    const sim = fishing.simulator;
    const conditions = sim?.conditions ?? fishing.conditions;
    const environment =
      conditions?.environment ??
      fishing.environment ??
      options.environment ??
      'FRESHWATER_LAKE';
    if (environment !== lastEnvironment) {
      lastEnvironment = environment;
      applyBiome(environment);
      const slugs =
        environment === 'COAST'
          ? ['spanish-mackerel', 'pompano', 'grouper', 'barracuda']
          : environment === 'RIVER'
            ? ['carp', 'pangasius', 'hemibagrus', 'silver-carp']
            : environment === 'STREAM'
              ? ['stream-minnow', 'hampala', 'mahseer', 'stream-loach']
              : environment === 'BRACKISH'
                ? ['mullet', 'barramundi', 'grouper', 'spotted-scat']
                : environment === 'DEEP_FOREST'
                  ? [
                      'snakehead',
                      'walking-catfish',
                      'featherback',
                      'giant-gourami',
                    ]
                  : ['carp', 'tilapia', 'grass-carp', 'red-tilapia'];
      fishes.forEach((fish, i) => {
        scene.remove(fish);
        disposeObject(fish);
        const model = buildFish(slugs[i % slugs.length], parent);
        model.scale.setScalar(0.25 + i * 0.04);
        model.userData.phase = i * 1.6;
        fishes[i] = model;
        scene.add(model);
      });
    }
    const wet =
      conditions?.weather === 'RAIN' || conditions?.weather === 'STORM';
    // Server hour is the player's local hour; decorative scenes read the device clock.
    applyTime(conditions?.hour ?? localHour(), conditions?.weather);
    water.mesh.material.opacity =
      (conditions ? 0.92 - conditions.clarity * 0.25 : 0.86) * theme.clarity;
    water.animate(
      t,
      conditions?.windMps,
      (conditions?.currentMps ?? 0.1) + theme.flow,
      theme.waveScale,
    );
    props?.animate(t, night, conditions?.windMps ?? 2);
    rain.visible = !!wet;
    if (wet) {
      const attr = rainGeometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < 240; i++) {
        attr.setY(
          i,
          (((rainBase[i * 3 + 1] -
            t * (conditions?.weather === 'STORM' ? 10 : 6)) %
            12) +
            12) %
            12,
        );
      }
      attr.needsUpdate = true;
    }

    // Animate the player's equipped rig too; the fallback angler is hidden once it loads.
    const localPresence = characters.find((p) => p.userId === localUserId);
    const localPose =
      !fishing.active &&
      localPresence &&
      ['WALK', 'RUN', 'SIT', 'INTERACT'].includes(localPresence.animation)
        ? localPresence.animation
        : localAnimation;
    localRig?.animate(
      t,
      localPose,
      reducedMotion,
      sim?.rodLoad ?? (fishing.bite ? 25 : 0),
      sim?.rodAngle ?? 0,
    );
    localRig?.group.updateMatrixWorld(true);
    const present = new Set(characters.map((p) => p.userId));
    for (const [id, peer] of characterPeers) {
      if (!present.has(id) || id === localUserId) {
        peer.rig.destroy();
        peer.label.remove();
        characterPeers.delete(id);
      }
    }
    camera.updateMatrixWorld();
    for (const participant of characters) {
      if (participant.userId === localUserId) {
        if (localRig) {
          localRig.group.position.lerp(
            new THREE.Vector3(participant.x, 0.62, participant.z),
            reducedMotion ? 1 : 0.15,
          );
        }
        continue;
      }
      let peer = characterPeers.get(participant.userId);
      const version = `${participant.character.id}:${participant.character.version}`;
      if (!peer || peer.version !== version) {
        peer?.rig.destroy();
        peer?.label.remove();
        const rig = buildCharacter(participant.character, parent);
        rig.group.scale.multiplyScalar(1.25);
        rig.group.position.set(participant.x, 0.62, participant.z);
        rig.group.rotation.y = Math.PI / 2;
        scene.add(rig.group);
        const label = document.createElement('span');
        label.className = 'fwo-lake-character-name';
        parent.appendChild(label);
        peer = { rig, version, label };
        characterPeers.set(participant.userId, peer);
      }
      peer.rig.group.position.lerp(
        new THREE.Vector3(participant.x, 0.62, participant.z),
        reducedMotion ? 1 : 0.15,
      );
      peer.rig.animate(t, participant.animation, reducedMotion);
      peer.rig.setDetail(
        camera.position.distanceTo(peer.rig.group.position) < 18,
      );
      peer.rig.group.updateMatrixWorld(true);
      const anchor = peer.rig.group
        .localToWorld(new THREE.Vector3(0, 1.9, 0))
        .project(camera);
      peer.label.textContent = participant.character.name;
      peer.label.hidden =
        anchor.z < -1 ||
        anchor.z > 1 ||
        Math.abs(anchor.x) > 1 ||
        Math.abs(anchor.y) > 1;
      const labelX = THREE.MathUtils.clamp(
        (anchor.x * 0.5 + 0.5) * parent.clientWidth,
        64,
        parent.clientWidth - 64,
      );
      peer.label.style.transform = `translate(-50%, -100%) translate(${labelX}px, ${Math.max(20, (-anchor.y * 0.5 + 0.5) * parent.clientHeight)}px)`;
    }

    // Rod bends toward the water on bites and while fighting.
    const targetBend = fishing.fighting
      ? 0.12 + ((sim?.rodLoad ?? 50) / 100) * 0.45 + Math.sin(t * 9) * 0.04
      : fishing.bite
        ? 0.12 + Math.sin(t * 22) * 0.06
        : 0;
    rodBend += (targetBend - rodBend) * (reducedMotion ? 1 : 0.15);
    angler.rod.rotation.z = -rodBend;
    angler.rod.rotation.y = (sim?.rodAngle ?? 0) * 0.22;
    angler.torso.rotation.z = -rodBend * 0.25 + Math.sin(t * 1.1) * 0.012;

    const targetPull = fishing.fighting
      ? Math.min(1, Math.max(0, fishing.progress / 100))
      : 0;
    pull += (targetPull - pull) * (reducedMotion ? 1 : 0.08);
    const now = performance.now() / 1000;
    const dt = Math.min(0.05, Math.max(0, now - (lastFrame || now)));
    lastFrame = now;
    if (!localRig) angler.group.updateMatrixWorld(true);
    (localRig?.tip ?? angler.tip).getWorldPosition(tipWorld);

    const cast = sim?.cast;
    landed.copy(BOBBER_REST);
    if (cast || fishing.previewAim !== undefined) {
      landed.set(
        -1 + (cast?.aim ?? fishing.previewAim ?? 0.5) * 10,
        0,
        2.5 - (cast?.distanceM ?? 5 + (fishing.previewPower ?? 0.6) * 25) / 7,
      );
    }
    bobber.position.lerpVectors(landed, BOBBER_REELED, pull);
    // Float tilts with a nudge, dips with feeding and leans into a running fish.
    const floatLean = fishing.fighting
      ? (sim?.fishDirection ?? 0) * 0.4
      : fishing.bite
        ? Math.sin(t * 19) * 0.28
        : sim?.cue === 'DIP'
          ? 0.22
          : Math.sin(t * 1.8) * 0.04;
    bobber.rotation.z = reducedMotion ? 0 : floatLean;
    bobber.position.y = fishing.bite
      ? -0.1 + Math.sin(t * 24) * 0.09
      : fishing.fighting
        ? -0.08 + Math.sin(t * 12) * 0.05
        : sim?.cue === 'DIP'
          ? -0.08 + Math.sin(t * 7) * 0.04
          : sim?.cue === 'NUDGE'
            ? Math.sin(t * 13) * 0.05
            : Math.sin(t * 2) * 0.03;
    if (fishing.fighting)
      bobber.position.z += (sim?.fishDirection ?? Math.sin(t * 5.5)) * 0.4;

    // The rig hangs below the tip and swings with the rod until the forward
    // stroke releases it; it then flies from the tip to where the cast lands.
    if (fishing.casting && !previousCasting) {
      castStartedAt = now;
      castLanded = false;
      hang.copy(tipWorld).add(scratch.set(0, -0.55, 0));
      hangVelocity.set(0, 0, 0);
    }
    previousCasting = !!fishing.casting;
    const castAge = now - castStartedAt;
    const flight = Math.max(0.65, (cast?.flightMs ?? 900) / 1000);
    const castVisual =
      !reducedMotion &&
      !castLanded &&
      fishing.active &&
      !fishing.bite &&
      !fishing.fighting;
    let lineSag = fishing.fighting
      ? 0.08 + (1 - (sim?.rodLoad ?? 50) / 100) * 0.35
      : fishing.bite
        ? 0.35
        : 0.9;
    if (castVisual && castAge < CAST_RELEASE) {
      // Pendulum on a short drop of line under the tip.
      scratch.copy(tipWorld).add(bobberTop.set(0, -0.55, 0));
      hangVelocity
        .addScaledVector(scratch.sub(hang), 90 * dt)
        .multiplyScalar(Math.exp(-4 * dt));
      hang.addScaledVector(hangVelocity, dt);
      bobber.position.copy(hang).add(scratch.set(0, -0.45, 0));
      bobber.rotation.z = THREE.MathUtils.clamp(
        -hangVelocity.x * 0.08,
        -0.6,
        0.6,
      );
      releaseFrom.copy(bobber.position);
      lineSag = 0;
    } else if (castVisual && castAge < CAST_RELEASE + flight) {
      const f = (castAge - CAST_RELEASE) / flight;
      // Air drag: fast off the tip, slowing as line peels off the spool.
      const across = 1 - (1 - f) ** 1.7;
      const arc = 1.4 + releaseFrom.distanceTo(landed) * 0.12;
      bobber.position.lerpVectors(releaseFrom, landed, across);
      bobber.position.y =
        releaseFrom.y +
        (0 - releaseFrom.y) * f +
        Math.sin(Math.PI * across) * arc;
      bobber.rotation.z = -0.9 * (1 - f);
      lineSag = 0.25 + f * 0.5;
    } else if (castVisual) {
      castLanded = true;
      landedAt = now;
      splash(landed, now, 12, 1);
    }
    if (fishing.bite || fishing.fighting) castLanded = true;

    // Thrashing fish throws spray now and then while fighting.
    if (fishing.fighting && !reducedMotion && now > nextThrash) {
      splash(
        bobber.position,
        now,
        5 + Math.round(((sim?.rodLoad ?? 50) / 100) * 6),
        0.7,
      );
      nextThrash = now + 0.5 + Math.random() * 1.1;
    }

    // When the session ends the line is wound in: the rig skims back across
    // the surface and is lifted to the tip instead of vanishing.
    if (previousActive && !fishing.active && !reducedMotion) {
      retrieveAt = now;
      retrieveFrom.copy(bobber.userData.last ?? bobber.position);
    }
    previousActive = fishing.active;
    const retrieving =
      !fishing.active && retrieveAt >= 0 && now - retrieveAt < 0.9;
    if (retrieving) {
      const f = (now - retrieveAt) / 0.9;
      const k = 1 - (1 - f) ** 2;
      scratch.copy(tipWorld).add(bobberTop.set(0, -0.5, 0));
      bobber.position.lerpVectors(retrieveFrom, scratch, k);
      bobber.position.y =
        f < 0.7 ? 0.04 : THREE.MathUtils.lerp(0.04, scratch.y, (f - 0.7) / 0.3);
      lineSag = 0.05;
    }
    bobber.visible =
      fishing.active || retrieving || fishing.previewAim !== undefined;
    line.visible = fishing.active || retrieving;
    if (fishing.active) {
      bobber.userData.last ??= new THREE.Vector3();
      (bobber.userData.last as THREE.Vector3).copy(bobber.position);
    }

    drops.forEach((drop) => {
      const born = drop.userData.born as number;
      const age = now - born;
      drop.visible = born >= 0 && age < 1.2 && !reducedMotion;
      if (!drop.visible) return;
      const vel = drop.userData.vel as THREE.Vector3;
      drop.position
        .copy(drop.userData.origin as THREE.Vector3)
        .addScaledVector(vel, age);
      drop.position.y -= 4.9 * age * age;
      if (drop.position.y < 0) drop.visible = false;
    });

    bobberTop.copy(bobber.position).add(scratch.set(0, 0.45, 0));
    control.set(
      (tipWorld.x + bobberTop.x) / 2,
      (tipWorld.y + bobberTop.y) / 2 - lineSag,
      (tipWorld.z + bobberTop.z) / 2,
    );
    curve.v0.copy(tipWorld);
    const attribute = lineGeometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < linePoints; i++) {
      curve.getPoint(i / (linePoints - 1), scratch);
      attribute.setXYZ(i, scratch.x, scratch.y, scratch.z);
    }
    attribute.needsUpdate = true;

    ripples.forEach((ring, i) => {
      // No rings while the rig is still in the air.
      if (!fishing.active || (!castLanded && !reducedMotion)) {
        ring.visible = false;
        return;
      }
      ring.visible = true;
      const fresh = performance.now() / 1000 - landedAt < 1.6;
      const speed = fishing.bite
        ? 1.6
        : fishing.fighting
          ? 1.2
          : fresh
            ? 1
            : 0.45;
      const phase = (t * speed + i / ripples.length) % 1;
      const max = fishing.bite ? 1.6 : fishing.fighting ? 1.4 : fresh ? 2 : 0.9;
      ring.position.set(bobber.position.x, 0.06, bobber.position.z);
      ring.scale.setScalar(0.2 + phase * max);
      (ring.material as THREE.MeshBasicMaterial).opacity =
        (1 - phase) * (fishing.bite ? 0.75 : 0.45);
    });

    streaks.forEach((streak) => {
      const data = streak.userData as { x: number; z: number; dir: number };
      streak.position.set(
        ((data.x + t * (0.35 + (conditions?.currentMps ?? 0)) * data.dir + 60) %
          60) -
          22,
        0.07,
        data.z,
      );
      (streak.material as THREE.MeshBasicMaterial).opacity =
        0.22 + Math.sin(t * 0.9 + data.z) * 0.1;
    });

    fishes.forEach((fish, i) => {
      const phase = fish.userData.phase as number;
      const a = t * (0.12 + i * 0.035) + phase;
      const radius = 3 + i * 0.9;
      fish.position.set(
        4 + Math.cos(a) * radius,
        -0.55 - (i % 2) * 0.3,
        -1 + Math.sin(a) * radius * 0.45,
      );
      fish.rotation.y = -a - Math.PI / 2;
      if (
        fishing.active &&
        i === 0 &&
        ['APPROACHING', 'INSPECTING', 'FEEDING'].includes(sim?.behavior ?? '')
      ) {
        fish.position.lerp(
          landed,
          sim?.behavior === 'APPROACHING' ? 0.65 : 0.93,
        );
        fish.position.y = -0.4;
        fish.rotation.y = Math.atan2(
          -(landed.z - fish.position.z),
          landed.x - fish.position.x,
        );
      }
      const hooked = fishing.fighting && i === 0;
      if (hooked) {
        // The hooked fish fights just under the float, heading away from the
        // angler and rolling up toward the surface as it tires.
        const dir = sim?.fishDirection ?? Math.sin(t * 0.8);
        fish.position.set(
          bobber.position.x + 0.5,
          -0.45 + pull * 0.3 + Math.sin(t * 7) * 0.05,
          bobber.position.z + dir * 0.3,
        );
        fish.rotation.y = -dir * 0.9 + Math.sin(t * 9) * 0.25;
        fish.rotation.z = Math.sin(t * 5) * 0.3 * (0.5 + pull);
      } else fish.rotation.z = 0;
      const tail = fish.getObjectByName('tail');
      if (tail)
        tail.rotation.y =
          Math.sin(t * (hooked ? 22 : 6) + phase) * (hooked ? 0.6 : 0.35);
    });

    lotus.items.forEach((lily) => {
      lily.position.y = 0.04 + Math.sin(t * 1.2 + lily.userData.phase) * 0.025;
    });
    reeds.stalks.forEach((reed) => {
      reed.rotation.z =
        Math.sin(t * 1.3 + reed.userData.phase) *
        (0.03 + (conditions?.windMps ?? 2) * 0.012);
      reed.rotation.x = Math.cos(t * 0.9 + reed.userData.phase) * 0.03;
    });
    clouds.children.forEach((cloud, i) => {
      cloud.position.x = ((-60 + i * 30 + t * 0.6 + 90) % 180) - 90;
    });
    birds.forEach((bird) => {
      const data = bird.userData as {
        leftPivot: THREE.Object3D;
        rightPivot: THREE.Object3D;
        offset: number;
      };
      const a = t * 0.12 + data.offset;
      bird.position.set(
        2 + Math.cos(a) * 12,
        11 + Math.sin(a * 2) * 0.8 + data.offset * 0.6,
        -18 + Math.sin(a) * 6,
      );
      bird.rotation.y = -a;
      const flap = Math.sin(t * 7 + data.offset * 3) * 0.5;
      data.leftPivot.rotation.z = flap;
      data.rightPivot.rotation.z = -flap;
    });

    renderer.render(scene, camera);
    frozenRendered = reducedMotion;
  };

  let running = false;
  const setRunning = (next: boolean) => {
    running = next;
    renderer.setAnimationLoop(next ? tick : null);
  };
  const stopVisibility = watchVisibility(parent, setRunning);
  setRunning(true);

  return {
    setCharacter(character, animation) {
      const revision = character.id + ':' + character.version;
      if (localVersion !== revision) {
        localRig?.destroy();
        localRig = buildCharacter(character, parent);
        localRig.group.scale.multiplyScalar(1.25);
        localRig.group.rotation.y = Math.PI / 2;
        localRig.group.position.set(-4.55, 0.62, 3);
        scene.add(localRig.group);
        localVersion = revision;
        angler.group.visible = false;
      }
      localAnimation = animation;
      frozenRendered = false;
    },
    setCharacters(next, id) {
      characters = next;
      localUserId = id;
      frozenRendered = false;
    },
    setFishing(view) {
      fishing = view;
      frozenRendered = false;
      if (!running) tick();
    },
    setReducedMotion(next) {
      reducedMotion = next;
      frozenRendered = false;
    },
    destroy() {
      setRunning(false);
      stopVisibility();
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', onPointer);
      localRig?.destroy();
      for (const entry of characterPeers.values()) {
        entry.rig.destroy();
        entry.label.remove();
      }
      disposeObject(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
