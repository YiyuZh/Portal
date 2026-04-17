#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const rootDir = path.resolve(__dirname, "..");
const siteDir = path.join(rootDir, "site");
const hiremateCaddy = path.resolve(rootDir, "..", "..", "hiremate", "Caddyfile");

const targets = {
  envExample: path.join(rootDir, ".env.example"),
  index: path.join(siteDir, "index.html"),
  homeVisual: path.join(siteDir, "home-visual.css"),
  homeHero: path.join(siteDir, "home-hero.js"),
  homeTilt: path.join(siteDir, "home-tilt.js"),
  homeSkills: path.join(siteDir, "home-skills.js"),
  homeCollab: path.join(siteDir, "home-collab.js"),
  favicon: path.join(siteDir, "favicon.svg"),
  blogIndex: path.join(siteDir, "blog", "index.html"),
  blogPost: path.join(siteDir, "blog", "post.html"),
  adminCss: path.join(siteDir, "blog", "admin", "admin.css"),
  blogAdmin: path.join(siteDir, "blog", "admin", "index.html"),
  blogEditor: path.join(siteDir, "blog", "admin", "editor.html"),
  projectsAdmin: path.join(siteDir, "blog", "admin", "projects.html"),
  messagesAdmin: path.join(siteDir, "blog", "admin", "messages.html"),
  projects: path.join(siteDir, "assets", "projects.json"),
  siteConfig: path.join(siteDir, "assets", "site-config.json"),
  manifest: path.join(siteDir, "blog", "posts", "manifest.json"),
  messagesManifest: path.join(siteDir, "blog", "messages", "manifest.json"),
  messagesApiTest: path.join(rootDir, "scripts", "test-messages-api.js"),
};

const errors = [];
const warnings = [];
const hints = [];

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    errors.push(`[file missing] ${filePath}`);
    return "";
  }
}

function readJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
    return JSON.parse(raw);
  } catch (error) {
    errors.push(`[json] ${filePath}: ${error.message}`);
    return null;
  }
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

function isHttpUrl(url) {
  return /^https?:\/\//i.test(url);
}

function checkUrl(value, label, options = {}) {
  if (!value) {
    if (options.required !== false) errors.push(`[url missing] ${label}`);
    return;
  }
  if (value === "#") return;
  if (!isHttpUrl(value)) errors.push(`[url invalid] ${label}: ${value}`);
}

function isPublishedPost(post) {
  if (!post || typeof post !== "object") return false;
  if (post.published === true) return true;
  if (post.published === false) return false;
  const status = String(post.status || "").trim().toLowerCase();
  if (!status) return true;
  if (["published", "publish", "live", "已发布", "已發佈"].includes(status)) return true;
  if (["draft", "草稿", "archived", "已归档", "已歸檔", "hidden", "private"].includes(status)) return false;
  return true;
}

function resolveLocalRef(ref, baseDir = siteDir) {
  if (!ref || isHttpUrl(ref) || ref.startsWith("mailto:") || ref.startsWith("tel:") || ref.startsWith("#")) {
    return null;
  }
  if (ref.includes("${") || ref.includes("}") || /[\r\n]/.test(ref)) return null;
  const clean = ref.split("?")[0].split("#")[0];
  if (!clean) return null;
  if (clean.startsWith("/")) return path.join(siteDir, clean.slice(1));
  return path.resolve(baseDir, clean);
}

function collectRefs(html) {
  const refs = [];
  const regex = /(href|src)=["']([^"']+)["']/g;
  let match;
  while ((match = regex.exec(html))) refs.push(match[2]);
  return Array.from(new Set(refs));
}

function checkRefs(html, filePath, label) {
  if (!html) return;
  const baseDir = path.dirname(filePath);
  collectRefs(html).forEach((ref) => {
    const localPath = resolveLocalRef(ref, baseDir);
    if (localPath && !exists(localPath)) {
      errors.push(`[asset missing] ${label}: ${ref} -> ${localPath}`);
    }
  });
}

function compileInlineScripts(html, filePath) {
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
  scripts.forEach((script, index) => {
    try {
      new vm.Script(script, { filename: `${filePath}#script${index + 1}` });
    } catch (error) {
      errors.push(`[inline script] ${filePath}#script${index + 1}: ${error.message}`);
    }
  });
}

