import * as THREE from 'three';
import type { Environment } from '@fwo/contracts';
import type { getCanvasPalette } from '../colors';
import { taper } from './core';
import { applyFlowingWater, createWaterUniforms } from './water';

type Palette = ReturnType<typeof getCanvasPalette>;
export type PaletteRole = keyof Palette;

/**
 * Look and feel of one fishing environment. Colours are palette roles or mixes of
 * them, so every spot stays inside the shared design palette.
 */
export interface BiomeTheme {
  /** Replacement colours for existing palette roles (water, grass, trees…). */
  colors: Partial<Record<PaletteRole, number>>;
  lotus: boolean;
  reeds: boolean;
  hills: boolean;
  treeLine: boolean;
  /** The broad-leaf tree on the left bank; coasts use palms instead. */
  shoreTree: boolean;
  hillHeight: number;
  treeHeight: number;
  fog: [near: number, far: number];
  waveScale: number;
  /** Extra visual current on top of the server's current speed. */
  flow: number;
  /** Ambient light multiplier, e.g. canopy shade in the deep forest. */
  shade: number;
  fireflies: number;
  /** White water carried by the current (0 calm – 1 rapids). */
  foam: number;
  /** How see-through the surface is; shallow clear streams show their bed. */
  clarity: number;
  /** Depth of the visible bottom below the surface. */
  bedDepth: number;
}

const mix = (a: number, b: number, t: number) =>
  new THREE.Color(a).lerp(new THREE.Color(b), t).getHex();

export function biomeTheme(environment: Environment, p: Palette): BiomeTheme {
  const base: BiomeTheme = {
    colors: {},
    lotus: true,
    reeds: true,
    hills: true,
    treeLine: true,
    shoreTree: true,
    hillHeight: 1,
    treeHeight: 1,
    fog: [34, 120],
    waveScale: 1,
    flow: 0,
    shade: 1,
    fireflies: 24,
    foam: 0,
    clarity: 1,
    bedDepth: 1.6,
  };
  switch (environment) {
    case 'RIVER':
      return {
        ...base,
        lotus: false,
        hillHeight: 0.6,
        fog: [30, 110],
        waveScale: 0.9,
        flow: 0.9,
        fireflies: 14,
        foam: 0.12,
        colors: {
          waterTop: mix(p.waterTop, p.silt, 0.5),
          waterBottom: mix(p.waterBottom, p.silt, 0.42),
          fishShadow: mix(p.fishShadow, p.silt, 0.5),
          grass: mix(p.grass, p.sand, 0.2),
          grassLight: mix(p.grassLight, p.bamboo, 0.3),
        },
      };
    case 'STREAM':
      return {
        ...base,
        lotus: false,
        hillHeight: 1.9,
        treeHeight: 1.15,
        fog: [22, 95],
        waveScale: 0.7,
        flow: 1.6,
        fireflies: 10,
        foam: 0.6,
        clarity: 0.62,
        bedDepth: 0.75,
        colors: {
          waterTop: mix(p.waterTop, p.foam, 0.3),
          waterBottom: mix(p.waterBottom, p.seaBottom, 0.35),
          hillFar: mix(p.hillFar, p.rock, 0.5),
          hillMiddle: mix(p.hillMiddle, p.rockDark, 0.35),
          hillNear: mix(p.hillNear, p.moss, 0.35),
          stone: p.rock,
        },
      };
    case 'DEEP_FOREST':
      return {
        ...base,
        hillHeight: 1.25,
        treeHeight: 1.7,
        fog: [14, 72],
        waveScale: 0.45,
        shade: 0.7,
        fireflies: 70,
        colors: {
          waterTop: mix(p.waterTop, p.swamp, 0.55),
          waterBottom: mix(p.waterBottom, p.swamp, 0.62),
          fishShadow: p.swamp,
          tree: mix(p.tree, p.swamp, 0.38),
          treeLight: mix(p.treeLight, p.tree, 0.65),
          grass: mix(p.grass, p.moss, 0.55),
          grassLight: mix(p.grassLight, p.moss, 0.45),
          hillFar: mix(p.hillFar, p.moss, 0.6),
          hillMiddle: mix(p.hillMiddle, p.moss, 0.55),
          hillNear: mix(p.hillNear, p.swamp, 0.3),
          skyBottom: mix(p.skyBottom, p.grassLight, 0.25),
        },
      };
    case 'BRACKISH':
      return {
        ...base,
        lotus: false,
        hillHeight: 0.45,
        fog: [26, 105],
        waveScale: 1.25,
        flow: 0.5,
        fireflies: 0,
        foam: 0.06,
        colors: {
          waterTop: mix(p.waterTop, p.silt, 0.3),
          waterBottom: mix(p.waterBottom, p.mud, 0.3),
          grass: mix(p.grass, p.mud, 0.35),
          grassLight: mix(p.grassLight, p.sandDark, 0.3),
          tree: mix(p.tree, p.mangrove, 0.3),
          bird: p.foam,
        },
      };
    case 'COAST':
      return {
        ...base,
        lotus: false,
        reeds: false,
        hills: false,
        treeLine: false,
        shoreTree: false,
        fog: [60, 230],
        waveScale: 2.3,
        flow: 0.3,
        fireflies: 0,
        foam: 0.3,
        colors: {
          waterTop: p.seaTop,
          waterBottom: p.seaBottom,
          fishShadow: mix(p.seaBottom, p.swamp, 0.3),
          grass: p.sand,
          grassLight: p.sand,
          grassDark: p.sandDark,
          stone: p.rock,
          bird: p.foam,
          skyBottom: mix(p.skyBottom, p.seaTop, 0.2),
        },
      };
    default:
      return base;
  }
}

