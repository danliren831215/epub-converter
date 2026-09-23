/** 书籍元数据（Dublin Core 子集） */
export interface EpubMeta {
  title: string;
  creator: string;
  language: string;
  publisher: string;
  identifier: string;
  description: string;
  date: string;
}

/** 目录项 */
export interface TocEntry {
  title: string;
  /** 相对 OPF 所在目录的路径（可能带 fragment） */
  href: string;
  children: TocEntry[];
}

/** spine 中的一个内容文档 */
export interface EpubChapter {
  id: string;
  /** 相对 OPF 所在目录的路径 */
  href: string;
  /** ZIP 包内完整路径 */
  fullPath: string;
  title: string;
  html: string;
  linear: boolean;
}

/** 二进制资源（图片 / 字体 / 样式表等） */
export interface EpubAsset {
  /** ZIP 包内完整路径 */
  fullPath: string;
  /** 相对 OPF 所在目录的路径 */
  href: string;
  mediaType: string;
  data: Uint8Array;
}

/** 解析完成的 EPUB */
export interface EpubBook {
  fileName: string;
  meta: EpubMeta;
  /** OPF 文件所在目录，如 "OEBPS" */
  opfDir: string;
  chapters: EpubChapter[];
  /** key 为相对 OPF 目录的路径 */
  assets: Map<string, EpubAsset>;
  toc: TocEntry[];
}

export type ExportFormat = 'txt' | 'md' | 'html' | 'pdf';