function compileScriptFile(filePath) {
  if (!exists(filePath)) return;
  try {
    new vm.Script(readText(filePath), { filename: filePath });
  } catch (error) {
    errors.push(`[script] ${filePath}: ${error.message}`);
  }
}

function checkRequiredFiles() {
  Object.entries(targets).forEach(([name, filePath]) => {
    if (!exists(filePath)) errors.push(`[required file] ${name}: ${filePath}`);
  });
}

function checkHomepageStructure() {
  const html = readText(targets.index);
  if (!html) return;

  checkRefs(html, targets.index, "homepage");
  compileInlineScripts(html, targets.index);

  ["home-visual.css", "home-hero.js", "home-tilt.js", "home-skills.js", "home-collab.js", "assets/site-config.json", "assets/projects.json"].forEach((needle) => {
    if (!html.includes(needle)) errors.push(`[homepage reference] missing ${needle}`);
  });

  ["projects", "skills", "collab", "about", "contact"].forEach((id) => {
    if (!html.includes(`id="${id}"`)) errors.push(`[section] missing #${id}`);
  });

  ["projects-grid", "skills-list", "collab-list"].forEach((id) => {
    if (!html.includes(`id="${id}"`)) errors.push(`[data container] missing #${id}`);
  });

  [
    "hero-title-leading",
    "hero-title-hello",
    "hero-title-im",
    "hero-title-name",
    "hero-reveal-hello",
    "hero-reveal-im",
    "hero-reveal-name",
    "hero-meta-line",
  ].forEach((id) => {
    if (!html.includes(`id="${id}"`)) errors.push(`[hero] missing #${id}`);
  });
  if (!html.includes("hero-interaction-plane") || !html.includes("data-hero-plane")) {
    errors.push("[hero] missing large interaction plane (.hero-interaction-plane / data-hero-plane)");
  }
  if (!html.includes('class="brand-mark" src="./favicon.svg"')) {
    errors.push("[brand] homepage brand mark must reuse ./favicon.svg");
  }
  if (html.includes("hero-subtitle") || html.includes("hero-actions") || html.includes("hero-cta-primary") || html.includes("hero-cta-secondary")) {
    errors.push("[hero] legacy subtitle/actions/CTA should not be rendered in Hero");
  }
  if (html.includes("\u7edf\u4e00\u5165\u53e3") || html.includes("Creative Engineering Lab") || html.includes("hero-eyebrow")) {
    errors.push("[hero] legacy portal eyebrow/subtitle is still present");
  }
  if (html.includes("统一入口 · 快速访问 · 持续扩展")) {
    errors.push("[hero] legacy portal subtitle is still present");
  }

  if (!html.includes('data-scroll-target="projects"') || !html.includes("scrollIntoView")) {
    errors.push("[scroll] controlled scroll logic is missing");
  }
  if (!html.includes("IntersectionObserver") || !html.includes("setActiveNav")) {
    errors.push("[nav] active section observer is missing");
  }
  if (!html.includes("scrollRestoration") || !html.includes("pageshow")) {
    errors.push("[scroll] top reset protection is missing");
  }
  if (!html.includes("ZenithyReveal") || !html.includes("is-reveal")) {
    errors.push("[reveal] section reveal logic is missing");
  }
  if (/<a[^>]+href="#(?:projects|skills|collab|about|contact)"/i.test(html)) {
    errors.push("[hash nav] do not use href=\"#section\" as primary navigation");
  }
  if (!html.includes("https://blog.zenithy.art")) {
    errors.push("[blog] blog.zenithy.art entry is missing");
  }
  ["collab-form", "collab-email", "collab-message", "collab-feedback"].forEach((id) => {
    if (!html.includes(`id="${id}"`)) errors.push(`[collab form] missing #${id}`);
  });
}

