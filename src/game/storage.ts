import { normalizeHouseName } from './houses';

export interface ScoreRow {
  name: string;
  score: number;
  tasks: number;
  combo: number;
  date: number;
}

const KEY = 'veedu.highscores.v1';

export function loadScores(): ScoreRow[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as ScoreRow[];
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((r) => typeof r?.score === 'number')
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  } catch {
    return [];
  }
}

export function bestScore() {
  const s = loadScores();
  return s.length ? s[0].score : 0;
}

export function saveScore(row: ScoreRow): ScoreRow[] {
  const rows = loadScores();
  rows.push(row);
  rows.sort((a, b) => b.score - a.score);
  const top = rows.slice(0, 6);
  try {
    localStorage.setItem(KEY, JSON.stringify(top));
  } catch {
    /* storage unavailable */
  }
  return top;
}

export function qualifies(score: number) {
  if (score <= 0) return false;
  const rows = loadScores();
  return rows.length < 6 || score > rows[rows.length - 1].score;
}

// ------------------------------------------------------------------ friend group board
// This build ships as a static single file, so there is no server. Friends can
// still compete by exchanging short "share codes" (or a full group link) which
// encode a finished run and merge it into this device's group board.

export interface GroupRow extends ScoreRow {
  level: number;
  local?: boolean;
}

const GROUP_KEY = 'veedu.groupBoard.v1';

export function loadGroup(): GroupRow[] {
  try {
    const raw = localStorage.getItem(GROUP_KEY);
    const arr = raw ? (JSON.parse(raw) as GroupRow[]) : [];
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((r) => typeof r?.score === 'number' && typeof r?.name === 'string')
      .sort((a, b) => b.score - a.score)
      .slice(0, 25);
  } catch {
    return [];
  }
}

export function addGroupRow(row: GroupRow): GroupRow[] {
  const rows = loadGroup();
  // Keep only the best run per house name.
  const existing = rows.findIndex((r) => r.name.toLowerCase() === row.name.toLowerCase());
  if (existing >= 0) {
    if (rows[existing].score >= row.score) return rows;
    rows.splice(existing, 1);
  }
  rows.push(row);
  rows.sort((a, b) => b.score - a.score);
  const top = rows.slice(0, 25);
  try {
    localStorage.setItem(GROUP_KEY, JSON.stringify(top));
  } catch {
    /* storage unavailable */
  }
  return top;
}

export function clearGroup(): GroupRow[] {
  try {
    localStorage.removeItem(GROUP_KEY);
  } catch {
    /* storage unavailable */
  }
  return [];
}

const b64encode = (s: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(s)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const b64decode = (s: string) => {
  const norm = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(norm + '='.repeat((4 - (norm.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)));
};

/** Short, human-pasteable run code, e.g. "VD1.MjAyNi0xMzg5..." */
export function encodeShare(row: GroupRow): string {
  const payload = [normalizeHouseName(row.name), row.score, row.tasks, row.combo, row.level, row.date].join('~');
  return `VD1.${b64encode(payload)}`;
}

export function decodeShare(code: string): GroupRow | null {
  try {
    const clean = code.trim();
    if (clean.length > 2048) return null;
    const body = clean.startsWith('VD1.') ? clean.slice(4) : clean;
    const fields = b64decode(body).split('~');
    if (fields.length !== 6) return null;
    const [name, score, tasks, combo, level, date] = fields;
    const n = Number(score);
    const numbers = [n, Number(tasks), Number(combo), Number(level), Number(date)];
    if (!normalizeHouseName(name) || numbers.some((v) => !Number.isSafeInteger(v) || v < 0) || n <= 0 || Number(level) > 100 || Number(combo) < 1 || Number(combo) > 9) return null;
    return {
      name: normalizeHouseName(name),
      score: Math.round(n),
      tasks: Number(tasks) || 0,
      combo: Number(combo) || 1,
      level: Number(level) || 0,
      date: Number(date) || Date.now(),
    };
  } catch {
    return null;
  }
}
