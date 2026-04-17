// Zenithy Hero route B animation.
// site-config.json owns the text; this file only controls the whole-screen interaction model.
(function () {
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  var coarsePointer = window.matchMedia && window.matchMedia("(pointer: coarse)");
  var mobileViewport = window.matchMedia && window.matchMedia("(max-width: 820px)");
  var hero = document.querySelector(".hero");
  var plane = document.querySelector("[data-hero-plane]");
  var stage = document.querySelector("[data-hero-stage]");
  var title = document.getElementById("page-title");
  var reveal = document.getElementById("hero-title-reveal");

  if (!hero || !plane || !stage || !title || !reveal) {
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

  hero.classList.add("is-hero-ready");

  if (shouldReduceMotion()) {
    hero.style.setProperty("--hero-tilt-x", "0deg");
    hero.style.setProperty("--hero-tilt-y", "0deg");
    return;
  }

  var active = false;
  var bounds = null;
  var interactionTarget = hero;
  var pointer = { x: 0.8, y: 0.2 };
  var focus = { x: 0.8, y: 0.2 };
  var mask = { x: 0.8, y: 0.2 };
  var orb = { x: 0.86, y: 0.14 };
  var tilt = { x: 0, y: 0 };

  function setActive(next) {
    active = next;
    hero.classList.toggle("is-hero-active", next);
  }

  function refreshBounds() {
    // Use the full Hero section as the pointer surface. The visual reveal still
    // renders inside data-hero-plane, but movement anywhere in the first screen
    // now drives tilt/orb/mask feedback.
    bounds = interactionTarget.getBoundingClientRect();
  }

  function updatePointer(event) {
    if (!bounds) refreshBounds();
    if (!bounds.width || !bounds.height) return;

    var rawX = (event.clientX - bounds.left) / bounds.width;
    var rawY = (event.clientY - bounds.top) / bounds.height;

    // Project the full-screen pointer into the title stage. The reveal stays
    // close to the typography while the actual pointer can be anywhere in Hero.
    pointer.x = clamp(rawX, 0, 1);
    pointer.y = clamp(rawY, 0, 1);

    focus.x = clamp(0.08 + pointer.x * 0.84, 0.08, 0.92);
    focus.y = clamp(0.1 + pointer.y * 0.58, 0.1, 0.68);
  }

  interactionTarget.addEventListener(
    "pointerenter",
    function (event) {
      refreshBounds();
      setActive(true);
      updatePointer(event);
    },
    { passive: true }
  );

  interactionTarget.addEventListener("pointermove", updatePointer, { passive: true });

  interactionTarget.addEventListener(
    "pointerleave",
    function () {
      setActive(false);
      bounds = null;
    },
    { passive: true }
  );

  interactionTarget.addEventListener(
    "pointercancel",
    function () {
      setActive(false);
      bounds = null;
    },
    { passive: true }
  );

  stage.addEventListener("focusin", function () {
    setActive(true);
  });

  stage.addEventListener("focusout", function () {
    setActive(false);
  });

  window.addEventListener(
    "resize",
    function () {
      bounds = null;
    },
    { passive: true }
  );

  function tick(time) {
    var tiltEnabled = boolAttr("data-tilt-enabled", true);
    var orbEnabled = boolAttr("data-orb-enabled", true);
    var driftEnabled = boolAttr("data-orb-drift", true);
    var maxRotate = numberAttr("data-tilt-max", 20);
    var followStrength = clamp(numberAttr("data-orb-follow-strength", 0.14), 0.05, 0.24);
    var maskStrength = clamp(followStrength * 1.55, 0.14, 0.34);

    hero.classList.toggle("is-orb-disabled", !orbEnabled);

    var driftX = 0.82;
    var driftY = 0.22;
    if (driftEnabled) {
      driftX += Math.sin(time / 3000) * 0.04 + Math.sin(time / 5600) * 0.018;
      driftY += Math.cos(time / 3600) * 0.032;
    }

    var orbSide = focus.x < 0.5 ? -1 : 1;
    var targetMaskX = active ? focus.x : driftX;
    var targetMaskY = active ? focus.y : driftY;
    var targetOrbX = active ? clamp(focus.x + orbSide * 0.07, 0.08, 0.92) : driftX;
    var targetOrbY = active ? clamp(focus.y - 0.085, 0.08, 0.62) : driftY;

    mask.x += (targetMaskX - mask.x) * maskStrength;
    mask.y += (targetMaskY - mask.y) * maskStrength;
    orb.x += (targetOrbX - orb.x) * followStrength;
    orb.y += (targetOrbY - orb.y) * followStrength;

    var targetTiltX = active && tiltEnabled ? (0.5 - pointer.y) * maxRotate * 2 : 0;
    var targetTiltY = active && tiltEnabled ? (pointer.x - 0.5) * maxRotate * 2 : 0;

    tilt.x += (targetTiltX - tilt.x) * 0.13;
    tilt.y += (targetTiltY - tilt.y) * 0.13;

    var orbX = (orb.x * 100).toFixed(2) + "%";
    var orbY = (orb.y * 100).toFixed(2) + "%";
    var maskX = (mask.x * 100).toFixed(2) + "%";
    var maskY = (mask.y * 100).toFixed(2) + "%";

    hero.style.setProperty("--hero-orb-x", orbX);
    hero.style.setProperty("--hero-orb-y", orbY);
    hero.style.setProperty("--hero-mask-x", maskX);
    hero.style.setProperty("--hero-mask-y", maskY);
    hero.style.setProperty("--hero-tilt-x", tilt.x.toFixed(3) + "deg");
    hero.style.setProperty("--hero-tilt-y", tilt.y.toFixed(3) + "deg");

    window.requestAnimationFrame(tick);
  }

  window.requestAnimationFrame(tick);
})();
