#!/usr/bin/env python3
import json
import os
import re
import sqlite3
import uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse


PORT = int(os.environ.get("PORT", "8000"))
DB_PATH = os.environ.get("MESSAGES_DB", "/data/messages.sqlite3")
ADMIN_TOKEN = os.environ.get("MESSAGES_ADMIN_TOKEN", "")
TRUST_GATEWAY_AUTH = os.environ.get("MESSAGES_TRUST_GATEWAY_AUTH", "true").lower() in {"1", "true", "yes", "on"}
CORS_ORIGINS = [
    item.strip()
    for item in os.environ.get(
        "CORS_ORIGINS",
        "https://zenithy.art,https://blog.zenithy.art,http://127.0.0.1:8080,http://localhost:8080",
    ).split(",")
    if item.strip()
]

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
VALID_STATUS = {"unread", "contacted", "archived"}


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def connect():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL DEFAULT '',
              email TEXT NOT NULL,
              message TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'unread',
              source TEXT NOT NULL DEFAULT 'zenithy-home',
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)")


def row_to_message(row):
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "message": row["message"],
        "status": row["status"],
        "source": row["source"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


class MessagesHandler(BaseHTTPRequestHandler):
    server_version = "ZenithyMessagesAPI/1.0"

    def log_message(self, fmt, *args):
        print("%s - - [%s] %s" % (self.client_address[0], self.log_date_time_string(), fmt % args))

    def _origin(self):
        origin = self.headers.get("Origin", "")
        if origin in CORS_ORIGINS:
            return origin
        return CORS_ORIGINS[0] if CORS_ORIGINS else "*"

    def _send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", self._origin())
        self.send_header("Vary", "Origin")
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        length = int(self.headers.get("Content-Length", "0") or "0")
        raw = self.rfile.read(length).decode("utf-8") if length else "{}"
        try:
            return json.loads(raw or "{}")
        except json.JSONDecodeError:
            self._send_json(400, {"ok": False, "error": "invalid_json"})
            return None

    def _require_admin(self):
        # In production the public admin API path is protected by HireMate/Caddyfile
        # Basic Auth. Keep token auth as an optional fallback for isolated local use.
        if TRUST_GATEWAY_AUTH:
            return True
        token = self.headers.get("X-Admin-Token") or self.headers.get("Authorization", "").removeprefix("Bearer ").strip()
        if not token or token != ADMIN_TOKEN:
            self._send_json(401, {"ok": False, "error": "unauthorized"})
            return False
        return True

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", self._origin())
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type,X-Admin-Token,Authorization")
        self.send_header("Access-Control-Max-Age", "86400")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            self._send_json(200, {"ok": True, "service": "messages-api"})
            return
        if parsed.path == "/api/admin/messages":
            if not self._require_admin():
                return
            query = parse_qs(parsed.query)
            status = (query.get("status") or [""])[0]
            sql = "SELECT * FROM messages"
            args = []
            if status in VALID_STATUS:
                sql += " WHERE status = ?"
                args.append(status)
            sql += " ORDER BY created_at DESC"
            with connect() as conn:
                rows = conn.execute(sql, args).fetchall()
            self._send_json(200, {"ok": True, "messages": [row_to_message(row) for row in rows]})
            return
        self._send_json(404, {"ok": False, "error": "not_found"})

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/api/messages":
            self._send_json(404, {"ok": False, "error": "not_found"})
            return
        data = self._read_json()
        if data is None:
            return
        name = str(data.get("name") or "").strip()
        email = str(data.get("email") or "").strip()
        message = str(data.get("message") or "").strip()
        if not EMAIL_RE.match(email):
            self._send_json(400, {"ok": False, "error": "invalid_email"})
            return
        if not message:
            self._send_json(400, {"ok": False, "error": "message_required"})
            return

        message_id = "msg-" + uuid.uuid4().hex[:16]
        created_at = now_iso()
        with connect() as conn:
            conn.execute(
                """
                INSERT INTO messages (id, name, email, message, status, source, created_at, updated_at)
                VALUES (?, ?, ?, ?, 'unread', 'zenithy-home', ?, ?)
                """,
                (message_id, name, email, message, created_at, created_at),
            )
            row = conn.execute("SELECT * FROM messages WHERE id = ?", (message_id,)).fetchone()
        self._send_json(201, {"ok": True, "message": row_to_message(row)})

    def do_PATCH(self):
        parsed = urlparse(self.path)
        if not parsed.path.startswith("/api/admin/messages/"):
            self._send_json(404, {"ok": False, "error": "not_found"})
            return
        if not self._require_admin():
            return
        message_id = parsed.path.rsplit("/", 1)[-1]
        data = self._read_json()
        if data is None:
            return
        status = str(data.get("status") or "").strip()
        if status not in VALID_STATUS:
            self._send_json(400, {"ok": False, "error": "invalid_status"})
            return
        updated_at = now_iso()
        with connect() as conn:
            cur = conn.execute(
                "UPDATE messages SET status = ?, updated_at = ? WHERE id = ?",
                (status, updated_at, message_id),
            )
            if cur.rowcount == 0:
                self._send_json(404, {"ok": False, "error": "message_not_found"})
                return
            row = conn.execute("SELECT * FROM messages WHERE id = ?", (message_id,)).fetchone()
        self._send_json(200, {"ok": True, "message": row_to_message(row)})

    def do_DELETE(self):
        parsed = urlparse(self.path)
        if not parsed.path.startswith("/api/admin/messages/"):
            self._send_json(404, {"ok": False, "error": "not_found"})
            return
        if not self._require_admin():
            return
        message_id = parsed.path.rsplit("/", 1)[-1]
        with connect() as conn:
            cur = conn.execute("DELETE FROM messages WHERE id = ?", (message_id,))
            if cur.rowcount == 0:
                self._send_json(404, {"ok": False, "error": "message_not_found"})
                return
        self._send_json(200, {"ok": True})


if __name__ == "__main__":
    init_db()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), MessagesHandler)
    print(f"Zenithy messages API listening on 0.0.0.0:{PORT}, db={DB_PATH}")
    server.serve_forever()
