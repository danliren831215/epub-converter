# EPUB 转换工具

纯前端的电子书格式互转工具。**所有解析与打包都在浏览器内完成，文件不会上传到任何服务器。**

- 在线站点：GitHub Pages（仓库 Settings → Pages → Source 选择 GitHub Actions 后自动部署）
- 技术栈：React 18 + TypeScript + Vite + JSZip + marked

## 功能

### EPUB → 其他格式

| 功能 | 说明 |
| --- | --- |
| EPUB → TXT | 按 spine 顺序抽取正文，保留段落与章节分隔 |
| EPUB → Markdown | 转换标题、列表、引用、表格、粗斜体、行内代码、链接；图片可内联为 base64 |
| EPUB → HTML | 生成自包含单文件，图片内联，含目录锚点跳转 |
| EPUB → PDF | 通过浏览器打印对话框导出，目录与章节自动分页 |
| 提取图片 | 把 EPUB 内所有图片资源打包为 ZIP |

同时展示书籍元数据（书名 / 作者 / 语言 / 出版方）与目录结构。

### TXT / Markdown → EPUB

- 支持粘贴文本或上传 `.md` / `.txt` 文件，自动识别类型并填充书名
- 分章方式：自动识别、按 `#`、按 `##`、按 `---` 分隔线、不分章
- 可填写书名、作者、语言、出版方等元数据
- 输出标准 **EPUB 3.0**：`mimetype`（未压缩且位于压缩包首位）、`META-INF/container.xml`、`content.opf`、`nav.xhtml`、`toc.ncx`、阅读样式表

## 快速开始

```bash
npm install
npm run dev      # 本地开发，默认 http://localhost:5173
npm run build    # 类型检查 + 生产构建，输出到 dist/
npm run preview  # 预览生产构建
npm run smoke    # 往返冒烟测试（Markdown → EPUB → 解析 → TXT/MD/HTML）
```

`npm run smoke` 在 jsdom 提供的浏览器 API 下完成一次完整往返，会校验：

- `mimetype` 是压缩包第一个条目且使用 STORE（不压缩）
- OPF / nav / NCX / 章节文档齐全且为合法 XML
- 元数据、目录、章节顺序解析正确
- Markdown 导出保留加粗、斜体、列表、引用、行内代码

## 部署到 GitHub Pages

仓库已内置 `.github/workflows/deploy.yml`：推送到 `main` 分支会自动构建并部署。

首次使用需在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。

`vite.config.ts` 中 `base: './'` 使用相对路径，因此无论是根域名还是 `https://<user>.github.io/<repo>/` 子路径都能正常访问。

## 部署到 Cloudflare Pages

两种等价方式，任选其一。本项目是纯静态站点，无需任何后端或 Functions。

### 方式一：控制台连接 Git 仓库（推荐，持续部署）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. 授权并选择 `danliren831215/epub-converter` 仓库
3. 构建配置按下表填写：

| 配置项 | 值 |
| --- | --- |
| Framework preset | `Vite` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | `18` 或更高（环境变量 `NODE_VERSION` = `20`） |

4. 保存并部署。之后每次推送到 `main` 会自动重新构建，`*.pages.dev` 与自定义域名都会更新。

> 注意：`npm run build` 已包含 `tsc --noEmit` 类型检查，类型错误会导致构建失败——这是刻意设计，避免把有问题的代码发布上线。

### 方式二：Wrangler CLI 手动上传（无需连接 Git）

```bash
npm install          # 已把 wrangler 加入 devDependencies
npm run cf:login     # 浏览器授权一次，凭证保存在本机
npm run deploy:cf    # 构建并上传 dist/ 到 Cloudflare Pages
```

首次部署会提示创建新项目，确认项目名 `epub-converter` 即可，成功后会给出 `https://epub-converter.pages.dev`。

在 CI 或非交互环境中改用 API Token：

```bash
CLOUDFLARE_API_TOKEN=<你的 token> npx wrangler pages deploy dist --project-name epub-converter
```