function checkFaviconAndBrandLogo() {
  const pages = [
    ["homepage", targets.index, "./favicon.svg", "brand-mark"],
    ["blog index", targets.blogIndex, "../favicon.svg", "brand-mark"],
    ["blog post", targets.blogPost, "../favicon.svg", "brand-mark"],
    ["blog admin", targets.blogAdmin, "../../favicon.svg", "admin-brand-mark"],
    ["blog editor", targets.blogEditor, "../../favicon.svg", "admin-brand-mark"],
    ["projects admin", targets.projectsAdmin, "../../favicon.svg", "admin-brand-mark"],
    ["messages admin", targets.messagesAdmin, "../../favicon.svg", "admin-brand-mark"],
  ];

  pages.forEach(([label, filePath, faviconPath, logoClass]) => {
    const html = readText(filePath);
    if (!html) return;
    if (!html.includes(`rel="icon" type="image/svg+xml" href="${faviconPath}"`)) {
      errors.push(`[brand icon] ${label} must use ${faviconPath} as SVG favicon`);
    }
    if (!html.includes(`rel="alternate icon" href="${faviconPath}"`)) {
      errors.push(`[brand icon] ${label} must use ${faviconPath} as alternate favicon`);
    }
    if (!html.includes(`class="${logoClass}" src="${faviconPath}"`)) {
      errors.push(`[brand logo] ${label} must render ${faviconPath} with .${logoClass}`);
    }
    ["<span class=\"brand-mark\"", "brand-mark::after", "auto_awesome", "Chief Editor", "Alex Rivera"].forEach((legacy) => {
      if (html.includes(legacy)) {
        errors.push(`[brand legacy] ${label} still contains legacy logo/shell marker: ${legacy}`);
      }
    });
  });

  const adminCss = readText(targets.adminCss);
  if (adminCss.includes(".brand-mark")) {
    errors.push("[brand legacy] admin.css should not style .brand-mark; admin pages must use .admin-brand-mark");
  }
}

