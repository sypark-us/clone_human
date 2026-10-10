'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createStore } = require('../js/storage.js');

const KEY = 'clone-human:save';
const defaults = { music: false, sfx: true, speed: 1, tutorialSeen: false };
const run = { version: 1, phase: 'battle', turn: 3, hp: 40 };
const validRun = value => value !== null && typeof value === 'object' &&
  value.version === 1 && value.phase === 'battle' && Number.isInteger(value.turn) &&
  value.turn >= 0 && Number.isFinite(value.hp);

function memoryStorage(initial) {
  const data = new Map(initial === undefined ? [] : [[KEY, initial]]);
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); }
  };
}

function record(value = run, settings = defaults, version = 1) {
  return JSON.stringify({ version, run: value, settings });
}

test('empty storage returns a fresh settings object and does not write', () => {
  const storage = memoryStorage();
  const store = createStore(storage, validRun);
  const first = store.load();
  assert.deepEqual(first, { run: null, settings: defaults, error: null });
  first.settings.speed = 3;
  assert.deepEqual(store.load().settings, defaults);
  assert.equal(storage.getItem(KEY), null);
});

test('save and reload restore an independent run snapshot and selected settings', () => {
  const storage = memoryStorage();
  const store = createStore(storage, validRun);
  const input = { ...run };
  const settings = { music: true, sfx: false, speed: 0.5, tutorialSeen: true };
  assert.deepEqual(store.save(input, settings), { ok: true, error: null });
  input.hp = 0;
  const loaded = createStore(storage, validRun).load();
  assert.deepEqual(loaded, { run, settings, error: null });
  loaded.run.turn = 99;
  assert.equal(store.load().run.turn, 3);
});

test('all supported playback speeds survive persistence', () => {
  const store = createStore(memoryStorage(), validRun);
  for (const speed of [0.5, 1, 2, 3]) {
    assert.equal(store.save(run, { speed }).ok, true);
    assert.equal(store.load().settings.speed, speed);
  }
});

test('malformed preferences use defaults with no unknown or inherited keys', () => {
  const storage = memoryStorage(record(run, {
    music: 'false', sfx: 0, speed: '2', tutorialSeen: 1, injected: true
  }));
  const store = createStore(storage, validRun);
  assert.deepEqual(store.load().settings, defaults);
  const settings = Object.create({ music: true, sfx: false, speed: 3, tutorialSeen: true });
  assert.equal(store.save(run, settings).ok, true);
  assert.deepEqual(store.load().settings, defaults);
  for (const bad of [null, [], false, 'settings', { speed: 0 }, { speed: Infinity }]) {
    assert.equal(store.save(run, bad).ok, true);
    assert.deepEqual(store.load().settings, defaults);
  }
});

test('corrupt JSON is reported without changing the stored bytes', () => {
  const raw = '{broken';
  const storage = memoryStorage(raw);
  const loaded = createStore(storage, validRun).load();
  assert.equal(loaded.run, null);
  assert.deepEqual(loaded.settings, defaults);
  assert.equal(typeof loaded.error, 'string');
  assert.equal(storage.getItem(KEY), raw);
});

test('unknown and malformed schemas are rejected without deleting data', () => {
  for (const raw of [record(run, defaults, 2), record(run, defaults, '1'), 'null', '[]', '42', '{}', '{"version":1}']) {
    const storage = memoryStorage(raw);
    const loaded = createStore(storage, validRun).load();
    assert.equal(loaded.run, null);
    assert.equal(typeof loaded.error, 'string');
    assert.equal(storage.getItem(KEY), raw);
  }
});

test('engine validation rejects bad runs while recovering valid preferences', () => {
  const settings = { music: true, sfx: false, speed: 2, tutorialSeen: true };
  const raw = record({ ...run, turn: -1 }, settings);
  const storage = memoryStorage(raw);
  const result = createStore(storage, validRun).load();
  assert.equal(result.run, null);
  assert.deepEqual(result.settings, settings);
  assert.equal(typeof result.error, 'string');
  assert.equal(storage.getItem(KEY), raw);
});

test('invalid saves never overwrite a previous valid run', () => {
  const raw = record();
  const storage = memoryStorage(raw);
  const store = createStore(storage, validRun);
  for (const invalid of [undefined, {}, { ...run, turn: -1 }]) {
    const result = store.save(invalid, defaults);
    assert.equal(result.ok, false);
    assert.equal(typeof result.error, 'string');
    assert.equal(storage.getItem(KEY), raw);
  }
});

