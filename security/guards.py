import hashlib
import os
import re
import time
from collections import defaultdict, deque
from dataclasses import dataclass


EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
HTML_TAG_RE = re.compile(r"<[^>]+>")
CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
URL_RE = re.compile(r"https?://|www\.", re.IGNORECASE)


def env_bool(name, default):
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_int(name, default):
    value = os.environ.get(name)
    if value is None or value == "":
        return default
    try:
        return int(value)
    except ValueError:
        return default


@dataclass(frozen=True)
class SecurityConfig:
    enabled: bool = True
    message_window_seconds: int = 600
    message_rate_limit: int = 5
    message_daily_limit: int = 30
    admin_window_seconds: int = 300
    admin_rate_limit: int = 90
    name_max_chars: int = 80
    email_max_chars: int = 160
    message_max_chars: int = 1200
    message_max_links: int = 3
    duplicate_window_seconds: int = 900
    honeypot_fields: tuple = ("website", "company", "url", "homepage")

    @classmethod
    def from_env(cls):
        honeypot = tuple(
            item.strip()
            for item in os.environ.get("PORTAL_HONEYPOT_FIELDS", "website,company,url,homepage").split(",")
            if item.strip()
        )
        return cls(
            enabled=env_bool("PORTAL_SECURITY_ENABLED", True),
            message_window_seconds=env_int("PORTAL_MESSAGE_WINDOW_SECONDS", 600),
            message_rate_limit=env_int("PORTAL_MESSAGE_RATE_LIMIT", 5),
            message_daily_limit=env_int("PORTAL_MESSAGE_DAILY_LIMIT", 30),
            admin_window_seconds=env_int("PORTAL_ADMIN_WINDOW_SECONDS", 300),
            admin_rate_limit=env_int("PORTAL_ADMIN_RATE_LIMIT", 90),
            name_max_chars=env_int("PORTAL_NAME_MAX_CHARS", 80),
            email_max_chars=env_int("PORTAL_EMAIL_MAX_CHARS", 160),
            message_max_chars=env_int("PORTAL_MESSAGE_MAX_CHARS", 1200),
            message_max_links=env_int("PORTAL_MESSAGE_MAX_LINKS", 3),
            duplicate_window_seconds=env_int("PORTAL_DUPLICATE_WINDOW_SECONDS", 900),
            honeypot_fields=honeypot or ("website", "company", "url", "homepage"),
        )


class SlidingWindowLimiter:
    def __init__(self):
        self.events = defaultdict(deque)

    def hit(self, key, limit, window_seconds, now=None):
        if limit <= 0:
            return True, 0
        now = now or time.time()
        bucket = self.events[key]
        cutoff = now - window_seconds
        while bucket and bucket[0] <= cutoff:
            bucket.popleft()
        if len(bucket) >= limit:
            retry_after = max(1, int(bucket[0] + window_seconds - now))
            return False, retry_after
        bucket.append(now)
        return True, 0


class DuplicateGuard:
    def __init__(self):
        self.seen = {}

    def hit(self, key, window_seconds, now=None):
        now = now or time.time()
        expired = [item for item, expires_at in self.seen.items() if expires_at <= now]
        for item in expired:
            self.seen.pop(item, None)
        if key in self.seen:
            return False, int(max(1, self.seen[key] - now))
        self.seen[key] = now + window_seconds
        return True, 0


class SecurityDecision:
    def __init__(self, ok, status=200, error="", payload=None, retry_after=0, client_ip=""):
        self.ok = ok
        self.status = status
        self.error = error
        self.payload = payload or {}
        self.retry_after = retry_after
        self.client_ip = client_ip


class LightweightSecurity:
    def __init__(self, config=None):
        self.config = config or SecurityConfig.from_env()
        self.message_limiter = SlidingWindowLimiter()
        self.message_daily_limiter = SlidingWindowLimiter()
        self.admin_limiter = SlidingWindowLimiter()
        self.duplicate_guard = DuplicateGuard()

    def client_ip(self, handler):
        real_ip = (handler.headers.get("X-Real-IP") or "").strip()
        if real_ip:
            return real_ip
        forwarded = (handler.headers.get("X-Forwarded-For") or "").split(",")
        for item in forwarded:
            candidate = item.strip()
            if candidate:
                return candidate
        return handler.client_address[0] if handler.client_address else "unknown"

    def normalize_text(self, value):
        text = str(value or "")
        text = CONTROL_RE.sub("", text)
        text = HTML_TAG_RE.sub("", text)
        text = text.replace("\r\n", "\n").replace("\r", "\n")
        text = "\n".join(line.strip() for line in text.split("\n"))
        text = re.sub(r"\n{3,}", "\n\n", text).strip()
        return text

    def clean_text(self, value, max_chars):
        text = self.normalize_text(value)
        return text[:max_chars]

    def check_honeypot(self, data):
        for field in self.config.honeypot_fields:
            if str(data.get(field) or "").strip():
                return False
        return True

    def fingerprint(self, email, message):
        normalized = f"{email.lower()}::{re.sub(r'\\s+', ' ', message).strip().lower()}"
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

    def check_public_message(self, handler, data):
        if not self.config.enabled:
            return SecurityDecision(True, payload=data)

        ip = self.client_ip(handler)
        allowed, retry_after = self.message_limiter.hit(
            f"message:{ip}",
            self.config.message_rate_limit,
            self.config.message_window_seconds,
        )
        if not allowed:
            return SecurityDecision(False, 429, "rate_limited", retry_after=retry_after, client_ip=ip)

        allowed, retry_after = self.message_daily_limiter.hit(
            f"message-day:{ip}",
            self.config.message_daily_limit,
            86400,
        )
        if not allowed:
            return SecurityDecision(False, 429, "daily_limit_reached", retry_after=retry_after, client_ip=ip)

        if not self.check_honeypot(data):
            return SecurityDecision(False, 400, "spam_detected", client_ip=ip)

        name = self.clean_text(data.get("name"), self.config.name_max_chars)
        email = self.clean_text(data.get("email"), self.config.email_max_chars)
        message_raw = str(data.get("message") or "")
        message = self.normalize_text(message_raw)
        if len(message) > self.config.message_max_chars:
            return SecurityDecision(False, 413, "message_too_large", client_ip=ip)

        if not EMAIL_RE.match(email):
            return SecurityDecision(False, 400, "invalid_email", client_ip=ip)
        if not message:
            return SecurityDecision(False, 400, "message_required", client_ip=ip)
        if len(URL_RE.findall(message)) > self.config.message_max_links:
            return SecurityDecision(False, 400, "too_many_links", client_ip=ip)

        fingerprint = self.fingerprint(email, message)
        allowed, retry_after = self.duplicate_guard.hit(
            f"duplicate:{ip}:{fingerprint}",
            self.config.duplicate_window_seconds,
        )
        if not allowed:
            return SecurityDecision(False, 429, "duplicate_message", retry_after=retry_after, client_ip=ip)

        return SecurityDecision(
            True,
            payload={
                "name": name,
                "email": email,
                "message": message,
                "client_ip": ip,
            },
            client_ip=ip,
        )

    def check_admin_api(self, handler):
        if not self.config.enabled:
            return SecurityDecision(True)
        ip = self.client_ip(handler)
        allowed, retry_after = self.admin_limiter.hit(
            f"admin:{ip}",
            self.config.admin_rate_limit,
            self.config.admin_window_seconds,
        )
        if not allowed:
            return SecurityDecision(False, 429, "admin_rate_limited", retry_after=retry_after, client_ip=ip)
        return SecurityDecision(True, client_ip=ip)
