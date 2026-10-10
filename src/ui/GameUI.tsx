import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { CarriedItem, Hud, PopupEvt } from '../game/engine';
import { BAG_THRESHOLDS } from '../game/engine';
import { ITEM_INFO } from '../game/world';
import { spriteUrl } from '../game/sprites';

const fmt = (n: number) => n.toLocaleString('en-IN');
const CHAPTER_STEPS = [0, 10, 25, 45, 70];

function Icon({ name }: { name: 'pause' | 'sound' | 'mute' | 'book' | 'lock' }) {
  const paths = {
    pause: 'M8 5v14M16 5v14',
    sound: 'M11 5L6 9H3v6h3l5 4V5ZM15 8c3 2 3 6 0 8M18 5c5 4 5 10 0 14',
    mute: 'M11 5L6 9H3v6h3l5 4V5ZM16 9l5 6M21 9l-5 6',
    book: 'M12 5c-4-2-7-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-2-1-5-1-9 1Zm0 0v15',
    lock: 'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5V10Zm7 4v3',
  };
  return <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>;
}

function Direction({ angle }: { angle: number }) {
  return <svg className="direction-arrow" style={{ transform: `rotate(${angle}rad)` }} aria-hidden="true" width="17" height="17" viewBox="0 0 24 24"><path d="M12 3 20 20 12 15 4 20Z" fill="currentColor" /></svg>;
}

