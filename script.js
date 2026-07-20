(() => {
  "use strict";

  const body = document.body;
  const invitation = document.querySelector("#convite");
  const letterStage = document.querySelector("#carta");
  const foldedLetter = document.querySelector("#folded-letter");
  const letterPaper = document.querySelector("#letter-paper");
  const openEnvelopeButton = document.querySelector("#open-envelope");
  const openLetterButton = document.querySelector("#open-letter");
  const restartButton = document.querySelector("#restart");
  const openingStatus = document.querySelector("#opening-status");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let revealTimer;

  const after = (callback, delay) => window.setTimeout(callback, reduceMotion ? 0 : delay);

  function revealLetterStage() {
    letterStage.hidden = false;

    window.requestAnimationFrame(() => {
      letterStage.classList.add("is-visible");
    });

    after(() => {
      letterStage.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      openLetterButton.focus({ preventScroll: true });
    }, 220);
  }

  function openEnvelope() {
    if (body.classList.contains("envelope-opening")) return;

    body.classList.add("envelope-opening");
    openEnvelopeButton.disabled = true;
    openEnvelopeButton.setAttribute("aria-expanded", "true");
    openingStatus.textContent = "O convite foi aberto.";

    revealTimer = after(revealLetterStage, 1050);
  }

  function openLetter() {
    if (foldedLetter.classList.contains("is-open")) return;

    foldedLetter.classList.add("is-open");
    openLetterButton.setAttribute("aria-expanded", "true");

    after(() => {
      letterPaper.focus({ preventScroll: true });
      letterPaper.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    }, 880);
  }

  function restartExperience() {
    window.clearTimeout(revealTimer);
    foldedLetter.classList.remove("is-open");
    letterStage.classList.remove("is-visible");
    openLetterButton.setAttribute("aria-expanded", "false");

    invitation.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });

    after(() => {
      letterStage.hidden = true;
      body.classList.remove("envelope-opening");
      openEnvelopeButton.disabled = false;
      openEnvelopeButton.setAttribute("aria-expanded", "false");
      openingStatus.textContent = "Uma carta de Marcelino espera por você.";
      openEnvelopeButton.focus({ preventScroll: true });
    }, 560);
  }

  openEnvelopeButton.addEventListener("click", openEnvelope);
  openLetterButton.addEventListener("click", openLetter);
  restartButton.addEventListener("click", restartExperience);
})();