function checkHomepageMotion() {
  const css = readText(targets.homeVisual);
  const heroJs = readText(targets.homeHero);
  const tiltJs = readText(targets.homeTilt);
  const skillsJs = readText(targets.homeSkills);
  const collabJs = readText(targets.homeCollab);
  const indexHtml = readText(targets.index);
  if (!css || !heroJs || !tiltJs || !skillsJs || !collabJs || !indexHtml) return;

  if (!css.includes("prefers-reduced-motion")) errors.push("[motion] CSS reduced-motion fallback is missing");
  if (!css.includes(".is-reveal") || !css.includes(".is-visible")) errors.push("[reveal] CSS classes are missing");
  if (!css.includes("--hero-rotate-x") || !css.includes("--hero-rotate-y") || !css.includes("rotateX") || !css.includes("rotateY")) {
    errors.push("[hero] 3D tilt CSS is missing");
  }
  if (!heroJs.includes("requestAnimationFrame")) errors.push("[hero] requestAnimationFrame motion loop is missing");
  if (!heroJs.includes("prefers-reduced-motion")) errors.push("[hero] reduced-motion guard is missing");
  if (
    !heroJs.includes("interactionTarget = hero") ||
    !heroJs.includes("heroBounds = interactionTarget.getBoundingClientRect") ||
    !heroJs.includes("stage.getBoundingClientRect") ||
    !heroJs.includes("data-hero-plane")
  ) {
    errors.push("[hero] full-screen Hero interaction target or title-plane projection logic is missing");
  }
  [
    "0.1 + pointer.y * 0.58",
    "0.68",
    "0.07",
    "0.085",
  ].forEach((legacy) => {
    if (heroJs.includes(legacy)) {
      errors.push(`[hero regression] old compressed/offset interaction model still contains ${legacy}`);
    }
  });
  if (!heroJs.includes("data-tilt-max") || !heroJs.includes("data-orb-follow-strength")) {
    errors.push("[hero] tilt/orb config reading is missing");
  }
  if (!css.includes("clip-path: circle") || !css.includes(".hero-interaction-plane")) {
    errors.push("[hero] Chinese reveal circle mask or interaction plane CSS is missing");
  }
  if (css.includes("clamp(48px, 5.8vw, 92px)") || css.includes("clamp(44px, 16vw, 82px)")) {
    errors.push("[hero regression] black reveal orb is using the old small-dot size");
  }
  if (!css.includes("--hero-mask-size: clamp(180px, 19vw, 340px)")) {
    errors.push("[hero] black reveal orb must stay large enough for the Chinese reveal");
  }
  if (css.includes("rgba(13, 17, 16, 0.66)")) {
    errors.push("[hero regression] Zenithy title color is too gray");
  }
  ["你好", "我是", "詹已誉"].forEach((text) => {
    if (!indexHtml.includes(text)) errors.push(`[hero] segmented Chinese reveal missing ${text}`);
  });
  if (!css.includes("--card-tilt-x") || !css.includes("--card-tilt-y") || !css.includes("[data-tilt-layer]")) {
    errors.push("[projects tilt] project card tilt CSS is missing");
  }
  if (!tiltJs.includes("pointermove") || !tiltJs.includes("getBoundingClientRect") || !tiltJs.includes("requestAnimationFrame")) {
    errors.push("[projects tilt] project tilt script is missing pointer/RAF logic");
  }
  if (!tiltJs.includes("prefers-reduced-motion") || !tiltJs.includes("(hover: hover) and (pointer: fine)")) {
    errors.push("[projects tilt] desktop-only or reduced-motion guard is missing");
  }
  if (!tiltJs.includes("MutationObserver") || !tiltJs.includes("ZenithyProjectTilt")) {
    errors.push("[projects tilt] dynamic project card mounting is missing");
  }
  if (!indexHtml.includes("data-tilt-layer") || !indexHtml.includes("data-tilt-card")) {
    errors.push("[projects tilt] project card layer hooks are missing");
  }
  if (!css.includes("--skill-tilt-x") || !css.includes(".skill-highlight") || !css.includes("skillHeadingFlow")) {
    errors.push("[skills motion] skill card motion CSS is missing");
  }
  if (!css.includes(".skills-focus-board") || !css.includes(".skill-card--featured") || !css.includes(".skills-focus-stack")) {
    errors.push("[skills structure] featured skills board CSS is missing");
  }
  if (!css.includes("skill-card__progress") || !css.includes("is-skills-active")) {
    errors.push("[skills motion] progress line or section active state is missing");
  }
  if (!skillsJs.includes("IntersectionObserver") || !skillsJs.includes("requestAnimationFrame") || !skillsJs.includes("skill-metric-value")) {
    errors.push("[skills motion] skill activation or metric animation is missing");
  }
  if (!skillsJs.includes("activateWithDelay") || !skillsJs.includes("is-skills-active")) {
    errors.push("[skills motion] staggered section activation is missing");
  }
  if (!skillsJs.includes("prefers-reduced-motion") || !skillsJs.includes("(hover: hover) and (pointer: fine)")) {
    errors.push("[skills motion] reduced-motion or desktop-only guard is missing");
  }
  if (!skillsJs.includes("ZenithySkills") || !skillsJs.includes("MutationObserver")) {
    errors.push("[skills motion] dynamic skills mounting is missing");
  }
  if (!indexHtml.includes("renderSkillsList") || !indexHtml.includes("data-skill-card") || !indexHtml.includes("skill-card__progress")) {
    errors.push("[skills motion] skills renderer hooks are missing");
  }
  if (!indexHtml.includes("skills-focus-board") || !indexHtml.includes("data-skill-featured") || !indexHtml.includes("skills-focus-stack")) {
    errors.push("[skills structure] skills must render featured module + support stack");
  }
  if (!indexHtml.includes('card.className = "skill-card skill-card--"')) {
    errors.push("[skills motion] skills must use the dedicated skill-card renderer instead of the generic insight-card model");
  }
  if (!collabJs.includes("fetch(apiBase() + \"/messages\"") || !collabJs.includes("isEmail")) {
    errors.push("[collab api] POST /api/messages flow or validation is missing");
  }

  compileScriptFile(targets.homeHero);
  compileScriptFile(targets.homeTilt);
  compileScriptFile(targets.homeSkills);
  compileScriptFile(targets.homeCollab);
}

