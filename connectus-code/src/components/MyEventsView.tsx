import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRightLeft,
  Bell,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  Film,
  LayoutGrid,
  Lock,
  PlusCircle,
  Search,
  ShieldCheck,
} from 'lucide-react';
import type {
  Area,
  CampusAnnouncement,
  CampusSurvey,
  College,
  EventType,
  FeedEvent,
  StudentProfile,
  SurveyResponse,
} from '../types';
import { formatIstFull } from '../utils/format';
import { focusAndFollowTarget } from '../utils/scroll';
import { EventPosterCard } from './EventPosterCard';
import { ReelsViewer } from './ReelsViewer';

interface MyEventsViewProps {
  events: FeedEvent[];
  campusEvents?: FeedEvent[];
  announcements?: CampusAnnouncement[];
  surveys?: CampusSurvey[];
  surveyResponses?: SurveyResponse[];
  colleges: College[];
  areas: Area[];
  student: StudentProfile;
  onSelectEvent: (event: FeedEvent) => void;
  onToggleFollow: (collegeId: string) => Promise<void>;
  onToggleSave: (eventId: string) => Promise<void>;
  onSelectStudentCollege: (collegeId: string) => Promise<void>;
  onSubmitSurveyResponse?: (
    surveyId: string,
    payload: { selectedOption?: string; responseText: string; isAnonymous: boolean }
  ) => Promise<void>;
  onOpenProfile: () => void;
  onOpenSuggest: () => void;
  onOpenDiscover: () => void;
}

const CAMPUS_EVENT_TYPES: ('All' | EventType)[] = [
  'All',
  'Hackathon',
  'Workshop',
  'Competition',
  'Cultural',
  'Talk',
  'Meetup',
];

