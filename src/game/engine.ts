import { TEX } from './tex';
import { SPR, spriteCanvas, type Spr } from './sprites';
import { sfx } from './audio';
import {
  getActivityPool,
  levelFromScore,
  scoreForLevel,
  scoreForNextLevel,
  type ActivityCategory,
  type ActivityDef,
} from './activities';
import { nextTriviaGap, pickTrivia, type TriviaQuestion } from './trivia';
import { STATION_LABELS, type ActionKind } from './activityDetails';
import {
  MW, MH, grid, floorMap, ceilMap, WALL_H, WALL_TEX, FLOOR_TEX, CEIL_TEX,
  STATIONS, ITEM_HOME, ITEM_INFO, DECOR, PLAYER_START, freeSpot, solidAt,
  F_COURT, F_GRASS, F_VERANDA, type StationDef, type ItemId,
} from './world';

export type Phase = 'menu' | 'playing' | 'paused' | 'quiz' | 'over';

export interface Objective {
  id: string;
  icon: string;
  name: string;
  ml: string;
  dist: number;
  ang: number;
  locked: boolean;
  itemIcon: string | null;
  behind: boolean;
  station: string;
  item: ItemId | null;
  progress: number;
}

export interface StoryChapter {
  num: number;
  title: string;
  ml: string;
  desc: string;
  color: string;
}

export interface ActiveEvent {
  type: 'rain' | 'dark' | 'guests' | 'breeze' | 'festive';
  name: string;
  ml: string;
  desc: string;
  icon: string;
  time: number;
  total?: number;
}

// Score thresholds that widen the item bag: 1 -> 2 -> 3 -> 4 -> 5 slots
export const BAG_THRESHOLDS = [0, 1000, 3500, 6500, 10000];

export interface CarriedItem {
  id: ItemId;
  name: string;
  icon: string;
}

export interface Hud {
  score: number;
  level: number;
  levelProgress: number;
  nextLevelScore: number | null;
  levelQuest: string;
  unlockedActivities: number;
  combo: number;
  comboT: number;
  time: number;
  tasks: number;
  inventory: CarriedItem[];
  maxInventory: number;
  nextSlot: { need: number; have: number } | null;
  prompt: {
    title: string; ml: string; verb: string; locked: boolean; item: string | null; note?: string;
    stage: number; steps: string[]; instruction: string; input: 'hold' | 'press';
    progress: number; release: boolean; toolLocation: string; tool: ItemId | null;
  } | null;
  completedIds: string[];
  nearbyItem: CarriedItem | null;
  quizCount: number;
  objs: Objective[];
  fps: number;
  rain: number;
  dark: boolean;
  scale: number;
  locked: boolean;
  chapter: StoryChapter;
  activeEvent: ActiveEvent | null;
  guestArrived: boolean;
}

export interface PopupEvt {
  id: number;
  text: string;
  sub?: string;
  tone?: 'good' | 'gold' | 'bad' | 'info';
  duration?: number;
  kind?: 'story' | 'reward';
}

export interface TriviaResult {
  selected: number;
  correct: boolean;
  reward: number;
  timeReward: number;
}

interface Station extends StationDef {
  active: boolean;
  cool: number;
  prog: number;
  bob: number;
  activity: ActivityDef | null;
  stage: number;
  stageProgress: number;
  release: boolean;
  finished: boolean;
  finishedKind: ActionKind | null;
}
interface ItemEnt {
  id: ItemId;
  x: number;
  y: number;
  active: boolean;
  cool: number;
  grounded: boolean;
  awaitExit: boolean;
}
interface Part {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number; max: number; col: number; size: number; grav: number;
}
interface DrawEnt {
  spr: Spr;
  x: number; y: number; h: number; z: number;
  glow: boolean;
  dist: number;
}

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const wrapAng = (a: number) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};
const col32 = (r: number, g: number, b: number) =>
  (0xff000000 | (clamp(b, 0, 255) << 16) | (clamp(g, 0, 255) << 8) | clamp(r, 0, 255)) >>> 0;

const PAL = {
  gold: [255, 214, 92],
  ember: [255, 150, 44],
  water: [120, 200, 240],
  leaf: [140, 200, 90],
  dust: [214, 196, 168],
  spark: [255, 240, 200],
  pink: [255, 130, 160],
};

export interface GameOpts {
  onHud: (h: Hud) => void;
  onPopup: (p: PopupEvt) => void;
  onPhase: (p: Phase) => void;
  onQuiz: (q: TriviaQuestion) => void;
}

export class Game {
  private cv: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private off: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D;
  private img!: ImageData;
  private buf!: Uint32Array;
  private W = 2;
  private H = 2;
  private dpr = 1;
  private cssW = 2;
  private cssH = 2;
  private zbuf = new Float32Array(2);
  private colTop = new Int32Array(2);
  private colBot = new Int32Array(2);
  private lowWall = new Uint8Array(2);
  private skyX = new Int32Array(2);
  private skyRow = new Int32Array(2);
  private vign: CanvasGradient | null = null;
  private darkGrad: CanvasGradient | null = null;

  // camera
  x = PLAYER_START.x;
  y = PLAYER_START.y;
  a = PLAYER_START.a;
  private pitch = 0;
  private fovKick = 1;
  private bob = 0;
  private bobPx = 0;
  private stepSide = 0;

  // motion
  private vx = 0;
  private vy = 0;
  private keys = new Set<string>();
  private tMove = { x: 0, y: 0 };
  private interactHeld = false;
  private sprint = false;
  sens = 1;

  // state
  phase: Phase = 'menu';
  private score = 0;
  private combo = 1;
  private comboT = 0;
  private time = 480; // long-form story day: eight calm minutes before refunds
  private tasks = 0;
  private bestCombo = 1;
  private activityHistory: string[] = [];
  private completedActivities = new Set<string>();
  private usedTrivia = new Set<string>();
  private nextQuizAt = 8;
  private lastTriviaCategory: ActivityCategory = 'home';
  private currentTrivia: TriviaQuestion | null = null;
  private triviaResult: TriviaResult | null = null;
  private triviaHistory: string[] = [];
  private quizCount = 0;
  private quizDelay: number | null = null;
  private lastActivityName = '';
  private pendingUnlocked: ActivityDef[] = [];
  private inventory: ItemId[] = []; // Multiple item slots (up to 5)
  private stations: Station[] = [];
  private items: ItemEnt[] = [];
  private parts: Part[] = [];
  private drops: { x: number; y: number; l: number; s: number }[] = [];
  private shake = 0;
  private flash = 0;
  private flashCol = '255,255,255';
  private ringPulse = 0;
  private denyT = 0;
  private rain = 0;
  private dark = false;
  private evT = 20;
  private ambT = 6;
  private currentEvent: ActiveEvent | null = null;
  private lastEvent: ActiveEvent['type'] | null = null;
  private guests: { x: number; y: number; ph: number }[] = [];
  private guestArrived = false;
  private festive = false;
  private goldenHour = false;
  private prevChapter = 1;
  private t = 0;
  private hudT = 0;
  private popupId = 1;
  private fpsAvg = 60;
  private resScale = 1;
  private frameTimes: number[] = [];
  private last = 0;
  private raf = 0;
  private target: Station | null = null;
  private locked = false;
  private interactWasHeld = false;
  private toolKick = 0;
  private working = false;

