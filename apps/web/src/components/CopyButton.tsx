import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

/** Copies text to the clipboard and briefly shows a tick. */
export function CopyButton({ value, label = 'Copy', compact, text = 'Copy' }: { value: string; label?: string; compact?: boolean; text?: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Fallback for older phone browsers without the Clipboard API
      const t = document.createElement('textarea'); t.value = value; document.body.appendChild(t); t.select();
      document.execCommand('copy'); t.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 1600);
  }
  return (
    <button type="button" className={`btn btn-secondary btn-sm copy-btn${done ? ' copied' : ''}${text !== 'Copy' ? ' keep-text' : ''}`} onClick={copy}
      aria-label={done ? 'Copied' : `${label}`} title={label}>
      {done ? <Check size={14} /> : <Copy size={14} />}{!compact && <span>{done ? 'Copied' : text}</span>}
    </button>
  );
}
