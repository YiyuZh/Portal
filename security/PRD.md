# Zenithy Portal 轻量安全模块 PRD

## 1. 背景

Zenithy Portal 是静态门户 + 轻量 Messages API 的个人展示项目，部署在配置有限的云服务器上，主要用于面试展示与少量访客访问。当前不适合引入重型 WAF、独立网关或复杂账号体系，但需要对两个高风险入口做基础防护：

- 首页 Collab 留言表单被脚本批量提交，导致 SQLite 留言库和后台列表爆炸。
- 博客后台受网关 Basic Auth 保护，但仍需要对已通过网关后的 Admin API 操作做轻量限流，并明确 Basic Auth 暴力破解应由 HireMate/Caddy 或服务器层处理。

## 2. 目标

1. 防止 Collab 留言被恶意注入或批量刷爆。
2. 防止超长内容、HTML/script 注入、控制字符污染后台显示。
3. 对 Admin Messages API 增加轻量限流，避免登录后或误配置时被频繁刷新/修改/删除。
4. 保持模块轻量、无第三方依赖、低内存占用。
5. 安全逻辑独立放在 `security/` 目录，避免散落在业务代码中。

## 3. 非目标

1. 不实现完整 WAF。
2. 不替代服务器防火墙、云厂商安全组、Caddy Basic Auth。
3. 不在静态前端里伪造“安全登录系统”。
4. 不引入 Redis、PostgreSQL、队列或第三方安全 SDK。
5. 不直接在 gateway-portal 中修改公网入口事实来源；公网网关仍以 HireMate 仓库 Caddyfile 为准。

## 4. 功能范围

### 4.1 Collab 留言防爆

- IP 级滑动窗口限流。
- IP 级每日上限。
- 重复内容指纹拦截。
- 蜜罐字段拦截机器人。
- 姓名、邮箱、留言长度上限。
- HTML 标签、控制字符清洗。
- 链接数量限制。
- 返回明确错误码，前端可给中性提示。

### 4.2 Admin API 轻量保护

- 对 `/api/admin/messages*` 增加 IP 级滑动窗口限流。
- 该保护只覆盖到达 Messages API 的请求。
- Basic Auth 输入错误在 Caddy 层被拒绝，通常不会进入 Portal API，因此暴力破解 Basic Auth 需要在 HireMate/Caddy 或服务器层用日志/安全组/fail2ban 类方案处理。

## 5. 默认策略

| 项目 | 默认值 |
| --- | --- |
| 留言窗口 | 10 分钟 |
| 单 IP 留言窗口上限 | 5 次 |
| 单 IP 留言每日上限 | 30 次 |
| Admin API 窗口 | 5 分钟 |
| 单 IP Admin API 上限 | 90 次 |
| 留言最大长度 | 1200 字符 |
| 姓名最大长度 | 80 字符 |
| 邮箱最大长度 | 160 字符 |
| 最大链接数 | 3 |

## 6. 环境变量

- `PORTAL_SECURITY_ENABLED`
- `PORTAL_MESSAGE_RATE_LIMIT`
- `PORTAL_MESSAGE_DAILY_LIMIT`
- `PORTAL_MESSAGE_WINDOW_SECONDS`
- `PORTAL_ADMIN_RATE_LIMIT`
- `PORTAL_ADMIN_WINDOW_SECONDS`
- `PORTAL_MESSAGE_MAX_CHARS`
- `PORTAL_MESSAGE_MAX_LINKS`
- `PORTAL_HONEYPOT_FIELDS`

## 7. 验收标准

1. 正常留言可以写入 SQLite。
2. 超长留言被拒绝，不进入数据库。
3. 蜜罐字段有值时被拒绝，不进入数据库。
4. 同 IP 高频提交返回 `429 rate_limited`。
5. 后台 Admin API 高频访问返回 `429 admin_rate_limited`。
6. 后台显示内容不包含原始 `<script>` 标签。
7. `npm run check` 通过。
