import JSZip from 'jszip';
import { marked } from 'marked';
import { nowIso, uuid } from './utils';

export interface BuildMeta {
  title: string;
  author: string;
  language: string;
  publisher: string;
  description: string;
}

export type SourceKind = 'markdown' | 'text';

export type SplitMode = 'auto' | 'h1' | 'h2' | 'separator' | 'none';

export interface DraftChapter {
  title: string;
  body: string;
}

const CHAPTER_RE =
  /^\s*(?:序|前言|序言|自序|后记|附录|楔子|尾声|番外|第\s*[0-9零一二三四五六七八九十百千两]+\s*[章节回篇集部卷]\s*[^\n]{0,50}|Chapter\s+[0-9ivxlcmIVXLCM]+[^\n]{0,50})\s*$/i;

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 纯文本 → HTML 段落 */
function textToHtml(text: string): string {
  return text
    .split(/\n{1,}\s*\n{1,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeXml(block).replace(/\n/g, '<br />')}</p>`)
    .join('\n');
}

/** Markdown → HTML */
function markdownToHtml(md: string): string {
  const result = marked.parse(md, { gfm: true, breaks: false });
  return typeof result === 'string' ? result : '';
}

/**
 * 推断用于分章的标题层级：取出现次数最多的层级，次数相同时取更浅的层级。
 * 这样既能处理「只有一个书名 H1 + 若干 H2 章节」也能处理「全部用 H1 分章」的稿件。
 */
function detectHeadingLevel(lines: string[]): number {
  const counts = new Array(7).fill(0) as number[];
  for (const line of lines) {
    const m = line.match(/^(#{1,6})(?!#)\s*\S/);
    if (m) counts[m[1].length] += 1;
  }
  let best = 0;
  let level = 2;
  for (let l = 1; l <= 6; l += 1) {
    if (counts[l] > best) {
      best = counts[l];
      level = l;
    }
  }
  return best === 0 ? 2 : level;
}

/** Markdown 是否只有一行标题（用于剔除文档顶部的书名行） */
function isHeadingOnly(body: string): boolean {
  const trimmed = body.trim();
  return trimmed.split('\n').length === 1 && /^#{1,6}(?!#)\s*\S/.test(trimmed);
}

/** 把正文切分为章节 */
export function splitIntoChapters(source: string, kind: SourceKind, mode: SplitMode): DraftChapter[] {
  const text = source.replace(/\r\n?/g, '\n');
  const lines = text.split('\n');

  const stripHeading = (body: string): { title: string; body: string } => {
    const m = body.match(/^\s*#{1,6}\s*(.+?)\s*#*\s*$/m);
    if (!m || m.index === undefined) return { title: '', body };
    const isFirstNonEmpty = body.slice(0, m.index).trim() === '';
    if (!isFirstNonEmpty) return { title: '', body };
    return { title: m[1].trim(), body: body.replace(m[0], '') };
  };

  if (mode === 'separator') {
    const chunks: string[] = [];
    let current: string[] = [];
    for (const line of lines) {
      if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
        chunks.push(current.join('\n'));
        current = [];
      } else {
        current.push(line);
      }
    }
    chunks.push(current.join('\n'));
    return chunks
      .map((c) => c.trim())
      .filter(Boolean)
      .map((body) => {
        const { title, body: rest } = stripHeading(body);
        return { title, body: rest.trim() };
      });
  }

  const wantsHeadingSplit =
    mode === 'h1' || mode === 'h2' || (mode === 'auto' && kind === 'markdown');

  if (wantsHeadingSplit) {
    const level = mode === 'h1' ? 1 : mode === 'h2' ? 2 : detectHeadingLevel(lines);
    const re = new RegExp(`^#{${level}}(?!#)\\s*(.*)$`);
    const chapters: DraftChapter[] = [];
    let title = '';
    let buffer: string[] = [];
    const flush = () => {
      const body = buffer.join('\n').trim();
      if (body || title) chapters.push({ title, body });
      buffer = [];
    };
    for (const line of lines) {
      const m = line.match(re);
      if (m) {
        flush();
        title = m[1].replace(/#+\s*$/, '').trim();
      } else {
        buffer.push(line);
      }
    }
    flush();

    // 文档顶部单独的书名行不应成为一章
    if (chapters.length > 1 && !chapters[0].title && isHeadingOnly(chapters[0].body)) {
      chapters.shift();
    }
    return chapters.length > 0 ? chapters : [{ title: '', body: text.trim() }];
  }

  if (mode === 'none') {
    return [{ title: '', body: text.trim() }];
  }

  // 文本自动识别章节标题
  const chapters: DraftChapter[] = [];
  let title = '';
  let buffer: string[] = [];
  const flush = () => {
    const body = buffer.join('\n').trim();
    if (body || title) chapters.push({ title, body });
    buffer = [];
  };
  for (const line of lines) {
    if (line.trim().length > 0 && line.trim().length <= 60 && CHAPTER_RE.test(line)) {
      flush();
      title = line.trim();
    } else {
      buffer.push(line);
    }
  }
  flush();
  if (chapters.length === 0) return [{ title: '', body: text.trim() }];
  return chapters;
}

const EPUB_CSS = `body { font-family: Georgia, "Songti SC", "Noto Serif CJK SC", serif;
  line-height: 1.8; margin: 1.2em 1em; text-align: justify; }
h1, h2, h3 { line-height: 1.35; text-align: left; }
h1 { font-size: 1.5em; margin: 1.2em 0 .6em; }
h2 { font-size: 1.3em; margin: 1.2em 0 .6em; }
p { margin: 0 0 .8em; text-indent: 2em; }
blockquote { margin: .8em 0; padding-left: 1em; border-left: 2px solid #999; color: #555; }
img { max-width: 100%; height: auto; }
pre { background: #f5f5f5; padding: .8em; overflow-x: auto; }
code { font-family: ui-monospace, Consolas, monospace; }
ul, ol { padding-left: 1.8em; }
`;

function toXhtml(title: string, bodyHtml: string, lang: string): string {
  const raw = `<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${lang}" lang="${lang}"><head><meta charset="utf-8" /><title>${escapeXml(title)}</title><link rel="stylesheet" type="text/css" href="../styles/main.css" /></head><body>${bodyHtml}</body></html>`;
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const serialized = new XMLSerializer().serializeToString(doc);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${serialized}`;
}

function navXhtml(chapters: DraftChapter[], lang: string): string {
  const items = chapters
    .map(
      (c, i) =>
        `      <li><a href="text/chapter-${i + 1}.xhtml">${escapeXml(c.title || `第 ${i + 1} 章`)}</a></li>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}" lang="${lang}">
  <head>
    <meta charset="utf-8" />
    <title>目录</title>
  </head>
  <body>
    <nav epub:type="toc" id="toc" role="doc-toc">
      <h1>目录</h1>
      <ol>
${items}
      </ol>
    </nav>
    <nav epub:type="landmarks" hidden="hidden">
      <h2>Guide</h2>
      <ol>
        <li><a epub:type="bodymatter" href="text/chapter-1.xhtml">正文开始</a></li>
      </ol>
    </nav>
  </body>
</html>`;
}

function tocNcx(chapters: DraftChapter[], meta: BuildMeta, uid: string, lang: string): string {
  const points = chapters
    .map(
      (c, i) => `    <navPoint id="navPoint-${i + 1}" playOrder="${i + 1}">
      <navLabel><text>${escapeXml(c.title || `第 ${i + 1} 章`)}</text></navLabel>
      <content src="text/chapter-${i + 1}.xhtml" />
    </navPoint>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="${lang}">
  <head>
    <meta name="dtb:uid" content="${escapeXml(uid)}" />
    <meta name="dtb:depth" content="1" />
    <meta name="dtb:totalPageCount" content="0" />
    <meta name="dtb:maxPageNumber" content="0" />
  </head>
  <docTitle><text>${escapeXml(meta.title)}</text></docTitle>
  <navMap>
${points}
  </navMap>
</ncx>`;
}

function contentOpf(chapters: DraftChapter[], meta: BuildMeta, uid: string, lang: string): string {
  const manifest = [
    '    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav" />',
    '    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml" />',
    '    <item id="css" href="styles/main.css" media-type="text/css" />',
    ...chapters.map(
      (_, i) =>
        `    <item id="chapter-${i + 1}" href="text/chapter-${i + 1}.xhtml" media-type="application/xhtml+xml" />`,
    ),
  ].join('\n');

  const spine = chapters
    .map((_, i) => `    <itemref idref="chapter-${i + 1}" linear="yes" />`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId" xml:lang="${lang}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title id="title">${escapeXml(meta.title)}</dc:title>
    <dc:creator id="creator">${escapeXml(meta.author)}</dc:creator>
    <dc:language>${escapeXml(meta.language)}</dc:language>
    <dc:identifier id="BookId">${escapeXml(uid)}</dc:identifier>
${meta.publisher ? `    <dc:publisher>${escapeXml(meta.publisher)}</dc:publisher>\n` : ''}${
      meta.description ? `    <dc:description>${escapeXml(meta.description)}</dc:description>\n` : ''
    }    <meta property="dcterms:modified">${nowIso()}</meta>
    <meta refines="#creator" property="role" scheme="marc:relators">aut</meta>
  </metadata>
  <manifest>
${manifest}
  </manifest>
  <spine toc="ncx">
${spine}
  </spine>
</package>`;
}

