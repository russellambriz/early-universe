# Early Universe — First Second After the Big Bang

An interactive 3D educational simulation of the key epochs in the universe’s **first second**, built with plain HTML/CSS/JS ES modules and [Three.js](https://threejs.org/) **0.160** from a CDN import map (no build step).

**Live:** https://russellambriz.github.io/early-universe/

**Repo:** https://github.com/russellambriz/early-universe

---

## How to run

### GitHub Pages
Open the live link above.

### Locally
Serve the folder over HTTP (ES modules + import maps need a server, not `file://`):

```bash
cd early-universe
python3 -m http.server 8080
```

Then visit http://127.0.0.1:8080/

---

## Stages (in order)

| # | Epoch | Time | Temperature (order of magnitude) | Notes |
|---|--------|------|-------------------------------------|--------|
| 1 | **Planck** | 0 → ~10⁻⁴³ s | ~10³² K | Quantum foam visual. **Speculative** — quantum gravity unknown. |
| 2 | **Grand Unification** | ~10⁻⁴³ → 10⁻³⁶ s | ~10²⁹ → 10²⁸ K | Strong + electroweak unified; gravity separate. **Speculative** GUT. |
| 3 | **Inflation** | ~10⁻³⁶ → 10⁻³² s | ~10²⁸ K | ≳10²⁶ expansion (~60 e-folds), stretched fluctuations, reheating flash. Inflation is well supported; the inflaton mechanism is unknown. |
| 4 | **Electroweak** | ~10⁻³² → 10⁻¹² s | ~10²⁸ → 10¹⁵ K | Massless plasma; Higgs turns on at ~10⁻¹² s (~100–160 GeV); W/Z gain mass. |
| 5 | **Quark** | ~10⁻¹² s → **1 s** | ~10¹⁵ → 10¹⁰ K | Quark–gluon plasma; four forces separate; hadronization begins ~10⁻⁶ s. |

Smooth crossfades blend visuals between stages. A continuous temperature→color gradient and a cooling thermometer track energy density. The scale-factor readout updates throughout; inflation is emphasized with a live e-fold counter.

---

## Controls

- **Play / Pause** — Space
- **Scrub** timeline — drag the slider, or ← →
- **Log / linear** timeline — `L` (log is default; linear crushes early epochs into a sliver)
- **Speed** — slider ⅛× … 8×
- **Stage jump** — buttons or keys `1`–`5`
- **Camera** — orbit / zoom / pan (OrbitControls; touch-friendly)
- **Labels / explanations** — toggles
- **Fullscreen** — `F`
- **Help** — `?` or `H`

---

## Architecture

```
index.html          Shell + import map (three / three/addons/)
style.css           Dark cosmic UI, safe-area / touch
src/main.js         Scene, loop, visual-state derivation, window.earlyUniverse
src/timeline.js     Log/linear mapping, scale factor, playback rates
src/epochs.js       Epoch data, T(t), formatting, temp→color
src/particles.js    GPU Points + custom shaders, adaptive LOD
src/effects.js      EffectComposer + UnrealBloomPass, glow sprites
src/camera.js       OrbitControls rig
src/ui.js           Panels, scrubber, keyboard, help overlay
```

Performance: particle count adapts to touch devices and live FPS (LOD draw-range).

---

## Scientific grounding & caveats

Visuals are **educational approximations**, not research simulations.

- **Planck & GUT eras** are labeled **SPECULATIVE**. There is no established quantum gravity; GUTs are unconfirmed.
- **Inflation** matches the broad picture favored by CMB data (e.g. Planck 2018): a nearly scale-invariant spectrum of primordial fluctuations, spatial flatness, and large-scale homogeneity. The inflaton field and microphysics are unknown.
- **Electroweak symmetry breaking** and the **quark–gluon plasma** / hadronization transition are Standard Model / QCD physics, with temperatures and times given as order-of-magnitude values commonly cited in cosmology texts.
- The timeline ends at **1 s** (still before Big Bang nucleosynthesis, which begins ~10–100 s).

### Sources (starting points)

- Planck Collaboration, 2018 cosmological parameters ([A&A 641, A6](https://www.aanda.org/articles/aa/abs/2020/09/aa33910-18/aa33910-18.html))
- Particle Data Group (PDG) reviews on cosmology & Big Bang
- Barbara Ryden, *Introduction to Cosmology*
- Steven Weinberg, *Cosmology*
- Standard QGP / QCD crossover literature (~150–200 MeV)

---

## License

Educational demo. Three.js is MIT-licensed.
