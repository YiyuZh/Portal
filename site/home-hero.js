// Zenithy Hero route B animation.
// Keeps text data-driven by mirroring the semantic #page-title into the reveal layer.
(function () {
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  var hero = document.querySelector(".hero");
  var stage = document.querySelector("[data-hero-stage]");
  var title = document.getElementById("page-title");
  var reveal = document.getElementById("hero-title-reveal");

  if (!hero || !stage || !title || !reveal) {
    return;
  }

  function syncTitle() {
    var text = title.textContent || "";
    reveal.textContent = text;
    stage.setAttribute("aria-label", text);
  }

  syncTitle();

  if ("MutationObserver" in window) {
    new MutationObserver(syncTitle).observe(title, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  if (reduceMotion && reduceMotion.matches) {
    return;
  }

  var pointerActive = false;
  var pointerTarget = { x: 0.5, y: 0.48 };
  var current = { x: 0.5, y: 0.48 };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function setTargetFromPointer(event) {
    var rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    pointerActive = true;
    pointerTarget.x = clamp((event.clientX - rect.left) / rect.width, 0.16, 0.84);
    pointerTarget.y = clamp((event.clientY - rect.top) / rect.height, 0.2, 0.8);
  }

  hero.addEventListener("pointermove", setTargetFromPointer, { passive: true });
  hero.addEventListener("pointerleave", function () {
    pointerActive = false;
  });

  function tick(time) {
    var driftX = 0.5 + Math.sin(time / 2600) * 0.16 + Math.sin(time / 5100) * 0.06;
    var driftY = 0.48 + Math.cos(time / 3100) * 0.14;
    var targetX = pointerActive ? pointerTarget.x : driftX;
    var targetY = pointerActive ? pointerTarget.y : driftY;

    current.x += (targetX - current.x) * 0.055;
    current.y += (targetY - current.y) * 0.055;

    var x = (current.x * 100).toFixed(2) + "%";
    var y = (current.y * 100).toFixed(2) + "%";
    hero.style.setProperty("--hero-orb-x", x);
    hero.style.setProperty("--hero-orb-y", y);
    hero.style.setProperty("--hero-mask-x", x);
    hero.style.setProperty("--hero-mask-y", y);

    window.requestAnimationFrame(tick);
  }

  window.requestAnimationFrame(tick);
})();
