/**
 * Headless verification for early-universe.
 * CommonJS require of playwright-core (from /workspace/node_modules via walk-up).
 */
const { chromium, devices } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const port = fs.readFileSync('/tmp/euport', 'utf8').trim();
const base = `http://127.0.0.1:${port}/`;
const shotDir = '/workspace/early-universe/shots';
fs.mkdirSync(shotDir, { recursive: true });

const STAGE_NAMES = ['planck', 'gut', 'inflation', 'electroweak', 'quark'];

const cfgs = [
  ['desktop', { viewport: { width: 1440, height: 900 } }],
  ['ipad-portrait', { ...devices['iPad Pro 11'] }],
  ['ipad-landscape', { ...devices['iPad Pro 11 landscape'] }],
];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
    ],
  });

  const summary = { ok: true, configs: [], errors: [] };

  for (const [name, opt] of cfgs) {
    const ctx = await browser.newContext(opt);
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errs.push(m.text());
    });
    page.on('pageerror', (e) => errs.push(String(e)));

    await page.goto(base, { waitUntil: 'networkidle', timeout: 120000 });
    await page.waitForFunction(() => window.earlyUniverse && window.earlyUniverse.version, null, { timeout: 120000 });
    await wait(1500);

    // Stage jumps 0..4
    const jumpResults = [];
    for (let i = 0; i < 5; i++) {
      await page.evaluate((i) => window.earlyUniverse.jumpToStage(i), i);
      await wait(800);
      const info = await page.evaluate(() => ({
        epoch: window.earlyUniverse.getEpochIndex(),
        t: window.earlyUniverse.getTime(),
        particles: window.earlyUniverse.getParticleCount(),
      }));
      jumpResults.push(info);
      if (name === 'desktop') {
        await page.screenshot({ path: path.join(shotDir, `stage-${i}-${STAGE_NAMES[i]}.png`) });
      }
    }

    // Scrubbing
    await page.evaluate(() => {
      const el = document.getElementById('timeline');
      el.value = '500';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await wait(400);
    const mid = await page.evaluate(() => window.earlyUniverse.getTime());

    // Log toggle off then on
    await page.evaluate(() => {
      const el = document.getElementById('toggle-log');
      el.checked = false;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await wait(200);
    const logOff = await page.evaluate(() => window.earlyUniverse.isLogScale());
    await page.evaluate(() => {
      const el = document.getElementById('toggle-log');
      el.checked = true;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await wait(200);
    const logOn = await page.evaluate(() => window.earlyUniverse.isLogScale());

    // Viewport screenshot
    await page.evaluate(() => window.earlyUniverse.jumpToStage(2));
    await wait(600);
    await page.screenshot({ path: path.join(shotDir, `${name}-inflation.png`) });

    const cfgResult = {
      name,
      errs: errs.length,
      errSamples: errs.slice(0, 8),
      jumpResults,
      scrubMidTime: mid,
      logOff,
      logOn,
      stagesOk: jumpResults.every((r, i) => r.epoch === i),
    };
    if (errs.length || !cfgResult.stagesOk || logOff !== false || logOn !== true) {
      summary.ok = false;
    }
    summary.configs.push(cfgResult);
    console.log(name, JSON.stringify(cfgResult, null, 2));
    await ctx.close();
  }

  // Best composite-ish: copy inflation desktop as screenshot.png
  const best = path.join(shotDir, 'stage-2-inflation.png');
  if (fs.existsSync(best)) {
    fs.copyFileSync(best, '/workspace/early-universe/screenshot.png');
  } else {
    const fallback = path.join(shotDir, 'desktop-inflation.png');
    if (fs.existsSync(fallback)) fs.copyFileSync(fallback, '/workspace/early-universe/screenshot.png');
  }

  console.log('SUMMARY', JSON.stringify({ ok: summary.ok, configs: summary.configs.map(c => ({
    name: c.name, errs: c.errs, stagesOk: c.stagesOk, logOff: c.logOff, logOn: c.logOn, scrubMidTime: c.scrubMidTime,
  })) }, null, 2));

  fs.writeFileSync('/tmp/eu-test-result.json', JSON.stringify(summary, null, 2));
  await browser.close();
  process.exit(summary.ok ? 0 : 1);
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(2);
});
