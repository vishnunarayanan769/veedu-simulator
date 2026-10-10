import { TEX, type Tex } from './tex';

export const MW = 40;
export const MH = 40;

export const W_EMPTY = 0;
export const W_PLASTER = 1;
export const W_TEAK = 2;
export const W_LATERITE = 3;
export const W_WINDOW = 4;
export const W_TERRA = 5;
export const W_COLUMN = 6;
export const W_PALM = 7;
export const W_BANANA = 8;
export const W_DOOR = 9;

export const F_OXIDE = 0;
export const F_COURT = 1;
export const F_GRASS = 2;
export const F_VERANDA = 3;

export const grid = new Uint8Array(MW * MH);
export const floorMap = new Uint8Array(MW * MH).fill(F_GRASS);
export const ceilMap = new Uint8Array(MW * MH);

export const WALL_H = new Float32Array(16).fill(1);
WALL_H[W_LATERITE] = 0.92;
WALL_H[W_TERRA] = 0.44;
WALL_H[W_BANANA] = 0.8;

export const WALL_TEX: (Tex | null)[] = [];
WALL_TEX[W_PLASTER] = TEX.plaster;
WALL_TEX[W_TEAK] = TEX.teak;
WALL_TEX[W_LATERITE] = TEX.laterite;
WALL_TEX[W_WINDOW] = TEX.window;
WALL_TEX[W_TERRA] = TEX.terra;
WALL_TEX[W_COLUMN] = TEX.column;
WALL_TEX[W_PALM] = TEX.palm;
WALL_TEX[W_BANANA] = TEX.banana;
WALL_TEX[W_DOOR] = TEX.door;

export const FLOOR_TEX: Tex[] = [TEX.fOxide, TEX.fCourt, TEX.fGrass, TEX.fVeranda];
export const CEIL_TEX = TEX.ceil;

export const idx = (x: number, y: number) => y * MW + x;
export const solidAt = (cx: number, cy: number) => {
  if (cx < 0 || cy < 0 || cx >= MW || cy >= MH) return true;
  return grid[cy * MW + cx] !== W_EMPTY;
};

function fill(x0: number, y0: number, x1: number, y1: number, v: number) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid[idx(x, y)] = v;
}
function fillFloor(x0: number, y0: number, x1: number, y1: number, v: number) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) floorMap[idx(x, y)] = v;
}
function fillCeil(x0: number, y0: number, x1: number, y1: number, v: number) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) ceilMap[idx(x, y)] = v;
}

// ------------------------------------------------------------------ the plot
// boundary laterite fence
fill(0, 0, MW - 1, 0, W_LATERITE);
fill(0, MH - 1, MW - 1, MH - 1, W_LATERITE);
fill(0, 0, 0, MH - 1, W_LATERITE);
fill(MW - 1, 0, MW - 1, MH - 1, W_LATERITE);

// house footprint x6..33 y6..33
const HX0 = 6, HY0 = 6, HX1 = 33, HY1 = 33;
fillFloor(HX0, HY0, HX1, HY1, F_OXIDE);
fillCeil(HX0, HY0, HX1, HY1, 1);

// outer walls
fill(HX0, HY0, HX1, HY0, W_PLASTER);
fill(HX0, HY1, HX1, HY1, W_PLASTER);
fill(HX0, HY0, HX0, HY1, W_PLASTER);
fill(HX1, HY0, HX1, HY1, W_PLASTER);

// door openings (all aligned on the courtyard axis) + door frames
const carve = (x: number, y: number) => {
  grid[idx(x, y)] = W_EMPTY;
};
for (const x of [19, 20]) {
  carve(x, HY1);
  carve(x, HY0);
  grid[idx(x === 19 ? 18 : 21, HY1)] = W_DOOR;
  grid[idx(x === 19 ? 18 : 21, HY0)] = W_DOOR;
}
for (const y of [19, 20]) {
  carve(HX0, y);
  carve(HX1, y);
  grid[idx(HX0, y === 19 ? 18 : 21)] = W_DOOR;
  grid[idx(HX1, y === 19 ? 18 : 21)] = W_DOOR;
}
// windows
for (const x of [9, 11, 24, 26, 30]) {
  grid[idx(x, HY0)] = W_WINDOW;
  grid[idx(x, HY1)] = W_WINDOW;
}
for (const y of [9, 11, 25, 27, 30]) {
  grid[idx(HX0, y)] = W_WINDOW;
  grid[idx(HX1, y)] = W_WINDOW;
}

