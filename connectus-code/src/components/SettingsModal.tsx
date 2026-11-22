import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { User } from 'firebase/auth';
import {
  Accessibility,
  Bell,
  CheckCircle2,
  Download,
  Eye,
  Lock,
  ShieldCheck,
  SlidersHorizontal,
  SunMoon,
  Trash2,
  X,
} from 'lucide-react';
import {
  applyThemePreference,
  getStoredDarkTone,
  getStoredTheme,
  normalizeThemePreference,
  resolveIsDark,
  setDarkTone,
  THEME_CHANGE_EVENT,
  type DarkTone,
  type ThemePreference,
} from '../utils/theme';
import {
  SUPPORTED_LANGUAGES,
  type StudentGender,
  type StudentProfile,
  type SupportedLanguage,
} from '../types';

export type SettingsTab = 'account' | 'notifications' | 'privacy' | 'accessibility';

interface SettingsModalProps {
  open: boolean;
  initialTab?: SettingsTab;
  student: StudentProfile;
  firebaseUser: User | null;
  onClose: () => void;
  onSaveSettings: (updates: Partial<StudentProfile>) => Promise<void>;
  onChangeTheme?: (pref: ThemePreference) => void | Promise<void>;
  onOpenPreferences: () => void;
  onOpenTelegram: () => void;
  onExportData: () => Promise<Record<string, unknown>>;
  onDeleteAccount: () => Promise<void>;
}

const GENDER_OPTIONS: Array<{ value: StudentGender; label: string }> = [
  { value: 'unset', label: 'Unset (Private — excluded from gendered calls)' },
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say (Excluded from gendered calls)' },
];

