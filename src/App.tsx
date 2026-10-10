import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Game, type CarriedItem, type Hud, type Phase, type PopupEvt, type TriviaResult } from './game/engine';
import { sfx } from './game/audio';
import type { TriviaQuestion } from './game/trivia';
import {
  addGroupRow,
  bestScore,
  clearGroup,
  decodeShare,
  loadGroup,
  loadScores,
  qualifies,
  saveScore,
  type GroupRow,
  type ScoreRow,
} from './game/storage';
import { loadPlayerName, normalizeHouseName, randomHouseName, savePlayerName } from './game/houses';
import { HudLayer, TouchControls } from './ui/GameUI';
import {
  GameOverScreen,
  InfoModal,
  NameEntry,
  PauseScreen,
  Prologue,
  StartScreen,
  TriviaOverlay,
} from './ui/Overlays';

const EMPTY_HUD: Hud = {
  score: 0,
  combo: 1,
  comboT: 0,
  time: 480,
  tasks: 0,
  level: 0,
  levelProgress: 0,
  nextLevelScore: 1000,
  levelQuest: '1,000 പോയിന്റിൽ ഒന്നാം തലം തുറക്കും.',
  unlockedActivities: 8,
  inventory: [],
  maxInventory: 1,
  nextSlot: { need: 1000, have: 0 },
  prompt: null,
  completedIds: [],
  nearbyItem: null,
  quizCount: 0,
  objs: [],
  fps: 60,
  rain: 0,
  dark: false,
  scale: 1,
  locked: false,
  chapter: {
    num: 1,
    title: 'പ്രഭാത വേള',
    ml: 'പ്രഭാത വേള',
    desc: 'മുറ്റം വൃത്തിയാക്കി രാവിലത്തെ ചായ ഒരുക്കാം.',
    color: '#fbbf24',
  },
  activeEvent: null,
  guestArrived: false,
};

