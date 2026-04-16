(function () {
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  var mounted = new WeakSet();
  var animatedMetrics = new WeakSet();
  var sectionActive = false;
  var sectionObserver = null;

  function toNumber(value, fallback) {
    var number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function animateMetric(metric) {
    if (!metric || animatedMetrics.has(metric)) return;
    animatedMetrics.add(metric);

    var target = toNumber(metric.getAttribute("data-target"), 0);
    var suffix = metric.getAttribute("data-suffix") || "";

    if (reducedMotion.matches || target <= 0) {
      metric.textContent = String(Math.round(target)) + suffix;
      return;
    }

    var startedAt = performance.now();
    var duration = 920;

    function tick(now) {
      var progress = Math.min(1, (now - startedAt) / duration);
      var eased = 1 - Math.pow(1 - progress, 3);
      metric.textContent = String(Math.round(target * eased)) + suffix;
      if (progress < 1) {
        window.requestAnimationFrame(tick);
      }
    }

    window.requestAnimationFrame(tick);
  }

  function activate(card) {
    if (!card) return;
    card.classList.add("is-skill-active");
    animateMetric(card.querySelector(".skill-metric-value"));
  }

  function activateWithDelay(card) {
    var index = toNumber(card.getAttribute("data-skill-index"), 0);
    window.setTimeout(function () {
      activate(card);
    }, index * 140);
  }

  function activateList(root) {
    var section = root || document.getElementById("skills") || document;
    if (section.classList) {
      section.classList.add("is-skills-active");
    }
    Array.prototype.slice.call(section.querySelectorAll("[data-skill-card]")).forEach(activateWithDelay);
  }

  function mountTilt(card) {
    if (!finePointer.matches || reducedMotion.matches) return;

    var layers = Array.prototype.slice.call(card.querySelectorAll("[data-skill-layer]"));
    var currentX = 0;
    var currentY = 0;
    var targetX = 0;
    var targetY = 0;
    var rect = null;
    var rafId = 0;
    var active = false;

    function schedule() {
      if (!rafId) rafId = window.requestAnimationFrame(render);
    }

    function render() {
      rafId = 0;
      currentX += (targetX - currentX) * 0.18;
      currentY += (targetY - currentY) * 0.18;

      card.style.setProperty("--skill-tilt-x", (-currentY * 4.2).toFixed(3) + "deg");
      card.style.setProperty("--skill-tilt-y", (currentX * 4.2).toFixed(3) + "deg");
      card.style.setProperty("--skill-glow-x", ((currentX + 1) * 50).toFixed(1) + "%");
      card.style.setProperty("--skill-glow-y", ((currentY + 1) * 50).toFixed(1) + "%");

      layers.forEach(function (layer) {
        var depth = toNumber(layer.getAttribute("data-skill-layer"), 8);
        layer.style.transform = "translate3d(" + (currentX * depth).toFixed(2) + "px, " + (currentY * depth).toFixed(2) + "px, 0)";
      });

      if (active || Math.abs(currentX) > 0.002 || Math.abs(currentY) > 0.002) {
        schedule();
      } else {
        layers.forEach(function (layer) {
          layer.style.transform = "";
        });
        card.style.setProperty("--skill-tilt-x", "0deg");
        card.style.setProperty("--skill-tilt-y", "0deg");
      }
    }

    function move(event) {
      if (!active || !rect) return;
      var x = (event.clientX - rect.left) / rect.width;
      var y = (event.clientY - rect.top) / rect.height;
      targetX = Math.max(-1, Math.min(1, (x - 0.5) * 2));
      targetY = Math.max(-1, Math.min(1, (y - 0.5) * 2));
      schedule();
    }

    function enter(event) {
      active = true;
      rect = card.getBoundingClientRect();
      card.classList.add("is-skill-tilting");
      move(event);
    }

    function leave() {
      active = false;
      targetX = 0;
      targetY = 0;
      rect = null;
      card.classList.remove("is-skill-tilting");
      schedule();
    }

    card.addEventListener("pointerenter", enter);
    card.addEventListener("pointermove", move, { passive: true });
    card.addEventListener("pointerleave", leave);
    card.addEventListener("pointercancel", leave);
  }

  function mount(card) {
    if (!card || mounted.has(card)) return;
    mounted.add(card);

    card.setAttribute("data-skill-ready", "true");
    mountTilt(card);

    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      activate(card);
      return;
    }

    if (sectionActive) {
      activateWithDelay(card);
    }
  }

  function refresh(root) {
    var scope = root && root.querySelectorAll ? root : document;
    if (scope.matches && scope.matches("[data-skill-card]")) {
      mount(scope);
    }
    Array.prototype.slice.call(scope.querySelectorAll("[data-skill-card]")).forEach(mount);
  }

  window.ZenithySkills = {
    refresh: refresh,
    activate: function () {
      sectionActive = true;
      activateList(document.getElementById("skills"));
    },
  };

  function boot() {
    var section = document.getElementById("skills");
    refresh(document);
    if (section && !reducedMotion.matches && "IntersectionObserver" in window) {
      sectionObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            sectionActive = true;
            activateList(section);
            sectionObserver.unobserve(section);
          }
        });
      }, { rootMargin: "0px 0px -24% 0px", threshold: 0.18 });
      sectionObserver.observe(section);
    } else {
      sectionActive = true;
      activateList(section);
    }

    var list = document.getElementById("skills-list");
    if (list && "MutationObserver" in window) {
      new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          Array.prototype.slice.call(mutation.addedNodes).forEach(function (node) {
            refresh(node);
          });
        });
      }).observe(list, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
