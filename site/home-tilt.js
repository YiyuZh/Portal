(function () {
  var supportsFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var mounted = new WeakSet();

  function canTilt() {
    return supportsFinePointer.matches && !prefersReducedMotion.matches;
  }

  function toNumber(value, fallback) {
    var number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function resetLayer(layer) {
    layer.style.transform = "";
  }

  function mountCard(card) {
    if (!card || mounted.has(card)) return;
    mounted.add(card);

    if (!canTilt()) return;

    var layers = Array.prototype.slice.call(card.querySelectorAll("[data-tilt-layer]"));
    var maxRotate = toNumber(card.getAttribute("data-tilt-max"), 5.8);
    var maxMove = 16;
    var currentX = 0;
    var currentY = 0;
    var targetX = 0;
    var targetY = 0;
    var rafId = 0;
    var active = false;
    var rect = null;

    card.setAttribute("data-tilt-ready", "true");

    function schedule() {
      if (!rafId) {
        rafId = window.requestAnimationFrame(render);
      }
    }

    function render() {
      rafId = 0;
      currentX += (targetX - currentX) * 0.16;
      currentY += (targetY - currentY) * 0.16;

      var rotateX = -currentY * maxRotate;
      var rotateY = currentX * maxRotate;

      card.style.setProperty("--card-tilt-x", rotateX.toFixed(3) + "deg");
      card.style.setProperty("--card-tilt-y", rotateY.toFixed(3) + "deg");

      layers.forEach(function (layer) {
        var depth = toNumber(layer.getAttribute("data-tilt-layer"), 10);
        var moveX = currentX * Math.min(depth, maxMove);
        var moveY = currentY * Math.min(depth, maxMove);
        layer.style.transform = "translate3d(" + moveX.toFixed(2) + "px, " + moveY.toFixed(2) + "px, " + (depth * 0.35).toFixed(2) + "px)";
      });

      if (active || Math.abs(currentX) > 0.002 || Math.abs(currentY) > 0.002) {
        schedule();
      } else {
        card.style.setProperty("--card-tilt-x", "0deg");
        card.style.setProperty("--card-tilt-y", "0deg");
        layers.forEach(resetLayer);
      }
    }

    function updatePointer(event) {
      if (!active || !rect) return;

      var x = (event.clientX - rect.left) / rect.width;
      var y = (event.clientY - rect.top) / rect.height;
      targetX = Math.max(-1, Math.min(1, (x - 0.5) * 2));
      targetY = Math.max(-1, Math.min(1, (y - 0.5) * 2));

      card.style.setProperty("--card-glow-x", (x * 100).toFixed(1) + "%");
      card.style.setProperty("--card-glow-y", (y * 100).toFixed(1) + "%");
      schedule();
    }

    function enter(event) {
      if (!canTilt()) return;
      active = true;
      rect = card.getBoundingClientRect();
      card.classList.add("is-tilting");
      updatePointer(event);
    }

    function leave() {
      active = false;
      targetX = 0;
      targetY = 0;
      rect = null;
      card.classList.remove("is-tilting");
      schedule();
    }

    card.addEventListener("pointerenter", enter);
    card.addEventListener("pointermove", updatePointer, { passive: true });
    card.addEventListener("pointerleave", leave);
    card.addEventListener("pointercancel", leave);
  }

  function refresh(root) {
    var scope = root && root.querySelectorAll ? root : document;
    if (scope.matches && scope.matches(".showcase-card")) {
      mountCard(scope);
    }
    Array.prototype.slice.call(scope.querySelectorAll(".showcase-card")).forEach(mountCard);
  }

  window.ZenithyProjectTilt = {
    refresh: refresh,
  };

  function boot() {
    refresh(document);
    var grid = document.getElementById("projects-grid");
    if (grid && "MutationObserver" in window) {
      new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          Array.prototype.slice.call(mutation.addedNodes).forEach(function (node) {
            refresh(node);
          });
        });
      }).observe(grid, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