function checkProjects() {
  const data = readJson(targets.projects);
  if (!data) return;
  if (!Array.isArray(data.projects)) {
    errors.push("[projects] expected { projects: [] }");
    return;
  }

  const ids = new Set();
  data.projects.forEach((project, index) => {
    const label = `projects[${index}]`;
    if (!project.id) errors.push(`[required] ${label}.id`);
    if (!project.name) errors.push(`[required] ${label}.name`);
    if (!project.title) errors.push(`[required] ${label}.title`);
    if (!project.description) errors.push(`[required] ${label}.description`);
    if (project.id) {
      if (ids.has(project.id)) errors.push(`[duplicate id] ${label}.id = ${project.id}`);
      ids.add(project.id);
    }
    if (!Array.isArray(project.features)) warnings.push(`[type] ${label}.features should be array`);
    if (project.keywords !== undefined && !Array.isArray(project.keywords)) {
      warnings.push(`[type] ${label}.keywords should be array`);
    }
    const imagePath = resolveLocalRef(project.image, siteDir);
    if (imagePath && !exists(imagePath)) errors.push(`[image] ${label}.image missing: ${project.image}`);

    [
      ["primaryLabel", "primaryUrl"],
      ["secondaryLabel", "secondaryUrl"],
      ["tertiaryLabel", "tertiaryUrl"],
      ["quaternaryLabel", "quaternaryUrl"],
    ].forEach(([labelKey, urlKey]) => {
      if (project[labelKey] && !project[urlKey]) warnings.push(`[button] ${label}.${urlKey} is empty`);
      if (!project[labelKey] && project[urlKey]) errors.push(`[button] ${label}.${labelKey} is empty but url exists`);
      if (project[urlKey]) checkUrl(project[urlKey], `${label}.${urlKey}`, { required: false });
    });
  });
}

function checkSiteConfig() {
  const data = readJson(targets.siteConfig);
  if (!data) return;

  if (data.hero && (data.hero.subtitle || data.hero.primaryCta || data.hero.secondaryCta)) {
    errors.push("[hero config] Hero should not define subtitle/primaryCta/secondaryCta; project CTAs live in Projects section");
  }

  ["titleLeading", "titleName", "revealTitle", "metaLine"].forEach((field) => {
    if (!data.hero || !data.hero[field]) errors.push(`[hero config] missing siteConfig.hero.${field}`);
  });
  ["hello", "im"].forEach((field) => {
    if (!data.hero || !data.hero.titleParts || !data.hero.titleParts[field]) {
      errors.push(`[hero config] missing siteConfig.hero.titleParts.${field}`);
    }
  });
  ["hello", "im", "name"].forEach((field) => {
    if (!data.hero || !data.hero.revealParts || !data.hero.revealParts[field]) {
      errors.push(`[hero config] missing siteConfig.hero.revealParts.${field}`);
    }
  });
  if (!data.hero || !data.hero.tilt || typeof data.hero.tilt.maxRotate !== "number") {
    errors.push("[hero config] tilt.maxRotate must be number");
  } else if (data.hero.tilt.maxRotate < 22 || data.hero.tilt.maxRotate > 28) {
    errors.push("[hero config] tilt.maxRotate should stay between 22 and 28");
  }
  if (!data.hero || !data.hero.orb || typeof data.hero.orb.followStrength !== "number") {
    errors.push("[hero config] orb.followStrength must be number");
  }

  ["projects", "skills", "collab", "about", "contact"].forEach((section) => {
    const value = data.sections && data.sections[section];
    if (!value || !value.title || !value.description) {
      errors.push(`[siteConfig] sections.${section}.title/description missing`);
    }
  });

  ["skills", "collab"].forEach((section) => {
    const items = data.sections && data.sections[section] && data.sections[section].items;
    if (!Array.isArray(items) || !items.length) errors.push(`[siteConfig] sections.${section}.items missing`);
    if (section === "skills" && Array.isArray(items)) {
      items.forEach((item, index) => {
        if (item.metric !== undefined && typeof item.metric !== "number") {
          errors.push(`[siteConfig] sections.skills.items[${index}].metric must be number`);
        }
        if (item.highlights !== undefined && !Array.isArray(item.highlights)) {
          errors.push(`[siteConfig] sections.skills.items[${index}].highlights must be array`);
        }
        if (item.priority !== undefined && typeof item.priority !== "number") {
          errors.push(`[siteConfig] sections.skills.items[${index}].priority must be number`);
        }
        if (item.featured !== undefined && typeof item.featured !== "boolean") {
          errors.push(`[siteConfig] sections.skills.items[${index}].featured must be boolean`);
        }
      });
      if (!items.some((item) => item.featured === true)) {
        warnings.push("[siteConfig] sections.skills.items has no featured skill; homepage will fall back to the first item");
      }
    }
  });
}

