(() => {
  "use strict";

  const body = document.body;
  const root = document.documentElement;
  const introVeil = document.querySelector("#intro-veil");
  const letterStage = document.querySelector("#carta");
  const foldedLetter = document.querySelector("#folded-letter");
  const letterCover = document.querySelector("#letter-cover");
  const letterPaper = document.querySelector("#letter-paper");
  const openEnvelopeButton = document.querySelector("#open-envelope");
  const openLetterButton = document.querySelector("#open-letter");
  const restartButton = document.querySelector("#restart");
  const openingStatus = document.querySelector("#opening-status");
  const embersCanvas = document.querySelector("#embers");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let revealTimer;
  let restartTimer;
  let settleTimer;
  let resizeTimer;
  let sequenceTimers = [];
  let inkObserver;
  let emberFrame;
  let embers = [];

  const after = (callback, delay) => {
    const id = window.setTimeout(callback, reduceMotion ? 0 : delay);
    sequenceTimers.push(id);
    return id;
  };

  const clearSequence = () => {
    sequenceTimers.forEach((id) => window.clearTimeout(id));
    sequenceTimers = [];
  };

  /* —— Intro —— */

  function bootExperience() {
    body.classList.add("is-booting");

    if (reduceMotion) {
      introVeil?.classList.add("is-gone");
      body.classList.remove("is-booting");
      body.classList.add("is-ready");
      return;
    }

    after(() => {
      introVeil?.classList.add("is-gone");
      body.classList.remove("is-booting");
      body.classList.add("is-ready");
    }, 2600);
  }

  /* —— Embers (candle atmosphere) —— */

  function initEmbers() {
    if (!embersCanvas || reduceMotion) return;

    const ctx = embersCanvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      embersCanvas.width = Math.floor(width * dpr);
      embersCanvas.height = Math.floor(height * dpr);
      embersCanvas.style.width = `${width}px`;
      embersCanvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn(count) {
      for (let i = 0; i < count; i += 1) {
        embers.push({
          x: Math.random() * width,
          y: height + Math.random() * height * 0.35,
          r: 0.6 + Math.random() * 1.8,
          vx: (Math.random() - 0.5) * 0.35,
          vy: -0.35 - Math.random() * 0.85,
          life: 0.4 + Math.random() * 0.6,
          decay: 0.0015 + Math.random() * 0.0025,
          hue: 12 + Math.random() * 28,
        });
      }
    }

    function tick() {
      ctx.clearRect(0, 0, width, height);

      if (embers.length < 28) spawn(2);

      for (let i = embers.length - 1; i >= 0; i -= 1) {
        const p = embers[i];
        p.x += p.vx + Math.sin(p.y * 0.01) * 0.15;
        p.y += p.vy;
        p.life -= p.decay;

        if (p.life <= 0 || p.y < -10) {
          embers.splice(i, 1);
          continue;
        }

        const alpha = Math.min(p.life, 0.75);
        ctx.beginPath();
        ctx.fillStyle = `hsla(${p.hue}, 78%, 62%, ${alpha})`;
        ctx.shadowColor = `hsla(${p.hue}, 90%, 55%, ${alpha * 0.8})`;
        ctx.shadowBlur = 8;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
      emberFrame = window.requestAnimationFrame(tick);
    }

    resize();
    spawn(18);
    tick();
    window.addEventListener("resize", resize, { passive: true });
  }

  /* —— Magnetic wax seal —— */

  function initSealMagnetism() {
    if (reduceMotion || !openEnvelopeButton) return;

    const face = openEnvelopeButton.querySelector(".wax-seal__face");
    if (!face) return;

    const maxTilt = 12;

    function onMove(event) {
      if (body.classList.contains("envelope-opening") || openEnvelopeButton.disabled) return;

      const rect = face.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;

      root.style.setProperty("--seal-x", `${(-py * maxTilt).toFixed(2)}deg`);
      root.style.setProperty("--seal-y", `${(px * maxTilt).toFixed(2)}deg`);
    }

    function onLeave() {
      root.style.setProperty("--seal-x", "0deg");
      root.style.setProperty("--seal-y", "0deg");
    }

    openEnvelopeButton.addEventListener("pointermove", onMove);
    openEnvelopeButton.addEventListener("pointerleave", onLeave);
    openEnvelopeButton.addEventListener("pointerup", onLeave);
  }

  /* —— Letter height / ink —— */

  function measurePaperHeight() {
    letterPaper.style.height = "auto";
    letterPaper.style.position = "absolute";
    letterPaper.style.visibility = "hidden";
    letterPaper.style.opacity = "0";
    letterPaper.style.width = "100%";
    letterPaper.style.pointerEvents = "none";

    const height = letterPaper.scrollHeight;

    letterPaper.style.height = "";
    letterPaper.style.position = "";
    letterPaper.style.visibility = "";
    letterPaper.style.opacity = "";
    letterPaper.style.width = "";
    letterPaper.style.pointerEvents = "";

    return height;
  }

  function inkLines(stagger = true) {
    const lines = letterPaper.querySelectorAll(".ink-line");

    if (reduceMotion) {
      lines.forEach((line) => line.classList.add("is-inked"));
      return;
    }

    if (inkObserver) inkObserver.disconnect();

    inkObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-inked");
          inkObserver.unobserve(entry.target);
        });
      },
      { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.15 }
    );

    lines.forEach((line, index) => {
      line.classList.remove("is-inked");

      if (stagger && index < 5) {
        after(() => line.classList.add("is-inked"), 380 + index * 140);
      } else {
        inkObserver.observe(line);
      }
    });
  }

  function settlePaper() {
    letterPaper.style.height = "auto";
    letterPaper.classList.add("is-settled");
    foldedLetter.classList.add("is-settled");
    letterCover.classList.add("is-stowed");
    inkLines(true);
  }

  function resetPaper() {
    window.clearTimeout(settleTimer);
    if (inkObserver) inkObserver.disconnect();

    foldedLetter.classList.remove("is-open", "is-settled");
    letterPaper.classList.remove("is-settled");
    letterCover.classList.remove("is-stowed");
    letterPaper.style.height = "";
    letterPaper.style.removeProperty("--paper-height");
    openLetterButton.setAttribute("aria-expanded", "false");

    letterPaper.querySelectorAll(".ink-line").forEach((line) => {
      line.classList.remove("is-inked");
    });
  }

  function revealLetterStage() {
    letterStage.hidden = false;
    letterStage.setAttribute("aria-hidden", "false");
    body.classList.add("is-letter-view");
    body.classList.remove("is-blooming");

    window.requestAnimationFrame(() => {
      letterStage.classList.add("is-visible");
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      openLetterButton.focus({ preventScroll: true });
    });
  }

  /* —— Envelope choreography —— */

  function openEnvelope() {
    if (
      body.classList.contains("envelope-opening") ||
      body.classList.contains("seal-cracking") ||
      body.classList.contains("seal-breaking")
    ) {
      return;
    }

    openEnvelopeButton.disabled = true;
    openEnvelopeButton.setAttribute("aria-expanded", "true");
    openingStatus.textContent = "O selo cede…";

    if (reduceMotion) {
      body.classList.add("envelope-opening");
      openingStatus.textContent = "O convite foi aberto.";
      revealLetterStage();
      return;
    }

    // 1. Crack
    body.classList.add("seal-cracking");
    openingStatus.textContent = "O selo se parte.";

    // 2. Break away
    after(() => {
      body.classList.remove("seal-cracking");
      body.classList.add("seal-breaking");
    }, 320);

    // 3. Flap opens + note rises
    after(() => {
      body.classList.add("envelope-opening");
      openingStatus.textContent = "O convite foi aberto.";
    }, 620);

    // 4. Light bloom
    after(() => {
      body.classList.add("is-blooming");
    }, 1100);

    // 5. Crossfade into letter
    revealTimer = after(revealLetterStage, 1750);
  }

  function openLetter() {
    if (foldedLetter.classList.contains("is-open")) return;

    window.clearTimeout(settleTimer);

    const targetHeight = measurePaperHeight();

    letterPaper.style.height = "0px";
    void letterPaper.offsetHeight;

    foldedLetter.classList.add("is-open");
    openLetterButton.setAttribute("aria-expanded", "true");
    letterPaper.style.height = `${targetHeight}px`;

    settleTimer = after(() => {
      settlePaper();
      letterPaper.focus({ preventScroll: true });
    }, reduceMotion ? 0 : 1400);
  }

  function restartExperience() {
    window.clearTimeout(revealTimer);
    window.clearTimeout(restartTimer);
    window.clearTimeout(settleTimer);
    clearSequence();

    resetPaper();
    letterStage.classList.remove("is-visible");
    body.classList.remove(
      "is-letter-view",
      "is-blooming",
      "seal-cracking",
      "seal-breaking",
      "envelope-opening"
    );

    root.style.setProperty("--seal-x", "0deg");
    root.style.setProperty("--seal-y", "0deg");

    restartTimer = after(() => {
      letterStage.hidden = true;
      letterStage.setAttribute("aria-hidden", "true");
      openEnvelopeButton.disabled = false;
      openEnvelopeButton.setAttribute("aria-expanded", "false");
      openingStatus.textContent = "Uma carta de Marcelino espera por você.";
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      openEnvelopeButton.focus({ preventScroll: true });
    }, reduceMotion ? 0 : 80);
  }

  function onResize() {
    if (!foldedLetter.classList.contains("is-open") || !letterPaper.classList.contains("is-settled")) {
      return;
    }

    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      letterPaper.style.height = "auto";
    }, 120);
  }

  /* —— Start —— */

  openEnvelopeButton.addEventListener("click", openEnvelope);
  openLetterButton.addEventListener("click", openLetter);
  restartButton.addEventListener("click", restartExperience);
  window.addEventListener("resize", onResize, { passive: true });

  bootExperience();
  initEmbers();
  initSealMagnetism();
})();