export function SettingsModal({
  open,
  initialTab,
  student,
  firebaseUser,
  onClose,
  onSaveSettings,
  onChangeTheme,
  onOpenPreferences,
  onOpenTelegram,
  onExportData,
  onDeleteAccount,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab || 'account');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Notifications state
  const [quietEnabled, setQuietEnabled] = useState(student.quietHours.enabled);
  const [quietStart, setQuietStart] = useState(student.quietHours.start || '22:00');
  const [quietEnd, setQuietEnd] = useState(student.quietHours.end || '07:00');
  const [priorityLowSeatAlerts, setPriorityLowSeatAlerts] = useState(
    student.priorityLowSeatAlerts !== false
  );
  const [teamCallNotifications, setTeamCallNotifications] = useState(
    student.teamCallNotifications !== false
  );

  // Privacy & defaults state
  const [linksVisibility, setLinksVisibility] = useState<'public' | 'squads' | 'hidden'>(
    student.profileVisibility?.linksVisibility || 'public'
  );
  const [discoverableInTeams, setDiscoverableInTeams] = useState(
    student.profileVisibility?.discoverableInTeams ?? student.teamDiscoveryEnabled !== false
  );
  const [showAcademicYear, setShowAcademicYear] = useState(
    student.profileVisibility?.showAcademicYear !== false
  );
  const [gender, setGender] = useState<StudentGender>(student.gender || 'unset');
  const [languages, setLanguages] = useState<SupportedLanguage[]>(
    Array.isArray(student.languages) ? student.languages.slice(0, 5) : []
  );

  // Accessibility state
  const [reducedMotion, setReducedMotion] = useState(
    Boolean(student.accessibilityPrefs?.reducedMotion)
  );
  const [highContrastFocus, setHighContrastFocus] = useState(
    Boolean(student.accessibilityPrefs?.highContrastFocus)
  );
  const [compactDensity, setCompactDensity] = useState(
    Boolean(student.accessibilityPrefs?.compactDensity)
  );
  const [themePref, setThemePref] = useState<ThemePreference>(
    () =>
      normalizeThemePreference(student.accessibilityPrefs?.themePreference) ||
      getStoredTheme(firebaseUser?.uid ?? null)
  );
  const [darkToneState, setDarkToneState] = useState<DarkTone>(() => getStoredDarkTone());

  useEffect(() => {
    const syncTheme = () => {
      setThemePref(
        normalizeThemePreference(student.accessibilityPrefs?.themePreference) ||
          getStoredTheme(firebaseUser?.uid ?? null)
      );
      setDarkToneState(getStoredDarkTone());
    };
    window.addEventListener(THEME_CHANGE_EVENT, syncTheme);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, syncTheme);
  }, [student.accessibilityPrefs?.themePreference, firebaseUser?.uid]);

  useEffect(() => {
    if (!open) return;
    setActiveTab(initialTab || 'account');
    setQuietEnabled(student.quietHours.enabled);
    setQuietStart(student.quietHours.start || '22:00');
    setQuietEnd(student.quietHours.end || '07:00');
    setPriorityLowSeatAlerts(student.priorityLowSeatAlerts !== false);
    setTeamCallNotifications(student.teamCallNotifications !== false);
    setLinksVisibility(student.profileVisibility?.linksVisibility || 'public');
    setDiscoverableInTeams(
      student.profileVisibility?.discoverableInTeams ?? student.teamDiscoveryEnabled !== false
    );
    setShowAcademicYear(student.profileVisibility?.showAcademicYear !== false);
    setGender(student.gender || 'unset');
    setLanguages(Array.isArray(student.languages) ? student.languages.slice(0, 5) : []);
    setReducedMotion(Boolean(student.accessibilityPrefs?.reducedMotion));
    setHighContrastFocus(Boolean(student.accessibilityPrefs?.highContrastFocus));
    setCompactDensity(Boolean(student.accessibilityPrefs?.compactDensity));
    setThemePref(
      normalizeThemePreference(student.accessibilityPrefs?.themePreference) ||
        getStoredTheme(firebaseUser?.uid ?? null)
    );
    setConfirmDelete(false);
    setStatusMessage(null);
    setErrorMessage(null);
  }, [open, initialTab, student, firebaseUser?.uid]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  async function savePartial(updates: Partial<StudentProfile>, msg: string) {
    setSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      await onSaveSettings(updates);
      setStatusMessage(msg);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not update settings.');
    } finally {
      setSaving(false);
    }
  }

  async function handleExportJson() {
    setExporting(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const payload = await onExportData();
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `connectus-data-export-${student.id.replace(/[^a-zA-Z0-9_-]/g, '')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMessage('DPDP JSON data export downloaded.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not export account data.');
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setErrorMessage(null);
    try {
      await onDeleteAccount();
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not delete personal data.');
    } finally {
      setDeleting(false);
    }
  }

  return createPortal(
    <div
      onClick={onClose}
      className="paper-scrim fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="paper-modal w-full max-w-2xl p-6 sm:p-7 space-y-5 my-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--border-warm)]">
          <h2
            id="settings-modal-title"
            className="font-display text-2xl font-extrabold tracking-[-0.03em] text-[var(--ink)]"
          >
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="paper-btn-secondary w-9 h-9 inline-flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4-Tab Segment Bar */}
        <div className="paper-segment w-full overflow-x-auto">
          {(
            [
              { id: 'account', label: 'Account & Security' },
              { id: 'notifications', label: 'Notifications' },
              { id: 'privacy', label: 'Privacy & Defaults' },
              { id: 'accessibility', label: 'Appearance' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={activeTab === tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setStatusMessage(null);
                setErrorMessage(null);
              }}
              className="paper-segment-btn flex-1 min-h-[36px] px-3 py-1.5 text-xs whitespace-nowrap"
            >
              {tab.label}
            </button>
          ))}
        </div>

        {statusMessage && (
          <div className="p-3 border border-[var(--olive-border)] bg-[var(--olive-tint)] text-xs font-medium text-[var(--ink)] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[var(--olive)] shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 border border-[var(--crimson)] bg-[var(--crimson-tint)] text-xs font-medium text-[var(--crimson)]">
            {errorMessage}
          </div>
        )}

        {/* Tab 1: Account & Security */}
        {activeTab === 'account' && (
          <div className="space-y-5">
            <div className="p-4 rounded-[12px] bg-[var(--paper-raised)] border border-[var(--border-warm)] space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ink-2)] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[var(--crimson)]" />
                <span>Authenticated Identity</span>
              </div>
              <div className="text-sm font-semibold text-[var(--ink)]">
                {firebaseUser?.email || student.email || 'Guest Preview Session'}
              </div>
              <div className="text-xs text-[var(--ink-2)] flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>
                  {firebaseUser
                    ? `Google Auth verified${firebaseUser.emailVerified ? ' · Active Session' : ''}`
                    : 'Sign in with Google to sync profile, passes, and Teams across devices.'}
                </span>
                {student.collegeVerified && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-[var(--olive)]">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Campus Domain Verified</span>
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 rounded-[12px] bg-[var(--paper-raised)] border border-[var(--border-warm)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-xs font-bold text-[var(--ink)]">
                  Export Personal Data (DPDP Act JSON)
                </div>
                <p className="text-xs text-[var(--ink-2)]">
                  Download a structured JSON bundle of your student profile, passes, squads, and alert logs.
                </p>
              </div>
              <button
                type="button"
                disabled={exporting}
                onClick={handleExportJson}
                className="paper-btn-secondary min-h-[38px] px-3.5 py-1.5 text-xs inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{exporting ? 'Preparing...' : 'Download JSON'}</span>
              </button>
            </div>

            <div className="p-4 rounded-[12px] border border-[var(--crimson)]/40 bg-[var(--crimson-tint)]/35 space-y-3">
              <div className="space-y-1">
                <div className="text-xs font-bold text-[var(--crimson)] flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Erase Personal Data &amp; Account</span>
                </div>
                <p className="text-xs text-[var(--ink-2)]">
                  Permanently deletes your profile, saved events, passes, availability cards, and notification history.
                </p>
              </div>

              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="paper-btn-secondary min-h-[36px] px-3.5 py-1.5 text-xs text-[var(--crimson)]"
                >
                  Request Data Erasure...
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={handleDelete}
                    className="paper-btn-crimson min-h-[36px] px-4 py-1.5 text-xs"
                  >
                    {deleting ? 'Erasing...' : 'Confirm Permanent Erasure'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="paper-btn-secondary min-h-[36px] px-3 py-1.5 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Notifications */}
        {activeTab === 'notifications' && (
          <div className="space-y-5">
            <div className="p-4 rounded-[12px] bg-[var(--paper-raised)] border border-[var(--border-warm)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-[var(--crimson)]" />
                  <span>@ConnectusBot Delivery Channel</span>
                </div>
                <p className="text-xs text-[var(--ink-2)]">
                  Status: <strong className="text-[var(--ink)]">{student.telegramConnected ? 'Connected' : 'Not linked'}</strong> · 3/day non-critical alert cap
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTelegram();
                }}
                className="paper-btn-tint min-h-[36px] px-3.5 py-1.5 text-xs whitespace-nowrap shrink-0"
              >
                Open Bot Drawer
              </button>
            </div>

            <div className="space-y-3 p-4 rounded-[12px] bg-[var(--paper-raised)] border border-[var(--border-warm)]">
              <label className="flex items-start gap-2.5 text-xs text-[var(--ink)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={quietEnabled}
                  onChange={(e) => setQuietEnabled(e.target.checked)}
                  className="mt-0.5 accent-[var(--crimson)]"
                />
                <span>
                  <strong className="font-semibold">Enforce IST Quiet Hours</strong> — Hold non-urgent alerts until morning digest flush.
                </span>
              </label>

              <div className="grid grid-cols-2 gap-3 pl-6">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--ink-2)] mb-1">
                    Quiet Start (IST)
                  </label>
                  <input
                    type="time"
                    value={quietStart}
                    disabled={!quietEnabled}
                    onChange={(e) => setQuietStart(e.target.value)}
                    className="paper-input w-full min-h-[36px] px-3 py-1 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--ink-2)] mb-1">
                    Quiet End (IST)
                  </label>
                  <input
                    type="time"
                    value={quietEnd}
                    disabled={!quietEnabled}
                    onChange={(e) => setQuietEnd(e.target.value)}
                    className="paper-input w-full min-h-[36px] px-3 py-1 text-xs font-mono"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2.5 text-xs text-[var(--ink)] cursor-pointer pt-2 border-t border-[var(--border-warm)]">
                <input
                  type="checkbox"
                  checked={priorityLowSeatAlerts}
                  onChange={(e) => setPriorityLowSeatAlerts(e.target.checked)}
                  className="mt-0.5 accent-[var(--crimson)]"
                />
                <span>
                  <strong className="font-semibold">Priority Low-Seat Skill Alerts</strong> — Instant notice when matched events hit ≤15 seats or ≥75% full.
                </span>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-[var(--ink)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={teamCallNotifications}
                  onChange={(e) => setTeamCallNotifications(e.target.checked)}
                  className="mt-0.5 accent-[var(--crimson)]"
                />
                <span>
                  <strong className="font-semibold">Team-up Call Notifications</strong> — Receive targeted squad recruitments matching your skills.
                </span>
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  void savePartial(
                    {
                      quietHours: {
                        enabled: quietEnabled,
                        start: quietStart,
                        end: quietEnd,
                      },
                      priorityLowSeatAlerts,
                      teamCallNotifications,
                    },
                    'Notification preferences updated.'
                  )
                }
                className="paper-btn-primary min-h-[40px] px-5 py-2 text-xs uppercase tracking-[0.06em]"
              >
                {saving ? 'Saving...' : 'Save Notification Settings'}
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Privacy & Visibility */}
        {activeTab === 'privacy' && (
          <div className="space-y-5">
            <div className="p-4 rounded-[12px] bg-[var(--paper-raised)] border border-[var(--border-warm)] space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-[var(--crimson)]" />
                  <span>Social &amp; Coding Links Visibility</span>
                </div>
                <p className="text-xs text-[var(--ink-2)]">
                  Control who sees your GitHub, LinkedIn, LeetCode, HackerRank, and Instagram links.
                </p>
                <div className="paper-segment w-full">
                  {(
                    [
                      { id: 'public', label: 'All Students' },
                      { id: 'squads', label: 'Squads & Connections Only' },
                      { id: 'hidden', label: 'Hidden' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={linksVisibility === opt.id}
                      onClick={() => setLinksVisibility(opt.id)}
                      className="paper-segment-btn flex-1 min-h-[34px] px-2.5 py-1 text-xs whitespace-nowrap"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-start gap-2.5 text-xs text-[var(--ink)] cursor-pointer pt-2 border-t border-[var(--border-warm)]">
                <input
                  type="checkbox"
                  checked={discoverableInTeams}
                  onChange={(e) => setDiscoverableInTeams(e.target.checked)}
                  className="mt-0.5 accent-[var(--crimson)]"
                />
                <span>
                  <strong className="font-semibold">Discoverable in Teams</strong> — Allow peers in your region/skills to send 1-on-1 connection requests.
                </span>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-[var(--ink)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAcademicYear}
                  onChange={(e) => setShowAcademicYear(e.target.checked)}
                  className="mt-0.5 accent-[var(--crimson)]"
                />
                <span>
                  <strong className="font-semibold">Show Academic Year &amp; Branch</strong> — Display branch and year on teammate cards (e.g. CSE · 3rd Year).
                </span>
              </label>
            </div>

            <div className="p-4 rounded-[12px] bg-[var(--paper-raised)] border border-[var(--border-warm)] space-y-3.5">
              <div className="space-y-1">
                <div className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--crimson)]" />
                  <span>Appeal Matching Fields (Private)</span>
                </div>
                <p className="text-xs text-[var(--ink-2)]">
                  These optional fields are only used to match appeals you choose to receive and are never shown to others.
                </p>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="settings-gender-select"
                  className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--ink-2)]"
                >
                  Gender (Optional)
                </label>
                <select
                  id="settings-gender-select"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as StudentGender)}
                  className="paper-input w-full min-h-[38px] px-3 py-1.5 text-xs"
                >
                  {GENDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                    Spoken Languages (Optional)
                  </span>
                  <span className="text-[11px] font-mono text-[var(--ink-2)] tabular-nums">
                    {languages.length}/5 selected
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const active = languages.includes(lang);
                    const disabled = !active && languages.length >= 5;
                    return (
                      <button
                        key={lang}
                        type="button"
                        aria-pressed={active}
                        disabled={disabled}
                        onClick={() => {
                          setLanguages((prev) => {
                            if (prev.includes(lang)) {
                              return prev.filter((item) => item !== lang);
                            }
                            if (prev.length >= 5) return prev;
                            return [...prev, lang];
                          });
                        }}
                        className={`min-h-[30px] px-2.5 py-1 text-xs font-medium border transition-colors ${
                          active
                            ? 'bg-[var(--ink)] text-[var(--on-ink)] border-[var(--ink)]'
                            : disabled
                              ? 'bg-[var(--paper)] text-[var(--ink-2)]/50 border-[var(--border-warm)] cursor-not-allowed'
                              : 'bg-[var(--paper)] text-[var(--ink)] border-[var(--border-warm)] hover:border-[var(--ink)]'
                        }`}
                      >
                        {lang}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-[12px] bg-[var(--paper-raised)] border border-[var(--border-warm)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--crimson)]" />
                  <span>Discovery Defaults (Campus Pin, Radius &amp; Followed Colleges)</span>
                </div>
                <p className="text-xs text-[var(--ink-2)]">
                  Current radius: <span className="font-mono">{student.radiusKm} km</span> · {student.followedCollegeIds.length} followed colleges
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPreferences();
                }}
                className="paper-btn-secondary min-h-[36px] px-3.5 py-1.5 text-xs whitespace-nowrap shrink-0"
              >
                Adjust Discovery Defaults
              </button>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  void savePartial(
                    {
                      teamDiscoveryEnabled: discoverableInTeams,
                      gender,
                      languages,
                      profileVisibility: {
                        linksVisibility,
                        discoverableInTeams,
                        showAcademicYear,
                      },
                    },
                    'Privacy and visibility defaults saved.'
                  )
                }
                className="paper-btn-primary min-h-[40px] px-5 py-2 text-xs uppercase tracking-[0.06em]"
              >
                {saving ? 'Saving...' : 'Save Privacy Defaults'}
              </button>
            </div>
          </div>
        )}

        {/* Tab 4: Appearance & Accessibility */}
        {activeTab === 'accessibility' && (
          <div className="space-y-5">
            <div className="p-4 rounded-[12px] bg-[var(--paper-raised)] border border-[var(--border-warm)] space-y-3">
              <div className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
                <SunMoon className="w-4 h-4 text-[var(--crimson)]" />
                <span>Color Theme</span>
              </div>
              <p className="text-xs text-[var(--ink-2)]">
                Switch between Warm Paper light mode and Charcoal / Black / Grey dark mode, or follow your device setting.
              </p>
              <div className="paper-segment w-full" role="group" aria-label="Color theme mode">
                {(
                  [
                    { id: 'system', label: 'System' },
                    { id: 'light', label: 'Warm Paper' },
                    { id: 'dark', label: 'Dark Mode' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={themePref === opt.id}
                    onClick={() => {
                      setThemePref(opt.id);
                      if (onChangeTheme) {
                        void onChangeTheme(opt.id);
                      } else {
                        applyThemePreference(opt.id, firebaseUser?.uid ?? null);
                      }
                      setStatusMessage(`Theme set to ${opt.label}.`);
                    }}
                    className="paper-segment-btn flex-1 min-h-[36px] px-3 py-1.5 text-xs whitespace-nowrap"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {resolveIsDark(themePref) && (
                <div className="pt-2 border-t border-[var(--border-warm)] flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-[var(--ink-2)]">
                    Dark Background Tone
                  </span>
                  <div className="flex items-center gap-2" role="group" aria-label="Dark tone">
                    {(
                      [
                        { id: 'black', label: 'Black', swatch: '#050505' },
                        { id: 'charcoal', label: 'Charcoal', swatch: '#1f1f1f' },
                        { id: 'grey', label: 'Grey', swatch: '#2e2e2e' },
                      ] as const
                    ).map((tone) => (
                      <button
                        key={tone.id}
                        type="button"
                        aria-pressed={darkToneState === tone.id}
                        onClick={() => {
                          setDarkTone(tone.id);
                          setDarkToneState(tone.id);
                          setStatusMessage(`Dark tone set to ${tone.label}.`);
                        }}
                        className={`min-h-[32px] px-2.5 py-1 text-xs font-mono border inline-flex items-center gap-1.5 transition-colors ${
                          darkToneState === tone.id
                            ? 'border-[var(--orange)] text-[var(--ink)] bg-[var(--paper)]'
                            : 'border-[var(--border-warm)] text-[var(--ink-2)] hover:text-[var(--ink)]'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-[var(--border-ink)] shrink-0"
                          style={{ backgroundColor: tone.swatch }}
                          aria-hidden="true"
                        />
                        <span>{tone.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 rounded-[12px] bg-[var(--paper-raised)] border border-[var(--border-warm)] space-y-3.5">
              <div className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
                <Accessibility className="w-4 h-4 text-[var(--crimson)]" />
                <span>Interface Comfort &amp; Motion</span>
              </div>

              <label className="flex items-start gap-2.5 text-xs text-[var(--ink)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={reducedMotion}
                  onChange={(e) => setReducedMotion(e.target.checked)}
                  className="mt-0.5 accent-[var(--crimson)]"
                />
                <span>
                  <strong className="font-semibold">Reduced Motion</strong> — Minimize entrance transitions and scroll spotlights across cards and modals.
                </span>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-[var(--ink)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={highContrastFocus}
                  onChange={(e) => setHighContrastFocus(e.target.checked)}
                  className="mt-0.5 accent-[var(--crimson)]"
                />
                <span>
                  <strong className="font-semibold">High-Contrast Focus Rings</strong> — Emphasize keyboard focus outlines in high-contrast crimson.
                </span>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-[var(--ink)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={compactDensity}
                  onChange={(e) => setCompactDensity(e.target.checked)}
                  className="mt-0.5 accent-[var(--crimson)]"
                />
                <span>
                  <strong className="font-semibold">Compact Card &amp; Roster Density</strong> — Tighten spacing inside event grids and official queues.
                </span>
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  void savePartial(
                    {
                      accessibilityPrefs: {
                        reducedMotion,
                        highContrastFocus,
                        compactDensity,
                        themePreference: themePref,
                      },
                    },
                    'Appearance & accessibility settings saved.'
                  )
                }
                className="paper-btn-primary min-h-[40px] px-5 py-2 text-xs uppercase tracking-[0.06em]"
              >
                {saving ? 'Saving...' : 'Save Accessibility Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
