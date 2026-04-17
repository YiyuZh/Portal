#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const siteDir = path.join(rootDir, "site");

const targets = {
  index: path.join(siteDir, "index.html"),
  homeVisual: path.join(siteDir, "home-visual.css"),
  homeHero: path.join(siteDir, "home-hero.js"),
  homeTilt: path.join(siteDir, "home-tilt.js"),
  homeSkills: path.join(siteDir, "home-skills.js"),
  homeCollab: path.join(siteDir, "home-collab.js"),
  projects: path.join(siteDir, "assets", "projects.json"),
  siteConfig: path.join(siteDir, "assets", "site-config.json"),
  manifest: path.join(siteDir, "blog", "posts", "manifest.json"),
  messagesManifest: path.join(siteDir, "blog", "messages", "manifest.json"),
};

const errors = [];
const warnings = [];
const fixes = [];

function readJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
    return JSON.parse(raw);
  } catch (error) {
    errors.push(`[json] ${filePath}: ${error.message}`);
    return null;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function isHttpUrl(url) {
  return /^https?:\/\//i.test(url);
}

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
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

function requireText(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    errors.push(`[required] ${label}`);
  }
}

function checkUrl(value, label, options = {}) {
  if (!value) {
    if (options.required) errors.push(`[url missing] ${label}`);
    return;
  }
  if (value === "#") return;
  if (!isHttpUrl(value)) errors.push(`[url invalid] ${label}: ${value}`);
}

function resolveAsset(assetPath) {
  if (!assetPath || isHttpUrl(assetPath)) return null;
  if (assetPath.startsWith("./")) return path.join(siteDir, assetPath.slice(2));
  if (assetPath.startsWith("/")) return path.join(siteDir, assetPath.slice(1));
  return path.join(siteDir, assetPath);
}

function ensureFile(filePath, label) {
  if (filePath && !fs.existsSync(filePath)) {
    errors.push(`[file missing] ${label}: ${filePath}`);
  }
}

function validateProjects() {
  ensureFile(targets.projects, "projects.json");
  const data = readJson(targets.projects);
  if (!data) return;

  if (!Array.isArray(data.projects)) {
    errors.push("[projects] expected { projects: [] }");
    return;
  }

  const ids = new Set();
  let changed = false;

  data.projects.forEach((project, index) => {
    const label = `projects[${index}]`;
    requireText(project.id, `${label}.id`);
    requireText(project.name, `${label}.name`);
    requireText(project.title, `${label}.title`);
    requireText(project.description, `${label}.description`);

    if (project.id) {
      if (ids.has(project.id)) errors.push(`[duplicate id] ${label}.id = ${project.id}`);
      ids.add(project.id);
    }

    ["features", "keywords"].forEach((field) => {
      if (!Array.isArray(project[field])) {
        project[field] = normalizeArray(project[field]);
        fixes.push(`${label}.${field} normalized to array`);
        changed = true;
      }
    });

    ["summaryLong", "projectType", "badge", "sequence"].forEach((field) => {
      if (project[field] !== undefined && typeof project[field] !== "string") {
        project[field] = String(project[field] || "");
        fixes.push(`${label}.${field} normalized to string`);
        changed = true;
      }
    });

    [
      ["primaryLabel", "primaryUrl"],
      ["secondaryLabel", "secondaryUrl"],
      ["tertiaryLabel", "tertiaryUrl"],
      ["quaternaryLabel", "quaternaryUrl"],
    ].forEach(([labelKey, urlKey]) => {
      if (project[labelKey] && !project[urlKey]) {
        project[urlKey] = "#";
        fixes.push(`${label}.${urlKey} filled with #`);
        changed = true;
      }
      if (!project[labelKey] && project[urlKey]) {
        project[urlKey] = "";
        fixes.push(`${label}.${urlKey} cleared because label is empty`);
        changed = true;
      }
      checkUrl(project[urlKey], `${label}.${urlKey}`);
    });

    if (project.image) ensureFile(resolveAsset(project.image), `${label}.image`);
  });

  if (changed) {
    writeJson(targets.projects, data);
    warnings.push(`auto-fixed ${targets.projects}`);
  }
}

