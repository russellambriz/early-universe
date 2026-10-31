/**
 * Early Universe — main orchestrator.
 * Plain ES modules + Three.js 0.160 from CDN import map (no build step).
 */
import * as THREE from 'three';
import { EPOCHS, epochIndexAtTime, temperatureAt, tempToColor } from './epochs.js';
import {
  timeToNorm, normToTime, scaleFactorAt, advanceNorm, T_MIN,
} from './timeline.js';
import { createParticleSystem } from './particles.js';
import { createEffects } from './effects.js';
import { createCamera } from './camera.js';
import { createUI } from './ui.js';

const container = document.getElementById('scene');

// ---------------------------------------------------------------------------
// Renderer / scene
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
  alpha: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x050510, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050510, 0.028);

const { camera, controls, resize: resizeCam, update: updateCam, setInflationPull } = createCamera(renderer);

// Soft ambient fill so bloom has something in the dark
scene.add(new THREE.AmbientLight(0x1a1040, 0.4));

const particles = createParticleSystem();
scene.add(particles.group);

const effects = createEffects(renderer, scene, camera);

// ---------------------------------------------------------------------------
// Simulation state
// ---------------------------------------------------------------------------
const state = {
  time: 0,           // physical seconds
  playing: false,
  logScale: true,
  speedIndex: 2,
  tempColor: { r: 1, g: 0.95, b: 0.7 },
};

function setTime(t) {
  state.time = Math.min(1, Math.max(0, t));
}
function getTime() { return state.time; }
function setPlaying(p) { state.playing = p; }
function setLogScale(v) { state.logScale = v; }
function setSpeedIndex(i) { state.speedIndex = i; }

const ui = createUI({
  setTime, getTime, setPlaying, setLogScale, setSpeedIndex,
});

// ---------------------------------------------------------------------------
// Derived visual parameters from physical time
// ---------------------------------------------------------------------------
const _col = { r: 1, g: 1, b: 1 };

function visualState(t) {
  const idx = epochIndexAtTime(t);
  const ep = EPOCHS[idx];
  const next = EPOCHS[Math.min(EPOCHS.length - 1, idx + 1)];

  // Smooth crossfade near epoch boundaries (in log-time space)
  let blend = 0;
  if (idx < EPOCHS.length - 1 && t > 0) {
    const edge0 = Math.log(Math.max(ep.tEnd * 0.3, T_MIN));
    const edge1 = Math.log(Math.max(ep.tEnd, T_MIN));
    const lt = Math.log(Math.max(t, T_MIN));
    blend = THREE.MathUtils.clamp((lt - edge0) / Math.max(1e-9, edge1 - edge0), 0, 1);
    if (t < ep.tEnd * 0.3) blend = 0;
  }

  const T = temperatureAt(t);
  tempToColor(T, _col);

  // Expansion visual during inflation (a goes aStart→1; ratio → e^60)
  let expand = 1;
  const a = scaleFactorAt(t);
  const aStart = Math.exp(-60);
  if (t >= 1e-36 && t <= 1e-32) {
    expand = Math.max(1, a / aStart);
  } else if (t > 1e-32) {
    // Residual size cue from post-inflation growth
    expand = 1 + Math.min(8, Math.log10(Math.max(a, 1)) * 0.45);
  }

  // Reheating flash near end of inflation
  let reheat = 0;
  if (t >= 1e-33 && t <= 3e-32) {
    const u = (Math.log(t) - Math.log(1e-33)) / (Math.log(3e-32) - Math.log(1e-33));
    reheat = Math.sin(Math.min(1, Math.max(0, u)) * Math.PI);
  }

  // Higgs turn-on near 1e-12 s
  let higgs = 0;
  if (t >= 3e-13 && t <= 5e-12) {
    const u = (Math.log(t) - Math.log(3e-13)) / (Math.log(5e-12) - Math.log(3e-13));
    higgs = THREE.MathUtils.smoothstep(0, 1, u);
  } else if (t > 5e-12) {
    higgs = 1;
  }

  // Hadronization onset ~1e-6 s
  let hadron = 0;
  if (t >= 3e-7 && t <= 3e-6) {
    const u = (Math.log(t) - Math.log(3e-7)) / (Math.log(3e-6) - Math.log(3e-7));
    hadron = THREE.MathUtils.smoothstep(0, 1, u);
  } else if (t > 3e-6) {
    hadron = Math.min(1, 0.55 + 0.2 * Math.log10(Math.max(t, 1e-6) / 1e-6) / 6);
  }

  return {
    time: t,
    epochIndex: idx,
    epochBlend: blend * 0.999,
    expand,
    reheat,
    higgs,
    hadron,
    tempColor: { r: _col.r, g: _col.g, b: _col.b },
    scaleFactor: a,
  };
}

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  resizeCam(w, h);
  effects.resize(w, h);
}
window.addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------
let last = performance.now();
let frames = 0;
let fpsClock = performance.now();
let fps = 60;

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  frames++;
  if (now - fpsClock > 500) {
    fps = (frames * 1000) / (now - fpsClock);
    frames = 0;
    fpsClock = now;
  }

  if (state.playing) {
    const u = timeToNorm(state.time, state.logScale);
    const u2 = advanceNorm(u, dt, state.speedIndex, state.logScale);
    state.time = normToTime(u2, state.logScale);
    if (u2 >= 1) {
      state.time = 1;
      state.playing = false;
      // sync play button label
      const btn = document.getElementById('play-btn');
      if (btn) btn.textContent = '▶ Play';
    }
    ui.updateReadouts(state.time);
  }

  const vs = visualState(state.time);
  state.tempColor = vs.tempColor;

  // Background tint follows temperature
  const bg = new THREE.Color().setRGB(
    vs.tempColor.r * 0.02,
    vs.tempColor.g * 0.015,
    vs.tempColor.b * 0.045 + 0.015,
  );
  renderer.setClearColor(bg, 1);
  scene.fog.color.copy(bg);

  particles.update(vs, dt, fps);
  effects.update(vs);

  if (vs.epochIndex === 2) {
    const pull = Math.min(1, Math.log10(vs.expand + 1) / 26);
    setInflationPull(pull);
  }

  updateCam();
  effects.render();
}

requestAnimationFrame(frame);

// Ready for Playwright / external hooks
window.earlyUniverse = {
  THREE,
  getTime,
  setTime: (t) => { setTime(t); ui.updateReadouts(state.time); },
  setPlaying,
  isPlaying: () => state.playing,
  isLogScale: () => state.logScale,
  setLogScale: (v) => {
    state.logScale = v;
    const el = document.getElementById('toggle-log');
    if (el) { el.checked = v; el.dispatchEvent(new Event('change')); }
  },
  jumpToStage: (i) => {
    const ep = EPOCHS[i];
    if (!ep) return;
    setTime(ep.tStart === 0 ? 0 : ep.tStart * 1.0001);
    ui.updateReadouts(state.time);
  },
  getEpochIndex: () => epochIndexAtTime(state.time),
  getVisualState: () => visualState(state.time),
  getParticleCount: () => particles.getCount(),
  EPOCHS,
  version: '1.0.0',
};

ui.hideLoading();
console.info('[early-universe] ready · particles', particles.targetCount);
