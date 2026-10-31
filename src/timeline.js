/**
 * Log / linear time mapping for the cosmic scrubber.
 *
 * Physical time spans ~44 orders of magnitude (0 → 1 s, with a tiny floor
 * near the Planck time). A linear slider would crush Planck→Inflation into
 * an invisible sliver — log is the default for a reason.
 */

import { EPOCHS } from './epochs.js';

/** Smallest positive time we treat as “start” for log mapping (just below Planck). */
export const T_MIN = 1e-45;
export const T_MAX = 1; // end of simulation: 1 second

/**
 * Map physical time t ∈ [0, T_MAX] ↔ normalized u ∈ [0, 1].
 * When logScale is true, use log10 from T_MIN to T_MAX (t=0 → u=0).
 */
export function timeToNorm(t, logScale = true) {
  if (t <= 0) return 0;
  if (t >= T_MAX) return 1;
  if (!logScale) return t / T_MAX;
  const a = Math.log10(T_MIN);
  const b = Math.log10(T_MAX);
  const x = Math.log10(Math.max(t, T_MIN));
  return (x - a) / (b - a);
}

export function normToTime(u, logScale = true) {
  u = Math.min(1, Math.max(0, u));
  if (u <= 0) return 0;
  if (!logScale) return u * T_MAX;
  const a = Math.log10(T_MIN);
  const b = Math.log10(T_MAX);
  return Math.pow(10, a + u * (b - a));
}

/** Epoch boundary positions on the scrubber (0–1). */
export function epochMarks(logScale = true) {
  return EPOCHS.map((ep) => ({
    id: ep.id,
    shortName: ep.shortName,
    u: timeToNorm(Math.max(ep.tStart, T_MIN * 10), logScale),
    tStart: ep.tStart,
  }));
}

/**
 * Approximate expansion scale factor a(t), normalized so a(t_end_inflation reheating) ~ 1
 * before a dramatic inflationary stretch is applied in the visual layer.
 *
 * For education we show:
 *   - pre-inflation: a ≈ tiny constant
 *   - inflation: a grows by ~ e^{60 * progress} (≳ 10^26)
 *   - post: radiation-era a ∝ t^{1/2} relative to reheating
 */
export function scaleFactorAt(t) {
  const tInf0 = 1e-36;
  const tInf1 = 1e-32;
  const N_EFOLDS = 60;

  if (t <= 0) return 1e-30;
  if (t < tInf0) {
    // Nearly frozen pre-inflation (toy)
    return 1e-28;
  }
  if (t <= tInf1) {
    const u = (Math.log(t) - Math.log(tInf0)) / (Math.log(tInf1) - Math.log(tInf0));
    // a_end / a_start = e^60
    return 1e-28 * Math.exp(N_EFOLDS * u);
  }
  // Post-inflation: a ∝ √t, matched at reheating
  const aReheat = 1e-28 * Math.exp(N_EFOLDS);
  return aReheat * Math.sqrt(t / tInf1);
}

export function formatScaleFactor(a) {
  if (!Number.isFinite(a) || a <= 0) return '—';
  if (a >= 1e4 || a < 1e-3) return 'a ≈ ' + a.toExponential(1).replace('e+', '×10^').replace('e-', '×10^−');
  return 'a ≈ ' + a.toPrecision(3);
}

/**
 * Playback: advance normalized time based on speed index.
 * Speeds are tuned so a full log-scale run takes a pleasant duration.
 */
export const SPEED_LABELS = ['1/8×', '¼×', '½×', '1×', '2×', '4×', '8×'];
export const SPEED_MULT = [0.125, 0.25, 0.5, 1, 2, 4, 8];

/** Seconds of wall-clock for a full 0→1 log scrub at 1×. */
export const FULL_RUN_SECONDS = 45;

export function advanceNorm(u, dtWall, speedIndex, logScale) {
  const mult = SPEED_MULT[speedIndex] ?? 1;
  const du = (dtWall / FULL_RUN_SECONDS) * mult;
  return Math.min(1, u + du);
}