function validateManifest() {
  ensureFile(targets.manifest, "blog posts manifest");
  const data = readJson(targets.manifest);
  if (!data) return;

  if (!Array.isArray(data.posts)) {
    errors.push("[manifest] expected { posts: [] }");
    return;
  }

  const slugs = new Set();
  let changed = false;

  data.posts.forEach((post, index) => {
    const label = `posts[${index}]`;
    requireText(post.slug, `${label}.slug`);
    requireText(post.title, `${label}.title`);
    if (post.published !== undefined && typeof post.published !== "boolean") {
      errors.push(`[type] ${label}.published must be boolean when provided`);
    }

    if (post.slug) {
      if (slugs.has(post.slug)) errors.push(`[duplicate slug] ${label}.slug = ${post.slug}`);
      slugs.add(post.slug);
    }

    if (!Array.isArray(post.tags)) {
      post.tags = normalizeArray(post.tags);
      fixes.push(`${label}.tags normalized to array`);
      changed = true;
    }

    if (isPublishedPost(post)) {
      requireText(post.excerpt, `${label}.excerpt`);
      if (!post.date && !post.updatedAt) {
        errors.push(`[required] ${label}.date or ${label}.updatedAt`);
      }
      if (post.slug) {
        const postIndex = path.join(siteDir, "blog", "posts", post.slug, "index.html");
        ensureFile(postIndex, `${label} published post index`);
      }
    }
  });

  if (changed) {
    writeJson(targets.manifest, data);
    warnings.push(`auto-fixed ${targets.manifest}`);
  }
}

function validateMessagesManifest() {
  ensureFile(targets.messagesManifest, "blog messages manifest");
  const data = readJson(targets.messagesManifest);
  if (!data) return;
  if (!Array.isArray(data.messages)) {
    errors.push("[messages] expected { messages: [] }");
    return;
  }

  const ids = new Set();
  const allowedStatus = new Set(["unread", "contacted", "archived"]);
  data.messages.forEach((message, index) => {
    const label = `messages[${index}]`;
    requireText(message.id, `${label}.id`);
    requireText(message.email, `${label}.email`);
    requireText(message.message, `${label}.message`);
    if (message.id) {
      if (ids.has(message.id)) errors.push(`[duplicate] ${label}.id = ${message.id}`);
      ids.add(message.id);
    }
    if (message.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message.email)) {
      errors.push(`[email invalid] ${label}.email = ${message.email}`);
    }
    if (message.status && !allowedStatus.has(message.status)) {
      errors.push(`[status invalid] ${label}.status must be unread/contacted/archived`);
    }
    if (message.name !== undefined && typeof message.name !== "string") {
      errors.push(`[type] ${label}.name must be string`);
    }
    if (message.createdAt !== undefined && typeof message.createdAt !== "string") {
      errors.push(`[type] ${label}.createdAt must be string`);
    }
  });
}

