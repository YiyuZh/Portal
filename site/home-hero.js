// Zenithy Hero route B animation.
// Text stays data-driven in site-config.json; this file only drives motion.
(function () {
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  var coarsePointer = window.matchMedia && window.matchMedia("(pointer: coarse)");
  var mobileViewport = window.matchMedia && window.matchMedia("(max-width: 820px)");
  var hero = document.querySelector(".hero");
  var stage = document.querySelector("[data-hero-stage]");
  var title = document.getElementById("page-title");
  var reveal = document.getElementById("hero-title-reveal");

  if (!hero || !stage || !title || !reveal) {
    return;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function boolAttr(name, fallback) {
    var value = stage.getAttribute(name);
    if (value === null || value === "") return fallback;
    return value !== "false";
  }

  function numberAttr(name, fallback) {
    var value = Number(stage.getAttribute(name));
    return Number.isFinite(value) ? value : fallback;
  }

  function shouldReduceMotion() {
    return Boolean(
      (reduceMotion && reduceMotion.matches) ||
        (coarsePointer && coarsePointer.matches) ||
        (mobileViewport && mobileViewport.matches)
    );
  }

  function syncA11yTitle() {
    stage.setAttribute("aria-label", (title.textContent || "").replace(/\s+/g, " ").trim());
  }

  syncA11yTitle();

  if ("MutationObserver" in window) {
    new MutationObserver(syncA11yTitle).observe(title, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  if (shouldReduceMotion()) {
    hero.style.setProperty("--hero-tilt-x", "0deg");
    hero.style.setProperty("--hero-tilt-y", "0deg");
    return;
  }

  var active = false;
  var pointer = { x: 0.66, y: 0.35 };
  var orb = { x: 0.66, y: 0.35 };
  var tilt = { x: 0, y: 0 };

  function setActive(next) {
    active = next;
    hero.classList.toggle("is-hero-active", next);
  }

  function updatePointer(event) {
    var rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    pointer.x = clamp((event.clientX - rect.left) / rect.width, 0.08, 0.92);
    pointer.y = clamp((event.clientY - rect.top) / rect.height, 0.12, 0.86);
  }

  stage.addEventListener(
    "pointerenter",
    function (event) {
      setActive(true);
      updatePointer(event);
    },
    { passive: true }
  );

  stage.addEventListener("pointermove", updatePointer, { passive: true });

  stage.addEventListener(
    "pointerleave",
    function () {
      setActive(false);
    },
    { passive: true }
  );

  stage.addEventListener("focusin", function () {
    setActive(true);
  });

  stage.addEventListener("focusout", function () {
    setActive(false);
  });

  function tick(time) {
    var tiltEnabled = boolAttr("data-tilt-enabled", true);
    var orbEnabled = boolAttr("data-orb-enabled", true);
    var driftEnabled = boolAttr("data-orb-drift", true);
    var maxRotate = numberAttr("data-tilt-max", 8);
    var followStrength = clamp(numberAttr("data-orb-follow-strength", 0.08), 0.02, 0.18);

    hero.classList.toggle("is-orb-disabled", !orbEnabled);

    var driftX = 0.66;
    var driftY = 0.35;
    if (driftEnabled) {
      driftX += Math.sin(time / 2800) * 0.055 + Math.sin(time / 5200) * 0.025;
      driftY += Math.cos(time / 3300) * 0.045;
    }

    var targetX = active ? pointer.x : driftX;
    var targetY = active ? pointer.y : driftY;

    orb.x += (targetX - orb.x) * followStrength;
    orb.y += (targetY - orb.y) * followStrength;

    var targetTiltX = active && tiltEnabled ? (0.5 - pointer.y) * maxRotate : 0;
    var targetTiltY = active && tiltEnabled ? (pointer.x - 0.5) * maxRotate : 0;

    tilt.x += (targetTiltX - tilt.x) * 0.1;
    tilt.y += (targetTiltY - tilt.y) * 0.1;

    var x = (orb.x * 100).toFixed(2) + "%";
    var y = (orb.y * 100).toFixed(2) + "%";

    hero.style.setProperty("--hero-orb-x", x);
    hero.style.setProperty("--hero-orb-y", y);
    hero.style.setProperty("--hero-mask-x", x);
    hero.style.setProperty("--hero-mask-y", y);
    hero.style.setProperty("--hero-tilt-x", tilt.x.toFixed(3) + "deg");
    hero.style.setProperty("--hero-tilt-y", tilt.y.toFixed(3) + "deg");

    window.requestAnimationFrame(tick);
  }

  window.requestAnimationFrame(tick);
})();
