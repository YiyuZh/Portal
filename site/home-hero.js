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
  var orbEl = document.querySelector(".hero-orb");

  if (!hero || !plane || !stage || !title || !reveal || !orbEl) {
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
  var planeBounds = null;
  var orbRadius = 86;

  // The pointer source is the whole viewport. This keeps the typography alive
  // even when the cursor reaches the far left/right/top/bottom of the screen.
  var pointer = { x: 0.78, y: 0.22 };
  var targetOrb = { x: 0, y: 0 };
  var orb = { x: 0, y: 0 };
  var tilt = { x: 0, y: 0 };

  function setActive(next) {
    active = next;
    hero.classList.toggle("is-hero-active", next);
  }

  function refreshBounds() {
    heroBounds = hero.getBoundingClientRect();
    planeBounds = plane.getBoundingClientRect();
    var orbRect = orbEl.getBoundingClientRect();
    orbRadius = Math.max(55, (orbRect.width || 172) / 2);
    if (!orb.x && planeBounds.width) {
      orb.x = planeBounds.width * 0.78;
      orb.y = planeBounds.height * 0.24;
    }
  }

  function heroIsVisible() {
    if (!heroBounds) refreshBounds();
    var viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
    return heroBounds.bottom > 0 && heroBounds.top < viewportHeight;
  }

  function updatePointer(event) {
    refreshBounds();
    if (!heroBounds.width || !heroBounds.height) return;

    var viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1;
    var viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
    var visible = heroIsVisible();

    pointer.x = clamp(event.clientX / viewportWidth, 0, 1);
    pointer.y = clamp(event.clientY / viewportHeight, 0, 1);

    var rawOrbX = event.clientX - planeBounds.left;
    var rawOrbY = event.clientY - planeBounds.top;
    var edgePadding = orbRadius * 0.35;

    targetOrb.x = clamp(rawOrbX, edgePadding, planeBounds.width - edgePadding);
    targetOrb.y = clamp(rawOrbY, edgePadding, planeBounds.height - edgePadding);

    setActive(visible);
  }

  window.addEventListener("pointermove", updatePointer, { passive: true });

  window.addEventListener(
    "pointerleave",
    function () {
      setActive(false);
      heroBounds = null;
    },
    { passive: true }
  );

  window.addEventListener(
    "pointercancel",
    function () {
      setActive(false);
      heroBounds = null;
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
    },
    { passive: true }
  );

  window.addEventListener(
    "scroll",
    function () {
      heroBounds = null;
      refreshBounds();
      setActive(heroIsVisible() && active);
    },
    { passive: true }
  );

  function tick(time) {
    if (!heroBounds || !planeBounds) {
      refreshBounds();
    }

    var tiltEnabled = boolAttr("data-tilt-enabled", true);
    var orbEnabled = boolAttr("data-orb-enabled", true);
    var driftEnabled = boolAttr("data-orb-drift", true);
    var maxRotate = clamp(numberAttr("data-tilt-max", 20), 0, 24);
    var followStrength = clamp(numberAttr("data-orb-follow-strength", 0.18), 0.08, 0.34);

    hero.classList.toggle("is-orb-disabled", !orbEnabled);

    var driftX = 0.78;
    var driftY = 0.22;
    if (driftEnabled) {
      driftX += Math.sin(time / 2800) * 0.065 + Math.sin(time / 5400) * 0.026;
      driftY += Math.cos(time / 3300) * 0.045;
    }

    var idleOrbX = planeBounds && planeBounds.width ? planeBounds.width * clamp(driftX, 0.08, 0.92) : 0;
    var idleOrbY = planeBounds && planeBounds.height ? planeBounds.height * clamp(driftY, 0.08, 0.84) : 0;

    var targetOrbX = active ? targetOrb.x : idleOrbX;
    var targetOrbY = active ? targetOrb.y : idleOrbY;

    orb.x += (targetOrbX - orb.x) * followStrength;
    orb.y += (targetOrbY - orb.y) * followStrength;

    var targetTiltX = active && tiltEnabled ? (0.5 - pointer.y) * maxRotate * 2 : 0;
    var targetTiltY = active && tiltEnabled ? (pointer.x - 0.5) * maxRotate * 2 : 0;

    tilt.x += (targetTiltX - tilt.x) * 0.16;
    tilt.y += (targetTiltY - tilt.y) * 0.16;

    var orbX = orb.x.toFixed(2) + "px";
    var orbY = orb.y.toFixed(2) + "px";

    hero.style.setProperty("--hero-orb-x", orbX);
    hero.style.setProperty("--hero-orb-y", orbY);
    hero.style.setProperty("--hero-pointer-x", (pointer.x * 100).toFixed(2) + "%");
    hero.style.setProperty("--hero-pointer-y", (pointer.y * 100).toFixed(2) + "%");
    hero.style.setProperty("--hero-rotate-x", tilt.x.toFixed(3) + "deg");
    hero.style.setProperty("--hero-rotate-y", tilt.y.toFixed(3) + "deg");

    window.requestAnimationFrame(tick);
  }

  window.requestAnimationFrame(tick);
})();