export function MyEventsView({
  events,
  campusEvents,
  announcements = [],
  surveys = [],
  surveyResponses = [],
  colleges,
  areas,
  student,
  onSelectEvent,
  onToggleFollow,
  onToggleSave,
  onSelectStudentCollege,
  onSubmitSurveyResponse,
  onOpenProfile,
  onOpenSuggest,
  onOpenDiscover,
}: MyEventsViewProps) {
  const [campusTypeFilter, setCampusTypeFilter] = useState<'All' | EventType>('All');
  const [campusSearch, setCampusSearch] = useState('');
  const [onlyExclusives, setOnlyExclusives] = useState(false);
  const [campusViewMode, setCampusViewMode] = useState<'grid' | 'reels'>('grid');
  const [focusedReelId, setFocusedReelId] = useState<string | null>(null);

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [switcherQuery, setSwitcherQuery] = useState('');
  const [switcherTier, setSwitcherTier] = useState<'All' | 'Tier 1' | 'Tier 2' | 'Tier 3'>('All');
  const [switchingCollegeId, setSwitchingCollegeId] = useState<string | null>(null);

  // Campus Survey inline draft state
  const [surveyChoiceById, setSurveyChoiceById] = useState<Record<string, string>>({});
  const [surveyTextById, setSurveyTextById] = useState<Record<string, string>>({});
  const [surveyAnonById, setSurveyAnonById] = useState<Record<string, boolean>>({});
  const [surveyBusyId, setSurveyBusyId] = useState<string | null>(null);
  const [surveyFeedbackById, setSurveyFeedbackById] = useState<Record<string, string>>({});

  const campusFeedRef = useRef<HTMLElement | null>(null);

  const activeCollege = useMemo(
    () =>
      student.collegeId && student.collegeId !== 'other'
        ? colleges.find((c) => c.id === student.collegeId) || null
        : null,
    [colleges, student.collegeId]
  );

  const activeCollegeArea = useMemo(
    () => (activeCollege ? areas.find((a) => a.id === activeCollege.areaId) || null : null),
    [areas, activeCollege]
  );

  const customCollegeTrimmed = (student.customCollegeName || '').trim();
  const hasSelectedCollege = Boolean(activeCollege || customCollegeTrimmed);
  const fullCollegeName =
    activeCollege?.name || customCollegeTrimmed || 'Select Your College Campus';
  const shortCollegeName =
    activeCollege?.shortName || customCollegeTrimmed || 'My Campus';
  const isFollowingMyCollege = activeCollege
    ? student.followedCollegeIds.includes(activeCollege.id)
    : false;

  // ALL own-college published events (uses server /api/campus-events list if provided, never hidden by eligibility)
  const sourcePool = campusEvents && campusEvents.length > 0 ? campusEvents : events;
  const collegeEvents = useMemo(() => {
    if (activeCollege) {
      return sourcePool.filter((e) => e.collegeId === activeCollege.id);
    }
    if (customCollegeTrimmed) {
      const normalized = customCollegeTrimmed.toLowerCase();
      return sourcePool.filter(
        (e) =>
          e.collegeName.toLowerCase() === normalized ||
          e.collegeShortName.toLowerCase() === normalized ||
          e.collegeName.toLowerCase().includes(normalized)
      );
    }
    return [];
  }, [sourcePool, activeCollege, customCollegeTrimmed]);

  const filteredCollegeEvents = useMemo(() => {
    const q = campusSearch.trim().toLowerCase();
    return collegeEvents.filter((e) => {
      if (campusTypeFilter !== 'All' && e.type !== campusTypeFilter) return false;
      if (onlyExclusives && e.audience !== 'host_college_only') return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.clubName.toLowerCase().includes(q) ||
        e.venueName.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q) ||
        Boolean(e.coordinatorContact?.name?.toLowerCase().includes(q))
      );
    });
  }, [collegeEvents, campusTypeFilter, onlyExclusives, campusSearch]);

  const collegeReelCount = useMemo(
    () => collegeEvents.filter((e) => Boolean(e.promoVideoUrl)).length,
    [collegeEvents]
  );

  const campusAnnouncements = useMemo(() => {
    if (!activeCollege) return [];
    return [...announcements]
      .filter((a) => a.collegeId === activeCollege.id)
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [announcements, activeCollege]);

  const activeCampusSurveys = useMemo(() => {
    if (!activeCollege) return [];
    return surveys
      .filter((s) => s.collegeId === activeCollege.id && s.status === 'active')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [surveys, activeCollege]);

  const switcherColleges = useMemo(() => {
    const q = switcherQuery.trim().toLowerCase();
    return colleges.filter((col) => {
      if (switcherTier !== 'All' && col.tier !== switcherTier) return false;
      if (!q) return true;
      const areaName = areas.find((a) => a.id === col.areaId)?.name.toLowerCase() || '';
      return (
        col.name.toLowerCase().includes(q) ||
        col.shortName.toLowerCase().includes(q) ||
        col.emailDomain.toLowerCase().includes(q) ||
        areaName.includes(q)
      );
    });
  }, [colleges, areas, switcherQuery, switcherTier]);

  async function handleChooseCampus(collegeId: string) {
    setSwitchingCollegeId(collegeId);
    try {
      await onSelectStudentCollege(collegeId);
      setSwitcherOpen(false);
      setSwitcherQuery('');
      setCampusTypeFilter('All');
      setOnlyExclusives(false);
      setCampusSearch('');
      focusAndFollowTarget(campusFeedRef.current, {
        block: 'start',
        highlight: true,
        focusInput: false,
        delayMs: 90,
      });
    } finally {
      setSwitchingCollegeId(null);
    }
  }

  async function handleSubmitSurvey(survey: CampusSurvey) {
    if (!onSubmitSurveyResponse) return;
    const selectedOption = surveyChoiceById[survey.id] || undefined;
    const responseText = (surveyTextById[survey.id] || '').trim();
    const isAnonymous = Boolean(surveyAnonById[survey.id]);
    if (!selectedOption && !responseText) {
      setSurveyFeedbackById((prev) => ({
        ...prev,
        [survey.id]: 'Select an option or write a short response before submitting.',
      }));
      return;
    }
    setSurveyBusyId(survey.id);
    setSurveyFeedbackById((prev) => {
      const next = { ...prev };
      delete next[survey.id];
      return next;
    });
    try {
      await onSubmitSurveyResponse(survey.id, {
        selectedOption,
        responseText: responseText || selectedOption || '',
        isAnonymous: survey.allowAnonymous ? isAnonymous : false,
      });
      setSurveyTextById((prev) => ({ ...prev, [survey.id]: '' }));
      setSurveyFeedbackById((prev) => ({
        ...prev,
        [survey.id]: 'Response saved. Thank you for helping shape campus events.',
      }));
    } catch (err) {
      setSurveyFeedbackById((prev) => ({
        ...prev,
        [survey.id]: err instanceof Error ? err.message : 'Could not submit survey response.',
      }));
    } finally {
      setSurveyBusyId(null);
    }
  }

  const showCampusSwitcherPanel = switcherOpen || !hasSelectedCollege;

  return (
    <div className="space-y-6">
      {/* Top Respective College Header Banner */}
      <section className="paper-card p-6 sm:p-7 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="space-y-2 min-w-0 max-w-3xl">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-[-0.04em] leading-tight text-[var(--ink)] text-balance">
              {fullCollegeName}
            </h1>

            {hasSelectedCollege ? (
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-[var(--ink-2)]">
                {activeCollege && (
                  <>
                    <span>{activeCollegeArea?.name || 'India'}</span>
                    <span aria-hidden="true">·</span>
                  </>
                )}
                {student.collegeVerified ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-[var(--olive)]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verified Campus Email</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-medium text-[var(--amber-ink)]">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Browse All · Verify email for host-only registration</span>
                  </span>
                )}
                <span aria-hidden="true">·</span>
                <span className="font-mono text-xs text-[var(--ink)] tabular-nums">
                  {collegeEvents.length} {collegeEvents.length === 1 ? 'event' : 'events'}
                </span>
              </div>
            ) : (
              <p className="text-[15px] font-light text-[var(--ink-2)] leading-relaxed">
                Pick your college below to browse events hosted by your campus.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {activeCollege && (
              <button
                type="button"
                onClick={() => void onToggleFollow(activeCollege.id)}
                className={`min-h-[40px] px-3.5 py-2 text-xs uppercase tracking-[0.05em] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  isFollowingMyCollege ? 'paper-btn-tint' : 'paper-btn-secondary'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>
                  {isFollowingMyCollege
                    ? `Following ${activeCollege.shortName}`
                    : `Follow ${activeCollege.shortName}`}
                </span>
              </button>
            )}

            <button
              type="button"
              aria-expanded={showCampusSwitcherPanel}
              onClick={() => setSwitcherOpen((v) => !v)}
              className="paper-btn-secondary min-h-[40px] px-3.5 py-2 text-xs uppercase tracking-[0.05em] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-[var(--crimson)]" />
              <span>{hasSelectedCollege ? 'Switch Campus' : 'Choose Campus'}</span>
            </button>
          </div>
        </div>

        {/* Single Unified Campus Switcher & Follow Panel */}
        <AnimatePresence initial={false}>
          {showCampusSwitcherPanel && (
            <motion.div
              key="campus-switcher-panel"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="pt-4 border-t border-[var(--border-warm)] space-y-3"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink)]">
                  Select Campus &amp; Follow ({switcherColleges.length})
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="paper-segment">
                    {(['All', 'Tier 1', 'Tier 2', 'Tier 3'] as const).map((tier) => (
                      <button
                        key={tier}
                        type="button"
                        aria-pressed={switcherTier === tier}
                        onClick={() => setSwitcherTier(tier)}
                        className="paper-segment-btn min-h-[32px] px-2.5 py-1 text-xs whitespace-nowrap"
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-[var(--ink-2)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="search"
                      value={switcherQuery}
                      onChange={(e) => setSwitcherQuery(e.target.value)}
                      placeholder="Search college or city..."
                      aria-label="Search colleges to set as my campus"
                      className="paper-input w-full min-h-[36px] pl-8 pr-3 py-1.5 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 max-h-[260px] overflow-y-auto pr-1">
                {switcherColleges.map((col) => {
                  const isSelected = activeCollege?.id === col.id;
                  const isFollowed = student.followedCollegeIds.includes(col.id);
                  const area = areas.find((a) => a.id === col.areaId);
                  const eventCountForCol = sourcePool.filter((e) => e.collegeId === col.id).length;
                  const isSaving = switchingCollegeId === col.id;
                  return (
                    <div
                      key={col.id}
                      className={`p-3 border flex flex-col justify-between gap-2 ${
                        isSelected
                          ? 'bg-[var(--crimson-soft)] border-[var(--crimson)]'
                          : 'bg-[var(--paper-raised)] border-[var(--border-warm)]'
                      }`}
                    >
                      <button
                        type="button"
                        disabled={Boolean(switchingCollegeId)}
                        onClick={() => void handleChooseCampus(col.id)}
                        className="text-left space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-display text-xs font-extrabold text-[var(--ink)] truncate">
                            {col.shortName}
                          </span>
                          <span className="font-mono text-[11px] tabular-nums text-[var(--crimson)] shrink-0">
                            {isSaving
                              ? 'Saving...'
                              : `${eventCountForCol} ${eventCountForCol === 1 ? 'event' : 'events'}`}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-[var(--ink)] line-clamp-1">
                          {col.name}
                        </div>
                        <div className="text-[11px] text-[var(--ink-2)] truncate">
                          {col.tier} · {area?.name || 'India'}
                        </div>
                      </button>

                      <div className="pt-1.5 border-t border-[var(--border-warm)] flex items-center justify-between gap-2">
                        <button
                          type="button"
                          disabled={Boolean(switchingCollegeId)}
                          onClick={() => {
                            if (!isSelected) void handleChooseCampus(col.id);
                          }}
                          className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--crimson)] hover:underline disabled:opacity-60"
                        >
                          {isSelected ? 'Active Campus' : 'Set Campus'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void onToggleFollow(col.id)}
                          className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--ink-2)] hover:text-[var(--ink)]"
                        >
                          {isFollowed ? 'Following' : 'Follow'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Action Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)] tabular-nums">
          Campus Events ({collegeEvents.length})
        </div>

        <button
          type="button"
          onClick={onOpenSuggest}
          className="paper-btn-secondary min-h-[38px] px-3.5 py-1.5 text-xs uppercase tracking-[0.05em] inline-flex items-center gap-1.5 whitespace-nowrap"
        >
          <PlusCircle className="w-3.5 h-3.5 text-[var(--crimson)]" />
          <span>Suggest Event</span>
        </button>
      </div>

      <section ref={campusFeedRef} className="cp-scroll-target space-y-5 rounded-[18px]">
        {/* Campus Official Announcements */}
        {hasSelectedCollege && campusAnnouncements.length > 0 && (
          <div className="paper-card-soft p-4 sm:p-5 border border-[var(--border-ink)] space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--crimson)] flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5" />
              <span>Campus Official Notice Board ({campusAnnouncements.length})</span>
            </div>
            <div className="divide-y divide-[var(--border-warm)]">
              {campusAnnouncements.slice(0, 3).map((ann) => (
                <div key={ann.id} className="py-2.5 first:pt-0 last:pb-0 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-display font-bold text-sm text-[var(--ink)]">
                      {ann.pinned ? 'Pinned · ' : ''}
                      {ann.title}
                    </span>
                    <span className="text-[11px] font-mono text-[var(--ink-2)] tabular-nums">
                      {formatIstFull(ann.createdAt)} IST
                    </span>
                  </div>
                  <p className="text-xs text-[var(--ink-2)] leading-relaxed">{ann.body}</p>
                  <div className="text-[11px] font-mono text-[var(--ink-2)]">
                    {ann.authorName}
                    {ann.authorDesignation ? ` · ${ann.authorDesignation}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Campus Surveys from Campus Official */}
        {hasSelectedCollege && activeCampusSurveys.length > 0 && (
          <div className="paper-card p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--crimson)] flex items-center gap-1.5">
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>Campus Feedback Surveys ({activeCampusSurveys.length})</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {activeCampusSurveys.map((survey) => {
                const existingResp = surveyResponses.find(
                  (r) => r.surveyId === survey.id && r.userId === student.id
                );
                const selectedChoice = surveyChoiceById[survey.id] || '';
                const textVal = surveyTextById[survey.id] || '';
                const isAnon = Boolean(surveyAnonById[survey.id]);
                const busy = surveyBusyId === survey.id;
                const feedbackNote = surveyFeedbackById[survey.id];

                return (
                  <div
                    key={survey.id}
                    className="p-4 rounded-[12px] border border-[var(--border-ink)] bg-[var(--paper-raised)] space-y-3"
                  >
                    <div className="space-y-1">
                      <h3 className="font-display text-base font-extrabold text-[var(--ink)]">
                        {survey.title}
                      </h3>
                      {survey.description && (
                        <p className="text-xs text-[var(--ink-2)]">{survey.description}</p>
                      )}
                      <p className="text-xs font-semibold text-[var(--ink)] pt-1">
                        {survey.questionPrompt}
                      </p>
                    </div>

                    {existingResp ? (
                      <div className="p-3 rounded-[10px] border border-[var(--olive-border)] bg-[var(--olive-tint)] text-xs space-y-1">
                        <div className="font-semibold text-[var(--olive)] flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>
                            Response submitted {existingResp.isAnonymous ? '(Anonymously)' : ''}
                          </span>
                        </div>
                        {existingResp.selectedOption && (
                          <div className="text-[var(--ink)]">
                            Choice: <strong>{existingResp.selectedOption}</strong>
                          </div>
                        )}
                        {existingResp.responseText &&
                          existingResp.responseText !== existingResp.selectedOption && (
                            <div className="text-[var(--ink-2)]">{existingResp.responseText}</div>
                          )}
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {survey.options && survey.options.length > 0 && (
                          <div className="space-y-1.5">
                            {survey.options.map((opt) => (
                              <label
                                key={opt}
                                className="flex items-center gap-2 text-xs text-[var(--ink)] cursor-pointer"
                              >
                                <input
                                  type="radio"
                                  name={`survey-${survey.id}`}
                                  checked={selectedChoice === opt}
                                  onChange={() =>
                                    setSurveyChoiceById((prev) => ({ ...prev, [survey.id]: opt }))
                                  }
                                  className="accent-[var(--crimson)]"
                                />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        <textarea
                          rows={2}
                          value={textVal}
                          onChange={(e) =>
                            setSurveyTextById((prev) => ({
                              ...prev,
                              [survey.id]: e.target.value,
                            }))
                          }
                          placeholder="Share your suggestions, preferred topics, or feedback..."
                          className="paper-input w-full px-3 py-2 text-xs resize-none"
                        />

                        <div className="flex flex-wrap items-center justify-between gap-2">
                          {survey.allowAnonymous ? (
                            <label className="flex items-center gap-1.5 text-[11px] text-[var(--ink-2)] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isAnon}
                                onChange={(e) =>
                                  setSurveyAnonById((prev) => ({
                                    ...prev,
                                    [survey.id]: e.target.checked,
                                  }))
                                }
                                className="accent-[var(--crimson)]"
                              />
                              <span>Submit anonymously</span>
                            </label>
                          ) : (
                            <span />
                          )}

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleSubmitSurvey(survey)}
                            className="paper-btn-primary min-h-[34px] px-3.5 py-1 text-xs"
                          >
                            {busy ? 'Submitting...' : 'Submit Survey'}
                          </button>
                        </div>

                        {feedbackNote && (
                          <div className="text-[11px] font-medium text-[var(--crimson)]">
                            {feedbackNote}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Verification nudge for unverified accounts at a known college */}
        {activeCollege && !student.collegeVerified && (
          <div className="paper-card-soft p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs sm:text-sm text-[var(--ink-2)] leading-relaxed">
              Every event hosted by{' '}
              <strong className="text-[var(--ink)]">{activeCollege.name}</strong> is visible below,
              including branch/year-specific or host-only workshops. Verify your{' '}
              <span className="font-mono font-semibold text-[var(--ink)]">
                @{activeCollege.emailDomain}
              </span>{' '}
              email when you want to register for host-college-only events.
            </div>
            <button
              type="button"
              onClick={onOpenProfile}
              className="paper-btn-secondary min-h-[36px] px-3 py-1.5 text-xs whitespace-nowrap shrink-0"
            >
              Verify Campus Email
            </button>
          </div>
        )}

        {/* Campus-scoped filters */}
        {hasSelectedCollege && collegeEvents.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-[var(--ink-2)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={campusSearch}
                  onChange={(e) => setCampusSearch(e.target.value)}
                  placeholder={`Search ${shortCollegeName} events, clubs, halls, or coordinators...`}
                  aria-label={`Search events at ${fullCollegeName}`}
                  className="paper-input w-full min-h-[42px] pl-10 pr-3.5 py-2 text-sm"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  aria-pressed={onlyExclusives}
                  onClick={() => setOnlyExclusives((v) => !v)}
                  className={`min-h-[40px] px-3.5 py-1.5 text-xs uppercase tracking-[0.05em] whitespace-nowrap shrink-0 ${
                    onlyExclusives ? 'paper-btn-ink' : 'paper-btn-secondary'
                  }`}
                >
                  Host Exclusives Only
                </button>

                {collegeReelCount > 0 && (
                  <div className="paper-segment">
                    <button
                      type="button"
                      aria-pressed={campusViewMode === 'grid'}
                      onClick={() => setCampusViewMode('grid')}
                      className="paper-segment-btn min-h-[32px] px-2.5 py-1 text-xs uppercase tracking-[0.05em] inline-flex items-center gap-1 whitespace-nowrap"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Grid</span>
                    </button>
                    <button
                      type="button"
                      aria-pressed={campusViewMode === 'reels'}
                      onClick={() => setCampusViewMode('reels')}
                      className="paper-segment-btn min-h-[32px] px-2.5 py-1 text-xs uppercase tracking-[0.05em] inline-flex items-center gap-1 whitespace-nowrap"
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span>Reels ({collegeReelCount})</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="paper-segment overflow-x-auto max-w-full">
                {CAMPUS_EVENT_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={campusTypeFilter === type}
                    onClick={() => setCampusTypeFilter(type)}
                    className="paper-segment-btn min-h-[32px] px-3 py-1 text-xs uppercase tracking-[0.05em] whitespace-nowrap shrink-0"
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div className="text-[11px] font-semibold uppercase tracking-[0.10em] text-[var(--ink-2)] tabular-nums shrink-0">
                {filteredCollegeEvents.length} of {collegeEvents.length}{' '}
                {collegeEvents.length === 1 ? 'event' : 'events'}
              </div>
            </div>
          </div>
        )}

        {/* Campus Events Content */}
        {!hasSelectedCollege ? (
          <div className="paper-card p-10 text-center space-y-3">
            <Building2 className="w-8 h-8 text-[var(--crimson)] mx-auto" />
            <h2 className="font-display text-xl font-extrabold tracking-[-0.03em] text-[var(--ink)]">
              Choose Your Respective College Above
            </h2>
            <p className="text-sm font-light text-[var(--ink-2)] max-w-lg mx-auto">
              Once you pick your college above, My Campus displays every published event hosted by
              your institution — open and department-restricted alike.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onOpenDiscover}
                className="paper-btn-secondary min-h-[40px] px-4 py-2 text-xs uppercase tracking-[0.05em] inline-flex items-center gap-1.5"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Browse All-India Discover</span>
              </button>
            </div>
          </div>
        ) : collegeEvents.length === 0 ? (
          <div className="paper-card p-10 text-center space-y-3">
            <h2 className="font-display text-xl font-extrabold tracking-[-0.03em] text-[var(--ink)]">
              No Upcoming Events Published at {fullCollegeName}
            </h2>
            <p className="text-sm font-light text-[var(--ink-2)] max-w-lg mx-auto">
              My Campus displays all events hosted directly by {shortCollegeName}. Spotted a club
              poster on WhatsApp or noticeboards? Suggest it or explore inter-college events in
              Discover.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onOpenDiscover}
                className="paper-btn-secondary min-h-[40px] px-4 py-2 text-xs uppercase tracking-[0.05em] inline-flex items-center gap-1.5"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Explore Discover Feed</span>
              </button>
            </div>
          </div>
        ) : filteredCollegeEvents.length === 0 ? (
          <div className="paper-card-soft p-8 text-center space-y-3">
            <p className="text-sm text-[var(--ink-2)]">
              No {shortCollegeName} events match your current search or category filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setCampusTypeFilter('All');
                setOnlyExclusives(false);
                setCampusSearch('');
              }}
              className="paper-btn-secondary min-h-[38px] px-4 py-1.5 text-xs uppercase tracking-[0.05em]"
            >
              Clear Campus Filters
            </button>
          </div>
        ) : campusViewMode === 'reels' ? (
          <ReelsViewer
            events={filteredCollegeEvents}
            initialEventId={focusedReelId}
            onSelectEvent={onSelectEvent}
            onToggleSave={onToggleSave}
            onSwitchToGrid={() => setCampusViewMode('grid')}
          />
        ) : (
          <motion.div
            key={`${activeCollege?.id || customCollegeTrimmed}-${campusTypeFilter}-${onlyExclusives}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          >
            {filteredCollegeEvents.map((event, idx) => (
              <div key={event.id} className="space-y-1.5 flex flex-col">
                <EventPosterCard
                  event={event}
                  index={idx}
                  onSelect={onSelectEvent}
                  onWatchReel={(eventId) => {
                    setFocusedReelId(eventId);
                    setCampusViewMode('reels');
                  }}
                  onToggleSave={onToggleSave}
                />
                {event.eligibleToRegister === false && (
                  <div className="px-3 py-1.5 rounded-[10px] border border-[var(--amber-border)] bg-[var(--amber-tint)] text-[11px] text-[var(--amber-ink)] font-medium flex items-start gap-1.5">
                    <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      View-only ({event.ineligibilityReasons?.[0] || 'Restricted eligibility'})
                    </span>
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </section>
    </div>
  );
}
