import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import App from '../src/App';

/**
 * 用 jsdom 加载构建产物并对预渲染的 HTML 做一次 hydrate，
 * 确认没有 React 的 hydration 不匹配警告。
 */
const dom = new JSDOM(readFileSync('dist/index.html', 'utf8'), {
  url: 'https://danliren831215.github.io/epub-converter/',
  pretendToBeVisual: true,
});

const g = globalThis as unknown as Record<string, unknown>;
g.window = dom.window;
g.document = dom.window.document;
g.MessageChannel = (dom.window as unknown as Record<string, unknown>).MessageChannel;

const messages: string[] = [];
const originalError = console.error;
console.error = (...args: unknown[]) => {
  messages.push(args.map((a) => String(a)).join(' '));
};

const container = dom.window.document.getElementById('root')!;
hydrateRoot(container, React.createElement(React.StrictMode, null, React.createElement(App)));

setTimeout(() => {
  console.error = originalError;
  if (messages.length > 0) {
    console.log('hydration 存在警告：');
    for (const m of messages) console.log('  - ' + m.slice(0, 300));
    process.exit(1);
  }
  console.log('hydration 检查通过：预渲染 HTML 与客户端渲染一致，无 React 警告');
}, 500);
