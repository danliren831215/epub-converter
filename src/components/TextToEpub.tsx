import { useMemo, useRef, useState } from 'react';
import { buildEpub, splitIntoChapters, type BuildMeta, type SourceKind, type SplitMode } from '../lib/epubWriter';
import { downloadBlob, safeFileName } from '../lib/utils';
import {
  IconAlert,
  IconBook,
  IconCheck,
  IconFileText,
  IconList,
  IconSettings,
  IconSparkle,
  IconUpload,
  IconWand,
} from './icons';

const SPLIT_OPTIONS: { label: string; value: SplitMode }[] = [
  { label: '自动识别（按出现最多的标题层级）', value: 'auto' },
  { label: '按一级标题 # 分章', value: 'h1' },
  { label: '按二级标题 ## 分章', value: 'h2' },
  { label: '按分隔线 --- 分章', value: 'separator' },
  { label: '不分章（整篇单章）', value: 'none' },
];

const SAMPLE = `# 第一章 山雨欲来

这是**示例正文**。可以直接清空后粘贴你自己的内容。

- 支持列表
- 支持 *斜体* 与 \`行内代码\`

## 1.1 小节标题

> 引用段落示例。

# 第二章 长夜将尽

第二段正文。`;

export default function TextToEpub() {
  const [source, setSource] = useState(SAMPLE);
  const [kind, setKind] = useState<SourceKind>('markdown');
  const [splitMode, setSplitMode] = useState<SplitMode>('auto');
  const [meta, setMeta] = useState<BuildMeta>({
    title: '我的电子书',
    author: '',
    language: 'zh-CN',
    publisher: '',
    description: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chapters = useMemo(
    () => (source.trim() ? splitIntoChapters(source, kind, splitMode) : []),
    [source, kind, splitMode],
  );

  const totalChars = useMemo(() => source.replace(/\s+/g, '').length, [source]);

  const setField = <K extends keyof BuildMeta>(key: K, value: string) =>
    setMeta((prev) => ({ ...prev, [key]: value }));

  const loadFile = async (file: File) => {
    const text = await file.text();
    setSource(text);
    setKind(/\.(md|markdown|mdown)$/i.test(file.name) ? 'markdown' : 'text');
    if (!meta.title || meta.title === '我的电子书') {
      setField('title', file.name.replace(/\.[^.]+$/, ''));
    }
    setDone('');
  };

  const generate = async () => {
    setError('');
    setDone('');
    setBusy(true);
    try {
      const { blob, chapterCount } = await buildEpub(source, kind, meta, splitMode);
      const fileName = `${safeFileName(meta.title || 'ebook')}.epub`;
      downloadBlob(blob, fileName);
      setDone(`已生成 ${fileName}，共 ${chapterCount} 章，约 ${(blob.size / 1024).toFixed(1)} KB。`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-head">
          <span className="icon-chip">
            <IconFileText size={16} />
          </span>
          <h2>正文内容</h2>
        </div>
        <p className="card-note">
          支持 Markdown 或纯文本。可直接粘贴，也可上传 .md / .txt 文件（上传会自动识别类型与书名）。
        </p>
        <div className="btn-row" style={{ marginBottom: 14 }}>
          <button className="btn" onClick={() => fileInputRef.current?.click()}>
            <IconUpload size={15} />
            上传 .md / .txt
          </button>
          <div className="segmented">
            <button data-active={kind === 'markdown'} onClick={() => setKind('markdown')}>
              Markdown
            </button>
            <button data-active={kind === 'text'} onClick={() => setKind('text')}>
              纯文本
            </button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.markdown,.mdown,.txt,text/plain,text/markdown"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void loadFile(file);
            e.target.value = '';
          }}
        />
        <textarea
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="在此粘贴正文内容…"
          spellCheck={false}
        />
        <div className="textarea-meta">
          <span>识别到 {chapters.length} 章</span>
          <span>
            {totalChars.toLocaleString('zh-CN')} 字 · {source.split('\n').length} 行
          </span>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="icon-chip">
            <IconSettings size={16} />
          </span>
          <h2>书籍元数据</h2>
        </div>
        <p className="card-note">这些字段会写入 EPUB 的 OPF 元数据，阅读器书架中可见。</p>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="title">书名 *</label>
            <input
              id="title"
              type="text"
              value={meta.title}
              onChange={(e) => setField('title', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="author">作者</label>
            <input
              id="author"
              type="text"
              value={meta.author}
              onChange={(e) => setField('author', e.target.value)}
              placeholder="留空则填「佚名」"
            />
          </div>
          <div className="field">
            <label htmlFor="lang">语言</label>
            <input id="lang" type="text" value={meta.language} onChange={(e) => setField('language', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pub">出版方</label>
            <input
              id="pub"
              type="text"
              value={meta.publisher}
              onChange={(e) => setField('publisher', e.target.value)}
            />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="split">分章方式</label>
            <select id="split" value={splitMode} onChange={(e) => setSplitMode(e.target.value as SplitMode)}>
              {SPLIT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="icon-chip">
            <IconList size={16} />
          </span>
          <h2>章节切分预览</h2>
        </div>
        <p className="card-note">章节标题会写入 EPUB 导航目录（nav / NCX），可在阅读器中跳转。</p>
        <div className="chapter-list">
          {chapters.length === 0 && <div className="chapter-item">（暂无内容）</div>}
          {chapters.map((c, i) => (
            <div className="chapter-item" key={i}>
              <span className="chapter-index">{i + 1}</span>
              <span>{c.title || `（无标题，共 ${c.body.length} 字）`}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="icon-chip">
            <IconWand size={16} />
          </span>
          <h2>生成 EPUB</h2>
        </div>
        <p className="card-note">
          输出标准 EPUB 3.0（含 mimetype、container.xml、nav.xhtml、toc.ncx），兼容 Apple Books、掌阅、
          Calibre 等主流阅读器。
        </p>
        <div className="btn-row">
          <button className="btn btn-primary btn-lg" disabled={busy || !source.trim()} onClick={generate}>
            {busy ? <span className="spinner" /> : <IconSparkle size={16} />}
            {busy ? '正在打包…' : '生成并下载 EPUB'}
          </button>
          <button className="btn btn-ghost" disabled={busy} onClick={() => setSource('')}>
            清空正文
          </button>
        </div>
        {error && (
          <div className="alert alert-error">
            <IconAlert />
            <span>{error}</span>
          </div>
        )}
        {done && (
          <div className="alert alert-info">
            <IconCheck />
            <span>{done}</span>
          </div>
        )}
        <div className="badge-row" style={{ marginTop: 16 }}>
          <span className="badge">
            <IconBook size={13} />
            EPUB 3.0
          </span>
          <span className="badge">
            <IconBook size={13} />
            含 nav 与 NCX 双目录
          </span>
          <span className="badge">
            <IconBook size={13} />
            内置阅读样式表
          </span>
        </div>
      </div>
    </div>
  );
}
