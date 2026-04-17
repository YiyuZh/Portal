// Zenithy Hero interaction model.
// Text still comes from site-config.json; this file only owns pointer, tilt,
// the shared orb/reveal center, and reduced-motion guards.
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
    hero.style.setProperty("--hero-rotate-x", "0deg");
    hero.style.setProperty("--hero-rotate-y", "0deg");
    hero.style.setProperty("--hero-pointer-x", "50%");
    hero.style.setProperty("--hero-pointer-y", "50%");
    return;
  }

  var active = false;
  var heroBounds = null;
  var stageBounds = null;
  var interactionTarget = hero;

  // The pointer uses the full Hero rectangle. Stage coordinates are a true
  // geometric projection into the typography stage, not a compressed shortcut.
  var pointer = { x: 0.78, y: 0.22 };
  var stagePoint = { x: 0.78, y: 0.24 };
  var center = { x: 0.78, y: 0.24 };
  var tilt = { x: 0, y: 0 };

  function setActive(next) {
    active = next;
    hero.classList.toggle("is-hero-active", next);
  }

  function refreshBounds() {
    heroBounds = interactionTarget.getBoundingClientRect();
    stageBounds = stage.getBoundingClientRect();
  }

  function updatePointer(event) {
    if (!heroBounds || !stageBounds) refreshBounds();
    if (!heroBounds.width || !heroBounds.height || !stageBounds.width || !stageBounds.height) return;

    pointer.x = clamp((event.clientX - heroBounds.left) / heroBounds.width, 0, 1);
    pointer.y = clamp((event.clientY - heroBounds.top) / heroBounds.height, 0, 1);

    stagePoint.x = clamp((event.clientX - stageBounds.left) / stageBounds.width, 0, 1);
    stagePoint.y = clamp((event.clientY - stageBounds.top) / stageBounds.height, 0, 1);
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
      heroBounds = null;
      stageBounds = null;
    },
    { passive: true }
  );

  interactionTarget.addEventListener(
    "pointercancel",
    function () {
      setActive(false);
      heroBounds = null;
      stageBounds = null;
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
      heroBounds = null;
      stageBounds = null;
    },
    { passive: true }
  );

  function tick(time) {
    var tiltEnabled = boolAttr("data-tilt-enabled", true);
    var orbEnabled = boolAttr("data-orb-enabled", true);
    var driftEnabled = boolAttr("data-orb-drift", true);
    var maxRotate = clamp(numberAttr("data-tilt-max", 24), 0, 28);
    var followStrength = clamp(numberAttr("data-orb-follow-strength", 0.18), 0.08, 0.34);

    hero.classList.toggle("is-orb-disabled", !orbEnabled);

    var driftX = 0.78;
    var driftY = 0.22;
    if (driftEnabled) {
      driftX += Math.sin(time / 2800) * 0.065 + Math.sin(time / 5400) * 0.026;
      driftY += Math.cos(time / 3300) * 0.045;
    }

    var targetCenterX = active ? stagePoint.x : clamp(driftX, 0.08, 0.92);
    var targetCenterY = active ? stagePoint.y : clamp(driftY, 0.08, 0.84);

    center.x += (targetCenterX - center.x) * followStrength;
    center.y += (targetCenterY - center.y) * followStrength;

    var targetTiltX = active && tiltEnabled ? (0.5 - pointer.y) * maxRotate * 2 : 0;
    var targetTiltY = active && tiltEnabled ? (pointer.x - 0.5) * maxRotate * 2 : 0;

    tilt.x += (targetTiltX - tilt.x) * 0.16;
    tilt.y += (targetTiltY - tilt.y) * 0.16;

    var centerX = (center.x * 100).toFixed(2) + "%";
    var centerY = (center.y * 100).toFixed(2) + "%";

    hero.style.setProperty("--hero-orb-x", centerX);
    hero.style.setProperty("--hero-orb-y", centerY);
    hero.style.setProperty("--hero-mask-x", centerX);
    hero.style.setProperty("--hero-mask-y", centerY);
    hero.style.setProperty("--hero-pointer-x", (pointer.x * 100).toFixed(2) + "%");
    hero.style.setProperty("--hero-pointer-y", (pointer.y * 100).toFixed(2) + "%");
    hero.style.setProperty("--hero-rotate-x", tilt.x.toFixed(3) + "deg");
    hero.style.setProperty("--hero-rotate-y", tilt.y.toFixed(3) + "deg");

    window.requestAnimationFrame(tick);
  }

  window.requestAnimationFrame(tick);
})();
