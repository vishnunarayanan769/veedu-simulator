// Unique Kerala house names for players who skip the name prompt.
// Names combine a place-style prefix with a traditional "house" word.

const PREFIXES = [
  'പുത്തൻ', 'കാവിൽ', 'തയ്യിൽ', 'ചെമ്പകശ്ശേരി', 'കിഴക്കേ', 'കടവിൽ', 'മുല്ലശ്ശേരി',
  'പാലയ്ക്കൽ', 'പടിഞ്ഞാറേ', 'മേലെ', 'കാഞ്ഞിരത്ത്', 'തോട്ടത്തിൽ', 'ആലുങ്കൽ',
  'തെങ്ങുങ്കൽ', 'അമ്പലത്ത്', 'പഴയേടത്ത്', 'വെള്ളിയനാട്', 'തിരുവമ്പാടി', 'താമരക്കുളം',
];

const SUFFIXES = [
  'തറവാട്', 'ഇല്ലം', 'വീട്', 'ഭവനം', 'മന', 'മഠം', 'നിലയം', 'കുടിൽ',
];

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

const STORED = 'veedu.houseNames.v1';

function usedNames(): Set<string> {
  try {
    const raw = localStorage.getItem(STORED);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function remember(name: string) {
  try {
    const set = usedNames();
    set.add(name);
    localStorage.setItem(STORED, JSON.stringify([...set].slice(-200)));
  } catch {
    /* storage unavailable */
  }
}

export const NAME_KEY = 'veedu.playerName.v1';

export function normalizeHouseName(name: string) {
  // Keep Malayalam combining marks and existing names intact when sharing.
  return name.normalize('NFC').replace(/[\u0000-\u001f~]/g, '').trim().slice(0, 64);
}

export function loadPlayerName(): string {
  try {
    return normalizeHouseName(localStorage.getItem(NAME_KEY) ?? '');
  } catch {
    return '';
  }
}

export function savePlayerName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, normalizeHouseName(name));
  } catch {
    /* storage unavailable */
  }
}

// The random suffix makes collisions very unlikely across devices. Absolute
// global uniqueness still requires the future server-side player registry.
export function randomHouseName(): string {
  const taken = usedNames();
  for (let i = 0; i < 50; i++) {
    const bytes = new Uint32Array(2);
    try { crypto.getRandomValues(bytes); }
    catch { bytes[0] = Math.floor(Math.random() * 0xffffffff); bytes[1] = Date.now() >>> 0; }
    const suffix = Array.from(bytes, (v) => v.toString(36).padStart(7, '0')).join('').slice(0, 10).toUpperCase();
    const name = `${pick(PREFIXES)} ${pick(SUFFIXES)} ${suffix}`;
    if (!taken.has(name)) {
      remember(name);
      savePlayerName(name);
      return name;
    }
  }
  const fallback = `വീട് ${Date.now().toString(36).toUpperCase()}`;
  remember(fallback);
  savePlayerName(fallback);
  return fallback;
}
