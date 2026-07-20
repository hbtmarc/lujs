(() => {
  "use strict";

  const body = document.body;
  const root = document.documentElement;
  const introVeil = document.querySelector("#intro-veil");
  const letterStage = document.querySelector("#carta");
  const foldedLetter = document.querySelector("#folded-letter");
  const letterCover = document.querySelector("#letter-cover");
  const letterPaper = document.querySelector("#letter-paper");
  const letterFooter = document.querySelector("#letter-footer");
  const openEnvelopeButton = document.querySelector("#open-envelope");
  const openLetterButton = document.querySelector("#open-letter");
  const restartButton = document.querySelector("#restart");
  const openingStatus = document.querySelector("#opening-status");
  const shareFrame = document.querySelector("#share-frame");
  const shareLinkButton = document.querySelector("#share-link");
  const copyLinkButton = document.querySelector("#copy-link");
  const embersCanvas = document.querySelector("#embers");

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduceMotion = motionQuery.matches;

  let bootTimer = 0;
  let revealTimer = 0;
  let restartTimer = 0;
  let settleTimer = 0;
  let sequenceTimers = [];
  let typewriterToken = 0;
  let typeObserver = null;
  let embers = [];
  let preparedType = false;
  let emberRaf = 0;

  const delay = (ms) => (reduceMotion ? Math.min(ms, 40) : ms);

  const after = (callback, ms) => {
    const id = window.setTimeout(callback, delay(ms));
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

  /* —— Boot —— */

  function finishBoot() {
    introVeil?.classList.add("is-gone");
    body.classList.remove("is-booting");
    body.classList.add("is-ready");
  }

  function bootExperience() {
    body.classList.add("is-booting");
    body.classList.remove("is-ready");

    window.clearTimeout(bootTimer);

    if (reduceMotion) {
      finishBoot();
      return;
    }

    bootTimer = window.setTimeout(finishBoot, 2200);

    // Fallback: nunca deixar a tela presa no véu
    window.setTimeout(() => {
      if (!body.classList.contains("is-ready")) finishBoot();
    }, 4000);
  }

  /* —— Embers —— */

  function initEmbers() {
    if (!embersCanvas) return;

    const ctx = embersCanvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      embersCanvas.width = Math.floor(width * dpr);
      embersCanvas.height = Math.floor(height * dpr);
      embersCanvas.style.width = `${width}px`;
      embersCanvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawn = (count) => {
      for (let i = 0; i < count; i += 1) {
        embers.push({
          x: Math.random() * width,
          y: height * (0.55 + Math.random() * 0.5),
          r: 0.5 + Math.random() * 1.6,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -0.25 - Math.random() * 0.7,
          life: 0.45 + Math.random() * 0.55,
          decay: 0.0018 + Math.random() * 0.0022,
          hue: 14 + Math.random() * 24,
        });
      }
    };

    const tick = () => {
      if (reduceMotion || body.classList.contains("is-letter-view")) {
        ctx.clearRect(0, 0, width, height);
        emberRaf = window.requestAnimationFrame(tick);
        return;
      }

      ctx.clearRect(0, 0, width, height);
      if (embers.length < 22) spawn(2);

      for (let i = embers.length - 1; i >= 0; i -= 1) {
        const p = embers[i];
        p.x += p.vx + Math.sin(p.y * 0.012) * 0.12;
        p.y += p.vy;
        p.life -= p.decay;

        if (p.life <= 0 || p.y < -12) {
          embers.splice(i, 1);
          continue;
        }

        const alpha = Math.min(p.life, 0.65);
        ctx.beginPath();
        ctx.fillStyle = `hsla(${p.hue}, 78%, 62%, ${alpha})`;
        ctx.shadowColor = `hsla(${p.hue}, 90%, 55%, ${alpha * 0.7})`;
        ctx.shadowBlur = 6;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
      emberRaf = window.requestAnimationFrame(tick);
    };

    resize();
    if (!reduceMotion) spawn(14);
    tick();
    window.addEventListener("resize", resize, { passive: true });
  }

  /* —— Seal magnetism —— */

  function initSealMagnetism() {
    if (!openEnvelopeButton) return;

    const face = openEnvelopeButton.querySelector(".wax-seal__face");
    if (!face) return;

    const maxTilt = 10;

    const onMove = (event) => {
      if (reduceMotion || openEnvelopeButton.disabled) return;
      if (body.classList.contains("envelope-opening")) return;

      const rect = face.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;

      root.style.setProperty("--seal-x", `${(-py * maxTilt).toFixed(2)}deg`);
      root.style.setProperty("--seal-y", `${(px * maxTilt).toFixed(2)}deg`);
    };

    const reset = () => {
      root.style.setProperty("--seal-x", "0deg");
      root.style.setProperty("--seal-y", "0deg");
    };

    openEnvelopeButton.addEventListener("pointermove", onMove);
    openEnvelopeButton.addEventListener("pointerleave", reset);
    openEnvelopeButton.addEventListener("pointercancel", reset);
  }

  /* —— Typewriter —— */

  function wrapCharacters(element) {
    if (element.dataset.typedPrepared === "true") return;

    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.parentElement) return NodeFilter.FILTER_REJECT;
        if (node.parentElement.closest("button, [aria-hidden='true']")) {
          return NodeFilter.FILTER_REJECT;
        }
        if (!node.nodeValue || !node.nodeValue.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
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
    document.querySelectorAll(".typewrite, .cover-type").forEach(wrapCharacters);
    preparedType = true;
  }

  function showAllChars(element) {
    element.querySelectorAll(".tw-char").forEach((char) => {
      char.classList.add("is-shown");
    });
    element.classList.add("is-typed");
    element.classList.remove("is-typing");
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

      chars[i].classList.add("is-shown");

      const value = chars[i].textContent;
      let ms = baseSpeed;

      if (chars[i].classList.contains("tw-space")) ms = Math.max(10, baseSpeed * 0.4);
      else if (/[,;:]/.test(value)) ms = baseSpeed * 2;
      else if (/[.!?…]/.test(value)) ms = baseSpeed * 3;
      else if (value === "—" || value === "–") ms = baseSpeed * 2.4;

      if (i % 2 === 1 && !/[.!?…]/.test(value)) continue;
      await wait(ms);
    }

    if (token !== typewriterToken) return;
    element.classList.remove("is-typing");
    element.classList.add("is-typed");
  }

  async function typeCover(token) {
    letterCover.classList.add("is-inscribing");

    for (const part of letterCover.querySelectorAll(".cover-type")) {
      if (token !== typewriterToken) return;
      await typeElement(part, token);
      await wait(80);
    }

    letterCover.querySelector(".cover-rule")?.classList.add("is-drawn");
    await wait(180);
    openLetterButton.classList.add("is-ready");
    letterCover.classList.add("is-inscribed");
  }

  function finishLetterChrome() {
    letterFooter?.classList.add("is-shown");
    shareFrame?.classList.add("is-visible");

    after(() => {
      shareFrame?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "nearest",
      });
    }, 400);
  }

  function observeLetterTyping(token) {
    if (typeObserver) typeObserver.disconnect();

    const blocks = [...letterPaper.querySelectorAll(".typewrite")];
    const rule = letterPaper.querySelector(".typewrite-rule");

    if (reduceMotion) {
      blocks.forEach(showAllChars);
      rule?.classList.add("is-drawn");
      finishLetterChrome();
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
          await wait(160);
        }

        const top = el.getBoundingClientRect().top;
        if (top > window.innerHeight * 0.7 || top < 64) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          await wait(220);
        }

        await typeElement(el, token);
        await wait(90);
      }

      running = false;

      if (
        token === typewriterToken &&
        blocks.every((block) => block.classList.contains("is-typed"))
      ) {
        finishLetterChrome();
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
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );

    blocks.forEach((block) => typeObserver.observe(block));

    after(() => {
      blocks.forEach((block) => {
        if (block.getBoundingClientRect().top < window.innerHeight * 0.88) {
          typeObserver.unobserve(block);
          pending.push(block);
        }
      });
      pump();
    }, 160);
  }

  function resetTypewriters() {
    typewriterToken += 1;
    if (typeObserver) typeObserver.disconnect();

    document.querySelectorAll(".typewrite, .cover-type").forEach((el) => {
      el.classList.remove("is-typing", "is-typed");
      el.querySelectorAll(".tw-char").forEach((char) => char.classList.remove("is-shown"));
    });

    document.querySelectorAll(".typewrite-rule, .cover-rule").forEach((el) => {
      el.classList.remove("is-drawn");
    });

    openLetterButton.classList.remove("is-ready");
    letterCover.classList.remove("is-inscribing", "is-inscribed");
    letterFooter?.classList.remove("is-shown");
    shareFrame?.classList.remove("is-visible");
  }

  function settlePaper() {
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
    openLetterButton.setAttribute("aria-expanded", "false");
  }

  function revealLetterStage() {
    prepareAllTypewriters();

    letterStage.hidden = false;
    letterStage.setAttribute("aria-hidden", "false");
    body.classList.add("is-letter-view");
    body.classList.remove("is-blooming", "letter-extracting", "is-reading");

    window.requestAnimationFrame(() => {
      letterStage.classList.add("is-visible");
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });

      const token = typewriterToken;
      typeCover(token).then(() => {
        openLetterButton.focus({ preventScroll: true });
      });
    });
  }

  /* —— Envelope —— */

  function openEnvelope() {
    if (openEnvelopeButton.disabled) return;
    if (body.classList.contains("envelope-opening")) return;

    openEnvelopeButton.disabled = true;
    openEnvelopeButton.setAttribute("aria-expanded", "true");
    openingStatus.textContent = "O selo cede…";

    clearSequence();

    if (reduceMotion) {
      body.classList.add("seal-breaking", "envelope-opening", "letter-extracting");
      openingStatus.textContent = "O convite foi aberto.";
      openLetterButton.classList.add("is-ready");
      revealLetterStage();
      return;
    }

    body.classList.add("seal-cracking");
    openingStatus.textContent = "O selo se parte.";

    after(() => {
      body.classList.remove("seal-cracking");
      body.classList.add("seal-breaking");
    }, 280);

    after(() => {
      body.classList.add("envelope-opening");
      openingStatus.textContent = "A carta desliza para fora…";
    }, 560);

    after(() => {
      body.classList.add("letter-extracting", "is-blooming");
      openingStatus.textContent = "Um novo capítulo chega às suas mãos.";
    }, 1180);

    revealTimer = after(revealLetterStage, 2300);
  }

  function openLetter() {
    if (foldedLetter.classList.contains("is-open")) return;
    if (!openLetterButton.classList.contains("is-ready") && !reduceMotion) return;

    window.clearTimeout(settleTimer);
    typewriterToken += 1;

    body.classList.add("is-reading");
    foldedLetter.classList.add("is-open", "is-drawing");
    openLetterButton.setAttribute("aria-expanded", "true");

    settleTimer = after(() => {
      settlePaper();
      letterPaper.focus({ preventScroll: true });
      letterPaper.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
    }, 1200);
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
      "is-reading",
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
    }, 60);
  }

  function onMotionChange(event) {
    reduceMotion = event.matches;
  }

  /* —— Share —— */

  const SHARE_URL = "https://hbtmarc.github.io/lujs/";

  function getShareUrl() {
    return SHARE_URL;
  }

  function flashButton(button) {
    if (!button) return;
    button.classList.add("is-done");
    after(() => button.classList.remove("is-done"), 1400);
  }

  async function copyShareLink() {
    const url = getShareUrl();

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement("input");
        input.value = url;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        input.remove();
      }

      flashButton(copyLinkButton);
      return true;
    } catch (error) {
      return false;
    }
  }

  async function shareExperience() {
    const url = getShareUrl();
    const shareData = {
      title: "Para Luiza — Um novo capítulo",
      text: "Um convite reservado. O jantar está servido.",
      url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        flashButton(shareLinkButton);
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }

    const copied = await copyShareLink();
    if (copied) flashButton(shareLinkButton);
  }

  /* —— Start —— */

  motionQuery.addEventListener?.("change", onMotionChange);

  openEnvelopeButton?.addEventListener("click", openEnvelope);
  openLetterButton?.addEventListener("click", openLetter);
  restartButton?.addEventListener("click", restartExperience);
  shareLinkButton?.addEventListener("click", shareExperience);
  copyLinkButton?.addEventListener("click", copyShareLink);

  try {
    prepareAllTypewriters();
  } catch (error) {
    console.error(error);
  }

  bootExperience();
  initEmbers();
  initSealMagnetism();
})();
