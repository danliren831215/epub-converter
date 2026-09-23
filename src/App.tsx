import { useState } from 'react';
import EpubToOther from './components/EpubToOther';
import TextToEpub from './components/TextToEpub';
import { IconArrowRight, IconBook, IconShield, IconSparkle, IconWand } from './components/icons';

type Tab = 'unpack' | 'pack';

const TABS: { id: Tab; label: string; icon: JSX.Element }[] = [
  { id: 'unpack', label: 'EPUB → TXT / Markdown / HTML', icon: <IconBook /> },
  { id: 'pack', label: 'TXT / Markdown → EPUB', icon: <IconWand /> },
];

const FEATURES = ['无需上传', '无需注册', '支持 EPUB 2 / 3', '离线可用'];

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