// nadumuttam (central courtyard) x17..22 y17..22, open to sky
fillFloor(17, 17, 22, 22, F_COURT);
fillCeil(17, 17, 22, 22, 0);
fill(16, 16, 23, 16, W_TERRA);
fill(16, 23, 23, 23, W_TERRA);
fill(16, 16, 16, 23, W_TERRA);
fill(23, 16, 23, 23, W_TERRA);
for (const x of [19, 20]) {
  grid[idx(x, 16)] = W_EMPTY;
  grid[idx(x, 23)] = W_EMPTY;
}
for (const y of [19, 20]) {
  grid[idx(16, y)] = W_EMPTY;
  grid[idx(23, y)] = W_EMPTY;
}
for (const [x, y] of [[16, 16], [23, 16], [16, 23], [23, 23]]) grid[idx(x, y)] = W_COLUMN;

// four corner rooms (each with a single doorway)
// kitchen (NE)
fill(26, HY0, 26, 13, W_TEAK);
fill(26, 13, HX1, 13, W_TEAK);
for (const x of [30, 31]) grid[idx(x, 13)] = W_EMPTY;
// bedroom (NW)
fill(13, HY0, 13, 13, W_TEAK);
fill(HX0, 13, 13, 13, W_TEAK);
for (const x of [9, 10]) grid[idx(x, 13)] = W_EMPTY;
// wash room (SW)
fill(13, 26, 13, HY1, W_TEAK);
fill(HX0, 26, 13, 26, W_TEAK);
for (const x of [9, 10]) grid[idx(x, 26)] = W_EMPTY;
// store / sit-out (SE)
fill(26, 26, 26, HY1, W_TEAK);
fill(26, 26, HX1, 26, W_TEAK);
for (const x of [30, 31]) grid[idx(x, 26)] = W_EMPTY;

// veranda in front of the main door
fillFloor(16, HY1 + 1, 23, HY1 + 3, F_VERANDA);
fillFloor(HX0 - 3, 17, HX0 - 1, 22, F_VERANDA);
fillFloor(HX1 + 1, 17, HX1 + 3, 22, F_VERANDA);

// yard greenery: coconut palms + banana clumps
for (const [x, y] of [
  [2, 8], [2, 14], [2, 26], [2, 32], [12, 2], [24, 2], [30, 2], [37, 8], [37, 14],
  [37, 26], [37, 33], [8, 37], [16, 37], [26, 37], [34, 2], [10, 34], [30, 36],
]) grid[idx(x, y)] = W_PALM;
for (const [x, y] of [
  [4, 4], [35, 4], [4, 35], [35, 36], [4, 12], [35, 20], [4, 22], [12, 36], [22, 2],
]) grid[idx(x, y)] = W_BANANA;

// ------------------------------------------------------------------ entities
export interface EntDef {
  spr: string;
  x: number;
  y: number;
  h: number; // world height
  z: number; // bottom offset
  r: number; // collision radius (0 = walk through)
  light?: boolean;
}

export type StationId =
  | 'lamp' | 'sweep' | 'plants' | 'stove' | 'tap' | 'fuse' | 'well' | 'cow';
export type ItemId = 'match' | 'bucket' | 'wrench' | 'grass' | 'broom' | 'cloth' | 'brush' | 'shears' | 'rope';

export interface StationDef extends EntDef {
  id: StationId;
  name: string;
  ml: string;
  verb: string;
  item: ItemId | null;
  hold: number;
  score: number;
  icon: string;
}

export const STATIONS: StationDef[] = [
  { id: 'lamp', spr: 'lamp', icon: '🪔', name: 'Light the Nilavilakku', ml: 'നിലവിളക്ക്', verb: 'Light', item: 'match', hold: 0.85, score: 140, x: 21.5, y: 19.6, h: 0.95, z: 0, r: 0.22, light: true },
  { id: 'sweep', spr: 'leafpile', icon: '🧹', name: 'Sweep the Courtyard', ml: 'അങ്ങാടി', verb: 'Sweep', item: 'broom', hold: 1.05, score: 120, x: 17.7, y: 22.2, h: 0.42, z: 0, r: 0 },
  { id: 'plants', spr: 'plants', icon: '🌺', name: 'Water the Tulsi Thara', ml: 'തുളസി', verb: 'Water', item: 'bucket', hold: 1.0, score: 130, x: 17.7, y: 17.6, h: 0.72, z: 0, r: 0.25 },
  { id: 'stove', spr: 'stove', icon: '☕', name: 'Boil Chaya on the Chulha', ml: 'ചായ', verb: 'Boil', item: null, hold: 0.95, score: 130, x: 30.5, y: 9.4, h: 0.62, z: 0, r: 0.3 },
  { id: 'tap', spr: 'tap', icon: '🚰', name: 'Fix the Leaking Tap', ml: 'വാട്ടർ', verb: 'Tighten', item: 'wrench', hold: 1.1, score: 150, x: 9.3, y: 30.4, h: 0.78, z: 0.3, r: 0 },
  { id: 'fuse', spr: 'fuse', icon: '⚡', name: 'Reset the Fuse Box', ml: 'ഫ്യൂസ്', verb: 'Reset', item: null, hold: 0.8, score: 160, x: 19.5, y: 7.4, h: 0.55, z: 0.45, r: 0 },
  { id: 'well', spr: 'well', icon: '🪣', name: 'Draw Water from the Well', ml: 'കിണർ', verb: 'Draw', item: 'bucket', hold: 1.2, score: 160, x: 36.5, y: 20.5, h: 1.05, z: 0, r: 0.5 },
  { id: 'cow', spr: 'cow', icon: '🐄', name: 'Feed Lakshmi the Cow', ml: 'പശു', verb: 'Feed', item: 'grass', hold: 1.0, score: 150, x: 10.5, y: 3.5, h: 0.68, z: 0, r: 0.4 },
];

