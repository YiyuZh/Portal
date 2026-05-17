# Zenithy Portal Project Memory

更新时间：2026-05-17

本文档是 `D:/apps/gateway-portal/portal` 的跨聊天接手总览。它不替代 `project-index/`，也不替代外层最高约束文档 `D:/apps/gateway-portal/任务记忆文档.md`；它的作用是让新聊天能快速理解当前目标、边界、已完成工作、风险点和下一步。

## 0. 必读顺序

每次修改前必须先读：

1. `project-index/README.md`
2. `project-index/REPO_MAP.md`
3. `project-index/FILE_CATALOG.md`
4. `D:/apps/gateway-portal/任务记忆文档.md`
5. `PROJECT_MEMORY.md`

如果本文档与 `project-index/` 或外层任务记忆文档冲突，先暂停并核对真实代码与用户最新要求，不要直接改。

## 1. 当前代码事实

- 真实 Git 根目录是 `D:/apps/gateway-portal/portal`。
- 当前主分支为 `main`，跟踪 `origin/main`。
- `scripts/` 的唯一有效目录是 `D:/apps/gateway-portal/portal/scripts`。
- 外层 `D:/apps/gateway-portal/scripts` 不属于真实部署仓库；不要在那里维护脚本。
- 首页入口是 `site/index.html`。
- 首页配置来自 `site/assets/site-config.json`。
- 首页项目数据来自 `site/assets/projects.json`。
- Blog 文章 manifest 是 `site/blog/posts/manifest.json`。
- Messages API 运行数据由 `api/messages_api.py` 使用 SQLite 管理。
- 公网入口、Caddy、多域名路由、shared_gateway 的事实来源在 `D:/apps/HireMate`，不是 portal。

## 2. 当前正在实现的功能目标

当前 portal 不是从零重写的网站，而是已经上线并多轮收口的个人品牌 + 项目门户。

近期核心目标：

- 保持首页数据驱动：`site-config.json` + `projects.json`。
- 保持 Blog、项目管理、留言管理、安全模块和发布检查闭环稳定。
- 继续收口 Skills Universe 蜘蛛网技能区，使其成为全宽主视觉、展示真实技术栈、本地图标、品牌色 hover 和轻量视觉特效。
- 继续保持 Projects 区为单行横向项目轨道，项目内容仍由后台维护的 `projects.json` 驱动。
- 保持发布流程为本地生成/下载文件 -> Git 提交 -> 服务器 `git pull` -> 重建容器，不改成服务器在线写文件。

## 3. 用户提出过的关键需求细节

### 全局边界

- 不要把 portal 当成新站重写。
- 不要破坏现有数据驱动层、Blog、项目管理页、Messages API、安全模块和发布检查脚本。
- 不要重新引入 hash 导航作为主交互。
- Blog 只作为顶部独立入口，不塞进首页正文。
- 公网入口和 Caddy 事实来源永远优先核对 `D:/apps/HireMate/Caddyfile`。
- 跨仓库配置不要误改 portal 里的参考文件当成线上事实。

### 首页 Hero

- 默认标题为 `HELLO, I'M Zenithy`。
- 小字为 `AI Process Manger / 18岁 / 广东深圳`，保留这个拼写。
- Hero 已实现全屏 pointer 交互、标题 tilt、黑球跟随、黑球内白字 reveal。
- 除非用户明确点名，不要继续重做 Hero。
- 不能恢复旧问题：
  - 透明 reveal 球 / 灰色 glass lens
  - 黑球和 reveal mask 错位
  - 黑白文字在球内混叠
  - 旧 focus 压缩逻辑
  - 只在标题局部交互

### Projects

- 项目卡必须继续来自 `site/assets/projects.json`。
- 不要把 HireMate、AI-Interview、智摄等项目文案硬编码回 HTML。
- 项目区必须是单行横向轨道，不要回到两行 grid。
- 保留左右按钮、滚轮横切、桌面拖拽、键盘切换、3D tilt 和按钮点击。
- 空按钮文案必须隐藏，不能显示旧默认按钮。
- 项目管理后台 `site/blog/admin/projects.html` 必须继续能维护同一份 `projects.json`。

### Skills Universe

