import { useState, type ReactNode } from 'react';
import { Avatar } from './Avatar';

/**
 * Shows the whole photo (portrait or landscape) without cropping, over a blurred copy
 * of itself. Tapping the photo opens the original in a new tab.
 */
export function PhotoFrame({ src, name, children }: { src: string | null; name: string; children?: ReactNode }) {
  const [failed, setFailed] = useState(false);
  const show = !!src && !failed;
  return (
    <div className={`profile-photo${show ? ' has-img' : ''}`}>
      {show ? (
        <>
          <img className="photo-backdrop" src={src} alt="" aria-hidden />
          <a className="photo-link" href={src} target="_blank" rel="noopener" title="Open full size">
            <img className="photo-main" src={src} alt={`Photo of ${name}`} onError={() => setFailed(true)} />
          </a>
        </>
      ) : (
        <Avatar name={name} size={112} />
      )}
      {show && children}
    </div>
  );
}
