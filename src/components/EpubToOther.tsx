import { useMemo, useState } from 'react';
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

const SEPARATORS: { label: string; value: string }[] = [
  { label: '空行', value: '' },
  { label: '分隔线', value: '————' },
];

export default function EpubToOther() {
  const [book, setBook] = useState<EpubBook | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<ExportFormat | 'images' | null>(null);
  const [inlineImages, setInlineImages] = useState(true);
  const [includeToc, setIncludeToc] = useState(true);
  const [separator, setSeparator] = useState('');

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
    const text = buildMarkdown(sample, options);
    return text.slice(0, 3000);
  }, [book, options]);

  const guard = async (key: ExportFormat | 'images', fn: () => Promise<void> | void) => {
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

  return (
    <div>
      <div className="card">
        <h2>上传 EPUB</h2>
        <p className="card-note">
          文件仅在浏览器内解析，不会上传到任何服务器。支持 EPUB 2 / EPUB 3；不支持带 DRM 加密的电子书。
        </p>
        <Dropzone
          accept=".epub,application/epub+zip"
          title="点击选择或拖拽 .epub 文件到此处"
          sub="支持批量逐个转换，解析完成后可选择导出格式"
          onFile={handleFile}
        />
        {error && <div className="alert alert-error">{error}</div>}
      </div>

      {loading && (
        <div className="card">
          <p className="card-note">正在解析 EPUB…</p>
        </div>
      )}

      {book && !loading && (
        <>
          <div className="card">
            <h2>书籍信息</h2>
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
              <div>
                <dt>章节数</dt>
                <dd>{book.chapters.length}</dd>
              </div>
              <div>
                <dt>图片资源</dt>
                <dd>{book.assets.size}</dd>
              </div>
            </dl>
          </div>

          <div className="card">
            <h2>目录预览</h2>
            <p className="card-note">共 {book.chapters.length} 个内容文档，按 spine 顺序排列。</p>
            <div className="chapter-list">
              {book.chapters.map((chapter, i) => (
                <div className="chapter-item" key={`${chapter.fullPath}-${i}`}>
                  <span className="chapter-index">{i + 1}.</span>
                  <span>{chapter.title}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>导出设置</h2>
            <div className="btn-row" style={{ marginTop: 0, marginBottom: 14 }}>
              <label className="checkbox">
                <input type="checkbox" checked={includeToc} onChange={(e) => setIncludeToc(e.target.checked)} />
                在开头插入目录
              </label>
              <label className="checkbox">
                <input type="checkbox" checked={inlineImages} onChange={(e) => setInlineImages(e.target.checked)} />
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
            <h2>导出</h2>
            <p className="card-note">
              PDF 通过浏览器打印对话框生成（选择「另存为 PDF」），可保留目录分页与排版。
            </p>
            <div className="btn-row">
              <button className="btn btn-primary" disabled={busy !== null} onClick={exportTxt}>
                {busy === 'txt' && <span className="spinner" />}导出 TXT
              </button>
              <button className="btn btn-primary" disabled={busy !== null} onClick={exportMd}>
                {busy === 'md' && <span className="spinner" />}导出 Markdown
              </button>
              <button className="btn" disabled={busy !== null} onClick={exportHtml}>
                {busy === 'html' && <span className="spinner" />}导出 HTML（单文件）
              </button>
              <button className="btn" disabled={busy !== null} onClick={exportPdf}>
                {busy === 'pdf' && <span className="spinner" />}导出 PDF（打印）
              </button>
              <button className="btn" disabled={busy !== null} onClick={exportImages}>
                {busy === 'images' && <span className="spinner" />}提取图片 ZIP
              </button>
            </div>
          </div>

          <div className="card">
            <h2>Markdown 预览</h2>
            <p className="card-note">仅展示前两个章节的转换结果，用于确认格式是否符合预期。</p>
            <div className="preview">{preview || '（无内容）'}</div>
          </div>
        </>
      )}
    </div>
  );
}
