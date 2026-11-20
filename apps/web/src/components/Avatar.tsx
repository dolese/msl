import { useState } from 'react';
import { initials } from '@msl/shared';

export function Avatar({ name, size = 36, src }: { name: string; size?: number; src?: string | null }) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? (
    <img className="avatar" src={src} alt="" width={size} height={size} onError={() => setFailed(true)} />
  ) : (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.32 }} aria-hidden>
      {initials(name)}
    </span>
  );
}