- 当前重点是 Skills 蜘蛛网区域。
- 蜘蛛网应是全宽主视觉，不是左侧小卡片。
- Skills 区块现在是两段式：上方保留技术栈蜘蛛网，下方是常用 Skills Showcase 横向卡片。
- 常用 Skills Showcase 来自 `site/assets/site-config.json -> sections.skills.showcase`。
- 技能说明卡在蜘蛛网下方，不挤压右侧，也不能盖住蜘蛛网。
- 蜘蛛网内部不显示 `SKILL UNIVERSE` 胶囊、大标题或大段说明文字。
- 节点展示真实技术栈，不展示 DeepSeek / OpenAI 这类模型或服务商 logo。
- 技术图标必须本地化，不能运行时依赖 CDN。
- hover/focus 时节点、边框、外发光、tooltip accent 和网线应使用品牌色。
- Python 必须能体现蓝色 `#3776AB` 和黄色 `#FFD43B`。
- React 使用 `#61DAFB`，TypeScript 使用 `#3178C6`，MySQL 使用蓝橙高亮。
- 视觉特效要轻量、克制、可降级，不做整站黑化。

### Blog

- 后台文章列表、编辑器、前台 Blog 首页必须使用同一份 `manifest.json`。
- 后台文章列表点击编辑已发布文章，应进入 `editor.html?slug=<slug>` 并加载该文章内容。
- 编辑器必须区分新建和编辑模式。
- 编辑已发布文章时固定原 slug；如需改路径，应新建文章并手动迁移目录。
- 发布/更新仍生成下载文件：文章 `index.html` 和更新后的 `manifest.json`。
- 正文图片发布和再次编辑流程已要求写入维护手册，编辑器已支持插入图片并设定布局。

### Collab / Messages / Security

- Collab 留言不能把 fallback 本地备份伪装成真实后台可见成功。
- 真实写入依赖 Messages API。
- 后台 messages 页面应读取真实 API，不要与静态 JSON 源混用。
- 安全模块必须轻量，适合小云服务器。
- portal 内负责留言防刷、输入清洗、重复提交、蜜罐字段、API 频率限制。
- Basic Auth 暴力破解、密码箱攻击等网关级防护应在 `D:/apps/HireMate/Caddyfile` 或服务器 fail2ban 做，不在 portal 静态页硬做。

### 备案

- ICP 备案号：`粤ICP备2026047626号`。
- 链接：`https://beian.miit.gov.cn/`。
- 已知要求是网站底部悬挂备案号，并链接工信部备案官网。
- 如果多个域名指向同一页面，主域名和 `www` 域名都要能访问并显示备案号。

## 4. 已经完成的改动

### 首页与视觉

- 首页已从手写门户逐步升级为数据驱动结构。
- Hero 已完成作品集式首屏：
  - 全屏 pointer 坐标模型
  - 大标题 3D tilt
  - 黑球跟随
  - 黑球内白色 reveal 字
  - reduced-motion 降级
- Projects 已完成单行横向轨道：
  - `showcase-grid--rail`
  - 左右按钮
  - 滚轮横向切换
  - 桌面拖拽
  - 当前卡片 `.is-project-current`
  - 项目卡 3D tilt
- Skills 已升级为 Skills Universe：
  - 全宽深色局部面板
  - SVG 蜘蛛网
  - 本地技术栈图标
  - 品牌色 hover/focus
  - tooltip
  - 轻量扫光、网线呼吸、节点 pulse
  - reduced-motion 降级
- Skills Universe 下方已增加 Skills Showcase：
  - `#skills-showcase`
  - 横向 rail 卡片
  - 内容来自 `sections.skills.showcase`
  - 可由 `/blog/admin/skills.html` 编辑、预览、排序并下载 `site-config.json`

### Blog 与后台

- Blog 已有：
  - `site/blog/index.html`
  - `site/blog/post.html`
  - `site/blog/admin/index.html`
  - `site/blog/admin/editor.html`
  - `site/blog/admin/projects.html`
  - `site/blog/admin/skills.html`
  - `site/blog/admin/messages.html`
  - `site/blog/posts/manifest.json`
- 后台 shell 已统一为黑白 admin 风格。
- 后台五页导航包含：
  - 文章列表
  - 发布文章
  - 项目管理
  - Skills 管理
  - 留言管理
- 后台 logo 已统一使用 favicon 同源资源。
- 编辑器已支持 `?slug=` 加载已发布文章。
- 编辑器已支持正文图片插入和布局 class：
  - wide
  - center
  - left
  - right

### Messages API 与安全

