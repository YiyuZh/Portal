# Zenithy Portal 轻量安全模块

## 定位

本模块只做 Portal 项目内部的轻量防护，适合当前低访问量、低配置云服务器场景。它不替代云安全组、Caddy Basic Auth、服务器防火墙或 fail2ban。

## 当前覆盖

- Collab 留言 IP 滑动窗口限流。
- Collab 留言 IP 每日上限。
- 重复留言指纹拦截。
- 蜜罐字段拦截机器人。
- HTML 标签、控制字符清洗。
- 留言长度和链接数量限制。
- Admin Messages API 轻量限流。

## 关键文件

- `security/PRD.md`：产品需求和验收标准。
- `security/guards.py`：无第三方依赖的安全实现。
- `api/messages_api.py`：调用安全模块的 Messages API。
- `scripts/test-security-guards.js`：安全专项自动化测试。

## 环境变量

```bash
PORTAL_SECURITY_ENABLED=true
PORTAL_MESSAGE_RATE_LIMIT=5
PORTAL_MESSAGE_DAILY_LIMIT=30
PORTAL_MESSAGE_WINDOW_SECONDS=600
PORTAL_ADMIN_RATE_LIMIT=90
PORTAL_ADMIN_WINDOW_SECONDS=300
PORTAL_MESSAGE_MAX_CHARS=1200
PORTAL_MESSAGE_MAX_LINKS=3
PORTAL_HONEYPOT_FIELDS=website,company,url,homepage
```

## 本地验证

```bash
npm run validate
npm run preflight
npm run test:messages
npm run test:security
npm run qa
```

## 运维提醒

- Basic Auth 输错密码的暴力破解发生在 HireMate/Caddy 层，通常不会进入 Portal API。
- 如需封禁连续输错后台账号密码的 IP，应在服务器层用 Caddy 日志、云安全组或 fail2ban 处理。
- 本模块的 `security_block` 日志会输出到 `portal-messages-api` 容器日志，可用于快速判断是否有人刷留言。
