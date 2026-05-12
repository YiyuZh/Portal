(function () {
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  var mounted = new WeakSet();
  var mountedUniverses = new WeakSet();
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
    Array.prototype.slice.call(section.querySelectorAll("[data-skills-universe]")).forEach(activateUniverse);
    Array.prototype.slice.call(section.querySelectorAll("[data-skill-card]")).forEach(activateWithDelay);
  }

  function activateUniverse(universe) {
    if (!universe) return;
    universe.classList.add("is-universe-visible");
    Array.prototype.slice.call(universe.querySelectorAll("[data-skill-node]")).forEach(function (node, index) {
      window.setTimeout(function () {
        node.classList.add("is-node-visible");
      }, reducedMotion.matches ? 0 : index * 95);
    });
  }

  function mountUniverse(universe) {
    if (!universe || mountedUniverses.has(universe)) return;
    mountedUniverses.add(universe);

    var stage = universe.querySelector(".skills-universe__stage") || universe;
    var tooltip = universe.querySelector("[data-skill-tooltip]");
    var tooltipTitle = tooltip ? tooltip.querySelector("strong") : null;
    var tooltipDesc = tooltip ? tooltip.querySelector("span") : null;
    var nodes = Array.prototype.slice.call(universe.querySelectorAll("[data-skill-node]"));
    var activeNode = null;

    function showTooltip(node) {
      if (!tooltip || !tooltipTitle || !tooltipDesc || !node) return;
      if (activeNode && activeNode !== node) {
        activeNode.classList.remove("is-tech-active");
      }
      activeNode = node;
      node.classList.add("is-tech-active");
      universe.classList.add("is-link-active");
      universe.style.setProperty("--active-brand-rgb", node.style.getPropertyValue("--skill-brand-rgb") || "255,255,255");
      tooltip.style.setProperty("--tooltip-brand", node.style.getPropertyValue("--skill-brand") || "#fff");
      tooltip.style.setProperty("--tooltip-brand-2", node.style.getPropertyValue("--skill-brand-2") || node.style.getPropertyValue("--skill-brand") || "#fff");
      tooltipTitle.textContent = node.getAttribute("data-skill-title") || "";
      tooltipDesc.textContent = node.getAttribute("data-skill-desc") || "";
      tooltip.style.setProperty("--tooltip-x", node.style.getPropertyValue("--node-x") || "50%");
      tooltip.style.setProperty("--tooltip-y", node.style.getPropertyValue("--node-y") || "50%");
      tooltip.setAttribute("aria-hidden", "false");
      tooltip.classList.add("is-visible");
    }

    function hideTooltip() {
      if (!tooltip) return;
      tooltip.setAttribute("aria-hidden", "true");
      tooltip.classList.remove("is-visible");
      universe.classList.remove("is-link-active");
      if (activeNode) {
        activeNode.classList.remove("is-tech-active");
        activeNode = null;
      }
    }

    nodes.forEach(function (node) {
      node.addEventListener("pointerenter", function () {
        showTooltip(node);
      });
      node.addEventListener("focus", function () {
        showTooltip(node);
      });
      node.addEventListener("pointerleave", hideTooltip);
      node.addEventListener("blur", hideTooltip);
    });

    if (finePointer.matches && !reducedMotion.matches) {
      stage.addEventListener("pointermove", function (event) {
        var rect = stage.getBoundingClientRect();
        var x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        var y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
        universe.style.setProperty("--web-x", Math.max(-1, Math.min(1, x)).toFixed(3));
        universe.style.setProperty("--web-y", Math.max(-1, Math.min(1, y)).toFixed(3));
      }, { passive: true });

      stage.addEventListener("pointerleave", function () {
        universe.style.setProperty("--web-x", "0");
        universe.style.setProperty("--web-y", "0");
        hideTooltip();
      });
    }

    if (sectionActive || reducedMotion.matches) {
      activateUniverse(universe);
    }
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
    if (scope.matches && scope.matches("[data-skills-universe]")) {
      mountUniverse(scope);
    }
    Array.prototype.slice.call(scope.querySelectorAll("[data-skills-universe]")).forEach(mountUniverse);
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