function checkManifest() {
  const data = readJson(targets.manifest);
  if (!data) return;
  if (!Array.isArray(data.posts)) {
    errors.push("[manifest] expected { posts: [] }");
    return;
  }

  const slugs = new Set();
  data.posts.forEach((post, index) => {
    const label = `posts[${index}]`;
    if (!post.slug) errors.push(`[required] ${label}.slug`);
    if (!post.title) errors.push(`[required] ${label}.title`);
    if (post.published !== undefined && typeof post.published !== "boolean") {
      errors.push(`[manifest] ${label}.published must be boolean when provided`);
    }
    if (post.slug) {
      if (slugs.has(post.slug)) errors.push(`[duplicate slug] ${label}.slug = ${post.slug}`);
      slugs.add(post.slug);
    }
    if (!Array.isArray(post.tags)) warnings.push(`[type] ${label}.tags should be array`);

    if (isPublishedPost(post)) {
      if (!post.excerpt) errors.push(`[required] ${label}.excerpt`);
      if (!post.date && !post.updatedAt) errors.push(`[required] ${label}.date or ${label}.updatedAt`);
      if (post.slug) {
        const folder = path.join(siteDir, "blog", "posts", post.slug);
        const indexFile = path.join(folder, "index.html");
        if (!exists(folder)) errors.push(`[published post folder] missing ${folder}`);
        if (!exists(indexFile)) errors.push(`[published post index] missing ${indexFile}`);
      }
    }
  });
}

function checkMessagesManifest() {
  const data = readJson(targets.messagesManifest);
  if (!data) return;
  if (!Array.isArray(data.messages)) {
    errors.push("[messages manifest] expected { messages: [] }");
    return;
  }
  const ids = new Set();
  const allowed = new Set(["unread", "contacted", "archived"]);
  data.messages.forEach((message, index) => {
    const label = `messages[${index}]`;
    if (!message.id) errors.push(`[messages] ${label}.id missing`);
    if (!message.email) errors.push(`[messages] ${label}.email missing`);
    if (!message.message) errors.push(`[messages] ${label}.message missing`);
    if (message.id) {
      if (ids.has(message.id)) errors.push(`[messages] duplicate id ${message.id}`);
      ids.add(message.id);
    }
    if (message.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message.email)) {
      errors.push(`[messages] invalid email ${label}.email`);
    }
    if (message.status && !allowed.has(message.status)) {
      errors.push(`[messages] invalid status ${label}.status`);
    }
  });
}

