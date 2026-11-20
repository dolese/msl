import { useState, type FormEvent } from 'react';
import { XCircle } from 'lucide-react';
import { api, ApiError } from '../api/client';
import { Alert } from './Feedback';
import { Modal } from './Modal';

export function RejectModal({ id, name, onClose, onDone }: { id: string; name: string; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try { await api.reject(id, reason.trim() || undefined); onDone(); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Could not reject the record.'); setBusy(false); }
  }

  return (
    <Modal title={`Reject ${name}?`} description="The record is marked as rejected. Your reason is saved in the audit log." onClose={onClose}>
      <form className="stack" style={{ gap: 16 }} onSubmit={submit}>
        <div className="field">
          <label htmlFor="reason">Reason <span className="muted">(recommended)</span></label>
          <textarea id="reason" className="input" style={{ height: 92, paddingTop: 10, resize: 'vertical' }} maxLength={300} autoFocus
            placeholder="e.g. Photo is unclear, please retake it in daylight." value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        {error && <Alert kind="error">{error}</Alert>}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" disabled={busy}><XCircle size={16} /> {busy ? 'Rejecting…' : 'Reject record'}</button>
        </div>
      </form>
    </Modal>
  );
}
