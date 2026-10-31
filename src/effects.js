/**
 * Post-processing: UnrealBloomPass via EffectComposer + a soft volumetric
 * core sprite that reacts to temperature / reheating / Higgs.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

function makeGlowTexture() {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,220,160,0.7)');
  g.addColorStop(0.55, 'rgba(255,100,60,0.25)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createEffects(renderer, scene, camera) {
  const size = new THREE.Vector2();
  renderer.getSize(size);

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.45, 0.4, 0.35);
  composer.addPass(bloom);

  // three@0.160 OutputPass handles color-space conversion after bloom
  let outputPass = null;
  try {
    outputPass = new OutputPass();
    composer.addPass(outputPass);
  } catch (_) {
    // older CDN edge case — ignore
  }

  // Volumetric-ish core glow (additive sprite stack)
  const glowTex = makeGlowTexture();
  const glowMat = new THREE.SpriteMaterial({
    map: glowTex,
    color: 0xffcc88,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.28,
  });
  const glow = new THREE.Sprite(glowMat);
  glow.scale.set(6, 6, 1);
  scene.add(glow);

  const hazeMat = new THREE.SpriteMaterial({
    map: glowTex,
    color: 0xff6644,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.12,
  });
  const haze = new THREE.Sprite(hazeMat);
  haze.scale.set(12, 12, 1);
  scene.add(haze);

  function resize(w, h) {
    composer.setSize(w, h);
    bloom.setSize(w, h);
  }

  /**
   * Drive glow from sim state.
   */
  function update(state) {
    const { tempColor, reheat, higgs, expand, epochIndex } = state;
    glowMat.color.setRGB(tempColor.r, tempColor.g, tempColor.b);
    hazeMat.color.setRGB(
      Math.min(1, tempColor.r * 0.9 + 0.1),
      tempColor.g * 0.7,
      tempColor.b * 0.5,
    );

    const base = 0.18 + 0.2 * Math.min(1, Math.log10(expand + 1) / 10);
    glowMat.opacity = Math.min(0.55, base + reheat * 0.45 + higgs * 0.1);
    hazeMat.opacity = Math.min(0.35, 0.08 + reheat * 0.35);

    const gScale = 3.2 + Math.min(5, Math.log10(expand + 1) * 0.55) + reheat * 4;
    glow.scale.setScalar(gScale);
    haze.scale.setScalar(gScale * 1.9);

    // Bloom — keep restrained so particles stay visible (swiftshader blows out easily)
    let strength = 0.35;
    if (epochIndex <= 0) strength = 0.5;
    if (epochIndex === 2) strength = 0.4 + Math.min(0.35, Math.log10(expand + 1) / 30);
    strength += reheat * 0.7;
    strength += higgs * 0.2;
    bloom.strength = Math.min(1.1, strength);
    bloom.radius = 0.35 + reheat * 0.25;
    bloom.threshold = 0.25;
  }

  function render() {
    composer.render();
  }

  return { composer, bloom, glow, haze, resize, update, render };
}
