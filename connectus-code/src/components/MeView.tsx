import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Building2,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  ExternalLink,
  LogIn,
  LogOut,
  MapPin,
  Plus,
  PlusCircle,
  Settings,
  SlidersHorizontal,
  Sparkles,
  User as UserIcon,
  X,
} from 'lucide-react';
import type {
  Area,
  CampusSurvey,
  College,
  EventMode,
  FeedEvent,
  NotificationItem,
  StudentProfile,
  SurveyResponse,
} from '../types';
import { formatIstDate } from '../utils/format';
import { evaluateStudentEventMatch, PRESET_SKILLS } from '../utils/skills';

interface MeViewProps {
  student: StudentProfile;
  firebaseUser: User | null;
  events: FeedEvent[];
  colleges: College[];
  areas: Area[];
  notifications: NotificationItem[];
  surveys?: CampusSurvey[];
  surveyResponses?: SurveyResponse[];
  canAccessOfficials: boolean;
  canAccessMyClub?: boolean;
  onEditProfile: () => void;
  onOpenSettings: (tab?: 'account' | 'notifications' | 'privacy' | 'accessibility') => void;
  onSaveDetails: (updates: Partial<StudentProfile>) => Promise<void>;
  onOpenPreferences: () => void;
  onOpenTelegram: () => void;
  onOpenSuggest: () => void;
  onOpenLogin: () => void;
  onOpenSignUp: () => void;
  onSignOut: () => Promise<void>;
  onSelectEvent: (event: FeedEvent) => void;
  onOpenDiscover: () => void;
  onOpenMyCampus?: () => void;
  onOpenClubStudio?: () => void;
  onOpenOfficialsPortal: () => void;
}

