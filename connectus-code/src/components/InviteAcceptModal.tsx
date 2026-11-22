import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { CheckCircle2, KeyRound, Loader2, ShieldCheck, X } from 'lucide-react';
import type { College, OfficialInvite, StudentProfile } from '../types';

interface InviteAcceptModalProps {
  open: boolean;
  initialTokenOrCode: string;
  firebaseUser: User | null;
  student: StudentProfile | null;
  onClose: () => void;
  onLookupInvite: (tokenOrCode: string) => Promise<{ invite: OfficialInvite; college: College | null }>;
  onAcceptInvite: (payload: {
    tokenOrCode: string;
    contactName: string;
    email: string;
    clubName: string;
  }) => Promise<void>;
}

export function InviteAcceptModal({
  open,
  initialTokenOrCode,
  firebaseUser,
  student,
  onClose,
  onLookupInvite,
  onAcceptInvite,
}: InviteAcceptModalProps) {
  const [codeInput, setCodeInput] = useState(initialTokenOrCode);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [invite, setInvite] = useState<OfficialInvite | null>(null);
  const [college, setCollege] = useState<College | null>(null);

  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [clubName, setClubName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    setLookupError(null);
    setContactName(firebaseUser?.displayName || student?.displayName || '');
    setEmail(firebaseUser?.email || student?.email || '');

    if (initialTokenOrCode.trim()) {
      setCodeInput(initialTokenOrCode);
      setLookupLoading(true);
      onLookupInvite(initialTokenOrCode.trim())
        .then((res) => {
          setInvite(res.invite);
          setCollege(res.college);
          setClubName(res.invite.clubName);
        })
        .catch((err) => {
          setInvite(null);
          setCollege(null);
          setLookupError(err instanceof Error ? err.message : 'Invite not found.');
        })
        .finally(() => setLookupLoading(false));
    } else {
      setCodeInput('');
      setInvite(null);
      setCollege(null);
      setClubName('');
    }
  }, [open, initialTokenOrCode, firebaseUser, student, onLookupInvite]);

  if (!open) return null;

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!codeInput.trim()) return;
    setLookupError(null);
    setSubmitError(null);
    setLookupLoading(true);
    try {
      const res = await onLookupInvite(codeInput.trim());
      setInvite(res.invite);
      setCollege(res.college);
      setClubName(res.invite.clubName);
    } catch (err) {
      setInvite(null);
      setCollege(null);
      setLookupError(err instanceof Error ? err.message : 'Could not verify invite code.');
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    if (!invite) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      await onAcceptInvite({
        tokenOrCode: invite.token,
        contactName,
        email: invite.targetEmail || email,
        clubName,
      });
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to accept invite.');
    } finally {
      setSubmitting(false);
    }
  }

  const slotsLeft = invite ? Math.max(0, invite.maxUses - invite.usedCount) : 0;
  const isInviteUsable = Boolean(invite && invite.status === 'active' && slotsLeft > 0);

  return (
    <div
      className="fixed inset-0 z-50 paper-scrim flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-modal-title"
    >
      <div className="paper-modal w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-warm)] bg-[var(--paper-raised)] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-5 h-5 text-[var(--crimson)] shrink-0" />
            <div>
              <h2
                id="invite-modal-title"
                className="font-display text-lg font-extrabold tracking-[-0.03em] text-[var(--ink)]"
              >
                Join College Official Team
              </h2>
              <p className="text-xs text-[var(--ink-2)]">
                Accept a club leader invite link or code issued by a verified College Official.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close invite modal"
            className="paper-btn-secondary min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          <form onSubmit={handleLookup} className="space-y-2">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
              Invite Code or Token
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="e.g. CP-IIITH-2026 or inv-..."
                className="paper-input flex-1 min-h-[40px] px-3 py-2 text-sm font-mono"
              />
              <button
                type="submit"
                disabled={lookupLoading || !codeInput.trim()}
                className="paper-btn-ink min-h-[40px] px-4 py-2 text-xs sm:text-sm whitespace-nowrap"
              >
                {lookupLoading ? 'Checking...' : 'Verify Code'}
              </button>
            </div>
            {lookupError && (
              <p className="text-xs text-[var(--crimson)] bg-[var(--crimson-tint)] border border-[var(--crimson)] px-3 py-2 font-medium">
                {lookupError}
              </p>
            )}
          </form>

          {lookupLoading && !invite && (
            <div className="py-6 flex items-center justify-center gap-2 text-sm text-[var(--ink-2)]">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--crimson)]" />
              <span>Verifying official invite link...</span>
            </div>
          )}

          {invite && (
            <div className="space-y-4">
              <div className="p-4 rounded-[14px] bg-[var(--paper-raised)] border border-[var(--border-ink)] space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-[var(--ink)] inline-flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[var(--olive)] shrink-0" />
                    <span>{college?.name || invite.collegeId}</span>
                  </span>
                  <span className="font-mono font-semibold text-[var(--crimson)] tabular-nums">
                    {invite.code}
                  </span>
                </div>
                <div className="text-xs text-[var(--ink-2)]">
                  Invited by <strong className="text-[var(--ink)]">{invite.createdByName}</strong> ·{' '}
                  {invite.createdByEmail}
                </div>
                <div className="text-xs text-[var(--ink-2)] tabular-nums">
                  Status:{' '}
                  <strong className={isInviteUsable ? 'text-[var(--olive)]' : 'text-[var(--crimson)]'}>
                    {invite.status.toUpperCase()}
                  </strong>{' '}
                  · {slotsLeft} of {invite.maxUses} invite slot(s) remaining
                </div>
                {invite.targetEmail && (
                  <div className="text-xs text-[var(--amber-ink)] pt-1">
                    Restricted to email: <span className="font-mono">{invite.targetEmail}</span>
                  </div>
                )}
              </div>

              {isInviteUsable ? (
                <form onSubmit={handleAccept} className="space-y-3.5">
                  <label className="block space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                      Club / Society Name
                    </span>
                    <input
                      type="text"
                      required
                      value={clubName}
                      onChange={(e) => setClubName(e.target.value)}
                      className="paper-input w-full min-h-[40px] px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                      Your Full Name (Club Leader)
                    </span>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Your full name"
                      className="paper-input w-full min-h-[40px] px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                      Official / Club Email
                    </span>
                    <input
                      type="email"
                      required
                      readOnly={Boolean(invite.targetEmail)}
                      value={invite.targetEmail || email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={`leader@${college?.emailDomain || 'college.ac.in'}`}
                      className={`paper-input w-full min-h-[40px] px-3 py-2 text-sm ${
                        invite.targetEmail ? 'opacity-75' : ''
                      }`}
                    />
                  </label>

                  <div className="p-3 rounded-[12px] bg-[var(--olive-tint)] border border-[var(--olive-border)] text-xs text-[var(--ink)] flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[var(--olive)] shrink-0 mt-0.5" />
                    <span>
                      Accepting adds you to <strong>{college?.shortName || 'your college'}</strong>&apos;s
                      Official List as an <strong>Invited Club Leader</strong> so you can upload posters,
                      publish events, and edit event details.
                    </span>
                  </div>

                  {submitError && (
                    <div className="p-3 bg-[var(--crimson-tint)] border border-[var(--crimson)] text-xs font-medium text-[var(--crimson)]">
                      {submitError}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="paper-btn-secondary min-h-[40px] px-4 py-2 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="paper-btn-primary min-h-[42px] px-5 py-2 text-sm"
                    >
                      {submitting ? 'Joining Official List...' : 'Accept Invite & Join'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-3.5 bg-[var(--crimson-tint)] border border-[var(--crimson)] text-xs font-medium text-[var(--crimson)]">
                  This invite is no longer active ({invite.status}). Ask your College Official for a fresh invite link.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
