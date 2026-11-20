import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

export function AppHeader({ title, back, actions }: { title: string; back?: boolean; actions?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <header className="app-header">
      {back ? (
        <button className="btn-icon" onClick={() => navigate(-1)} aria-label="Back">◀</button>
      ) : (
        <span className="logo-sm" aria-hidden>M</span>
      )}
      <h1>{title}</h1>
      <div className="row gap-sm push-right">{actions}</div>
    </header>
  );
}