export const ITEM_HOME: Record<ItemId, { x: number; y: number }> = {
  match: { x: 28.5, y: 10.5 },
  bucket: { x: 28.5, y: 28.5 },
  wrench: { x: 31.5, y: 30.5 },
  grass: { x: 14.5, y: 2.6 },
  broom: { x: 20.6, y: 28.6 },
  cloth: { x: 24.8, y: 19.8 },
  brush: { x: 12.5, y: 3.8 },
  shears: { x: 24.8, y: 16.8 },
  rope: { x: 35.5, y: 18.5 },
};

export const ITEM_INFO: Record<ItemId, { spr: string; name: string; icon: string; place: string }> = {
  match: { spr: 'matchbox', name: 'തീപ്പെട്ടി', icon: '🔥', place: 'അടുക്കളയിൽ' },
  bucket: { spr: 'bucket', name: 'ബക്കറ്റ്', icon: '🪣', place: 'തെക്കുകിഴക്കേ സംഭരണമുറിയിൽ' },
  wrench: { spr: 'wrench', name: 'സ്പാനർ', icon: '🔧', place: 'തെക്കുകിഴക്കേ സംഭരണമുറിയിൽ' },
  grass: { spr: 'grass', name: 'പുല്ലുകെട്ട്', icon: '🌾', place: 'വടക്കേ മുറ്റത്ത്' },
  broom: { spr: 'broom', name: 'ചൂൽ', icon: '🧹', place: 'പൂമുഖത്തിനടുത്ത്' },
  cloth: { spr: 'cloth', name: 'തുണി', icon: '', place: 'കിഴക്കേ വരാന്തയിൽ' },
  brush: { spr: 'brush', name: 'ബ്രഷ്', icon: '', place: 'തൊഴുത്തിനടുത്ത്' },
  shears: { spr: 'shears', name: 'കത്രിക', icon: '', place: 'പൂന്തോട്ടത്തിനടുത്ത്' },
  rope: { spr: 'rope', name: 'കയർ', icon: '', place: 'കിണറ്റിനടുത്ത്' },
};

export const DECOR: EntDef[] = [
  { spr: 'tulsi', x: 19.9, y: 19.9, h: 0.78, z: 0, r: 0.34 },
  { spr: 'clayPot', x: 22.4, y: 22.3, h: 0.42, z: 0, r: 0.16 },
  { spr: 'clayPot', x: 18.2, y: 21.9, h: 0.36, z: 0, r: 0.16 },
  { spr: 'chair', x: 14.6, y: 20.5, h: 0.72, z: 0, r: 0.22 },
  { spr: 'chair', x: 25.4, y: 18.5, h: 0.72, z: 0, r: 0.22 },
  { spr: 'banana', x: 15.6, y: 12.4, h: 1.1, z: 0, r: 0 },
  { spr: 'banana', x: 24.4, y: 27.6, h: 1.05, z: 0, r: 0 },
  { spr: 'clayPot', x: 20.5, y: 34.6, h: 0.4, z: 0, r: 0.16 },
  { spr: 'chair', x: 21.5, y: 34.8, h: 0.72, z: 0, r: 0.22 },
];

export const PLAYER_START = { x: 19.5, y: 30.5, a: -Math.PI / 2 };

// nudge a spawn point to the nearest walkable cell centre
export function freeSpot(x: number, y: number) {
  let cx = Math.floor(x), cy = Math.floor(y);
  if (!solidAt(cx, cy)) return { x, y };
  for (let r = 1; r < 6; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const nx = Math.floor(x) + dx, ny = Math.floor(y) + dy;
      if (!solidAt(nx, ny)) return { x: nx + 0.5, y: ny + 0.5 };
    }
  }
  return { x, y };
}
