import { useMemo, useState, type ReactNode } from 'react';
import Dropzone from './Dropzone';
import { readEpub } from '../lib/epubReader';
import {
  buildImagesZip,
  buildMarkdown,
  buildPrintHtml,
  buildSingleHtml,
  buildTxt,
  openPrintWindow,
} from '../lib/exporters';
import { downloadBlob, safeFileName } from '../lib/utils';
import type { EpubBook, ExportFormat } from '../lib/types';
import {
  IconAlert,
  IconBook,
  IconCheck,
  IconCode,
  IconCopy,
  IconDownload,
  IconFileText,
  IconImage,
  IconList,
  IconMarkdown,
  IconPrinter,
  IconSettings,
  IconUpload,
} from './icons';

const SEPARATORS: { label: string; value: string }[] = [
  { label: '空行', value: '' },
  { label: '分隔线', value: '————' },
];

type ExportKey = ExportFormat | 'images';

export default function EpubToOther() {
  const [book, setBook] = useState<EpubBook | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<ExportKey | null>(null);
  const [inlineImages, setInlineImages] = useState(true);
  const [includeToc, setIncludeToc] = useState(true);
  const [separator, setSeparator] = useState('');
  const [copied, setCopied] = useState(false);

  const options = useMemo(
    () => ({
      inlineImages,
      includeToc,
      chapterSeparator: separator ? `\n\n${separator}\n\n` : '',
    }),
    [inlineImages, includeToc, separator],
  );

  const handleFile = async (file: File) => {
    setError('');
    setLoading(true);
    try {
      setBook(await readEpub(file));
    } catch (e) {
      setBook(null);
      setError(e instanceof Error ? e.message : '读取失败');
    } finally {
      setLoading(false);
    }
  };

  const preview = useMemo(() => {
    if (!book) return '';
    const sample: EpubBook = { ...book, chapters: book.chapters.slice(0, 2) };
    return buildMarkdown(sample, options).slice(0, 3000);
  }, [book, options]);

  const charCount = useMemo(() => {
    if (!book) return 0;
    const text = buildTxt(book, { inlineImages: false, includeToc: false, chapterSeparator: '' });
    return text.replace(/\s+/g, '').length;
  }, [book]);

  const copyPreview = async () => {
    try {
      await navigator.clipboard.writeText(preview);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError('浏览器拒绝了剪贴板访问，请手动选中预览内容复制。');
    }
  };

  const guard = async (key: ExportKey, fn: () => Promise<void> | void) => {
    if (!book) return;
    setBusy(key);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : '导出失败');
    } finally {
      setBusy(null);
    }
  };

  const baseName = book ? safeFileName(book.meta.title) : 'book';

  const exportTxt = () =>
    guard('txt', () => {
      if (!book) return;
      downloadBlob(new Blob([buildTxt(book, options)], { type: 'text/plain;charset=utf-8' }), `${baseName}.txt`);
    });

  const exportMd = () =>
    guard('md', () => {
      if (!book) return;
      downloadBlob(
        new Blob([buildMarkdown(book, options)], { type: 'text/markdown;charset=utf-8' }),
        `${baseName}.md`,
      );
    });

  const exportHtml = () =>
    guard('html', () => {
      if (!book) return;
      downloadBlob(
        new Blob([buildSingleHtml(book, options)], { type: 'text/html;charset=utf-8' }),
        `${baseName}.html`,
      );
    });

  const exportPdf = () =>
    guard('pdf', () => {
      if (!book) return;
      openPrintWindow(buildPrintHtml(book));
    });

  const exportImages = () =>
    guard('images', async () => {
      if (!book) return;
      if (book.assets.size === 0) {
        setError('该 EPUB 中没有找到图片资源');
        return;
      }
      downloadBlob(await buildImagesZip(book), `${baseName}-images.zip`);
    });

  const exportItems: {
    key: ExportKey;
    name: string;
    desc: string;
    icon: ReactNode;
    primary?: boolean;
    run: () => void;
  }[] = [
    {
      key: 'txt',
      name: 'TXT',
      desc: '按 spine 顺序抽取正文，保留段落与章节',
      icon: <IconFileText />,
      primary: true,
      run: exportTxt,
    },
    {
      key: 'md',
      name: 'Markdown',
      desc: '保留标题、列表、引用、粗斜体与链接',
      icon: <IconMarkdown />,
      primary: true,
      run: exportMd,
    },
    {
      key: 'html',
      name: 'HTML 单文件',
      desc: '图片内联为 base64，含目录锚点跳转',
      icon: <IconCode />,
      run: exportHtml,
    },
    {
      key: 'pdf',
      name: 'PDF（打印）',
      desc: '唤起打印对话框，选择「另存为 PDF」',
      icon: <IconPrinter />,
      run: exportPdf,
    },
    {
      key: 'images',
      name: '图片 ZIP',
      desc: '把书内全部插图资源打包导出',
      icon: <IconImage />,
      run: exportImages,
    },
  ];

  return (
    <div>
      <div className="card">
        <div className="card-head">
          <span className="icon-chip">
            <IconUpload size={16} />
          </span>
          <h2>上传 EPUB</h2>
        </div>
        <p className="card-note">
          文件仅在浏览器内解析，不会上传到任何服务器。支持 EPUB 2 / EPUB 3；不支持带 DRM 加密的电子书。
        </p>
        <Dropzone
          accept=".epub,application/epub+zip"
          title="点击选择，或把 .epub 文件拖到这里"
          sub="解析完成后即可选择导出格式"
          hints={['.epub', 'EPUB 2 / 3', '单个文件']}
          onFile={handleFile}
        />
        {error && (
          <div className="alert alert-error">
            <IconAlert />
            <span>{error}</span>
          </div>
        )}
        {!book && !loading && (
          <div className="steps">
            <div className="step">
              <span className="step-n">1</span>
              <div>
                <div className="step-t">选择文件</div>
                <div className="step-d">本地解析，不产生网络请求</div>
              </div>
            </div>
            <div className="step">
              <span className="step-n">2</span>
              <div>
                <div className="step-t">确认内容</div>
                <div className="step-d">核对元信息与章节顺序</div>
              </div>
            </div>
            <div className="step">
              <span className="step-n">3</span>
              <div>
                <div className="step-t">导出格式</div>
                <div className="step-d">TXT / Markdown / HTML / PDF</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="card">
          <div className="loading-card">
            <span className="spinner spinner-dark" />
            正在解析 EPUB…
          </div>
        </div>
      )}

      {book && !loading && (
        <>
          <div className="card">
            <div className="card-head">
              <span className="icon-chip">
                <IconBook size={16} />
              </span>
              <h2>书籍信息</h2>
            </div>
            <div className="stat-grid">
              <div className="stat">
                <div className="stat-v">{book.chapters.length}</div>
                <div className="stat-k">章节</div>
              </div>
              <div className="stat">
                <div className="stat-v">{book.assets.size}</div>
                <div className="stat-k">图片资源</div>
              </div>
              <div className="stat">
                <div className="stat-v">{charCount.toLocaleString('zh-CN')}</div>
                <div className="stat-k">正文字数</div>
              </div>
            </div>
            <dl className="meta-list">
              <div>
                <dt>书名</dt>
                <dd>{book.meta.title}</dd>
              </div>
              <div>
                <dt>作者</dt>
                <dd>{book.meta.creator || '—'}</dd>
              </div>
              <div>
                <dt>语言</dt>
                <dd>{book.meta.language || '—'}</dd>
              </div>
              <div>
                <dt>出版方</dt>
                <dd>{book.meta.publisher || '—'}</dd>
              </div>
            </dl>
          </div>

          <div className="card">
            <div className="card-head">
              <span className="icon-chip">
                <IconList size={16} />
              </span>
              <h2>目录预览</h2>
            </div>
            <p className="card-note">共 {book.chapters.length} 个内容文档，按 spine 顺序排列。</p>
            <div className="chapter-list">
              {book.chapters.map((chapter, i) => (
                <div className="chapter-item" key={`${chapter.fullPath}-${i}`}>
                  <span className="chapter-index">{i + 1}</span>
                  <span>{chapter.title}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <span className="icon-chip">
                <IconSettings size={16} />
              </span>
              <h2>导出设置</h2>
            </div>
            <div className="option-row">
              <label className="switch">
                <input
                  type="checkbox"
                  checked={includeToc}
                  onChange={(e) => setIncludeToc(e.target.checked)}
                />
                在开头插入目录
              </label>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={inlineImages}
                  onChange={(e) => setInlineImages(e.target.checked)}
                />
                Markdown 图片内联为 base64
              </label>
            </div>
            <div className="field" style={{ maxWidth: 260 }}>
              <label htmlFor="sep">章节分隔</label>
              <select id="sep" value={separator} onChange={(e) => setSeparator(e.target.value)}>
                {SEPARATORS.map((s) => (
                  <option key={s.label} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <span className="icon-chip">
                <IconDownload size={16} />
              </span>
              <h2>选择导出格式</h2>
            </div>
            <p className="card-note">
              点击任意一种格式立即生成并下载。PDF 通过浏览器打印对话框输出，可保留目录分页与排版。
            </p>
            <div className="export-grid">
              {exportItems.map((item) => (
                <button
                  key={item.key}
                  className={`export-card${item.primary ? ' is-primary' : ''}`}
                  disabled={busy !== null}
                  onClick={item.run}
                >
                  <span className="export-icon">{item.icon}</span>
                  <span>
                    <span className="export-name">
                      {busy === item.key && <span className="spinner spinner-dark" />}
                      {item.name}
                    </span>
                    <span className="export-desc">{item.desc}</span>
                  </span>
                </button>
              ))}
            </div>
            {error && (
              <div className="alert alert-error">
                <IconAlert />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-head">
              <span className="icon-chip">
                <IconMarkdown size={16} />
              </span>
              <h2>Markdown 预览</h2>
            </div>
            <p className="card-note">仅展示前两个章节的转换结果，用于确认格式是否符合预期。</p>
            <div className="preview-shell">
              <div className="preview-bar">
                <span>
                  <span className="dots">
                    <i />
                    <i />
                    <i />
                  </span>
                  前两章 · Markdown
                </span>
                <button onClick={() => void copyPreview()}>
                  {copied ? <IconCheck size={13} /> : <IconCopy />}
                  {copied ? '已复制' : '复制'}
                </button>
              </div>
              <div className="preview">{preview || '（无内容）'}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