Token 在 Dashboard → **My Profile** → **API Tokens** 创建，模板选 **Edit Cloudflare Workers**，或自建并赋予 `Account.Cloudflare Pages:Edit` 权限。

`wrangler.toml` 中已声明 `pages_build_output_dir = "dist"`，命令行可省略目录参数。

## 搜索引擎收录

构建产物已包含完整的 SEO 基础设施：

- `index.html`：`title`、`description`、`canonical`、Open Graph / Twitter Card 标签，以及两段 JSON-LD（`WebApplication` 与 `FAQPage`）
- **预渲染**：`npm run prerender` 用 `react-dom/server` 把首屏渲染成静态 HTML 注入 `dist/index.html`。这一步是必需的——纯客户端渲染的 SPA 初始 HTML 是空的，不执行 JS 的爬虫抓不到任何正文
- `public/robots.txt` 与 `public/sitemap.xml` 会随构建产物一起发布
- 页面底部有常见问题区（`details` 原生折叠），为爬虫提供可索引的文本内容

客户端入口 `main.tsx` 会检测 `#root` 是否已有内容，有则走 `hydrateRoot` 复用首屏 DOM，没有则退回 `createRoot`，因此开发模式不受影响。`npm run check:hydrate` 会在 jsdom 里校验预渲染 HTML 与客户端渲染是否一致。

### 换域名后重新构建

绑定自定义域名时设置 `SITE_URL`，canonical、og:url、sitemap 与 JSON-LD 里的地址会一次性替换：

```bash
SITE_URL=https://epub.example.com npm run build
```

### 提交给搜索引擎

1. **Google**：[Search Console](https://search.google.com/search-console) → 添加「网址前缀」资源 → 用 HTML 文件或 meta 标记验证 → Sitemaps 里提交 `sitemap.xml`
2. **Bing**：[Webmaster Tools](https://www.bing.com/webmasters) → 可直接从 Google Search Console 导入
3. **百度**：[搜索资源平台](https://ziyuan.baidu.com) → 添加网站 → 验证后提交链接或用 API 主动推送

收录通常需要几天到两周。Google 与 Bing 能正常收录 `*.github.io`，百度对未备案的境外域名收录较慢。

> 注意：GitHub Pages 的子路径部署无法提供**域根** `robots.txt`（爬虫只认 `https://<host>/robots.txt`）。当前文件位于 `/epub-converter/robots.txt`，仍可在各站长平台手动提交 sitemap。若绑定到自定义域名，这一问题自然消失。

## 目录结构

```
src/
├─ lib/
│  ├─ epubReader.ts   EPUB 解析（container.xml → OPF → spine / nav / NCX）
│  ├─ epubWriter.ts   EPUB 3.0 生成（分章、XHTML 序列化、打包）
│  ├─ html2text.ts    XHTML → 纯文本
│  ├─ html2md.ts      XHTML → Markdown
│  ├─ exporters.ts    TXT / Markdown / HTML / PDF / 图片包导出
│  ├─ dom.ts          共享 DOM 工具
│  ├─ types.ts        类型定义
│  └─ utils.ts        编码、路径、下载等工具
├─ components/
│  ├─ Dropzone.tsx
│  ├─ EpubToOther.tsx
│  └─ TextToEpub.tsx
├─ App.tsx
└─ styles.css
```

## 已知限制

- **不支持 DRM**。带数字版权保护的电子书（如 Adobe DRM、Kindle KFX）无法解析。
- EPUB 内部固定布局（Fixed Layout）与复杂 MathML / SVG 图表在转 Markdown 时会退化为文本或占位。
- PDF 导出依赖浏览器打印能力，不同浏览器生成的分页与字体渲染会有差异。
- Markdown 转 EPUB 时，外链图片会保留原始 URL（需要联网才能显示）；不会自动下载远程图片。

## 许可

MIT License。请仅转换你拥有合法权利的电子书。
