// Run with Node: node scripts/check-restoration.mjs
// Exercises real game state and content with drawing/audio stubbed out.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const cache = new Map();
const gradient = { addColorStop() {} };
const drawing = {
  createRadialGradient: () => gradient,
  createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
};
const canvas = () => ({
  width: 800, height: 600, getContext: () => drawing,
  getBoundingClientRect: () => ({ width: 800, height: 600 }),
  addEventListener() {}, removeEventListener() {},
});
const memory = new Map();
const environment = {
  window: { devicePixelRatio: 1, addEventListener() {}, removeEventListener() {}, setTimeout, clearTimeout },
  document: { hidden: false, pointerLockElement: null, createElement: canvas, addEventListener() {}, removeEventListener() {}, exitPointerLock() {} },
  navigator: { maxTouchPoints: 0 },
  localStorage: { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: (key) => memory.delete(key) },
  requestAnimationFrame: () => 1, cancelAnimationFrame() {}, performance,
  TextEncoder, TextDecoder, Uint8Array, Uint8ClampedArray, Uint32Array, Int32Array, Float32Array,
  crypto: globalThis.crypto, btoa, atob, setTimeout, clearTimeout, console,
};
const audio = { sfx: new Proxy({}, { get: () => () => {} }) };
const texture = { w: 128, h: 128, data: new Uint32Array(128 * 128) };

function load(file) {
  file = resolve(file);
  if (file.endsWith('/game/audio.ts')) return audio;
  if (file.endsWith('/game/tex.ts')) return { TEX: new Proxy({}, { get: () => texture }) };
  if (file.endsWith('/game/sprites.ts')) return { SPR: {}, spriteCanvas: () => null };
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const source = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, useDefineForClassFields: true },
  }).outputText;
  const execute = vm.runInNewContext(`(function(require,module,exports){${source}\n})`, environment, { filename: file });
  execute((id) => id.startsWith('.') ? load(resolve(dirname(file), id + (id.endsWith('.ts') ? '' : '.ts'))) : require(id), module, module.exports);
  return module.exports;
}

const activities = load(resolve(root, 'src/game/activities.ts'));
const trivia = load(resolve(root, 'src/game/trivia.ts'));
const storage = load(resolve(root, 'src/game/storage.ts'));
const { Game } = load(resolve(root, 'src/game/engine.ts'));

assert.equal(activities.validateActivities(), true);
assert.equal(activities.LEVEL_ACTIVITIES.length, 100);
assert.equal(activities.MALAYALAM_NOTE_COUNT, 100);
assert.equal(activities.getActivityPool(0).length, 8);
assert.equal(activities.getActivityPool(100).length, 108);
assert.equal(trivia.validateTriviaBank(), true);
assert.equal(trivia.TRIVIA_BANK_SIZE, 1000);
for (let level = 1; level <= 100; level++) {
  const threshold = activities.scoreForLevel(level);
  assert.equal(activities.levelFromScore(threshold - 1), level - 1);
  assert.equal(activities.levelFromScore(threshold), level);
}
assert.equal(activities.scoreForLevel(1), 1000);
assert.equal(activities.scoreForLevel(2), 2500);
assert.equal(activities.levelFromScore(999999), 100);
for (const [random, expected] of [[0, 8], [.4, 9], [.99, 10]]) assert.equal(trivia.nextTriviaGap(() => random), expected);

const used = new Set(), facts = [];
for (let i = 0; i < 1100; i++) {
  const q = trivia.pickTrivia('home', used, facts);
  if (i < 1000) assert.ok(!used.has(q.id));
  used.add(q.id); facts.push(q.factId);
}
assert.equal(used.size, 1000);

const profile = { name: 'കടവിൽ തറവാട് 7ABC89', score: 4200, tasks: 11, combo: 2, level: 3, date: 1735689600000 };
assert.deepEqual(JSON.parse(JSON.stringify(storage.decodeShare(storage.encodeShare(profile)))), profile);
assert.equal(storage.decodeShare('invalid!'), null);
storage.addGroupRow(profile);
storage.addGroupRow({ ...profile, score: 2000 });
assert.equal(storage.loadGroup().length, 1);
assert.equal(storage.loadGroup()[0].score, 4200);

function newGame() {
  const game = new Game(canvas(), { onHud() {}, onPopup() {}, onPhase() {}, onQuiz() {} });
  game.startGame();
  return game;
}

// Newly unlocked work at the station just completed must not be cleared.
{
  const game = newGame();
  game.score = 960;
  const station = game.stations.find((s) => s.id === 'sweep');
  game.complete(station);
  assert.equal(game.level, 1);
  assert.equal(station.activity.id, 'l01');
  assert.equal(station.active, true);
  game.destroy();
}

// Reusable tools do not vanish, and a stationary player cannot re-pick a drop.
{
  const game = newGame();
  game.inventory = ['broom'];
  game.items.find((it) => it.id === 'broom').active = false;
  game.complete(game.stations.find((s) => s.id === 'sweep'));
  assert.ok(game.inventory.includes('broom'));
  game.dropItem('broom');
  const item = game.items.find((it) => it.id === 'broom');
  const droppedX = item.x, droppedY = item.y;
  for (let i = 0; i < 200; i++) game.updatePlay(.016);
  assert.equal(game.inventory.includes('broom'), false);
  assert.equal(item.active, true);
  assert.equal(item.grounded, true);
  assert.equal(item.x, droppedX);
  assert.equal(item.y, droppedY);
  game.destroy();
}

// A chore advances through real input stages rather than a renamed single hold.
{
  const game = newGame();
  const station = game.stations.find((s) => s.id === 'sweep');
  game.x = station.x; game.y = station.y - .85; game.a = Math.PI / 2;
  game.inventory = ['broom'];
  game.items.find((it) => it.id === 'broom').active = false;
  game.setInteract(true);
  for (let i = 0; i < 15; i++) game.updatePlay(.1);
  assert.equal(station.stage, 1);
  assert.equal(station.stageProgress, 0);
  for (let i = 0; i < 5; i++) {
    game.setInteract(false); game.updatePlay(.02);
    game.setInteract(true); game.updatePlay(.02);
  }
  assert.equal(station.stage, 2);
  game.setInteract(false); game.updatePlay(.02);
  game.setInteract(true);
  for (let i = 0; i < 15; i++) game.updatePlay(.1);
  assert.equal(game.tasks, 1);
  assert.equal(station.finished, true);
  game.destroy();
}

// Quiz time is frozen, reward is applied once, and only Continue resumes play.
{
  const game = newGame();
  game.nextQuizAt = 1;
  game.complete(game.stations.find((s) => s.id === 'stove'));
  assert.ok(game.nextQuizAt - game.tasks >= 8 && game.nextQuizAt - game.tasks <= 10);
  game.updatePlay(3);
  assert.equal(game.phase, 'quiz');
  const time = game.time;
  game.updateFrozen(2);
  assert.equal(game.time, time);
  const result = game.answerTrivia(game.currentTrivia.correct);
  assert.equal(result.correct, true);
  const rewardedScore = game.score;
  assert.equal(game.phase, 'quiz');
  assert.equal(game.answerTrivia(game.currentTrivia.correct), null);
  assert.equal(game.score, rewardedScore);
  game.continueTrivia();
  assert.equal(game.phase, 'playing');
  game.destroy();
}

console.log('Restoration checks passed: catalogue, Malayalam, trivia, levels, sharing, activity steps, unlock queue, inventory, and quiz lifecycle.');