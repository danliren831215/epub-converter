/** 共享的 DOM 辅助函数 */

export function parseHtml(text: string): Document {
  return new DOMParser().parseFromString(text, 'text/html');
}

const NOISE_TAGS = ['script', 'style', 'link', 'meta', 'head', 'noscript', 'iframe', 'object', 'embed'];

/** 移除脚本、样式等无意义节点 */
export function removeNoise(root: Element): void {
  for (const tag of NOISE_TAGS) {
    for (const el of Array.from(root.getElementsByTagName(tag))) {
      el.remove();
    }
  }
}

/** 取出 body，并清理噪声节点 */
export function getCleanBody(html: string): Element {
  const doc = parseHtml(html);
  const body = doc.body ?? doc.documentElement;
  removeNoise(body);
  return body;
}

/** 合并连续空白字符 */
export function collapse(text: string): string {
  return text.replace(/[\t\r\n ]+/g, ' ').trim();
}

/** 判断是否为块级元素 */
export function isBlockElement(el: Element): boolean {
  const tag = el.localName.toLowerCase();
  if (tag === 'br' || tag === 'img' || tag === 'hr') return false;
  const inline = new Set([
    'a', 'abbr', 'b', 'bdi', 'bdo', 'cite', 'code', 'data', 'dfn', 'em', 'i', 'kbd',
    'mark', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'small', 'span', 'strong', 'sub',
    'sup', 'time', 'u', 'var', 'wbr', 'font', 'tt', 'big', 'strike', 'ins', 'del',
  ]);
  return !inline.has(tag);
}