- 已实现 `api/messages_api.py`。
- API 路由包括：
  - `GET /api/health`
  - `POST /api/messages`
  - `GET /api/admin/messages`
  - `PATCH /api/admin/messages/:id`
  - `DELETE /api/admin/messages/:id`
- 已实现 `security/guards.py`。
- 已有测试：
  - `scripts/test-messages-api.js`
  - `scripts/test-security-guards.js`

### 发布检查

- `package.json` 已定义：
  - `npm run validate`
  - `npm run preflight`
  - `npm run check`
  - `npm run test:messages`
  - `npm run test:security`
  - `npm run qa`
- `validate-content.js` 校验：
  - projects
  - site-config
  - blog manifest
  - messages manifest
  - security 文件
  - tech icons
- `preflight-check.js` 校验：
  - 首页结构
  - favicon/logo
  - ICP 备案
  - Hero 防回退
  - Skills Universe 防回退
  - Projects rail 防回退
  - Blog/admin/editor/projects/skills/messages 页面
  - Messages API
  - security
  - project-index
  - 跨仓库 Caddy 提示

## 5. 涉及文件和核心逻辑

### 首页

- `site/index.html`
  - 首页 HTML shell
  - nav、Hero、Projects、Skills、Collab、About、Footer
  - fetch `assets/site-config.json`
  - fetch `assets/projects.json`
  - render projects
  - render Skills Universe and Skills Showcase
  - render footer filing
- `site/home-visual.css`
  - 首页主视觉系统
  - Hero 排版
  - Projects rail 和 card 状态
  - Skills Universe 蜘蛛网、节点、tooltip、动效
  - Skills Showcase rail 和常用 Skills 卡片
  - 响应式与 reduced-motion
- `site/home-hero.js`
  - Hero pointer/tilt/orb/reveal
  - 不要轻易改，除非用户明确点名
- `site/home-skills.js`
  - metric count-up
  - Skills section 激活
  - node tooltip
  - brand hover state
  - `is-tech-active`
  - `is-link-active`
- `site/home-tilt.js`
  - Projects card tilt
  - 要保证按钮点击不被 overlay 阻挡
- `site/home-collab.js`
  - Collab 表单提交
  - API/fallback 用户反馈

### 数据

- `site/assets/site-config.json`
  - Hero 文案与配置
  - nav 文案
  - sections 文案
  - skills items
  - `sections.skills.showcase` 常用 Skills 展示卡
  - footer 和备案号
- `site/assets/projects.json`
  - 首页项目卡唯一数据源
  - 项目管理页也维护它
- `site/assets/tech-icons/`
  - Skills Universe 本地图标目录
  - 可保留 OpenAI/DeepSeek 文件作为资源，但首页 spider web 不展示它们

### Blog / Admin

- `site/blog/admin/index.html`
  - 文章列表
  - 读取 `../posts/manifest.json`
  - 编辑链接使用 `./editor.html?slug=<slug>`
- `site/blog/admin/editor.html`
  - 发布/编辑文章
  - 支持 `URLSearchParams` 中的 `slug` / `edit`
  - 加载 manifest 与文章 HTML
  - 导出更新后的文章 `index.html` 与 `manifest.json`
- `site/blog/admin/projects.html`
  - 项目管理
  - 读取并导出 `site/assets/projects.json`
- `site/blog/admin/skills.html`
  - Skills Showcase 管理
  - 读取 `/assets/site-config.json`
  - 只导出更新后的 `sections.skills.showcase` 所在 `site-config.json`
- `site/blog/admin/messages.html`
  - 留言管理
  - 读取 API
  - 管理状态、归档、删除

### API / Security

- `api/messages_api.py`
  - SQLite schema
  - Messages CRUD
  - 调用 lightweight security
- `security/guards.py`
  - rate limit
  - duplicate block
  - honeypot
  - sanitization
  - admin request protection
- `.env.example`
  - Messages API 环境变量说明

### Scripts / Checks

- `scripts/README.md`
  - 声明 portal 内 scripts 是唯一有效脚本目录
- `scripts/validate-content.js`
  - 内容与结构数据校验
- `scripts/preflight-check.js`
  - 发布前检查与防回退
- `scripts/test-messages-api.js`
  - Messages API 功能测试
- `scripts/test-security-guards.js`
  - 轻量安全测试

## 6. 当前未完成事项

- 如果后续修改结构、数据流、路由、脚本规则、部署行为，必须同步更新 `project-index/`。
- 如果后续修改操作流程，必须同步更新外层 `主页维护手册.md`。
- 如果后续继续视觉方向，优先做浏览器截图级 QA，特别是：
  - 桌面 1440x900
  - 平板 820x1180
  - 手机 390x844
