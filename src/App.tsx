import { useState } from 'react';
import EpubToOther from './components/EpubToOther';
import TextToEpub from './components/TextToEpub';

type Tab = 'unpack' | 'pack';

const TABS: { id: Tab; label: string }[] = [
  { id: 'unpack', label: 'EPUB → TXT / Markdown / HTML / PDF' },
  { id: 'pack', label: 'TXT / Markdown → EPUB' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('unpack');

  return (
    <div className="app">
      <header className="masthead">
        <h1>EPUB 转换工具</h1>
        <p>纯前端电子书格式互转，所有解析与打包都在浏览器内完成，文件不会离开你的电脑。</p>
        <div className="badge-row">
          <span className="badge">无需上传</span>
          <span className="badge">无需注册</span>
          <span className="badge">支持 EPUB 2 / 3</span>
          <span className="badge">离线可用</span>
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
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'unpack' ? <EpubToOther /> : <TextToEpub />}

      <footer className="footer">
        <div>本工具不解密、不移除 DRM；请仅转换你拥有合法权利的电子书。</div>
        <div>
          基于 React + TypeScript + JSZip 构建 · 源码遵循 MIT 许可 ·{' '}
          <a href="https://github.com/" target="_blank" rel="noreferrer">
            项目仓库
          </a>
        </div>
      </footer>
    </div>
  );
}
