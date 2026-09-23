/** 解码 ZIP 内条目为 UTF-8 文本，自动处理 BOM */
export function decodeText(data: Uint8Array): string {
  if (data.length >= 3 && data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(data.subarray(3));
  }
  return new TextDecoder('utf-8').decode(data);
}

/** 拼接 ZIP 内路径：以 OPF 目录为基准解析相对引用 */
export function resolvePath(baseDir: string, relative: string): string {
  const clean = relative.split('#')[0].split('?')[0];
  const base = baseDir ? baseDir.split('/').filter(Boolean) : [];
  const parts = clean.split('/');
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') base.pop();
    else base.push(part);
  }
  return base.join('/');
}

/** 依据扩展名推断 media-type */
export function guessMediaType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    xhtml: 'application/xhtml+xml',
    html: 'text/html',
    htm: 'text/html',
    css: 'text/css',
    txt: 'text/plain',
    xml: 'application/xml',
    opf: 'application/oebps-package+xml',
    ncx: 'application/x-dtbncx+xml',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    otf: 'font/otf',
    ttf: 'font/ttf',
    woff: 'font/woff',
    woff2: 'font/woff2',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    js: 'text/javascript',
    json: 'application/json',
  };
  return map[ext] ?? 'application/octet-stream';
}

/** 推断图片具体类型，失败时回退 png */
export function guessImageType(data: Uint8Array, path: string): string {
  if (data.length >= 8 && data[0] === 0x89 && data[1] === 0x50) return 'image/png';
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8) return 'image/jpeg';
  if (data.length >= 6 && data[0] === 0x47 && data[1] === 0x49) return 'image/gif';
  if (data.length >= 12 && data[8] === 0x57 && data[9] === 0x45) return 'image/webp';
  return guessMediaType(path);
}

/** Uint8Array → base64（分块处理，避免大数组栈溢出） */
export function toBase64(data: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < data.length; i += chunk) {
    binary += String.fromCharCode(...data.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** 去除文件名中的非法字符 */
export function safeFileName(name: string): string {
  return (
    name
      .replace(/[\\/:*?"<>|\r\n\t]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120) || 'output'
  );
}

/** 触发浏览器下载 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** 规范化空白：合并连续空格与空行 */
export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** dcterms:modified 需要的时间格式 */
export function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
