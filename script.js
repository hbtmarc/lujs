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
  const closingLine = document.querySelector("#closing-line");
  const embersCanvas = document.querySelector("#embers");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let revealTimer;
  let restartTimer;
  let settleTimer;
  let resizeTimer;
  let sequenceTimers = [];
  let typewriterToken = 0;
  let typeObserver;
  let emberFrame;
  let embers = [];
  let preparedType = false;

  const after = (callback, delay) => {
    const id = window.setTimeout(callback, reduceMotion ? 0 : delay);
    sequenceTimers.push(id);
    return id;
  };

  const wait = (ms) =>
    new Promise((resolve) => {
      after(resolve, ms);
    });

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
    }, 2400);
  }

  /* —— Embers —— */

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
          r: 0.55 + Math.random() * 1.7,
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
      if (embers.length < 26) spawn(2);

      for (let i = embers.length - 1; i >= 0; i -= 1) {
        const p = embers[i];
        p.x += p.vx + Math.sin(p.y * 0.01) * 0.15;
        p.y += p.vy;
        p.life -= p.decay;

        if (p.life <= 0 || p.y < -10) {
          embers.splice(i, 1);
          continue;
        }

        const alpha = Math.min(p.life, 0.7);
        ctx.beginPath();
        ctx.fillStyle = `hsla(${p.hue}, 78%, 62%, ${alpha})`;
        ctx.shadowColor = `hsla(${p.hue}, 90%, 55%, ${alpha * 0.75})`;
        ctx.shadowBlur = 8;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
      emberFrame = window.requestAnimationFrame(tick);
    }

    resize();
    spawn(16);
    tick();
    window.addEventListener("resize", resize, { passive: true });
  }

  /* —— Magnetic seal —— */

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

  /* —— Typewriter (letra a letra) —— */

  function wrapCharacters(element) {
    if (element.dataset.typedPrepared === "true") return;

    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.parentElement) return NodeFilter.FILTER_REJECT;
        if (node.parentElement.closest("button")) return NodeFilter.FILTER_REJECT;
        if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach((node) => {
      const text = node.nodeValue;
      if (!text) return;

      const fragment = document.createDocumentFragment();

      for (const char of text) {
        if (char === "\n") {
          fragment.appendChild(document.createTextNode("\n"));
          continue;
        }

        const span = document.createElement("span");
        span.className = "tw-char";
        span.textContent = char;
        if (char === " ") span.classList.add("tw-space");
        fragment.appendChild(span);
      }

      node.parentNode.replaceChild(fragment, node);
    });

    element.dataset.typedPrepared = "true";
  }

  function prepareAllTypewriters() {
    if (preparedType) return;

    document.querySelectorAll(".typewrite, .cover-type").forEach((el) => {
      wrapCharacters(el);
    });

    preparedType = true;
  }

  function showAllChars(element) {
    element.querySelectorAll(".tw-char").forEach((char) => {
      char.classList.add("is-shown");
    });
    element.classList.add("is-typed");
  }

  async function typeElement(element, token) {
    if (token !== typewriterToken) return;

    wrapCharacters(element);

    if (reduceMotion) {
      showAllChars(element);
      return;
    }

    const chars = [...element.querySelectorAll(".tw-char")];
    const baseSpeed = Number(element.dataset.typeSpeed) || 28;

    element.classList.add("is-typing");
    element.classList.remove("is-typed");

    for (let i = 0; i < chars.length; i += 1) {
      if (token !== typewriterToken) return;

      const char = chars[i];
      char.classList.add("is-shown");

      const value = char.textContent;
      let delay = baseSpeed;

      if (char.classList.contains("tw-space")) delay = Math.max(8, baseSpeed * 0.35);
      else if (/[,;:]/.test(value)) delay = baseSpeed * 2.2;
      else if (/[.!?…]/.test(value)) delay = baseSpeed * 3.4;
      else if (value === "—" || value === "–") delay = baseSpeed * 2.6;

      // Batch tiny steps for smoothness without feeling blocky
      if (i % 2 === 1 && !/[.!?…]/.test(value)) {
        continue;
      }

      await wait(delay);
    }

    if (token !== typewriterToken) return;
    element.classList.remove("is-typing");
    element.classList.add("is-typed");
  }

  async function typeCover(token) {
    letterCover.classList.add("is-inscribing");
    const parts = letterCover.querySelectorAll(".cover-type");

    for (const part of parts) {
      if (token !== typewriterToken) return;
      await typeElement(part, token);
      await wait(90);
    }

    letterCover.querySelector(".cover-rule")?.classList.add("is-drawn");
    await wait(220);
    openLetterButton.classList.add("is-ready");
    letterCover.classList.add("is-inscribed");
  }

  function observeLetterTyping(token) {
    if (typeObserver) typeObserver.disconnect();

    const blocks = [...letterPaper.querySelectorAll(".typewrite")];
    const rule = letterPaper.querySelector(".typewrite-rule");

    if (reduceMotion) {
      blocks.forEach((block) => showAllChars(block));
      rule?.classList.add("is-drawn");
      closingLine?.classList.add("is-visible");
      return;
    }

    const pending = [];
    let running = false;
    let ruleDrawn = false;

    const pump = async () => {
      if (running || token !== typewriterToken) return;
      running = true;

      while (pending.length && token === typewriterToken) {
        const el = pending.shift();
        if (!el || el.classList.contains("is-typed")) continue;

        if (!ruleDrawn && el.classList.contains("chapter-note__caption") && rule) {
          rule.classList.add("is-drawn");
          ruleDrawn = true;
          await wait(180);
        }

        const top = el.getBoundingClientRect().top;
        if (top > window.innerHeight * 0.65 || top < 72) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          await wait(260);
        }

        await typeElement(el, token);
        await wait(110);
      }

      running = false;

      if (
        token === typewriterToken &&
        blocks.every((block) => block.classList.contains("is-typed"))
      ) {
        closingLine?.classList.add("is-visible");
      }
    };

    typeObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || token !== typewriterToken) return;
          typeObserver.unobserve(entry.target);
          if (!entry.target.classList.contains("is-typed")) {
            pending.push(entry.target);
            pump();
          }
        });
      },
      { root: null, rootMargin: "0px 0px -10% 0px", threshold: 0.18 }
    );

    blocks.forEach((block) => typeObserver.observe(block));

    after(() => {
      blocks.forEach((block) => {
        const rect = block.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.85 && !block.classList.contains("is-typed")) {
          typeObserver.unobserve(block);
          pending.push(block);
        }
      });
      pump();
    }, 180);
  }

  function resetTypewriters() {
    typewriterToken += 1;
    if (typeObserver) typeObserver.disconnect();

    document.querySelectorAll(".typewrite, .cover-type").forEach((el) => {
      el.classList.remove("is-typing", "is-typed");
      el.querySelectorAll(".tw-char").forEach((char) => char.classList.remove("is-shown"));
    });

    document.querySelectorAll(".typewrite-rule, .cover-rule").forEach((rule) => {
      rule.classList.remove("is-drawn");
    });

    openLetterButton.classList.remove("is-ready");
    letterCover.classList.remove("is-inscribing", "is-inscribed");
    closingLine?.classList.remove("is-visible");
  }

  /* —— Paper measure —— */

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

  function settlePaper() {
    letterPaper.style.height = "auto";
    letterPaper.classList.add("is-settled");
    foldedLetter.classList.add("is-settled");
    letterCover.classList.add("is-stowed");
    observeLetterTyping(typewriterToken);
  }

  function resetPaper() {
    window.clearTimeout(settleTimer);
    resetTypewriters();

    foldedLetter.classList.remove("is-open", "is-settled", "is-drawing");
    letterPaper.classList.remove("is-settled");
    letterCover.classList.remove("is-stowed");
    letterPaper.style.height = "";
    openLetterButton.setAttribute("aria-expanded", "false");
  }

  function revealLetterStage() {
    prepareAllTypewriters();

    letterStage.hidden = false;
    letterStage.setAttribute("aria-hidden", "false");
    body.classList.add("is-letter-view");
    body.classList.remove("is-blooming", "letter-extracting");

    window.requestAnimationFrame(() => {
      letterStage.classList.add("is-visible");
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });

      const token = typewriterToken;
      typeCover(token).then(() => {
        openLetterButton.focus({ preventScroll: true });
      });
    });
  }

  /* —— Envelope choreography —— */

  function openEnvelope() {
    if (
      body.classList.contains("envelope-opening") ||
      body.classList.contains("seal-cracking") ||
      body.classList.contains("seal-breaking") ||
      body.classList.contains("letter-extracting")
    ) {
      return;
    }

    openEnvelopeButton.disabled = true;
    openEnvelopeButton.setAttribute("aria-expanded", "true");
    openingStatus.textContent = "O selo cede…";

    if (reduceMotion) {
      body.classList.add("envelope-opening", "letter-extracting");
      openingStatus.textContent = "O convite foi aberto.";
      openLetterButton.classList.add("is-ready");
      revealLetterStage();
      return;
    }

    // 1. Crack
    body.classList.add("seal-cracking");
    openingStatus.textContent = "O selo se parte.";

    // 2. Break
    after(() => {
      body.classList.remove("seal-cracking");
      body.classList.add("seal-breaking");
    }, 300);

    // 3. Flap opens
    after(() => {
      body.classList.add("envelope-opening");
      openingStatus.textContent = "A carta desliza para fora…";
    }, 580);

    // 4. Letter slides out of the envelope
    after(() => {
      body.classList.add("letter-extracting");
      body.classList.add("is-blooming");
      openingStatus.textContent = "Um novo capítulo chega às suas mãos.";
    }, 1250);

    // 5. Arrive at letter stage
    revealTimer = after(revealLetterStage, 2400);
  }

  function openLetter() {
    if (foldedLetter.classList.contains("is-open")) return;
    if (!reduceMotion && !openLetterButton.classList.contains("is-ready")) return;

    window.clearTimeout(settleTimer);
    typewriterToken += 1;

    const targetHeight = measurePaperHeight();

    letterPaper.style.height = "0px";
    void letterPaper.offsetHeight;

    foldedLetter.classList.add("is-open", "is-drawing");
    openLetterButton.setAttribute("aria-expanded", "true");
    letterPaper.style.height = `${targetHeight}px`;

    settleTimer = after(() => {
      settlePaper();
      letterPaper.focus({ preventScroll: true });
    }, reduceMotion ? 0 : 1450);
  }

  function restartExperience() {
    window.clearTimeout(revealTimer);
    window.clearTimeout(restartTimer);
    window.clearTimeout(settleTimer);
    clearSequence();
    typewriterToken += 1;

    resetPaper();
    letterStage.classList.remove("is-visible");
    body.classList.remove(
      "is-letter-view",
      "is-blooming",
      "seal-cracking",
      "seal-breaking",
      "envelope-opening",
      "letter-extracting"
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

  prepareAllTypewriters();
  bootExperience();
  initEmbers();
  initSealMagnetism();
})();
