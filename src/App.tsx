import { useState } from 'react';
import EpubToOther from './components/EpubToOther';
import TextToEpub from './components/TextToEpub';
import { IconArrowRight, IconBook, IconHelp, IconShield, IconSparkle, IconWand } from './components/icons';

type Tab = 'unpack' | 'pack';

const TABS: { id: Tab; label: string; icon: JSX.Element }[] = [
  { id: 'unpack', label: 'EPUB → TXT / Markdown / HTML', icon: <IconBook /> },
  { id: 'pack', label: 'TXT / Markdown → EPUB', icon: <IconWand /> },
];

const FEATURES = ['无需上传', '无需注册', '支持 EPUB 2 / 3', '离线可用'];

const FAQS: { q: string; a: string }[] = [
  {
    q: '文件会上传到服务器吗？',
    a: '不会。EPUB 的解压、解析、格式转换与打包全部在你的浏览器内完成，页面关闭后数据即消失，全程不产生任何上传请求。',
  },
  {
    q: '支持带 DRM 的电子书吗？',
    a: '不支持。带数字版权保护的文件（如 Adobe DRM、Kindle KFX）无法解析，请先通过合法途径解除保护后再转换。',
  },
  {
    q: '生成的 EPUB 兼容哪些阅读器？',
    a: '输出标准 EPUB 3.0，包含 mimetype、container.xml、content.opf、nav.xhtml 与 toc.ncx，兼容 Apple Books、掌阅、Calibre、Neat Reader 等主流阅读器。',
  },
  {
    q: '转换会丢失排版吗？',
    a: 'Markdown 导出会保留标题层级、列表、引用、表格、粗斜体、行内代码与链接；固定布局（Fixed Layout）与复杂 MathML、SVG 图表会退化为文本或占位。',
  },
  {
    q: 'Markdown 转 EPUB 时如何分章？',
    a: '默认按出现次数最多的标题层级自动判定，也可手动指定按一级标题、二级标题或 --- 分隔线分章，还能整篇作为单章输出。',
  },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('unpack');

  return (
    <div className="app">
      <header className="hero">
        <div className="eyebrow">
          <IconShield />
          文件全程留在你的浏览器里
        </div>
        <h1>
          EPUB <em>转换工具</em>
        </h1>
        <p className="hero-sub">
          在浏览器内完成电子书的解析与打包，不经过任何服务器。支持 EPUB 与 TXT、Markdown、HTML、PDF
          双向互转，打开即用。
        </p>
        <div className="badge-row">
          {FEATURES.map((f) => (
            <span className="badge" key={f}>
              <IconSparkle size={13} />
              {f}
            </span>
          ))}
        </div>
      </header>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            className="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'unpack' ? <EpubToOther /> : <TextToEpub />}

      <section className="card">
        <div className="card-head">
          <span className="icon-chip">
            <IconHelp size={16} />
          </span>
          <h2>常见问题</h2>
        </div>
        <div className="faq">
          {FAQS.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="footer">
        <div>本工具不解密、不移除 DRM；请仅转换你拥有合法权利的电子书。</div>
        <div>
          基于 React + TypeScript + JSZip 构建 · 源码遵循 MIT 许可 ·{' '}
          <a href="https://github.com/danliren831215/epub-converter" target="_blank" rel="noreferrer">
            项目仓库
            <IconArrowRight size={13} />
          </a>
        </div>
      </footer>
    </div>
  );
}
