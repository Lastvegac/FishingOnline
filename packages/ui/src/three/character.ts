import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type {
  CharacterAppearance,
  CharacterEquipment,
  CharacterAnimation,
} from '@fwo/contracts';
import { tokenColor, disposeObject, taper } from './core';
import { buildFish } from './models';

export type CharacterVisual = {
  appearance: CharacterAppearance;
  equipment: CharacterEquipment;
  presetId: string;
  equipmentAssets?: CharacterEquipment;
};
export type CharacterRig = ReturnType<typeof buildCharacter>;
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const axes = ['x', 'y', 'z'] as const;
/** Rod pitch inside the fist so the blank points forward/up from the forearm. */
const ROD_GRIP_PITCH = 2.3;
/** Seconds from the start of a cast until the angler is back in the hold. */
export const CAST_TOTAL = 1.35;
/** Moment in the forward stroke when the line is released (seconds). */
export const CAST_RELEASE = 0.5;
const smooth = (x: number) => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};
const easeOutBack = (x: number) => {
  const c = 1.7;
  return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2;
};
type CastKey = {
  at: number;
  arm: number;
  elbow: number;
  wrist: number;
  lean: number;
  twist: number;
  ease: (x: number) => number;
};
// Overhead cast: lift and drift back, pause while the rod loads, accelerate
// forward to a hard stop at ~10 o'clock (line released), follow the line down.
const CAST_KEYS: CastKey[] = [
  { at: 0, arm: -0.5, elbow: -0.95, wrist: 0, lean: 0, twist: 0, ease: smooth },
  {
    at: 0.3,
    arm: -2.0,
    elbow: -0.6,
    wrist: -0.25,
    lean: -0.1,
    twist: 0.22,
    ease: smooth,
  },
  {
    at: 0.38,
    arm: -2.08,
    elbow: -0.6,
    wrist: -0.38,
    lean: -0.12,
    twist: 0.26,
    ease: (x) => x,
  },
  {
    at: 0.52,
    arm: -1.2,
    elbow: -0.5,
    wrist: 0.2,
    lean: 0.12,
    twist: -0.06,
    ease: (x) => x * x,
  },
  {
    at: 0.85,
    arm: -0.75,
    elbow: -0.6,
    wrist: 0.32,
    lean: 0.08,
    twist: -0.04,
    ease: (x) => 1 - (1 - x) ** 2,
  },
  {
    at: CAST_TOTAL,
    arm: -0.55,
    elbow: -0.95,
    wrist: 0,
    lean: 0,
    twist: 0,
    ease: smooth,
  },
];
function castPose(elapsed: number) {
  let i = 1;
  while (i < CAST_KEYS.length - 1 && elapsed > CAST_KEYS[i]!.at) i++;
  const a = CAST_KEYS[i - 1]!,
    b = CAST_KEYS[i]!;
  const k = b.ease(Math.min(1, Math.max(0, (elapsed - a.at) / (b.at - a.at))));
  const mix = (x: number, y: number) => x + (y - x) * k;
  return {
    arm: mix(a.arm, b.arm),
    elbow: mix(a.elbow, b.elbow),
    wrist: mix(a.wrist, b.wrist),
    lean: mix(a.lean, b.lean),
    twist: mix(a.twist, b.twist),
  };
}
const colorToken = (name: string) =>
  `--color-character-${name.toLowerCase()}` as const;

/** Shared modular rig, in metres, with rigid attachments and a skinned robe.
 * One skeleton drives every outfit; cosmetic identifiers never alter fishing stats.
 */
