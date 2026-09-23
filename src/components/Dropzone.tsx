import { useRef, useState, type DragEvent } from 'react';
import { IconUpload } from './icons';

interface DropzoneProps {
  accept: string;
  title: string;
  sub: string;
  hints?: string[];
  onFile: (file: File) => void;
}

export default function Dropzone({ accept, title, sub, hints = [], onFile }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  return (
    <div
      className={`dropzone${over ? ' is-over' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
    >
      <div className="dropzone-icon">
        <IconUpload />
      </div>
      <div className="dropzone-title">{title}</div>
      <div className="dropzone-sub">{sub}</div>
      {hints.length > 0 && (
        <div className="dropzone-hint">
          {hints.map((h) => (
            <span key={h}>{h}</span>
          ))}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
