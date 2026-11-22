import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  LogOut,
  MapPin,
  Phone,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type { Area, College, StudentProfile } from '../types';
import { resizeAvatarImage } from '../utils/format';
import { CollegeLocationMap } from './CollegeLocationMap';
import { PlaceSearchInput } from './PlaceSearchInput';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  firebaseUser: User | null;
  onGoogleSignIn: () => Promise<void>;
  onGoogleSignOut: () => Promise<void>;
  onOpenAuth?: (mode: 'login' | 'signup') => void;
  student: StudentProfile;
  areas: Area[];
  colleges: College[];
  mapsEnabled: boolean;
  onSaveProfile: (updates: Partial<StudentProfile>) => Promise<void>;
  onDeleteAccount: () => Promise<void>;
}

const COURSES = [
  'B.Tech',
  'B.E.',
  'B.Sc',
  'B.Com',
  'BBA',
  'BCA',
  'M.Tech',
  'MBA',
  'MCA',
  'B.Pharm',
  'LLB',
  'B.Des',
  'Other',
];
const BRANCHES = [
  'CSE',
  'AI/ML',
  'ECE',
  'IT',
  'Data Science',
  'Cybersecurity',
  'EEE',
  'Mechanical',
  'Civil',
  'Design',
  'Management',
  'Commerce',
  'Law',
  'Other',
];
const SEMESTERS = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8'];
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year / PG'];

