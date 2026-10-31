/**
 * GPU particle field — ONE Points mesh with a custom ShaderMaterial.
 * Epoch-driven uniforms morph the look: quantum foam → GUT glow →
 * inflation streams → electroweak plasma → colored quark–gluon soup.
 */
import * as THREE from 'three';

const VERT = /* glsl */ `
uniform float uTime;
uniform float uEpoch;      // 0..4 continuous (with crossfade)
uniform float uExpand;     // inflation expansion visual 1..big
uniform float uReheat;     // 0..1 reheating flash
uniform float uHiggs;      // 0..1 electroweak symmetry breaking
uniform float uHadron;     // 0..1 start of hadronization
uniform vec3  uTempColor;
uniform float uPointScale;

attribute float aSeed;
attribute float aKind;     // 0 foam, 1 plasma, 2 quark-color index proxy

varying float vAlpha;
varying vec3  vColor;
varying float vKind;

float hash(float n) { return fract(sin(n) * 43758.5453123); }

void main() {
  vKind = aKind;
  float seed = aSeed;
  vec3 pos = position;

  // Base jitter / foam flicker (Planck)
  float foam = sin(uTime * (8.0 + seed * 12.0) + seed * 40.0);
  vec3 foamOff = vec3(
    sin(uTime * 3.1 + seed * 17.0),
    cos(uTime * 2.7 + seed * 23.0),
    sin(uTime * 3.9 + seed * 11.0)
  ) * (0.08 + 0.12 * abs(foam));

  // Radial streaming during inflation
  float radial = length(pos) + 1e-4;
  vec3 dir = pos / radial;
  float inflate = mix(1.0, uExpand, smoothstep(1.5, 2.5, uEpoch));
  // Stretch fluctuations: slight noise amplification with expand
  float stretch = 1.0 + 0.35 * log(max(inflate, 1.0)) * (hash(seed * 9.1) - 0.5);
  pos *= inflate * stretch;

  // Pre-inflation foam displacement fades as we leave Planck/GUT
  float foamW = 1.0 - smoothstep(0.0, 1.8, uEpoch);
  pos += foamOff * foamW * 1.4;

  // Reheating: pull particles back toward a hot ball then explode slightly
  if (uReheat > 0.001) {
    float pull = sin(uReheat * 3.14159);
    pos = mix(pos, dir * (0.6 + hash(seed) * 0.5), pull * 0.85);
    pos += dir * uReheat * 1.5 * hash(seed * 3.3);
  }

  // Higgs phase change: spiral twist + slight collapse then settle
  if (uHiggs > 0.0) {
    float ang = uHiggs * 2.2 * (0.5 + hash(seed));
    float c = cos(ang), s = sin(ang);
    pos.xz = mat2(c, -s, s, c) * pos.xz;
    pos *= mix(1.0, 0.82, sin(uHiggs * 3.14159));
  }

  // Quark epoch: mild turbulent drift colored by aKind
  float quarkW = smoothstep(3.2, 4.0, uEpoch);
  pos += vec3(
    sin(uTime * 1.3 + seed * 5.0),
    cos(uTime * 1.1 + seed * 7.0),
    sin(uTime * 0.9 + seed * 3.0)
  ) * 0.15 * quarkW;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  float size = uPointScale * (2.2 + 2.5 * hash(seed * 1.7));
  size *= mix(1.3, 0.9, quarkW);
  size *= (1.0 + 0.8 * uReheat);
  // attenuation
  size *= 300.0 / max(3.0, -mv.z);
  gl_PointSize = clamp(size, 1.0, 48.0);

  // Color by epoch
  vec3 col = uTempColor;
  if (uEpoch < 1.0) {
    // Quantum foam: white/cyan flicker
    float f = 0.5 + 0.5 * foam;
    col = mix(vec3(0.7, 0.85, 1.0), vec3(1.0, 0.95, 0.7), f);
  } else if (uEpoch < 2.0) {
    col = mix(vec3(1.0, 0.7, 0.3), uTempColor, uEpoch - 1.0);
  } else if (uEpoch < 3.0) {
    // Inflation: cool streaks + hot core feel
    col = mix(uTempColor, vec3(1.0, 0.45, 0.2), 0.4);
    col = mix(col, vec3(0.6, 0.8, 1.0), 0.25 * (hash(seed) > 0.7 ? 1.0 : 0.0));
  } else if (uEpoch < 4.0) {
    // Electroweak: magenta/rose plasma → gain “mass” dimming after Higgs
    col = mix(vec3(1.0, 0.4, 0.75), uTempColor, 0.5);
    col *= mix(1.0, 0.75, uHiggs);
  } else {
    // Quark–gluon: RGB color charge proxy from aKind
    float k = fract(aKind);
    vec3 qcol = k < 0.33 ? vec3(1.0, 0.25, 0.2) :
                k < 0.66 ? vec3(0.25, 1.0, 0.35) :
                           vec3(0.3, 0.45, 1.0);
    col = mix(uTempColor, qcol, 0.65);
    // Hadronization: mute toward neutral hadron-ish tones
    col = mix(col, vec3(0.85, 0.75, 0.55), uHadron * 0.7);
  }

  // Reheat flash
  col = mix(col, vec3(1.0, 0.95, 0.85), uReheat * 0.85);

  vColor = col;
  vAlpha = 0.55 + 0.35 * hash(seed * 2.2);
  vAlpha *= mix(0.7, 1.0, foamW + quarkW);
}
`;

