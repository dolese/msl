import type { ReactNode } from 'react';

export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button type="button" className={`chip${active ? ' chip-active' : ''}`} aria-pressed={active} onClick={onClick}>
      {children}
    </button>
  );
}
