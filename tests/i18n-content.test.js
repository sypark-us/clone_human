'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const E = require('../js/engine');
const modulePath = path.join(__dirname, '../js/i18n-content.js');
const content = () => { assert.ok(fs.existsSync(modulePath), 'i18n-content.js must exist'); return require(modulePath); };
const copy = value => JSON.parse(JSON.stringify(value));

function catalogText() {
  const entries = [...Object.values(E.MODULES), ...E.LOADOUTS, ...E.SECTORS,
    ...E.SECTORS.flatMap(sector => sector.lanes), ...Object.values(E.OBJECTIVES), ...E.UPGRADES, ...Object.values(E.ENEMIES)];
  return [...new Set(entries.flatMap(entry => [entry.name, entry.description]))];
}

test('exports a standalone browser global and the same CommonJS translator', () => {
  const C = content(); const browser = {};
  vm.runInNewContext(fs.readFileSync(modulePath, 'utf8'), browser);
  assert.equal(typeof C.translate, 'function');
  assert.equal(browser.CloneHumanContent.translate('채굴기', 'en'), 'Miner');
  assert.equal(C.translate('채굴기', 'en'), 'Miner');
});

test('every catalog name and description has English copy with the same numeric effects', () => {
  const C = content();
  for (const source of catalogText()) {
    const translated = C.translate(source, 'en');
    assert.notEqual(translated, source, source);
    assert.match(translated, /[A-Za-z]/, source);
    assert.doesNotMatch(translated, /[가-힣]/, source);
    const numbers = text => (text.match(/\d+(?:\.\d+)?/g) || []).sort();
    assert.deepEqual(numbers(translated), numbers(source), source);
    assert.equal(C.translate(source, 'ko'), source);
  }
});

test('rule descriptions preserve non-stacking, trigger exceptions and penalty direction', () => {
  const C = content();
  assert.match(C.translate(E.MODULES.revive.description, 'en'), /does not trigger clone reactions/i);
  assert.match(C.translate(E.UPGRADES.find(item => item.id === 'training').description, 'en'), /does not trigger clone reactions/i);
  assert.match(C.translate(E.ENEMIES.armor.description, 'en'), /reduced by 60%/i);
  assert.match(C.translate(E.ENEMIES.swarm.description, 'en'), /25% less/i);
  assert.match(C.translate(E.SECTORS[0].lanes[2].description, 'en'), /does not stack/i);
  assert.match(C.translate(E.OBJECTIVES.survive.description, 'en'), /early kills also succeed/i);
});

test('all hint paths translate, including each numbered echo/amplifier position', () => {
  const C = content(); const observed = new Set();
  for (const change of [
    {}, { slots: Array(8).fill(null) }, { slots: ['bomb', ...Array(7).fill(null)] },
    { enemyId: 'jam' }, { enemyId: 'armor', slots: ['bomb', ...Array(7).fill(null)] }, { wave: 4 },
    { slots: Array(8).fill('echo') }, { slots: Array(8).fill('boost') }
  ]) {
    const s = Object.assign(E.createRun({ seed: 1 }), change);
    for (const hint of E.getHints(s)) {
      observed.add(hint);
      assert.notEqual(C.translate(hint, 'en'), hint);
      assert.doesNotMatch(C.translate(hint, 'en'), /[가-힣]/);
      assert.equal(C.translate(hint, 'ko'), hint);
    }
  }
  assert.equal(observed.size, 14);
  assert.equal(C.translate('8번 증폭기 바로 앞에 채굴·복제·훈련·변이·자폭 모듈을 놓으세요.', 'en'), 'Place a Miner, Clone Vat, Training Station, Mutation Lab, or Demolition Launcher directly before the amplifier in slot 8.');
});

test('all storage error messages translate without coupling to the storage runtime', () => {
  const C = content(); const source = fs.readFileSync(path.join(__dirname, '../js/storage.js'), 'utf8');
  const errors = [...source.matchAll(/error\s*(?:=|:)\s*'([^']+)'/g)].map(match => match[1]);
  assert.ok(errors.length >= 10);
  for (const message of errors) {
    assert.notEqual(C.translate(message, 'en'), message, message);
    assert.doesNotMatch(C.translate(message, 'en'), /[가-힣]/);
    assert.equal(C.translate(message, 'ko'), message);
  }
});

test('each engine log and note template translates complete messages and preserves values', () => {
  const C = content();
  const cases = [
    ['균형 생산 공장 가동 준비. 모듈과 진입 경로를 선택하세요.', 'Balanced Production factory ready. Choose a module and an entry route.'],
    ['8번 슬롯에 채굴기 설치.', 'Installed Miner in slot 8.'],
    ['경로 선택: 폐공장 · 코어 정복', 'Route selected: Abandoned Factory · Core Capture'],
    ['모듈 다시 뽑기: 에너지 -6.', 'Module reroll: -6 energy.'],
    ['발전기 확장 3단계.', 'Generator Expansion upgraded to level 3.'],
    ['8웨이브 시작 · 군집 코어', 'Wave 8 started · Swarm Core'],
    ['코어 격파! 에너지 +23 · 다음 웨이브 준비 가능.', 'Core destroyed! +23 energy · Ready to prepare the next wave.'],
    ['코어 격파! 에너지 +14 · 모든 구역 해방.', 'Core destroyed! +14 energy · All sectors liberated.'],
    ['제한 시간 초과. 공장 설계를 바꾸어 다시 도전하세요.', 'Turn limit reached. Redesign your factory and try again.'],
    ['복제 반응 공격', 'Clone reaction attack'],
    ['자폭 병사 1명 재생', 'Regenerated 1 clone after demolition'],
    ['피해 0 · 방어막 32', 'Damage 0 · Shield damage 32'],
    ['피해 2150', 'Damage 2150'],
    ['피해 회수: 에너지 +3', 'Damage recycled: +3 energy'],
    ['에너지 부족: 6 필요', 'Not enough energy: 6 required'],
    ['발전기: 에너지 +6', 'Generator: +6 energy'],
    ['적 코어: 에너지 -3', 'Enemy core: -3 energy'],
    ['적 반격: 병사 -4', 'Enemy retaliation: -4 clones'],
    ['적 방어막 재생 +16', 'Enemy shield regenerated: +16'],
    ['12턴 · 피해 0 · 병사 0 · 에너지 999999 · 연쇄 120', 'Turn 12 · Damage 0 · Clones 0 · Energy 999999 · Chain events 120'],
    ['2웨이브 준비 · 지원 병사 +3. 모듈과 경로를 선택하세요.', 'Preparing wave 2 · +3 reinforcement clones. Choose a module and a route.']
  ];
  for (const [source, expected] of cases) {
    assert.equal(C.translate(source, 'en'), expected);
    assert.equal(C.translate(source, 'ko'), source);
  }
});