export function ProfileModal({
  open,
  onClose,
  firebaseUser,
  onGoogleSignIn,
  onGoogleSignOut,
  onOpenAuth,
  student,
  areas,
  colleges,
  mapsEnabled,
  onSaveProfile,
  onDeleteAccount,
}: ProfileModalProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [displayName, setDisplayName] = useState(student.displayName);
  const [email, setEmail] = useState(student.email);
  const [phoneNumber, setPhoneNumber] = useState(student.phoneNumber || '');
  const [photoUrl, setPhotoUrl] = useState(student.photoUrl || '');
  const [collegeId, setCollegeId] = useState(student.collegeId);
  const [customCollegeName, setCustomCollegeName] = useState(student.customCollegeName || '');
  const [collegePlaceId, setCollegePlaceId] = useState(student.collegePlaceId || '');
  const [collegeAddress, setCollegeAddress] = useState(student.collegeAddress || '');
  const [collegeLat, setCollegeLat] = useState<number | undefined>(student.collegeLat);
  const [collegeLng, setCollegeLng] = useState<number | undefined>(student.collegeLng);
  const [course, setCourse] = useState(student.course || 'B.Tech');
  const [branch, setBranch] = useState(student.branch || 'CSE');
  const [semester, setSemester] = useState(student.semester || 'Sem 5');
  const [year, setYear] = useState(student.year || '3rd Year');
  const [consentAccepted, setConsentAccepted] = useState(student.consentAccepted);

  const [saving, setSaving] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const wasOpenRef = useRef(false);
  const isDirtyRef = useRef(false);
  const lastAuthUidRef = useRef<string | null>(null);
  const lastSyncedStudentRef = useRef<StudentProfile | null>(null);

  function markDirty() {
    isDirtyRef.current = true;
  }

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      isDirtyRef.current = false;
      lastSyncedStudentRef.current = null;
      return;
    }

    const justOpened = !wasOpenRef.current;
    const currentUid = firebaseUser?.uid || null;
    const authJustChanged = lastAuthUidRef.current !== currentUid;
    const studentUpdated = lastSyncedStudentRef.current !== student;

    if (justOpened || (!isDirtyRef.current && (authJustChanged || studentUpdated))) {
      wasOpenRef.current = true;
      lastAuthUidRef.current = currentUid;
      lastSyncedStudentRef.current = student;

      const isSeededDemo =
        (student.email === 'ananya.reddy@vnrvjiet.in' ||
          student.displayName === 'Ananya Reddy') &&
        firebaseUser?.email &&
        firebaseUser.email !== 'ananya.reddy@vnrvjiet.in';

      setDisplayName(
        (isSeededDemo ? firebaseUser?.displayName : student.displayName) ||
          firebaseUser?.displayName ||
          ''
      );
      setEmail(
        (isSeededDemo ? firebaseUser?.email : student.email) || firebaseUser?.email || ''
      );
      setPhoneNumber(isSeededDemo ? '' : student.phoneNumber || '');
      setPhotoUrl(
        (isSeededDemo ? firebaseUser?.photoURL : student.photoUrl) ||
          firebaseUser?.photoURL ||
          ''
      );
      const initialCollegeId =
        student.collegeId === 'other' && !student.customCollegeName?.trim()
          ? ''
          : student.collegeId || '';
      setCollegeId(initialCollegeId);
      setCustomCollegeName(student.customCollegeName || '');
      setCollegePlaceId(student.collegePlaceId || '');
      setCollegeAddress(student.collegeAddress || '');
      setCollegeLat(student.collegeLat);
      setCollegeLng(student.collegeLng);
      setCourse(student.course || 'B.Tech');
      setBranch(student.branch || 'CSE');
      setSemester(student.semester || 'Sem 5');
      setYear(student.year || '3rd Year');
      setConsentAccepted(student.consentAccepted);
      setErrorMsg(null);
    } else if (isDirtyRef.current && authJustChanged && firebaseUser) {
      lastAuthUidRef.current = currentUid;
      setDisplayName((prev) =>
        !prev.trim() || prev === 'Ananya Reddy' || prev === 'Student' || prev === 'Guest Student'
          ? firebaseUser.displayName || prev
          : prev
      );
      setEmail((prev) =>
        !prev.trim() || prev === 'ananya.reddy@vnrvjiet.in' ? firebaseUser.email || prev : prev
      );
      setPhotoUrl((prev) => (!prev && firebaseUser.photoURL ? firebaseUser.photoURL : prev));
    }
  }, [open, student, firebaseUser, colleges]);

  if (!open) return null;

  const selectedCollege = colleges.find((c) => c.id === collegeId);
  const emailDomain = (email.split('@')[1] || '').toLowerCase();
  const isDomainVerified = Boolean(
    selectedCollege && emailDomain === selectedCollege.emailDomain.toLowerCase()
  );

  const previewCollegeArea =
    selectedCollege && areas.find((a) => a.id === selectedCollege.areaId);
  const mapCoords =
    typeof collegeLat === 'number' && typeof collegeLng === 'number'
      ? { lat: collegeLat, lng: collegeLng }
      : previewCollegeArea
        ? { lat: previewCollegeArea.lat, lng: previewCollegeArea.lng }
        : null;

  async function handleAvatarUpload(file: File) {
    setAvatarBusy(true);
    setErrorMsg(null);
    try {
      const dataUrl = await resizeAvatarImage(file);
      markDirty();
      setPhotoUrl(dataUrl);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not process image.');
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleGoogleAuthClick() {
    setAuthBusy(true);
    setErrorMsg(null);
    try {
      await onGoogleSignIn();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Google Sign-In failed.');
    } finally {
      setAuthBusy(false);
    }
  }

  function formatReadableSaveError(err: unknown): string {
    const raw = err instanceof Error ? err.message : 'Failed to save student profile.';
    if (raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw) as { error?: string };
        if (parsed.error) return parsed.error;
      } catch {
        // ignore
      }
    }
    return raw;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (!consentAccepted) {
      setErrorMsg('Please check the consent box below to save your profile details.');
      return;
    }
    if (!collegeId) {
      setErrorMsg('Please select your college or choose Other College in India.');
      return;
    }
    if (collegeId === 'other' && !customCollegeName.trim()) {
      setErrorMsg('Please search for or enter your college name.');
      return;
    }
    setSaving(true);
    try {
      const matchedCollege = colleges.find((c) => c.id === collegeId);
      const matchedArea = matchedCollege
        ? areas.find((a) => a.id === matchedCollege.areaId)
        : undefined;
      const nextFollowed =
        matchedCollege && !student.followedCollegeIds.includes(matchedCollege.id)
          ? [...student.followedCollegeIds, matchedCollege.id]
          : student.followedCollegeIds;
      const collegeChanged =
        collegeId !== student.collegeId ||
        (collegeId === 'other' &&
          customCollegeName.trim() !== (student.customCollegeName || '').trim());

      const updates: Partial<StudentProfile> = {
        authUid: firebaseUser?.uid || student.authUid,
        displayName: displayName.trim() || 'Student',
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        photoUrl: photoUrl || '',
        collegeId,
        customCollegeName: collegeId === 'other' ? customCollegeName.trim() : '',
        collegePlaceId: collegeId === 'other' ? collegePlaceId : undefined,
        collegeAddress: collegeId === 'other' ? collegeAddress : undefined,
        collegeLat: collegeId === 'other' ? collegeLat : undefined,
        collegeLng: collegeId === 'other' ? collegeLng : undefined,
        collegeVerified: isDomainVerified,
        ...(matchedArea && collegeChanged
          ? {
              areaId: matchedArea.id,
              locationLabel: `${matchedArea.name}, Telangana`,
              locationLat: matchedArea.lat,
              locationLng: matchedArea.lng,
            }
          : {}),
        ...(collegeId === 'other' &&
        collegeChanged &&
        typeof collegeLat === 'number' &&
        typeof collegeLng === 'number'
          ? {
              locationLabel: customCollegeName.trim(),
              locationLat: collegeLat,
              locationLng: collegeLng,
            }
          : {}),
        followedCollegeIds: nextFollowed,
        course,
        branch,
        semester,
        year,
        onboardingCompleted: true,
        consentAccepted,
      };
      await onSaveProfile(updates);
      onClose();
    } catch (err) {
      setErrorMsg(formatReadableSaveError(err));
    } finally {
      setSaving(false);
    }
  }

  const avatarInitial = (displayName || firebaseUser?.displayName || 'S')[0].toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 paper-scrim flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Student Profile & Academic Identity"
    >
      <div className="paper-modal w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-warm)] bg-[var(--paper-raised)] flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h2 className="font-display text-xl font-extrabold tracking-[-0.03em] text-[var(--ink)]">
              {firebaseUser && !student.onboardingCompleted
                ? 'Complete Student Sign-Up'
                : 'Student Profile'}
            </h2>
            <p className="text-xs text-[var(--ink-2)]">
              {firebaseUser && !student.onboardingCompleted
                ? 'Confirm your phone number, academic details, and home campus to finish creating your account.'
                : 'Manage your identity, profile photo, phone number, academic details, and home campus.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile"
            className="paper-btn-secondary min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Google Account + Profile Picture Upload */}
          <div className="p-4 rounded-[14px] border border-[var(--border-ink)] bg-[var(--paper-raised)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={displayName || 'Profile picture'}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-full object-cover border border-[var(--border-ink)] bg-[var(--paper-input)] shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-[var(--ink)] text-[var(--on-ink)] flex items-center justify-center font-display font-extrabold text-lg shrink-0">
                    {avatarInitial}
                  </div>
                )}

                <div className="min-w-0 space-y-1">
                  <div className="text-sm font-bold text-[var(--ink)] truncate">
                    {displayName || firebaseUser?.displayName || 'Guest Student'}
                  </div>
                  <div className="text-xs text-[var(--ink-2)] truncate">
                    {firebaseUser
                      ? 'Google Account Connected'
                      : 'Not signed in with Google'}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pt-0.5">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleAvatarUpload(file);
                      }}
                    />
                    <button
                      type="button"
                      disabled={avatarBusy}
                      onClick={() => fileRef.current?.click()}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--crimson)] hover:underline underline-offset-4"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{avatarBusy ? 'Processing...' : 'Upload custom photo'}</span>
                    </button>
                    {photoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          markDirty();
                          setPhotoUrl('');
                        }}
                        className="text-xs text-[var(--ink-2)] hover:text-[var(--ink)]"
                      >
                        Remove
                      </button>
                    )}
                    {firebaseUser?.photoURL && photoUrl !== firebaseUser.photoURL && (
                      <button
                        type="button"
                        onClick={() => {
                          markDirty();
                          setPhotoUrl(firebaseUser.photoURL || '');
                        }}
                        className="text-xs text-[var(--ink-2)] hover:text-[var(--ink)]"
                      >
                        Use Google photo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {firebaseUser ? (
                <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center">
                  <button
                    type="button"
                    disabled={authBusy}
                    onClick={handleGoogleAuthClick}
                    className="paper-btn-secondary min-h-[38px] px-3 py-1.5 text-xs whitespace-nowrap"
                  >
                    {authBusy ? 'Switching...' : 'Switch Account'}
                  </button>
                  <button
                    type="button"
                    onClick={onGoogleSignOut}
                    className="paper-btn-secondary min-h-[38px] px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center">
                  <button
                    type="button"
                    disabled={authBusy}
                    onClick={() => {
                      if (onOpenAuth) {
                        onClose();
                        onOpenAuth('login');
                      } else {
                        handleGoogleAuthClick();
                      }
                    }}
                    className="paper-btn-secondary min-h-[38px] px-3.5 py-1.5 text-xs whitespace-nowrap"
                  >
                    {authBusy ? 'Connecting...' : 'Log In'}
                  </button>
                  <button
                    type="button"
                    disabled={authBusy}
                    onClick={() => {
                      if (onOpenAuth) {
                        onClose();
                        onOpenAuth('signup');
                      } else {
                        handleGoogleAuthClick();
                      }
                    }}
                    className="paper-btn-crimson min-h-[38px] px-3.5 py-1.5 text-xs whitespace-nowrap"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 border border-[var(--crimson)] bg-[var(--crimson-tint)] text-xs font-medium text-[var(--crimson)]">
              {errorMsg}
            </div>
          )}

          {/* Personal & Contact Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                Full Name
              </span>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => {
                  markDirty();
                  setDisplayName(e.target.value);
                }}
                placeholder="Your full name"
                className="paper-input w-full min-h-[42px] px-3 py-2 text-sm"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                Email
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  markDirty();
                  setEmail(e.target.value);
                }}
                placeholder="you@college.ac.in or gmail.com"
                className="paper-input w-full min-h-[42px] px-3 py-2 text-sm"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)] flex items-center gap-1">
                <Phone className="w-3 h-3 text-[var(--crimson)]" />
                <span>Phone Number</span>
              </span>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => {
                  markDirty();
                  setPhoneNumber(e.target.value);
                }}
                placeholder="+91 98765 43210"
                className="paper-input w-full min-h-[42px] px-3 py-2 text-sm font-mono tabular-nums"
              />
            </label>
          </div>

          {/* Academic Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                Course
              </span>
              <select
                value={course}
                onChange={(e) => {
                  markDirty();
                  setCourse(e.target.value);
                }}
                className="paper-input w-full min-h-[42px] px-2.5 py-2 text-sm"
              >
                {COURSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                Branch
              </span>
              <select
                value={branch}
                onChange={(e) => {
                  markDirty();
                  setBranch(e.target.value);
                }}
                className="paper-input w-full min-h-[42px] px-2.5 py-2 text-sm"
              >
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                Semester
              </span>
              <select
                value={semester}
                onChange={(e) => {
                  markDirty();
                  setSemester(e.target.value);
                }}
                className="paper-input w-full min-h-[42px] px-2.5 py-2 text-sm"
              >
                {SEMESTERS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                Year
              </span>
              <select
                value={year}
                onChange={(e) => {
                  markDirty();
                  setYear(e.target.value);
                }}
                className="paper-input w-full min-h-[42px] px-2.5 py-2 text-sm"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Home College Selection (Directory or Any Campus Across India via Google Maps) */}
          <div className="space-y-3 pt-4 border-t border-[var(--border-warm)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                  Home College ({colleges.length} verified + All India)
                </span>
                <select
                  required
                  value={collegeId}
                  onChange={(e) => {
                    markDirty();
                    setCollegeId(e.target.value);
                  }}
                  className="paper-input w-full min-h-[42px] px-3 py-2 text-sm"
                >
                  <option value="" disabled>
                    Select your Home College...
                  </option>
                  {(['Tier 1', 'Tier 2', 'Tier 3'] as const).map((tier) => (
                    <optgroup key={tier} label={`${tier} Campuses`}>
                      {colleges
                        .filter((c) => c.tier === tier)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.shortName} · {c.name}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                  <optgroup label="Pan-India / Custom College">
                    <option value="other">Other College in India (Pin via Google Maps)</option>
                  </optgroup>
                </select>
              </label>

              <div className="flex items-end pb-1">
                {collegeId === 'other' ? (
                  <div className="text-xs text-[var(--ink-2)] flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[var(--crimson)] shrink-0" />
                    <span>Pin any college across India using Google Maps below.</span>
                  </div>
                ) : isDomainVerified ? (
                  <div className="flex items-center gap-2 text-xs text-[var(--olive)] font-semibold">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>College email verified · Host-only events unlocked</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-[var(--amber-ink)] font-medium">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>
                      Self-declared · Use @{selectedCollege?.emailDomain} email to unlock host-only events
                    </span>
                  </div>
                )}
              </div>
            </div>

            {collegeId === 'other' && (
              <div className="space-y-3 p-4 rounded-[14px] bg-[var(--paper-raised)] border border-[var(--border-warm)]">
                <PlaceSearchInput
                  label="Find Your College via Google Maps (All India)"
                  placeholder="Search e.g. IIT Bombay, VIT Vellore, NIT Trichy, MRDU..."
                  initialValue={customCollegeName}
                  mapsEnabled={mapsEnabled}
                  onSelect={(place) => {
                    markDirty();
                    setCustomCollegeName(place.name);
                    setCollegePlaceId(place.placeId);
                    setCollegeAddress(place.formattedAddress);
                    setCollegeLat(place.lat);
                    setCollegeLng(place.lng);
                  }}
                />

                <label className="block space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                    College Name
                  </span>
                  <input
                    type="text"
                    required
                    value={customCollegeName}
                    onChange={(e) => {
                      markDirty();
                      setCustomCollegeName(e.target.value);
                    }}
                    placeholder="Exact name of your college or university"
                    className="paper-input w-full min-h-[40px] px-3 py-2 text-sm"
                  />
                </label>

                {collegeAddress && (
                  <p className="text-xs text-[var(--ink-2)]">{collegeAddress}</p>
                )}
              </div>
            )}

            {mapCoords && (
              <CollegeLocationMap
                mapsEnabled={mapsEnabled}
                center={mapCoords}
                zoom={14}
                className="w-full h-[180px]"
                fallbackLabel={
                  collegeId === 'other'
                    ? customCollegeName || 'Selected Campus'
                    : selectedCollege?.name || 'Campus Location'
                }
                markers={[
                  {
                    id: collegeId,
                    lat: mapCoords.lat,
                    lng: mapCoords.lng,
                    title:
                      collegeId === 'other'
                        ? customCollegeName || 'Your College'
                        : selectedCollege?.name || 'Your College',
                    subtitle:
                      collegeId === 'other'
                        ? collegeAddress
                        : previewCollegeArea?.name,
                    highlighted: true,
                  },
                ]}
              />
            )}
          </div>

          {/* Consent & Erasure */}
          <div className="pt-4 border-t border-[var(--border-warm)] space-y-3">
            <label className="flex items-start gap-2.5 text-xs text-[var(--ink-2)] cursor-pointer">
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(e) => {
                  markDirty();
                  setConsentAccepted(e.target.checked);
                  if (e.target.checked) setErrorMsg(null);
                }}
                className="mt-0.5 rounded-none border-[var(--ink)] accent-[var(--crimson)]"
              />
              <span>
                I consent to storing my profile photo, phone number, academic info, and home campus for event registration passes and eligibility checks.
              </span>
            </label>

            <div className="flex items-center justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={async () => {
                  await onDeleteAccount();
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--crimson)] hover:underline underline-offset-4 min-h-[40px]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete My Data</span>
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="paper-btn-secondary min-h-[42px] px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="paper-btn-primary min-h-[42px] px-5 py-2 text-sm"
                >
                  {saving
                    ? 'Saving...'
                    : firebaseUser && !student.onboardingCompleted
                      ? 'Create Student Profile'
                      : 'Save Profile'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