- 如果线上 Skills Universe 看不到，优先检查：
  - `home-visual.css` 版本号
  - `home-skills.js` 版本号
  - `site/assets/tech-icons/` 是否进入 Git
  - 浏览器缓存
- 如果线上项目区又变成两行，优先检查：
  - `#projects-grid.showcase-grid--rail`
  - `flex-wrap: nowrap`
  - `site/home-visual.css`
  - `site/index.html` 内联兜底样式
- 如果 Blog 已发布文章前台不显示，优先检查：
  - 前后台是否读取同一个 `manifest.json`
  - post `status` / `published` 规则
  - slug 是否存在
  - `site/blog/posts/<slug>/index.html` 是否存在
- 如果 messages 前台提交后后台看不到，优先判断：
  - 是否真实 POST `/api/messages`
  - 是否 fallback 本地备份
  - 后台是否 GET `/api/admin/messages`
  - API 与后台是否同源
  - 服务器 `.env` 与 Caddy 反代是否就绪

## 7. 已知问题、失败尝试和不能走的方案

### 不要再走的方案

- 不要把 `scripts/` 放在 `D:/apps/gateway-portal/scripts`。
- 不要把项目卡重新写死进 HTML。
- 不要把 Projects 改回两行 grid。
- 不要恢复 hash 导航作为主交互。
- 不要用远程 CDN 加载 Skills 技术图标。
- 不要把 DeepSeek / OpenAI 作为 Skills 蜘蛛网节点。
- 不要把 Blog 塞进首页正文。
- 不要在 Hero 里重新引入：
  - 透明 reveal 球
  - 灰色 glass lens
  - 黑球和白字错位
  - 黑球内黑白文字混叠
  - 旧坐标压缩
- 不要把 Collab fallback 备份提示写成“后台已收到”的成功状态。
- 不要在 portal 静态页里做 Basic Auth 暴力破解防护；应交给 HireMate/Caddy 或服务器 fail2ban。
- 不要在 gateway-portal 里误改 Caddy 参考文件并当成线上事实。

### 易复发问题

- 浏览器缓存导致线上仍显示旧 CSS/JS。
- `tech-icons/` 忘记加入 Git，线上节点图标丢失。
- 修改 `site-config.json` 后 validate/preflight 没同步。
- 修改 `projects.json` 字段后项目管理页没同步。
- 文章编辑器导出的 `manifest.json` 没替换真实 manifest。
- 服务器上直接改文件导致下次 `git pull` 冲突。

## 8. 下一步建议

### 如果继续首页视觉

1. 先用浏览器截图级 QA 检查 Skills Universe、Projects rail、Hero 首屏。
2. 只针对发现的问题改对应模块。
3. 修改后运行：
   - `npm run validate`
   - `npm run preflight`
   - `npm run check`
   - `npm run qa`

### 如果继续 Blog

1. 优先验收“编辑已发布文章”闭环：
   - 后台文章列表点击编辑
   - `editor.html?slug=<slug>` 加载文章
   - 修改正文或图片
   - 导出新的 `index.html`
   - 导出新的 `manifest.json`
   - 本地替换文件
   - Git 提交部署
2. 不要改成服务器在线写文章。

### 如果继续 Messages / Security

1. 先跑 `npm run test:messages` 和 `npm run test:security`。
2. 如果公网提交不可见，再检查 HireMate/Caddy 和服务器 `.env`。
3. 不要把 fallback 当真实成功。

### 如果继续部署/域名

1. 所有 Caddy、多域名、www、shared_gateway 改动先去 `D:/apps/HireMate`。
2. portal 只维护站点内容层。
3. 上线前执行：
   - `npm run validate`
   - `npm run preflight`
   - `npm run check`
   - `npm run qa`

## 9. 常用命令

在 `D:/apps/gateway-portal/portal` 执行：

```powershell
npm run validate
npm run preflight
npm run check
npm run test:messages
npm run test:security
npm run qa
```

查看 Git 状态：

```powershell
git status --short --branch
```

服务器常规路径：

```bash
cd /opt/apps/portal
git pull
docker compose up -d --build
```

注意：涉及公网入口时，先去 `/opt/apps/hiremate` 或本地 `D:/apps/HireMate` 核对 Caddy 事实来源。
