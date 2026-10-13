'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../js/engine');
const C = require('../js/i18n-content');

// AC-3: the number a machine's note carries is what the engine applied that
// turn. The metrics ledger records every applied gain per source, so it is the
// independent reference the notes are compared against.
const LAYOUTS = [
  ['mine', 'echo', 'clone', 'boost', 'soldier', 'mutation', 'bomb', 'revive'],
  ['mine', 'clone', 'onclone', 'recycle', 'onkill', 'autoclone', 'mutation', 'echo'],
  ['mine', 'mine', 'boost', 'clone', 'soldier', 'mutation', 'bomb', 'recycle'],
  ['soldier', 'echo', 'mutation', 'boost', 'mine', 'echo', 'onkill', 'autoclone']
];
const ENERGY = ['mine', 'onkill', 'recycle'], CLONES = ['clone', 'soldier', 'autoclone', 'revive'];
const amountOf = text => Number((/(\d+)명|[+×](\d+)/.exec(text) || []).slice(1).find(Boolean));

function battle(slots, sectorId, level) {
  const s = E.createRun({ seed: 42 }); E.chooseRoute(s, 0); E.installModule(s, s.offers[0]);
  s.slots = slots.slice();
  Object.assign(s, { wave: 6, energy: 40, units: 6, sectorId });
  if (level) { s.version = 3; s.machineLevels = s.slots.map(id => id ? level : 0); }
  E.startBattle(s);
  return s;
}
const ledger = s => JSON.parse(JSON.stringify(s.metrics));
const sum = (notes, kinds) => notes.filter(note => kinds.includes(note.kind)).reduce((total, note) => total + amountOf(note.text), 0);

test('every activation note carries the amount the engine applied that turn', () => {
  let checked = 0;
  const seen = new Set();
  for (const sector of E.SECTORS) for (const slots of LAYOUTS) for (const level of [0, 3]) {
    const s = battle(slots, sector.id, level);
    while (s.phase === 'battle') {
      const before = ledger(s), attackBefore = s.attack;
      E.tick(s);
      const id = sector.id + ' ' + slots.join() + ' L' + level + ' turn ' + s.turn;
      for (const kind of [...ENERGY, ...CLONES]) {
        const notes = s.lastTurn.filter(note => note.kind === kind);
        const field = ENERGY.includes(kind) ? 'energy' : 'clones';
        assert.equal(sum(notes, [kind]), s.metrics[kind][field] - before[kind][field], kind + ' ' + id);
        for (const note of notes) assert.match(note.text, /\d/, kind + ' note "' + note.text + '" has no number, ' + id);
        checked += notes.length; if (notes.length) seen.add(kind);
      }
      const mutations = s.lastTurn.filter(note => note.kind === 'mutation');
      assert.equal(sum(mutations, ['mutation']), s.attack - attackBefore, 'mutation ' + id);
      if (mutations.length) seen.add('mutation');
      for (const note of mutations) assert.match(note.text, /\d/, 'mutation note "' + note.text + '" has no number, ' + id);
      // A repeat is one more activation of the machine in front; it is either a
      // fresh note of that machine or its idle note.
      s.slots.forEach((module, slot) => {
        if (module !== 'echo' && module !== 'boost') return;
        const note = s.lastTurn.find(item => item.slot === slot && item.kind === module);
        const previous = s.slots[slot - 1];
        if (!note || !['mine', 'clone', 'soldier', 'mutation'].includes(previous)) return;
        assert.match(note.text, /^.+ ×\d+$/, module + ' note "' + note.text + '", ' + id);
        const ran = s.lastTurn.filter(item => item.slot === slot - 1 && (item.kind === previous || item.kind === 'idle')).length - 1;
        assert.equal(amountOf(note.text), ran, module + ' repeats ' + id);
        checked++; seen.add(module);
      });
    }
  }
  assert.ok(checked > 400, 'checked ' + checked);
  assert.deepEqual([...seen].sort(), ['autoclone', 'boost', 'clone', 'echo', 'mine', 'mutation', 'onkill', 'recycle', 'revive', 'soldier']);
});

test('activation notes translate to English with the same number and keep the saved shape', () => {
  let seen = 0;
  for (const slots of LAYOUTS) {
    const s = battle(slots, 'laboratory', 3);
    while (s.phase === 'battle') {
      E.tick(s);
      for (const note of s.lastTurn) {
        assert.deepEqual(Object.keys(note).sort(), ['kind', 'slot', 'text']);
        const english = C.translate(note.text, 'en');
        assert.doesNotMatch(english, /[가-힣]/, note.text);
        if (/\d/.test(note.text)) assert.equal(english.match(/\d+/g).join(), note.text.match(/\d+/g).join(), note.text);
        seen++;
      }
      assert.equal(E.validateRun(s), true);
    }
  }
  assert.ok(seen > 100);
  assert.equal(C.translate('채굴기 +4 E', 'en'), 'Miner +4 E');
  assert.equal(C.translate('복제 배양기 +1명', 'en'), 'Clone Vat +1 clone');
  assert.equal(C.translate('변이 연구소 공격력 +2', 'en'), 'Mutation Lab +2 attack');
  assert.equal(C.translate('증폭기 ×3', 'en'), 'Amplifier ×3');
});

test('saves whose activation notes are bare machine names still validate and translate', () => {
  const s = battle(LAYOUTS[0], 'factory', 0);
  E.tick(s);
  s.lastTurn = s.lastTurn.map(note => ({ ...note, text: E.MODULES[note.kind]?.name || note.text }));
  assert.equal(E.validateRun(s), true);
  for (const note of s.lastTurn) assert.doesNotMatch(C.translate(note.text, 'en'), /[가-힣]/);
});