  constructor(cv: HTMLCanvasElement, private opts: GameOpts) {
    this.cv = cv;
    this.ctx = cv.getContext('2d', { alpha: false })!;
    this.off = document.createElement('canvas');
    this.offCtx = this.off.getContext('2d', { alpha: false })!;
    this.reset();
    this.resize();
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('resize', this.resize);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onVisibility);
    document.addEventListener('pointerlockchange', this.onPlChange);
    cv.addEventListener('mousemove', this.onMouseMove);
    cv.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('visibilitychange', this.onVisibility);
    document.removeEventListener('pointerlockchange', this.onPlChange);
    this.cv.removeEventListener('mousemove', this.onMouseMove);
    this.cv.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    sfx.rain(false);
  }

  // Dynamic max capacity based on user's score progression:
  // 1 item initially, 2 items at 1,000 pts, 3 items at 3,500 pts, 4 at 6,500 pts, max 5 at 10,000 pts.
  getMaxInventory(pts: number = this.score): number {
    if (pts >= 10000) return 5;
    if (pts >= 6500) return 4;
    if (pts >= 3500) return 3;
    if (pts >= 1000) return 2;
    return 1;
  }

  private get level() {
    return levelFromScore(this.score);
  }

  private getLevelQuest() {
    const next = scoreForNextLevel(this.level);
    if (this.level >= 100) return 'നൂറു തലങ്ങളിലെയും ജോലികൾ ലഭ്യമായി.';
    return `${(next ?? this.score).toLocaleString('en-IN')} പോയിന്റിൽ തലം ${this.level + 1}. പുതിയൊരു ജോലി കാത്തിരിക്കുന്നു.`;
  }

  // Story Chapters based on chores accomplished and time of day in Kerala:
  getStoryChapter(): StoryChapter {
    if (this.tasks >= 70) {
      return {
        num: 5,
        title: 'ദീപസന്ധ്യ',
        ml: 'ദീപസന്ധ്യ',
        desc: 'വിളക്കുകളുടെ വെളിച്ചത്തിൽ വീട്ടുകാർ ഒത്തുചേരുന്നു. ഇന്നത്തെ കഥകൾ പങ്കുവെക്കാം.',
        color: '#f59e0b',
      };
    }
    if (this.tasks >= 45) {
      return {
        num: 4,
        title: 'വിരുന്നുകാരെ വരവേൽക്കാം',
        ml: 'വിരുന്നുകാർ എത്തി',
        desc: 'കടത്തുകടന്ന് ബന്ധുക്കൾ എത്തി. ചൂടുള്ള ചായയും വൃത്തിയുള്ള പൂമുഖവും ഒരുക്കാം.',
        color: '#ec4899',
      };
    }
    if (this.tasks >= 25) {
      return {
        num: 3,
        title: 'ഇടവപ്പാതി മഴ',
        ml: 'ഇടവപ്പാതി മഴ',
        desc: 'ഓടിനുമുകളിൽ മഴയുടെ താളം. മുറ്റത്തെ ചാലുകളും കിണറും പരിശോധിക്കാം.',
        color: '#38bdf8',
      };
    }
    if (this.tasks >= 10) {
      return {
        num: 2,
        title: 'ഉച്ചനേരത്തെ ഒരുക്കങ്ങൾ',
        ml: 'ഉച്ചനേരത്തെ ഒരുക്കങ്ങൾ',
        desc: 'ലക്ഷ്മിക്ക് തീറ്റയും തോട്ടത്തിന് വെള്ളവും വേണം. അടുക്കളയും ഉണർന്നു കഴിഞ്ഞു.',
        color: '#10b981',
      };
    }
    return {
      num: 1,
      title: 'പ്രഭാത വേള',
      ml: 'പ്രഭാത വേള',
      desc: 'അമ്മയുടെ വിളിയോടെ ഒരു പുതിയ ദിവസം. മുറ്റം അടിച്ചുവാരി രാവിലത്തെ ചായ ഒരുക്കാം.',
      color: '#fbbf24',
    };
  }

  // ------------------------------------------------------------------ setup
  private reset() {
    this.score = 0;
    this.combo = 1;
    this.comboT = 0;
    this.time = 480;
    this.tMove = { x: 0, y: 0 };
    this.interactHeld = false;
    this.sprint = false;
    this.tasks = 0;
    this.bestCombo = 1;
    this.activityHistory = [];
    this.completedActivities.clear();
    this.usedTrivia.clear();
    this.nextQuizAt = nextTriviaGap();
    this.lastTriviaCategory = 'home';
    this.currentTrivia = null;
    this.pendingUnlocked = [];
    this.triviaHistory = [];
    this.triviaResult = null;
    this.quizDelay = null;
    this.quizCount = 0;
    this.lastActivityName = '';
    this.inventory = [];
    this.parts.length = 0;
    this.x = PLAYER_START.x;
    this.y = PLAYER_START.y;
    this.a = PLAYER_START.a;
    this.pitch = 0;
    this.vx = this.vy = 0;
    this.rain = 0;
    this.dark = false;
    this.evT = 50;
    this.shake = 0;
    this.flash = 0;
    this.currentEvent = null;
    this.lastEvent = null;
    this.guests = [];
    this.guestArrived = false;
    this.festive = false;
    this.goldenHour = false;
    this.prevChapter = 1;
    this.target = null;
    this.clearInputs();
    this.bob = 0;
    this.bobPx = 0;
    this.stepSide = 1;
    this.fovKick = 1;
    this.toolKick = 0;
    sfx.rain(false);
    this.stations = STATIONS.map((s) => {
      const p = freeSpot(s.x, s.y);
      return {
        ...s, x: p.x, y: p.y, active: false, cool: 0, prog: 0, bob: Math.random() * 6,
        activity: null, stage: 0, stageProgress: 0, release: false, finished: false, finishedKind: null,
      };
    });
    this.items = (Object.keys(ITEM_HOME) as ItemId[]).map((id) => {
      const p = freeSpot(ITEM_HOME[id].x, ITEM_HOME[id].y);
      return { id, x: p.x, y: p.y, active: true, cool: 0, grounded: false, awaitExit: false };
    });
    // opening chores: a gentle dawn board, not an overwhelming rush
    this.activate('sweep');
    this.activate('stove');
  }

  resize = () => {
    const r = this.cv.getBoundingClientRect();
    this.cssW = Math.max(320, r.width);
    this.cssH = Math.max(240, r.height);
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cv.width = Math.round(this.cssW * this.dpr);
    this.cv.height = Math.round(this.cssH * this.dpr);
    const aspect = this.cssW / this.cssH;
    const touchDev = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    // Higher crisp pixel budget for visual realism: ~100k desktop, ~70k mobile
    const target = (touchDev ? 72000 : 105000) * this.resScale;
    const h = Math.round(Math.sqrt(target / aspect));
    this.H = clamp(h, 160, 540);
    this.W = clamp(Math.round(this.H * aspect), 180, 1100);
    this.off.width = this.W;
    this.off.height = this.H;
    this.img = this.offCtx.createImageData(this.W, this.H);
    this.buf = new Uint32Array(this.img.data.buffer);
    this.zbuf = new Float32Array(this.W);
    this.colTop = new Int32Array(this.W);
    this.colBot = new Int32Array(this.W);
    this.lowWall = new Uint8Array(this.W);
    this.skyX = new Int32Array(this.W);
    this.skyRow = new Int32Array(this.H);
    this.buildGradients();
  };

  private buildGradients() {
    const w = this.cv.width, h = this.cv.height;
    const v = this.ctx.createRadialGradient(w / 2, h * 0.5, h * 0.28, w / 2, h * 0.5, h * 0.86);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(0.6, 'rgba(20,8,4,0.22)');
    v.addColorStop(1, 'rgba(12,4,2,0.72)');
    this.vign = v;
    const d = this.ctx.createRadialGradient(w / 2, h * 0.52, h * 0.06, w / 2, h * 0.5, h * 0.55);
    d.addColorStop(0, 'rgba(0,0,0,0)');
    d.addColorStop(0.45, 'rgba(0,0,0,0.5)');
    d.addColorStop(1, 'rgba(0,0,0,0.95)');
    this.darkGrad = d;
  }

  // ------------------------------------------------------------- public API
  startGame() {
    sfx.ensure();
    this.reset();
    this.phase = 'playing';
    this.opts.onPhase('playing');
    sfx.ui();
    this.opts.onPopup({
      id: this.popupId++,
      text: 'അധ്യായം 1 · പ്രഭാത വേള',
      sub: 'തിരക്കൊന്നുമില്ല. മുറ്റം അടിച്ചുവാരി അമ്മയ്ക്കൊപ്പം രാവിലത്തെ ചായ ഒരുക്കാം.',
      tone: 'gold',
      kind: 'story',
      duration: 6500,
    });
    this.emitHud();
  }
  pause() {
    if (this.phase !== 'playing') return;
    this.phase = 'paused';
    this.clearInputs();
    this.opts.onPhase('paused');
    sfx.rain(false);
    if (document.pointerLockElement) document.exitPointerLock();
  }
  resume() {
    if (this.phase !== 'paused') return;
    this.phase = 'playing';
    this.opts.onPhase('playing');
    sfx.ensure();
    sfx.ui();
    if (this.rain > 0) sfx.rain(true);
    this.last = performance.now();
  }
  toMenu() {
    this.phase = 'menu';
    this.reset();
    this.opts.onPhase('menu');
  }
  setTouchMove(x: number, y: number) {
    if (this.phase !== 'playing') return;
    this.tMove.x = x;
    this.tMove.y = y;
  }
  setInteract(v: boolean) {
    if (this.phase !== 'playing') return;
    this.interactHeld = v;
  }
  setSprint(v: boolean) {
    if (this.phase !== 'playing') return;
    this.sprint = v;
  }
  // Drop a specific item from inventory, or the last picked item if none specified
  dropItem(targetId?: ItemId) {
    if (this.inventory.length === 0 || this.phase !== 'playing') return;
    const dropId = targetId || this.inventory[this.inventory.length - 1];
    const idx = this.inventory.lastIndexOf(dropId);
    if (idx === -1) return;
    this.inventory.splice(idx, 1);

    const it = this.items.find((q) => q.id === dropId);
    if (it) {
      let p = { x: this.x, y: this.y };
      for (const offset of [0, .4, -.4, .8, -.8, 1.4, -1.4, Math.PI]) {
        const x = this.x + Math.cos(this.a + offset) * 1.25;
        const y = this.y + Math.sin(this.a + offset) * 1.25;
        if (this.canReach(x, y) && !this.blocked(x, y, .15) && !this.items.some((q) => q.active && Math.hypot(q.x - x, q.y - y) < .28)) {
          p = { x, y };
          break;
        }
      }
      it.x = p.x;
      it.y = p.y;
      it.active = true;
      it.cool = 1.2;
      it.grounded = true;
      it.awaitExit = true;
      this.burst(it.x, it.y, 0.15, 14, PAL.dust, 1.5);
      sfx.drop();
      this.shakeIt(2);
      this.opts.onPopup({
        id: this.popupId++,
        text: `${ITEM_INFO[it.id].icon} ${ITEM_INFO[it.id].name}`,
        sub: 'നിലത്ത് വെച്ചു. മാറിനിന്ന് തിരിച്ചെത്തുമ്പോൾ എടുക്കാം.',
        tone: 'info',
      });
    }
    this.emitHud();
  }
  addLook(dx: number, dy: number) {
    if (this.phase !== 'playing') return;
    this.a = wrapAng(this.a + dx * 0.0045 * this.sens);
    this.pitch = clamp(this.pitch - dy * 0.16 * this.sens * (this.H / 220), -this.H * 0.3, this.H * 0.3);
  }
  requestLock() {
    if (this.phase !== 'playing' || document.pointerLockElement === this.cv) return;
    try {
      const pending = this.cv.requestPointerLock?.();
      if (pending) void pending.catch(() => {
        this.opts.onPopup({ id: this.popupId++, text: 'കീബോർഡ് നിയന്ത്രണം ലഭ്യമാണ്', sub: 'അമ്പടയാള കീകൾ ഉപയോഗിച്ച് തിരിയാം.', tone: 'info' });
      });
    } catch { /* Arrow-key controls remain available in embedded browsers. */ }
  }

  private clearInputs() {
    this.keys.clear();
    this.tMove = { x: 0, y: 0 };
    this.vx = this.vy = 0;
    this.interactHeld = false;
    this.interactWasHeld = false;
    this.sprint = false;
    this.working = false;
  }

  private onBlur = () => {
    this.clearInputs();
    if (this.phase === 'playing') this.pause();
  };
  private onVisibility = () => {
    if (document.hidden) this.onBlur();
  };

  // ----------------------------------------------------------------- input
  private onKeyDown = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.matches('input, textarea, select') || t.isContentEditable)) return;
    const k = e.key.toLowerCase();
    if (t?.closest('button') && (k === ' ' || k === 'enter')) return;
    if (e.repeat || this.phase === 'quiz' || this.phase === 'menu') return;
    if (this.phase === 'playing' && ['w', 'a', 's', 'd', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    if (this.keys.has(k)) return;
    this.keys.add(k);
    if (k === 'escape' || k === 'p') {
      if (this.phase === 'playing') this.pause();
      else if (this.phase === 'paused') this.resume();
    }
    if (k === 'r' && (this.phase === 'over' || this.phase === 'paused')) this.startGame();
    if (k === 'f' || k === 'x') this.dropItem();
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };
  private onPlChange = () => {
    const wasLocked = this.locked;
    this.locked = document.pointerLockElement === this.cv;
    if (wasLocked && !this.locked && this.phase === 'playing') this.pause();
  };
  private onMouseMove = (e: MouseEvent) => {
    if (!this.locked || this.phase !== 'playing') return;
    this.a = wrapAng(this.a + e.movementX * 0.0022 * this.sens);
    this.pitch = clamp(this.pitch - e.movementY * 0.42 * this.sens * (this.H / 220), -this.H * 0.3, this.H * 0.3);
  };
  private onMouseDown = (e: MouseEvent) => {
    if (this.phase !== 'playing') return;
    if ((e as MouseEvent & { sourceCapabilities?: { firesTouchEvents: boolean } }).sourceCapabilities?.firesTouchEvents) return;
    if (!this.locked) {
      this.requestLock();
      return;
    }
    if (e.button === 0) this.interactHeld = true;
  };
  private onMouseUp = () => {
    this.interactHeld = false;
  };

  private keyMove() {
    const k = this.keys;
    let f = 0, s = 0;
    if (k.has('w') || k.has('arrowup')) f += 1;
    if (k.has('s') || k.has('arrowdown')) f -= 1;
    if (k.has('d')) s += 1;
    if (k.has('a')) s -= 1;
    if (k.has('arrowleft')) this.a = wrapAng(this.a - 2.1 * this.dt);
    if (k.has('arrowright')) this.a = wrapAng(this.a + 2.1 * this.dt);
    if (k.has('q')) this.a = wrapAng(this.a - 2.1 * this.dt);
    const m = Math.hypot(f, s);
    if (m > 1) { f /= m; s /= m; }
    if (Math.hypot(this.tMove.x, this.tMove.y) > 0.06) return this.tMove;
    return { x: s, y: f };
  }

  // ------------------------------------------------------------------ loop
  private dt = 0;
  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.1) dt = 0.1;
    if (dt <= 0) dt = 1 / 60;
    this.dt = dt;
    this.fpsAvg += (1 / dt - this.fpsAvg) * 0.08;
    this.t += dt;

    // adaptive resolution
    this.frameTimes.push(dt);
    if (this.frameTimes.length > 45) this.frameTimes.shift();
    if (this.frameTimes.length === 45) {
      const avg = this.frameTimes.reduce((p, c) => p + c, 0) / 45;
      if (avg > 0.0195 && this.resScale > 0.55) {
        this.resScale = Math.max(0.55, this.resScale - 0.09);
        this.frameTimes.length = 0;
        this.resize();
      } else if (avg < 0.0135 && this.resScale < 1) {
        this.resScale = Math.min(1, this.resScale + 0.06);
        this.frameTimes.length = 0;
        this.resize();
      }
    }

    if (this.phase === 'playing') this.updatePlay(dt);
    else if (this.phase === 'menu') this.updateAttract(dt);
    else this.updateFrozen(dt);

    this.render(dt);
    this.hudT += dt;
    if (this.hudT > 0.05) {
      this.hudT = 0;
      this.emitHud();
    }
  };

  private emitHud() {
    const maxInv = this.getMaxInventory();
    const level = this.level;
    const nextLevelScore = scoreForNextLevel(level);
    const currentLevelFloor = scoreForLevel(level);
    const levelProgress = nextLevelScore
      ? clamp((this.score - currentLevelFloor) / (nextLevelScore - currentLevelFloor), 0, 1)
      : 1;
    const invList: CarriedItem[] = this.inventory.map((id) => ({
      id,
      name: ITEM_INFO[id].name,
      icon: ITEM_INFO[id].icon,
    }));

    const objs: Objective[] = this.stations
      .filter((s) => s.active && s.activity)
      .map((s) => {
        const dx = s.x - this.x, dy = s.y - this.y;
        const task = s.activity;
        const hasRequired = !task?.item || this.inventory.includes(task.item);
        return {
          id: task?.id ?? s.id,
          icon: task?.icon ?? s.icon,
          name: task?.ml ?? s.ml,
          ml: task?.ml ?? s.ml,
          dist: Math.hypot(dx, dy),
          ang: wrapAng(Math.atan2(dy, dx) - this.a),
          locked: !hasRequired,
          itemIcon: task?.item ? ITEM_INFO[task.item].icon : null,
          behind: Math.abs(wrapAng(Math.atan2(dy, dx) - this.a)) > 1.35,
          station: STATION_LABELS[s.id],
          item: task?.item ?? null,
          progress: s.prog,
        };
      })
      .sort((p, q) => p.dist - q.dist)
      .slice(0, 8);

    const target = this.target;
    const task = target?.activity;
    const step = task?.steps[target?.stage ?? 0];
    const nearby = this.items
      .filter((item) => item.active && Math.hypot(item.x - this.x, item.y - this.y) < 1.7 && this.canReach(item.x, item.y))
      .sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y))[0];

    this.opts.onHud({
      score: this.score,
      level,
      levelProgress,
      nextLevelScore,
      levelQuest: this.getLevelQuest(),
      unlockedActivities: getActivityPool(level).length,
      combo: this.combo,
      comboT: this.comboT,
      time: this.time,
      tasks: this.tasks,
      completedIds: [...this.completedActivities],
      nearbyItem: nearby ? { id: nearby.id, name: ITEM_INFO[nearby.id].name, icon: ITEM_INFO[nearby.id].icon } : null,
      quizCount: this.quizCount,
      inventory: invList,
      maxInventory: maxInv,
      nextSlot:
        maxInv < 5
          ? { need: BAG_THRESHOLDS[maxInv], have: Math.min(this.score, BAG_THRESHOLDS[maxInv]) }
          : null,
      prompt: target && task && step
        ? {
            title: task.ml,
            ml: STATION_LABELS[target.id],
            verb: step.title,
            locked: step.tool && !!task.item && !this.inventory.includes(task.item),
            item: task.item ? ITEM_INFO[task.item].name : null,
            note: task.note,
            stage: target.stage,
            steps: task.steps.map((s) => s.title),
            instruction: step.instruction,
            input: step.input,
            progress: target.stageProgress,
            release: target.release,
            toolLocation: task.item ? this.items.find((it) => it.id === task.item)?.grounded ? 'മുമ്പ് നിലത്ത് വെച്ച സ്ഥലത്ത്' : ITEM_INFO[task.item].place : '',
            tool: step.tool ? task.item : null,
          }
        : null,
      objs,
      fps: Math.round(this.fpsAvg),
      rain: this.rain,
      dark: this.dark,
      scale: this.resScale,
      locked: this.locked,
      chapter: this.getStoryChapter(),
      activeEvent: this.currentEvent ? { ...this.currentEvent } : null,
      guestArrived: this.guestArrived,
    });
  }

  private updateAttract(dt: number) {
    this.a = wrapAng(this.a + dt * 0.1);
    this.x = 19.5;
    this.y = 21.2;
    this.pitch = Math.sin(this.t * 0.28) * 7;
    this.bobPx = 0;
    this.stations.forEach((s, i) => {
      s.bob += dt;
      s.active = i % 3 !== 1;
    });
    this.items.forEach((i) => (i.active = true));
    this.updateParts(dt);
  }

  private updateFrozen(dt: number) {
    this.stations.forEach((s) => (s.bob += dt * 0.2));
    this.updateParts(dt * 0.25);
    this.shake *= 0.9;
    this.flash *= 0.9;
  }

  private updatePlay(dt: number) {
    const st = this.stations;
    this.working = false;
    this.toolKick = Math.max(0, this.toolKick - dt * 3);
    if (this.quizDelay !== null) {
      this.quizDelay -= dt;
      if (this.quizDelay <= 0) {
        this.quizDelay = null;
        this.startTrivia(this.lastTriviaCategory);
        return;
      }
    }
    const holding = this.interactHeld || this.keys.has('e') || this.keys.has(' ');
    const pressed = holding && !this.interactWasHeld;
    this.interactWasHeld = holding;
    // ---------- movement
    const mv = this.keyMove();
    const outside = this.isOutside(this.x, this.y);
    const speedBase = (this.sprint || this.keys.has('shift') ? 4.2 : 2.8) * (this.rain > 0 && outside ? 0.86 : 1);
    const dirX = Math.cos(this.a), dirY = Math.sin(this.a);
    const wx = (-dirY * mv.x + dirX * mv.y) * speedBase;
    const wy = (dirX * mv.x + dirY * mv.y) * speedBase;
    const accel = 13;
    this.vx += (wx - this.vx) * Math.min(1, accel * dt);
    this.vy += (wy - this.vy) * Math.min(1, accel * dt);
    if (Math.abs(mv.x) + Math.abs(mv.y) < 0.05) {
      const f = Math.min(1, 11 * dt);
      this.vx -= this.vx * f;
      this.vy -= this.vy * f;
    }
    this.moveCollide(this.vx * dt, this.vy * dt);

    // head bob + footsteps
    const spd = Math.hypot(this.vx, this.vy);
    this.bob += dt * spd * 2.6;
    const amp = clamp(spd / 5, 0, 1);
    this.bobPx = Math.sin(this.bob * 2) * 2.4 * amp * (this.H / 220);
    const sw = Math.sin(this.bob);
    if (this.stepSide * sw < 0 && spd > 0.7) {
      this.stepSide = Math.sign(sw);
      sfx.step(outside || floorMap[Math.floor(this.y) * MW + Math.floor(this.x)] === F_VERANDA);
    }
    const targetKick = spd > 3.6 ? 1.045 : 1;
    this.fovKick += (targetKick - this.fovKick) * Math.min(1, 6 * dt);

    // ---------- timers
    this.time -= dt;
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) this.combo = 1;
    }
    this.shake *= Math.pow(0.0025, dt);
    this.flash *= Math.pow(0.004, dt);
    this.ringPulse += dt * 4;
    if (this.denyT > 0) this.denyT -= dt;

    if (this.time <= 0) {
      this.time = 0;
      this.gameOver();
      return;
    }
    if (this.time < 10.05 && this.time % 1 > 0.94) sfx.tick();

    // ---------- Story Chapter progression check
    const currentChap = this.getStoryChapter();
    if (currentChap.num > this.prevChapter) {
      this.prevChapter = currentChap.num;
      sfx.ensure();
      sfx.chapter();
      this.flashScreen(0.4, '255,220,120');
      this.shakeIt(4);
      this.opts.onPopup({
        id: this.popupId++,
        text: `അധ്യായം ${currentChap.num} · ${currentChap.title}`,
        sub: currentChap.desc,
        tone: 'gold',
        kind: 'story',
        duration: 6500,
      });
    }

    // ---------- Story events: live countdown, then clean teardown
    if (this.currentEvent) {
      this.currentEvent.time -= dt;
      if (this.currentEvent.type === 'rain') this.rain = Math.max(0, this.currentEvent.time);
      if (this.currentEvent.time <= 0) this.endEvent();
    }
    this.evT -= dt;
    if (this.evT <= 0 && !this.currentEvent) this.startEvent();

    // ---------- ambient life (birdsong, crickets, crows)
    this.ambT -= dt;
    if (this.ambT <= 0) {
      this.ambT = 8 + Math.random() * 8;
      if (Math.random() < 0.6) sfx.chirp();
      else sfx.crow();
    }

    // ---------- Multiple Item Collection (Up to maxInventory slots)
    const maxInv = this.getMaxInventory();
    for (const it of this.items) {
      if (this.inventory.includes(it.id)) continue;
      if (!it.active) continue;
      if (it.cool > 0) {
        it.cool = Math.max(0, it.cool - dt);
        continue;
      }
      const d = Math.hypot(it.x - this.x, it.y - this.y);
      if (it.awaitExit) {
        if (d > 1.6) it.awaitExit = false;
        continue;
      }
      if (d < 1.15 && this.inventory.length < maxInv && this.canReach(it.x, it.y)) {
        this.inventory.push(it.id);
        it.active = false;
        it.cool = 0;
        sfx.pickup();
        this.burst(it.x, it.y, 0.4, 14, PAL.gold, 2.2);
        this.shakeIt(2.5);
        this.opts.onPopup({
          id: this.popupId++,
          text: ITEM_INFO[it.id].name,
          sub: `സഞ്ചിയിൽ വെച്ചു (${this.inventory.length}/${maxInv})`,
          tone: 'good',
        });
      }
    }

    // ---------- targeting
    let best: Station | null = null;
    let bestS = 1e9;
    for (const s of st) {
      if (!s.active || !s.activity) continue;
      const dx = s.x - this.x, dy = s.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d > 2.35 || !this.canReach(s.x, s.y)) continue;
      const ang = Math.abs(wrapAng(Math.atan2(dy, dx) - this.a));
      if (ang > 0.65) continue;
      const sc = ang * 2.4 + d * 0.5;
      if (sc < bestS) {
        bestS = sc;
        best = s;
      }
    }
    this.target = best;

    if (best && best.activity) {
      const dx = best.x - this.x, dy = best.y - this.y;
      const want = Math.atan2(dy, dx);
      const diff = wrapAng(want - this.a);
      const d = Math.hypot(dx, dy);
      const task = best.activity;
      const step = task.steps[best.stage];
      const needItem = step.tool && task.item && !this.inventory.includes(task.item);
      if (!holding) best.release = false;
      if (holding && !best.release) {
        if (needItem) {
          if (this.denyT <= 0) {
            this.denyT = 3;
            sfx.deny();
            this.shakeIt(3);
            this.opts.onPopup({
              id: this.popupId++,
              text: `${ITEM_INFO[task.item!].name} വേണം`,
              sub: `${ITEM_INFO[task.item!].place} ലഭിക്കും.`,
              tone: 'bad',
            });
          }
        } else {
          // aim assist
          this.a = wrapAng(this.a + clamp(diff, -1, 1) * Math.min(1, 7 * dt) * clamp(1.6 - d * 0.25, 0.4, 1));
          const ang2 = Math.abs(wrapAng(want - this.a));
          const rate = clamp(1.25 - ang2 * 0.9, 0.35, 1);
          const acted = step.input === 'hold' || pressed;
          if (acted) {
            this.working = true;
            best.stageProgress = Math.min(1, best.stageProgress + (step.input === 'hold' ? dt * rate : 1) / step.amount);
            if (pressed) { this.toolKick = 1; sfx.tick(); }
            const water = ['water', 'draw', 'wash'].includes(task.kind);
            if (pressed || Math.random() < dt * 10) {
              this.burst(best.x, best.y, best.z + best.h * .45, water ? 3 : 2, water ? PAL.water : task.kind === 'cook' ? PAL.spark : PAL.dust, .65);
            }
          }
          best.prog = (best.stage + best.stageProgress) / task.steps.length;
          if (best.stageProgress >= 1 - 0.0001) {
            best.stage++;
            best.stageProgress = 0;
            best.release = true;
            if (best.stage >= task.steps.length) this.complete(best);
            else sfx.ui();
          }
        }
      }
    }
    for (const s of st) {
      s.bob += dt;
      if (!s.active && s.cool > 0) s.cool -= dt;
    }
    this.quota();
    this.updateParts(dt);
  }

  private canReach(x: number, y: number) {
    const dx = x - this.x, dy = y - this.y;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) * 14));
    for (let i = 1; i < steps; i++) {
      if (solidAt(Math.floor(this.x + dx * i / steps), Math.floor(this.y + dy * i / steps))) return false;
    }
    return true;
  }

  pickUpNearby() {
    if (this.phase !== 'playing' || this.inventory.length >= this.getMaxInventory()) return;
    const item = this.items.filter((it) => it.active && it.cool <= 0 && this.canReach(it.x, it.y))
      .sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y))[0];
    if (!item || Math.hypot(item.x - this.x, item.y - this.y) > 1.7) return;
    item.awaitExit = false;
    item.active = false;
    this.inventory.push(item.id);
    sfx.pickup();
    this.emitHud();
  }

  private quota() {
    const want = Math.min(3, 2 + Math.floor(this.tasks / 12));
    const active = this.stations.filter((s) => s.active).length;
    const waiting = this.pendingUnlocked.find((task) => !this.stations.find((s) => s.id === task.station)?.active);
    if (waiting && active < 4) {
      this.activate(waiting.station);
      return;
    }
    if (active >= want) return;
    const pool = this.stations.filter((s) => !s.active && s.cool <= 0);
    if (!pool.length) return;
    const untriedStations = pool.filter((s) => getActivityPool(this.level).some((task) => task.station === s.id && !this.completedActivities.has(task.id)));
    const candidates = untriedStations.length ? untriedStations : pool;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    this.activate(pick.id);
  }

  private activate(id: string) {
    const s = this.stations.find((q) => q.id === id);
    if (s && !s.active) {
      const all = getActivityPool(this.level).filter((task) => task.station === s.id);
      const live = new Set(this.stations.filter((q) => q.active && q.activity).map((q) => q.activity!.id));
      const fresh = all.filter((task) => !live.has(task.id) && !this.activityHistory.slice(-10).includes(task.id));
      const unfinished = all.filter((task) => !live.has(task.id) && !this.completedActivities.has(task.id));
      const candidates = unfinished.length ? unfinished : fresh.length ? fresh : all;
      const task = this.pendingUnlocked.find((q) => q.station === s.id) ?? candidates[Math.floor(Math.random() * candidates.length)];
      if (!task) return;
      s.active = true;
      s.prog = 0;
      s.activity = task;
      s.stage = 0;
      s.stageProgress = 0;
      s.release = false;
      s.finished = false;
      s.finishedKind = null;
      this.pendingUnlocked = this.pendingUnlocked.filter((q) => q.id !== task.id);
    }
  }

  private queueUnlockedActivity(level: number) {
    const unlocked = getActivityPool(level).find((task) => task.unlockLevel === level) ?? null;
    if (!unlocked) return null;
    if (!this.pendingUnlocked.some((q) => q.id === unlocked.id)) this.pendingUnlocked.push(unlocked);
    const station = this.stations.find((s) => s.id === unlocked.station);
    if (station && !station.active && this.stations.filter((s) => s.active).length < 4) {
      station.cool = 0;
      this.activate(station.id);
    }
    return unlocked;
  }

  private checkProgression(previousLevel: number, previousCapacity: number) {
    if (this.level > previousLevel) {
      for (let level = previousLevel + 1; level <= this.level; level++) this.queueUnlockedActivity(level);
      const newest = getActivityPool(this.level).find((task) => task.unlockLevel === this.level);
      sfx.upgrade();
      this.opts.onPopup({
        id: this.popupId++, text: `തലം ${this.level} തുറന്നു`,
        sub: newest ? `പുതിയ ജോലി: ${newest.ml}. ജോലിപ്പട്ടികയിൽ കാണാം.` : 'പുതിയ ജോലികൾ ലഭ്യമാണ്.',
        tone: 'gold', duration: 6000, kind: 'story',
      });
    }
    if (this.getMaxInventory() > previousCapacity) {
      sfx.upgrade();
      this.opts.onPopup({ id: this.popupId++, text: 'സഞ്ചി വലുതായി', sub: `ഇനി ${this.getMaxInventory()} സാധനങ്ങൾ ഒരുമിച്ച് കൊണ്ടുപോകാം.`, tone: 'good', duration: 4000 });
    }
  }

  // Five rotating Kerala story events. Never repeats the previous one, and
  // skips the power cut while the house is already dark.
  private startEvent() {
    const pool: ActiveEvent['type'][] = ['rain', 'dark', 'guests', 'breeze', 'festive'];
    const avail = pool.filter((t) => t !== this.lastEvent && (t !== 'dark' || !this.dark));
    const type = avail[Math.floor(Math.random() * avail.length)] ?? 'rain';
    this.lastEvent = type;
    this.evT = 60 + Math.random() * 25;
    sfx.ensure();

    if (type === 'rain') {
      this.rain = 45;
      sfx.rain(true);
      sfx.thunder();
      this.flashScreen(0.55, '190,215,255');
      this.shakeIt(6);
      this.currentEvent = {
        type, name: 'ഇടവപ്പാതി മഴ', ml: 'ഇടവപ്പാതി മഴ', icon: '🌧️', time: 45,
        desc: 'മുറ്റത്തെയും കിണറ്റുകരയിലെയും ജോലികൾക്ക് ഇരട്ടി പോയിന്റ്.',
      };
      this.opts.onPopup({ id: this.popupId++, text: 'മഴ പെയ്യുന്നു!', sub: 'പുറത്തുള്ള ജോലികൾക്ക് ഇരട്ടി പോയിന്റ്.', tone: 'info', duration: 4000 });
    } else if (type === 'dark') {
      this.dark = true;
      sfx.zap();
      this.activate('fuse');
      this.flashScreen(0.35, '120,140,255');
      this.shakeIt(8);
      this.currentEvent = {
        type, name: 'വൈദ്യുതി മുടങ്ങി', ml: 'കറന്റ് പോയി', icon: '⚡', time: 50,
        desc: 'കളിയിലെ സുരക്ഷാ സ്വിച്ച് പുനഃക്രമീകരിച്ചാൽ 350 ബോണസ് പോയിന്റ്.',
      };
      this.opts.onPopup({ id: this.popupId++, text: 'കറന്റ് പോയി!', sub: 'വടക്കേ വരാന്തയിലെ സുരക്ഷാ സ്വിച്ച് പരിശോധിക്കാം.', tone: 'bad', duration: 4000 });
    } else if (type === 'guests') {
      this.guestArrived = true;
      this.guests = [
        { x: 19.4, y: 35.2, ph: 0 },
        { x: 21.4, y: 34.9, ph: 1.7 },
        { x: 17.8, y: 34.7, ph: 3.1 },
      ];
      sfx.guest();
      this.activate('stove');
      this.activate('lamp');
      this.currentEvent = {
        type, name: 'കടത്തുകടന്ന് ബന്ധുക്കളെത്തി', ml: 'വിരുന്നുകാർ എത്തി', icon: '☕', time: 60,
        desc: 'ചായയും വിളക്കും ഒരുക്കിയാൽ 1.75 മടങ്ങ് പോയിന്റ്.',
      };
      this.opts.onPopup({ id: this.popupId++, text: 'വിരുന്നുകാർ എത്തി!', sub: 'പൂമുഖത്ത് ബന്ധുക്കൾ കാത്തിരിക്കുന്നു. ചായ ഒരുക്കാം.', tone: 'good', duration: 4000 });
    } else if (type === 'breeze') {
      this.goldenHour = true;
      sfx.chirp();
      this.currentEvent = {
        type, name: 'കുളിർക്കാറ്റ്', ml: 'കുളിർക്കാറ്റ്', icon: '🍃', time: 45,
        desc: 'ഈ നേരത്ത് ജോലി പൂർത്തിയാക്കിയാൽ ഇരട്ടി അധികസമയം.',
      };
      this.opts.onPopup({ id: this.popupId++, text: 'കുളിർക്കാറ്റ്', sub: 'മുറ്റത്ത് പൊൻവെളിച്ചം. സമയം എടുത്ത് ജോലി ചെയ്യാം.', tone: 'good', duration: 4000 });
    } else {
      this.festive = true;
      sfx.drum();
      this.flashScreen(0.4, '255,206,120');
      this.currentEvent = {
        type, name: 'ഉത്സവസന്ധ്യ', ml: 'ദീപസന്ധ്യ', icon: '🪔', time: 50,
        desc: 'മുറ്റത്ത് ദീപങ്ങൾ തെളിയുന്നു. എല്ലാ ജോലികൾക്കും 1.5 മടങ്ങ് പോയിന്റ്.',
      };
      this.opts.onPopup({ id: this.popupId++, text: 'ദീപസന്ധ്യ!', sub: 'അമ്പലമണി മുഴങ്ങുന്നു. എല്ലാ ജോലികൾക്കും കൂടുതൽ പോയിന്റ്.', tone: 'gold', duration: 4000 });
    }
    if (this.currentEvent) this.currentEvent.total = this.currentEvent.time;
  }

  private endEvent() {
    const ev = this.currentEvent;
    this.currentEvent = null;
    if (!ev) return;
    if (ev.type === 'rain') {
      this.rain = 0;
      sfx.rain(false);
      this.opts.onPopup({ id: this.popupId++, text: 'മഴ നിന്നു', sub: 'മേഘങ്ങൾ മലകൾക്കപ്പുറത്തേക്ക് നീങ്ങുന്നു.', tone: 'info' });
    } else if (ev.type === 'dark') {
      if (this.dark) {
        this.dark = false;
        this.opts.onPopup({ id: this.popupId++, text: 'വെളിച്ചം വന്നു', sub: 'നാട്ടിലെ വൈദ്യുതി വിതരണം തിരിച്ചെത്തി.', tone: 'info' });
      }
    } else if (ev.type === 'guests') {
      this.guestArrived = false;
      this.guests = [];
      this.opts.onPopup({ id: this.popupId++, text: 'വിരുന്നുകാർ പോയി', sub: 'വീണ്ടും വരാമെന്നു പറഞ്ഞ് അവർ കടവിലേക്ക് മടങ്ങി.', tone: 'info' });
    } else if (ev.type === 'breeze') {
      this.goldenHour = false;
    } else {
      this.festive = false;
    }
  }

  private complete(s: Station) {
    if (!s.active || !s.activity) return;
    const prevCap = this.getMaxInventory();
    const levelBefore = this.level;
    const activity = s.activity;
    const taskCategory = activity.category;
    const taskName = activity.ml;
    const taskBaseScore = activity.score;
    // Clear the completed assignment before any level unlock can reuse this station.
    s.activity = null;
    s.active = false;
    s.finished = true;
    s.finishedKind = activity.kind;
    s.prog = 1;
    s.stage = 0;
    s.stageProgress = 0;
    s.cool = 8 + Math.random() * 6;
    if (this.target === s) this.target = null;
    this.combo = this.comboT > 0 ? Math.min(9, this.combo + 1) : 1;
    this.comboT = 40;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const outside = this.isOutside(s.x, s.y);
    const monsoon = outside && this.rain > 0 ? 2 : 1;
    const guestBonus = (this.guestArrived && (s.id === 'stove' || s.id === 'lamp')) ? 1.75 : 1;
    const festBonus = this.festive ? 1.5 : 1;
    // Higher-level activities become more demanding and more rewarding, making
    // the 100-level journey practical during a long-form story session.
    const levelMultiplier = 1 + levelBefore * 0.085;
    const ramp = 1 + Math.min(0.8, this.tasks * 0.012);
    const pts = Math.round(taskBaseScore * levelMultiplier * (1 + (this.combo - 1) * 0.5) * monsoon * guestBonus * festBonus * ramp);
    this.score += pts;
    this.tasks++;
    if (activity) {
      this.completedActivities.add(activity.id);
      this.activityHistory.push(activity.id);
      if (this.activityHistory.length > 30) this.activityHistory.shift();
      this.lastTriviaCategory = taskCategory;
      this.lastActivityName = activity.ml;
    }

    // Generous time refund (story pacing) — doubled during the golden-hour breeze
    const bonus = Math.max(12, 20 - this.tasks * 0.08) * (this.goldenHour ? 2 : 1);
    this.time = Math.min(900, this.time + bonus);

    // Reusable tools stay in the bag; only an explicit drop puts them on the floor.
    sfx.complete(this.combo);
    if (s.id === 'well') sfx.splash();
    if (s.id === 'stove') sfx.fire();
    if (s.id === 'cow') sfx.moo();
    if (s.id === 'lamp') sfx.fire();
    if (s.id === 'fuse') sfx.zap();
    this.burst(s.x, s.y, s.z + s.h * 0.55, 34, s.id === 'well' || s.id === 'plants' ? PAL.water : PAL.gold, 4.2);
    this.burst(s.x, s.y, s.z + s.h * 0.4, 16, PAL.spark, 3);
    this.shakeIt(3.5);
    this.flashScreen(0.16, '255,226,150');
    this.ringPulse = 0;
    const label =
      guestBonus > 1 ? 'ആതിഥ്യ ബോണസ്'
      : monsoon > 1 ? 'മഴക്കാല ബോണസ്'
      : festBonus > 1 ? 'ദീപസന്ധ്യ ബോണസ്'
      : this.combo > 1 ? `തുടർച്ച: ${this.combo} ജോലികൾ`
      : 'നന്നായി!';
    this.opts.onPopup({
      id: this.popupId++,
      text: `+${pts}`,
      sub: `${taskName} · ${label} · +${bonus.toFixed(0)} സെക്കൻഡ്`,
      tone: 'gold',
    });
    if (this.dark && s.id === 'fuse') {
      this.dark = false;
      if (this.currentEvent?.type === 'dark') this.currentEvent = null;
      this.score += 350;
      this.time = Math.min(900, this.time + 20);
      this.flashScreen(0.3, '255,250,220');
      sfx.thunder();
      this.opts.onPopup({ id: this.popupId++, text: 'വെളിച്ചം വന്നു! +350', sub: 'വീട്ടിലെ വൈദ്യുതി തിരിച്ചെത്തി.', tone: 'good' });
    }
    this.interactHeld = false;
    this.interactWasHeld = true;
    this.keys.delete('e');
    this.keys.delete(' ');
    this.working = false;
    this.checkProgression(levelBefore, prevCap);

    // A reflective trivia break appears every 8–10 chores. It pauses the day
    // clock and uses the category of the work just completed.
    if (this.tasks >= this.nextQuizAt) {
      this.nextQuizAt = this.tasks + nextTriviaGap();
      this.quizDelay = 1.5 + Math.random() * 1.2;
    }
    this.emitHud();
  }

  private startTrivia(category: ActivityCategory) {
    this.lastTriviaCategory = category;
    const q = { ...pickTrivia(category, this.usedTrivia, this.triviaHistory), activity: this.lastActivityName };
    this.usedTrivia.add(q.id);
    this.triviaHistory.push(q.factId);
    this.triviaHistory = this.triviaHistory.slice(-16);
    this.currentTrivia = q;
    this.triviaResult = null;
    this.quizCount++;
    this.phase = 'quiz';
    this.clearInputs();
    sfx.rain(false);
    this.opts.onPhase('quiz');
    this.opts.onQuiz(q);
    if (document.pointerLockElement) document.exitPointerLock();
    this.emitHud();
  }

  answerTrivia(answerIndex: number): TriviaResult | null {
    const q = this.currentTrivia;
    if (!q || this.phase !== 'quiz' || this.triviaResult || !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) return null;
    const correct = answerIndex === q.correct;
    const levelBefore = this.level;
    const previousCapacity = this.getMaxInventory();
    const bonus = correct ? Math.round(300 + this.level * 30) : 0;
    const time = correct ? 18 + Math.min(20, this.level * 0.25) : 0;
    this.triviaResult = { selected: answerIndex, correct, reward: bonus, timeReward: time };
    if (correct) {
      this.score += bonus;
      this.time = Math.min(900, this.time + time);
      sfx.triviaCorrect();
      this.flashScreen(0.38, '180,255,205');
      this.burst(this.x + Math.cos(this.a) * 1.2, this.y + Math.sin(this.a) * 1.2, 0.7, 25, PAL.gold, 2.8);
    } else {
      sfx.triviaWrong();
    }
    this.checkProgression(levelBefore, previousCapacity);
    this.emitHud();
    return this.triviaResult;
  }

  continueTrivia() {
    if (this.phase !== 'quiz') return;
    this.currentTrivia = null;
    this.triviaResult = null;
    this.clearInputs();
    this.phase = 'playing';
    this.opts.onPhase('playing');
    if (this.rain > 0) sfx.rain(true);
    this.last = performance.now();
  }

  private gameOver() {
    this.phase = 'over';
    this.clearInputs();
    this.opts.onPhase('over');
    sfx.gameOver();
    sfx.rain(false);
    this.shakeIt(14);
    if (document.pointerLockElement) document.exitPointerLock();
  }

  get stats() {
    const ch = this.getStoryChapter();
    return {
      score: this.score,
      tasks: this.tasks,
      combo: this.bestCombo,
      level: this.level,
      activities: this.completedActivities.size,
      chapter: ch.num,
      chapterTitle: ch.title,
    };
  }

  // ------------------------------------------------------------- collision
  private moveCollide(dx: number, dy: number) {
    const r = 0.28;
    let nx = this.x + dx;
    if (!this.blocked(nx, this.y, r)) this.x = nx;
    else this.vx *= -0.05;
    let ny = this.y + dy;
    if (!this.blocked(this.x, ny, r)) this.y = ny;
    else this.vy *= -0.05;
  }
  private blocked(x: number, y: number, r: number) {
    for (let cy = Math.floor(y - r); cy <= Math.floor(y + r); cy++) {
      for (let cx = Math.floor(x - r); cx <= Math.floor(x + r); cx++) {
        if (solidAt(cx, cy)) {
          const nx = clamp(x, cx, cx + 1);
          const ny = clamp(y, cy, cy + 1);
          if ((nx - x) ** 2 + (ny - y) ** 2 < r * r) return true;
        }
      }
    }
    for (const s of this.stations) {
      if (!s.r) continue;
      const rr = s.r + r * 0.6;
      if ((s.x - x) ** 2 + (s.y - y) ** 2 < rr * rr) return true;
    }
    for (const d of DECOR) {
      if (!d.r) continue;
      const p = freeSpot(d.x, d.y);
      const rr = d.r + r * 0.5;
      if ((p.x - x) ** 2 + (p.y - y) ** 2 < rr * rr) return true;
    }
    return false;
  }
  private isOutside(x: number, y: number) {
    const cx = Math.floor(x), cy = Math.floor(y);
    if (cx < 0 || cy < 0 || cx >= MW || cy >= MH) return true;
    const f = floorMap[cy * MW + cx];
    return f === F_GRASS || f === F_COURT;
  }

  // ------------------------------------------------------------- particles
  private shakeIt(v: number) {
    this.shake = Math.min(16, this.shake + v);
  }
  private flashScreen(v: number, col: string) {
    this.flash = Math.max(this.flash, v);
    this.flashCol = col;
  }
  private burst(x: number, y: number, z: number, n: number, c: number[], spread: number) {
    for (let i = 0; i < n; i++) {
      if (this.parts.length > 340) this.parts.shift();
      const a = Math.random() * Math.PI * 2;
      const sp = (0.6 + Math.random() * 1.5) * spread * 0.5;
      this.parts.push({
        x, y, z,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        vz: 1.2 + Math.random() * 2.6 * spread * 0.4,
        life: 0.5 + Math.random() * 0.6,
        max: 1.1,
        col: col32(
          c[0] * (0.8 + Math.random() * 0.3),
          c[1] * (0.8 + Math.random() * 0.3),
          c[2] * (0.8 + Math.random() * 0.3),
        ),
        size: 0.03 + Math.random() * 0.05,
        grav: 5.5,
      });
    }
  }
  private updateParts(dt: number) {
    const p = this.parts;
    for (let i = p.length - 1; i >= 0; i--) {
      const q = p[i];
      q.life -= dt;
      if (q.life <= 0) {
        p.splice(i, 1);
        continue;
      }
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.z += q.vz * dt;
      q.vz -= q.grav * dt;
      if (q.z < 0.02) {
        q.z = 0.02;
        q.vz *= -0.35;
        q.vx *= 0.6;
        q.vy *= 0.6;
      }
    }
  }

  // ---------------------------------------------------------------- render
  private fogOf(d: number) {
    if (this.dark) return clamp((256 / (1 + d * d * 0.1)) | 0, 0, 256);
    return clamp((256 / (1 + d * d * 0.0032)) | 0, 0, 256);
  }

  private render(dt: number) {
    const W = this.W, H = this.H, buf = this.buf;
    const px = this.x, py = this.y;
    const dirX = Math.cos(this.a), dirY = Math.sin(this.a);
    // camera plane = k * right vector; fixed horizontal FOV (~66deg)
    const k = 0.65 * this.fovKick;
    const plX = -dirY * k, plY = dirX * k;
    const vm = W / (2 * k);
    const horizon = H * 0.5 + this.pitch + this.bobPx;
    const pano = TEX.pano;
    const panoH = H * 0.55;

    // sky lookups
    for (let x = 0; x < W; x++) {
      const camX = (2 * x) / W - 1;
      const rd = Math.atan2(dirY + plY * camX, dirX + plX * camX);
      this.skyX[x] = (((rd / (Math.PI * 2) + 0.5) * pano.w) | 0) % pano.w;
    }
    for (let y = 0; y < H; y++) {
      const f = (y - (horizon - panoH)) / panoH;
      this.skyRow[y] = clamp((f * pano.h) | 0, 0, pano.h - 1);
    }

    // ------------------------------------------------------------- walls
    for (let x = 0; x < W; x++) {
      const camX = (2 * x) / W - 1;
      const rdx = dirX + plX * camX;
      const rdy = dirY + plY * camX;
      let mx = Math.floor(px), my = Math.floor(py);
      const ddx = rdx === 0 ? 1e30 : Math.abs(1 / rdx);
      const ddy = rdy === 0 ? 1e30 : Math.abs(1 / rdy);
      const stepX = rdx < 0 ? -1 : 1;
      const stepY = rdy < 0 ? -1 : 1;
      let sdx = (rdx < 0 ? px - mx : mx + 1 - px) * ddx;
      let sdy = (rdy < 0 ? py - my : my + 1 - py) * ddy;
      let side = 0, hit = 0, guard = 0;
      while (guard++ < 120) {
        if (sdx < sdy) {
          sdx += ddx;
          mx += stepX;
          side = 0;
        } else {
          sdy += ddy;
          my += stepY;
          side = 1;
        }
        if (mx < 0 || my < 0 || mx >= MW || my >= MH) {
          hit = 3;
          break;
        }
        const g = grid[my * MW + mx];
        if (g) {
          hit = g;
          break;
        }
      }
      if (!hit) hit = 3;
      const perp = Math.max(0.08, side === 0 ? sdx - ddx : sdy - ddy);
      const wh = WALL_H[hit] ?? 1;
      const tex = WALL_TEX[hit] ?? TEX.plaster;
      const lh = vm / perp;
      const top = horizon - lh * (wh - 0.5);
      const bot = horizon + lh * 0.5;
      let wallX = side === 0 ? py + perp * rdy : px + perp * rdx;
      wallX -= Math.floor(wallX);
      let tx = (wallX * 128) | 0;
      if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) tx = 127 - tx;
      const y0 = Math.max(0, top | 0);
      const y1 = Math.min(H, bot | 0);
      const step = 128 / (bot - top);
      let tpos = (y0 - top) * step;
      let fog = this.fogOf(perp);
      // Realistic directional sunlight shading (South-West Kerala afternoon sunlight)
      if (side === 1) fog = (fog * 218) >> 8;
      else fog = (fog * 252) >> 8;
      if (hit === 9 || hit === 6) fog = Math.min(256, fog + 22);
      const td = tex.data;
      for (let y = y0; y < y1; y++) {
        let ty = tpos | 0;
        if (ty > 127) ty = 127;
        else if (ty < 0) ty = 0;
        const c = td[(ty << 7) + tx];
        const r = (((c & 255) * fog) >> 8) & 255;
        const g = ((((c >> 8) & 255) * fog) >> 8) & 255;
        const b = ((((c >> 16) & 255) * fog) >> 8) & 255;
        buf[y * W + x] = 0xff000000 | (b << 16) | (g << 8) | r;
        tpos += step;
      }
      this.colTop[x] = y0;
      this.colBot[x] = y1;
      this.zbuf[x] = perp;
      this.lowWall[x] = wh < 0.99 ? 1 : 0;
    }

    // --------------------------------------------------- floor / ceiling / sky
    const fOx = FLOOR_TEX[0].data, fCt = FLOOR_TEX[1].data, fGr = FLOOR_TEX[2].data, fVr = FLOOR_TEX[3].data;
    const ctd = CEIL_TEX.data;
    const panoD = pano.data;
    for (let y = 0; y < H; y++) {
      const p = y - horizon;
      const isFloor = p > 0;
      const ap = p < 0 ? -p : p;
      const rowOff = y * W;
      const skyR = this.skyRow[y] * pano.w;
      if (ap < 0.7) {
        const c = isFloor ? fOx[0] : panoD[skyR + 0];
        for (let x = 0; x < W; x++) {
          if (y < this.colTop[x] || y >= this.colBot[x]) buf[rowOff + x] = c;
        }
        continue;
      }
      const rowDist = (vm * 0.5) / ap;
      const stepX = (rowDist * 2 * plX) / W;
      const stepY = (rowDist * 2 * plY) / W;
      let fx = px + rowDist * (dirX - plX);
      let fy = py + rowDist * (dirY - plY);
      const fog = this.fogOf(rowDist);
      const indoorRow = !isFloor;
      for (let x = 0; x < W; x++) {
        if (y >= this.colTop[x] && y < this.colBot[x]) {
          fx += stepX;
          fy += stepY;
          continue;
        }
        const cx = Math.floor(fx), cy = Math.floor(fy);
        let c = 0;
        if (cx < 0 || cy < 0 || cx >= MW || cy >= MH) {
          c = indoorRow ? 0xff000000 : panoD[skyR + this.skyX[x]];
        } else if (isFloor) {
          const f = floorMap[cy * MW + cx];
          const tx = ((fx - cx) * 128) & 127;
          const ty = ((fy - cy) * 128) & 127;
          const t = (ty << 7) + tx;
          c = f === 0 ? fOx[t] : f === 1 ? fCt[t] : f === 3 ? fVr[t] : fGr[t];
        } else if (ceilMap[cy * MW + cx] !== 0) {
          const tx = ((fx - cx) * 128) & 127;
          const ty = ((fy - cy) * 128) & 127;
          c = ctd[(ty << 7) + tx];
        } else {
          c = panoD[skyR + this.skyX[x]];
        }
        const r = (((c & 255) * fog) >> 8) & 255;
        const g = ((((c >> 8) & 255) * fog) >> 8) & 255;
        const b = ((((c >> 16) & 255) * fog) >> 8) & 255;
        buf[rowOff + x] = 0xff000000 | (b << 16) | (g << 8) | r;
        fx += stepX;
        fy += stepY;
      }
    }

    // ------------------------------------------------------------- sprites
    const list: DrawEnt[] = [];
    const push = (e: DrawEnt) => {
      const sx = e.x - px, sy = e.y - py;
      e.dist = sx * sx + sy * sy;
      if (e.dist < 900) list.push(e);
    };
    for (const s of this.stations) {
      const action = s.activity?.kind ?? s.finishedKind;
      const sweepAmount = action === 'sweep' ? s.prog : 0;
      if (s.spr === 'leafpile' && s.finished && action === 'sweep') continue;
      const lampLit = this.festive || (action === 'light' && (s.finished || s.stage >= 2));
      const art = s.id === 'lamp'
        ? lampLit ? SPR.lamp : SPR.lampUnlit
        : s.id === 'tap' && (s.finished || s.stage >= 2) ? SPR.tapFixed : SPR[s.spr as keyof typeof SPR];
      push({
        spr: art,
        x: s.x, y: s.y, h: s.h * (1 - sweepAmount * .75), z: s.z,
        glow: s.id === 'lamp' && lampLit,
        dist: 0,
      });
      if (action === 'cook') {
        push({ spr: SPR.teaTray, x: s.x - .5, y: s.y + .25, h: .36, z: .02, glow: false, dist: 0 });
      }
      if (action === 'gather' || action === 'arrange') {
        push({ spr: SPR.flowerTray, x: s.x + .4, y: s.y + .25, h: .3, z: 0, glow: false, dist: 0 });
      }
      if (s.active) {
        const bob = Math.sin(s.bob * 3) * 0.05;
        const mh = 0.34;
        let mz = s.z + s.h + 0.1;
        const icx = Math.floor(s.y) * MW + Math.floor(s.x);
        if (icx >= 0 && icx < MW * MH && ceilMap[icx] !== 0 && mz + mh > 0.97) mz = 0.97 - mh;
        push({ spr: SPR.marker, x: s.x, y: s.y, h: mh, z: mz + bob, glow: true, dist: 0 });
      }
    }
      for (const it of this.items) {
        if (!it.active) continue;
        push({
          spr: SPR[ITEM_INFO[it.id].spr as keyof typeof SPR],
          x: it.x, y: it.y,
          h: it.id === 'broom' ? 0.5 : 0.34,
          z: it.grounded ? 0 : 0.04 + Math.sin(this.t * 2.4 + it.x) * 0.02,
          glow: !it.grounded,
          dist: 0,
        });
        push({ spr: SPR.marker, x: it.x, y: it.y, h: 0.28, z: 0.46 + Math.sin(this.t * 3 + it.y) * 0.04, glow: true, dist: 0 });
      }
    for (const d of DECOR) {
      const p = freeSpot(d.x, d.y);
      push({ spr: SPR[d.spr as keyof typeof SPR], x: p.x, y: p.y, h: d.h, z: d.z, glow: false, dist: 0 });
    }
    // visiting relatives waiting on the veranda (guest event)
    for (const g of this.guests) {
      const sway = Math.sin(this.t * 1.4 + g.ph) * 0.012;
      push({ spr: SPR.guest, x: g.x, y: g.y, h: 1.02, z: sway * 0.4, glow: false, dist: 0 });
    }
    // clay diyas lining the courtyard during the deepam evening
    if (this.festive) {
      const spots = [[17.6, 17.6], [22.4, 17.6], [17.6, 22.4], [22.4, 22.4], [19.4, 34.8], [21.2, 34.8], [16.5, 19.5], [23.1, 20.5]];
      for (let i = 0; i < spots.length; i++) {
        const flick = Math.sin(this.t * 7 + i * 1.9) * 0.012;
        push({ spr: SPR.diya, x: spots[i][0], y: spots[i][1], h: 0.24, z: 0.02 + flick, glow: true, dist: 0 });
      }
    }
    list.sort((m, n) => n.dist - m.dist);
    for (const e of list) {
      const sx = e.x - px, sy = e.y - py;
      const trX = dirX * sx + dirY * sy;
      const trY = (-dirY * sx + dirX * sy) / k;
      if (trX < 0.22) continue;
      const scX = (W / 2) * (1 + trY / trX);
      const vs = vm / trX;
      const yBot = horizon + (0.5 - e.z) * vs;
      const yTop = horizon + (0.5 - (e.z + e.h)) * vs;
      const height = yBot - yTop;
      if (height < 1) continue;
      const s = e.spr;
      const width = height * (s.w / s.h);
      const x0 = Math.max(0, Math.ceil(scX - width / 2));
      const x1 = Math.min(W - 1, Math.floor(scX + width / 2));
      if (x1 < x0) continue;
      const y0 = Math.max(0, Math.ceil(yTop));
      const y1 = Math.min(H - 1, Math.floor(yBot));
      if (y1 < y0) continue;
      const xs = s.w / width, ys = s.h / height;
      const fog = e.glow ? 256 : this.fogOf(trX);
      for (let x = x0; x <= x1; x++) {
        const zb = this.zbuf[x];
        if (!this.lowWall[x] && zb < trX) continue;
        const occTop = this.lowWall[x] && zb < trX ? this.colTop[x] : -1;
        const occBot = this.lowWall[x] && zb < trX ? this.colBot[x] : -1;
        const tx = ((x - scX + width / 2) * xs) | 0;
        if (tx < 0 || tx >= s.w) continue;
        let tyF = (y0 - yTop) * ys;
        for (let y = y0; y <= y1; y++) {
          const ty = tyF | 0;
          tyF += ys;
          if (occTop >= 0 && y >= occTop && y <= occBot) continue;
          if (ty < 0 || ty >= s.h) continue;
          const c = s.data[ty * s.w + tx];
          if ((c >>> 24) < 130) continue;
          const r = (((c & 255) * fog) >> 8) & 255;
          const g = ((((c >> 8) & 255) * fog) >> 8) & 255;
          const b = ((((c >> 16) & 255) * fog) >> 8) & 255;
          buf[y * W + x] = 0xff000000 | (b << 16) | (g << 8) | r;
        }
      }
    }

    // ------------------------------------------------------------- particles
    for (const q of this.parts) {
      const sx = q.x - px, sy = q.y - py;
      const trX = dirX * sx + dirY * sy;
      if (trX < 0.25) continue;
      const trY = (-dirY * sx + dirX * sy) / k;
      const scX = (W / 2) * (1 + trY / trX);
      const ix = scX | 0;
      if (ix < 0 || ix >= W) continue;
      const zb = this.zbuf[ix];
      if (!this.lowWall[ix] && zb < trX) continue;
      const vs = vm / trX;
      const sY = horizon + (0.5 - q.z) * vs;
      const iy = sY | 0;
      if (iy < 0 || iy >= H) continue;
      const size = Math.max(1, (q.size * vs) | 0);
      const life = clamp(q.life / q.max, 0, 1);
      const fog = ((this.fogOf(trX) * (0.35 + life * 0.75)) | 0) + 60;
      const c = q.col;
      const r = clamp((((c & 255) * fog) >> 8), 0, 255);
      const g = clamp(((((c >> 8) & 255) * fog) >> 8), 0, 255);
      const b = clamp(((((c >> 16) & 255) * fog) >> 8), 0, 255);
      const oc = 0xff000000 | (b << 16) | (g << 8) | r;
      for (let dy = 0; dy < size; dy++) {
        const yy = iy + dy;
        if (yy < 0 || yy >= H) continue;
        if (zb < trX && this.lowWall[ix] && yy >= this.colTop[ix] && yy <= this.colBot[ix]) continue;
        for (let dx = 0; dx < size; dx++) {
          const xx = ix + dx;
          if (xx < 0 || xx >= W) continue;
          buf[yy * W + xx] = oc;
        }
      }
    }

    this.offCtx.putImageData(this.img, 0, 0);
    this.blit(dt);
  }

  private blit(dt: number) {
    const ctx = this.ctx;
    const dw = this.cv.width, dh = this.cv.height;
    const sh = this.shake;
    const ox = (Math.random() * 2 - 1) * sh * this.dpr * 0.55;
    const oy = (Math.random() * 2 - 1) * sh * this.dpr * 0.55;
    const s = 1.03 + sh * 0.004;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.off, -dw * (s - 1) * 0.5 + ox, -dh * (s - 1) * 0.5 + oy, dw * s, dh * s);

    // Cinema-grade film tone mapping: warm Kerala golden hour sunlight bloom
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = this.goldenHour ? 'rgba(255, 175, 90, 0.28)' : 'rgba(255, 195, 120, 0.16)';
    ctx.fillRect(0, 0, dw, dh);

    ctx.globalCompositeOperation = 'source-over';
    if (this.vign) {
      ctx.fillStyle = this.vign;
      ctx.fillRect(0, 0, dw, dh);
    }

    // Atmospheric sun flare when looking towards the sun (~East-North-East)
    const cx = dw / 2;
    const sunAngle = -0.9;
    const angDiff = wrapAng(this.a - sunAngle);
    if (Math.abs(angDiff) < 1.1 && !this.dark && this.rain <= 0 && this.isOutside(this.x, this.y)) {
      const flareIntensity = Math.pow(Math.cos(angDiff * 1.3), 3);
      const flareX = cx - Math.tan(angDiff) * dw * 0.75;
      const flareY = dh * 0.35 + (this.pitch * 0.4) * (dh / this.H);
      const flareGrad = ctx.createRadialGradient(flareX, flareY, 10, flareX, flareY, dw * 0.55);
      flareGrad.addColorStop(0, `rgba(255, 245, 200, ${flareIntensity * 0.42})`);
      flareGrad.addColorStop(0.3, `rgba(255, 200, 110, ${flareIntensity * 0.22})`);
      flareGrad.addColorStop(1, 'rgba(255, 170, 70, 0)');
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = flareGrad;
      ctx.fillRect(0, 0, dw, dh);
      ctx.restore();
    }

    // rain
    if (this.rain > 0) {
      const n = Math.min(190, Math.round(dw / 6));
      while (this.drops.length < n) {
        this.drops.push({
          x: Math.random() * dw,
          y: Math.random() * dh,
          l: 10 + Math.random() * 26,
          s: 700 + Math.random() * 900,
        });
      }
      this.drops.length = n;
      const slant = (Math.sin(this.t * 0.4) * 0.3 + 0.34) * (Math.cos(this.a) >= 0 ? 1 : -1);
      ctx.strokeStyle = 'rgba(206,228,255,0.42)';
      ctx.lineWidth = Math.max(1, this.dpr * 0.9);
      ctx.beginPath();
      for (const d of this.drops) {
        d.y += d.s * dt;
        d.x += d.s * dt * slant * 0.55;
        if (d.y > dh) {
          d.y = -20;
          d.x = Math.random() * dw;
        }
        if (d.x > dw) d.x -= dw;
        if (d.x < 0) d.x += dw;
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - d.l * slant * 0.55, d.y - d.l);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(40,70,110,0.16)';
      ctx.fillRect(0, 0, dw, dh);
    }

    // power cut darkness
    if (this.dark) {
      const flick = 0.88 + Math.sin(this.t * .9) * .015;
      if (this.darkGrad) {
        ctx.save();
        ctx.globalAlpha = flick;
        ctx.fillStyle = this.darkGrad;
        ctx.fillRect(0, 0, dw, dh);
        ctx.restore();
      }
    }

    // reticle + target ring
    const tgt = this.target;
    const cy = dh / 2;
    if (this.phase === 'playing') {
      ctx.save();
      const inRange = !!tgt;
      const rad = (inRange ? 13 : 8) * this.dpr + Math.sin(this.ringPulse) * (inRange ? 2 : 0.6) * this.dpr;
      ctx.strokeStyle = inRange ? 'rgba(255,224,130,0.95)' : 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1.6 * this.dpr;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = inRange ? 'rgba(255,236,170,0.95)' : 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.arc(cx, cy, 1.7 * this.dpr, 0, Math.PI * 2);
      ctx.fill();
      if (inRange) {
        const g = 7 * this.dpr;
        ctx.beginPath();
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
          ctx.moveTo(cx + sx * (rad + 4 * this.dpr), cy + sy * (rad + 4 * this.dpr) - sy * g);
          ctx.lineTo(cx + sx * (rad + 4 * this.dpr), cy + sy * (rad + 4 * this.dpr));
          ctx.lineTo(cx + sx * (rad + 4 * this.dpr) - sx * g, cy + sy * (rad + 4 * this.dpr));
        }
        ctx.stroke();
      }
      // off-screen beacon to the nearest chore
      let near: Station | null = null;
      let nd = 1e9;
      for (const s of this.stations) {
        if (!s.active) continue;
        const d = Math.hypot(s.x - this.x, s.y - this.y);
        if (d < nd) {
          nd = d;
          near = s;
        }
      }
      if (near) {
        const ang = wrapAng(Math.atan2(near.y - this.y, near.x - this.x) - this.a);
        if (Math.abs(ang) > 0.4) {
          const R = Math.min(dw, dh) * 0.2;
          const bx = cx + Math.sin(ang) * R;
          const by = cy - Math.cos(ang) * R;
          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(ang);
          ctx.globalAlpha = 0.55 + Math.sin(this.ringPulse * 1.5) * 0.2;
          const hasReq = !near.activity?.item || this.inventory.includes(near.activity.item);
          ctx.fillStyle = hasReq ? '#ffd65c' : '#ff9a8a';
          ctx.beginPath();
          ctx.moveTo(0, -11 * this.dpr);
          ctx.lineTo(9 * this.dpr, 7 * this.dpr);
          ctx.lineTo(0, 3 * this.dpr);
          ctx.lineTo(-9 * this.dpr, 7 * this.dpr);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
      if (tgt && tgt.prog > 0.001) {
        const pr = 26 * this.dpr + Math.sin(this.ringPulse * 2) * 2 * this.dpr;
        ctx.lineWidth = 5 * this.dpr;
        ctx.strokeStyle = 'rgba(30,20,10,0.45)';
        ctx.beginPath();
        ctx.arc(cx, cy, pr, 0, Math.PI * 2);
        ctx.stroke();
        const tgtHasReq = !tgt.activity?.item || this.inventory.includes(tgt.activity.item);
        ctx.strokeStyle = tgtHasReq ? 'rgba(255,214,92,0.98)' : 'rgba(255,120,120,0.95)';
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy, pr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(tgt.prog, 0, 1));
        ctx.stroke();
      }
      ctx.restore();
    }

    this.drawWorkingTool(ctx, dw, dh);

    // flash
    if (this.flash > 0.01) {
      ctx.fillStyle = `rgba(${this.flashCol},${clamp(this.flash, 0, 1) * 0.75})`;
      ctx.fillRect(0, 0, dw, dh);
    }
  }

  private drawWorkingTool(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const task = this.target?.activity;
    const stage = task?.steps[this.target?.stage ?? 0];
    if (this.phase !== 'playing' || !task || !stage || !(this.working || this.toolKick > .01)) return;
    const tool = stage.tool && task.item ? ITEM_INFO[task.item].spr : task.kind === 'cook' ? 'ladle' : null;
    const image = tool ? spriteCanvas(tool) : null;
    const size = Math.min(w * .26, h * .37);
    const pulse = stage.input === 'press' ? Math.sin(this.toolKick * Math.PI) : Math.sin(this.t * 4);
    ctx.save();
    ctx.translate(w * .7 + pulse * size * .08, h - size * .22 - Math.abs(pulse) * size * .07);
    ctx.rotate(pulse * (task.kind === 'sweep' ? .32 : .12));
    const skin = ctx.createLinearGradient(-size * .08, 0, size * .32, size * .25);
    skin.addColorStop(0, '#bb855b'); skin.addColorStop(1, '#64412b');
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.ellipse(size * .16, size * .2, size * .13, size * .4, -.4, 0, Math.PI * 2); ctx.fill();
    ctx.imageSmoothingEnabled = true;
    if (image) {
      const toolHeight = size * 1.15;
      const toolWidth = toolHeight * image.width / image.height;
      ctx.drawImage(image, -toolWidth * .5, -toolHeight * .85, toolWidth, toolHeight);
    }
    ctx.restore();
  }
}
