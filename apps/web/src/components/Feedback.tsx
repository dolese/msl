import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, Loader2, type LucideIcon } from 'lucide-react';

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return <div className="loading" role="status"><Loader2 size={20} className="spin" /> {label}</div>;
}

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon size={24} /></div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}

const ICONS = { error: AlertCircle, success: CheckCircle2, info: Info, warning: AlertCircle };
export function Alert({ kind, children }: { kind: keyof typeof ICONS; children: ReactNode }) {
  const Icon = ICONS[kind];
  return <div className={`alert alert-${kind}`} role={kind === 'error' ? 'alert' : 'status'}><Icon size={18} /><div>{children}</div></div>;
}