function mat(color: number, extra: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.85,
    flatShading: true,
    ...extra,
  });
}

function rock(p: Palette, size: number, random: () => number, mossy = false) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.DodecahedronGeometry(size, 0),
    mat(random() > 0.5 ? p.rock : p.rockDark),
  );
  body.scale.set(1.2, 0.7 + random() * 0.4, 1);
  body.rotation.set(random(), random() * Math.PI, random() * 0.3);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  if (mossy) {
    const moss = new THREE.Mesh(
      new THREE.SphereGeometry(size * 0.75, 7, 4, 0, Math.PI * 2, 0, 1.1),
      mat(p.moss),
    );
    moss.position.y = size * 0.32;
    moss.scale.set(1.25, 0.5, 1.05);
    group.add(moss);
  }
  return group;
}

function palm(p: Palette, height: number, lean: number) {
  const group = new THREE.Group();
  const top = new THREE.Vector3(lean, height, lean * 0.3);
  group.add(taper(new THREE.Vector3(), top, 0.26, 0.16, mat(p.woodLight)));
  const frond = new THREE.ConeGeometry(0.42, 3.4, 4, 1);
  frond.translate(0, 1.7, 0);
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(frond, mat(i % 2 ? p.palm : p.tree));
    leaf.position.copy(top);
    leaf.rotation.set(1.15 + (i % 2) * 0.25, (i / 7) * Math.PI * 2, 0, 'YXZ');
    leaf.scale.z = 0.25;
    leaf.castShadow = true;
    leaf.userData.sway = i;
    group.add(leaf);
  }
  return group;
}

function mangrove(p: Palette, random: () => number) {
  const group = new THREE.Group();
  const trunkMat = mat(p.mangrove);
  // Arched stilt roots, the silhouette of a Vietnamese mangrove (cây đước).
  for (let i = 0; i < 6; i++) {
    const root = new THREE.Mesh(
      new THREE.TorusGeometry(0.75, 0.06, 4, 10, Math.PI),
      trunkMat,
    );
    root.rotation.y = (i / 6) * Math.PI;
    root.position.y = -0.1;
    group.add(root);
  }
  group.add(
    taper(
      new THREE.Vector3(0, 0.6, 0),
      new THREE.Vector3(0, 3.2, 0),
      0.2,
      0.14,
      trunkMat,
    ),
  );
  for (let i = 0; i < 3; i++) {
    const crown = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.3 + random() * 0.6, 1),
      mat(i % 2 ? p.tree : p.treeLight),
    );
    crown.position.set((random() - 0.5) * 1.6, 3.5 + random(), random() - 0.5);
    crown.scale.y = 0.65;
    crown.castShadow = true;
    group.add(crown);
  }
  return group;
}