const CONTAINER_XML = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml" />
  </rootfiles>
</container>`;

/** 由 TXT / Markdown 生成 EPUB 3.0 文件 */
export async function buildEpub(
  source: string,
  kind: SourceKind,
  meta: BuildMeta,
  mode: SplitMode,
): Promise<{ blob: Blob; chapterCount: number }> {
  if (!source.trim()) throw new Error('正文内容为空');

  const chapters = splitIntoChapters(source, kind, mode).filter(
    (c) => c.body.trim() || c.title,
  );
  if (chapters.length === 0) throw new Error('未能切分出任何章节');

  const title = meta.title.trim() || '未命名电子书';
  const lang = meta.language.trim() || 'zh-CN';
  const uid = `urn:uuid:${uuid()}`;
  const finalMeta: BuildMeta = { ...meta, title, author: meta.author.trim() || '佚名' };

  const zip = new JSZip();
  // mimetype 必须是压缩包第一个条目且不压缩
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file('META-INF/container.xml', CONTAINER_XML);
  zip.file('OEBPS/content.opf', contentOpf(chapters, finalMeta, uid, lang));
  zip.file('OEBPS/nav.xhtml', navXhtml(chapters, lang));
  zip.file('OEBPS/toc.ncx', tocNcx(chapters, finalMeta, uid, lang));
  zip.file('OEBPS/styles/main.css', EPUB_CSS);

  chapters.forEach((chapter, i) => {
    const html = kind === 'markdown' ? markdownToHtml(chapter.body) : textToHtml(chapter.body);
    const heading = chapter.title
      ? `<h1>${escapeXml(chapter.title)}</h1>\n${html}`
      : html;
    zip.file(
      `OEBPS/text/chapter-${i + 1}.xhtml`,
      toXhtml(chapter.title || `${title} · 第 ${i + 1} 章`, heading, lang),
    );
  });

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/epub+zip',
    compression: 'DEFLATE',
  });
  return { blob, chapterCount: chapters.length };
}
