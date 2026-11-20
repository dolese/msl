import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

/** Password field with a show/hide eye button. */
export function PasswordInput({ withIcon, ...props }: InputHTMLAttributes<HTMLInputElement> & { withIcon?: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={`input-icon has-toggle${withIcon ? '' : ' no-lead'}`}>
      {withIcon && <Lock size={18} />}
      <input {...props} className="input" type={visible ? 'text' : 'password'} />
      <button
        type="button"
        className="input-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        title={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