function validateSiteConfig() {
  ensureFile(targets.siteConfig, "site-config.json");
  const data = readJson(targets.siteConfig);
  if (!data) return;

  requireText(data.hero && data.hero.title, "siteConfig.hero.title");
  requireText(data.hero && data.hero.titleLeading, "siteConfig.hero.titleLeading");
  requireText(data.hero && data.hero.titleParts && data.hero.titleParts.hello, "siteConfig.hero.titleParts.hello");
  requireText(data.hero && data.hero.titleParts && data.hero.titleParts.im, "siteConfig.hero.titleParts.im");
  requireText(data.hero && data.hero.titleName, "siteConfig.hero.titleName");
  requireText(data.hero && data.hero.revealTitle, "siteConfig.hero.revealTitle");
  requireText(data.hero && data.hero.metaLine, "siteConfig.hero.metaLine");
  if (data.hero && (data.hero.subtitle || data.hero.primaryCta || data.hero.secondaryCta)) {
    errors.push("[hero] subtitle/primaryCta/secondaryCta should not be configured; keep project entries in Projects section");
  }

  if (!data.hero || !data.hero.tilt || typeof data.hero.tilt.enabled !== "boolean") {
    errors.push("[hero] tilt.enabled must be boolean");
  }
  if (!data.hero || !data.hero.tilt || typeof data.hero.tilt.maxRotate !== "number") {
    errors.push("[hero] tilt.maxRotate must be number");
  } else if (data.hero.tilt.maxRotate < 18 || data.hero.tilt.maxRotate > 22) {
    errors.push("[hero] tilt.maxRotate should stay between 18 and 22 for the full-screen typography interaction");
  }
  if (!data.hero || !data.hero.orb || typeof data.hero.orb.enabled !== "boolean") {
    errors.push("[hero] orb.enabled must be boolean");
  }
  if (!data.hero || !data.hero.orb || typeof data.hero.orb.followStrength !== "number") {
    errors.push("[hero] orb.followStrength must be number");
  }
  if (!data.hero || !data.hero.orb || typeof data.hero.orb.drift !== "boolean") {
    errors.push("[hero] orb.drift must be boolean");
  }

  ["projectsLabel", "skillsLabel", "collabLabel", "aboutLabel", "blogLabel"].forEach((field) => {
    requireText(data.nav && data.nav[field], `siteConfig.nav.${field}`);
  });

  ["projects", "skills", "collab", "about", "contact"].forEach((section) => {
    const value = data.sections && data.sections[section];
    requireText(value && value.title, `siteConfig.sections.${section}.title`);
    requireText(value && value.description, `siteConfig.sections.${section}.description`);
  });

  ["skills", "collab"].forEach((section) => {
    const items = data.sections && data.sections[section] && data.sections[section].items;
    if (!Array.isArray(items) || !items.length) {
      errors.push(`[siteConfig] sections.${section}.items must be a non-empty array`);
      return;
    }
    items.forEach((item, index) => {
      requireText(item.label, `siteConfig.sections.${section}.items[${index}].label`);
      requireText(item.title, `siteConfig.sections.${section}.items[${index}].title`);
      requireText(item.description, `siteConfig.sections.${section}.items[${index}].description`);
      if (section === "skills") {
        if (item.metric !== undefined && typeof item.metric !== "number") {
          errors.push(`[siteConfig] sections.skills.items[${index}].metric must be number when provided`);
        }
        if (item.metricLabel !== undefined && typeof item.metricLabel !== "string") {
          errors.push(`[siteConfig] sections.skills.items[${index}].metricLabel must be string when provided`);
        }
        if (item.metricSuffix !== undefined && typeof item.metricSuffix !== "string") {
          errors.push(`[siteConfig] sections.skills.items[${index}].metricSuffix must be string when provided`);
        }
        if (item.highlights !== undefined && !Array.isArray(item.highlights)) {
          errors.push(`[siteConfig] sections.skills.items[${index}].highlights must be array when provided`);
        }
        if (Array.isArray(item.highlights)) {
          item.highlights.forEach((highlight, highlightIndex) => {
            if (typeof highlight !== "string" || !highlight.trim()) {
              errors.push(`[siteConfig] sections.skills.items[${index}].highlights[${highlightIndex}] must be non-empty string`);
            }
          });
        }
        if (item.motionVariant !== undefined && !/^[a-z][a-z0-9-]*$/i.test(String(item.motionVariant))) {
          errors.push(`[siteConfig] sections.skills.items[${index}].motionVariant should be a class-safe token`);
        }
        if (item.priority !== undefined && typeof item.priority !== "number") {
          errors.push(`[siteConfig] sections.skills.items[${index}].priority must be number when provided`);
        }
        if (item.featured !== undefined && typeof item.featured !== "boolean") {
          errors.push(`[siteConfig] sections.skills.items[${index}].featured must be boolean when provided`);
        }
      }
    });
  });
}

function validateHomepageFiles() {
  [targets.index, targets.homeVisual, targets.homeHero, targets.homeTilt, targets.homeSkills, targets.homeCollab].forEach((filePath) => {
    ensureFile(filePath, path.basename(filePath));
  });
}

validateHomepageFiles();
validateProjects();
validateManifest();
validateMessagesManifest();
validateSiteConfig();

if (fixes.length) {
  console.log("\nAuto fixes:");
  fixes.forEach((message) => console.log(` - ${message}`));
}

if (warnings.length) {
  console.log("\nWarnings:");
  warnings.forEach((message) => console.log(` - ${message}`));
}

if (errors.length) {
  console.error("\nContent validation failed:");
  errors.forEach((message) => console.error(` - ${message}`));
  process.exit(1);
}

console.log("\nContent validation passed.");