export function buildCharacter(visual: CharacterVisual, host?: Element) {
  const a = visual.appearance,
    e = visual.equipmentAssets ?? visual.equipment;
  const root = new THREE.Group();
  root.name = 'character';
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const mat = (key: string, metal = 0) => {
    if (!materials.has(key))
      materials.set(
        key,
        new THREE.MeshStandardMaterial({
          color: tokenColor(key as `--color-${string}`, host),
          roughness: a.fabric === 'SILK' ? 0.53 : 0.87,
          metalness: metal,
        }),
      );
    return materials.get(key)!;
  };
  const skin = mat(`--color-character-skin-${a.face.skin.toLowerCase()}`),
    hair = mat(colorToken(a.hairColor)),
    ink = mat('--color-character-ink'),
    ivory = mat('--color-character-ivory');
  const cloth = (slot: keyof CharacterEquipment) =>
    mat(
      colorToken(
        a.dyes[slot] ??
          (slot === 'HEADWEAR'
            ? 'GOLD'
            : slot === 'SHOES'
              ? 'INK'
              : slot === 'BELT'
                ? 'WOOD'
                : slot === 'LOWER' && /elder|fisher/.test(e.LOWER ?? '')
                  ? 'WOOD'
                  : a.clothColor),
      ),
    );
  const trim = mat(colorToken(a.trimColor), 0.35),
    wood = mat('--color-character-wood'),
    jade = mat('--color-character-jade', 0.2);
  const detail = new THREE.Group();
  root.add(detail);
  const mesh = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    parent: THREE.Object3D,
    x = 0,
    y = 0,
    z = 0,
    sx = 1,
    sy = 1,
    sz = 1,
  ) => {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const sphere = new THREE.SphereGeometry(1, 24, 16);
  const ell = (
    parent: THREE.Object3D,
    m: THREE.Material,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
  ) => mesh(sphere, m, parent, x, y, z, sx, sy, sz);
  const bone = (
    name: string,
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
  ) => {
    const b = new THREE.Bone();
    b.name = name;
    b.position.set(x, y, z);
    parent.add(b);
    return b;
  };
  const hip = bone('hips', detail, 0, 0.91, 0),
    spine = bone('spine', hip, 0, 0.16, 0),
    neck = bone('neck', spine, 0, 0.37, 0),
    head = bone('head', neck, 0, 0.14, 0);
  const leftArm = bone('arm_l', spine, -0.2, 0.27, 0),
    rightArm = bone('arm_r', spine, 0.2, 0.27, 0);
  const leftElbow = bone('elbow_l', leftArm, 0, -0.28, 0),
    rightElbow = bone('elbow_r', rightArm, 0, -0.28, 0);
  const leftHand = bone('hand_l', leftElbow, 0, -0.25, 0),
    rightHand = bone('hand_r', rightElbow, 0, -0.25, 0);
  const leftLeg = bone('leg_l', hip, -0.095, -0.02, 0),
    rightLeg = bone('leg_r', hip, 0.095, -0.02, 0);
  const leftKnee = bone('knee_l', leftLeg, 0, -0.43, 0),
    rightKnee = bone('knee_r', rightLeg, 0, -0.43, 0);
  const bones = [
    hip,
    spine,
    neck,
    head,
    leftArm,
    rightArm,
    leftElbow,
    rightElbow,
    leftHand,
    rightHand,
    leftLeg,
    rightLeg,
    leftKnee,
    rightKnee,
  ];
  const skeleton = new THREE.Skeleton(bones);
  root.updateMatrixWorld(true);
  skeleton.calculateInverses();
  // Lower garments follow both thighs when sitting; torso and cape blend hips
  // and spine. Four weights keep every outfit on the same compact skeleton.
  const skinned = (
    g: THREE.BufferGeometry,
    m: THREE.Material,
    lower = false,
  ) => {
    const pos = g.getAttribute('position'),
      indices: number[] = [],
      weights: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      const w = THREE.MathUtils.smoothstep(pos.getY(i), 0.95, 1.22);
      if (lower) {
        const leg =
          0.9 * (1 - THREE.MathUtils.smoothstep(pos.getY(i), 0.55, 0.9));
        const right = THREE.MathUtils.smoothstep(pos.getX(i), -0.08, 0.08);
        indices.push(0, 1, 10, 11);
        weights.push(
          (1 - leg) * (1 - w),
          (1 - leg) * w,
          leg * (1 - right),
          leg * right,
        );
      } else {
        indices.push(0, 1, 0, 0);
        weights.push(1 - w, w, 0, 0);
      }
    }
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
    const sk = new THREE.SkinnedMesh(g, m);
    detail.add(sk);
    sk.bind(skeleton);
    sk.castShadow = true;
    sk.receiveShadow = true;
    return sk;
  };
  const female = a.gender === 'FEMALE',
    elder = a.ageGroup === 'ELDER',
    middle = a.ageGroup === 'MIDDLE';
  const shoulder = female ? 0.94 : 1.04;
  leftArm.position.x *= shoulder * a.body.build;
  rightArm.position.x *= shoulder * a.body.build;
  const torso = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.15, 0.945),
      new THREE.Vector2(female ? 0.136 : 0.154, 1.03),
      new THREE.Vector2(female ? 0.166 : 0.19, 1.2),
      new THREE.Vector2(female ? 0.173 : 0.19, 1.31),
      new THREE.Vector2(0.15, 1.355),
      new THREE.Vector2(0.063, 1.39),
    ],
    32,
  );
  torso.scale(1, 1, 0.82);
  skinned(torso, cloth('UPPER'));
  mesh(
    new THREE.CylinderGeometry(0.043, 0.055, 0.11, 20),
    skin,
    neck,
    0,
    0.015,
    0,
  );
  ell(spine, cloth('UPPER'), 0, 0.245, 0, female ? 0.192 : 0.211, 0.06, 0.13);
  const face = new THREE.Group();
  head.add(face);
  const shape = a.face.shape;
  const width = shape === 'ANGULAR' ? 0.112 : shape === 'SOFT' ? 0.104 : 0.1;
  ell(face, skin, 0, 0.02, 0, width, 0.145, 0.098);
  ell(face, skin, 0, -0.053, 0.008, width * 0.83, 0.072, 0.084);
  for (const side of [-1, 1]) {
    ell(face, skin, side * width, 0.01, -0.003, 0.019, 0.032, 0.018);
    const eye = ell(
      face,
      ivory,
      side * 0.041,
      0.043,
      0.088,
      0.024,
      a.face.eyes === 'SOFT' ? 0.009 : 0.007,
      0.009,
    );
    eye.rotation.z = side * (a.face.eyes === 'ANGULAR' ? -0.13 : 0.08);
    ell(face, ink, side * 0.041, 0.044, 0.096, 0.006, 0.007, 0.003);
    const eyebrow = mesh(
      new THREE.CapsuleGeometry(
        0.004,
        a.face.eyebrows === 'ANGULAR' ? 0.041 : 0.032,
        3,
        8,
      ),
      hair,
      face,
      side * 0.041,
      0.069,
      0.088,
    );
    eyebrow.rotation.z = side * (a.face.eyebrows === 'WEATHERED' ? 1.35 : 1.65);
    eyebrow.userData.nearOnly = true;
  }
  const nose = mesh(
    new THREE.ConeGeometry(
      a.face.nose === 'ANGULAR' ? 0.017 : 0.013,
      0.055,
      12,
    ),
    skin,
    face,
    0,
    0.012,
    0.101,
  );
  nose.rotation.x = 0.2;
  const mouth = mesh(
    new THREE.CapsuleGeometry(
      0.0035,
      a.face.mouth === 'SOFT' ? 0.034 : 0.027,
      3,
      8,
    ),
    mat('--color-character-lips'),
    face,
    0,
    -0.041,
    0.088,
  );
  mouth.rotation.z = Math.PI / 2;
  const wrinkles = Math.max(a.face.wrinkles, elder ? 0.65 : middle ? 0.25 : 0);
  const line = (
    parent: THREE.Object3D,
    points: THREE.Vector3[],
    radius: number,
    m: THREE.Material,
  ) =>
    mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        12,
        radius,
        5,
        false,
      ),
      m,
      parent,
    );
  if (wrinkles > 0.1)
    for (let i = 0; i < Math.ceil(wrinkles * 4); i++)
      line(
        face,
        [
          v(-0.055, 0.093 + i * 0.009, 0.075),
          v(0, 0.098 + i * 0.009, 0.085),
          v(0.055, 0.093 + i * 0.009, 0.075),
        ],
        0.0014,
        mat('--color-character-wood'),
      );
  if (a.face.mark === 'MOLE')
    ell(face, ink, 0.061, -0.023, 0.083, 0.003, 0.003, 0.002);
  if (a.face.mark === 'SCAR')
    line(
      face,
      [v(-0.06, 0.061, 0.087), v(-0.05, 0.027, 0.094), v(-0.044, 0.007, 0.096)],
      0.002,
      mat('--color-character-lips'),
    );
  if (a.face.beard !== 'NONE') {
    const beardMat = elder ? mat('--color-character-silver') : hair;
    mesh(
      new THREE.ConeGeometry(
        0.065,
        a.face.beard === 'LONG' ? 0.28 : 0.075,
        22,
        5,
      ),
      beardMat,
      face,
      0,
      a.face.beard === 'LONG' ? -0.16 : -0.085,
      0.115,
    ).rotation.z = Math.PI;
    for (const side of [-1, 1])
      ell(face, beardMat, side * 0.023, -0.025, 0.094, 0.031, 0.009, 0.009);
  }
  // Fitted scalp, distinct silhouettes for long hair, braids, bun and ponytail.
  const hairId = e.HAIR ?? 'hair-short';
  mesh(
    new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.52),
    hair,
    head,
    0,
    0.038,
    -0.005,
    0.113,
    0.14,
    0.107,
  );
  if (!hairId.includes('short')) {
    if (/long|loose|tousled|pinned/.test(hairId)) {
      for (const side of [-1, 1])
        ell(head, hair, side * 0.085, -0.14, -0.047, 0.036, 0.24, 0.065);
      ell(head, hair, 0, -0.14, -0.085, 0.09, 0.24, 0.05);
    }
    if (/bun|pinned/.test(hairId))
      ell(head, hair, 0, 0.164, -0.033, 0.064, 0.049, 0.054);
    if (/ponytail|braid/.test(hairId)) {
      ell(head, hair, 0, 0.15, -0.055, 0.046, 0.037, 0.042);
      for (let i = 0; i < 7; i++)
        ell(
          head,
          hair,
          Math.sin(i) * 0.008,
          0.12 - i * 0.048,
          -0.1 - i * 0.012,
          0.027 - i * 0.001,
          0.035,
          0.025,
        );
      mesh(
        new THREE.TorusGeometry(0.036, 0.008, 6, 18),
        trim,
        head,
        0,
        0.138,
        -0.07,
      ).rotation.x = Math.PI / 2;
    }
  }
  // Modular lower garments use a shared waist envelope; inner legs stay covered.
  const skirt = /maiden|royal|taoist|festival/.test(e.LOWER ?? '');
  const winter = (e.UPPER ?? '').includes('winter');
  for (const [arm, elbow, hand] of [
    [leftArm, leftElbow, leftHand],
    [rightArm, rightElbow, rightHand],
  ]) {
    const wide = /maiden|taoist|royal|elder/.test(e.UPPER ?? '');
    ell(arm, cloth('UPPER'), 0, -0.015, 0, 0.081, 0.08, 0.08);
    mesh(
      new THREE.CylinderGeometry(0.069, wide ? 0.115 : 0.065, 0.27, 22),
      cloth('UPPER'),
      arm,
      0,
      -0.135,
      0,
    );
    mesh(
      new THREE.CylinderGeometry(0.06, wide ? 0.13 : 0.055, 0.23, 22),
      cloth('UPPER'),
      elbow,
      0,
      -0.115,
      0,
    );
    ell(
      elbow,
      cloth('UPPER'),
      0,
      0,
      0,
      wide ? 0.115 : 0.066,
      0.055,
      wide ? 0.115 : 0.066,
    );
    mesh(
      new THREE.TorusGeometry(wide ? 0.13 : 0.055, 0.006, 6, 24),
      trim,
      elbow,
      0,
      -0.225,
      0,
    ).rotation.x = Math.PI / 2;
    ell(hand, skin, 0, -0.028, 0.014, 0.034, 0.049, 0.025);
    for (let i = 0; i < 4; i++)
      ell(hand, skin, -0.023 + i * 0.015, -0.062, 0.019, 0.006, 0.025, 0.008);
  }
  for (const [leg, knee] of [
    [leftLeg, leftKnee],
    [rightLeg, rightKnee],
  ]) {
    mesh(
      new THREE.CylinderGeometry(0.075, 0.068, 0.42, 22),
      cloth('LOWER'),
      leg,
      0,
      -0.21,
      0,
    );
    mesh(
      new THREE.CylinderGeometry(0.067, 0.05, 0.37, 22),
      cloth('LOWER'),
      knee,
      0,
      -0.185,
      0,
    );
    const boots = (e.SHOES ?? '').includes('boots');
    ell(
      knee,
      cloth('SHOES'),
      0,
      -0.39,
      0.055,
      0.065,
      boots ? 0.095 : 0.043,
      0.125,
    );
  }
  const hem = skirt
    ? 0.17
    : /wanderer|elder|swordswoman/.test(e.LOWER ?? '')
      ? 0.35
      : 0.67;
  const profile = [
    new THREE.Vector2(0.15, 0.91),
    new THREE.Vector2(0.185, 0.83),
    new THREE.Vector2(skirt ? 0.3 : 0.235, hem + 0.1),
    new THREE.Vector2(skirt ? 0.32 : 0.245, hem),
  ];
  const robe = new THREE.LatheGeometry(profile.reverse(), 40);
  const position = robe.getAttribute('position');
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i),
      z = position.getZ(i),
      angle = Math.atan2(z, x),
      fold = 1 + Math.cos(angle * 18) * 0.028;
    position.setXYZ(i, x * fold, position.getY(i), z * fold);
  }
  robe.computeVertexNormals();
  skinned(robe, cloth('LOWER'), true);
  const hemTrim = new THREE.TorusGeometry(skirt ? 0.318 : 0.242, 0.008, 6, 48);
  hemTrim.rotateX(Math.PI / 2);
  hemTrim.translate(0, hem, 0);
  skinned(hemTrim, trim, true);
  // Cross collar and sash distinguish hanfu from a recoloured shirt.
  for (const side of [-1, 1]) {
    const collar = mesh(
      new THREE.BoxGeometry(0.028, 0.36, 0.025),
      ivory,
      spine,
      side * 0.055,
      0.13,
      0.147,
    );
    collar.rotation.z = side * 0.43;
    const seam = mesh(
      new THREE.BoxGeometry(0.01, 0.38, 0.03),
      trim,
      spine,
      side * 0.076,
      0.13,
      0.15,
    );
    seam.rotation.z = side * 0.43;
  }
  if (winter) {
    ell(neck, ivory, 0, -0.015, 0, 0.2, 0.06, 0.15);
  }
  if (e.BELT) {
    mesh(
      new THREE.CylinderGeometry(0.165, 0.165, 0.075, 32),
      cloth('BELT'),
      hip,
      0,
      0.02,
      0,
      1,
      1,
      0.85,
    );
    mesh(new THREE.BoxGeometry(0.06, 0.05, 0.018), trim, hip, 0, 0.02, 0.147);
    mesh(
      new THREE.BoxGeometry(0.055, 0.32, 0.025),
      cloth('BELT'),
      hip,
      0.085,
      -0.16,
      0.15,
    ).rotation.z = -0.1;
  }
  if (e.OUTERWEAR) {
    const cape = new THREE.CylinderGeometry(
      0.21,
      0.32,
      0.86,
      32,
      8,
      true,
      0.3,
      Math.PI * 1.8,
    );
    cape.translate(0, 1.0, -0.02);
    skinned(cape, cloth('OUTERWEAR'));
  }
  // Embroidered relief stays on supported fabric surfaces, never arbitrary URLs.
  if (a.pattern !== 'PLAIN')
    for (let i = 0; i < 5; i++) {
      const y = -0.16 + i * 0.065;
      if (['LOTUS', 'PLUM', 'PHOENIX'].includes(a.pattern))
        for (let j = 0; j < 5; j++) {
          const petal = ell(
            spine,
            trim,
            0.085 + Math.cos(j * 1.257) * 0.019,
            y + Math.sin(j * 1.257) * 0.019,
            0.159,
            0.007,
            0.016,
            0.003,
          );
          petal.rotation.z = -j * 1.257;
        }
      else if (a.pattern === 'BAMBOO') {
        line(spine, [v(0.08, y, 0.16), v(0.08, y + 0.05, 0.16)], 0.003, trim);
        line(
          spine,
          [v(0.08, y + 0.03, 0.16), v(0.1, y + 0.05, 0.16)],
          0.002,
          trim,
        );
      } else
        line(
          spine,
          [
            v(0.05, y, 0.16),
            v(0.075, y + 0.025, 0.167),
            v(0.1, y, 0.16),
            v(0.125, y + 0.025, 0.15),
          ],
          0.003,
          trim,
        );
    }
  if (e.HEADWEAR?.includes('bamboo')) {
    mesh(
      new THREE.ConeGeometry(0.3, 0.11, 48, 2, true),
      cloth('HEADWEAR'),
      head,
      0,
      0.14,
      0,
    );
    mesh(
      new THREE.TorusGeometry(0.3, 0.009, 6, 48),
      wood,
      head,
      0,
      0.085,
      0,
    ).rotation.x = Math.PI / 2;
    for (let i = 0; i < 20; i++) {
      const t = (i * Math.PI) / 10;
      head.add(
        taper(
          v(0, 0.196, 0),
          v(Math.cos(t) * 0.297, 0.087, Math.sin(t) * 0.297),
          0.0015,
          0.001,
          wood,
        ),
      );
    }
  } else if (e.HEADWEAR)
    mesh(
      new THREE.BoxGeometry(0.16, 0.14, 0.16),
      cloth('HEADWEAR'),
      head,
      0,
      0.18,
      0,
    );
  if (e.FACE_ACCESSORY) {
    if (e.FACE_ACCESSORY === 'fan') {
      const folded = mesh(
        new THREE.CircleGeometry(0.12, 12, 0, Math.PI / 2),
        ivory,
        hip,
        -0.17,
        -0.08,
        0.12,
      );
      folded.rotation.z = -0.45;
    } else if (e.FACE_ACCESSORY === 'jade-cord') {
      mesh(
        new THREE.TorusGeometry(0.115, 0.006, 8, 24),
        jade,
        neck,
        0,
        -0.045,
        0.06,
      ).scale.y = 0.75;
    } else if (
      e.FACE_ACCESSORY.includes('gourd') ||
      e.FACE_ACCESSORY.includes('flask')
    ) {
      ell(hip, wood, 0.2, -0.18, 0.02, 0.05, 0.07, 0.05);
      ell(hip, wood, 0.2, -0.095, 0.02, 0.033, 0.045, 0.033);
    } else if (e.FACE_ACCESSORY.includes('pouch'))
      ell(hip, cloth('FACE_ACCESSORY'), -0.2, -0.16, 0.02, 0.07, 0.09, 0.045);
    else if (e.FACE_ACCESSORY.includes('scarf'))
      ell(neck, cloth('FACE_ACCESSORY'), 0, -0.01, 0, 0.13, 0.05, 0.11);
    else if (e.FACE_ACCESSORY.includes('talisman'))
      mesh(
        new THREE.BoxGeometry(0.04, 0.12, 0.009),
        trim,
        hip,
        0.19,
        -0.16,
        0.04,
      );
    else if (e.FACE_ACCESSORY.includes('veil'))
      ell(head, cloth('FACE_ACCESSORY'), 0, -0.043, 0.08, 0.095, 0.065, 0.025);
    else {
      const pin = mesh(
        new THREE.CylinderGeometry(0.004, 0.004, 0.23, 8),
        e.FACE_ACCESSORY.includes('wood') ? wood : jade,
        head,
        0.025,
        0.16,
        -0.03,
      );
      pin.rotation.z = 1.25;
      ell(head, jade, 0.13, 0.193, -0.03, 0.025, 0.025, 0.012);
    }
  }
  if (e.NECKLACE)
    mesh(
      new THREE.TorusGeometry(0.11, 0.006, 8, 24),
      jade,
      neck,
      0,
      -0.04,
      0.055,
    ).scale.y = 0.75;
  if (e.WRIST)
    mesh(
      new THREE.TorusGeometry(0.035, 0.007, 8, 24),
      jade,
      leftHand,
      0,
      0.014,
      0,
    ).rotation.x = Math.PI / 2;
  if (e.BACK) {
    if (e.BACK.includes('sword')) {
      const sword = mesh(
        new THREE.BoxGeometry(0.04, 0.7, 0.025),
        trim,
        spine,
        0.05,
        -0.08,
        -0.17,
      );
      sword.rotation.z = 0.45;
    } else {
      mesh(
        new THREE.CylinderGeometry(0.12, 0.085, 0.33, 20, 8, true),
        wood,
        spine,
        0,
        -0.17,
        -0.2,
      );
      for (let i = 0; i < 6; i++)
        mesh(
          new THREE.TorusGeometry(0.1 + i * 0.004, 0.004, 5, 24),
          trim,
          spine,
          0,
          -0.31 + i * 0.05,
          -0.2,
        ).rotation.x = Math.PI / 2;
    }
  }
  if (e.HANDHELD) {
    const fan = new THREE.Group();
    leftHand.add(fan);
    fan.rotation.x = Math.PI / 2;
    mesh(
      new THREE.CircleGeometry(0.17, 16, 0, Math.PI),
      ivory,
      fan,
      0,
      -0.05,
      0.03,
    );
    for (let i = 0; i < 8; i++) {
      const t = (i * Math.PI) / 7;
      fan.add(
        taper(
          v(0, -0.05, 0.035),
          v(Math.cos(t) * 0.17, -0.05 + Math.sin(t) * 0.17, 0.035),
          0.002,
          0.0015,
          wood,
        ),
      );
    }
  }
  // Rod is attached to the grip bone, with the reel and line socket in that space.
  const rod = new THREE.Group();
  rightHand.add(rod);
  // The grip sits in the palm with the blank angled forward/up out of the fist,
  // so the rod follows forearm + wrist (≈45° over the water when holding).
  rod.rotation.x = ROD_GRIP_PITCH;
  rod.rotation.z = -0.12;
  rod.add(taper(v(0, -0.12, 0), v(0, 0, 0), 0.013, 0.013, wood));
  const rodSegments: THREE.Group[] = [];
  let rodParent = rod;
  for (let i = 0; i < 6; i++) {
    const segment = new THREE.Group();
    segment.position.y = i === 0 ? 0 : 1.6 / 6;
    rodParent.add(segment);
    segment.add(
      taper(
        v(0, 0, 0),
        v(0, 1.6 / 6, 0),
        0.013 - i * 0.0016,
        0.013 - (i + 1) * 0.0016,
        wood,
      ),
    );
    mesh(
      new THREE.TorusGeometry(0.014 - i * 0.0016, 0.002, 5, 10),
      trim,
      segment,
      0,
      0.05,
      0,
    ).rotation.x = Math.PI / 2;
    rodSegments.push(segment);
    rodParent = segment;
  }
  mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.025, 16),
    trim,
    rod,
    0.03,
    0.02,
    0.008,
  ).rotation.z = Math.PI / 2;
  // Crank handle on the reel spins while the angler retrieves line.
  const crank = new THREE.Group();
  crank.position.set(0.05, 0.02, 0.008);
  rod.add(crank);
  crank.add(taper(v(0, 0, 0), v(0, 0.055, 0), 0.004, 0.004, trim));
  mesh(
    new THREE.CylinderGeometry(0.009, 0.009, 0.025, 8),
    wood,
    crank,
    0.012,
    0.055,
    0,
  ).rotation.z = Math.PI / 2;
  const tip = new THREE.Object3D();
  tip.position.y = 1.6 / 6;
  rodParent.add(tip);
  const heldFish = buildFish('ca-chep');
  heldFish.scale.setScalar(0.13);
  leftHand.add(heldFish);
  heldFish.position.set(0, -0.18, 0.1);
  heldFish.visible = false;
  root.scale.set(a.body.build, a.body.height, a.body.build);
  const neutral = bones.map((b) => b.rotation.clone());
  // Merge rigid pieces within their parent/material while preserving bone and
  // prop transforms. Skinned garments keep their skeleton and skin weights.
  const parents: THREE.Object3D[] = [];
  root.traverse((o) => parents.push(o));
  const replaced = new Set<THREE.BufferGeometry>();
  for (const parent of parents) {
    const groups = new Map<string, THREE.Mesh[]>();
    for (const child of parent.children) {
      if (
        !(child instanceof THREE.Mesh) ||
        child instanceof THREE.SkinnedMesh ||
        Array.isArray(child.material)
      )
        continue;
      const key = `${child.material.uuid}:${!!child.userData.nearOnly}`;
      const list = groups.get(key) ?? [];
      list.push(child);
      groups.set(key, list);
    }
    for (const pieces of groups.values()) {
      if (pieces.length < 2) continue;
      const geometries = pieces.map((piece) => {
        piece.updateMatrix();
        const geometry = piece.geometry.index
          ? piece.geometry.toNonIndexed()
          : piece.geometry.clone();
        return geometry.applyMatrix4(piece.matrix);
      });
      const geometry = mergeGeometries(geometries);
      geometries.forEach((g) => g.dispose());
      if (!geometry) continue;
      const combined = new THREE.Mesh(geometry, pieces[0]!.material);
      combined.castShadow = combined.receiveShadow = true;
      combined.userData.nearOnly = pieces[0]!.userData.nearOnly;
      pieces.forEach((piece) => {
        replaced.add(piece.geometry);
        piece.removeFromParent();
      });
      parent.add(combined);
    }
  }
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) replaced.delete(o.geometry);
  });
  replaced.forEach((g) => g.dispose());
  const smallDetails: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (o.userData.nearOnly) smallDetails.push(o);
  });
  let animation: CharacterAnimation = 'IDLE',
    stateTime = 0,
    lastTime = 0,
    // Rod blank spring (lag + load) and the previous rod pitch for its velocity.
    flex = 0,
    flexVelocity = 0,
    lastPitch = Number.NaN,
    crankAngle = 0;
  const pose = new Map<THREE.Bone, THREE.Euler>();
  const target = (b: THREE.Bone, x = 0, y = 0, z = 0) =>
    pose.set(b, new THREE.Euler(x, y, z));
  function animate(
    time: number,
    state: CharacterAnimation,
    reduced = false,
    rodLoad = 0,
    rodAngle = 0,
  ) {
    const dt = Math.min(0.06, Math.max(0, time - lastTime));
    lastTime = time;
    // A cast always plays to the end of its follow-through, even when the server
    // has already moved on to WAIT; a bite or anything else interrupts it.
    const castRunning =
      animation === 'CAST' && state === 'WAIT' && time - stateTime < CAST_TOTAL;
    if (state !== animation && !castRunning) {
      animation = state;
      stateTime = time;
    }
    state = animation;
    const t = reduced ? 0 : time,
      elapsed = time - stateTime;
    pose.clear();
    bones.forEach((b, i) => pose.set(b, neutral[i]!.clone()));
    let hipY = 0.91;
    const breathing = Math.sin(t * 1.8) * 0.008;
    target(
      spine,
      elder ? 0.09 : a.body.posture === 'RELAXED' ? 0.035 : 0,
      0,
      breathing,
    );
    target(head, elder ? 0.045 : 0, Math.sin(t * 0.45) * 0.035, 0);
    target(leftArm, 0, 0, -0.07);
    target(rightArm, 0, 0, 0.07);
    const fishing = [
      'SIT',
      'STAND_FISHING',
      'CAST',
      'WAIT',
      'BITE',
      'HOOK',
      'FIGHT',
      'REEL',
      'CATCH',
    ].includes(state);
    const seated =
      state === 'SIT' ||
      (fishing && a.fishingStyle === 'SEATED' && state !== 'CAST');
    if (seated) {
      hipY = 0.53;
      target(leftLeg, -1.35);
      target(rightLeg, -1.35);
      target(leftKnee, 1.42);
      target(rightKnee, 1.42);
    }
    let crankSpeed = 0;
    if (fishing) {
      // Holding pose: rod hand at the hip, other hand on the reel.
      let arm = -0.5,
        elbow = -0.95,
        wrist = 0,
        lean = 0,
        twist = 0;
      if (state === 'CAST') {
        const k = castPose(elapsed);
        arm = k.arm;
        elbow = k.elbow;
        wrist = k.wrist;
        lean = k.lean;
        twist = k.twist;
      } else if (
        state === 'WAIT' ||
        state === 'STAND_FISHING' ||
        state === 'SIT'
      ) {
        // Still, patient hold with a slow breath in the shoulders.
        arm = -0.55 + Math.sin(t * 0.6) * 0.02;
        wrist = Math.sin(t * 0.37) * 0.015;
      } else if (state === 'BITE') {
        // Leans in and watches the float, ready to strike.
        arm = -0.62 + Math.sin(t * 11) * 0.02;
        lean = 0.1;
        target(head, 0.16, 0, 0);
      } else if (state === 'HOOK') {
        const k = easeOutBack(Math.min(1, elapsed / 0.18));
        arm = -0.5 - k * 1.0;
        elbow = -0.95 + k * 0.3;
        wrist = -k * 0.25;
        lean = -k * 0.16;
      } else if (state === 'FIGHT') {
        // Pump and wind: lift the rod slowly against the fish, then drop it
        // quickly while cranking in the slack.
        const u = (elapsed % 2.4) / 2.4;
        const lift =
          u < 0.62 ? smooth(u / 0.62) : 1 - smooth((u - 0.62) / 0.38);
        arm = -0.85 - lift * 0.6;
        elbow = -0.8 + lift * 0.1;
        wrist = -lift * 0.12;
        lean = -0.08 - lift * 0.12;
        crankSpeed = u < 0.62 ? 3 : 16;
        target(head, 0.08, 0, 0);
      } else if (state === 'REEL') {
        arm = -0.8 + Math.sin(t * 1.6) * 0.04;
        elbow = -0.85;
        lean = -0.05;
        crankSpeed = 14;
      }
      if (
        state === 'BITE' ||
        state === 'HOOK' ||
        state === 'FIGHT' ||
        state === 'REEL'
      )
        hipY -= seated ? 0 : 0.015; // knees soften under load
      target(rightArm, arm, 0, -0.08);
      target(rightElbow, elbow);
      target(rightHand, wrist);
      target(spine, (elder ? 0.09 : 0) + lean, twist, breathing);
      // Off hand rides the reel; it circles with the crank while winding.
      crankAngle += crankSpeed * dt * (reduced ? 0 : 1);
      target(
        leftArm,
        -0.65 + (crankSpeed ? Math.cos(crankAngle) * 0.07 : 0),
        0,
        0.3,
      );
      target(leftElbow, -1.1 + (crankSpeed ? Math.sin(crankAngle) * 0.16 : 0));
    }
    if (state === 'WALK' || state === 'RUN') {
      const speed = state === 'RUN' ? 9 : 5,
        swing = Math.sin(t * speed) * (state === 'RUN' ? 0.7 : 0.4);
      target(leftLeg, swing);
      target(rightLeg, -swing);
      target(leftKnee, Math.max(0, -swing));
      target(rightKnee, Math.max(0, swing));
      target(leftArm, -swing * 0.6);
      target(rightArm, swing * 0.6);
      hipY += Math.abs(Math.sin(t * speed)) * 0.025;
    }
    if (state === 'HOLD_FISH' || state === 'CELEBRATE') {
      target(leftArm, -1.3, 0, -0.3);
      target(leftElbow, -0.7);
      target(rightArm, state === 'CELEBRATE' ? -2.5 : -0.35);
      // Rod is lowered but kept tip-up while the fish is held.
      if (state === 'HOLD_FISH') target(rightElbow, -0.8);
      target(head, 0.07, -0.1);
    }
    if (state === 'FAIL') {
      target(head, 0.28);
      target(spine, 0.15);
      target(leftArm, 0.1, 0, -0.2);
    }
    if (state === 'INTERACT') {
      target(leftArm, -1.2, 0, -0.4);
      target(leftElbow, -0.8, 0, Math.sin(t * 5) * 0.25);
    }
    // Casting and striking are fast, deliberate moves; everything else eases.
    const alpha = reduced
      ? 1
      : 1 - Math.exp(-dt * (state === 'CAST' || state === 'HOOK' ? 40 : 12));
    for (const b of bones) {
      const p = pose.get(b)!;
      for (const axis of axes)
        b.rotation[axis] = THREE.MathUtils.lerp(
          b.rotation[axis],
          p[axis],
          alpha,
        );
    }
    hip.position.y = THREE.MathUtils.lerp(
      hip.position.y,
      hipY + breathing,
      alpha,
    );
    const load = THREE.MathUtils.clamp(rodLoad / 100, 0, 1);
    // Fish pulling to one side swings the blank sideways, not around its axis.
    rod.rotation.z = THREE.MathUtils.lerp(
      rod.rotation.z,
      -0.12 - rodAngle * 0.35,
      alpha,
    );
    // Rod blank as a damped spring: it trails the hand when swung (loading on
    // the back cast, unloading past the stop) and settles with a few wobbles.
    const pitch =
      rightArm.rotation.x + rightElbow.rotation.x + rightHand.rotation.x;
    const pitchVelocity =
      dt > 0 && Number.isFinite(lastPitch) ? (pitch - lastPitch) / dt : 0;
    lastPitch = pitch;
    const flexTarget =
      load * 0.12 +
      (state === 'BITE' ? 0.03 : 0) +
      THREE.MathUtils.clamp(-pitchVelocity * 0.014, -0.11, 0.11);
    if (reduced || dt === 0) {
      flex = load * 0.12;
      flexVelocity = 0;
    } else {
      const steps = Math.ceil(dt / 0.008);
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        flexVelocity += (190 * (flexTarget - flex) - 9 * flexVelocity) * h;
        flex += flexVelocity * h;
      }
    }
    rodSegments.forEach((segment, i) => {
      const quiver =
        !reduced && ['BITE', 'FIGHT', 'REEL'].includes(state)
          ? Math.sin(t * (state === 'BITE' ? 22 : 12) + i * 0.4) *
            (0.004 + load * 0.008)
          : 0;
      segment.rotation.x = flex * (0.3 + i / 6) + quiver;
    });
    crank.rotation.x = -crankAngle;
    // The rod stays in hand while landing the fish or after it escapes.
    rod.visible =
      fishing || state === 'HOLD_FISH' || state === 'FAIL' || state === 'CATCH';
    heldFish.visible = state === 'HOLD_FISH' || state === 'CELEBRATE';
  }
  animate(0, 'IDLE', true);
  return {
    group: root,
    tip,
    rod,
    skeleton,
    animate,
    setDetail: (near: boolean) => {
      smallDetails.forEach((o) => {
        o.visible = near;
      });
    },
    destroy: () => {
      root.removeFromParent();
      disposeObject(root);
      skeleton.dispose();
    },
  };
}