export function HudLayer({ hud, popups, touch, onPause, onMute, onDrop, onDropItem, onPickup, onInfo, muted }: {
  hud: Hud; popups: PopupEvt[]; touch: boolean; onPause: () => void; onMute: () => void;
  onDrop: () => void; onDropItem: (id: CarriedItem['id']) => void; onPickup: () => void;
  onInfo: () => void; muted: boolean;
}) {
  const [boardOpen, setBoardOpen] = useState(true);
  const [bagOpen, setBagOpen] = useState(true);
  const seconds = Math.max(0, Math.ceil(hud.time));
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const prompt = hud.prompt;
  const story = popups.filter((p) => p.kind === 'story').slice(-1);
  const rewards = popups.filter((p) => p.kind !== 'story').slice(-2);
  const nextChores = CHAPTER_STEPS[hud.chapter.num] - hud.tasks;

  return <div className={`game-hud ${touch ? 'touch' : ''} ${prompt ? 'has-prompt' : ''}`}>
    <header className="game-top">
      <div className="hud-score glass">
        <div className="hud-label">പോയിന്റ്</div>
        <div key={hud.score} className="hud-score-number score-pop">{fmt(hud.score)}</div>
        <div className="hud-level"><span>തലം {hud.level}/100</span><div className="hud-meter"><span style={{ width: `${hud.levelProgress * 100}%` }} /></div></div>
        <span className="hud-fine">{hud.nextLevelScore ? `അടുത്തത്: ${fmt(hud.nextLevelScore)}` : 'എല്ലാ തലങ്ങളും തുറന്നു'}</span>
      </div>
      <div className="hud-chapter">
        <span className="hud-label">അധ്യായം {hud.chapter.num}</span>
        <strong>{hud.chapter.title}</strong>
        <span className={`hud-clock ${seconds <= 20 ? 'low' : ''}`}>{clock}</span>
        <span className="hud-fine">{Number.isFinite(nextChores) ? `അടുത്ത അധ്യായത്തിലേക്ക് ${Math.max(0, nextChores)} ജോലികൾ` : 'തറവാട്ടിലെ കഥ തുടരാം'}</span>
      </div>
      <div className="hud-commands">
        <div className="hud-command-row">
          <button onClick={onInfo} title="ജോലികളും വിവരങ്ങളും" aria-label="ജോലികളും വിവരങ്ങളും"><Icon name="book" /></button>
          <button onClick={onMute} title={muted ? 'ശബ്ദം കേൾപ്പിക്കുക' : 'ശബ്ദം നിർത്തുക'} aria-label={muted ? 'ശബ്ദം കേൾപ്പിക്കുക' : 'ശബ്ദം നിർത്തുക'}><Icon name={muted ? 'mute' : 'sound'} /></button>
          <button onClick={onPause} title="ഇടവേള" aria-label="ഇടവേള"><Icon name="pause" /></button>
        </div>
        <span className="hud-fine">{hud.tasks} ജോലികൾ പൂർത്തിയായി</span>
      </div>
    </header>

    <section className="work-panel glass" aria-label="ഇപ്പോഴത്തെ ജോലികൾ">
      <button className="hud-section-heading" onClick={() => setBoardOpen((v) => !v)} aria-expanded={boardOpen}>
        <span>ജോലിപ്പട്ടിക <small>{hud.objs.length}</small></span><span aria-hidden="true">{boardOpen ? '−' : '+'}</span>
      </button>
      {boardOpen && <div className="work-list">
        {hud.objs.map((task) => <div key={task.id} className="work-row">
          <div className="work-direction"><Direction angle={task.ang} /><span>{Math.round(task.dist)} മീ.</span></div>
          <div className="work-text"><strong>{task.ml}</strong><span>{task.station}{task.locked && task.item ? ` · ${ITEM_INFO[task.item].name} വേണം` : ''}</span>
            {task.progress > 0 && <div className="hud-meter"><span style={{ width: `${task.progress * 100}%` }} /></div>}
          </div>
          {task.item && <img className="work-tool" src={spriteUrl(ITEM_INFO[task.item].spr)} alt={ITEM_INFO[task.item].name} />}
        </div>)}
        <p className="hud-fine work-hint">{hud.levelQuest}</p>
        <button className="hud-text-button" onClick={onInfo}>എല്ലാ 108 ജോലികളും കാണാം →</button>
      </div>}
    </section>

    {hud.activeEvent && <aside className={`event-note ${hud.activeEvent.type}`} aria-live="polite">
      <div><strong>{hud.activeEvent.ml}</strong><span>{Math.ceil(hud.activeEvent.time)} സെ.</span></div>
      <p>{hud.activeEvent.desc}</p>
      <div className="hud-meter"><span style={{ width: `${Math.min(100, hud.activeEvent.time / (hud.activeEvent.total || 1) * 100)}%` }} /></div>
    </aside>}

    <section className="bag-panel glass" aria-label="സഞ്ചിയിലെ സാധനങ്ങൾ">
      <button className="hud-section-heading" onClick={() => setBagOpen((v) => !v)} aria-expanded={bagOpen}><span>സഞ്ചി <small>{hud.inventory.length}/{hud.maxInventory}</small></span><span aria-hidden="true">{bagOpen ? '−' : '+'}</span></button>
      {bagOpen && <>
        <div className="bag-slots">
          {BAG_THRESHOLDS.map((score, i) => {
            const item = hud.inventory[i];
            const unlocked = i < hud.maxInventory;
            return <div key={i} className="bag-slot-wrap">
              {item ? <button className="bag-slot filled" onClick={() => onDropItem(item.id)} aria-label={`${item.name} താഴെ വെക്കുക`} title={`${item.name} താഴെ വെക്കുക`}>
                <img src={spriteUrl(ITEM_INFO[item.id].spr)} alt="" /><span className="slot-remove" aria-hidden="true">×</span>
              </button> : <div className={`bag-slot ${unlocked ? 'empty' : 'locked'}`} title={unlocked ? 'ഒഴിഞ്ഞ ഇടം' : `${fmt(score)} പോയിന്റിൽ തുറക്കും`}>
                {unlocked ? <span>{i + 1}</span> : <Icon name="lock" />}
              </div>}
              <span className="bag-slot-name">{item ? item.name : unlocked ? 'ഒഴിഞ്ഞത്' : fmt(score)}</span>
            </div>;
          })}
        </div>
        <div className="bag-footer"><span>{hud.nextSlot ? `അടുത്ത ഇടം: ${fmt(hud.nextSlot.need)} പോയിന്റ്` : 'അഞ്ച് ഇടങ്ങളും ലഭ്യമാണ്'}</span><button onClick={onDrop} disabled={!hud.inventory.length}>താഴെ വെക്കുക{!touch && ' (F)'}</button></div>
        {hud.nearbyItem && <div className="nearby-item">
          <img src={spriteUrl(ITEM_INFO[hud.nearbyItem.id].spr)} alt="" /><span>{hud.nearbyItem.name}</span>
          {hud.inventory.length < hud.maxInventory ? <button onClick={onPickup}>എടുക്കുക</button> : <span className="bag-full">സഞ്ചി നിറഞ്ഞു</span>}
        </div>}
      </>}
    </section>

    {prompt && <section className="task-prompt glass" aria-label="ജോലിയുടെ ഘട്ടങ്ങൾ">
      <div className="task-location">{prompt.ml} · ഘട്ടം {prompt.stage + 1}/{prompt.steps.length}</div>
      <h2>{prompt.title}</h2>
      <div className="task-stage-rail">{prompt.steps.map((s, i) => <div key={s} className={i <= prompt.stage ? 'active' : ''}><span style={{ width: `${i < prompt.stage ? 100 : i === prompt.stage ? prompt.progress * 100 : 0}%` }} /></div>)}</div>
      <strong className="task-step-title">{prompt.verb}</strong>
      <p>{prompt.locked ? `${prompt.item} വേണം. ${prompt.toolLocation} ലഭിക്കും.` : prompt.instruction}</p>
      <div className={`task-action-hint ${prompt.locked ? 'needs-tool' : ''}`}>
        {prompt.locked ? 'ആവശ്യമായ ഉപകരണം കൊണ്ടുവരൂ' : prompt.release ? 'ബട്ടൺ വിട്ട് വീണ്ടും അമർത്തുക' : <>{!touch && <kbd>E</kbd>} {touch ? 'ജോലി ബട്ടൺ ' : ''}{prompt.input === 'press' ? 'വിട്ട് വിട്ട് അമർത്തുക' : 'പിടിച്ചുവയ്ക്കുക'}</>}
      </div>
      {prompt.note && <p className="task-story-note">{prompt.note}</p>}
    </section>}

    {!touch && !hud.locked && <div className="mouse-hint">ചുറ്റും നോക്കാൻ കളിയിൽ ക്ലിക്ക് ചെയ്യുക · അമ്പടയാള കീകളും ഉപയോഗിക്കാം</div>}

    <div className="toast-region" aria-live="polite">
      {story.map((p) => <div className="story-toast" key={p.id} style={{ animationDuration: `${p.duration ?? 6500}ms` }}><span>തറവാട്ടിലെ വിശേഷം</span><strong>{p.text}</strong><p>{p.sub}</p></div>)}
      {rewards.map((p) => <div className={`reward-toast ${p.tone ?? 'gold'}`} key={p.id} style={{ animationDuration: `${p.duration ?? 3300}ms` }}><strong>{p.text}</strong>{p.sub && <p>{p.sub}</p>}</div>)}
    </div>
  </div>;
}

