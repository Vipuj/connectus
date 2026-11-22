import { useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  BookmarkCheck,
  Building2,
  ChevronDown,
  Compass,
  Globe,
  LogOut,
  Moon,
  Settings,
  Sparkles,
  Sun,
  Ticket,
  User as UserIcon,
  Users,
} from 'lucide-react';
import {
  applyThemePreference,
  getStoredTheme,
  resolveIsDark,
  THEME_CHANGE_EVENT,
  type ThemePreference,
} from '../utils/theme';
import { ConnectusLogo } from './ConnectusLogo';

export type ActiveTab =
  | 'discover'
  | 'my-events'
  | 'teams'
  | 'tickets'
  | 'me'
  | 'my-club'
  | 'organizer'
  | 'external';

export type OfficialSectionId =
  | 'discover'
  | 'events'
  | 'approvals'
  | 'feedback'
  | 'clubs'
  | 'announcements';

interface TopBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenMe: () => void;
  onOpenSettings: () => void;
  onOpenLogin: () => void;
  onOpenSignUp: () => void;
  onSignOut: () => Promise<void>;
  firebaseUser: User | null;
  studentName: string;
  studentPhotoUrl?: string;
  studentCollegeShort?: string;
  canAccessMyClub: boolean;
  canAccessOfficials: boolean;
  canAccessExternal: boolean;
  officialSection?: OfficialSectionId;
  onSelectOfficialSection?: (section: OfficialSectionId) => void;
  pendingApprovalCount?: number;
  themePreference?: ThemePreference;
  onChangeTheme?: (pref: ThemePreference) => void | Promise<void>;
}

