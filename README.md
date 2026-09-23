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
