import JSZip from 'jszip';
import type { EpubBook, TocEntry } from './types';
import { htmlToText } from './html2text';
import { htmlToMarkdown } from './html2md';
import { getCleanBody } from './dom';
import { resolvePath, toBase64 } from './utils';

export interface ExportOptions {
  /** Markdown 是否把图片内联为 base64 */
  inlineImages: boolean;
  /** 是否在正文前插入目录 */
  includeToc: boolean;
  /** 章节之间的分隔串 */
  chapterSeparator: string;
}

function dirname(path: string): string {
  const i = path.lastIndexOf('/');
  return i === -1 ? '' : path.slice(0, i);
}

/** 生成图片地址解析器：把章节内的相对 src 映射到包内资源 */
function makeResolver(book: EpubBook, chapterPath: string, inline: boolean) {
  return (src: string): string | null => {
    if (!src) return null;
    if (src.startsWith('data:') || /^(https?:)?\/\//.test(src)) return src;
    const full = resolvePath(dirname(chapterPath), decodeURIComponent(src));
    const asset = book.assets.get(full);
    if (!asset) return src;
    if (inline) return `data:${asset.mediaType};base64,${toBase64(asset.data)}`;
    return 'images/' + (asset.fullPath.split('/').pop() ?? 'image');
  };
}

function tocLines(book: EpubBook, indentStep = ''): string[] {
  const lines: string[] = [];
  const walk = (entries: typeof book.toc, level: number) => {
    for (const e of entries) {
      if (!e.title) continue;
      lines.push(indentStep.repeat(level) + '- ' + e.title);
      walk(e.children, level + 1);
    }
  };
  if (book.toc.length > 0) {
    walk(book.toc, 0);
  } else {
    for (const c of book.chapters) lines.push('- ' + c.title);
  }
  return lines;
}

export function buildTxt(book: EpubBook, opts: ExportOptions): string {
  const parts: string[] = [book.meta.title, ''];
  if (book.meta.creator) parts.push(`作者：${book.meta.creator}`, '');
  if (book.meta.publisher) parts.push(`出版方：${book.meta.publisher}`, '');

  if (opts.includeToc) {
    parts.push('目录', '');
    parts.push(...tocLines(book, '  '), '');
    parts.push('', '');
  }

  for (const chapter of book.chapters) {
    parts.push(chapter.title, '', htmlToText(chapter.html), '');
    parts.push(opts.chapterSeparator, '');
  }

  return parts.join('\n').replace(/\n{4,}/g, '\n\n\n').trim() + '\n';
}

export function buildMarkdown(book: EpubBook, opts: ExportOptions): string {
  const parts: string[] = [`# ${book.meta.title}`, ''];
  const metaRows: string[] = [];
  if (book.meta.creator) metaRows.push(`- 作者：${book.meta.creator}`);
  if (book.meta.publisher) metaRows.push(`- 出版方：${book.meta.publisher}`);
  if (book.meta.language) metaRows.push(`- 语言：${book.meta.language}`);
  if (book.meta.date) metaRows.push(`- 出版日期：${book.meta.date}`);
  if (metaRows.length) parts.push(...metaRows, '');

  if (opts.includeToc) {
    parts.push('## 目录', '');
    parts.push(...tocLines(book, '  '), '');
  }

  for (const chapter of book.chapters) {
    parts.push(`## ${chapter.title}`, '');
    parts.push(htmlToMarkdown(chapter.html, makeResolver(book, chapter.fullPath, opts.inlineImages)));
    parts.push('');
    if (opts.chapterSeparator.trim()) parts.push('---', '');
  }

  return parts.join('\n').replace(/\n{4,}/g, '\n\n\n').trim() + '\n';
}

const READER_CSS = `
:root { color-scheme: light; }
body { font-family: Georgia, "Songti SC", "Noto Serif CJK SC", serif; max-width: 46rem;
  margin: 0 auto; padding: 2.5rem 1.5rem 6rem; line-height: 1.85; color: #1f2933; background: #fff; }
h1 { font-size: 1.9rem; margin: 0 0 0.5rem; }
h2 { font-size: 1.4rem; margin: 2.5rem 0 0.75rem; padding-bottom: .35rem; border-bottom: 1px solid #e5e7eb; }
h3 { font-size: 1.15rem; margin: 1.8rem 0 .5rem; }
p { margin: 0 0 1rem; text-align: justify; }
img { max-width: 100%; height: auto; display: block; margin: 1rem auto; }
blockquote { margin: 1rem 0; padding: .3rem 1rem; border-left: 3px solid #cbd5e1; color: #4b5563; }
pre { background: #f6f8fa; padding: 1rem; overflow-x: auto; border-radius: 6px; }
code { font-family: ui-monospace, "Cascadia Code", Consolas, monospace; font-size: .9em; }
table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
th, td { border: 1px solid #e2e8f0; padding: .45rem .6rem; }
ul, ol { padding-left: 1.5rem; }
.book-meta { color: #64748b; font-size: .9rem; margin-bottom: 2rem; }
.toc { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem 1.5rem; margin-bottom: 2.5rem; }
.toc ul { list-style: none; padding-left: 1rem; }
.toc a { color: #334155; text-decoration: none; }
.chapter { margin-bottom: 1rem; }
`;

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function tocHtml(book: EpubBook): string {
  const indexByPath = new Map<string, number>();
  book.chapters.forEach((c, i) => indexByPath.set(c.fullPath, i + 1));
  const render = (entries: typeof book.toc): string => {
    if (entries.length === 0) return '';
    return `<ul>${entries
      .map((e) => {
        const idx = indexByPath.get((e.href || '').split('#')[0]) ?? 0;
        const label = escapeHtml(e.title || '未命名');
        const item = idx ? `<a href="#chapter-${idx}">${label}</a>` : label;
        return `<li>${item}${render(e.children)}</li>`;
      })
      .join('')}</ul>`;
  };
  const entries: TocEntry[] =
    book.toc.length > 0
      ? book.toc
      : book.chapters.map((c) => ({ title: c.title, href: c.fullPath, children: [] }));
  return render(entries);
}

/** 生成自包含的单文件 HTML */
export function buildSingleHtml(book: EpubBook, opts: ExportOptions): string {
  const metaRow = [
    book.meta.creator && `<div>作者：${escapeHtml(book.meta.creator)}</div>`,
    book.meta.publisher && `<div>出版方：${escapeHtml(book.meta.publisher)}</div>`,
    book.meta.date && `<div>出版日期：${escapeHtml(book.meta.date)}</div>`,
  ]
    .filter(Boolean)
    .join('');
  const toc = opts.includeToc ? `<nav class="toc"><h2>目录</h2>${tocHtml(book)}</nav>` : '';
  const body = book.chapters
    .map((chapter, i) => {
      const content = getCleanBody(chapter.html);
      for (const img of Array.from(content.getElementsByTagName('img'))) {
        const src = img.getAttribute('src');
        if (!src) continue;
        const resolved = makeResolver(book, chapter.fullPath, true)(src);
        if (resolved) img.setAttribute('src', resolved);
      }
      return `<section class="chapter" id="chapter-${i + 1}">\n<h2>${escapeHtml(chapter.title)}</h2>\n${content.innerHTML}\n</section>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="${escapeHtml(book.meta.language || 'zh-CN')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(book.meta.title)}</title>
<style>${READER_CSS}</style>
</head>
<body>
<h1>${escapeHtml(book.meta.title)}</h1>
<div class="book-meta">${metaRow}</div>
${toc}
${body}
</body>
</html>`;
}

/** 生成用于打印 / 导出 PDF 的页面 */
export function buildPrintHtml(book: EpubBook): string {
  const base = buildSingleHtml(book, { inlineImages: true, includeToc: true, chapterSeparator: '' });
  const printCss = `
  @media print {
    @page { size: A4; margin: 18mm 16mm; }
    body { max-width: none; padding: 0; font-size: 11pt; }
    .chapter { page-break-before: always; break-before: page; }
    .chapter:first-of-type { page-break-before: avoid; break-before: avoid; }
    h1, h2, h3 { page-break-after: avoid; break-after: avoid; }
    img { max-height: 90mm; }
    .toc { page-break-after: always; break-after: page; }
  }
  .print-hint { position: fixed; right: 16px; bottom: 16px; background: #111827; color: #fff;
    padding: 8px 14px; border-radius: 999px; font-size: 13px; font-family: system-ui, sans-serif;
    box-shadow: 0 6px 18px rgba(0,0,0,.2); z-index: 9; }
  @media print { .print-hint { display: none; } }
  `;
  return base.replace('</style>', printCss + '</style>').replace('<body>', '<body>\n<div class="print-hint">在弹出的打印对话框中选择「另存为 PDF」</div>');
}

/** 打开打印窗口（用于导出 PDF） */
export function openPrintWindow(html: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    alert('浏览器拦截了弹窗，请允许本页面弹出窗口后重试。');
    URL.revokeObjectURL(url);
    return;
  }
  win.addEventListener('load', () => {
    setTimeout(() => {
      try {
        win.focus();
        win.print();
      } catch {
        /* 某些浏览器限制自动打印，用户可手动 Ctrl+P */
      }
    }, 300);
  });
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/** 把 EPUB 内所有图片打包为 ZIP */
export async function buildImagesZip(book: EpubBook): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder('images');
  if (!folder) throw new Error('创建 ZIP 目录失败');
  for (const asset of book.assets.values()) {
    folder.file(asset.fullPath.split('/').pop() ?? 'image', asset.data);
  }
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}