const MODES: EventMode[] = ['In-Person', 'Hybrid', 'Online'];
const AVAILABILITIES: ('Open to All' | 'Weekends' | 'Evenings')[] = [
  'Open to All',
  'Weekends',
  'Evenings',
];
const GRAD_YEARS = ['', '2026', '2027', '2028', '2029', '2030'];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return 'ST';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || /^(javascript|data|vbscript):/i.test(trimmed)) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function MeView({
  student,
  firebaseUser,
  events,
  colleges,
  areas,
  notifications,
  surveys = [],
  surveyResponses = [],
  canAccessOfficials,
  canAccessMyClub = false,
  onEditProfile,
  onOpenSettings,
  onSaveDetails,
  onOpenPreferences,
  onOpenTelegram,
  onOpenSuggest,
  onOpenLogin,
  onOpenSignUp,
  onSignOut,
  onSelectEvent,
  onOpenDiscover,
  onOpenMyCampus,
  onOpenClubStudio,
  onOpenOfficialsPortal,
}: MeViewProps) {

  // Student Skills, Learning Goals & Important Profile Details State
  const [skills, setSkills] = useState<string[]>(student.skills || []);
  const [learningGoals, setLearningGoals] = useState<string[]>(student.learningGoals || []);
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [customGoalInput, setCustomGoalInput] = useState('');

  const [fullNameInput, setFullNameInput] = useState(
    student.displayName && student.displayName !== 'Guest Student' && student.displayName !== 'Student'
      ? student.displayName
      : firebaseUser?.displayName || ''
  );
  const [phoneInput, setPhoneInput] = useState(student.phoneNumber || '');
  const [headline, setHeadline] = useState(student.headline || '');
  const [rollNumber, setRollNumber] = useState(student.rollNumber || '');
  const [graduationYear, setGraduationYear] = useState(student.graduationYear || '');
  const [availability, setAvailability] = useState<'Open to All' | 'Weekends' | 'Evenings'>(
    student.availability || 'Open to All'
  );
  const [preferredModes, setPreferredModes] = useState<EventMode[]>(
    student.preferredModes?.length ? student.preferredModes : ['In-Person', 'Hybrid', 'Online']
  );
  const [bio, setBio] = useState(student.bio || '');
  const [portfolioUrl, setPortfolioUrl] = useState(student.portfolioUrl || '');
  const [githubUrl, setGithubUrl] = useState(student.githubUrl || '');
  const [linkedinUrl, setLinkedinUrl] = useState(student.linkedinUrl || '');
  const [leetcodeUrl, setLeetcodeUrl] = useState(student.leetcodeUrl || '');
  const [hackerrankUrl, setHackerrankUrl] = useState(student.hackerrankUrl || '');
  const [instagramUrl, setInstagramUrl] = useState(student.instagramUrl || '');
  const [linksVisibility, setLinksVisibility] = useState<'public' | 'squads' | 'hidden'>(
    student.profileVisibility?.linksVisibility || 'public'
  );
  const [priorityLowSeatAlerts, setPriorityLowSeatAlerts] = useState(
    student.priorityLowSeatAlerts !== false
  );
  const [teamDiscoveryEnabled, setTeamDiscoveryEnabled] = useState(
    student.teamDiscoveryEnabled !== false
  );
  const [teamCallNotifications, setTeamCallNotifications] = useState(
    student.teamCallNotifications !== false
  );

  const [savingDetails, setSavingDetails] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setSkills(student.skills || []);
    setLearningGoals(student.learningGoals || []);
    setFullNameInput(
      student.displayName && student.displayName !== 'Guest Student' && student.displayName !== 'Student'
        ? student.displayName
        : firebaseUser?.displayName || ''
    );
    setPhoneInput(student.phoneNumber || '');
    setHeadline(student.headline || '');
    setRollNumber(student.rollNumber || '');
    setGraduationYear(student.graduationYear || '');
    setAvailability(student.availability || 'Open to All');
    setPreferredModes(
      student.preferredModes?.length ? student.preferredModes : ['In-Person', 'Hybrid', 'Online']
    );
    setBio(student.bio || '');
    setPortfolioUrl(student.portfolioUrl || '');
    setGithubUrl(student.githubUrl || '');
    setLinkedinUrl(student.linkedinUrl || '');
    setLeetcodeUrl(student.leetcodeUrl || '');
    setHackerrankUrl(student.hackerrankUrl || '');
    setInstagramUrl(student.instagramUrl || '');
    setLinksVisibility(student.profileVisibility?.linksVisibility || 'public');
    setPriorityLowSeatAlerts(student.priorityLowSeatAlerts !== false);
    setTeamDiscoveryEnabled(student.teamDiscoveryEnabled !== false);
    setTeamCallNotifications(student.teamCallNotifications !== false);
  }, [student, firebaseUser?.displayName]);

  const homeCollege = useMemo(
    () =>
      student.collegeId && student.collegeId !== 'other'
        ? colleges.find((c) => c.id === student.collegeId) || null
        : null,
    [colleges, student.collegeId]
  );

  const collegeDisplay =
    homeCollege?.name ||
    student.customCollegeName?.trim() ||
    'No campus selected yet';

  const currentArea = useMemo(
    () => areas.find((a) => a.id === student.areaId) || areas[0],
    [areas, student.areaId]
  );

  const followedShortNames = useMemo(() => {
    return student.followedCollegeIds
      .map((id) => colleges.find((c) => c.id === id)?.shortName)
      .filter((x): x is string => Boolean(x));
  }, [student.followedCollegeIds, colleges]);

  const pendingCampusSurveys = useMemo(() => {
    const respondedIds = new Set(surveyResponses.map((r) => r.surveyId));
    return surveys.filter(
      (s) =>
        s.status === 'active' &&
        (student.collegeId === 'other' || s.collegeId === student.collegeId) &&
        !respondedIds.has(s.id)
    );
  }, [surveys, surveyResponses, student.collegeId]);

  const queuedNotifsCount = useMemo(
    () =>
      notifications.filter(
        (n) => n.status === 'queued' || n.status === 'held_quiet_hours'
      ).length,
    [notifications]
  );

  // Live preview of curated events based on the student's draft skills & learning goals
  const liveCuratedMatches = useMemo(() => {
    if (skills.length === 0 && learningGoals.length === 0) return [];
    return events
      .filter((e) => e.status === 'published' && e.regStatus === 'open')
      .map((evt) => {
        const match = evaluateStudentEventMatch(
          { skills, learningGoals, preferredModes },
          evt
        );
        return { evt, match };
      })
      .filter(
        ({ match }) => match.matchedSkills.length > 0 || match.matchedGoals.length > 0
      )
      .sort((a, b) => b.match.skillBoost - a.match.skillBoost)
      .slice(0, 3);
  }, [events, skills, learningGoals, preferredModes]);

  function toggleSkill(label: string) {
    setSaveMessage(null);
    setSkills((prev) => {
      if (prev.includes(label)) {
        return prev.filter((item) => item !== label);
      }
      if (prev.length >= 15) return prev;
      return [...prev, label];
    });
  }

  function addCustomSkill() {
    const clean = customSkillInput.trim().slice(0, 60);
    if (!clean) return;
    setSaveMessage(null);
    setSkills((prev) => {
      if (prev.some((s) => s.toLowerCase() === clean.toLowerCase()) || prev.length >= 15) {
        return prev;
      }
      return [...prev, clean];
    });
    setCustomSkillInput('');
  }

  function toggleGoal(label: string) {
    setSaveMessage(null);
    setLearningGoals((prev) => {
      if (prev.includes(label)) {
        return prev.filter((item) => item !== label);
      }
      if (prev.length >= 15) return prev;
      return [...prev, label];
    });
  }

  function addCustomGoal() {
    const clean = customGoalInput.trim().slice(0, 60);
    if (!clean) return;
    setSaveMessage(null);
    setLearningGoals((prev) => {
      if (prev.some((s) => s.toLowerCase() === clean.toLowerCase()) || prev.length >= 15) {
        return prev;
      }
      return [...prev, clean];
    });
    setCustomGoalInput('');
  }

  function togglePreferredMode(mode: EventMode) {
    setSaveMessage(null);
    setPreferredModes((prev) => {
      if (prev.includes(mode)) {
        return prev.length > 1 ? prev.filter((m) => m !== mode) : prev;
      }
      return [...prev, mode];
    });
  }

  async function handleSaveStudentDetails(e: React.FormEvent) {
    e.preventDefault();
    setSavingDetails(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      await onSaveDetails({
        ...(fullNameInput.trim() ? { displayName: fullNameInput.trim() } : {}),
        phoneNumber: phoneInput.trim(),
        skills,
        learningGoals,
        headline: headline.trim(),
        rollNumber: rollNumber.trim(),
        graduationYear: graduationYear.trim(),
        availability,
        preferredModes,
        bio: bio.trim(),
        portfolioUrl: portfolioUrl.trim(),
        githubUrl: githubUrl.trim(),
        linkedinUrl: linkedinUrl.trim(),
        leetcodeUrl: leetcodeUrl.trim(),
        hackerrankUrl: hackerrankUrl.trim(),
        instagramUrl: instagramUrl.trim(),
        profileVisibility: {
          linksVisibility,
          discoverableInTeams: teamDiscoveryEnabled,
          showAcademicYear: student.profileVisibility?.showAcademicYear !== false,
        },
        priorityLowSeatAlerts,
        teamDiscoveryEnabled,
        teamCallNotifications,
      });
      setSaveMessage(
        'Saved. Your Discover feed is now curated around these skills and priority alerts are active.'
      );
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save details.');
    } finally {
      setSavingDetails(false);
    }
  }

  const avatarSrc = student.photoUrl || firebaseUser?.photoURL || '';
  const displayName = student.displayName || firebaseUser?.displayName || 'Guest Student';

  const customAddedSkills = skills.filter(
    (s) => !PRESET_SKILLS.some((p) => p.label === s)
  );
  const customAddedGoals = learningGoals.filter(
    (s) => !PRESET_SKILLS.some((p) => p.label === s)
  );

  return (
    <div className="space-y-6">
      {/* Personal Identity Card */}
      <section className="paper-card p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 min-w-0">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={displayName}
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-[14px] object-cover border border-[var(--border-ink)] shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-[14px] bg-[var(--ink)] text-[var(--on-ink)] font-display font-extrabold text-lg flex items-center justify-center shrink-0">
              {getInitials(displayName)}
            </div>
          )}

          <div className="min-w-0 space-y-1.5">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-[-0.04em] leading-tight text-[var(--ink)] truncate">
              {displayName}
            </h1>
            {student.headline && (
              <p className="text-sm font-medium text-[var(--ink)]">
                {student.headline}
              </p>
            )}
            <div className="text-xs sm:text-sm text-[var(--ink-2)] flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-medium text-[var(--ink)]">
                {student.course || 'B.Tech'} · {student.branch || 'CSE'} · {student.year || '1st Year'}
              </span>
              {student.rollNumber && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-xs tabular-nums">ID {student.rollNumber}</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span>{collegeDisplay}</span>
              {student.collegeVerified && (
                <span className="inline-flex items-center gap-1 text-[var(--olive)] font-semibold text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified Campus Email</span>
                </span>
              )}
            </div>
            <div className="text-xs text-[var(--ink-2)] font-mono flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>{student.email || firebaseUser?.email || 'Not signed in'}</span>
              {student.phoneNumber && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{student.phoneNumber}</span>
                </>
              )}
              {student.portfolioUrl && (
                <>
                  <span aria-hidden="true">·</span>
                  <a
                    href={normalizeUrl(student.portfolioUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--crimson)] hover:underline inline-flex items-center gap-0.5"
                  >
                    <span>Portfolio</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </a>
                </>
              )}
              {student.githubUrl && (
                <>
                  <span aria-hidden="true">·</span>
                  <a
                    href={normalizeUrl(student.githubUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--crimson)] hover:underline inline-flex items-center gap-0.5"
                  >
                    <span>GitHub</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </a>
                </>
              )}
              {student.linkedinUrl && (
                <>
                  <span aria-hidden="true">·</span>
                  <a
                    href={normalizeUrl(student.linkedinUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--crimson)] hover:underline inline-flex items-center gap-0.5"
                  >
                    <span>LinkedIn</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </a>
                </>
              )}
              {student.leetcodeUrl && (
                <>
                  <span aria-hidden="true">·</span>
                  <a
                    href={normalizeUrl(student.leetcodeUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--crimson)] hover:underline inline-flex items-center gap-0.5"
                  >
                    <span>LeetCode</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </a>
                </>
              )}
              {student.hackerrankUrl && (
                <>
                  <span aria-hidden="true">·</span>
                  <a
                    href={normalizeUrl(student.hackerrankUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--crimson)] hover:underline inline-flex items-center gap-0.5"
                  >
                    <span>HackerRank</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </a>
                </>
              )}
              {student.instagramUrl && (
                <>
                  <span aria-hidden="true">·</span>
                  <a
                    href={normalizeUrl(student.instagramUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--crimson)] hover:underline inline-flex items-center gap-0.5"
                  >
                    <span>Instagram</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </a>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span>
                Links:{' '}
                {linksVisibility === 'hidden'
                  ? 'Hidden'
                  : linksVisibility === 'squads'
                    ? 'Squads Only'
                    : 'Public'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onEditProfile}
            className="paper-btn-primary min-h-[40px] px-4 py-2 text-xs sm:text-sm inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <UserIcon className="w-4 h-4 shrink-0" />
            <span>Edit Identity &amp; Campus</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenSettings('account')}
            className="paper-btn-secondary min-h-[40px] px-3.5 py-2 text-xs sm:text-sm inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Settings className="w-4 h-4 shrink-0 text-[var(--crimson)]" />
            <span>Settings</span>
          </button>

          {firebaseUser ? (
            <button
              type="button"
              onClick={onSignOut}
              className="paper-btn-secondary min-h-[40px] px-3.5 py-2 text-xs sm:text-sm inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Sign Out</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onOpenLogin}
                className="paper-btn-secondary min-h-[40px] px-3.5 py-2 text-xs sm:text-sm inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <LogIn className="w-4 h-4 shrink-0" />
                <span>Log In</span>
              </button>
              <button
                type="button"
                onClick={onOpenSignUp}
                className="paper-btn-crimson min-h-[40px] px-3.5 py-2 text-xs sm:text-sm whitespace-nowrap"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </section>

      {/* Skills, Learning Goals & Important Student Details */}
      <section className="paper-card p-6 sm:p-7">
        <form onSubmit={handleSaveStudentDetails} className="space-y-7">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-[var(--border-warm)]">
            <div className="space-y-1 max-w-2xl">
              <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-[-0.03em] text-[var(--ink)]">
                Skills, Learning Goals &amp; Student Details
              </h2>
              <p className="text-xs sm:text-sm text-[var(--ink-2)] leading-relaxed">
                Pick what you already know and what you want to build next. Connectus ranks matching events at the top of Discover and notifies you first when matching seats start filling fast.
              </p>
            </div>
            <button
              type="submit"
              disabled={savingDetails}
              className="paper-btn-crimson min-h-[42px] px-5 py-2 text-xs sm:text-sm uppercase tracking-[0.06em] inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span>{savingDetails ? 'Saving...' : 'Save & Curate Feed'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
            {/* Left 7 Cols: Skills & Learning Goals */}
            <div className="lg:col-span-7 space-y-6">
              {/* Current Skills */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--ink)]">
                    Your Current Skills ({skills.length}/15)
                  </label>
                  <span className="text-xs text-[var(--ink-2)]">
                    Boosts matching events highest
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {PRESET_SKILLS.map((item) => {
                    const active = skills.includes(item.label);
                    return (
                      <button
                        key={`skill-${item.id}`}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleSkill(item.label)}
                        className={`min-h-[34px] px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 border ${
                          active
                            ? 'bg-[var(--ink)] text-[var(--on-ink)] border-[var(--ink)]'
                            : 'bg-[var(--paper)] text-[var(--ink)] border-[var(--border-warm)] hover:border-[var(--ink)]'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                  {customAddedSkills.map((custom) => (
                    <button
                      key={`custom-skill-${custom}`}
                      type="button"
                      onClick={() => toggleSkill(custom)}
                      className="min-h-[34px] px-3 py-1 text-xs font-medium bg-[var(--ink)] text-[var(--on-ink)] border border-[var(--ink)] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <span>{custom}</span>
                      <X className="w-3 h-3" />
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={customSkillInput}
                    onChange={(e) => setCustomSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomSkill();
                      }
                    }}
                    placeholder="Add custom skill (e.g. Figma, Next.js, Motion Design)..."
                    className="paper-input flex-1 min-h-[38px] px-3 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={addCustomSkill}
                    disabled={!customSkillInput.trim() || skills.length >= 15}
                    className="paper-btn-secondary min-h-[38px] px-3.5 py-1.5 text-xs inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Skills You Want To Learn */}
              <div className="pt-5 border-t border-[var(--border-warm)] space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--ink)]">
                    Want to Get Skilled In ({learningGoals.length}/15)
                  </label>
                  <span className="text-xs text-[var(--ink-2)]">
                    Surfaces beginner bootcamps &amp; workshops
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {PRESET_SKILLS.map((item) => {
                    const active = learningGoals.includes(item.label);
                    return (
                      <button
                        key={`goal-${item.id}`}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleGoal(item.label)}
                        className={`min-h-[34px] px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 border ${
                          active
                            ? 'bg-[var(--crimson)] text-[var(--on-crimson)] border-[var(--crimson)]'
                            : 'bg-[var(--paper)] text-[var(--ink)] border-[var(--border-warm)] hover:border-[var(--crimson)]'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                  {customAddedGoals.map((custom) => (
                    <button
                      key={`custom-goal-${custom}`}
                      type="button"
                      onClick={() => toggleGoal(custom)}
                      className="min-h-[34px] px-3 py-1 text-xs font-medium bg-[var(--crimson)] text-[var(--on-crimson)] border border-[var(--crimson)] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <span>{custom}</span>
                      <X className="w-3 h-3" />
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={customGoalInput}
                    onChange={(e) => setCustomGoalInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomGoal();
                      }
                    }}
                    placeholder="Add skill to learn (e.g. Prompt Engineering, Rust, Blender)..."
                    className="paper-input flex-1 min-h-[38px] px-3 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={addCustomGoal}
                    disabled={!customGoalInput.trim() || learningGoals.length >= 15}
                    className="paper-btn-secondary min-h-[38px] px-3.5 py-1.5 text-xs inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Goal</span>
                  </button>
                </div>
              </div>

              {/* Live Curation Preview */}
              <div className="pt-5 border-t border-[var(--border-warm)] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--ink)]">
                    Live Feed Curation Preview
                  </div>
                  <button
                    type="button"
                    onClick={onOpenDiscover}
                    className="text-xs font-semibold text-[var(--crimson)] hover:underline underline-offset-4 inline-flex items-center gap-1"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Open Ranked Discover Feed</span>
                  </button>
                </div>

                {liveCuratedMatches.length === 0 ? (
                  <p className="text-xs text-[var(--ink-2)]">
                    Select any skill or learning goal above (like UI/UX Design, AI / ML, or Robotics) to preview which upcoming campus events move to the top of your feed.
                  </p>
                ) : (
                  <div className="border-t border-[var(--border-warm)] divide-y divide-[var(--border-warm)]">
                    {liveCuratedMatches.map(({ evt, match }) => (
                      <div
                        key={evt.id}
                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="text-xs flex flex-wrap items-center gap-x-2 text-[var(--ink-2)]">
                            <span className="font-semibold text-[var(--crimson)]">
                              {match.matchReason}
                            </span>
                            {match.isFillingFast && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-semibold text-[var(--amber-ink)] inline-flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>{match.urgencyLabel}</span>
                                </span>
                              </>
                            )}
                          </div>
                          <div className="font-display font-bold text-sm text-[var(--ink)] truncate">
                            {evt.title}
                          </div>
                          <div className="text-xs text-[var(--ink-2)] truncate">
                            {evt.collegeShortName} · {formatIstDate(evt.startAt)} · {match.seatsLeft} of {evt.capacity} seats left
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onSelectEvent(evt)}
                          className="paper-btn-secondary min-h-[34px] px-3 py-1 text-xs whitespace-nowrap shrink-0"
                        >
                          Open Event
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right 5 Cols: Career / Academic Student Details */}
            <div className="lg:col-span-5 space-y-4 lg:border-l lg:border-[var(--border-warm)] lg:pl-7">
              <div className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--ink)]">
                Important Student Details
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="me-full-name"
                      className="block text-xs font-semibold text-[var(--ink-2)] mb-1"
                    >
                      Full Name (auto-fills forms)
                    </label>
                    <input
                      id="me-full-name"
                      type="text"
                      maxLength={120}
                      value={fullNameInput}
                      onChange={(e) => {
                        setSaveMessage(null);
                        setFullNameInput(e.target.value);
                      }}
                      placeholder="Your full name"
                      className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="me-phone"
                      className="block text-xs font-semibold text-[var(--ink-2)] mb-1"
                    >
                      Phone / WhatsApp
                    </label>
                    <input
                      id="me-phone"
                      type="tel"
                      maxLength={24}
                      value={phoneInput}
                      onChange={(e) => {
                        setSaveMessage(null);
                        setPhoneInput(e.target.value);
                      }}
                      placeholder="+91 98765 43210"
                      className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm font-mono tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="me-headline"
                    className="block text-xs font-semibold text-[var(--ink-2)] mb-1"
                  >
                    Headline / Role
                  </label>
                  <input
                    id="me-headline"
                    type="text"
                    maxLength={140}
                    value={headline}
                    onChange={(e) => {
                      setSaveMessage(null);
                      setHeadline(e.target.value);
                    }}
                    placeholder="e.g. UI/UX Designer & CS Junior"
                    className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="me-roll"
                      className="block text-xs font-semibold text-[var(--ink-2)] mb-1"
                    >
                      Roll / Hall Ticket No.
                    </label>
                    <input
                      id="me-roll"
                      type="text"
                      maxLength={40}
                      value={rollNumber}
                      onChange={(e) => {
                        setSaveMessage(null);
                        setRollNumber(e.target.value);
                      }}
                      placeholder="Auto-fills event forms"
                      className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="me-grad-year"
                      className="block text-xs font-semibold text-[var(--ink-2)] mb-1"
                    >
                      Graduation Year
                    </label>
                    <select
                      id="me-grad-year"
                      value={graduationYear}
                      onChange={(e) => {
                        setSaveMessage(null);
                        setGraduationYear(e.target.value);
                      }}
                      className="paper-input w-full min-h-[38px] px-3 py-1.5 text-sm"
                    >
                      <option value="">Select year</option>
                      {GRAD_YEARS.filter(Boolean).map((yr) => (
                        <option key={yr} value={yr}>
                          Class of {yr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-xs font-semibold text-[var(--ink-2)]">
                    Preferred Event Format
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {MODES.map((m) => {
                      const active = preferredModes.includes(m);
                      return (
                        <button
                          key={m}
                          type="button"
                          aria-pressed={active}
                          onClick={() => togglePreferredMode(m)}
                          className={`min-h-[34px] px-3 py-1 text-xs font-medium border whitespace-nowrap ${
                            active
                              ? 'bg-[var(--ink)] text-[var(--on-ink)] border-[var(--ink)]'
                              : 'bg-[var(--paper)] text-[var(--ink)] border-[var(--border-warm)] hover:border-[var(--ink)]'
                          }`}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-xs font-semibold text-[var(--ink-2)]">
                    Schedule Availability
                  </span>
                  <div className="paper-segment w-full">
                    {AVAILABILITIES.map((av) => (
                      <button
                        key={av}
                        type="button"
                        aria-pressed={availability === av}
                        onClick={() => {
                          setSaveMessage(null);
                          setAvailability(av);
                        }}
                        className="paper-segment-btn flex-1 min-h-[34px] px-2.5 py-1 text-xs whitespace-nowrap"
                      >
                        {av}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="me-bio"
                    className="block text-xs font-semibold text-[var(--ink-2)] mb-1"
                  >
                    Short Bio / What You Build
                  </label>
                  <textarea
                    id="me-bio"
                    rows={2}
                    maxLength={300}
                    value={bio}
                    onChange={(e) => {
                      setSaveMessage(null);
                      setBio(e.target.value);
                    }}
                    placeholder="Share what projects, hackathons, or roles you bring to a team..."
                    className="paper-input w-full px-3 py-2 text-sm resize-none"
                  />
                </div>

                <div className="space-y-2.5 pt-1">
                  <input
                    type="text"
                    maxLength={200}
                    value={portfolioUrl}
                    onChange={(e) => {
                      setSaveMessage(null);
                      setPortfolioUrl(e.target.value);
                    }}
                    placeholder="Portfolio / Behance / Dribbble URL"
                    aria-label="Portfolio URL"
                    className="paper-input w-full min-h-[36px] px-3 py-1.5 text-xs font-mono"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      maxLength={200}
                      value={githubUrl}
                      onChange={(e) => {
                        setSaveMessage(null);
                        setGithubUrl(e.target.value);
                      }}
                      placeholder="GitHub URL"
                      aria-label="GitHub URL"
                      className="paper-input w-full min-h-[36px] px-3 py-1.5 text-xs font-mono"
                    />
                    <input
                      type="text"
                      maxLength={200}
                      value={linkedinUrl}
                      onChange={(e) => {
                        setSaveMessage(null);
                        setLinkedinUrl(e.target.value);
                      }}
                      placeholder="LinkedIn URL"
                      aria-label="LinkedIn URL"
                      className="paper-input w-full min-h-[36px] px-3 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      type="text"
                      maxLength={200}
                      value={leetcodeUrl}
                      onChange={(e) => {
                        setSaveMessage(null);
                        setLeetcodeUrl(e.target.value);
                      }}
                      placeholder="LeetCode URL"
                      aria-label="LeetCode URL"
                      className="paper-input w-full min-h-[36px] px-3 py-1.5 text-xs font-mono"
                    />
                    <input
                      type="text"
                      maxLength={200}
                      value={hackerrankUrl}
                      onChange={(e) => {
                        setSaveMessage(null);
                        setHackerrankUrl(e.target.value);
                      }}
                      placeholder="HackerRank URL"
                      aria-label="HackerRank URL"
                      className="paper-input w-full min-h-[36px] px-3 py-1.5 text-xs font-mono"
                    />
                    <input
                      type="text"
                      maxLength={200}
                      value={instagramUrl}
                      onChange={(e) => {
                        setSaveMessage(null);
                        setInstagramUrl(e.target.value);
                      }}
                      placeholder="Instagram URL"
                      aria-label="Instagram URL"
                      className="paper-input w-full min-h-[36px] px-3 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                    <span className="text-[11px] font-semibold text-[var(--ink-2)]">
                      Coding/Social Links Visibility
                    </span>
                    <div className="paper-segment">
                      {(
                        [
                          { id: 'public', label: 'Public' },
                          { id: 'squads', label: 'Squads' },
                          { id: 'hidden', label: 'Hidden' },
                        ] as const
                      ).map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          aria-pressed={linksVisibility === v.id}
                          onClick={() => {
                            setSaveMessage(null);
                            setLinksVisibility(v.id);
                          }}
                          className="paper-segment-btn min-h-[28px] px-2.5 py-0.5 text-[11px]"
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2 space-y-2.5 border-t border-[var(--border-warm)]">
                  <label className="flex items-start gap-2.5 text-xs text-[var(--ink)] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={priorityLowSeatAlerts}
                      onChange={(e) => {
                        setSaveMessage(null);
                        setPriorityLowSeatAlerts(e.target.checked);
                      }}
                      className="mt-0.5 accent-[var(--crimson)]"
                    />
                    <span>
                      <strong className="font-semibold">Priority Low-Seat Alerts</strong> — Send urgent Telegram &amp; Me alerts whenever a skill-matched event hits ≥70% booked or ≤15 seats remaining.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 text-xs text-[var(--ink)] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={teamDiscoveryEnabled}
                      onChange={(e) => {
                        setSaveMessage(null);
                        setTeamDiscoveryEnabled(e.target.checked);
                      }}
                      className="mt-0.5 accent-[var(--crimson)]"
                    />
                    <span>
                      <strong className="font-semibold">Teammate Discovery</strong> — Allow fellow students to find my profile in Teams Discover and send me connection requests.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 text-xs text-[var(--ink)] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={teamCallNotifications}
                      onChange={(e) => {
                        setSaveMessage(null);
                        setTeamCallNotifications(e.target.checked);
                      }}
                      className="mt-0.5 accent-[var(--crimson)]"
                    />
                    <span>
                      <strong className="font-semibold">Team-up Call Notifications</strong> — Receive targeted Team-up Calls when students look for teammates matching my skills.
                    </span>
                  </label>

                  <div className="flex flex-wrap items-center justify-between gap-2 pl-6 text-[11px] text-[var(--ink-2)]">
                    <span>
                      Optional private gender &amp; up to 5 languages match appeals without being shown to others.
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenSettings('privacy')}
                      className="font-semibold text-[var(--crimson)] hover:underline underline-offset-4 whitespace-nowrap"
                    >
                      Privacy &amp; Defaults →
                    </button>
                  </div>
                </div>
              </div>

              {saveError && (
                <div className="text-xs font-medium text-[var(--crimson)] border border-[var(--crimson)]/40 px-3 py-2 bg-[var(--feel-tint)]/30">
                  {saveError}
                </div>
              )}
              {saveMessage && (
                <div className="text-xs font-medium text-[var(--olive)] border border-[var(--olive)]/40 px-3 py-2 bg-[var(--paper)] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{saveMessage}</span>
                </div>
              )}
            </div>
          </div>
        </form>
      </section>

      {/* Feed Preferences, Alerts & Portals */}
      <section className="paper-card p-5 sm:p-6 space-y-4">
        <div className="space-y-0.5">
          <h2 className="font-display text-lg font-extrabold tracking-[-0.02em] text-[var(--ink)]">
            Preferences &amp; Alerts
          </h2>
          <p className="text-xs text-[var(--ink-2)]">
            Manage your campus discovery radius, Telegram notifications, and role workspaces.
          </p>
        </div>

        <div className="border-t border-[var(--border-warm)] grid grid-cols-1 md:grid-cols-2 gap-x-8 divide-y md:divide-y-0 divide-[var(--border-warm)]">
          {/* Pending Campus Surveys nudge */}
          {pendingCampusSurveys.length > 0 && onOpenMyCampus && (
            <div className="py-3.5 md:border-b md:border-[var(--border-warm)] flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
                  <ClipboardCheck className="w-3.5 h-3.5 text-[var(--crimson)] shrink-0" />
                  <span>{pendingCampusSurveys.length} Open Campus Survey</span>
                </div>
                <div className="text-xs text-[var(--ink-2)]">
                  Share your event preferences with {homeCollege?.shortName || 'your campus'} Officials.
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenMyCampus}
                className="paper-btn-tint min-h-[34px] px-3 py-1 text-xs shrink-0 whitespace-nowrap"
              >
                Open My Campus
              </button>
            </div>
          )}

          {/* Location & Radius */}
          <div className="py-3.5 md:border-b md:border-[var(--border-warm)] flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[var(--crimson)] shrink-0" />
                <span>Location &amp; Radius</span>
              </div>
              <div className="text-xs text-[var(--ink-2)]">
                {student.locationLabel || currentArea?.name || 'India'} ·{' '}
                <span className="font-mono tabular-nums">{student.radiusKm} km</span> radius
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenPreferences}
              className="paper-btn-secondary min-h-[34px] px-3 py-1 text-xs shrink-0 inline-flex items-center gap-1"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Adjust</span>
            </button>
          </div>

          {/* Interests & Followed Campuses */}
          <div className="py-3.5 md:border-b md:border-[var(--border-warm)] flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="text-xs font-bold text-[var(--ink)]">
                Followed Colleges &amp; Interests
              </div>
              <div className="text-xs text-[var(--ink-2)] leading-relaxed">
                {followedShortNames.length > 0
                  ? `Following ${followedShortNames.slice(0, 4).join(', ')}${
                      followedShortNames.length > 4
                        ? ` +${followedShortNames.length - 4}`
                        : ''
                    }`
                  : 'No followed colleges yet'}
                {' · '}
                {student.interests.length > 0
                  ? student.interests.join(', ')
                  : 'All event types'}
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenPreferences}
              className="paper-btn-secondary min-h-[34px] px-3 py-1 text-xs shrink-0"
            >
              Edit
            </button>
          </div>

          {/* Telegram Bot */}
          <div className="py-3.5 md:border-b md:border-[var(--border-warm)] flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-[var(--crimson)] shrink-0" />
                <span>Telegram Alerts (@ConnectusBot)</span>
              </div>
              <div className="text-xs text-[var(--ink-2)]">
                {student.telegramConnected ? 'Connected' : 'Not linked yet'} · Quiet{' '}
                <span className="font-mono tabular-nums">
                  {student.quietHours.enabled
                    ? `${student.quietHours.start}–${student.quietHours.end}`
                    : 'Off'}
                </span>
                {queuedNotifsCount > 0 && ` · ${queuedNotifsCount} queued`}
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenTelegram}
              className="paper-btn-tint min-h-[34px] px-3 py-1 text-xs shrink-0 whitespace-nowrap"
            >
              Open Bot
            </button>
          </div>

          {/* Suggest Missing Event */}
          <div className="py-3.5 flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
                <PlusCircle className="w-3.5 h-3.5 text-[var(--crimson)] shrink-0" />
                <span>Spotted a Missing Poster?</span>
              </div>
              <div className="text-xs text-[var(--ink-2)]">
                Submit a campus hackathon, workshop, or fest to the student feed.
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenSuggest}
              className="paper-btn-secondary min-h-[34px] px-3 py-1 text-xs shrink-0 whitespace-nowrap"
            >
              Suggest Event
            </button>
          </div>
        </div>

        {/* Conditional Role Workspaces (Hidden from regular students) */}
        {(canAccessMyClub || canAccessOfficials) && (
          <div className="pt-4 border-t border-[var(--border-warm)] space-y-2.5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
              Authorized Role Workspaces
            </div>
            <div className="flex flex-wrap gap-2">
              {canAccessMyClub && onOpenClubStudio && (
                <button
                  type="button"
                  onClick={onOpenClubStudio}
                  className="paper-btn-crimson min-h-[36px] px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Club Leader Studio</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
              {canAccessOfficials && (
                <button
                  type="button"
                  onClick={onOpenOfficialsPortal}
                  className="paper-btn-secondary min-h-[36px] px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
                >
                  <Building2 className="w-3.5 h-3.5 text-[var(--crimson)]" />
                  <span>Officials Studio</span>
                  <ExternalLink className="w-3 h-3 text-[var(--ink-2)]" />
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