const FRAG = /* glsl */ `
precision mediump float;
varying float vAlpha;
varying vec3  vColor;
varying float vKind;

void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float r = length(uv);
  if (r > 0.5) discard;
  float soft = smoothstep(0.5, 0.05, r);
  float core = smoothstep(0.2, 0.0, r);
  vec3 col = vColor * (0.65 + 0.85 * core);
  float alpha = soft * vAlpha;
  gl_FragColor = vec4(col, alpha);
}
`;

/**
 * Adaptive particle count by device + live FPS LOD.
 */
export function createParticleSystem() {
  const IS_TOUCH = window.matchMedia('(pointer: coarse)').matches
    || navigator.maxTouchPoints > 0
    || 'ontouchstart' in window;
  const cores = navigator.hardwareConcurrency || 4;
  let targetCount = IS_TOUCH ? 6000 : 12000;
  if (cores <= 4) targetCount = Math.min(targetCount, 7000);
  if (cores <= 2) targetCount = Math.min(targetCount, 4000);

  let count = targetCount;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const kinds = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    // Ball distribution with denser core
    const u = Math.random();
    const r = Math.pow(u, 0.55) * 3.2;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(ph) * Math.cos(th);
    positions[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    positions[i * 3 + 2] = r * Math.cos(ph);
    seeds[i] = Math.random();
    kinds[i] = Math.random();
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geo.setAttribute('aKind', new THREE.BufferAttribute(kinds, 1));

  const uniforms = {
    uTime: { value: 0 },
    uEpoch: { value: 0 },
    uExpand: { value: 1 },
    uReheat: { value: 0 },
    uHiggs: { value: 0 },
    uHadron: { value: 0 },
    uTempColor: { value: new THREE.Vector3(1, 0.9, 0.6) },
    uPointScale: { value: IS_TOUCH ? 1.1 : 1.0 },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;

  // Secondary faint shell for volumetric feel
  const shellGeo = geo.clone();
  const shellMat = mat.clone();
  shellMat.uniforms = {
    uTime: uniforms.uTime,
    uEpoch: uniforms.uEpoch,
    uExpand: uniforms.uExpand,
    uReheat: uniforms.uReheat,
    uHiggs: uniforms.uHiggs,
    uHadron: uniforms.uHadron,
    uTempColor: uniforms.uTempColor,
    uPointScale: { value: (IS_TOUCH ? 1.1 : 1.0) * 1.8 },
  };
  // Re-bind shared uniform objects so updates propagate
  shellMat.uniforms.uTime = uniforms.uTime;
  shellMat.uniforms.uEpoch = uniforms.uEpoch;
  shellMat.uniforms.uExpand = uniforms.uExpand;
  shellMat.uniforms.uReheat = uniforms.uReheat;
  shellMat.uniforms.uHiggs = uniforms.uHiggs;
  shellMat.uniforms.uHadron = uniforms.uHadron;
  shellMat.uniforms.uTempColor = uniforms.uTempColor;
  const shell = new THREE.Points(shellGeo, shellMat);
  shell.frustumCulled = false;
  shell.scale.setScalar(1.15);

  const group = new THREE.Group();
  group.add(points);
  group.add(shell);

  let fpsEma = 60;
  let lodCooldown = 0;

  function applyLod(drawCount) {
    drawCount = Math.max(1500, Math.min(count, drawCount | 0));
    geo.setDrawRange(0, drawCount);
    shellGeo.setDrawRange(0, Math.floor(drawCount * 0.6));
  }
  applyLod(count);

  /**
   * @param {object} state
   * @param {number} state.time       physical t
   * @param {number} state.epochIndex 0..4
   * @param {number} state.epochBlend 0..1 blend into next
   * @param {number} state.expand     visual expansion multiplier
   * @param {number} state.reheat
   * @param {number} state.higgs
   * @param {number} state.hadron
   * @param {{r:number,g:number,b:number}} state.tempColor
   * @param {number} dt
   * @param {number} fps
   */
  function update(state, dt, fps) {
    uniforms.uTime.value += dt;
    const ep = state.epochIndex + state.epochBlend;
    uniforms.uEpoch.value = ep;
    uniforms.uExpand.value = state.expand;
    uniforms.uReheat.value = state.reheat;
    uniforms.uHiggs.value = state.higgs;
    uniforms.uHadron.value = state.hadron;
    uniforms.uTempColor.value.set(state.tempColor.r, state.tempColor.g, state.tempColor.b);

    // Slow spin for life
    group.rotation.y += dt * 0.05 * (1 + state.reheat);
    group.rotation.x = Math.sin(uniforms.uTime.value * 0.07) * 0.08;

    // Adaptive LOD
    fpsEma = fpsEma * 0.9 + fps * 0.1;
    lodCooldown -= dt;
    if (lodCooldown <= 0) {
      lodCooldown = 0.75;
      const cur = geo.drawRange.count || count;
      if (fpsEma < 28 && cur > 2000) applyLod(Math.floor(cur * 0.75));
      else if (fpsEma > 50 && cur < targetCount) applyLod(Math.min(targetCount, Math.floor(cur * 1.15)));
    }
  }

  return {
    group,
    uniforms,
    update,
    getCount: () => geo.drawRange.count || count,
    targetCount,
  };
}
