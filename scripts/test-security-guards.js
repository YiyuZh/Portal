#!/usr/bin/env node
const childProcess = require("child_process");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const apiScript = path.join(rootDir, "api", "messages_api.py");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "zenithy-security-"));
const dbPath = path.join(tempDir, "messages.sqlite3");
const port = String(20100 + Math.floor(Math.random() * 1000));

function requestRaw(method, pathname, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? Buffer.from(JSON.stringify(body)) : null;
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: pathname,
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": headers.ip || "203.0.113.10",
          ...(payload ? { "Content-Length": payload.length } : {}),
          ...headers,
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let json = {};
          try {
            json = text ? JSON.parse(text) : {};
          } catch (error) {
            reject(new Error(`${method} ${pathname} returned invalid JSON: ${text}`));
            return;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForExit(child) {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.killed) {
      resolve();
      return;
    }
    child.once("exit", resolve);
    setTimeout(resolve, 1500);
  });
}

async function cleanup(child) {
  if (child && child.exitCode === null) {
    child.kill();
    await waitForExit(child);
  }
  for (let index = 0; index < 8; index += 1) {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      return;
    } catch (_) {
      await sleep(150);
    }
  }
}

async function waitForApi() {
  for (let index = 0; index < 30; index += 1) {
    const response = await requestRaw("GET", "/api/health").catch(() => null);
    if (response && response.status === 200) return;
    await sleep(200);
  }
  throw new Error("messages API did not become healthy in time");
}

function assertStatus(response, status, label) {
  if (response.status !== status) {
    throw new Error(`${label}: expected ${status}, got ${response.status} ${JSON.stringify(response.body)}`);
  }
}

async function main() {
  if (!fs.existsSync(apiScript)) {
    throw new Error(`missing API script: ${apiScript}`);
  }

  const child = childProcess.spawn("python", [apiScript], {
    cwd: rootDir,
    env: {
      ...process.env,
      PORT: port,
      MESSAGES_DB: dbPath,
      MESSAGES_TRUST_GATEWAY_AUTH: "true",
      CORS_ORIGINS: "http://127.0.0.1:8080",
      PORTAL_MESSAGE_RATE_LIMIT: "2",
      PORTAL_MESSAGE_DAILY_LIMIT: "50",
      PORTAL_MESSAGE_WINDOW_SECONDS: "60",
      PORTAL_ADMIN_RATE_LIMIT: "2",
      PORTAL_ADMIN_WINDOW_SECONDS: "60",
      PORTAL_MESSAGE_MAX_CHARS: "80",
      PORTAL_MESSAGE_MAX_LINKS: "1",
      PORTAL_DUPLICATE_WINDOW_SECONDS: "60",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  try {
    await waitForApi();

    const honeypot = await requestRaw("POST", "/api/messages", {
      name: "Bot",
      email: "bot@example.com",
      message: "This should be blocked.",
      website: "https://spam.example",
    }, { ip: "203.0.113.11" });
    assertStatus(honeypot, 400, "honeypot block");
    if (honeypot.body.error !== "spam_detected") throw new Error("honeypot did not return spam_detected");

    const tooLong = await requestRaw("POST", "/api/messages", {
      name: "Long",
      email: "long@example.com",
      message: "x".repeat(81),
    }, { ip: "203.0.113.12" });
    assertStatus(tooLong, 413, "message length block");
    if (tooLong.body.error !== "message_too_large") throw new Error("length block did not return message_too_large");

    const tooManyLinks = await requestRaw("POST", "/api/messages", {
      name: "Links",
      email: "links@example.com",
      message: "https://a.example and https://b.example",
    }, { ip: "203.0.113.13" });
    assertStatus(tooManyLinks, 400, "link count block");
    if (tooManyLinks.body.error !== "too_many_links") throw new Error("link count did not return too_many_links");

    const clean = await requestRaw("POST", "/api/messages", {
      name: "<b>Alice</b>",
      email: "alice@example.com",
      message: "<script>alert(1)</script>Hello",
    });
    assertStatus(clean, 201, "sanitized message create");
    if (/script|<|>/.test(clean.body.message.message)) {
      throw new Error("stored message was not sanitized");
    }

    const duplicate = await requestRaw("POST", "/api/messages", {
      name: "Alice",
      email: "alice@example.com",
      message: "alert(1)Hello",
    });
    assertStatus(duplicate, 429, "duplicate message block");
    if (duplicate.body.error !== "duplicate_message") throw new Error("duplicate did not return duplicate_message");

    const rateOne = await requestRaw("POST", "/api/messages", {
      name: "Rate",
      email: "rate1@example.com",
      message: "First rate message.",
    }, { ip: "203.0.113.22" });
    assertStatus(rateOne, 201, "rate first");

    const rateTwo = await requestRaw("POST", "/api/messages", {
      name: "Rate",
      email: "rate2@example.com",
      message: "Second rate message.",
    }, { ip: "203.0.113.22" });
    assertStatus(rateTwo, 201, "rate second");

    const rateThree = await requestRaw("POST", "/api/messages", {
      name: "Rate",
      email: "rate3@example.com",
      message: "Third rate message.",
    }, { ip: "203.0.113.22" });
    assertStatus(rateThree, 429, "rate limit block");
    if (!rateThree.headers["retry-after"]) throw new Error("rate limit did not include Retry-After");

    const adminOne = await requestRaw("GET", "/api/admin/messages", null, { ip: "203.0.113.33" });
    assertStatus(adminOne, 200, "admin first");
    const adminTwo = await requestRaw("GET", "/api/admin/messages", null, { ip: "203.0.113.33" });
    assertStatus(adminTwo, 200, "admin second");
    const adminThree = await requestRaw("GET", "/api/admin/messages", null, { ip: "203.0.113.33" });
    assertStatus(adminThree, 429, "admin rate block");
    if (adminThree.body.error !== "admin_rate_limited") throw new Error("admin rate did not return admin_rate_limited");

    console.log("Security guard QA passed.");
  } finally {
    await cleanup(child);
  }
}

main().catch((error) => {
  console.error(`Security guard QA failed: ${error.message}`);
  process.exit(1);
});
