#!/usr/bin/env node
const childProcess = require("child_process");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const apiScript = path.join(rootDir, "api", "messages_api.py");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "zenithy-messages-"));
const dbPath = path.join(tempDir, "messages.sqlite3");
const port = String(19000 + Math.floor(Math.random() * 1000));
const token = "test-token";

function request(method, pathname, body, headers = {}) {
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
          ...(payload ? { "Content-Length": payload.length } : {}),
          ...headers,
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          const json = text ? JSON.parse(text) : {};
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`${method} ${pathname} failed: ${res.statusCode} ${text}`));
            return;
          }
          resolve(json);
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
    try {
      await request("GET", "/api/health");
      return;
    } catch (_) {
      await sleep(200);
    }
  }
  throw new Error("messages API did not become healthy in time");
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
      MESSAGES_ADMIN_TOKEN: token,
      CORS_ORIGINS: "http://127.0.0.1:8080",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  try {
    await waitForApi();
    const created = await request("POST", "/api/messages", {
      name: "QA",
      email: "qa@example.com",
      message: "Hello from automated QA.",
    });
    const id = created && created.message && created.message.id;
    if (!id) throw new Error("POST did not return message id");

    const listed = await request("GET", "/api/admin/messages", null, { "X-Admin-Token": token });
    if (!Array.isArray(listed.messages) || listed.messages.length !== 1) {
      throw new Error("GET did not return exactly one message");
    }

    const patched = await request(
      "PATCH",
      `/api/admin/messages/${encodeURIComponent(id)}`,
      { status: "contacted" },
      { "X-Admin-Token": token }
    );
    if (!patched.message || patched.message.status !== "contacted") {
      throw new Error("PATCH did not update status");
    }

    const deleted = await request("DELETE", `/api/admin/messages/${encodeURIComponent(id)}`, null, {
      "X-Admin-Token": token,
    });
    if (!deleted.ok) throw new Error("DELETE did not return ok");

    console.log("Messages API QA passed.");
  } finally {
    await cleanup(child);
  }
}

main().catch((error) => {
  console.error(`Messages API QA failed: ${error.message}`);
  process.exit(1);
});
