/**
 * OrbitControls camera rig with gentle defaults for a particle cosmos.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createCamera(renderer) {
  const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 500);
  camera.position.set(0, 2.2, 7.5);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 1.2;
  controls.maxDistance = 28;
  controls.target.set(0, 0, 0);
  controls.enablePan = true;
  // Touch: one-finger rotate, two-finger zoom/pan (OrbitControls default)

  function resize(w, h) {
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }

  function update() {
    controls.update();
  }

  /** Soft pull during inflation so expansion feels camera-relative. */
  function setInflationPull(amount) {
    // amount 0–1: ease camera out a bit
    const base = 7.5;
    const far = 14;
    const d = base + (far - base) * amount;
    const dir = camera.position.clone().sub(controls.target).normalize();
    const desired = controls.target.clone().add(dir.multiplyScalar(d));
    camera.position.lerp(desired, 0.04);
  }

  return { camera, controls, resize, update, setInflationPull };
}
