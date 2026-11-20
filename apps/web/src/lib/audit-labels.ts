import type { AuditAction, AuditEventDTO } from '@msl/shared';
import { shortName } from './format';

type Tone = 'green' | 'amber' | 'blue' | 'red';
const META: Record<AuditAction, { verb: string; icon: string; tone: Tone }> = {
  'auth.sign_in': { verb: 'signed in', icon: '→', tone: 'blue' },
  'auth.sign_in_failed': { verb: 'failed to sign in', icon: '!', tone: 'red' },
  'auth.sign_out': { verb: 'signed out', icon: '←', tone: 'blue' },
  'auth.account_locked': { verb: 'account locked', icon: '🔒', tone: 'red' },
  'record.created': { verb: 'created record', icon: '+', tone: 'green' },
  'record.updated': { verb: 'edited record', icon: '✏', tone: 'blue' },
  'record.verified': { verb: 'set status to verified', icon: '✓', tone: 'green' },
  'record.id_revealed': { verb: 'revealed ID number', icon: '👁', tone: 'amber' },
  'record.photo_downloaded': { verb: 'downloaded photo', icon: '⬇', tone: 'amber' },
  'record.exported': { verb: 'exported records', icon: '⬇', tone: 'green' },
  'share.created': { verb: 'created share link', icon: '🔗', tone: 'green' },
  'share.viewed': { verb: 'share link opened', icon: '👁', tone: 'blue' },
  'user.invited': { verb: 'invited user', icon: '+', tone: 'green' },
  'user.role_changed': { verb: 'changed role', icon: '⇄', tone: 'amber' },
};

export function describeEvent(e: AuditEventDTO) {
  const m = META[e.action];
  const who = e.actor ? shortName(e.actor.name) : 'System:';
  const subtitle = [e.targetLabel, e.detail].filter(Boolean).join(' — ') || (e.ip ? `IP: ${e.ip}` : '');
  return {
    title: `${who} ${m.verb}`,
    subtitle,
    icon: m.icon,
    tone: m.tone,
  };
}