test('named log fields accept every real catalog entry, never arbitrary captured text', () => {
  const C = content();
  for (const item of Object.values(E.MODULES)) assert.equal(C.translate(`1번 슬롯에 ${item.name} 설치.`, 'en'), `Installed ${C.translate(item.name, 'en')} in slot 1.`);
  for (const item of E.LOADOUTS) assert.equal(C.translate(`${item.name} 공장 가동 준비. 모듈과 진입 경로를 선택하세요.`, 'en'), `${C.translate(item.name, 'en')} factory ready. Choose a module and an entry route.`);
  for (const item of E.UPGRADES) for (const level of [1, 2, 3]) assert.equal(C.translate(`${item.name} ${level}단계.`, 'en'), `${C.translate(item.name, 'en')} upgraded to level ${level}.`);
  for (const item of Object.values(E.ENEMIES)) assert.equal(C.translate(`1웨이브 시작 · ${item.name}`, 'en'), `Wave 1 started · ${C.translate(item.name, 'en')}`);
  for (const sector of E.SECTORS) for (const objective of Object.values(E.OBJECTIVES)) assert.equal(C.translate(`경로 선택: ${sector.name} · ${objective.name}`, 'en'), `Route selected: ${C.translate(sector.name, 'en')} · ${C.translate(objective.name, 'en')}`);
});

test('unknown languages, unknown strings and untrusted near-matches pass through literally', () => {
  const C = content();
  for (const language of ['ko', 'fr', 'EN', '', undefined, null]) assert.equal(C.translate('채굴기', language), '채굴기');
  const unknown = [
    '', 'constructor', '__proto__', 'toString', 'Untranslated custom message', '<img src=x onerror=alert(1)>',
    '8번 슬롯에 <img src=x onerror=alert(1)> 설치.', '경로 선택: 알 수 없는 지역 · 코어 정복',
    '경로 선택: 폐공장 · <script>bad()</script>', '내 공장 공장 가동 준비. 모듈과 진입 경로를 선택하세요.',
    '수상한 장치 3단계.', '9웨이브 시작 · 군집 코어', '9번 슬롯에 채굴기 설치.',
    '4웨이브 시작 · 알 수 없는 적', '피해 3<svg/onload=alert(1)>', '피해 1\n', ' 피해 1', '피해 1 extra',
    '1턴 · 피해 1 · 병사 1 · 에너지 1 · 연쇄 <script>bad()</script>',
    '코어 격파! 에너지 +1 · 다른 결말.', '채굴기는 채굴기입니다.'
  ];
  for (const text of unknown) assert.equal(C.translate(text, 'en'), text, text);
  for (const value of [null, undefined, 5, {}, ['채굴기']]) assert.equal(C.translate(value, 'en'), value);
});

function battleFixture(slots, changes = {}) {
  const s = E.createRun({ seed: 42 }); E.chooseRoute(s, 0); E.installModule(s, s.offers[0]);
  s.slots = [...slots, ...Array(8).fill(null)].slice(0, 8);
  Object.assign(s, { wave: 8, energy: 30, units: 4, sectorId: 'laboratory' }, changes);
  E.startBattle(s); return s;
}

test('deterministic combat traces translate saved logs and notes without mutating runs', () => {
  const C = content();
  const traces = [
    battleFixture(['mine', 'clone', 'onclone', 'bomb', 'revive', 'recycle', 'mutation', 'echo'], { enemyId: 'drain', upgrades: { power: 3, training: 0, fort: 0 } }),
    battleFixture(['clone', 'soldier', 'mutation'], { enemyId: 'jam', energy: 0, units: 0 }),
    battleFixture(['bomb', 'onkill', 'autoclone', 'onclone'], { wave: 1, units: 100 }),
    battleFixture(['clone', 'echo'], { units: 9999, wave: 8 })
  ];
  let events = 0;
  for (const initial of traces) {
    const translatedRun = copy(initial); const control = copy(initial);
    while (translatedRun.phase === 'battle') {
      E.tick(translatedRun); E.tick(control);
      const before = JSON.stringify(translatedRun);
      for (const text of [...translatedRun.log, ...translatedRun.lastTurn.map(event => event.text)]) {
        const translated = C.translate(text, 'en');
        assert.notEqual(translated, text, text); assert.doesNotMatch(translated, /[가-힣]/, text); events++;
      }
      assert.equal(JSON.stringify(translatedRun), before);
      assert.deepEqual(translatedRun, control);
    }
  }
  assert.ok(events > 100);
});