export default function App() {
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game | null>(null);
  const phaseRef = useRef<Phase>('menu');
  const pending = useRef<{ score: number; tasks: number; combo: number; level: number; activities: number; chapter: number; chapterTitle: string } | null>(null);

  const [phase, setPhase] = useState<Phase>('menu');
  const [hud, setHud] = useState<Hud>(EMPTY_HUD);
  const [popups, setPopups] = useState<PopupEvt[]>([]);
  const [rows, setRows] = useState<ScoreRow[]>(() => loadScores());
  const [best, setBest] = useState<number>(() => bestScore());
  const [canSave, setCanSave] = useState(false);
  const [sens, setSens] = useState(1);
  const [muted, setMuted] = useState(false);
  const [quiz, setQuiz] = useState<TriviaQuestion | null>(null);
  const [quizResult, setQuizResult] = useState<TriviaResult | null>(null);
  const [playerName, setPlayerName] = useState(() => loadPlayerName());
  const playerNameRef = useRef(playerName);
  playerNameRef.current = playerName;
  const popupTimers = useRef(new Map<number, number>());
  const [group, setGroup] = useState<GroupRow[]>(() => loadGroup());
  const [modal, setModal] = useState<'none' | 'info' | 'name'>('none');
  const [prologue, setPrologue] = useState(false);
  const [touch] = useState(
    () => typeof window !== 'undefined' && (('ontouchstart' in window) || navigator.maxTouchPoints > 0),
  );

  const commit = useCallback((name?: string) => {
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    const houseName = normalizeHouseName(name || playerNameRef.current || randomHouseName());
    const date = Date.now();
    const saved = saveScore({ name: houseName, score: p.score, tasks: p.tasks, combo: p.combo, date });
    setRows(saved);
    setBest(saved[0]?.score ?? p.score);
    setCanSave(false);
    // Friend group board keeps one best run per house.
    setGroup(
      addGroupRow({
        name: houseName,
        score: p.score,
        tasks: p.tasks,
        combo: p.combo,
        level: p.level,
        date,
        local: true,
      }),
    );
  }, []);

  const onPhase = useCallback(
    (p: Phase) => {
      if (phaseRef.current === 'over' && p !== 'over') commit();
      if (p !== 'quiz') { setQuiz(null); setQuizResult(null); }
      if (p === 'menu') { setModal('none'); setPrologue(false); }
      phaseRef.current = p;
      setPhase(p);
      if (p === 'over' && gameRef.current) {
        const s = gameRef.current.stats;
        if (s.score > 0) {
          pending.current = s;
          if (qualifies(s.score)) {
            setCanSave(true);
            setRows(loadScores());
          } else {
            commit();
          }
        } else {
          setRows(loadScores());
        }
      }
    },
    [commit],
  );

  const onPopup = useCallback((p: PopupEvt) => {
    setPopups((cur) => [...cur.filter((q) => p.kind !== 'story' || q.kind !== 'story').slice(-3), p]);
    const timer = window.setTimeout(() => {
      setPopups((cur) => cur.filter((q) => q.id !== p.id));
      popupTimers.current.delete(p.id);
    }, p.duration ?? 3300);
    popupTimers.current.set(p.id, timer);
  }, []);

  const onQuiz = useCallback((question: TriviaQuestion) => {
    setQuizResult(null);
    setQuiz(question);
  }, []);

  useEffect(() => {
    if (!cvRef.current || gameRef.current) return;
    const g = new Game(cvRef.current, { onHud: setHud, onPopup, onPhase, onQuiz });
    gameRef.current = g;
    const t = setTimeout(() => g.resize(), 60);
    return () => {
      clearTimeout(t);
      g.destroy();
      gameRef.current = null;
      popupTimers.current.forEach((timer) => window.clearTimeout(timer));
      popupTimers.current.clear();
    };
  }, [onPopup, onPhase, onQuiz]);

  useEffect(() => {
    if (gameRef.current) gameRef.current.sens = sens;
  }, [sens]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.repeat || (t && (t.matches('input, textarea, select') || t.isContentEditable))) return;
      if (e.key.toLowerCase() === 'm') setMuted((m) => !m);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // stable handles for the touch layer (it must not re-register listeners per HUD tick)
  const touchGame = useMemo(
    () => ({
      requestLock: () => gameRef.current?.requestLock(),
    }),
    [],
  );
  const tOnMove = useCallback((x: number, y: number) => gameRef.current?.setTouchMove(x, y), []);
  const tOnLook = useCallback((dx: number, dy: number) => gameRef.current?.addLook(dx, dy), []);
  const tOnInteract = useCallback((v: boolean) => gameRef.current?.setInteract(v), []);
  const tOnSprint = useCallback((v: boolean) => gameRef.current?.setSprint(v), []);
  const tOnDrop = useCallback(() => gameRef.current?.dropItem(), []);
  const tOnDropItem = useCallback((id: CarriedItem['id']) => gameRef.current?.dropItem(id), []);
  const tOnPickup = useCallback(() => gameRef.current?.pickUpNearby(), []);
  const answerTrivia = useCallback((option: number) => {
    const result = gameRef.current?.answerTrivia(option);
    if (result) setQuizResult(result);
  }, []);
  const continueTrivia = useCallback(() => gameRef.current?.continueTrivia(), []);
  const openInfo = useCallback(() => {
    gameRef.current?.pause();
    setModal('info');
  }, []);
  useEffect(() => {
    sfx.setMuted(muted);
  }, [muted]);

  const start = useCallback(() => {
    setPopups([]);
    sfx.ensure();
    if (touch) {
      const el = document.documentElement as HTMLElement & { requestFullscreen?: () => Promise<void> };
      el.requestFullscreen?.().catch(() => {});
    }
    gameRef.current?.startGame();
  }, [touch]);

  const openPrologue = useCallback(() => {
    sfx.ensure();
    sfx.chapter();
    setPrologue(true);
  }, []);
  const beginFromPrologue = useCallback(() => {
    setPrologue(false);
    start();
  }, [start]);

  const end = gameRef.current?.stats ?? {
    score: 0,
    tasks: 0,
    combo: 1,
    level: 0,
    activities: 0,
    chapter: 1,
    chapterTitle: 'പ്രഭാത വേള',
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      <canvas ref={cvRef} className="scene-canvas absolute inset-0 h-full w-full" aria-label="കേരളത്തിലെ നാലുകെട്ട്, ആദ്യവ്യക്തി കാഴ്ച" />

      {phase !== 'menu' && (
        <HudLayer
          hud={hud}
          popups={popups}
          touch={touch}
          muted={muted}
          onMute={() => setMuted((m) => !m)}
          onPause={() => gameRef.current?.pause()}
          onDrop={tOnDrop}
          onDropItem={tOnDropItem}
          onPickup={tOnPickup}
          onInfo={openInfo}
        />
      )}

      {phase === 'playing' && touch && (
        <TouchControls
          game={touchGame}
          onMove={tOnMove}
          onLook={tOnLook}
          onInteract={tOnInteract}
          onSprint={tOnSprint}
        />
      )}

      {phase === 'quiz' && quiz && <TriviaOverlay key={quiz.id} question={quiz} result={quizResult} level={hud.level} onAnswer={answerTrivia} onContinue={continueTrivia} />}

      {phase === 'menu' && !prologue && (
        <StartScreen
          onStart={() => {
            sfx.ensure();
            setModal('name');
          }}
          onInfo={() => setModal('info')}
        />
      )}

      {phase === 'menu' && modal === 'name' && (
        <NameEntry
          initial={playerName}
          onBack={() => setModal('none')}
          onConfirm={(name) => {
            const house = normalizeHouseName(name) || randomHouseName();
            savePlayerName(house);
            setPlayerName(house);
            setModal('none');
            openPrologue();
          }}
          onSkip={() => {
            const house = randomHouseName();
            setPlayerName(house);
            setModal('none');
            openPrologue();
          }}
        />
      )}

      {(phase === 'menu' || phase === 'paused') && modal === 'info' && (
        <InfoModal
          onClose={() => setModal('none')}
          rows={rows}
          best={best}
          group={group}
          level={hud.level}
          completedIds={hud.completedIds}
          onImport={(code) => {
            const row = decodeShare(code);
            if (!row) return false;
            setGroup(addGroupRow(row));
            return true;
          }}
          onClearGroup={() => setGroup(clearGroup())}
          touch={touch}
          sens={sens}
          setSens={setSens}
          muted={muted}
          setMuted={setMuted}
        />
      )}

      {phase === 'menu' && prologue && modal === 'none' && (
        <Prologue onBegin={beginFromPrologue} onBack={() => setPrologue(false)} touch={touch} />
      )}

      {phase === 'paused' && modal === 'none' && (
        <PauseScreen
          onResume={() => gameRef.current?.resume()}
          onRestart={start}
          onMenu={() => gameRef.current?.toMenu()}
          onInfo={openInfo}
          sens={sens}
          setSens={setSens}
          muted={muted}
          setMuted={setMuted}
          score={hud.score}
          tasks={hud.tasks}
          chapter={hud.chapter}
          bag={hud.inventory.length}
          maxBag={hud.maxInventory}
        />
      )}

      {phase === 'over' && (
        <GameOverScreen
          score={end.score}
          tasks={end.tasks}
          combo={end.combo}
          level={end.level}
          activities={end.activities}
          chapter={end.chapter}
          chapterTitle={end.chapterTitle}
          rows={rows}
          group={group}
          playerName={playerName || 'വീട്'}
          canSave={canSave}
          onSave={(n) => commit(n)}
          onRestart={start}
          onMenu={() => gameRef.current?.toMenu()}
        />
      )}

      {/* mobile safe-area breathing room */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-6" />
    </div>
  );
}
