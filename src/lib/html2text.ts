import { getCleanBody } from './dom';

const BLOCK_TAGS = new Set([
  'address', 'article', 'aside', 'blockquote', 'dd', 'details', 'div', 'dl', 'dt',
  'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5',
  'h6', 'header', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'summary',
  'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul', 'caption', 'tr',
]);

/** 把 XHTML 正文转换为纯文本 */
export function htmlToText(html: string): string {
  const body = getCleanBody(html);
  const out: string[] = [];

  const walk = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      out.push((node.textContent ?? '').replace(/[\t\r ]+/g, ' '));
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    const tag = el.localName.toLowerCase();

    if (tag === 'br') {
      out.push('\n');
      return;
    }
    if (tag === 'hr') {
      out.push('\n\n————\n\n');
      return;
    }
    if (tag === 'img') {
      const alt = (el.getAttribute('alt') ?? '').trim();
      out.push(alt ? `\n[图片：${alt}]\n` : '\n[图片]\n');
      return;
    }

    if (tag === 'pre') {
      out.push('\n\n' + (el.textContent ?? '') + '\n\n');
      return;
    }

    const isBlock = BLOCK_TAGS.has(tag);
    if (isBlock) out.push('\n');
    for (const child of Array.from(node.childNodes)) walk(child);
    if (isBlock) out.push('\n');
  };

  for (const child of Array.from(body.childNodes)) walk(child);

  return out
    .join('')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