function checkBlogAndAdmin() {
  if (!exists(targets.adminCss)) {
    errors.push("[admin shell] missing site/blog/admin/admin.css");
  }

  [
    ["blog index", targets.blogIndex],
    ["blog post", targets.blogPost],
    ["blog admin", targets.blogAdmin],
    ["blog editor", targets.blogEditor],
    ["projects admin", targets.projectsAdmin],
    ["messages admin", targets.messagesAdmin],
  ].forEach(([label, filePath]) => {
    const html = readText(filePath);
    checkRefs(html, filePath, label);
    compileInlineScripts(html, filePath);
  });

  const blogIndex = readText(targets.blogIndex);
  const blogAdmin = readText(targets.blogAdmin);
  const blogEditor = readText(targets.blogEditor);
  if (!blogIndex.includes('const manifestUrl = "./posts/manifest.json"')) {
    errors.push("[blog manifest] front blog index must read ./posts/manifest.json");
  }
  if (!blogAdmin.includes('const manifestUrl = "../posts/manifest.json"')) {
    errors.push("[blog manifest] admin article list must read ../posts/manifest.json");
  }
  [
    ["front blog index", blogIndex],
    ["admin article list", blogAdmin],
  ].forEach(([label, html]) => {
    if (!html.includes("manifestRequest(manifestUrl)") || !html.includes('cache: "no-store"')) {
      errors.push(`[blog manifest] ${label} must use cache-busted no-store manifest fetch`);
    }
    if (!html.includes("isPublishedPost")) {
      errors.push(`[blog manifest] ${label} must use the shared published/status rule`);
    }
  });
  if (!blogEditor.includes('fetch(manifestRequest("../posts/manifest.json"), { cache: "no-store" })')) {
    errors.push("[blog editor] publish flow must fetch manifest with cache-busting/no-store");
  }
  ["published: true", "updatedAt: now", "posts: [entry]"].forEach((needle) => {
    if (!blogEditor.includes(needle)) errors.push(`[blog editor] publish flow missing ${needle}`);
  });

  const adminPages = [
    ["blog admin", targets.blogAdmin, "文章列表"],
    ["blog editor", targets.blogEditor, "发布文章"],
    ["projects admin", targets.projectsAdmin, "项目管理"],
    ["messages admin", targets.messagesAdmin, "留言管理"],
  ];
  adminPages.forEach(([label, filePath, activeLabel]) => {
    const html = readText(filePath);
    if (!html.includes('href="./admin.css"')) {
      errors.push(`[admin shell] ${label} must reference ./admin.css`);
    }
    if (!html.includes('class="admin-sidebar"') || !html.includes('class="admin-nav"')) {
      errors.push(`[admin shell] ${label} must use shared admin sidebar/nav`);
    }
    if (!html.includes('src="../../favicon.svg"')) {
      errors.push(`[admin shell] ${label} logo must reuse ../../favicon.svg`);
    }
    ["文章列表", "发布文章", "项目管理", "留言管理"].forEach((navLabel) => {
      if (!html.includes(navLabel)) errors.push(`[admin shell] ${label} missing nav item ${navLabel}`);
    });
    const activePattern = new RegExp(`class="is-active"[^>]*>${activeLabel}<`);
    if (!activePattern.test(html)) {
      errors.push(`[admin shell] ${label} active nav should be ${activeLabel}`);
    }
    ["Alex Rivera", "Chief Editor", "auto_awesome", 'class="brand-mark" aria-hidden="true"'].forEach((legacy) => {
      if (html.includes(legacy)) errors.push(`[admin shell] ${label} still contains legacy shell marker: ${legacy}`);
    });
  });

  const projectsAdmin = readText(targets.projectsAdmin);
  if (projectsAdmin && !projectsAdmin.includes('const dataUrl = "/assets/projects.json"')) {
    errors.push("[projects admin] dataUrl must be /assets/projects.json");
  }
  if (!projectsAdmin.includes("summaryLong") || !projectsAdmin.includes("keywords")) {
    errors.push("[projects admin] summaryLong/keywords support is missing");
  }

  const messagesAdmin = readText(targets.messagesAdmin);
  if (!messagesAdmin.includes("/admin/messages")) {
    errors.push("[messages admin] API admin flow is missing");
  }
  if (!messagesAdmin.includes('class="admin-shell"') || !messagesAdmin.includes('class="admin-main"')) {
    errors.push("[messages admin] messages.html must use the shared admin-shell/admin-main layout");
  }
  [
    'class="lead"',
    "<div class=\"layout\"",
    ".layout",
    ".sidebar",
    ".lead",
    "不需要额外输入第二道口令",
    "不需要再额外输入第二道口令",
  ].forEach((legacy) => {
    if (messagesAdmin.includes(legacy)) {
      errors.push(`[messages admin] old explanatory text or legacy shell remains: ${legacy}`);
    }
  });
  if (messagesAdmin.includes("X-Admin-Token") || messagesAdmin.includes("Admin Token") || messagesAdmin.includes("zenithy_messages_admin_token")) {
    errors.push("[messages admin] token prompt should be removed; admin API is protected by gateway Basic Auth");
  }
  ["unread", "contacted", "archived", "DELETE", "PATCH"].forEach((needle) => {
    if (!messagesAdmin.includes(needle)) errors.push(`[messages admin] missing ${needle}`);
  });

  const adminCss = readText(targets.adminCss);
  if (!adminCss.includes("grid-template-columns: 280px minmax(0, 1fr)") || !adminCss.includes("white-space: nowrap")) {
    errors.push("[admin shell] sidebar width/nowrap guard is missing; nav text may be clipped");
  }
}