export interface BiomeProps {
  group: THREE.Group;
  animate(t: number, night: number, wind: number): void;
}

/** Signature props of each spot; positions avoid the dock, angler and casting lane. */
export function buildBiomeProps(
  environment: Environment,
  p: Palette,
  random: () => number,
  theme: BiomeTheme,
  decorative: boolean,
): BiomeProps {
  const group = new THREE.Group();
  const animators: ((t: number, night: number, wind: number) => void)[] = [];

  if (environment === 'RIVER') {
    const bar = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 6), mat(p.sand));
    bar.scale.set(7, 0.35, 2.2);
    bar.position.set(14, -0.18, -7);
    bar.receiveShadow = true;
    group.add(bar);
    // Bamboo clumps along the far bank (lũy tre).
    const stalk = new THREE.CylinderGeometry(0.07, 0.09, 1, 5);
    for (let x = -34; x <= 34; x += 6 + random() * 3) {
      for (let i = 0; i < 6; i++) {
        const h = 4 + random() * 4;
        const s = new THREE.Mesh(stalk, mat(i % 2 ? p.bamboo : p.treeLight));
        s.scale.y = h;
        s.position.set(x + random() * 1.4, h / 2, -10.5 - random() * 1.5);
        s.rotation.z = (random() - 0.5) * 0.35;
        s.castShadow = true;
        group.add(s);
      }
    }
    // Moored sampan (xuồng) drifting on the current.
    const boat = new THREE.Group();
    // Lower half of a sphere stretched into a canoe-shaped hull.
    const hull = new THREE.Mesh(
      new THREE.SphereGeometry(
        1,
        14,
        6,
        0,
        Math.PI * 2,
        Math.PI / 2,
        Math.PI / 2,
      ),
      mat(p.woodDark, { side: THREE.DoubleSide }),
    );
    hull.scale.set(1.9, 0.4, 0.5);
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.06, 0.9),
      mat(p.woodLight),
    );
    seat.position.y = -0.05;
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.035, 4, 24),
      mat(p.wood),
    );
    rim.rotation.x = Math.PI / 2;
    rim.scale.set(1.9, 0.5, 1);
    boat.add(hull, seat, rim);
    boat.position.set(8.5, 0.1, -4.5);
    boat.rotation.y = -0.25;
    group.add(boat);
    animators.push((t) => {
      boat.position.y = 0.1 + Math.sin(t * 1.4) * 0.05;
      boat.rotation.z = Math.sin(t * 1.1) * 0.03;
    });
  }

  if (environment === 'RIVER') {
    // Bến đò: a plank landing with mooring posts and a thatched waiting hut.
    const landing = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.12, 0.55),
        mat(i % 2 ? p.wood : p.woodLight),
      );
      plank.position.set(0, 0.32, i * 0.58);
      plank.castShadow = plank.receiveShadow = true;
      landing.add(plank);
    }
    for (const [x, z] of [
      [-0.75, 0],
      [0.75, 0],
      [-0.75, 2],
      [0.75, 2],
    ] as const) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.1, 1.6, 6),
        mat(p.woodDark),
      );
      post.position.set(x, 0.1, z);
      landing.add(post);
    }
    const hut = new THREE.Group();
    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.5, 1.6),
      mat(p.bamboo),
    );
    walls.position.y = 0.75;
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(1.9, 1.2, 4),
      mat(p.hat),
    );
    roof.position.y = 2.05;
    roof.rotation.y = Math.PI / 4;
    roof.scale.z = 0.8;
    walls.castShadow = roof.castShadow = true;
    hut.add(walls, roof);
    hut.position.set(1.8, 0, -2.4);
    landing.add(hut);
    landing.position.set(-14, 0, -9.6);
    group.add(landing);

    // Đò: covered wooden ferry punted along the river by a boatman in a nón lá.
    const ferry = new THREE.Group();
    const hull = new THREE.Mesh(
      new THREE.SphereGeometry(
        1,
        18,
        8,
        0,
        Math.PI * 2,
        Math.PI / 2,
        Math.PI / 2,
      ),
      mat(p.woodDark, { side: THREE.DoubleSide }),
    );
    hull.scale.set(3.2, 0.55, 0.85);
    const gunwale = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.05, 4, 32),
      mat(p.wood),
    );
    gunwale.rotation.x = Math.PI / 2;
    gunwale.scale.set(3.2, 0.85, 1);
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(5, 0.06, 1.2),
      mat(p.woodLight),
    );
    deck.position.y = -0.18;
    // Mui: woven bamboo canopy over the middle of the boat.
    const canopy = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.72, 2.2, 14, 1, true, 0, Math.PI),
      mat(p.hat, { side: THREE.DoubleSide }),
    );
    canopy.rotation.set(0, 0, Math.PI / 2);
    canopy.rotateX(-Math.PI / 2);
    canopy.position.set(-0.3, 0.1, 0);
    ferry.add(hull, gunwale, deck, canopy);
    // Passenger sitting under the canopy.
    const passenger = new THREE.Group();
    const pBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.22, 0.55, 8),
      mat(p.shirt),
    );
    pBody.position.y = 0.1;
    const pHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 10, 8),
      mat(p.skin),
    );
    pHead.position.y = 0.5;
    passenger.add(pBody, pHead);
    passenger.position.set(-0.6, 0, 0.15);
    ferry.add(passenger);
    // Boatman standing at the stern with a long bamboo pole.
    const boatman = new THREE.Group();
    const legs = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.15, 0.75, 8),
      mat(p.pants),
    );
    legs.position.y = 0.2;
    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.2, 0.65, 8),
      mat(p.shirt),
    );
    torso.position.y = 0.88;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 12, 8),
      mat(p.skin),
    );
    head.position.y = 1.33;
    const nonLa = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 0.3, 20),
      mat(p.hat),
    );
    nonLa.position.y = 1.52;
    boatman.add(legs, torso, head, nonLa);
    const arms = new THREE.Group();
    arms.position.y = 1.08;
    boatman.add(arms);
    const pole = taper(
      new THREE.Vector3(0, 1.4, 0),
      new THREE.Vector3(0, -3.2, 0),
      0.035,
      0.03,
      mat(p.bamboo),
    );
    arms.add(pole);
    for (const side of [-1, 1]) {
      arms.add(
        taper(
          new THREE.Vector3(0, 0, side * 0.18),
          new THREE.Vector3(0.0, side * 0.12, 0.02),
          0.05,
          0.045,
          mat(p.shirt),
        ),
      );
    }
    boatman.position.set(2.3, -0.1, 0);
    ferry.add(boatman);
    for (const mesh of [hull, canopy, torso, nonLa]) mesh.castShadow = true;
    const wakeGeometry = new THREE.RingGeometry(0.85, 1, 24);
    wakeGeometry.rotateX(-Math.PI / 2);
    const wakes = [0, 1, 2].map(() => {
      const ring = new THREE.Mesh(
        wakeGeometry,
        new THREE.MeshBasicMaterial({
          color: p.ripple,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      );
      group.add(ring);
      return ring;
    });
    group.add(ferry);
    animators.push((t) => {
      // Slow crossing up and down the river, easing to a stop at each end.
      const cycle = t * 0.028;
      const x = Math.sin(cycle) * 24;
      const heading = Math.cos(cycle) >= 0 ? 1 : -1;
      const speed = Math.abs(Math.cos(cycle));
      ferry.position.set(x, 0.12 + Math.sin(t * 1.3) * 0.04, -6.2);
      ferry.rotation.y = heading > 0 ? Math.PI : 0;
      ferry.rotation.z = Math.sin(t * 1.1) * 0.02;
      ferry.rotation.x = Math.sin(t * 0.9) * 0.015;
      // Punting stroke: plant the pole ahead, walk it back, lift and repeat.
      const stroke = (t * 0.45) % 1;
      const push = stroke < 0.7 ? stroke / 0.7 : 1 - (stroke - 0.7) / 0.3;
      arms.rotation.z = -0.35 + push * 0.75 * (speed > 0.15 ? 1 : 0.2);
      boatman.rotation.z = (push - 0.5) * 0.12;
      wakes.forEach((ring, i) => {
        const k = (t * 0.6 + i / 3) % 1;
        ring.position.set(x + heading * (2.6 + k * 2.5), 0.06, -6.2);
        ring.scale.set(0.8 + k * 2.2, 1, 0.5 + k * 1.2);
        (ring.material as THREE.MeshBasicMaterial).opacity =
          (1 - k) * 0.45 * Math.min(1, speed * 2);
      });
    });
  }

  if (environment === 'STREAM') {
    const bedY = -theme.bedDepth;
    // Pebble bed seen through the clear, shallow water.
    const pebble = new THREE.IcosahedronGeometry(1, 0);
    const pebbleRoles = [p.rock, p.rockDark, p.sand, p.moss, p.sandDark];
    const perRole = decorative ? 40 : 110;
    const dummy = new THREE.Object3D();
    for (const color of pebbleRoles) {
      const stones = new THREE.InstancedMesh(pebble, mat(color), perRole);
      for (let i = 0; i < perRole; i++) {
        const size = 0.08 + random() ** 2 * 0.4;
        dummy.position.set(
          (random() - 0.5) * 64,
          bedY + size * 0.25,
          -7 + random() * 18,
        );
        dummy.scale.set(size * (1 + random() * 0.6), size * 0.45, size);
        dummy.rotation.set(random() * 0.4, random() * Math.PI, 0);
        dummy.updateMatrix();
        stones.setMatrixAt(i, dummy.matrix);
      }
      stones.receiveShadow = true;
      group.add(stones);
    }
    // Rocky banks pinch the water into a mountain stream.
    for (let x = -36; x <= 36; x += 1.6 + random() * 1.4) {
      const r = rock(p, 0.8 + random() * 1.1, random, random() > 0.45);
      r.position.set(x, -0.25 + random() * 0.2, -7.4 - random() * 2.2);
      group.add(r);
    }
    const gravel = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 6),
      mat(p.sandDark),
    );
    gravel.scale.set(40, 0.3, 2.2);
    gravel.position.set(0, -0.12, -8.6);
    gravel.receiveShadow = true;
    group.add(gravel);
    for (const [x, z, size] of [
      [9.5, 8.6, 1.5],
      [12.8, 7.6, 1.1],
      [15.5, 9.2, 1.7],
      [-11, 9.4, 1.4],
    ] as const) {
      const r = rock(p, size, random, true);
      r.position.set(x, -0.2, z);
      group.add(r);
    }
    // Mid-stream boulders, each shedding a V of white water downstream (−x).
    const foamMat = () =>
      new THREE.MeshBasicMaterial({
        color: p.foam,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
    const streakGeometry = new THREE.CircleGeometry(1, 12);
    streakGeometry.rotateX(-Math.PI / 2);
    const wakes: {
      mesh: THREE.Mesh;
      x: number;
      z: number;
      size: number;
      side: number;
      phase: number;
    }[] = [];
    const collars: THREE.Mesh[] = [];
    for (const [x, z, size] of [
      [12.5, -2.6, 1.0],
      [16, 1.6, 0.75],
      [-6, -3.8, 0.95],
      [20, -4.6, 1.3],
      [-13, 1.2, 0.8],
      [-17.5, -4.2, 1.15],
      [24, 3.4, 0.9],
      [3.5, -5.6, 0.7],
    ] as const) {
      const r = rock(p, size, random, random() > 0.5);
      r.position.set(x, -0.3, z);
      group.add(r);
      const collar = new THREE.Mesh(
        new THREE.RingGeometry(0.75, 1, 20),
        foamMat(),
      );
      collar.rotation.x = -Math.PI / 2;
      collar.position.set(x, 0.07, z);
      collar.scale.set(size * 1.35, size * 1.05, 1);
      collar.userData.phase = random() * 6;
      collars.push(collar);
      group.add(collar);
      for (let i = 0; i < 6; i++) {
        const mesh = new THREE.Mesh(streakGeometry, foamMat());
        group.add(mesh);
        wakes.push({ mesh, x, z, size, side: i % 2 ? 1 : -1, phase: i / 6 });
      }
    }
    // Cascade: water spills over stepped ledges and runs toward the viewer.
    const fallUniforms = createWaterUniforms(p.foam, p.skyBottom);
    fallUniforms.foam.value = 0.9;
    fallUniforms.flow.value.set(0, 2.8);
    const fallMat = new THREE.MeshStandardMaterial({
      color: theme.colors.waterTop ?? p.waterTop,
      transparent: true,
      opacity: 0.9,
      roughness: 0.1,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    applyFlowingWater(fallMat, fallUniforms);
    const fx = 18;
    for (let i = 0; i < 4; i++) {
      const top = 5.2 - i * 1.35;
      const z = -15 + i * 1.5;
      // Ledge on both sides of the chute.
      for (const side of [-1, 1]) {
        const ledge = rock(p, 1.2 + random() * 0.5, random, i > 1);
        ledge.position.set(fx + side * (2 + random() * 0.4), top - 0.6, z);
        group.add(ledge);
      }
      const shelf = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, top + 1, 1.5),
        mat(p.rockDark),
      );
      shelf.position.set(fx, (top - 1) / 2 - 0.5, z - 0.1);
      shelf.receiveShadow = true;
      group.add(shelf);
      // Gently sloped run across the shelf, then a steep drop to the next one.
      const run = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.5), fallMat);
      run.rotation.x = -Math.PI / 2 + 0.25;
      run.position.set(fx, top + 0.08, z);
      const drop = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.45), fallMat);
      drop.rotation.x = -0.2;
      drop.position.set(fx, top - 0.62, z + 0.82);
      group.add(run, drop);
    }
    for (let i = 0; i < 2; i++) {
      const cliff = rock(p, 3.4 + random(), random, true);
      cliff.position.set(fx + (i ? 4.5 : -4.5), 2.6, -15.5);
      cliff.scale.y = 1.8;
      group.add(cliff);
    }
    const pool = new THREE.Mesh(new THREE.CircleGeometry(2.2, 24), foamMat());
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(fx, 0.08, -8.6);
    pool.scale.set(1.3, 0.7, 1);
    group.add(pool);
    const mist = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 10, 6),
      foamMat(),
    );
    mist.position.set(fx, 0.5, -9);
    mist.scale.set(1.6, 0.6, 1);
    group.add(mist);
    animators.push((t) => {
      fallUniforms.time.value = t;
      wakes.forEach((w) => {
        const k = (t * 0.55 + w.phase) % 1;
        const spread = 0.25 + k * 0.9;
        w.mesh.position.set(
          w.x - w.size * 0.9 - k * 3.6,
          0.06,
          w.z + w.side * spread * w.size,
        );
        w.mesh.scale.set(0.35 + k * 1.1, 1, 0.06 + k * 0.05);
        w.mesh.rotation.y = -w.side * 0.25;
        (w.mesh.material as THREE.MeshBasicMaterial).opacity =
          Math.sin(k * Math.PI) * 0.7;
      });
      collars.forEach((c) => {
        (c.material as THREE.MeshBasicMaterial).opacity =
          0.45 + Math.sin(t * 5 + (c.userData.phase as number)) * 0.2;
      });
      (pool.material as THREE.MeshBasicMaterial).opacity =
        0.55 + Math.sin(t * 7) * 0.12;
      (mist.material as THREE.MeshBasicMaterial).opacity =
        0.28 + Math.sin(t * 2.3) * 0.08;
      mist.scale.x = 1.6 + Math.sin(t * 3) * 0.12;
    });
  }

  if (environment === 'DEEP_FOREST') {
    for (const [x, z, h] of [
      [12, -9, 13],
      [-8.5, -13, 15],
      [19, -5, 12],
    ] as const) {
      group.add(
        taper(
          new THREE.Vector3(x, -0.5, z),
          new THREE.Vector3(x + 0.6, h, z),
          1.1,
          0.6,
          mat(p.woodDark),
        ),
      );
      for (let i = 0; i < 4; i++) {
        const crown = new THREE.Mesh(
          new THREE.IcosahedronGeometry(3 + random() * 1.5, 1),
          mat(i % 2 ? p.tree : p.moss),
        );
        crown.position.set(x + (random() - 0.5) * 5, h + random() * 2, z - 1);
        crown.castShadow = true;
        group.add(crown);
      }
    }
    const log = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.5, 6, 7),
      mat(p.woodDark),
    );
    log.rotation.set(0, 0.6, Math.PI / 2);
    log.position.set(9, 0.05, -6);
    const logMoss = new THREE.Mesh(
      new THREE.CylinderGeometry(0.47, 0.52, 3, 7, 1, false, 0, Math.PI),
      mat(p.moss),
    );
    logMoss.rotation.copy(log.rotation);
    logMoss.position.copy(log.position);
    group.add(log, logMoss);
    // Hanging vines catch the light between trunks.
    const vine = new THREE.CylinderGeometry(0.03, 0.03, 1, 4);
    for (let i = 0; i < 14; i++) {
      const v = new THREE.Mesh(vine, mat(p.moss));
      const len = 3 + random() * 5;
      v.scale.y = len;
      v.position.set(-30 + random() * 60, 12 - len / 2, -9 - random() * 4);
      v.userData.phase = random() * 6;
      group.add(v);
      animators.push((t, _n, wind) => {
        v.rotation.z =
          Math.sin(t * 0.8 + v.userData.phase) * (0.02 + wind * 0.004);
      });
    }
  }

  if (environment === 'BRACKISH') {
    const flat = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 6), mat(p.mud));
    flat.scale.set(14, 0.4, 4);
    flat.position.set(-22, -0.22, -7);
    group.add(flat);
    for (let i = 0; i < (decorative ? 6 : 9); i++) {
      const tree = mangrove(p, random);
      tree.position.set(-34 + i * 8 + random() * 3, 0, -10 - random() * 3);
      tree.scale.setScalar(0.9 + random() * 0.5);
      group.add(tree);
    }
    // Fishing stakes and a stilt hut (chòi canh) with a lantern for the night.
    const post = new THREE.CylinderGeometry(0.07, 0.09, 2.6, 5);
    for (let i = 0; i < 9; i++) {
      const s = new THREE.Mesh(post, mat(p.woodDark));
      s.position.set(8 + i * 1.5, 0.6, -7 + i * 0.35);
      s.rotation.z = (random() - 0.5) * 0.12;
      group.add(s);
    }
    const hut = new THREE.Group();
    for (const [x, z] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      const leg = new THREE.Mesh(post, mat(p.woodDark));
      leg.position.set(x, 1, z);
      hut.add(leg);
    }
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.15, 2.6),
      mat(p.wood),
    );
    floor.position.y = 2.2;
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(2.2, 1.4, 4),
      mat(p.hatShadow),
    );
    roof.position.y = 3.6;
    roof.rotation.y = Math.PI / 4;
    const lantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 6),
      new THREE.MeshBasicMaterial({ color: p.lantern }),
    );
    lantern.position.set(0.9, 2.75, 1);
    const glow = new THREE.PointLight(p.lantern, 0, 14, 1.6);
    glow.position.copy(lantern.position);
    hut.add(floor, roof, lantern, glow);
    hut.position.set(12.5, 0, -12);
    group.add(hut);
    animators.push((t, night) => {
      glow.intensity = night * (6 + Math.sin(t * 5) * 0.6);
      lantern.visible = night > 0.2;
    });
  }

  if (environment === 'COAST') {
    // Sea reaches the horizon instead of hills and a tree line.
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 240, 1, 1),
      new THREE.MeshStandardMaterial({
        color: p.seaTop,
        roughness: 0.18,
        metalness: 0.08,
        transparent: true,
        opacity: 0.86,
        flatShading: true,
      }),
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, -0.05, -138);
    group.add(sea);
    const spots: [number, number, number][] = [
      [10.5, -7, 1.9],
      [13.5, -3.5, 1.2],
      [15, -11, 2.8],
      [8, -13, 1.3],
      [19, -6, 2],
      [-14, -12, 1.8],
    ];
    const foams: THREE.Mesh[] = [];
    for (const [x, z, size] of spots) {
      const r = rock(p, size, random);
      r.position.set(x, -0.2, z);
      group.add(r);
      const foam = new THREE.Mesh(
        new THREE.RingGeometry(size * 1.05, size * 1.45, 18),
        new THREE.MeshBasicMaterial({
          color: p.foam,
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
        }),
      );
      foam.rotation.x = -Math.PI / 2;
      foam.position.set(x, 0.06, z);
      foam.userData.phase = random() * 6;
      foams.push(foam);
      group.add(foam);
    }
    for (const [x, z, h, lean] of [
      [-11, -3.5, 6.2, 1.2],
      [-8, -6, 5, 0.9],
      [-14, -1, 7.2, 1.6],
    ] as const) {
      const tree = palm(p, h, lean);
      tree.position.set(x, 0.1, z);
      group.add(tree);
      animators.push((t, _n, wind) => {
        tree.children.forEach((leaf) => {
          if (leaf.userData.sway !== undefined)
            leaf.rotation.x =
              1.15 +
              (leaf.userData.sway % 2) * 0.25 +
              Math.sin(t * 1.6 + leaf.userData.sway) * (0.03 + wind * 0.006);
        });
      });
    }
    // Lighthouse on a far headland (ghềnh), lit after dusk.
    const headland = new THREE.Mesh(
      new THREE.ConeGeometry(14, 6, 7),
      mat(p.rockDark),
    );
    headland.position.set(46, 0, -70);
    headland.scale.z = 0.6;
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 1.1, 7, 10),
      mat(p.foam),
    );
    tower.position.set(46, 6.5, -70);
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.75, 10, 8),
      new THREE.MeshBasicMaterial({ color: p.lantern, fog: false }),
    );
    lamp.position.set(46, 10.4, -70);
    group.add(headland, tower, lamp);
    animators.push((t, night) => {
      lamp.visible = night > 0.25 && Math.sin(t * 1.4) > -0.3;
      foams.forEach((foam) => {
        const k = Math.sin(t * 1.2 + foam.userData.phase);
        foam.scale.setScalar(1 + k * 0.12);
        (foam.material as THREE.MeshBasicMaterial).opacity = 0.35 + k * 0.2;
      });
    });
  }

  // Fireflies drift over still water at dusk and night (đom đóm).
  if (theme.fireflies > 0) {
    const count = decorative ? Math.ceil(theme.fireflies / 2) : theme.fireflies;
    const positions = new Float32Array(count * 3);
    const seeds = Float32Array.from({ length: count * 3 }, () => random());
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: p.firefly,
      size: 0.16,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
    });
    const swarm = new THREE.Points(geometry, material);
    group.add(swarm);
    animators.push((t, night) => {
      swarm.visible = night > 0.15;
      if (!swarm.visible) return;
      material.opacity = night * (0.7 + Math.sin(t * 3) * 0.15);
      const attr = geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < count; i++) {
        const a = seeds[i * 3] * 6.28 + t * (0.2 + seeds[i * 3 + 1] * 0.3);
        attr.setXYZ(
          i,
          -22 + seeds[i * 3] * 44 + Math.sin(a) * 1.2,
          0.6 + seeds[i * 3 + 1] * 3.5 + Math.sin(a * 1.7) * 0.4,
          -10 + seeds[i * 3 + 2] * 16 + Math.cos(a) * 1.2,
        );
      }
      attr.needsUpdate = true;
    });
  }

  return {
    group,
    animate: (t, night, wind) =>
      animators.forEach((run) => run(t, night, wind)),
  };
}
