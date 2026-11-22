export type ThemePreference = 'system' | 'light' | 'dark';

const THEME_STORAGE_KEY = 'connectus:theme';
const GUEST_THEME_STORAGE_KEY = 'connectus:theme:guest';
const USER_THEME_STORAGE_PREFIX = 'connectus:theme:uid:';
const ACTIVE_UID_STORAGE_KEY = 'connectus:active-uid';
export const THEME_CHANGE_EVENT = 'connectus-theme-change';

export function normalizeThemePreference(value: unknown): ThemePreference | undefined {
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }
  return undefined;
}

export function getActiveThemeUid(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const uid = window.localStorage.getItem(ACTIVE_UID_STORAGE_KEY);
    return uid && uid.trim().length > 0 ? uid.trim() : null;
  } catch {
    return null;
  }
}

export function getUserStoredTheme(uid: string): ThemePreference | undefined {
  if (typeof window === 'undefined' || !uid) return undefined;
  try {
    return normalizeThemePreference(
      window.localStorage.getItem(`${USER_THEME_STORAGE_PREFIX}${uid}`)
    );
  } catch {
    return undefined;
  }
}

export function clearUserStoredTheme(uid: string): void {
  if (typeof window === 'undefined' || !uid) return;
  try {
    window.localStorage.removeItem(`${USER_THEME_STORAGE_PREFIX}${uid}`);
    if (getActiveThemeUid() === uid) {
      window.localStorage.removeItem(ACTIVE_UID_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function getGuestStoredTheme(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  try {
    const guestPref = normalizeThemePreference(
      window.localStorage.getItem(GUEST_THEME_STORAGE_KEY)
    );
    if (guestPref) return guestPref;
    if (!getActiveThemeUid()) {
      const legacy = normalizeThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
      if (legacy) return legacy;
    }
  } catch {
    // ignore storage errors
  }
  return 'system';
}

export function getStoredTheme(uid?: string | null): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  try {
    if (uid) {
      return getUserStoredTheme(uid) ?? 'system';
    }
    const activeUid = uid === null ? null : getActiveThemeUid();
    if (activeUid) {
      const userPref = getUserStoredTheme(activeUid);
      if (userPref) return userPref;
    }
    return getGuestStoredTheme();
  } catch {
    // ignore storage errors
  }
  return 'system';
}

export type DarkTone = 'charcoal' | 'black' | 'grey';
const DARK_TONE_STORAGE_KEY = 'connectus:dark-tone';

export function normalizeDarkTone(value: unknown): DarkTone {
  if (value === 'black' || value === 'grey' || value === 'charcoal') return value;
  return 'charcoal';
}

export function getStoredDarkTone(): DarkTone {
  if (typeof window === 'undefined') return 'charcoal';
  try {
    return normalizeDarkTone(window.localStorage.getItem(DARK_TONE_STORAGE_KEY));
  } catch {
    return 'charcoal';
  }
}

export function setDarkTone(tone: DarkTone): DarkTone {
  const safeTone = normalizeDarkTone(tone);
  if (typeof window === 'undefined') return safeTone;
  try {
    window.localStorage.setItem(DARK_TONE_STORAGE_KEY, safeTone);
  } catch {
    // ignore storage errors
  }
  const root = document.documentElement;
  root.dataset.dark = safeTone;
  const isDark = root.classList.contains('dark');
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme && isDark) {
    metaTheme.setAttribute(
      'content',
      safeTone === 'black' ? '#050505' : safeTone === 'grey' ? '#232323' : '#141414'
    );
  }
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { darkTone: safeTone } }));
  return safeTone;
}

export function resolveIsDark(pref: ThemePreference): boolean {
  if (pref === 'dark') return true;
  if (pref === 'light') return false;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
}

export function applyThemePreference(
  pref: ThemePreference,
  uid?: string | null
): boolean {
  if (typeof window === 'undefined') return false;
  const safePref = normalizeThemePreference(pref) ?? 'system';
  const targetUid = uid === undefined ? getActiveThemeUid() : uid;

  try {
    if (targetUid) {
      window.localStorage.setItem(ACTIVE_UID_STORAGE_KEY, targetUid);
      window.localStorage.setItem(`${USER_THEME_STORAGE_PREFIX}${targetUid}`, safePref);
    } else {
      window.localStorage.removeItem(ACTIVE_UID_STORAGE_KEY);
      window.localStorage.setItem(GUEST_THEME_STORAGE_KEY, safePref);
    }
    window.localStorage.setItem(THEME_STORAGE_KEY, safePref);
  } catch {
    // ignore storage errors
  }

  const isDark = resolveIsDark(safePref);
  const darkTone = getStoredDarkTone();
  const root = document.documentElement;
  root.classList.toggle('dark', isDark);
  root.dataset.theme = safePref;
  root.dataset.dark = darkTone;
  root.style.colorScheme = isDark ? 'dark' : 'light';

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    const darkHex =
      darkTone === 'black' ? '#050505' : darkTone === 'grey' ? '#232323' : '#141414';
    metaTheme.setAttribute('content', isDark ? darkHex : '#f8efe0');
  }

  window.dispatchEvent(
    new CustomEvent(THEME_CHANGE_EVENT, { detail: { pref: safePref, isDark, uid: targetUid } })
  );
  return isDark;
}

export function initThemePreference(uid?: string | null): boolean {
  const pref = getStoredTheme(uid);
  return applyThemePreference(pref, uid);
}
