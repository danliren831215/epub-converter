import JSZip from 'jszip';
import type { EpubAsset, EpubBook, EpubChapter, EpubMeta, TocEntry } from './types';
import { decodeText, guessMediaType, resolvePath } from './utils';
import { parseHtml } from './dom';

const DC_HINT = 'purl.org/dc';

function parseXml(text: string): Document | null {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) return null;
  return doc;
}

function clean(s: string | null | undefined): string {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}

function childrenByLocalName(parent: Element, local: string): Element[] {
  return Array.from(parent.getElementsByTagName('*')).filter((el) => el.localName === local);
}

function findByLocalName(parent: Element, local: string): Element | null {
  const all = parent.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    if (all[i].localName === local) return all[i];
  }
  return null;
}

function dirname(path: string): string {
  const i = path.lastIndexOf('/');
  return i === -1 ? '' : path.slice(0, i);
}

function dirOfOpf(opfPath: string): string {
  return dirname(opfPath);
}

/** 读取 Dublin Core 元数据字段 */
function dcValue(metadata: Element | null, local: string): string {
  if (!metadata) return '';
  const all = metadata.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    const el = all[i];
    if (el.localName !== local) continue;
    const ns = el.namespaceURI ?? '';
    if (ns && !ns.includes(DC_HINT) && !ns.includes('openebook')) continue;
    const text = clean(el.textContent);
    if (text) return text;
  }
  return '';
}

/** 读取 <meta name="..." content="..."> 形式的旧版元数据 */
function opfMetaContent(metadata: Element | null, name: string): string {
  if (!metadata) return '';
  for (const el of childrenByLocalName(metadata, 'meta')) {
    if ((el.getAttribute('name') ?? '').toLowerCase() === name.toLowerCase()) {
      return clean(el.getAttribute('content'));
    }
  }
  return '';
}

function parseContainer(xml: string): string {
  const doc = parseXml(xml);
  if (!doc) throw new Error('META-INF/container.xml 解析失败');
  let rootfile: Element | null = null;
  const candidates = childrenByLocalName(doc.documentElement, 'rootfile');
  for (const rf of candidates) {
    if ((rf.getAttribute('media-type') ?? '').includes('oebps-package')) {
      rootfile = rf;
      break;
    }
  }
  rootfile = rootfile ?? candidates[0] ?? null;
  const fullPath = rootfile?.getAttribute('full-path');
  if (!fullPath) throw new Error('container.xml 中未找到 OPF 文件路径');
  return fullPath;
}

interface ManifestItem {
  id: string;
  href: string;
  mediaType: string;
  properties: string;
  fullPath: string;
}

function parseOpf(opfXml: string, opfPath: string) {
  const doc = parseXml(opfXml);
  if (!doc) throw new Error('OPF 文件解析失败（不是合法的 XML）');
  const pkg = doc.documentElement;
  const opfDir = dirOfOpf(opfPath);
  const metadata = findByLocalName(pkg, 'metadata');

  const meta: EpubMeta = {
    title: dcValue(metadata, 'title') || opfMetaContent(metadata, 'title'),
    creator:
      dcValue(metadata, 'creator') ||
      opfMetaContent(metadata, 'author') ||
      opfMetaContent(metadata, 'creator'),
    language: dcValue(metadata, 'language') || 'zh-CN',
    publisher: dcValue(metadata, 'publisher') || opfMetaContent(metadata, 'publisher'),
    identifier: dcValue(metadata, 'identifier') || opfMetaContent(metadata, 'identifier'),
    description: dcValue(metadata, 'description') || opfMetaContent(metadata, 'description'),
    date: dcValue(metadata, 'date') || opfMetaContent(metadata, 'date'),
  };

  const manifestEl = findByLocalName(pkg, 'manifest');
  const items: ManifestItem[] = [];
  if (manifestEl) {
    for (const el of childrenByLocalName(manifestEl, 'item')) {
      const href = el.getAttribute('href') ?? '';
      if (!href) continue;
      items.push({
        id: el.getAttribute('id') ?? '',
        href: decodeURIComponent(href),
        mediaType: (el.getAttribute('media-type') ?? guessMediaType(href)).toLowerCase(),
        properties: el.getAttribute('properties') ?? '',
        fullPath: resolvePath(opfDir, decodeURIComponent(href)),
      });
    }
  }

  const spineEl = findByLocalName(pkg, 'spine');
  const spineIds: { idref: string; linear: boolean }[] = [];
  let tocIdref = '';
  if (spineEl) {
    tocIdref = spineEl.getAttribute('toc') ?? '';
    for (const el of childrenByLocalName(spineEl, 'itemref')) {
      const idref = el.getAttribute('idref') ?? '';
      if (!idref) continue;
      spineIds.push({ idref, linear: (el.getAttribute('linear') ?? 'yes') !== 'no' });
    }
  }

  return { meta, items, spineIds, tocIdref, opfDir };
}

function parseOl(ol: Element, baseDir: string): TocEntry[] {
  const out: TocEntry[] = [];
  for (const li of Array.from(ol.children)) {
    if (li.localName.toLowerCase() !== 'li') continue;
    const anchors = li.getElementsByTagName('a');
    const a = anchors.length > 0 ? anchors[0] : null;
    const title = clean(a?.textContent ?? li.textContent);
    const rawHref = a?.getAttribute('href') ?? '';
    const href = rawHref ? resolvePath(baseDir, decodeURIComponent(rawHref)) : '';
    const nested = Array.from(li.children).find((c) => c.localName.toLowerCase() === 'ol');
    out.push({ title, href, children: nested ? parseOl(nested, baseDir) : [] });
  }
  return out;
}