test('missing, throwing, and nonboolean validators never accept a run', () => {
  for (const validator of [undefined, () => { throw new Error('validator unavailable'); }, () => 'yes']) {
    const storage = memoryStorage(record());
    const store = createStore(storage, validator);
    assert.equal(store.load().run, null);
    assert.equal(typeof store.load().error, 'string');
    assert.equal(store.save(run, defaults).ok, false);
  }
});

test('clearRun removes the resumable run while retaining supplied preferences', () => {
  const storage = memoryStorage(record());
  const store = createStore(storage, validRun);
  const settings = { music: true, sfx: false, speed: 3, tutorialSeen: true };
  assert.deepEqual(store.clearRun(settings), { ok: true, error: null });
  assert.deepEqual(store.load(), { run: null, settings, error: null });
});

test('explicit saves and clears can replace a corrupt record', () => {
  const storage = memoryStorage('{broken');
  const store = createStore(storage, validRun);
  assert.equal(store.save(run, defaults).ok, true);
  assert.deepEqual(store.load().run, run);
  storage.setItem(KEY, '{broken');
  assert.equal(store.clearRun(defaults).ok, true);
  assert.deepEqual(store.load(), { run: null, settings: defaults, error: null });
});

test('unavailable storage is reported by every operation without throwing', () => {
  const denied = {};
  for (const method of ['getItem', 'setItem']) {
    Object.defineProperty(denied, method, { get() { throw new Error('access denied'); } });
  }
  for (const storage of [null, undefined, {}, denied]) {
    const store = createStore(storage, validRun);
    assert.deepEqual(store.load().run, null);
    assert.deepEqual(store.load().settings, defaults);
    assert.equal(typeof store.load().error, 'string');
    assert.equal(store.save(run, defaults).ok, false);
    assert.equal(store.clearRun(defaults).ok, false);
  }
});

test('quota errors preserve the old run and return a usable failure result', () => {
  const storage = memoryStorage(record());
  storage.setItem = () => { throw Object.assign(new Error('full'), { name: 'QuotaExceededError' }); };
  const store = createStore(storage, validRun);
  const result = store.save({ ...run, turn: 4 }, defaults);
  assert.equal(result.ok, false);
  assert.equal(typeof result.error, 'string');
  assert.equal(store.load().run.turn, 3);
  assert.equal(store.clearRun(defaults).ok, false);
  assert.equal(store.load().run.turn, 3);
});

test('oversized stored records are rejected before engine validation', () => {
  const raw = record({ ...run, log: 'x'.repeat(300000) });
  const storage = memoryStorage(raw);
  let validations = 0;
  const store = createStore(storage, value => { validations += 1; return validRun(value); });
  assert.equal(store.load().run, null);
  assert.equal(typeof store.load().error, 'string');
  assert.equal(validations, 0);
  assert.equal(storage.getItem(KEY), raw);
});

test('oversized, circular and nonserializable runs do not replace good data', () => {
  const raw = record();
  const storage = memoryStorage(raw);
  const store = createStore(storage, validRun);
  const circular = { ...run };
  circular.self = circular;
  for (const invalid of [{ ...run, log: 'x'.repeat(300000) }, circular, { ...run, counter: 1n }]) {
    assert.equal(store.save(invalid, defaults).ok, false);
    assert.equal(storage.getItem(KEY), raw);
  }
});

test('the serialized snapshot must also pass engine validation', () => {
  const storage = memoryStorage(record());
  const store = createStore(storage, validRun);
  const deceptive = { ...run, toJSON() { return { ...run, turn: -1 }; } };
  assert.equal(store.save(deceptive, defaults).ok, false);
  assert.deepEqual(store.load().run, run);
});

test('browser script exposes the same store API without CommonJS', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(require.resolve('../js/storage.js'), 'utf8'), context);
  assert.equal(typeof context.window.CloneHumanStorage.createStore, 'function');
  const store = context.window.CloneHumanStorage.createStore(memoryStorage(), validRun);
  assert.equal(store.save(run, defaults).ok, true);
  assert.equal(store.load().run.hp, 40);
});
