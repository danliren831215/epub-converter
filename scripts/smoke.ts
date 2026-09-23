/**
 * 冒烟测试：在 jsdom 提供的浏览器 API 下，完成
 * Markdown → EPUB → 解析 → TXT / Markdown / HTML 的往返校验。
 *
 * 运行：npm run smoke
 */
import { JSDOM } from 'jsdom';
import JSZip from 'jszip';

let failures = 0;

function check(name: string, condition: boolean, detail = ''): void {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const MARKDOWN = `# 第一章 山雨欲来

这是**加粗**与 *斜体* 的示例段落，包含一个[链接](https://example.com)。

- 列表项一
- 列表项二

> 这是引用。

## 1.1 小节

正文第二段，带 \`行内代码\`。

# 第二章 长夜将尽

第二章正文。`;

const TEXT_SOURCE = `第一章 起始

第一段正文内容。

第二段正文内容。

第二章 尾声

最后一章内容。`;

async function inspectZip(blob: Blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const compression = view.getUint16(8, true);
  const nameLength = view.getUint16(26, true);
  const firstName = new TextDecoder().decode(buf.subarray(30, 30 + nameLength));
  return { compression, firstName, size: buf.byteLength };
}

async function main(): Promise<void> {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  const g = globalThis as unknown as Record<string, unknown>;
  g.DOMParser = dom.window.DOMParser;
  g.XMLSerializer = dom.window.XMLSerializer;
  g.Node = dom.window.Node;
  g.Blob = dom.window.Blob;
  g.File = dom.window.File;
  g.document = dom.window.document;

  const { buildEpub } = await import('../src/lib/epubWriter');
  const { readEpub } = await import('../src/lib/epubReader');
  const { buildTxt, buildMarkdown, buildSingleHtml, buildImagesZip } = await import(
    '../src/lib/exporters'
  );

  console.log('\n[1] Markdown → EPUB');
  const { blob, chapterCount } = await buildEpub(
    MARKDOWN,
    'markdown',
    { title: '测试书籍', author: '张三', language: 'zh-CN', publisher: '', description: '' },
    'auto',
  );
  check('生成了 EPUB 二进制', blob.size > 500, `size=${blob.size}`);
  check('切分出 2 章', chapterCount === 2, `chapters=${chapterCount}`);

  const raw = await inspectZip(blob);
  check('首个条目为 mimetype', raw.firstName === 'mimetype', `first=${raw.firstName}`);
  check('mimetype 未压缩（STORED）', raw.compression === 0, `method=${raw.compression}`);

  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const names = Object.keys(zip.files);
  for (const required of [
    'mimetype',
    'META-INF/container.xml',
    'OEBPS/content.opf',
    'OEBPS/nav.xhtml',
    'OEBPS/toc.ncx',
    'OEBPS/styles/main.css',
    'OEBPS/text/chapter-1.xhtml',
    'OEBPS/text/chapter-2.xhtml',
  ]) {
    check(`包含 ${required}`, names.includes(required));
  }

  const opf = await zip.file('OEBPS/content.opf')!.async('string');
  check('content.opf 含书名', opf.includes('<dc:title id="title">测试书籍</dc:title>'));
  check('content.opf 含作者', opf.includes('张三'));
  const opfDoc = new dom.window.DOMParser().parseFromString(opf, 'application/xml');
  check('content.opf 是合法 XML', !opfDoc.querySelector('parsererror'));
  const nav = await zip.file('OEBPS/nav.xhtml')!.async('string');
  check('nav.xhtml 含目录项', nav.includes('第一章 山雨欲来'));

  console.log('\n[2] EPUB → 解析');
  const FileCtor = dom.window.File as unknown as new (parts: BlobPart[], name: string) => File;
  const file = new FileCtor([blob], 'test.epub');
  const book = await readEpub(file);
  check('书名解析正确', book.meta.title === '测试书籍', book.meta.title);
  check('作者解析正确', book.meta.creator === '张三', book.meta.creator);
  check('章节数为 2', book.chapters.length === 2, String(book.chapters.length));
  check('目录非空', book.toc.length === 2, String(book.toc.length));
  check('章节标题来自目录', book.chapters[0].title.includes('山雨欲来'), book.chapters[0].title);

  console.log('\n[3] EPUB → 各格式导出');
  const opts = { inlineImages: true, includeToc: true, chapterSeparator: '' };
  const txt = buildTxt(book, opts);
  check('TXT 含书名', txt.includes('测试书籍'));
  check('TXT 含正文', txt.includes('这是加粗与 斜体 的示例段落') || txt.includes('加粗'), txt.slice(0, 120));
  check('TXT 含第二章', txt.includes('第二章 长夜将尽'));

  const md = buildMarkdown(book, opts);
  check('Markdown 含一级标题', md.includes('# 测试书籍'));
  check('Markdown 含章节标题', md.includes('## 第一章 山雨欲来'));
  check('Markdown 保留加粗', md.includes('**加粗**'), md.slice(0, 300));
  check('Markdown 保留斜体', md.includes('*斜体*'));
  check('Markdown 保留列表', md.includes('- 列表项一'));
  check('Markdown 保留引用', md.includes('> 这是引用'));
  check('Markdown 保留行内代码', md.includes('`行内代码`'));

  const html = buildSingleHtml(book, opts);
  check('HTML 含书名 h1', html.includes('<h1>测试书籍</h1>'));
  check('HTML 含目录区', html.includes('class="toc"'));
  check('HTML 章节数正确', (html.match(/<section class="chapter"/g) ?? []).length === 2);

  const imagesZip = await buildImagesZip(book);
  check('图片 ZIP 可生成', imagesZip.size > 0);

  console.log('\n[4] 纯文本 → EPUB');
  const textResult = await buildEpub(
    TEXT_SOURCE,
    'text',
    { title: '文本书籍', author: '', language: 'zh-CN', publisher: '', description: '' },
    'auto',
  );
  check('自动识别出 2 章', textResult.chapterCount === 2, String(textResult.chapterCount));
  const textZip = await JSZip.loadAsync(await textResult.blob.arrayBuffer());
  const ch1 = await textZip.file('OEBPS/text/chapter-1.xhtml')!.async('string');
  check('章节含标题 h1', ch1.includes('<h1>第一章 起始</h1>'), ch1.slice(0, 200));
  check('章节含段落', ch1.includes('<p>第一段正文内容。</p>'));
  const ncx = await textZip.file('OEBPS/toc.ncx')!.async('string');
  check('NCX 含 navPoint', ncx.includes('<navPoint id="navPoint-1"'));

  console.log('');
  if (failures > 0) {
    console.error(`冒烟测试失败：${failures} 项未通过`);
    process.exit(1);
  }
  console.log('冒烟测试全部通过');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