function checkMessagesApi() {
  const composePath = path.join(rootDir, "docker-compose.yml");
  const apiDockerfile = path.join(rootDir, "api", "Dockerfile");
  const apiScript = path.join(rootDir, "api", "messages_api.py");
  const compose = readText(composePath);
  const apiCode = readText(apiScript);
  const envExample = readText(targets.envExample);
  const apiTest = readText(targets.messagesApiTest);

  if (!exists(apiDockerfile)) errors.push(`[messages api] missing ${apiDockerfile}`);
  if (!exists(apiScript)) errors.push(`[messages api] missing ${apiScript}`);
  if (!compose.includes("messages-api") || !compose.includes("portal_messages_data")) {
    errors.push("[messages api] docker-compose service or volume is missing");
  }
  if (!compose.includes("MESSAGES_TRUST_GATEWAY_AUTH") || !compose.includes("127.0.0.1:18081:8000")) {
    errors.push("[messages api] gateway auth trust flag or local port mapping is missing");
  }
  if (envExample.includes("MESSAGES_ADMIN_TOKEN")) {
    errors.push("[messages api] .env.example should not require MESSAGES_ADMIN_TOKEN");
  }
  if (!envExample.includes("MESSAGES_TRUST_GATEWAY_AUTH") || !envExample.includes("MESSAGES_CORS_ORIGINS")) {
    errors.push("[messages api] .env.example must document MESSAGES_TRUST_GATEWAY_AUTH and MESSAGES_CORS_ORIGINS");
  }
  ["/api/messages", "/api/admin/messages", "sqlite3", "do_PATCH", "do_DELETE", "MESSAGES_TRUST_GATEWAY_AUTH"].forEach((needle) => {
    if (!apiCode.includes(needle)) errors.push(`[messages api] missing ${needle}`);
  });
  ["POST", "GET", "PATCH", "DELETE", "MESSAGES_TRUST_GATEWAY_AUTH"].forEach((needle) => {
    if (!apiTest.includes(needle)) errors.push(`[messages api test] missing ${needle}`);
  });
  compileScriptFile(targets.messagesApiTest);
}

function checkCaddyHint() {
  if (!exists(hiremateCaddy)) {
    warnings.push(`[cross-repo] HireMate Caddyfile not found at ${hiremateCaddy}`);
    return;
  }

  const caddy = readText(hiremateCaddy);
  if (!caddy.includes("blog.zenithy.art")) {
    warnings.push("[cross-repo] blog.zenithy.art route not found in HireMate/Caddyfile");
  }
  if (!caddy.includes("/assets/*")) {
    warnings.push("[cross-repo] verify blog.zenithy.art can proxy /assets/* in HireMate/Caddyfile");
  }
  if (!caddy.includes("portal-messages-api") || !caddy.includes("/api/messages") || !caddy.includes("/api/health")) {
    warnings.push("[cross-repo] messages API route is not found; add /api/messages*, /api/admin/messages* and /api/health proxy in HireMate/Caddyfile");
  }
  if (!caddy.includes("/api/admin/messages") || !caddy.includes("basicauth") || !caddy.includes("autsky6666@gmail.com")) {
    warnings.push("[cross-repo] /api/admin/messages* should be protected by the same Caddy Basic Auth as blog admin");
  }
}

function detectUnknownDomains() {
  const html = readText(targets.index);
  if (!html) return;
  const found = new Set();
  const domainRegex = /https?:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi;
  let match;
  while ((match = domainRegex.exec(html))) found.add(match[1].toLowerCase());

  const known = new Set([
    "zenithy.art",
    "hiremate.zenithy.art",
    "interview.zenithy.art",
    "admin.interview.zenithy.art",
    "api.interview.zenithy.art",
    "blog.zenithy.art",
  ]);
  const unknown = Array.from(found).filter((domain) => !known.has(domain));
  if (unknown.length) {
    warnings.push(`[domain] new domain(s) found: ${unknown.join(", ")}`);
    hints.push("If you add a public domain, verify HireMate/Caddyfile.");
  }
}

checkRequiredFiles();
checkHomepageStructure();
checkFaviconAndBrandLogo();
checkHomepageMotion();
checkProjects();
checkSiteConfig();
checkManifest();
checkMessagesManifest();
checkBlogAndAdmin();
checkMessagesApi();
checkCaddyHint();
detectUnknownDomains();

if (warnings.length) {
  console.log("\nWarnings:");
  warnings.forEach((message) => console.log(` - ${message}`));
}

if (errors.length) {
  console.error("\nPreflight failed:");
  errors.forEach((message) => console.error(` - ${message}`));
  if (hints.length) {
    console.error("\nHints:");
    hints.forEach((message) => console.error(` - ${message}`));
  }
  process.exit(1);
}

console.log("\nPreflight passed.");
