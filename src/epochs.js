/**
 * Epoch data for the first second after the Big Bang.
 * Temperatures / times are order-of-magnitude from standard cosmology
 * (PDG review, Ryden, Weinberg). Pre-inflation stages are speculative.
 *
 * Energy ↔ temperature: E(GeV) ≈ T(K) / 1.16e13  (k_B conversion).
 */

/** @typedef {'planck'|'gut'|'inflation'|'electroweak'|'quark'} EpochId */

/**
 * @typedef {object} Epoch
 * @property {EpochId} id
 * @property {string} name
 * @property {string} shortName
 * @property {number} tStart  seconds
 * @property {number} tEnd    seconds
 * @property {number} TStart  Kelvin
 * @property {number} TEnd    Kelvin
 * @property {boolean} speculative
 * @property {string} speculativeNote
 * @property {string[]} forcesUnified
 * @property {string[]} forcesSeparated
 * @property {string} particles
 * @property {string} expansion
 * @property {string[]} keyEvents
 * @property {string} explanation
 * @property {string} colorHint  hex accent for UI
 */

/** Rough k_B conversion: Kelvin → GeV */
export function kelvinToGeV(T) {
  return T / 1.160451812e13;
}

export function formatTemp(T) {
  if (!Number.isFinite(T) || T <= 0) return '—';
  if (T >= 1e3) return T.toExponential(1).replace('e+', '×10^') + ' K';
  return T.toFixed(0) + ' K';
}

export function formatEnergy(T) {
  const GeV = kelvinToGeV(T);
  if (!Number.isFinite(GeV) || GeV <= 0) return '—';
  const fmt = (x) => {
    if (x >= 1000 || x < 0.01) return x.toExponential(1).replace('e+', '×10^').replace('e-', '×10^−');
    if (x >= 100) return x.toFixed(0);
    if (x >= 10) return x.toFixed(1);
    return x.toPrecision(2);
  };
  if (GeV >= 1) return fmt(GeV) + ' GeV';
  if (GeV >= 1e-3) return fmt(GeV * 1e3) + ' MeV';
  return fmt(GeV) + ' GeV';
}

export function formatTime(t) {
  if (!Number.isFinite(t) || t < 0) return '—';
  if (t === 0) return '0 s';
  if (t < 1e-3) return t.toExponential(1).replace('e+', '×10^').replace('e-', '×10^−') + ' s';
  if (t < 1) return t.toPrecision(2) + ' s';
  return t.toFixed(2) + ' s';
}

/** Continuous blackbody-ish temperature → RGB (0–1). Hot = white/yellow → orange → red → purple → blue. */
export function tempToColor(T, out = { r: 1, g: 1, b: 1 }) {
  // Map log10(T) from ~32 (Planck) down to ~10 (end of first second ~1e10 K)
  const logT = Math.log10(Math.max(T, 1e9));
  const u = Math.min(1, Math.max(0, (32 - logT) / (32 - 10))); // 0 = hottest, 1 = coolest in our range

  // Piecewise gradient: white-yellow → orange → magenta → violet → blue
  if (u < 0.2) {
    const f = u / 0.2;
    out.r = 1; out.g = 1 - 0.25 * f; out.b = 0.75 - 0.35 * f;
  } else if (u < 0.4) {
    const f = (u - 0.2) / 0.2;
    out.r = 1; out.g = 0.75 - 0.4 * f; out.b = 0.4 - 0.15 * f;
  } else if (u < 0.6) {
    const f = (u - 0.4) / 0.2;
    out.r = 1 - 0.15 * f; out.g = 0.35 - 0.15 * f; out.b = 0.25 + 0.45 * f;
  } else if (u < 0.8) {
    const f = (u - 0.6) / 0.2;
    out.r = 0.85 - 0.35 * f; out.g = 0.2 + 0.15 * f; out.b = 0.7 + 0.2 * f;
  } else {
    const f = (u - 0.8) / 0.2;
    out.r = 0.5 - 0.25 * f; out.g = 0.35 + 0.25 * f; out.b = 0.9 + 0.05 * f;
  }
  return out;
}

