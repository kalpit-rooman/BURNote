/* ============================================================
   BURNote — burn ritual
   Zero persistence: the note text is never stored or sent.
   Only theme, mute, and a released-count integer touch storage.
   ============================================================ */
(() => {
  "use strict";

  const PREFS_KEY = "burnote.prefs";
  const COUNT_KEY = "burnote.count";

  const $ = (sel) => document.querySelector(sel);
  const root = document.documentElement;
  const note = $("#note");
  const burnBtn = $("#burn-btn");
  const paper = $("#paper");
  const glow = $(".paper-glow");
  const ritual = $("#ritual");
  const afterglow = $("#afterglow");
  const releasedCount = $("#released-count");
  const affirmation = $("#affirmation");
  const resetBtn = $("#reset-btn");
  const themeToggle = $("#theme-toggle");
  const muteToggle = $("#mute-toggle");
  const canvas = $("#burn-canvas");
  const ctx = canvas.getContext("2d");

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const AFFIRMATIONS = [
    "It's gone. Breathe.",
    "You let it go. Well done.",
    "Lighter now. That's yours to keep.",
    "Released. Nothing left but ash.",
    "Whatever it was, it's smoke now.",
  ];

  /* ---------- Preferences (theme + mute) ---------- */
  const prefs = loadPrefs();
  applyTheme(prefs.theme);
  applyMute(prefs.mute);

  function loadPrefs() {
    try {
      return { theme: null, mute: false, ...(JSON.parse(localStorage.getItem(PREFS_KEY)) || {}) };
    } catch {
      return { theme: null, mute: false };
    }
  }
  function savePrefs() {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* private mode — fine */ }
  }
  function applyTheme(theme) {
    if (theme === "light" || theme === "dark") root.setAttribute("data-theme", theme);
    else root.removeAttribute("data-theme");
  }
  function currentIsDark() {
    const t = root.getAttribute("data-theme");
    if (t) return t === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function applyMute(muted) {
    muteToggle.setAttribute("aria-pressed", String(muted));
    muteToggle.setAttribute("aria-label", muted ? "Unmute fire sound" : "Mute fire sound");
  }

  themeToggle.addEventListener("click", () => {
    prefs.theme = currentIsDark() ? "light" : "dark";
    applyTheme(prefs.theme);
    savePrefs();
  });
  muteToggle.addEventListener("click", () => {
    prefs.mute = !prefs.mute;
    applyMute(prefs.mute);
    savePrefs();
    if (prefs.mute) audio.stop();
  });

  /* ---------- Released count (integer only) ---------- */
  function getCount() {
    const n = parseInt(localStorage.getItem(COUNT_KEY) || "0", 10);
    return Number.isFinite(n) ? n : 0;
  }
  function bumpCount() {
    const n = getCount() + 1;
    try { localStorage.setItem(COUNT_KEY, String(n)); } catch { /* ignore */ }
    return n;
  }

  /* ---------- Note handling (never persisted) ---------- */
  function refreshBurnEnabled() {
    burnBtn.disabled = note.value.trim().length === 0;
  }
  note.addEventListener("input", refreshBurnEnabled);
  refreshBurnEnabled();

  // Ctrl/Cmd + Enter to burn
  note.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !burnBtn.disabled) {
      e.preventDefault();
      startBurn();
    }
  });

  /* ---------- Canvas particle engine ---------- */
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  function sizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(innerWidth * dpr);
    canvas.height = Math.floor(innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  sizeCanvas();
  addEventListener("resize", sizeCanvas);

  const particles = [];
  let rafId = null;
  let lastTs = 0;

  function rand(a, b) { return a + Math.random() * (b - a); }

  function spawnFlame(x, y) {
    particles.push({
      kind: "flame",
      x: x + rand(-6, 6), y,
      vx: rand(-14, 14), vy: rand(-70, -130),
      life: 0, ttl: rand(0.5, 0.95),
      size: rand(9, 20),
    });
  }
  function spawnEmber(x, y) {
    particles.push({
      kind: "ember",
      x, y,
      vx: rand(-26, 26), vy: rand(-60, -150),
      life: 0, ttl: rand(0.8, 1.8),
      size: rand(1.4, 3),
      flick: rand(0, Math.PI * 2),
    });
  }
  function spawnAsh(x, y) {
    particles.push({
      kind: "ash",
      x, y,
      vx: rand(-18, 18), vy: rand(10, 45),
      life: 0, ttl: rand(2.2, 4),
      size: rand(1.6, 4),
      sway: rand(0, Math.PI * 2),
      swaySpeed: rand(1.5, 3.5),
    });
  }

  function drawParticle(p) {
    const t = p.life / p.ttl;
    if (p.kind === "flame") {
      const s = p.size * (1 - t * 0.6);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, s);
      g.addColorStop(0, `rgba(255,235,190,${0.9 * (1 - t)})`);
      g.addColorStop(0.4, `rgba(245,151,90,${0.7 * (1 - t)})`);
      g.addColorStop(1, "rgba(232,92,58,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === "ember") {
      const flick = 0.6 + 0.4 * Math.sin(p.flick + p.life * 18);
      ctx.fillStyle = `rgba(255,${Math.floor(rand(170, 210))},120,${(1 - t) * flick})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else { // ash
      ctx.fillStyle = currentIsDark()
        ? `rgba(140,132,150,${(1 - t) * 0.7})`
        : `rgba(90,84,98,${(1 - t) * 0.6})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function tick(ts) {
    const dt = Math.min((ts - lastTs) / 1000 || 0, 0.05);
    lastTs = ts;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "lighter";

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      if (p.life >= p.ttl) { particles.splice(i, 1); continue; }
      if (p.kind === "ash") {
        p.sway += p.swaySpeed * dt;
        p.x += (p.vx + Math.sin(p.sway) * 20) * dt;
      } else {
        p.x += p.vx * dt;
      }
      p.y += p.vy * dt;
      if (p.kind === "flame") p.vy *= 0.98;
      if (p.kind === "ash") { ctx.globalCompositeOperation = "source-over"; }
      else { ctx.globalCompositeOperation = "lighter"; }
      drawParticle(p);
    }

    if (particles.length > 0 || burning) {
      rafId = requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      rafId = null;
    }
  }
  function ensureLoop() {
    if (rafId === null) { lastTs = performance.now(); rafId = requestAnimationFrame(tick); }
  }

  /* ---------- Synthesized crackling fire ---------- */
  const audio = (() => {
    let actx = null, master = null, noiseBuf = null, hiss = null, popTimer = null;

    function ensureContext() {
      if (!actx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        actx = new AC();
        master = actx.createGain();
        master.gain.value = 0;
        master.connect(actx.destination);
        // pre-render a second of noise for reuse
        const len = actx.sampleRate;
        noiseBuf = actx.createBuffer(1, len, actx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      return actx;
    }

    function pop() {
      if (!actx) return;
      const src = actx.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      const bp = actx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 400 + Math.random() * 1600;
      bp.Q.value = 6;
      const g = actx.createGain();
      const now = actx.currentTime;
      const peak = 0.15 + Math.random() * 0.5;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(peak, now + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.04 + Math.random() * 0.06);
      src.connect(bp); bp.connect(g); g.connect(master);
      src.start(now);
      src.stop(now + 0.16);
      popTimer = setTimeout(pop, 25 + Math.random() * 110);
    }

    return {
      start() {
        if (prefs.mute) return;
        const c = ensureContext();
        if (!c) return;
        if (c.state === "suspended") c.resume();
        // steady low hiss bed
        if (!hiss) {
          hiss = actx.createBufferSource();
          hiss.buffer = noiseBuf;
          hiss.loop = true;
          const lp = actx.createBiquadFilter();
          lp.type = "lowpass";
          lp.frequency.value = 900;
          const hg = actx.createGain();
          hg.gain.value = 0.08;
          hiss.connect(lp); lp.connect(hg); hg.connect(master);
          hiss.start();
        }
        const now = actx.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.linearRampToValueAtTime(0.9, now + 0.25);
        master.gain.linearRampToValueAtTime(0.55, now + 2.2);
        if (!popTimer) pop();
      },
      fade() {
        if (!actx) return;
        const now = actx.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.linearRampToValueAtTime(0.0001, now + 1.4);
        setTimeout(() => this.stop(), 1500);
      },
      stop() {
        if (popTimer) { clearTimeout(popTimer); popTimer = null; }
        if (hiss) { try { hiss.stop(); } catch {} hiss = null; }
        if (master && actx) master.gain.setValueAtTime(0, actx.currentTime);
      },
    };
  })();

  /* ---------- The burn sequence ---------- */
  let burning = false;

  function startBurn() {
    if (burning || burnBtn.disabled) return;
    burning = true;
    burnBtn.classList.add("igniting");
    burnBtn.disabled = true;
    note.setAttribute("readonly", "true");
    note.blur();

    audio.start();

    if (prefersReducedMotion) {
      gentleFade();
      return;
    }

    glow.style.setProperty("--glow", "1");
    ensureLoop();

    const rect = paper.getBoundingClientRect();
    const duration = 2600; // ms for the front to climb the page
    const start = performance.now();

    function step(now) {
      const t = Math.min((now - start) / duration, 1);
      // ease-in-out so it lingers at the edges
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const burnPct = eased * 108; // overshoot past 100 so the top fully clears
      paper.style.setProperty("--burn", burnPct.toFixed(2));

      // emit particles along the current burn front (screen coords)
      const frontY = rect.bottom - (Math.min(burnPct, 100) / 100) * rect.height;
      const emit = 5;
      for (let i = 0; i < emit; i++) {
        const x = rand(rect.left, rect.right);
        spawnFlame(x, frontY);
        if (Math.random() < 0.7) spawnEmber(x, frontY + rand(-4, 4));
        if (Math.random() < 0.5) spawnAsh(x, frontY);
      }

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        glow.style.setProperty("--glow", "0");
        finishBurn();
      }
    }
    requestAnimationFrame(step);
  }

  function gentleFade() {
    ritual.style.opacity = "0";
    setTimeout(finishBurn, 900);
  }

  function finishBurn() {
    // Wipe the note from memory. It was never stored anywhere.
    note.value = "";
    const n = bumpCount();

    ritual.hidden = true;
    ritual.style.display = "none";
    affirmation.textContent = AFFIRMATIONS[n % AFFIRMATIONS.length];
    releasedCount.textContent = n === 1 ? "1 note released" : `${n} notes released`;
    afterglow.hidden = false;

    audio.fade();
    burning = false;
  }

  resetBtn.addEventListener("click", () => {
    afterglow.hidden = true;
    ritual.hidden = false;
    ritual.style.display = "";
    ritual.style.opacity = "1";
    paper.style.setProperty("--burn", "0");
    note.removeAttribute("readonly");
    burnBtn.classList.remove("igniting");
    refreshBurnEnabled();
    note.focus();
  });

  burnBtn.addEventListener("click", startBurn);
})();
