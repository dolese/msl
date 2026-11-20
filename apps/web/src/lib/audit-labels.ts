import {
  ArrowDownToLine, CheckCircle2, Eye, FilePlus2, KeyRound, Link2, Lock, LogIn, LogOut, Pencil, ShieldAlert,
  UserCog, UserPlus, XCircle, type LucideIcon,
} from 'lucide-react';
import type { AuditAction, AuditEventDTO } from '@msl/shared';
import { shortName } from './format';

type Tone = 'success' | 'warning' | 'info' | 'danger' | 'primary' | 'neutral';
const META: Record<AuditAction, { verb: string; icon: LucideIcon; tone: Tone }> = {
  'auth.sign_in': { verb: 'signed in', icon: LogIn, tone: 'info' },
  'auth.sign_in_failed': { verb: 'failed to sign in', icon: ShieldAlert, tone: 'danger' },
  'auth.sign_out': { verb: 'signed out', icon: LogOut, tone: 'neutral' },
  'auth.account_locked': { verb: 'account locked', icon: Lock, tone: 'danger' },
  'record.created': { verb: 'registered a person', icon: FilePlus2, tone: 'success' },
  'record.updated': { verb: 'edited a record', icon: Pencil, tone: 'info' },
  'record.verified': { verb: 'verified a record', icon: CheckCircle2, tone: 'success' },
  'record.rejected': { verb: 'rejected a record', icon: XCircle, tone: 'danger' },
  'record.id_revealed': { verb: 'revealed an ID number', icon: Eye, tone: 'warning' },
  'record.photo_downloaded': { verb: 'downloaded a photo', icon: ArrowDownToLine, tone: 'warning' },
  'record.exported': { verb: 'exported records', icon: ArrowDownToLine, tone: 'primary' },
  'share.created': { verb: 'created a share link', icon: Link2, tone: 'primary' },
  'share.viewed': { verb: 'Share link opened', icon: Eye, tone: 'neutral' },
  'user.invited': { verb: 'added a user', icon: UserPlus, tone: 'success' },
  'user.role_changed': { verb: 'changed a role', icon: UserCog, tone: 'warning' },
  'user.password_changed': { verb: 'changed password', icon: KeyRound, tone: 'info' },
  'user.password_reset': { verb: 'reset a password', icon: KeyRound, tone: 'warning' },
};

export function describeEvent(e: AuditEventDTO) {
  const m = META[e.action];
  const who = e.actor && shortName(e.actor.name);
  const title = who ? `${who} ${m.verb}` : m.verb.charAt(0).toUpperCase() + m.verb.slice(1);
  const subtitle = [e.targetLabel, e.detail].filter(Boolean).join(' · ');
  return { title, subtitle, icon: m.icon, tone: m.tone };
}
