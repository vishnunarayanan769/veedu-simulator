import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { StoryChapter, TriviaResult } from '../game/engine';
import { LEVEL_ACTIVITIES, STARTER_ACTIVITIES, scoreForLevel } from '../game/activities';
import { CATEGORY_NAMES, STATION_LABELS } from '../game/activityDetails';
import { ITEM_INFO } from '../game/world';
import { spriteUrl } from '../game/sprites';
import { encodeShare, type GroupRow, type ScoreRow } from '../game/storage';
import type { TriviaQuestion } from '../game/trivia';

const number = (n: number) => n.toLocaleString('en-IN');

function Dialog({ title, onClose, narrow = false, children }: {
  title: string; onClose?: () => void; narrow?: boolean; children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const el = root.current;
    const focusable = () => Array.from(el?.querySelectorAll<HTMLElement>('button:not(:disabled), input, summary, select, [tabindex="0"]') ?? []).filter((item) => item.getClientRects().length);
    const initial = el?.querySelector<HTMLElement>('[data-initial-focus]') ?? focusable()[0];
    initial?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation(); closeRef.current?.();
      }
      if (e.key === 'Tab') {
        const controls = focusable();
        const first = controls[0], last = controls[controls.length - 1];
        if (!first) { e.preventDefault(); return; }
        if (e.shiftKey && (document.activeElement === first || !el?.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
        if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', key, true);
    return () => { document.removeEventListener('keydown', key, true); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return (
    <div className="dialog-scrim" role="dialog" aria-modal="true" aria-label={title} ref={root}>
      <div className="dialog-align">
        <section className={`dialog-paper ${narrow ? 'narrow' : ''}`}>
          <header className="dialog-header">
            <div><div className="dialog-eyebrow">വീട് · ഒരു നാലുകെട്ടിന്റെ കഥ</div><h2 className="dialog-title">{title}</h2></div>
            {onClose && <button className="icon-close" onClick={onClose} aria-label="അടയ്ക്കുക">×</button>}
          </header>
          {children}
        </section>
      </div>
    </div>
  );
}

function Btn({ children, onClick, quiet = false, small = false, disabled = false }: {
  children: ReactNode; onClick?: () => void; quiet?: boolean; small?: boolean; disabled?: boolean;
}) {
  return <button type="button" onClick={onClick} disabled={disabled} className={`ui-btn ${quiet ? 'quiet' : 'gold'} ${small ? 'small' : ''}`}>{children}</button>;
}

export function ScoreTable({ rows, highlight }: { rows: ScoreRow[]; highlight?: number }) {
  if (!rows.length) return <p className="empty-copy">ഇനിയും നേട്ടങ്ങളില്ല. ഈ വീട്ടിലെ ആദ്യ റെക്കോർഡ് നിങ്ങളുടേതാകട്ടെ.</p>;
  return (
    <table className="record-table">
      <thead><tr><th scope="col">ക്രമം</th><th scope="col">വീടിന്റെ പേര്</th><th className="number" scope="col">ജോലികൾ</th><th className="number" scope="col">പോയിന്റ്</th></tr></thead>
      <tbody>{rows.slice(0, 6).map((r, i) => <tr key={`${r.date}-${i}`} className={r.date === highlight || i === 0 ? 'best' : ''}><td>{i + 1}</td><td>{r.name}</td><td className="number">{r.tasks}</td><td className="number">{number(r.score)}</td></tr>)}</tbody>
    </table>
  );
}

function GroupTable({ rows }: { rows: GroupRow[] }) {
  if (!rows.length) return <p className="empty-copy">സുഹൃത്തിന്റെ കളിക്കോഡ് ചേർത്താൽ ഇവിടെ പോയിന്റുകൾ താരതമ്യം ചെയ്യാം.</p>;
  return (
    <table className="record-table">
      <thead><tr><th scope="col">ക്രമം</th><th scope="col">വീട്</th><th className="number" scope="col">തലം</th><th className="number" scope="col">പോയിന്റ്</th></tr></thead>
      <tbody>{rows.map((r, i) => <tr key={`${r.date}-${i}`} className={i === 0 ? 'best' : ''}><td>{i + 1}</td><td>{r.name}</td><td className="number">{r.level}</td><td className="number">{number(r.score)}</td></tr>)}</tbody>
    </table>
  );
}

interface SettingsProps { sens: number; setSens: (v: number) => void; muted: boolean; setMuted: (v: boolean) => void }
function Settings({ sens, setSens, muted, setMuted }: SettingsProps) {
  return <div>
    <label className="settings-row"><span>നോട്ടത്തിന്റെ വേഗം</span><input aria-label="നോട്ടത്തിന്റെ വേഗം" type="range" min="0.4" max="2.2" step="0.1" value={sens} onChange={(e) => setSens(Number(e.target.value))} /><span>{sens.toFixed(1)}</span></label>
    <div className="settings-row"><span>ശബ്ദം</span><Btn quiet small onClick={() => setMuted(!muted)}>{muted ? 'ശബ്ദം കേൾപ്പിക്കുക' : 'ശബ്ദം നിർത്തുക'}</Btn></div>
    <div className="settings-row"><span>കളിയുടെ ഭാഷ</span><strong>മലയാളം</strong></div>
    <p className="ui-help">ചോദ്യങ്ങളും മറുപടികളും ജോലിനിർദേശങ്ങളും മലയാളത്തിലാണ്. കീബോർഡിലെ കീകളുടെ പേരുകൾ മാത്രം അതേപടി കാണിക്കും.</p>
  </div>;
}

export function StartScreen({ onStart, onInfo }: { onStart: () => void; onInfo: () => void }) {
  return <main className="home-surface"><div className="home-content">
    <p className="home-kicker">കേരളം · തറവാട് · ജീവിതകഥ</p>
    <h1 className="home-title">വീട്</h1>
    <div className="home-wordmark" lang="en">VEEDU</div>
    <p className="home-subtitle">ഒരു നാലുകെട്ടിന്റെ കഥ</p>
    <div className="home-actions">
      <Btn onClick={onStart}>കഥ ആരംഭിക്കുക <span aria-hidden="true">→</span></Btn>
      <Btn quiet onClick={onInfo}><span aria-hidden="true">ⓘ</span> വിവരങ്ങളും ക്രമീകരണങ്ങളും</Btn>
    </div>
  </div></main>;
}

export function NameEntry({ initial, onConfirm, onSkip, onBack }: {
  initial?: string; onConfirm: (name: string) => void; onSkip: () => void; onBack?: () => void;
}) {
  const [name, setName] = useState(initial ?? '');
  return <Dialog title="നിങ്ങളുടെ വീടിന് ഒരു പേര്" onClose={onBack} narrow>
    <p className="dialog-copy">നിങ്ങളുടെ പേരോ വീടിന്റെ പേരോ നൽകാം. ഈ പേരിലാണ് നേട്ടങ്ങളും സുഹൃത്തുക്കളുടെ പട്ടികയും കാണുക.</p>
    <form onSubmit={(e) => { e.preventDefault(); onConfirm(name.trim()); }}>
      <label className="ui-label" htmlFor="house-name">പേര്</label>
      <input data-initial-focus className="ui-input" id="house-name" autoComplete="nickname" maxLength={64} value={name} onChange={(e) => setName(e.target.value)} placeholder="ഉദാ: കടവിൽ തറവാട്" />
      <div className="dialog-actions"><button className="ui-btn gold" type="submit">തുടരുക</button><Btn quiet onClick={onSkip}>ഒരു പേര് തിരഞ്ഞെടുക്കൂ</Btn></div>
    </form>
    <p className="ui-help">പേര് ഒഴിവാക്കിയാൽ ഒരു കേരളീയ വീട്ടുപേര് നൽകും. അതോടൊപ്പമുള്ള തിരിച്ചറിയൽക്കോഡ് സുഹൃത്തുക്കളുടെ പേരുകൾ തമ്മിൽ വേർതിരിക്കാൻ സഹായിക്കും.</p>
  </Dialog>;
}

const STORY = [
  { title: 'പ്രഭാതത്തിന്റെ ആദ്യ വെളിച്ചം', text: 'കാക്കകൾ ഉണരുന്നതിനു മുമ്പേ അമ്മ എഴുന്നേറ്റു. നടുമുറ്റത്തെ വിളക്ക് തെളിഞ്ഞിരിക്കുന്നു. ചുവന്ന നിലത്ത് രാത്രിയുടെ തണുപ്പ് ബാക്കിയുണ്ട്. ഈ തറവാട്ടിലെ ചെറുതും വലുതുമായ കാര്യങ്ങൾ ഇനി നിങ്ങളുടെയും ഉത്തരവാദിത്തമാണ്.' },
  { title: 'ജോലികൾക്ക് ഓരോ താളം', text: 'ചൂൽ വീശി ഇലകൾ കൂട്ടാം. ചായ ഇളക്കാം. കിണറ്റിലെ കയർ മെല്ലെ വലിക്കാം. ഓരോ ജോലിക്കും ഒരുക്കവും പ്രവർത്തിയും അവസാന പരിശോധനയും ഉണ്ട്. വേഗം വേണ്ട; പാതിവഴിയിൽ നിർത്തിയാലും ചെയ്ത ഭാഗം നഷ്ടപ്പെടില്ല.' },
  { title: 'പുതിയ ജോലികൾ കാത്തിരിക്കുന്നു', text: '1,000 പോയിന്റിൽ ഒന്നാം തലവും 2,500 പോയിന്റിൽ രണ്ടാം തലവും തുറക്കും. നൂറാം തലം വരെ ഓരോ തലത്തിലും പുതിയൊരു ജോലി ലഭിക്കും. സഞ്ചിയിലും കൂടുതൽ സാധനങ്ങൾ വയ്ക്കാനാകും. പഠിച്ചതെല്ലാം ജോലിപ്പട്ടികയിൽ കാണാം.' },
  { title: 'ഒരു ചായയിടവേളയിലെ ചോദ്യം', text: 'എട്ടു മുതൽ പത്തു വരെ ജോലികൾ കഴിഞ്ഞാൽ ചിലപ്പോൾ ഒരു ചോദ്യം വരും. കേരളത്തെക്കുറിച്ചും നിങ്ങൾ ചെയ്ത ജോലിയെക്കുറിച്ചും ചെറിയ കണക്കുകളെക്കുറിച്ചുമാണ് ചോദ്യങ്ങൾ. ആ സമയത്ത് കളിയുടെ ഘടികാരം നിൽക്കും. ഉത്തരം അറിഞ്ഞില്ലെങ്കിലും വിഷമിക്കേണ്ട; വിശദീകരണം വായിച്ച ശേഷം തുടരാം.' },
];

export function Prologue({ onBegin, onBack }: { onBegin: () => void; onBack: () => void; touch: boolean }) {
  const [page, setPage] = useState(0);
  return <Dialog title={STORY[page].title} onClose={onBack}>
    <div className="story-progress" aria-label={`${page + 1} / ${STORY.length}`}>{STORY.map((_, i) => <span key={i} className={i <= page ? 'active' : ''} />)}</div>
    <p key={page} className="story-copy slide-in">{STORY[page].text}</p>
    <div className="dialog-actions"><Btn quiet onClick={() => page ? setPage(page - 1) : onBack()}>പിന്നിലേക്ക്</Btn><Btn onClick={() => page === STORY.length - 1 ? onBegin() : setPage(page + 1)}>{page === STORY.length - 1 ? 'വീട്ടിലേക്ക് കടക്കാം' : 'അടുത്തത്'}</Btn></div>
    {page < STORY.length - 1 && <div className="dialog-actions"><Btn quiet small onClick={onBegin}>ആമുഖം ഒഴിവാക്കി കളിക്കാം</Btn></div>}
  </Dialog>;
}

export function TriviaOverlay({ question, level, result, onAnswer, onContinue }: {
  question: TriviaQuestion; level: number; result: TriviaResult | null;
  onAnswer: (option: number) => void; onContinue: () => void;
}) {
  const submitted = useRef(false);
  const choose = (i: number) => {
    if (submitted.current || result) return;
    submitted.current = true;
    onAnswer(i);
  };
  return <Dialog title="ഒരു ചെറിയ ചോദ്യവേള" onClose={onContinue}>
    <p className="dialog-eyebrow">{CATEGORY_NAMES[question.category]} · തലം {level} · സമയം നിർത്തിയിരിക്കുന്നു</p>
    {question.activity && <p className="ui-help">ഇപ്പോൾ പൂർത്തിയാക്കിയ ജോലി: {question.activity}</p>}
    <h3 className="dialog-title" style={{ fontSize: 21, marginTop: 16 }}>{question.prompt}</h3>
    <div className="quiz-options">
      {question.options.map((option, i) => {
        const state = !result ? '' : i === question.correct ? 'correct' : i === result.selected ? 'wrong' : 'dim';
        return <button key={option} className={`quiz-option ${state}`} disabled={!!result} onClick={() => choose(i)}>
          <span className="letter">{i + 1}</span><span>{option}</span>
          {result && i === question.correct && <span className="ml-auto" aria-label="ശരിയായ ഉത്തരം">✓</span>}
        </button>;
      })}
    </div>
    {result ? <div aria-live="polite">
      <p className="quiz-reward">{result.correct ? `ശരിയാണ്! +${number(result.reward)} പോയിന്റ്` : 'സാരമില്ല, പുതിയൊരു കാര്യം പഠിക്കാം.'}</p>
      <p className="quiz-fact">{question.fact}</p>
      {result.correct && <p className="ui-help">{Math.round(result.timeReward)} സെക്കൻഡ് അധികസമയവും ലഭിച്ചു. പോയിന്റ് ഒരിക്കൽ മാത്രം ചേർത്തിട്ടുണ്ട്.</p>}
      <div className="dialog-actions"><Btn onClick={onContinue}>വായിച്ചു, കളി തുടരാം</Btn></div>
    </div> : <>
      <p className="dialog-copy">തിരക്കില്ല. ശരിയുത്തരത്തിന് അധിക പോയിന്റും സമയവും ലഭിക്കും. തെറ്റായാൽ പോയിന്റ് കുറയില്ല.</p>
      <div className="dialog-actions"><Btn quiet small onClick={onContinue}>ഇപ്പോൾ ഒഴിവാക്കാം</Btn></div>
    </>}
  </Dialog>;
}

function ActivityJournal({ level, completedIds }: { level: number; completedIds: string[] }) {
  const [search, setSearch] = useState('');
  const completed = new Set(completedIds);
  const list = [...STARTER_ACTIVITIES, ...LEVEL_ACTIVITIES].filter((t) => `${t.ml} ${STATION_LABELS[t.station]} ${t.unlockLevel}`.includes(search.trim()));
  return <div>
    <p className="dialog-copy">100 തലങ്ങളിലെ ജോലികളും 8 അടിസ്ഥാന ജോലികളും ഇവിടെ കാണാം. പുതിയ ജോലി തുറന്നാൽ അതിന് മുൻഗണന ലഭിക്കും. ഇപ്പോൾ തലം {level}.</p>
    <label className="ui-label" htmlFor="activity-search">ജോലിയോ സ്ഥലമോ തിരയുക</label>
    <input id="activity-search" className="ui-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ഉദാ: ചായ, മുറ്റം, 10" />
    <div className="journal-list">
      {list.map((task) => <details key={task.id} className={task.unlockLevel > level ? 'locked' : ''}>
        <summary>
          <img className="item-thumb" src={spriteUrl(task.item ? ITEM_INFO[task.item].spr : task.station === 'stove' ? 'teaTray' : 'flowerTray')} alt="" />
          <div><div className="journal-name">{task.ml}</div><div className="journal-meta">{completed.has(task.id) ? 'പൂർത്തിയാക്കി' : task.unlockLevel <= level ? 'ലഭ്യമാണ്' : `${number(scoreForLevel(task.unlockLevel))} പോയിന്റിൽ തുറക്കും`} · {task.unlockLevel ? `തലം ${task.unlockLevel}` : 'അടിസ്ഥാന ജോലി'} · {STATION_LABELS[task.station]}</div></div>
        </summary>
        <div className="journal-detail"><p>{task.note}</p><p>{task.item ? `${ITEM_INFO[task.item].name}: ${ITEM_INFO[task.item].place} ലഭിക്കും.` : 'പ്രത്യേക ഉപകരണം കൊണ്ടുവരേണ്ടതില്ല.'}</p><ol>{task.steps.map((s) => <li key={s.title}>{s.title}</li>)}</ol></div>
      </details>)}
      {!list.length && <p className="empty-copy">ഈ പേരിൽ ജോലികളില്ല.</p>}
    </div>
  </div>;
}

export function InfoModal({ onClose, rows, best, group, onImport, onClearGroup, touch, level = 0, completedIds = [], ...settings }: {
  onClose: () => void; rows: ScoreRow[]; best: number; group: GroupRow[];
  onImport: (code: string) => boolean; onClearGroup: () => void; touch: boolean;
  level?: number; completedIds?: string[];
} & SettingsProps) {
  const [tab, setTab] = useState('about');
  const [code, setCode] = useState('');
  const [note, setNote] = useState('');
  const tabs = [['about', 'കളിവിവരം'], ['activities', 'ജോലികൾ'], ['friends', 'സുഹൃത്തുക്കൾ'], ['records', 'നേട്ടങ്ങൾ'], ['settings', 'ക്രമീകരണങ്ങൾ']];
  return <Dialog title="വിവരങ്ങളും ക്രമീകരണങ്ങളും" onClose={onClose}>
    <div className="info-tabs" role="tablist" aria-label="വിവരവിഭാഗങ്ങൾ">{tabs.map(([id, label]) => <button role="tab" id={`tab-${id}`} aria-selected={id === tab} aria-controls={`panel-${id}`} key={id} onClick={() => setTab(id)}>{label}</button>)}</div>
    <div className="info-section" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
      {tab === 'about' && <>
        <h3>വീട്ടിലെ ഓരോ ജോലിക്കും ഒരു കഥ</h3>
        <p>കേരളത്തിലെ ഒരു നാലുകെട്ടിൽ നടക്കുകയും ജോലികൾ ചെയ്യുകയും കാലാവസ്ഥ മാറുന്നത് അനുഭവിക്കുകയും ചെയ്യാം. പഴയ തടി, ചുവന്ന നിലം, പിച്ചളവിളക്ക്, കിണർ, ലക്ഷ്മി എന്നിവയെല്ലാം അതേ വീട്ടിലുണ്ട്.</p>
        <h3>എങ്ങനെ കളിക്കാം?</h3>
        <ul>
          <li>{touch ? 'ഇടതുവശത്ത് വിരൽ നീക്കി നടക്കാം. വലതുവശത്ത് വിരൽ നീക്കി ചുറ്റും നോക്കാം.' : <><kbd className="inline-key">W A S D</kbd> നടക്കാൻ. മൗസ് ഉപയോഗിച്ച് നോക്കാൻ കളിയിൽ ക്ലിക്ക് ചെയ്യുക. അമ്പടയാള കീകളും ഉപയോഗിക്കാം.</>}</li>
          <li>{touch ? 'ജോലി ബട്ടൺ ഉപയോഗിക്കുക. നിർദേശമനുസരിച്ച് പിടിച്ചുവയ്ക്കുകയോ പലതവണ അമർത്തുകയോ ചെയ്യണം.' : <><kbd className="inline-key">E</kbd> അല്ലെങ്കിൽ മൗസ് ബട്ടൺ ഉപയോഗിക്കുക. ഓരോ ഘട്ടത്തിന്റെയും നിർദേശമനുസരിച്ച് അമർത്തുകയോ പിടിച്ചുവയ്ക്കുകയോ ചെയ്യുക.</>}</li>
          <li>ഓരോ ജോലിക്കും മൂന്ന് ഘട്ടങ്ങളുണ്ട്. അടുത്ത ഘട്ടത്തിലേക്ക് പോകാൻ ബട്ടൺ വിട്ട് വീണ്ടും അമർത്തുക. ചെയ്ത ജോലി നഷ്ടപ്പെടില്ല.</li>
          <li>ചൂൽ, ബക്കറ്റ്, സ്പാനർ, തുണി, ബ്രഷ്, കത്രിക, കയർ എന്നിവ ജോലിക്ക് അനുയോജ്യമായി ഉപയോഗിക്കാം. ഉപകരണങ്ങൾ സഞ്ചിയിൽ തന്നെ തുടരും.</li>
          <li><kbd className="inline-key">F / X</kbd> അവസാന സാധനം താഴെവെക്കും. സഞ്ചിയിലെ സാധനം തൊട്ടാൽ അതുമാത്രം വെക്കാം. താഴെവച്ച സാധനം അവിടെത്തന്നെ തുടരും.</li>
          <li><kbd className="inline-key">Esc / P</kbd> ഇടവേള. <kbd className="inline-key">M</kbd> ശബ്ദം. ഇടവേളയിൽ <kbd className="inline-key">R</kbd> പുതിയ കളി.</li>
        </ul>
        <h3>വളർച്ചയും ചോദ്യവേളയും</h3>
        <p>തലം 1: 1,000 പോയിന്റ്. തലം 2: 2,500 പോയിന്റ്. പിന്നെ ഓരോ 1,500 പോയിന്റിലും ഒരു തലം; ആകെ 100. സഞ്ചി 1,000 / 3,500 / 6,500 / 10,000 പോയിന്റുകളിൽ 2 / 3 / 4 / 5 ഇടങ്ങളായി വളരും.</p>
        <p>ക്രമരഹിതമായി 8–10 ജോലികൾക്കുശേഷം ചോദ്യവേള വരും. 1,000 മലയാള ചോദ്യങ്ങളിൽ 100 കേരളീയ അറിവുചോദ്യങ്ങളും 900 വീട്ടുജോലിയുമായി ബന്ധപ്പെട്ട കണക്കുചോദ്യങ്ങളുമുണ്ട്. മറുപടിയും വിശദീകരണവും വായിക്കുന്ന സമയം കളി നിൽക്കും.</p>
        <h3>വീട്ടിലെ വിശേഷങ്ങൾ</h3>
        <p>മഴയിൽ പുറത്തുള്ള ജോലികൾക്ക് ഇരട്ടി പോയിന്റ്. വൈദ്യുതി തിരിച്ചെത്തിച്ചാൽ 350 ബോണസ്. വിരുന്നുകാർ ഉള്ളപ്പോൾ അടുക്കളയിലെയും വിളക്കിലെയും ജോലികൾക്ക് 1.75 മടങ്ങ്. ദീപസന്ധ്യയിൽ 1.5 മടങ്ങ്. കുളിർക്കാറ്റുള്ളപ്പോൾ അധികസമയം ഇരട്ടിയാകും.</p>
        <p className="safety-copy">ഇത് വീട്ടുജോലികളുടെ കളിയനുകരണമാണ്. യഥാർഥ വൈദ്യുതി അറ്റകുറ്റപ്പണിക്ക് പരിശീലനം നേടിയ വിദഗ്ധനെ വിളിക്കുക.</p>
      </>}
      {tab === 'activities' && <ActivityJournal level={level} completedIds={completedIds} />}
      {tab === 'friends' && <>
        <h3>വീട്ടുകാർക്കിടയിലെ സൗഹൃദമത്സരം</h3>
        <p>കളി കഴിഞ്ഞുള്ള കോഡ് സുഹൃത്തിന് അയയ്ക്കാം. അവരുടെ കോഡ് ഇവിടെ ചേർത്താൽ ഓരോ പേരിലെയും ഏറ്റവും ഉയർന്ന പോയിന്റ് കാണാം. ഇത് ഈ ഉപകരണത്തിൽ സൂക്ഷിക്കുന്ന പട്ടികയാണ്; തത്സമയ ഓൺലൈൻ കളിയല്ല.</p>
        <GroupTable rows={group} />
        <form onSubmit={(e) => { e.preventDefault(); const ok = onImport(code); setNote(ok ? 'സുഹൃത്തിന്റെ നേട്ടം ചേർത്തു.' : 'കോഡ് വായിക്കാനായില്ല. പൂർണമായ കോഡ് പരിശോധിക്കുക.'); if (ok) setCode(''); }}>
          <label className="ui-label" htmlFor="friend-code">സുഹൃത്തിന്റെ കളിക്കോഡ്</label>
          <input className="ui-input" id="friend-code" dir="ltr" value={code} maxLength={2048} onChange={(e) => setCode(e.target.value)} placeholder="VD1..." />
          <div className="dialog-actions"><button className="ui-btn gold" type="submit">കോഡ് ചേർക്കുക</button><Btn quiet onClick={() => { if (window.confirm('ഈ ഉപകരണത്തിലെ സുഹൃത്തുക്കളുടെ പട്ടിക മായ്ക്കണോ?')) onClearGroup(); }}>പട്ടിക മായ്ക്കുക</Btn></div>
        </form>
        {note && <p className="ui-status" role="status">{note}</p>}
        <h3>ഓൺലൈൻ കളിയും സേവും</h3>
        <p>ഇപ്പോൾ പേരും അവസാനിച്ച കളികളുടെ പോയിന്റും പ്രാദേശികമായി സൂക്ഷിക്കുന്നു. ഇടയ്ക്കുവെച്ച കളി തിരിച്ചെടുക്കുന്ന സേവ് ഇതുവരെ ചേർത്തിട്ടില്ല.</p>
        <p>പിന്നീട് അക്കൗണ്ടുകൾ, സ്വകാര്യ ഗ്രൂപ്പ് കോഡുകൾ, ക്ലൗഡ് സേവ്, പങ്കിട്ട ലീഡർബോർഡ് എന്നിവ സെർവറിലൂടെ ചേർക്കാം. സ്കോർ സെർവർ പരിശോധിക്കുന്ന സംവിധാനം വേണം. ഇപ്പോഴത്തെ പങ്കിടൽക്കോഡുകൾ സൗഹൃദമത്സരത്തിനുള്ളതാണ്; അവ സർട്ടിഫൈ ചെയ്ത സ്കോറുകളല്ല.</p>
      </>}
      {tab === 'records' && <><p className="dialog-copy">ഈ ഉപകരണത്തിലെ മികച്ച നേട്ടം: <strong>{number(best)} പോയിന്റ്</strong></p><ScoreTable rows={rows} /></>}
      {tab === 'settings' && <Settings {...settings} />}
    </div>
    <div className="dialog-actions"><Btn quiet onClick={onClose}>തിരികെ പോകാം</Btn></div>
  </Dialog>;
}

export function PauseScreen({ onResume, onRestart, onMenu, onInfo, score, tasks, chapter, bag, maxBag, ...settings }: {
  onResume: () => void; onRestart: () => void; onMenu: () => void; onInfo?: () => void;
  score: number; tasks: number; chapter: StoryChapter; bag: number; maxBag: number;
} & SettingsProps) {
  return <Dialog title="ഒരു ചെറിയ ഇടവേള" onClose={onResume} narrow>
    <p className="dialog-copy">അധ്യായം {chapter.num}: <strong>{chapter.title}</strong></p>
    <p className="dialog-copy">{chapter.desc}</p>
    <p className="end-summary">{number(score)} പോയിന്റ് · {tasks} ജോലികൾ · സഞ്ചി {bag}/{maxBag}</p>
    <div className="dialog-actions"><Btn onClick={onResume}>കളി തുടരാം</Btn>{onInfo && <Btn quiet onClick={onInfo}>ജോലികളും വിവരങ്ങളും</Btn>}</div>
    <Settings {...settings} />
    <div className="dialog-actions"><Btn quiet onClick={() => { if (window.confirm('ഇപ്പോഴത്തെ കളി ഉപേക്ഷിച്ച് പുതുതായി തുടങ്ങണോ?')) onRestart(); }}>പുതുതായി തുടങ്ങുക</Btn><Btn quiet onClick={onMenu}>മുഖ്യപേജിലേക്ക്</Btn></div>
  </Dialog>;
}

export function GameOverScreen({ score, tasks, combo, level, activities, chapter, chapterTitle, rows, group, playerName, onRestart, onMenu, canSave, onSave }: {
  score: number; tasks: number; combo: number; level: number; activities: number; chapter: number; chapterTitle: string;
  rows: ScoreRow[]; group: GroupRow[]; playerName: string; onRestart: () => void; onMenu: () => void;
  canSave: boolean; onSave: (name: string) => void;
}) {
  const [stamp] = useState(() => Date.now());
  const [copyState, setCopyState] = useState('');
  const codeRef = useRef<HTMLInputElement>(null);
  const shareCode = useMemo(() => encodeShare({ name: playerName, score, tasks, combo, level, date: stamp }), [playerName, score, tasks, combo, level, stamp]);
  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(shareCode);
      setCopyState('കോഡ് പകർത്തി.');
    } catch {
      codeRef.current?.focus(); codeRef.current?.select();
      setCopyState('താഴെയുള്ള കോഡ് തിരഞ്ഞെടുത്തിട്ടുണ്ട്. കോപ്പി ചെയ്ത് അയയ്ക്കാം.');
    }
  };
  return <Dialog title="ഇന്നത്തെ ജോലികൾക്ക് നന്ദി" onClose={onMenu}>
    <p className="dialog-copy">{playerName}</p>
    <div className="end-score">{number(score)}</div>
    <p className="end-summary">പോയിന്റ് · തലം {level}/100 · {tasks} ജോലികൾ · {activities} വ്യത്യസ്ത പ്രവർത്തികൾ</p>
    <p className="end-summary">അധ്യായം {chapter}: {chapterTitle} · മികച്ച തുടർച്ച: {combo}</p>
    <div className="dialog-actions">{canSave && <Btn onClick={() => onSave(playerName)}>നേട്ടം സൂക്ഷിക്കുക</Btn>}<Btn onClick={onRestart}>വീണ്ടും കളിക്കാം</Btn></div>
    <div className="info-section">
      <h3>സുഹൃത്തുക്കളുമായി പങ്കിടാം</h3>
      <p>ഈ കോഡ് സുഹൃത്തിന് അയയ്ക്കുക. അവർ വിവരങ്ങളിലെ സുഹൃത്തുക്കൾ വിഭാഗത്തിൽ ചേർക്കട്ടെ.</p>
      <input ref={codeRef} readOnly value={shareCode} aria-label="പങ്കിടാനുള്ള കളിക്കോഡ്" className="ui-input share-code" dir="ltr" onFocus={(e) => e.currentTarget.select()} />
      <div className="dialog-actions"><Btn quiet small onClick={() => { void copy(); }}>കോഡ് പകർത്തുക</Btn></div>
      <p className="ui-status" role="status">{copyState}</p>
      <GroupTable rows={group} />
      <h3>ഈ വീട്ടിലെ നേട്ടങ്ങൾ</h3><ScoreTable rows={rows} />
    </div>
    <div className="dialog-actions"><Btn quiet onClick={onMenu}>മുഖ്യപേജിലേക്ക്</Btn></div>
  </Dialog>;
}