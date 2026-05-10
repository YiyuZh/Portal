# Tech Icons

本目录用于 Zenithy Portal 首页 Skills Universe 的技术栈节点图标。

- `vue.svg`、`vite.svg`、`pinia.svg`、`typescript.svg`、`react.svg`、`tailwind.svg`、`fastapi.svg`、`python.svg`、`postgresql.svg`、`redis.svg`、`sqlite.svg`、`mysql.svg`、`docker.svg`、`caddy.svg`、`nginx.svg`、`openai.svg`、`deepseek.svg`、`capacitor.svg`、`tauri.svg`：来自 Simple Icons 的本地化 SVG。
- `rag.svg`：项目自制轻量文字徽标，用于表示检索增强生成能力，不对应单一品牌。

维护原则：

- 页面运行时只能引用本地 `/assets/tech-icons/*.svg`，不要依赖 CDN。
- 如替换图标，保持文件名不变，避免改动首页渲染逻辑。
- 新增技术栈时，同步更新首页 `techStackNodes` 与发布检查脚本。
