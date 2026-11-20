import { useState } from 'react';
import { initials } from '@msl/shared';

export function Avatar({ name, size = 36, src, dark }: { name: string; size?: number; src?: string | null; dark?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return <img className="avatar" src={src} alt="" width={size} height={size} style={{ width: size, height: size }} onError={() => setFailed(true)} />;
  }
  return (
    <span className={`avatar${dark ? ' avatar-dark' : ''}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }} aria-hidden>
      {initials(name)}
    </span>
  );
}