/** EPUB 3 的 nav.xhtml */
function parseNavXhtml(html: string, navPath: string): TocEntry[] {
  const doc = parseHtml(html);
  const navs = Array.from(doc.querySelectorAll('nav'));
  const nav =
    navs.find((n) => {
      const t = n.getAttribute('epub:type') ?? n.getAttributeNS('http://www.idpf.org/2007/ops', 'type');
      return (t ?? '').split(/\s+/).includes('toc');
    }) ?? navs[0];
  if (!nav) return [];
  const ol = nav.querySelector('ol');
  return ol ? parseOl(ol, dirname(navPath)) : [];
}

/** EPUB 2 的 NCX */
function parseNcx(xml: string, ncxPath: string): TocEntry[] {
  const doc = parseXml(xml);
  if (!doc) return [];
  const navMap = findByLocalName(doc.documentElement, 'navMap');
  if (!navMap) return [];
  const baseDir = dirname(ncxPath);

  const walk = (parent: Element): TocEntry[] => {
    const result: TocEntry[] = [];
    for (const np of childrenByLocalName(parent, 'navPoint')) {
      const label = findByLocalName(np, 'navLabel');
      const text = findByLocalName(label ?? np, 'text');
      const content = findByLocalName(np, 'content');
      const src = content?.getAttribute('src') ?? '';
      result.push({
        title: clean(text?.textContent),
        href: src ? resolvePath(baseDir, decodeURIComponent(src)) : '',
        children: walk(np),
      });
    }
    return result;
  };

  return walk(navMap);
}

/** 从章节 HTML 中猜测标题 */
function guessChapterTitle(html: string, fallback: string): string {
  const doc = parseHtml(html);
  for (const sel of ['h1', 'h2', 'h3', 'title']) {
    const el = doc.querySelector(sel);
    const t = clean(el?.textContent);
    if (t && t.length <= 120) return t;
  }
  return fallback;
}

function flattenToc(entries: TocEntry[]): TocEntry[] {
  const out: TocEntry[] = [];
  const walk = (list: TocEntry[]) => {
    for (const e of list) {
      out.push(e);
      walk(e.children);
    }
  };
  walk(entries);
  return out;
}

export async function readEpub(file: File): Promise<EpubBook> {
  const buffer = await file.arrayBuffer();
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new Error('无法解压该文件，请确认是未损坏的 EPUB（本质为 ZIP 包）');
  }

  const containerFile = zip.file('META-INF/container.xml');
  if (!containerFile) {
    throw new Error('缺少 META-INF/container.xml，不是有效的 EPUB 文件');
  }
  const opfPath = parseContainer(await containerFile.async('string'));

  const opfFile = zip.file(opfPath);
  if (!opfFile) throw new Error(`container.xml 指向的 OPF 文件不存在：${opfPath}`);
  const { meta, items, spineIds, tocIdref, opfDir } = parseOpf(await opfFile.async('string'), opfPath);

  const itemById = new Map(items.map((i) => [i.id, i]));
  const contentTypes = [
    'application/xhtml+xml',
    'text/html',
    'application/x-dtbook+xml',
    'text/x-oeb1-document',
  ];

  // 1. 读取正文（按 spine 顺序）
  const chapters: EpubChapter[] = [];
  for (const { idref, linear } of spineIds) {
    const item = itemById.get(idref);
    if (!item || !contentTypes.includes(item.mediaType)) continue;
    const entry = zip.file(item.fullPath);
    if (!entry) continue;
    const raw = await entry.async('uint8array');
    chapters.push({
      id: item.id || item.href,
      href: item.href,
      fullPath: item.fullPath,
      title: guessChapterTitle(decodeText(raw), item.id || item.href),
      html: decodeText(raw),
      linear,
    });
  }

  if (chapters.length === 0) {
    throw new Error('未能从 spine 中读取到任何正文文档，该 EPUB 可能已加密（DRM）或结构异常');
  }

  // 2. 读取图片资源
  const assets = new Map<string, EpubAsset>();
  const imageItems = items.filter((i) => i.mediaType.startsWith('image/'));
  await Promise.all(
    imageItems.map(async (item) => {
      const entry = zip.file(item.fullPath);
      if (!entry) return;
      try {
        const data = await entry.async('uint8array');
        assets.set(item.fullPath, {
          fullPath: item.fullPath,
          href: item.href,
          mediaType: item.mediaType,
          data,
        });
      } catch {
        /* 忽略损坏的单张图片 */
      }
    }),
  );

  // 3. 解析目录：优先 EPUB3 nav，其次 NCX
  let toc: TocEntry[] = [];
  const navItem = items.find((i) => i.properties.split(/\s+/).includes('nav'));
  if (navItem) {
    const entry = zip.file(navItem.fullPath);
    if (entry) toc = parseNavXhtml(await entry.async('string'), navItem.fullPath);
  }
  if (toc.length === 0 && tocIdref) {
    const ncxItem = itemById.get(tocIdref);
    if (ncxItem) {
      const entry = zip.file(ncxItem.fullPath);
      if (entry) toc = parseNcx(await entry.async('string'), ncxItem.fullPath);
    }
  }

  // 4. 用目录标题覆盖自动猜测的章节标题
  if (toc.length > 0) {
    const flat = flattenToc(toc);
    for (const chapter of chapters) {
      const hit = flat.find((e) => e.href && e.href.split('#')[0] === chapter.fullPath && e.title);
      if (hit) chapter.title = hit.title;
    }
  }

  return {
    fileName: file.name,
    meta: {
      title: meta.title || file.name.replace(/\.epub$/i, ''),
      creator: meta.creator,
      language: meta.language,
      publisher: meta.publisher,
      identifier: meta.identifier,
      description: meta.description,
      date: meta.date,
    },
    opfDir,
    chapters,
    assets,
    toc,
  };
}
