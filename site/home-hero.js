// Zenithy Hero route B animation.
// site-config.json owns the text; this file only controls the interaction plane.
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
  var stageBounds = null;
  var pointer = { x: 0.72, y: 0.28 };
  var focus = { x: 0.72, y: 0.28 };
  var orb = { x: 0.72, y: 0.28 };
  var tilt = { x: 0, y: 0 };

  function setActive(next) {
    active = next;
    hero.classList.toggle("is-hero-active", next);
  }

  function refreshBounds() {
    bounds = plane.getBoundingClientRect();
    stageBounds = stage.getBoundingClientRect();
  }

  function updatePointer(event) {
    if (!bounds) refreshBounds();
    if (!bounds.width || !bounds.height) return;

    var rawX = (event.clientX - bounds.left) / bounds.width;
    var rawY = (event.clientY - bounds.top) / bounds.height;

    // The plane is intentionally taller than the title. Clamp the focus so the
    // orb reveals the headline instead of sitting on top of the center text.
    pointer.x = clamp(rawX, 0.12, 0.9);
    pointer.y = clamp(rawY, 0.1, 0.68);

    if (stageBounds && stageBounds.width && stageBounds.height) {
      focus.x = clamp((event.clientX - stageBounds.left) / stageBounds.width, 0.08, 0.92);
      focus.y = clamp((event.clientY - stageBounds.top) / stageBounds.height, 0.06, 0.78);
    }
  }

  plane.addEventListener(
    "pointerenter",
    function (event) {
      refreshBounds();
      setActive(true);
      updatePointer(event);
    },
    { passive: true }
  );

  plane.addEventListener("pointermove", updatePointer, { passive: true });

  plane.addEventListener(
    "pointerleave",
    function () {
      setActive(false);
      bounds = null;
    },
    { passive: true }
  );

  plane.addEventListener(
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
    var maxRotate = numberAttr("data-tilt-max", 8);
    var followStrength = clamp(numberAttr("data-orb-follow-strength", 0.08), 0.03, 0.2);

    hero.classList.toggle("is-orb-disabled", !orbEnabled);

    var driftX = 0.72;
    var driftY = 0.28;
    if (driftEnabled) {
      driftX += Math.sin(time / 3000) * 0.045 + Math.sin(time / 5600) * 0.018;
      driftY += Math.cos(time / 3600) * 0.038;
    }

    var targetX = active ? focus.x : driftX;
    var targetY = active ? focus.y : driftY;

    orb.x += (targetX - orb.x) * followStrength;
    orb.y += (targetY - orb.y) * followStrength;

    var targetTiltX = active && tiltEnabled ? (0.5 - pointer.y) * maxRotate : 0;
    var targetTiltY = active && tiltEnabled ? (pointer.x - 0.5) * maxRotate : 0;

    tilt.x += (targetTiltX - tilt.x) * 0.12;
    tilt.y += (targetTiltY - tilt.y) * 0.12;

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
