interface IconProps {
  size?: number;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export function IconShield({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M12 3l7 3v6c0 4.2-2.8 7.5-7 9-4.2-1.5-7-4.8-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function IconUpload({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M12 16V4" />
      <path d="M7.5 8.5L12 4l4.5 4.5" />
      <path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
    </svg>
  );
}

export function IconBook({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4 5.5A2.5 2.5 0 016.5 3H19v15H6.5A2.5 2.5 0 004 20.5V5.5z" />
      <path d="M4 18.5A2.5 2.5 0 016.5 21H19" />
      <path d="M9 7.5h7" />
    </svg>
  );
}

export function IconList({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M8 6h12" />
      <path d="M8 12h12" />
      <path d="M8 18h12" />
      <path d="M4 6h.01" />
      <path d="M4 12h.01" />
      <path d="M4 18h.01" />
    </svg>
  );
}

export function IconSettings({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 01-2.8 2.8l-.1-.1a1.6 1.6 0 00-2.7 1.1V21a2 2 0 01-4 0v-.1A1.6 1.6 0 007.5 19.4l-.1.1a2 2 0 01-2.8-2.8l.1-.1A1.6 1.6 0 003 15a2 2 0 010-4h.1A1.6 1.6 0 004.6 8.5l-.1-.1a2 2 0 012.8-2.8l.1.1A1.6 1.6 0 0010 4.6V4a2 2 0 014 0v.1a1.6 1.6 0 002.7 1.1l.1-.1a2 2 0 012.8 2.8l-.1.1A1.6 1.6 0 0020 11h.1a2 2 0 010 4H20z" />
    </svg>
  );
}

export function IconDownload({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M12 4v11" />
      <path d="M7.5 10.5L12 15l4.5-4.5" />
      <path d="M4 19h16" />
    </svg>
  );
}

export function IconFileText({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </svg>
  );
}

export function IconMarkdown({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
      <path d="M6 15V9l3 3 3-3v6" />
      <path d="M16 9v6" />
      <path d="M16 12l2.5-2.5" />
      <path d="M16 12l2.5 2.5" />
    </svg>
  );
}

export function IconCode({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M8.5 8L5 12l3.5 4" />
      <path d="M15.5 8L19 12l-3.5 4" />
      <path d="M13.5 6l-3 12" />
    </svg>
  );
}

export function IconPrinter({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M7 9V4h10v5" />
      <path d="M7 18H5a2 2 0 01-2-2v-4a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2h-2" />
      <rect x="7" y="14" width="10" height="6" rx="1.5" />
    </svg>
  );
}

export function IconImage({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <circle cx="8.5" cy="10" r="1.6" />
      <path d="M4 17l4.5-4.5L13 17" />
      <path d="M14 14l2.5-2.5L20 15" />
    </svg>
  );
}

export function IconSparkle({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M12 3l1.8 4.9L19 9.7l-5.2 1.8L12 16.4l-1.8-4.9L5 9.7l5.2-1.8L12 3z" />
      <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z" />
    </svg>
  );
}

export function IconAlert({ size = 15 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4.5" />
      <path d="M12 16h.01" />
    </svg>
  );
}

export function IconCheck({ size = 15 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </svg>
  );
}

export function IconCopy({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M15 6.5V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7a2 2 0 002 2h.5" />
    </svg>
  );
}

export function IconArrowRight({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M5 12h13" />
      <path d="M13 6.5L18.5 12 13 17.5" />
    </svg>
  );
}

export function IconWand({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4 20l9-9" />
      <path d="M14.5 4.5l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5z" />
      <path d="M19 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8z" />
    </svg>
  );
}
