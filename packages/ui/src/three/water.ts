import * as THREE from 'three';

/**
 * Uniforms that drive the moving water surface. `flow` is the surface velocity
 * on the x/z plane (scene units per second); `foam` adds white water streaks
 * that travel downstream (streams and rapids); `sky` tints grazing angles.
 */
export type WaterUniforms = {
  time: { value: number };
  flow: { value: THREE.Vector2 };
  chop: { value: number };
  foam: { value: number };
  foamColor: { value: THREE.Color };
  sky: { value: THREE.Color };
};

export function createWaterUniforms(foam: number, sky: number): WaterUniforms {
  return {
    time: { value: 0 },
    flow: { value: new THREE.Vector2(-0.4, 0) },
    chop: { value: 1 },
    foam: { value: 0 },
    foamColor: { value: new THREE.Color(foam) },
    sky: { value: new THREE.Color(sky) },
  };
}

const NOISE = /* glsl */ `
uniform float uTime;
uniform vec2 uFlow;
uniform float uChop;
uniform float uFoam;
uniform vec3 uFoamColor;
uniform vec3 uSky;
varying vec3 vWaterWorld;
vec2 wHash(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}
// Gradient noise with analytic derivatives (value, d/dx, d/dy).
vec3 wNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  vec2 ga = wHash(i);
  vec2 gb = wHash(i + vec2(1.0, 0.0));
  vec2 gc = wHash(i + vec2(0.0, 1.0));
  vec2 gd = wHash(i + vec2(1.0, 1.0));
  float va = dot(ga, f);
  float vb = dot(gb, f - vec2(1.0, 0.0));
  float vc = dot(gc, f - vec2(0.0, 1.0));
  float vd = dot(gd, f - vec2(1.0, 1.0));
  return vec3(
    va + u.x * (vb - va) + u.y * (vc - va) + u.x * u.y * (va - vb - vc + vd),
    ga + u.x * (gb - ga) + u.y * (gc - ga) + u.x * u.y * (ga - gb - gc + gd) +
      du * (u.yx * (va - vb - vc + vd) + vec2(vb, vc) - va)
  );
}
// Surface slope from several octaves advected by the current. Ripples are
// stretched along the flow so fast water reads as streaming, not boiling.
vec2 wSlope(vec2 p, out float crest) {
  float speed = length(uFlow);
  vec2 dir = speed > 0.001 ? uFlow / speed : vec2(1.0, 0.0);
  vec2 side = vec2(-dir.y, dir.x);
  float stretch = 1.0 + min(speed, 3.0) * 0.9;
  vec2 q = vec2(dot(p, dir) / stretch, dot(p, side));
  vec2 slope = vec2(0.0);
  crest = 0.0;
  float amp = 1.0;
  float freq = 0.55;
  for (int o = 0; o < 4; o++) {
    // Each octave drifts downstream a little faster than the one below it.
    vec2 drift = vec2(uTime * speed * (0.55 + float(o) * 0.25) / stretch, uTime * 0.05 * float(o));
    vec3 n = wNoise(q * freq - drift * freq + float(o) * 17.0);
    vec2 g = n.yz * freq * amp;
    slope += dir * g.x / stretch + side * g.y;
    crest += n.x * amp;
    amp *= 0.55;
    freq *= 2.1;
  }
  return slope;
}
`;

/**
 * Turns a MeshStandardMaterial into flowing water: animated micro-normals that
 * travel with the current, foam streaks in fast water and a Fresnel sky sheen.
 */
export function applyFlowingWater(
  material: THREE.MeshStandardMaterial,
  uniforms: WaterUniforms,
) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.time;
    shader.uniforms.uFlow = uniforms.flow;
    shader.uniforms.uChop = uniforms.chop;
    shader.uniforms.uFoam = uniforms.foam;
    shader.uniforms.uFoamColor = uniforms.foamColor;
    shader.uniforms.uSky = uniforms.sky;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vWaterWorld;',
      )
      .replace(
        '#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nvWaterWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + NOISE)
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `#include <normal_fragment_maps>
        float wCrest;
        vec2 wS = wSlope(vWaterWorld.xz, wCrest) * 0.16 * uChop;
        vec3 wN = normalize(vec3(-wS.x, 1.0, -wS.y));
        normal = normalize((viewMatrix * vec4(wN, 0.0)).xyz);`,
      )
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        {
          float c;
          vec2 s = wSlope(vWaterWorld.xz * 1.6, c);
          // White water: bright where fast ripples crest, broken into streaks.
          float streak = smoothstep(0.42, 0.85, c + length(s) * 0.05);
          diffuseColor.rgb = mix(diffuseColor.rgb, uFoamColor, streak * uFoam);
          diffuseColor.a = mix(diffuseColor.a, 1.0, streak * uFoam * 0.8);
        }`,
      )
      .replace(
        '#include <dithering_fragment>',
        /* glsl */ `#include <dithering_fragment>
        {
          vec3 v = normalize(vViewPosition);
          float fresnel = pow(1.0 - clamp(dot(normal, v), 0.0, 1.0), 4.0);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, uSky, fresnel * 0.55);
          gl_FragColor.a = max(gl_FragColor.a, fresnel * 0.9);
        }`,
      );
  };
  material.customProgramCacheKey = () => 'fwo-flowing-water';
}