export function TopBar({
  activeTab,
  onSelectTab,
  onOpenMe,
  onOpenSettings,
  onOpenLogin,
  onOpenSignUp,
  onSignOut,
  firebaseUser,
  studentName,
  studentPhotoUrl,
  studentCollegeShort,
  canAccessMyClub,
  canAccessOfficials,
  canAccessExternal,
  officialSection = 'discover',
  onSelectOfficialSection,
  pendingApprovalCount = 0,
  themePreference,
  onChangeTheme,
}: TopBarProps) {
  const [isFloating, setIsFloating] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() =>
    resolveIsDark(themePreference ?? getStoredTheme(firebaseUser?.uid ?? null))
  );
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const syncTheme = () =>
      setIsDark(resolveIsDark(themePreference ?? getStoredTheme(firebaseUser?.uid ?? null)));
    syncTheme();
    window.addEventListener(THEME_CHANGE_EVENT, syncTheme);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, syncTheme);
  }, [themePreference, firebaseUser?.uid]);

  useEffect(() => {
    const updateScroll = () => {
      const y = window.scrollY;
      setIsFloating(y > 16);
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.min(100, Math.max(0, (y / docHeight) * 100)) : 0;
      setScrollProgress(pct);
    };
    updateScroll();
    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('resize', updateScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', updateScroll);
      window.removeEventListener('resize', updateScroll);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const inOfficialPortal = canAccessOfficials && activeTab === 'organizer';
  const inClubStudio = canAccessMyClub && activeTab === 'my-club';

  // Core student primary tabs (Discover, My Campus, Teams, Bookings, Me) — Club Leaders keep ALL + Studio button
  const studentNavItems: { id: ActiveTab; label: string }[] = [
    { id: 'discover', label: 'Discover' },
    { id: 'my-events', label: 'My Campus' },
    { id: 'teams', label: 'Teams' },
    { id: 'tickets', label: 'Bookings' },
    { id: 'me', label: 'Me' },
  ];

  const officialNavItems: { id: OfficialSectionId; label: string; badge?: number }[] = [
    { id: 'discover', label: 'Discover' },
    { id: 'events', label: 'Our Events' },
    {
      id: 'approvals',
      label: 'Review & Approval',
      badge: pendingApprovalCount > 0 ? pendingApprovalCount : undefined,
    },
    { id: 'feedback', label: 'Feedbacks' },
    { id: 'clubs', label: 'Clubs & Members' },
    { id: 'announcements', label: 'Announcements' },
  ];

  const firstName = (
    studentName ||
    firebaseUser?.displayName ||
    firebaseUser?.email?.split('@')[0] ||
    'Profile'
  ).split(' ')[0];
  const avatarSrc = studentPhotoUrl || firebaseUser?.photoURL || '';

  return (
    <>
      <div
        className="scroll-progress-bar"
        style={{ width: `${scrollProgress}%` }}
        aria-hidden="true"
      />

      <div className="sticky top-0 z-40">
        <header className={`paper-nav ${isFloating ? 'is-floating' : ''}`}>
          <div className="w-full px-3 sm:px-4 md:px-5 h-14 md:h-16 flex items-center justify-between gap-3 md:gap-4">
            <a
              href="#discover"
              aria-label="Connectus"
              onClick={(e) => {
                e.preventDefault();
                if (inOfficialPortal && onSelectOfficialSection) {
                  onSelectOfficialSection('discover');
                } else {
                  onSelectTab('discover');
                }
              }}
              className="inline-flex items-center whitespace-nowrap shrink-0 min-h-[44px] px-2 -ml-2 cursor-pointer hover:bg-[var(--feel-tint)]/35 transition-colors"
            >
              <ConnectusLogo variant="light" size={24} />
            </a>

            {inOfficialPortal ? (
              <nav
                aria-label="Campus Official navigation"
                className="hidden lg:flex items-center gap-0.5 xl:gap-1 overflow-x-auto max-w-full"
              >
                {officialNavItems.map((item) => {
                  const active = officialSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-current={active ? 'page' : undefined}
                      onClick={() => onSelectOfficialSection?.(item.id)}
                      className={`min-h-[44px] px-2.5 xl:px-3.5 py-2.5 inline-flex items-center justify-center gap-1.5 cursor-pointer select-none text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                        active
                          ? 'border-[var(--crimson)] text-[var(--ink)] bg-[var(--feel-tint)]/50'
                          : 'border-transparent text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--feel-tint)]/30 hover:border-[var(--border-warm)]'
                      }`}
                    >
                      <span>{item.label}</span>
                      {typeof item.badge === 'number' && item.badge > 0 && (
                        <span className="px-1.5 py-0.2 bg-[var(--crimson)] text-[var(--on-crimson)] font-mono text-[10px] font-bold leading-4 tabular-nums">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            ) : (
              <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-1 lg:gap-2">
                {studentNavItems.map((item) => {
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-current={active ? 'page' : undefined}
                      onClick={() => onSelectTab(item.id)}
                      className={`min-h-[44px] px-4 lg:px-5 py-2.5 inline-flex items-center justify-center cursor-pointer select-none text-xs font-semibold uppercase tracking-[0.09em] transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                        active
                          ? 'border-[var(--crimson)] text-[var(--ink)] bg-[var(--feel-tint)]/50'
                          : 'border-transparent text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--feel-tint)]/30 hover:border-[var(--border-warm)]'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            )}

            <div className="flex items-center gap-2 shrink-0" ref={menuRef}>
              {canAccessOfficials && !inOfficialPortal && (
                <button
                  type="button"
                  onClick={() => onSelectTab('organizer')}
                  className="paper-btn-crimson min-h-[38px] px-3 py-1.5 text-xs uppercase tracking-[0.05em] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Official Portal</span>
                  <span className="sm:hidden">Official</span>
                  {pendingApprovalCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-[var(--ink)] text-[var(--on-ink)] font-mono text-[10px] font-bold leading-4 tabular-nums">
                      {pendingApprovalCount}
                    </span>
                  )}
                </button>
              )}

              {canAccessExternal && !inOfficialPortal && activeTab !== 'external' && (
                <button
                  type="button"
                  onClick={() => onSelectTab('external')}
                  className="hidden sm:inline-flex paper-btn-secondary min-h-[38px] px-3 py-1.5 text-xs uppercase tracking-[0.05em] items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Globe className="w-3.5 h-3.5 text-[var(--crimson)]" />
                  <span>Partner</span>
                </button>
              )}

              {canAccessMyClub && !inOfficialPortal && (
                <div
                  role="group"
                  aria-label="Switch between Student view and Club Studio"
                  className="paper-segment shrink-0"
                >
                  <button
                    type="button"
                    aria-pressed={!inClubStudio}
                    onClick={() => {
                      if (inClubStudio) onSelectTab('discover');
                    }}
                    className="paper-segment-btn min-h-[34px] px-2.5 sm:px-3 py-1 text-[11px] uppercase tracking-[0.06em] whitespace-nowrap"
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    aria-pressed={inClubStudio}
                    onClick={() => onSelectTab('my-club')}
                    className="paper-segment-btn min-h-[34px] px-2.5 sm:px-3 py-1 text-[11px] uppercase tracking-[0.06em] inline-flex items-center gap-1 whitespace-nowrap"
                  >
                    <Sparkles className="w-3 h-3 shrink-0" />
                    <span>Studio</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  const nextPref: ThemePreference = isDark ? 'light' : 'dark';
                  if (onChangeTheme) {
                    void onChangeTheme(nextPref);
                  } else {
                    applyThemePreference(nextPref, firebaseUser?.uid ?? null);
                  }
                }}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                title={isDark ? 'Warm Paper (Light)' : 'Warm Espresso (Dark)'}
                className="paper-btn-secondary min-h-[38px] w-[38px] inline-flex items-center justify-center shrink-0"
              >
                {isDark ? (
                  <Sun className="w-4 h-4 text-[var(--orange)]" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>

              {firebaseUser ? (
                <div className="relative">
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((v) => !v)}
                    className={`paper-btn-secondary min-h-[40px] pl-2 pr-3 py-1.5 text-xs uppercase tracking-[0.04em] inline-flex items-center gap-2 whitespace-nowrap shrink-0 ${
                      activeTab === 'me' ? 'border-[var(--crimson)] text-[var(--ink)]' : ''
                    }`}
                  >
                    {avatarSrc ? (
                      <img
                        src={avatarSrc}
                        alt={firstName}
                        referrerPolicy="no-referrer"
                        className="w-5 h-5 rounded-full object-cover border border-[var(--ink)] shrink-0"
                      />
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-[var(--feel-tint)] text-[var(--ink)] border border-[var(--ink)] flex items-center justify-center shrink-0">
                        <UserIcon className="w-3 h-3" />
                      </span>
                    )}
                    <span className="max-w-[96px] truncate">{firstName}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[var(--ink-2)] transition-transform ${
                        menuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {menuOpen && (
                    <div
                      role="menu"
                      aria-label="Account menu"
                      className="absolute right-0 mt-2 w-64 bg-[var(--paper-app)] border border-[var(--border-ink)] rounded-[14px] shadow-[6px_6px_0_var(--crimson)] overflow-hidden z-50"
                    >
                      <div className="px-4 py-3 bg-[var(--paper-raised)] border-b border-[var(--border-warm)]">
                        <div className="text-xs font-extrabold text-[var(--ink)] truncate">
                          {studentName || firebaseUser.displayName || firstName}
                        </div>
                      </div>

                      <div className="py-1.5 text-xs">
                        {!inOfficialPortal && (
                          <>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setMenuOpen(false);
                                onOpenMe();
                              }}
                              className="w-full px-4 py-2 text-left text-[var(--ink)] hover:bg-[var(--feel-tint)]/45 flex items-center gap-2.5 font-medium"
                            >
                              <UserIcon className="w-3.5 h-3.5 text-[var(--crimson)]" />
                              <span>My Profile</span>
                            </button>

                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setMenuOpen(false);
                                onOpenSettings();
                              }}
                              className="w-full px-4 py-2 text-left text-[var(--ink)] hover:bg-[var(--feel-tint)]/45 flex items-center gap-2.5 font-medium"
                            >
                              <Settings className="w-3.5 h-3.5 text-[var(--crimson)]" />
                              <span>Settings &amp; Privacy</span>
                            </button>
                          </>
                        )}

                        {inOfficialPortal && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setMenuOpen(false);
                              onOpenSettings();
                            }}
                            className="w-full px-4 py-2 text-left text-[var(--ink)] hover:bg-[var(--feel-tint)]/45 flex items-center gap-2.5 font-medium"
                          >
                            <Settings className="w-3.5 h-3.5 text-[var(--crimson)]" />
                            <span>Account Settings</span>
                          </button>
                        )}

                        {(canAccessMyClub || canAccessOfficials) && (
                          <div className="my-1 border-t border-[var(--border-warm)]" />
                        )}

                        {canAccessMyClub && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setMenuOpen(false);
                              onSelectTab(inClubStudio ? 'my-events' : 'my-club');
                            }}
                            className="w-full px-4 py-2 text-left text-[var(--ink)] hover:bg-[var(--feel-tint)]/45 flex items-center gap-2.5 font-medium"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-[var(--crimson)]" />
                            <span>
                              {inClubStudio ? 'Return to Student View' : 'Club Leader Studio'}
                            </span>
                          </button>
                        )}

                        {canAccessOfficials && !inOfficialPortal && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setMenuOpen(false);
                              onSelectTab('organizer');
                            }}
                            className="w-full px-4 py-2 text-left text-[var(--ink)] hover:bg-[var(--feel-tint)]/45 flex items-center gap-2.5 font-medium"
                          >
                            <Building2 className="w-3.5 h-3.5 text-[var(--crimson)]" />
                            <span>Campus Official Portal</span>
                          </button>
                        )}

                        {!inOfficialPortal && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setMenuOpen(false);
                              onSelectTab('external');
                            }}
                            className="w-full px-4 py-2 text-left text-[var(--ink)] hover:bg-[var(--feel-tint)]/45 flex items-center gap-2.5 font-medium"
                          >
                            <Globe className="w-3.5 h-3.5 text-[var(--crimson)]" />
                            <span>
                              {canAccessExternal ? 'External Partner Studio' : 'External Partner Portal'}
                            </span>
                          </button>
                        )}

                        <div className="my-1 border-t border-[var(--border-warm)]" />

                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setMenuOpen(false);
                            void onSignOut();
                          }}
                          className="w-full px-4 py-2 text-left text-[var(--crimson)] hover:bg-[var(--crimson-tint)]/55 flex items-center gap-2.5 font-semibold"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    aria-label="Open Settings"
                    title="Settings"
                    className="paper-btn-secondary min-h-[40px] w-10 inline-flex items-center justify-center shrink-0"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onOpenLogin}
                    className="paper-btn-secondary min-h-[40px] px-3.5 sm:px-4 py-1.5 text-xs uppercase tracking-[0.06em] whitespace-nowrap shrink-0"
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    onClick={onOpenSignUp}
                    className="paper-btn-crimson min-h-[40px] px-3.5 sm:px-4 py-1.5 text-xs uppercase tracking-[0.06em] whitespace-nowrap shrink-0"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </header>
      </div>

      {!inOfficialPortal ? (
        <nav
          aria-label="Mobile bottom navigation"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--paper-raised)] border-t border-[var(--ink)]"
        >
          <div
            className={`grid ${
              canAccessOfficials || canAccessMyClub ? 'grid-cols-6' : 'grid-cols-5'
            } h-14 items-center`}
          >
            <button
              type="button"
              onClick={() => onSelectTab('discover')}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[9.5px] font-semibold uppercase tracking-[0.05em] whitespace-nowrap ${
                activeTab === 'discover' ? 'text-[var(--crimson)] bg-[var(--feel-tint)]/55' : 'text-[var(--ink-2)]'
              }`}
            >
              <Compass className="w-4 h-4" strokeWidth={activeTab === 'discover' ? 2.2 : 1.75} />
              <span>Discover</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('my-events')}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[9.5px] font-semibold uppercase tracking-[0.05em] whitespace-nowrap ${
                activeTab === 'my-events' ? 'text-[var(--crimson)] bg-[var(--feel-tint)]/55' : 'text-[var(--ink-2)]'
              }`}
            >
              <BookmarkCheck className="w-4 h-4" strokeWidth={activeTab === 'my-events' ? 2.2 : 1.75} />
              <span>Campus</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('teams')}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[9.5px] font-semibold uppercase tracking-[0.05em] whitespace-nowrap ${
                activeTab === 'teams' ? 'text-[var(--crimson)] bg-[var(--feel-tint)]/55' : 'text-[var(--ink-2)]'
              }`}
            >
              <Users className="w-4 h-4" strokeWidth={activeTab === 'teams' ? 2.2 : 1.75} />
              <span>Teams</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('tickets')}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[9.5px] font-semibold uppercase tracking-[0.05em] whitespace-nowrap ${
                activeTab === 'tickets' ? 'text-[var(--crimson)] bg-[var(--feel-tint)]/55' : 'text-[var(--ink-2)]'
              }`}
            >
              <Ticket className="w-4 h-4" strokeWidth={activeTab === 'tickets' ? 2.2 : 1.75} />
              <span>Bookings</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('me')}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[9.5px] font-semibold uppercase tracking-[0.05em] whitespace-nowrap ${
                activeTab === 'me' ? 'text-[var(--crimson)] bg-[var(--feel-tint)]/55' : 'text-[var(--ink-2)]'
              }`}
            >
              <UserIcon className="w-4 h-4" strokeWidth={activeTab === 'me' ? 2.2 : 1.75} />
              <span>Me</span>
            </button>
            {canAccessOfficials ? (
              <button
                type="button"
                onClick={() => onSelectTab('organizer')}
                className="min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] whitespace-nowrap text-[var(--crimson)]"
              >
                <Building2 className="w-4 h-4" strokeWidth={2} />
                <span>Official</span>
              </button>
            ) : canAccessMyClub ? (
              <button
                type="button"
                onClick={() => onSelectTab(inClubStudio ? 'my-events' : 'my-club')}
                className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] whitespace-nowrap ${
                  inClubStudio ? 'text-[var(--crimson)] bg-[var(--feel-tint)]/55' : 'text-[var(--ink-2)]'
                }`}
              >
                <Sparkles className="w-4 h-4" strokeWidth={inClubStudio ? 2.2 : 1.75} />
                <span>Studio</span>
              </button>
            ) : null}
          </div>
        </nav>
      ) : (
        <nav
          aria-label="Mobile Official navigation"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--paper-raised)] border-t border-[var(--ink)] overflow-x-auto"
        >
          <div className="flex items-center h-12 px-2 gap-1 min-w-max">
            {officialNavItems.map((item) => {
              const active = officialSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectOfficialSection?.(item.id)}
                  className={`min-h-[38px] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] whitespace-nowrap inline-flex items-center gap-1 ${
                    active ? 'bg-[var(--crimson)] text-[var(--on-crimson)]' : 'text-[var(--ink-2)]'
                  }`}
                >
                  <span>{item.label}</span>
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span className="font-mono font-bold">({item.badge})</span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
