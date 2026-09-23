import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import App from '../src/App';

/**
 * 把首屏渲染成静态 HTML 注入 dist/index.html。
 * 纯客户端渲染的 SPA 初始 HTML 是空的，不执行 JS 的爬虫抓不到任何正文，
 * 预渲染可以让搜索引擎直接读到完整的页面内容。
 */
const target = resolve(process.cwd(), 'dist', 'index.html');
const marker = '<div id="root"></div>';
const DEFAULT_SITE = 'https://danliren831215.github.io/epub-converter/';

/** 绑定自定义域名时用 SITE_URL 环境变量整体替换 canonical / og:url / sitemap 里的地址 */
function rewriteSiteUrl(text: string): string {
  const override = process.env.SITE_URL?.trim().replace(/\/+$/, '');
  if (!override) return text;
  const next = `${override}/`;
  if (next === DEFAULT_SITE) return text;
  return text.split(DEFAULT_SITE).join(next);
}

const appHtml = renderToString(React.createElement(App));
let source = readFileSync(target, 'utf8');

if (!source.includes(marker)) {
  console.error('prerender: 未找到 #root 占位节点，已跳过（请先执行 vite build）');
  process.exit(1);
}

source = rewriteSiteUrl(source.replace(marker, `<div id="root">${appHtml}</div>`));
writeFileSync(target, source, 'utf8');

for (const name of ['robots.txt', 'sitemap.xml']) {
  const file = resolve(process.cwd(), 'dist', name);
  writeFileSync(file, rewriteSiteUrl(readFileSync(file, 'utf8')), 'utf8');
}

const size = (Buffer.byteLength(appHtml, 'utf8') / 1024).toFixed(1);
const host = process.env.SITE_URL?.trim() ? process.env.SITE_URL.trim() : DEFAULT_SITE.replace(/\/+$/, '');
console.log(`prerender: 已注入静态首屏 HTML（${size} KB），站点地址 ${host}`);
