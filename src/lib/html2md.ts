import { getCleanBody } from './dom';

export type ImageResolver = (src: string) => string | null;

/** 去除中文字符之间多余的空格 */
export function tidyCjkSpaces(text: string): string {
  const cjk = '\\u4e00-\\u9fff\\u3040-\\u30ff\\u3001-\\u303f\\uff01-\\uff65';
  return text.replace(new RegExp(`([${cjk}])[ \\t]+([${cjk}])`, 'g'), '$1$2');
}

/**
 * 把 XHTML 正文转换为 Markdown。
 * resolveImage 用于把相对图片地址映射为可访问地址；返回 null 表示忽略该图片。
 */
export function htmlToMarkdown(html: string, resolveImage?: ImageResolver): string {
  const body = getCleanBody(html);

  const resolve = (src: string): string | null => {
    if (!src || src.startsWith('data:')) return src || null;
    return resolveImage ? resolveImage(src) : null;
  };

  function collapseText(t: string): string {
    return t.replace(/\s+/g, ' ');
  }

  function esc(t: string): string {
    return t.replace(/([\\`*_{}[\]()#!|])/g, '\\$1');
  }

  function inlineMd(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return esc(collapseText(node.textContent ?? ''));
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as Element;
    const tag = el.localName.toLowerCase();
    const inner = () => Array.from(el.childNodes).map(inlineMd).join('');

    switch (tag) {
      case 'br':
        return '\n';
      case 'strong':
      case 'b': {
        const t = inner().trim();
        return t ? `**${t}**` : '';
      }
      case 'em':
      case 'i': {
        const t = inner().trim();
        return t ? `*${t}*` : '';
      }
      case 'del':
      case 's':
      case 'strike': {
        const t = inner().trim();
        return t ? `~~${t}~~` : '';
      }
      case 'code': {
        const t = (el.textContent ?? '').replace(/`/g, '').trim();
        return t ? '`' + t + '`' : '';
      }
      case 'a': {
        const href = el.getAttribute('href') ?? '';
        const text = inner().trim();
        if (!text) return '';
        if (!href || href.startsWith('#')) return text;
        return `[${text}](${href})`;
      }
      case 'img': {
        const uri = resolve(el.getAttribute('src') ?? '');
        if (!uri) return '';
        return `![${el.getAttribute('alt') ?? ''}](${uri})`;
      }
      case 'p':
      case 'div':
        return inner();
      default:
        return inner();
    }
  }

  function blockChildren(el: Element, depth: number): string {
    return Array.from(el.childNodes)
      .map((n) => blockMd(n, depth))
      .join('');
  }

  function listMd(list: Element, depth: number): string {
    const ordered = list.localName.toLowerCase() === 'ol';
    const start = Number(list.getAttribute('start') ?? '1');
    const items = Array.from(list.children).filter((c) => c.localName.toLowerCase() === 'li');
    const lines: string[] = [];
    items.forEach((li, idx) => {
      const parts = Array.from(li.childNodes)
        .map((n) => blockMd(n, depth + 1))
        .filter((s) => s.trim());
      const body = parts.join('').trim().replace(/\n{2,}/g, '\n');
      const indent = '  '.repeat(depth);
      const marker = ordered ? `${start + idx}. ` : '- ';
      const contIndent = indent + ' '.repeat(marker.length);
      lines.push(indent + marker + body.split('\n').join('\n' + contIndent));
    });
    return lines.join('\n');
  }

  function tableMd(table: Element): string {
    const rows = Array.from(table.getElementsByTagName('tr'));
    if (rows.length === 0) return '';
    const grid = rows.map((tr) =>
      Array.from(tr.children)
        .filter((c) => ['td', 'th'].includes(c.localName.toLowerCase()))
        .map((c) => collapseText(c.textContent ?? '').replace(/\|/g, '\\|')),
    );
    const colCount = grid.reduce((m, r) => Math.max(m, r.length), 0);
    if (colCount === 0) return '';
    for (const r of grid) while (r.length < colCount) r.push('');
    const header = grid[0];
    const lines = [
      '| ' + header.join(' | ') + ' |',
      '| ' + header.map(() => '---').join(' | ') + ' |',
    ];
    for (const r of grid.slice(1)) lines.push('| ' + r.join(' | ') + ' |');
    return lines.join('\n');
  }

  function blockMd(node: Node, depth: number): string {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = collapseText(node.textContent ?? '').trim();
      return t ? esc(t) + '\n\n' : '';
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as Element;
    const tag = el.localName.toLowerCase();

    switch (tag) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6': {
        const text = collapseText(inlineMd(el)).trim();
        return text ? '#'.repeat(Number(tag[1])) + ' ' + text + '\n\n' : '';
      }
      case 'p': {
        const text = inlineMd(el).trim();
        return text ? text + '\n\n' : '';
      }
      case 'br':
        return '\n';
      case 'hr':
        return '\n\n---\n\n';
      case 'ul':
      case 'ol':
        return listMd(el, depth) + '\n\n';
      case 'blockquote': {
        const inner = blockChildren(el, depth).trim();
        return inner
          ? inner
              .split('\n')
              .map((l) => '> ' + l)
              .join('\n') + '\n\n'
          : '';
      }
      case 'pre': {
        const code = el.querySelector('code');
        const text = ((code ?? el).textContent ?? '').replace(/\n+$/, '');
        return '```\n' + text + '\n```\n\n';
      }
      case 'table':
        return tableMd(el) + '\n\n';
      case 'img': {
        const uri = resolve(el.getAttribute('src') ?? '');
        return uri ? `![${el.getAttribute('alt') ?? ''}](${uri})\n\n` : '';
      }
      case 'div':
      case 'section':
      case 'article':
      case 'main':
      case 'aside':
      case 'figure':
      case 'figcaption':
      case 'header':
      case 'footer':
      case 'details':
      case 'summary':
      case 'dl':
      case 'dt':
      case 'dd':
      case 'span':
        return blockChildren(el, depth);
      default: {
        const text = inlineMd(el).trim();
        return text ? text + '\n\n' : blockChildren(el, depth);
      }
    }
  }

  const md = blockChildren(body, 0);
  return tidyCjkSpaces(md.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')).trim() + '\n';
}
