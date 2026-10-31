/**
 * DOM UI: panels, scrubber, stage jumps, help, keyboard, toggles.
 */
import {
  EPOCHS, epochAtTime, epochIndexAtTime, temperatureAt,
  formatTemp, formatEnergy, formatTime, tempToThermo,
} from './epochs.js';
import {
  timeToNorm, normToTime, epochMarks, scaleFactorAt, formatScaleFactor,
  SPEED_LABELS, T_MIN,
} from './timeline.js';

/**
 * @param {object} api callbacks into the sim
 */
export function createUI(api) {
  const IS_TOUCH = window.matchMedia('(pointer: coarse)').matches
    || navigator.maxTouchPoints > 0
    || 'ontouchstart' in window;
  document.body.classList.toggle('touch', IS_TOUCH);

  const els = {
    play: document.getElementById('play-btn'),
    reset: document.getElementById('reset-btn'),
    fullscreen: document.getElementById('fullscreen-btn'),
    speed: document.getElementById('speed'),
    speedValue: document.getElementById('speed-value'),
    timeline: document.getElementById('timeline'),
    timeDisplay: document.getElementById('time-display'),
    scaleDisplay: document.getElementById('scale-display'),
    expansionFlash: document.getElementById('expansion-flash'),
    toggleLog: document.getElementById('toggle-log'),
    toggleLabels: document.getElementById('toggle-labels'),
    toggleExplain: document.getElementById('toggle-explain'),
    stageButtons: document.getElementById('stage-buttons'),
    stageName: document.getElementById('stage-name'),
    stageBadge: document.getElementById('stage-badge'),
    speculative: document.getElementById('speculative-badge'),
    statTime: document.getElementById('stat-time'),
    statTemp: document.getElementById('stat-temp'),
    statEnergy: document.getElementById('stat-energy'),
    statScale: document.getElementById('stat-scale'),
    forceDiagram: document.getElementById('force-diagram'),
    physics: document.getElementById('stage-physics'),
    events: document.getElementById('stage-events'),
    explain: document.getElementById('stage-explain'),
    thermoFill: document.getElementById('thermo-fill'),
    thermoValue: document.getElementById('thermo-value'),
    epochMarks: document.getElementById('epoch-marks'),
    helpBtn: document.getElementById('help-btn'),
    helpOverlay: document.getElementById('help-overlay'),
    helpClose: document.getElementById('help-close'),
    loading: document.getElementById('loading'),
  };

  let playing = false;
  let logScale = true;
  let speedIndex = 2;
  let scrubbing = false;
  let lastEpochId = '';

  // Collapse buttons
  document.querySelectorAll('.collapse-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const panel = document.getElementById(btn.dataset.target);
      if (!panel) return;
      const collapsed = panel.classList.toggle('collapsed');
      btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      btn.textContent = collapsed ? '▸' : '▾';
    });
  });

  // Stage selector buttons
  EPOCHS.forEach((ep, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.epoch = ep.id;
    b.innerHTML = `<span class="num">${i + 1}</span>${ep.shortName}`;
    b.title = ep.name + (ep.speculative ? ' (speculative)' : '');
    b.addEventListener('click', () => {
      const t = ep.tStart === 0 ? 0 : ep.tStart * 1.0001;
      api.setTime(t);
      refreshEpochMarks();
      updateReadouts(t);
    });
    els.stageButtons.appendChild(b);
  });

  function refreshEpochMarks() {
    els.epochMarks.innerHTML = '';
    epochMarks(logScale).forEach((m) => {
      const d = document.createElement('div');
      d.className = 'epoch-mark';
      d.style.left = (m.u * 100) + '%';
      d.textContent = m.shortName;
      els.epochMarks.appendChild(d);
    });
  }
  refreshEpochMarks();

  function renderForces(ep) {
    els.forceDiagram.innerHTML = '';
    ep.forcesUnified.forEach((f) => {
      const s = document.createElement('span');
      s.className = 'force-chip unified';
      s.textContent = f + ' unified';
      els.forceDiagram.appendChild(s);
    });
    ep.forcesSeparated.forEach((f) => {
      const s = document.createElement('span');
      s.className = 'force-chip split';
      s.textContent = f + ' separate';
      els.forceDiagram.appendChild(s);
    });
    if (!ep.forcesUnified.length && !ep.forcesSeparated.length) {
      const s = document.createElement('span');
      s.className = 'force-chip partial';
      s.textContent = 'Forces undefined';
      els.forceDiagram.appendChild(s);
    }
  }

  function updateStagePanel(t) {
    const ep = epochAtTime(t);
    const idx = epochIndexAtTime(t);
    if (ep.id !== lastEpochId) {
      lastEpochId = ep.id;
      els.stageName.textContent = ep.name;
      els.stageBadge.textContent = `Stage ${idx + 1} / ${EPOCHS.length}`;
      els.speculative.hidden = !ep.speculative;
      if (ep.speculative) {
        els.speculative.textContent = '⚠ SPECULATIVE';
        els.speculative.title = ep.speculativeNote || '';
      } else if (ep.speculativeNote) {
        els.speculative.hidden = false;
        els.speculative.textContent = 'ℹ Note';
        els.speculative.title = ep.speculativeNote;
      }
      renderForces(ep);
      els.physics.innerHTML =
        `<strong>Particles:</strong> ${ep.particles}<br/>` +
        `<strong>Expansion:</strong> ${ep.expansion}`;
      els.events.innerHTML =
        `<strong>Key events</strong><ul>${ep.keyEvents.map((e) => `<li>${e}</li>`).join('')}</ul>`;
      els.explain.textContent = ep.explanation;
      els.stageButtons.querySelectorAll('button').forEach((b) => {
        b.classList.toggle('current', b.dataset.epoch === ep.id);
      });
    }

    const T = temperatureAt(t);
    const a = scaleFactorAt(t);
    els.statTime.textContent = `${formatTime(ep.tStart)} → ${formatTime(ep.tEnd)}`;
    els.statTemp.textContent = formatTemp(T);
    els.statEnergy.textContent = formatEnergy(T);
    els.statScale.textContent = formatScaleFactor(a).replace(/^a ≈ /, '');
  }

  function updateReadouts(t) {
    const T = temperatureAt(t);
    const a = scaleFactorAt(t);
    els.timeDisplay.textContent = 't = ' + formatTime(t);
    els.scaleDisplay.textContent = formatScaleFactor(a);
    els.thermoValue.textContent = formatTemp(T);
    const frac = tempToThermo(T);
    els.thermoFill.style.height = (frac * 100) + '%';

    // Inflation dramatic readout
    const inInflation = t >= 1e-36 && t <= 1e-32;
    els.expansionFlash.hidden = !inInflation;
    if (inInflation) {
      const u = (Math.log(Math.max(t, 1e-36)) - Math.log(1e-36)) / (Math.log(1e-32) - Math.log(1e-36));
      const efolds = (60 * u).toFixed(1);
      els.expansionFlash.textContent = `INFLATING · ~${efolds} e-folds`;
    }

    if (!scrubbing) {
      const u = timeToNorm(t, logScale);
      els.timeline.value = String(u * 1000);
    }
    updateStagePanel(t);
  }

  function setPlaying(p) {
    playing = p;
    els.play.textContent = playing ? '⏸ Pause' : '▶ Play';
    api.setPlaying(playing);
  }

  els.play.addEventListener('click', () => setPlaying(!playing));
  els.reset.addEventListener('click', () => {
    api.setTime(0);
    setPlaying(false);
    updateReadouts(0);
  });
  els.fullscreen.addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  });

  els.speed.addEventListener('input', () => {
    speedIndex = Number(els.speed.value);
    els.speedValue.textContent = SPEED_LABELS[speedIndex] || '1×';
    api.setSpeedIndex(speedIndex);
  });
  els.speedValue.textContent = SPEED_LABELS[speedIndex];
  api.setSpeedIndex(speedIndex);

  els.toggleLog.addEventListener('change', () => {
    const t = api.getTime();
    logScale = els.toggleLog.checked;
    api.setLogScale(logScale);
    refreshEpochMarks();
    updateReadouts(t);
  });
  els.toggleLabels.addEventListener('change', () => {
    document.body.classList.toggle('hide-labels', !els.toggleLabels.checked);
  });
  els.toggleExplain.addEventListener('change', () => {
    document.body.classList.toggle('hide-explain', !els.toggleExplain.checked);
  });

  const onScrub = () => {
    const u = Number(els.timeline.value) / 1000;
    const t = normToTime(u, logScale);
    api.setTime(t);
    updateReadouts(t);
  };
  els.timeline.addEventListener('pointerdown', () => { scrubbing = true; setPlaying(false); });
  els.timeline.addEventListener('pointerup', () => { scrubbing = false; });
  els.timeline.addEventListener('input', onScrub);

  function openHelp(show) {
    els.helpOverlay.hidden = !show;
  }
  els.helpBtn.addEventListener('click', () => openHelp(true));
  els.helpClose.addEventListener('click', () => openHelp(false));
  els.helpOverlay.addEventListener('click', (e) => {
    if (e.target === els.helpOverlay) openHelp(false);
  });

  // Keyboard
  window.addEventListener('keydown', (e) => {
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    switch (e.key) {
      case ' ':
        e.preventDefault();
        setPlaying(!playing);
        break;
      case 'ArrowLeft': {
        const u = timeToNorm(api.getTime(), logScale) - 0.01;
        api.setTime(normToTime(u, logScale));
        updateReadouts(api.getTime());
        break;
      }
      case 'ArrowRight': {
        const u = timeToNorm(api.getTime(), logScale) + 0.01;
        api.setTime(normToTime(u, logScale));
        updateReadouts(api.getTime());
        break;
      }
      case 'l': case 'L':
        els.toggleLog.checked = !els.toggleLog.checked;
        els.toggleLog.dispatchEvent(new Event('change'));
        break;
      case 'r': case 'R':
        els.reset.click();
        break;
      case 'f': case 'F':
        els.fullscreen.click();
        break;
      case '?': case 'h': case 'H':
        openHelp(els.helpOverlay.hidden);
        break;
      case 'Escape':
        openHelp(false);
        break;
      case '1': case '2': case '3': case '4': case '5': {
        const i = Number(e.key) - 1;
        const ep = EPOCHS[i];
        if (ep) {
          api.setTime(ep.tStart === 0 ? 0 : ep.tStart * 1.0001);
          updateReadouts(api.getTime());
        }
        break;
      }
      default: break;
    }
  });

  function hideLoading() {
    els.loading.classList.add('hidden');
    setTimeout(() => { els.loading.style.display = 'none'; }, 600);
  }

  // Expose for tests
  const uiApi = {
    updateReadouts,
    hideLoading,
    isPlaying: () => playing,
    isLogScale: () => logScale,
    getSpeedIndex: () => speedIndex,
    openHelp,
  };

  updateReadouts(0);
  return uiApi;
}