/** Thermometer fill fraction 0–1 from temperature. */
export function tempToThermo(T) {
  const logT = Math.log10(Math.max(T, 1e9));
  return Math.min(1, Math.max(0.05, (logT - 10) / (32 - 10)));
}

/** @type {Epoch[]} */
export const EPOCHS = [
  {
    id: 'planck',
    name: 'Planck Epoch',
    shortName: 'Planck',
    tStart: 0,
    tEnd: 1e-43,
    TStart: 1e32,
    TEnd: 1e32,
    speculative: true,
    speculativeNote: 'Quantum gravity is unknown — all details here are speculative.',
    forcesUnified: ['Gravity', 'Strong', 'Electroweak'],
    forcesSeparated: [],
    particles: 'No classical particles; spacetime itself is a quantum foam of fluctuating geometry.',
    expansion: 'Causal structure at the Planck length (~1.6×10⁻³⁵ m); classical GR breaks down.',
    keyEvents: [
      't ≈ 0 — Big Bang singularity (classical extrapolation)',
      't ~ 10⁻⁴³ s — Planck time; quantum gravity would dominate',
    ],
    explanation:
      'The Planck epoch is the earliest conceivable slice of cosmic history. Temperatures and energies sit at the Planck scale (~10¹⁹ GeV), where gravity must be quantized and our usual spacetime picture fails. There is no accepted theory of quantum gravity, so every visualization of this era is an educated guess. We render a flickering “quantum foam” to suggest fluctuating geometry — not a literal model.',
    colorHint: '#fff6c8',
  },
  {
    id: 'gut',
    name: 'Grand Unification Epoch',
    shortName: 'GUT',
    tStart: 1e-43,
    tEnd: 1e-36,
    TStart: 1e29,
    TEnd: 1e28,
    speculative: true,
    speculativeNote: 'Grand Unified Theories are hypothetical; no GUT is experimentally confirmed.',
    forcesUnified: ['Strong', 'Electroweak'],
    forcesSeparated: ['Gravity'],
    particles: 'Hypothetical X/Y gauge bosons; a single GUT force acts on a hot particle plasma.',
    expansion: 'Radiation-dominated; gravity has already separated from the other interactions.',
    keyEvents: [
      'Gravity decouples from the unified strong–electroweak force',
      'Possible GUT-scale phase transitions (model-dependent)',
    ],
    explanation:
      'Between the Planck and inflationary eras, many theories posit a Grand Unified Theory (GUT) in which the strong and electroweak forces are still one. Gravity has already split off. Temperatures of ~10²⁸–10²⁹ K (~10¹⁵–10¹⁶ GeV) are far beyond collider reach. GUTs remain speculative — beautiful ideas without a confirmed experimental smoking gun.',
    colorHint: '#ffb347',
  },
  {
    id: 'inflation',
    name: 'Inflationary Epoch',
    shortName: 'Inflation',
    tStart: 1e-36,
    tEnd: 1e-32,
    TStart: 1e28,
    TEnd: 1e27,
    speculative: false, // inflation itself is well-supported; mechanism is unknown
    speculativeNote: 'Inflation is strongly supported by the CMB, but the inflaton field and exact mechanism are unknown.',
    forcesUnified: ['Strong', 'Electroweak'],
    forcesSeparated: ['Gravity'],
    particles: 'Inflaton-dominated vacuum energy; ordinary particles diluted to near zero, then recreated at reheating.',
    expansion: 'Exponential expansion by ≳ e⁶⁰ (~10²⁶) — smooths and flattens the universe; stretches quantum fluctuations into classical seeds.',
    keyEvents: [
      '~60 e-folds of exponential expansion (≳ 10²⁶ in scale factor)',
      'Quantum fluctuations stretched to super-horizon scales',
      'Reheating — inflaton decays into a hot particle soup',
    ],
    explanation:
      'Cosmic inflation is a brief burst of accelerating expansion that solves the horizon and flatness problems and plants the seeds of galaxies. Observations (Planck 2018 and others) find a nearly scale-invariant spectrum of primordial fluctuations, matching simple inflationary predictions. The driving “inflaton” field is still unidentified. Watch the expansion factor soar, then flash into reheating.',
    colorHint: '#ff6b3d',
  },
  {
    id: 'electroweak',
    name: 'Electroweak Epoch',
    shortName: 'Electroweak',
    tStart: 1e-32,
    tEnd: 1e-12,
    TStart: 1e28,
    TEnd: 1e15,
    speculative: false,
    speculativeNote: '',
    forcesUnified: ['Electroweak'],
    forcesSeparated: ['Gravity', 'Strong'],
    particles: 'Massless quarks, leptons, gluons, photons, W/Z (massless above the critical temperature); Higgs field in symmetric phase.',
    expansion: 'Radiation-dominated cooling after reheating; scale factor grows as ~ t¹ᐟ².',
    keyEvents: [
      'Strong force separates from electroweak after inflation/reheating',
      't ~ 10⁻¹² s, T ~ 10¹⁵ K (~100–160 GeV) — electroweak symmetry breaking',
      'Higgs field acquires a vacuum expectation value; W± and Z gain mass',
    ],
    explanation:
      'After inflation ends and reheats the cosmos, the strong force has split from a still-unified electroweak force. Particles are effectively massless while the Higgs field sits in its symmetric phase. Around 10⁻¹² s and ~160 GeV, the electroweak symmetry breaks: the Higgs “turns on,” W and Z bosons become heavy, and electromagnetism separates from the weak force — the Standard Model as we know it emerges.',
    colorHint: '#ff7aaa',
  },
  {
    id: 'quark',
    name: 'Quark Epoch',
    shortName: 'Quark',
    tStart: 1e-12,
    tEnd: 1,
    TStart: 1e15,
    TEnd: 1e10,
    speculative: false,
    speculativeNote: '',
    forcesUnified: [],
    forcesSeparated: ['Gravity', 'Strong', 'Electromagnetic', 'Weak'],
    particles: 'Quark–gluon plasma (u, d, s, … + gluons) with leptons and photons; four forces now distinct.',
    expansion: 'Continues radiation-dominated expansion and cooling toward ~10¹⁰ K by t ≈ 1 s.',
    keyEvents: [
      'Four forces fully separated',
      't ~ 10⁻⁶ s, T ~ 10¹² K (~150–200 MeV) — quark–hadron transition begins',
      'Quarks confine into hadrons (protons, neutrons, mesons) — hadron epoch follows',
      'Simulation ends at t = 1 s (still pre-nucleosynthesis; BBN starts ~10–100 s)',
    ],
    explanation:
      'With electroweak symmetry broken, the universe is a seething quark–gluon plasma. All four forces act separately. Around a microsecond and ~10¹² K, the strong force confines quarks into hadrons — the start of the hadron epoch. We continue the cooling track to one second: still far hotter than the Sun’s core, and before Big Bang nucleosynthesis forges the first nuclei.',
    colorHint: '#6ec8ff',
  },
];

export function epochAtTime(t) {
  for (let i = EPOCHS.length - 1; i >= 0; i--) {
    if (t >= EPOCHS[i].tStart) return EPOCHS[i];
  }
  return EPOCHS[0];
}

export function epochIndexAtTime(t) {
  for (let i = EPOCHS.length - 1; i >= 0; i--) {
    if (t >= EPOCHS[i].tStart) return i;
  }
  return 0;
}

/** Interpolate temperature across epochs (log-log in time within each epoch). */
export function temperatureAt(t) {
  const ep = epochAtTime(t);
  if (t <= ep.tStart) return ep.TStart;
  if (t >= ep.tEnd) return ep.TEnd;
  const t0 = Math.max(ep.tStart, 1e-50);
  const t1 = Math.max(ep.tEnd, t0 * 1.0001);
  const u = (Math.log(t) - Math.log(t0)) / (Math.log(t1) - Math.log(t0));
  const logT = Math.log(ep.TStart) + u * (Math.log(ep.TEnd) - Math.log(ep.TStart));
  return Math.exp(logT);
}