export function TouchControls({ onMove, onLook, onInteract, onSprint, game }: {
  onMove: (x: number, y: number) => void; onLook: (dx: number, dy: number) => void;
  onInteract: (v: boolean) => void; onSprint: (v: boolean) => void; game: { requestLock: () => void };
}) {
  const layer = useRef<HTMLDivElement>(null);
  const movement = useRef<{ id: number; x: number; y: number } | null>(null);
  const look = useRef<{ id: number; x: number; y: number } | null>(null);
  const [stick, setStick] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null);
  useEffect(() => {
    const el = layer.current;
    if (!el) return;
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') { game.requestLock(); return; }
      if (e.clientX < innerWidth * .45 && e.clientY > innerHeight * .45 && !movement.current) {
        movement.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        setStick({ x: e.clientX, y: e.clientY, dx: 0, dy: 0 });
      } else if (!look.current) look.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      const m = movement.current;
      if (m?.id === e.pointerId) {
        let dx = e.clientX - m.x, dy = e.clientY - m.y;
        const length = Math.hypot(dx, dy);
        if (length > 52) { dx *= 52 / length; dy *= 52 / length; }
        onMove(dx / 52, -dy / 52);
        setStick({ x: m.x, y: m.y, dx, dy });
      } else if (look.current?.id === e.pointerId) {
        onLook(e.clientX - look.current.x, e.clientY - look.current.y);
        look.current.x = e.clientX; look.current.y = e.clientY;
      }
    };
    const up = (e: PointerEvent) => {
      if (movement.current?.id === e.pointerId) { movement.current = null; setStick(null); onMove(0, 0); }
      if (look.current?.id === e.pointerId) look.current = null;
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
    return () => {
      el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); el.removeEventListener('lostpointercapture', up);
      movement.current = null; look.current = null;
      onMove(0, 0); onInteract(false); onSprint(false);
    };
  }, [game, onMove, onLook, onInteract, onSprint]);

  const press = (e: ReactPointerEvent<HTMLButtonElement>, action: (value: boolean) => void) => {
    e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); action(true);
  };
  return <>
    <div ref={layer} className="touch-look-layer" />
    {stick ? <div className="touch-stick" style={{ left: stick.x - 52, top: stick.y - 52 }}><span style={{ transform: `translate(${stick.dx}px, ${stick.dy}px)` }} /></div> : <div className="touch-stick idle"><span /><small>നടക്കാൻ<br />വലിക്കുക</small></div>}
    <div className="touch-actions">
      <button className="touch-run" onPointerDown={(e) => press(e, onSprint)} onPointerUp={() => onSprint(false)} onPointerCancel={() => onSprint(false)} onLostPointerCapture={() => onSprint(false)}>ഓടുക</button>
      <button className="touch-work" onPointerDown={(e) => press(e, onInteract)} onPointerUp={() => onInteract(false)} onPointerCancel={() => onInteract(false)} onLostPointerCapture={() => onInteract(false)}>ജോലി<br />ചെയ്യുക</button>
    </div>
  </>;
}