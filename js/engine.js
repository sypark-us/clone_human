(function (root, factory) {
  'use strict';
  const engine = factory();
  if (typeof module === 'object' && module.exports) module.exports = engine;
  else root.CloneHumanEngine = engine;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MAX_RESOURCE = 999999;
  const MAX_UNITS = 9999;
  const MAX_ATTACK = 9999;
  const MAX_METRIC = 1000000000;
  const EVENT_LIMIT = 120;
  const LOG_LIMIT = 40;
  const TURN_LOG_LIMIT = 160;
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const clone = value => JSON.parse(JSON.stringify(value));
  function freeze(value) {
    Object.values(value).forEach(child => { if (child && typeof child === 'object') freeze(child); });
    return Object.freeze(value);
  }

  const MODULES = freeze({
    mine: { id: 'mine', name: '채굴기', description: '매 턴 에너지 +4. 광맥 구역에서 추가 생산.', kind: 'energy' },
    clone: { id: 'clone', name: '복제 배양기', description: '에너지 4 → 병사 2명. 배양 구역에서 +1명.', kind: 'clone' },
    soldier: { id: 'soldier', name: '훈련소', description: '에너지 3 → 병사 1명.', kind: 'clone' },
    echo: { id: 'echo', name: '시간 복제기', description: '바로 앞 생산 모듈을 2회 추가 실행. 증폭기와 반응 모듈은 복제하지 않음.', kind: 'chain' },
    boost: { id: 'boost', name: '증폭기', description: '바로 앞 생산 모듈을 1회 추가 실행. 증폭기와 반응 모듈은 복제하지 않음.', kind: 'chain' },
    bomb: { id: 'bomb', name: '자폭 발사대', description: '병사 최대 2명 소비. 병사 1명당 피해 14.', kind: 'attack' },
    recycle: { id: 'recycle', name: '회수기', description: '코어 또는 방어막에 피해를 줄 때마다 에너지 +2.', kind: 'energy' },
    mutation: { id: 'mutation', name: '변이 연구소', description: '에너지 5 → 병사당 공격력 영구 +2.', kind: 'clone' },
    onclone: { id: 'onclone', name: '복제 반응기', description: '복제·훈련·처치 복제 시 새 병사 수 × 공격력만큼 추가 공격.', kind: 'attack' },
    onkill: { id: 'onkill', name: '처치 회수기', description: '적 코어 처치 시 에너지 +8. 전투당 한 번.', kind: 'energy' },
    autoclone: { id: 'autoclone', name: '자동 복제기', description: '적 코어 처치 시 병사 +2. 복제 반응도 발동.', kind: 'clone' },
    revive: { id: 'revive', name: '재생 장치', description: '자폭이 발동할 때마다 병사 1명 복귀. 복제 반응은 발동하지 않음.', kind: 'clone' }
  });
  const LOADOUTS = freeze([
    { id: 'balanced', name: '균형 생산', description: '채굴·복제·훈련으로 시작하는 안정적인 공장.', slots: ['mine', 'clone', 'soldier'], energy: 12, units: 4, attack: 2 },
    { id: 'mining', name: '채굴 중심', description: '두 채굴기로 에너지를 비축하고 공장을 확장.', slots: ['mine', 'mine', 'clone'], energy: 10, units: 3, attack: 2 },
    { id: 'cloning', name: '복제 중심', description: '복제와 반응 공격을 연결하는 연쇄 공장.', slots: ['mine', 'clone', 'onclone'], energy: 12, units: 3, attack: 2 },
    { id: 'explosive', name: '자폭 중심', description: '자폭 후 재생으로 병사를 회수하는 공격 공장.', slots: ['mine', 'clone', 'bomb', 'revive'], energy: 10, units: 5, attack: 2 },
    { id: 'mutation', name: '변이 중심', description: '초반부터 공격력을 키워 후반 코어를 돌파.', slots: ['mine', 'mutation', 'soldier'], energy: 12, units: 4, attack: 3 },
    { id: 'recovery', name: '회수 중심', description: '공격 피해를 에너지로 바꾸는 순환 공장.', slots: ['mine', 'clone', 'recycle'], energy: 10, units: 4, attack: 2 }
  ]);
  const SECTORS = freeze([
    { id: 'factory', name: '폐공장', description: '광맥에서 에너지를 채굴하고 전장에 병력 생산 시설을 배치하세요.', lanes: [
      { name: '철광맥 · 채굴 +2', kind: 'mine', value: 2, description: '이 구역의 채굴기는 실행마다 에너지 +2.' },
      { name: '배양실 · 복제 +1', kind: 'clone', value: 1, description: '이 구역의 복제 배양기는 실행마다 병사 +1.' },
      { name: '전장 · 공격 ×1.3', kind: 'attack', value: 1.3, description: '이 구역의 자폭·복제 반응 피해 ×1.3. 복제·훈련소가 있으면 기본 공격도 ×1.3. 중첩 없음.' }
    ] },
    { id: 'canyon', name: '에너지 협곡', description: '중앙 방어 지대의 복제·훈련·재생 장치마다 병사 손실 -1.', lanes: [
      { name: '발전소 · 채굴 +3', kind: 'mine', value: 3, description: '이 구역의 채굴기는 실행마다 에너지 +3.' },
      { name: '방어 지대 · 병력 시설당 손실 -1', kind: 'defense', value: 1, description: '이 구역의 복제·훈련·재생 장치 하나마다 턴당 병사 손실 -1.' },
      { name: '폭약 창고 · 자폭 ×1.6', kind: 'bomb', value: 1.6, description: '이 구역의 자폭 발사대 피해 ×1.6.' }
    ] },
    { id: 'laboratory', name: '유전자 연구소', description: '변이·복제·회수 기계의 위치를 맞추면 생산 효율이 높아집니다.', lanes: [
      { name: '변이실 · 공격력 성장 +2', kind: 'mutation', value: 2, description: '이 구역의 변이 연구소는 실행마다 공격력을 2 더 증가시킴.' },
      { name: '배양실 · 복제 +1', kind: 'clone', value: 1, description: '이 구역의 복제 배양기는 실행마다 병사 +1.' },
      { name: '재활용실 · 회수 +1', kind: 'recycle', value: 1, description: '이 구역의 회수기는 피해 회수마다 에너지 +1 추가.' }
    ] },
    { id: 'wasteland', name: '황무지', description: '자폭과 고지대 공격에 유리한 거친 지형.', lanes: [
      { name: '폭발 지대 · 자폭 ×1.5', kind: 'bomb', value: 1.5, description: '이 구역의 자폭 발사대 피해 ×1.5.' },
      { name: '자원 지대 · 채굴 +2', kind: 'mine', value: 2, description: '이 구역의 채굴기는 실행마다 에너지 +2.' },
      { name: '고지대 · 공격 ×1.5', kind: 'attack', value: 1.5, description: '이 구역의 자폭·복제 반응 피해 ×1.5. 복제·훈련소가 있으면 기본 공격도 ×1.5. 중첩 없음.' }
    ] },
    { id: 'control', name: '중앙 통제실', description: '공격 구역의 복제·훈련소가 기본 공격도 강화합니다. 배율은 중첩되지 않습니다.', lanes: [
      { name: '복제 증폭 · 복제 +1', kind: 'clone', value: 1, description: '이 구역의 복제 배양기는 실행마다 병사 +1.' },
      { name: '전투 증폭 · 공격 ×1.6', kind: 'attack', value: 1.6, description: '이 구역의 자폭·복제 반응 피해 ×1.6. 복제·훈련소가 있으면 기본 공격도 ×1.6. 중첩 없음.' },
      { name: '동력 핵심 · 채굴 +4', kind: 'mine', value: 4, description: '이 구역의 채굴기는 실행마다 에너지 +4.' }
    ] }
  ]);
  const OBJECTIVES = freeze({
    normal: { id: 'normal', name: '코어 정복', description: '12턴 안에 격파. 에너지 +3과 속도 보너스.', limit: 12, reward: 3 },
    rush: { id: 'rush', name: '긴급 돌파', description: '8턴 안에 격파. 에너지 +12와 속도 보너스.', limit: 8, reward: 12 },
    survive: { id: 'survive', name: '방어선 돌파', description: '병사 손실 +1. 12턴 안에 격파하면 에너지 +10과 속도 보너스. 빠른 격파도 성공.', limit: 12, reward: 10 }
  });
  const UPGRADES = freeze([
    { id: 'power', name: '발전기 확장', description: '단계마다 매 턴 에너지 +2.', cost: 12, maxLevel: 3 },
    { id: 'training', name: '복제 배양조', description: '단계마다 매 턴 병사 +1. 복제 반응은 발동하지 않음.', cost: 12, maxLevel: 3 },
    { id: 'fort', name: '방어벽 증설', description: '단계마다 턴당 병사 손실 -1.', cost: 12, maxLevel: 3 }
  ]);
  const ENEMIES = freeze({
    standard: { id: 'standard', name: '감시 코어', description: '기본 전투 패턴. 생산망을 시험하세요.' },
    jam: { id: 'jam', name: '복제 억제 코어', description: '복제·훈련 비용 +2.' },
    drain: { id: 'drain', name: '에너지 흡수 코어', description: '매 턴 시작 시 에너지 -3.' },
    armor: { id: 'armor', name: '폭발 방어 코어', description: '자폭 피해 60% 감소.' },
    disrupt: { id: 'disrupt', name: '시간 교란 코어', description: '시간 복제·증폭의 추가 실행 횟수 -1.' },
    swarm: { id: 'swarm', name: '군집 코어', description: '턴당 병사 손실 +2. 코어 체력 25% 감소.' }
  });
  const MODULE_IDS = Object.keys(MODULES);
  const METRIC_IDS = [...MODULE_IDS, 'basic'];
  const SECTOR_BY_ID = Object.fromEntries(SECTORS.map(sector => [sector.id, sector]));
  const ACTIVE = ['mine', 'clone', 'soldier', 'mutation', 'bomb'];
  const PRODUCERS = ['clone', 'soldier'];
  const DEFENDERS = ['clone', 'soldier', 'revive'];
  const WAVE_HP = [35, 90, 180, 330, 560, 900, 1400, 2150];
  const emptyMetrics = () => Object.fromEntries(METRIC_IDS.map(id => [id, { activations: 0, damage: 0, clones: 0, energy: 0 }]));
  const preparing = state => !!state && state.phase === 'prepare';
  const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;

  const MACHINE_STATS = freeze({
    mine: { energy: [4, 6, 8] }, clone: { clones: [2, 3, 4] }, soldier: { clones: [1, 2, 3] },
    mutation: { attack: [2, 3, 4] }, bomb: { damage: [14, 18, 22] },
    echo: { repeats: [2, 3, 4] }, boost: { repeats: [1, 2, 3] }, recycle: { energy: [2, 3, 4] },
    onclone: { multiplier: [1, 1.25, 1.5] }, onkill: { energy: [8, 12, 16] },
    autoclone: { clones: [2, 3, 4] }, revive: { clones: [1, 2, 3] }
  });
  function getMachineLevel(state, slot) {
    if (!state || !integer(slot, 0, 7) || !state.slots[slot]) return 0;
    return state.version === 3 ? state.machineLevels[slot] : 1;
  }
  function getModuleStats(id, level = 1) {
    if (!own(MACHINE_STATS, id) || !integer(level, 1, 3)) return null;
    return Object.fromEntries(Object.entries(MACHINE_STATS[id]).map(([key, values]) => [key, values[level - 1]]));
  }
  function getMachineUpgrade(state, slot) {
    const level = getMachineLevel(state, slot), cost = level > 0 && level < 3 ? level * 12 : 0;
    return { level, nextLevel: cost ? level + 1 : null, cost, canUpgrade: preparing(state) && cost > 0 && state.energy >= cost };
  }
  function upgradeMachine(state, slot) {
    const upgrade = getMachineUpgrade(state, slot);
    if (!upgrade.canUpgrade) return state;
    // Only a successful purchase migrates legacy games; ordinary actions preserve their schema.
    if (state.version !== 3) {
      state.connectors = connectors(state).map(link => ({ ...link }));
      state.machineLevels = state.slots.map(id => id ? 1 : 0);
      state.version = 3;
    }
    state.energy -= upgrade.cost;
    state.machineLevels[slot]++;
    log(state, MODULES[state.slots[slot]].name + ' Lv.' + upgrade.nextLevel + ' 강화.');
    return state;
  }

  function normalizeSeed(seed) {
    if (typeof seed === 'number' && Number.isFinite(seed)) return (Math.trunc(seed) >>> 0) || 1;
    const text = typeof seed === 'string' ? seed : String(Date.now());
    let result = 2166136261;
    for (let i = 0; i < text.length; i++) result = Math.imul(result ^ text.charCodeAt(i), 16777619);
    return (result >>> 0) || 1;
  }
  function random(state) {
    let x = state.rngState;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    state.rngState = x >>> 0;
    return state.rngState / 4294967296;
  }
  function draw(state, values) { return values[Math.floor(random(state) * values.length)]; }
  function rollOffers(state) {
    // Every draft contains an active production machine, so a passive-only draw cannot stall a new factory.
    state.offers = [draw(state, ACTIVE)];
    while (state.offers.length < 3) {
      const id = draw(state, MODULE_IDS);
      if (!state.offers.includes(id)) state.offers.push(id);
    }
  }
  function rollRoutes(state) {
    const first = Math.floor(random(state) * SECTORS.length);
    const enemyIds = Object.keys(ENEMIES).filter(id => id !== 'standard');
    const objectiveIds = Object.keys(OBJECTIVES);
    state.routes = [first, (first + 2) % SECTORS.length].map((index, route) => ({
      sectorId: SECTORS[index].id,
      objectiveId: objectiveIds[(state.wave - 1 + route) % objectiveIds.length],
      enemyId: state.wave === 1 ? 'standard' : draw(state, enemyIds)
    }));
    Object.assign(state, state.routes[0]);
    state.routePending = true;
  }
  function log(state, text) {
    state.log.unshift(text.slice(0, 500));
    if (state.log.length > LOG_LIMIT) state.log.length = LOG_LIMIT;
  }
  function note(state, slot, kind, text) {
    if (state.lastTurn.length < TURN_LOG_LIMIT) state.lastTurn.push({ slot, kind, text: text.slice(0, 500) });
  }
  function gainEnergy(state, amount, source) {
    const gained = Math.min(amount, MAX_RESOURCE - state.energy);
    state.energy += gained;
    if (source) state.metrics[source].energy += gained;
    return gained;
  }
  function gainUnits(state, amount, source) {
    const gained = Math.min(amount, MAX_UNITS - state.units);
    state.units += gained;
    if (source) state.metrics[source].clones += gained;
    return gained;
  }
  function bonus(state, kind, slot) {
    const lane = SECTOR_BY_ID[state.sectorId].lanes[Math.floor(state.positions[slot].x / 4)];
    return lane.kind === kind ? lane.value : 0;
  }
  function armyMultiplier(state) {
    return state.slots.reduce((value, id, slot) => PRODUCERS.includes(id) ? Math.max(value, bonus(state, 'attack', slot)) : value, 1);
  }
  function synergyKind(state, from, to) {
    if (!state || !Array.isArray(state.slots) || !integer(from, 0, 7) || !integer(to, 0, 7) || from === to) return null;
    const source = state.slots[from], target = state.slots[to];
    if (source === 'mine' && ['clone', 'soldier', 'mutation'].includes(target)) return 'energy';
    if (source === 'mutation' && PRODUCERS.includes(target)) return 'clone';
    if (PRODUCERS.includes(source) && target === 'bomb') return 'attack';
    return null;
  }
  function adjacent(state, from, to) {
    const a = state.positions[from], b = state.positions[to];
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
  }
  function connectors(state) {
    return state && [2, 3].includes(state.version) && Array.isArray(state.connectors) ? state.connectors : [];
  }
  function getSynergies(state) {
    if (!state || !Array.isArray(state.slots) || !Array.isArray(state.positions)) return [];
    const edges = [];
    for (let from = 0; from < 8; from++) for (let to = 0; to < 8; to++) {
      const kind = synergyKind(state, from, to);
      if (kind && adjacent(state, from, to)) edges.push({ from, to, kind, via: 'adjacent' });
    }
    for (const link of connectors(state)) {
      const kind = synergyKind(state, link.from, link.to);
      if (kind && !edges.some(edge => edge.from === link.from && edge.to === link.to)) edges.push({ from: link.from, to: link.to, kind, via: 'connector' });
    }
    return edges;
  }
  function getSynergyBonus(state, slot) {
    const result = { costReduction: 0, clones: 0, damageMultiplier: 1 };
    if (!integer(slot, 0, 7)) return result;
    // Different sources can feed the same target, but each effect applies once.
    for (const edge of getSynergies(state)) if (edge.to === slot) {
      if (edge.kind === 'energy') result.costReduction = 1;
      else if (edge.kind === 'clone') result.clones = 1;
      else if (edge.kind === 'attack') result.damageMultiplier = 1.2;
    }
    return result;
  }
  function canConnectSlots(state, from, to) {
    return preparing(state) && [1, 2, 3].includes(state.version) && !!synergyKind(state, from, to) &&
      !adjacent(state, from, to) && connectors(state).length < 2 &&
      !connectors(state).some(link => link.from === from && link.to === to);
  }
  function connectSlots(state, from, to) {
    if (!canConnectSlots(state, from, to)) return state;
    // Ordinary actions preserve v1 saves. Their first manual connector is the
    // only action that needs the new field and therefore performs migration.
    if (state.version === 1) { state.version = 2; state.connectors = []; }
    state.connectors.push({ from, to });
    return state;
  }
  function disconnectSlots(state, from, to) {
    if (!preparing(state) || ![2, 3].includes(state.version) || !integer(from, 0, 7) || !integer(to, 0, 7)) return state;
    const index = state.connectors.findIndex(link => link.from === from && link.to === to);
    if (index >= 0) state.connectors.splice(index, 1);
    return state;
  }
  function pruneConnectors(state) {
    if ([2, 3].includes(state.version)) state.connectors = state.connectors.filter(link => synergyKind(state, link.from, link.to));
  }
  function getTurnSummary(state) {
    const summary = { damage: 0, shieldDamage: 0, clonesLost: 0 };
    if (!state || !Array.isArray(state.lastTurn)) return summary;
    for (const event of state.lastTurn.slice(0, TURN_LOG_LIMIT)) {
      if (!event || typeof event.text !== 'string' || event.text.length > 500) continue;
      if (event.kind === 'damage') {
        const match = /^피해 (0|[1-9][0-9]{0,5})(?: · 방어막 (0|[1-9][0-9]{0,5}))?$/.exec(event.text);
        if (match && match[0] === event.text) {
          summary.damage = Math.min(MAX_RESOURCE, summary.damage + Number(match[1]));
          summary.shieldDamage = Math.min(MAX_RESOURCE, summary.shieldDamage + Number(match[2] || 0));
        }
      } else if (event.kind === 'loss') {
        const match = /^적 반격: 병사 -(0|[1-9][0-9]{0,5})$/.exec(event.text);
        if (match && match[0] === event.text) summary.clonesLost = Math.min(MAX_UNITS, summary.clonesLost + Number(match[1]));
      }
    }
    return summary;
  }
  function getBattlePreview(state) {
    const maxHp = Math.round(WAVE_HP[state.wave - 1] * (state.enemyId === 'swarm' ? 0.75 : 1));
    const defense = state.slots.reduce((value, id, slot) => value + (DEFENDERS.includes(id) ? bonus(state, 'defense', slot) : 0), 0);
    const attack = Math.max(0, Math.ceil(state.wave * 0.65) + (state.enemyId === 'swarm' ? 2 : 0) + (state.objectiveId === 'survive' ? 1 : 0) - state.upgrades.fort - defense);
    if (state.phase !== 'prepare') return { hp: state.hp, maxHp: state.maxHp, shield: state.shield, attack: state.enemyAttack, limit: OBJECTIVES[state.objectiveId].limit };
    return { hp: maxHp, maxHp, shield: state.wave >= 4 ? state.wave * 4 : 0, attack, limit: OBJECTIVES[state.objectiveId].limit };
  }
  function resetBattle(state) {
    state.turn = 0;
    state.metrics = emptyMetrics();
    state.eventsTotal = 0;
    state.chainPeak = 0;
    state.lastTurn = [];
    state.report = null;
    const preview = getBattlePreview(state);
    state.hp = preview.hp;
    state.maxHp = preview.maxHp;
    state.shield = preview.shield;
    state.enemyAttack = preview.attack;
  }
  function createRun(options) {
    options = options || {};
    const seed = normalizeSeed(options.seed);
    const loadout = LOADOUTS.find(item => item.id === options.loadout) || LOADOUTS[0];
    const state = {
      version: 2, seed, rngState: seed, loadoutId: loadout.id, phase: 'prepare', wave: 1, connectors: [],
      energy: loadout.energy, units: loadout.units, attack: loadout.attack,
      slots: [...loadout.slots, ...Array(8).fill(null)].slice(0, 8),
      positions: [{ x: 1, y: 2 }, { x: 5, y: 2 }, { x: 9, y: 2 }, { x: 10, y: 4 }, { x: 6, y: 4 }, { x: 2, y: 4 }, { x: 2, y: 5 }, { x: 6, y: 5 }],
      selectedSlot: loadout.slots.length, needsReward: true, offers: [], routes: [], routePending: true,
      sectorId: SECTORS[0].id, objectiveId: 'normal', enemyId: 'standard',
      upgrades: { power: 0, training: 0, fort: 0 }, turn: 0, hp: 35, maxHp: 35, shield: 0, enemyAttack: 1,
      metrics: emptyMetrics(), totalDamage: 0, eventsTotal: 0, chainPeak: 0, log: [], lastTurn: [], report: null
    };
    rollRoutes(state); rollOffers(state); resetBattle(state);
    log(state, loadout.name + ' 공장 가동 준비. 모듈과 진입 경로를 선택하세요.');
    return state;
  }
  function selectSlot(state, index) {
    if (preparing(state) && integer(index, 0, 7)) state.selectedSlot = index;
    return state;
  }
  function installModule(state, id) {
    if (!preparing(state) || !state.needsReward || !own(MODULES, id) || !state.offers.includes(id)) return state;
    state.slots[state.selectedSlot] = id;
    if (state.version === 3) state.machineLevels[state.selectedSlot] = 1;
    pruneConnectors(state);
    state.needsReward = false;
    log(state, (state.selectedSlot + 1) + '번 슬롯에 ' + MODULES[id].name + ' 설치.');
    return state;
  }
  function moveSlot(state, direction) {
    if (!preparing(state) || (direction !== -1 && direction !== 1)) return state;
    const next = state.selectedSlot + direction;
    if (!integer(next, 0, 7)) return state;
    [state.slots[next], state.slots[state.selectedSlot]] = [state.slots[state.selectedSlot], state.slots[next]];
    if (state.version === 3) [state.machineLevels[next], state.machineLevels[state.selectedSlot]] = [state.machineLevels[state.selectedSlot], state.machineLevels[next]];
    pruneConnectors(state);
    state.selectedSlot = next;
    return state;
  }
  function relocateSlot(state, index, x, y) {
    if (!preparing(state) || !integer(index, 0, 7) || !integer(x, 0, 11) || !integer(y, 0, 6)) return state;
    const occupied = state.positions.findIndex(position => position.x === x && position.y === y);
    if (occupied === index) return state;
    if (occupied >= 0) state.positions[occupied] = state.positions[index];
    state.positions[index] = { x, y };
    return state;
  }
  function chooseRoute(state, index) {
    if (!preparing(state) || !state.routePending || !integer(index, 0, 1)) return state;
    Object.assign(state, state.routes[index]);
    state.routePending = false;
    resetBattle(state);
    log(state, '경로 선택: ' + SECTOR_BY_ID[state.sectorId].name + ' · ' + OBJECTIVES[state.objectiveId].name);
    return state;
  }
  function reroll(state) {
    if (!preparing(state) || !state.needsReward || state.energy < 6) return state;
    state.energy -= 6;
    rollOffers(state);
    log(state, '모듈 다시 뽑기: 에너지 -6.');
    return state;
  }
  function buyUpgrade(state, id) {
    const upgrade = UPGRADES.find(item => item.id === id);
    if (!preparing(state) || !upgrade || state.energy < upgrade.cost || state.upgrades[id] >= upgrade.maxLevel) return state;
    state.energy -= upgrade.cost;
    state.upgrades[id]++;
    log(state, upgrade.name + ' ' + state.upgrades[id] + '단계.');
    return state;
  }
  function canStart(state) { return preparing(state) && !state.needsReward && !state.routePending; }
  function startBattle(state) {
    if (!canStart(state)) return state;
    resetBattle(state);
    state.phase = 'battle';
    log(state, state.wave + '웨이브 시작 · ' + ENEMIES[state.enemyId].name);
    return state;
  }
  function finishBattle(state, win) {
    const promised = win ? OBJECTIVES[state.objectiveId].reward + Math.max(4, 12 - state.turn) : 0;
    const reward = gainEnergy(state, promised);
    state.phase = win ? (state.wave === 8 ? 'won' : 'report') : 'lost';
    state.report = {
      win, wave: state.wave, turns: state.turn, damage: state.maxHp - state.hp,
      events: state.eventsTotal, peak: state.chainPeak, metrics: clone(state.metrics),
      reason: win ? 'core-destroyed' : 'turn-limit', reward
    };
    log(state, win ? '코어 격파! 에너지 +' + reward + (state.wave === 8 ? ' · 모든 구역 해방.' : ' · 다음 웨이브 준비 가능.') : '제한 시간 초과. 공장 설계를 바꾸어 다시 도전하세요.');
  }
  function tick(state) {
    if (!state || state.phase !== 'battle') return state;
    state.turn++;
    state.lastTurn = [];
    const hpBefore = state.hp;
    const synergies = state.slots.map((_, slot) => getSynergyBonus(state, slot));
    const stats = state.slots.map((id, slot) => id ? getModuleStats(id, getMachineLevel(state, slot)) : null);
    let processed = 0;
    const queue = [];
    function enqueue(kind, amount, source, slot) {
      if (processed + queue.length < EVENT_LIMIT) queue.push({ kind, amount, source, slot });
    }
    function activate(id, slot, text) {
      state.metrics[id].activations++;
      note(state, slot, id, text || MODULES[id].name);
    }
    function damage(amount, source, slot) {
      if (amount > 0 && state.hp > 0) enqueue('damage', amount, source, slot);
    }
    function forModule(id, callback) {
      state.slots.forEach((module, slot) => { if (module === id) callback(slot); });
    }
    function flush() {
      while (queue.length && processed < EVENT_LIMIT) {
        const event = queue.shift();
        processed++;
        if (event.kind === 'clone') {
          forModule('onclone', slot => {
            activate('onclone', slot, '복제 반응 공격');
            damage(Math.round(event.amount * state.attack * stats[slot].multiplier * (bonus(state, 'attack', slot) || 1)), 'onclone', slot);
          });
        } else if (event.kind === 'bomb') {
          forModule('revive', slot => {
            activate('revive', slot, '자폭 병사 ' + stats[slot].clones + '명 재생');
            gainUnits(state, stats[slot].clones, 'revive');
          });
        } else if (event.kind === 'damage' && state.hp > 0) {
          const absorbed = Math.min(state.shield, event.amount);
          state.shield -= absorbed;
          const dealt = Math.min(state.hp, event.amount - absorbed);
          state.hp -= dealt;
          state.totalDamage += dealt;
          state.metrics[event.source].damage += dealt;
          note(state, event.slot, 'damage', '피해 ' + dealt + (absorbed ? ' · 방어막 ' + absorbed : ''));
          if (dealt + absorbed > 0) forModule('recycle', slot => {
            const amount = stats[slot].energy + bonus(state, 'recycle', slot);
            activate('recycle', slot, '피해 회수: 에너지 +' + amount);
            gainEnergy(state, amount, 'recycle');
          });
          if (state.hp === 0 && dealt > 0) enqueue('kill', 1, event.source, event.slot);
        } else if (event.kind === 'kill') {
          forModule('onkill', slot => { activate('onkill', slot); gainEnergy(state, stats[slot].energy, 'onkill'); });
          forModule('autoclone', slot => {
            activate('autoclone', slot);
            const amount = gainUnits(state, stats[slot].clones, 'autoclone');
            if (amount) enqueue('clone', amount, 'autoclone', slot);
          });
        }
      }
    }
    function act(id, slot) {
      if (!id || (!ACTIVE.includes(id) && id !== 'echo' && id !== 'boost')) return;
      if (id === 'echo' || id === 'boost') {
        activate(id, slot);
        const previous = state.slots[slot - 1];
        if (ACTIVE.includes(previous)) {
          const repeats = Math.max(0, stats[slot].repeats - (state.enemyId === 'disrupt' ? 1 : 0));
          for (let i = 0; i < repeats && state.hp > 0; i++) { act(previous, slot - 1); flush(); }
        }
        return;
      }
      if (id === 'mine') {
        activate(id, slot); gainEnergy(state, stats[slot].energy + bonus(state, 'mine', slot), id);
      } else if (id === 'clone' || id === 'soldier') {
        const cost = (id === 'clone' ? 4 : 3) + (state.enemyId === 'jam' ? 2 : 0) - synergies[slot].costReduction;
        if (state.energy < cost) { note(state, slot, 'idle', '에너지 부족: ' + cost + ' 필요'); return; }
        activate(id, slot); state.energy -= cost;
        const amount = gainUnits(state, stats[slot].clones + (id === 'clone' ? bonus(state, 'clone', slot) : 0) + synergies[slot].clones, id);
        if (amount) enqueue('clone', amount, id, slot);
      } else if (id === 'mutation') {
        const cost = 5 - synergies[slot].costReduction;
        if (state.energy < cost) { note(state, slot, 'idle', '에너지 부족: ' + cost + ' 필요'); return; }
        activate(id, slot); state.energy -= cost;
        state.attack = Math.min(MAX_ATTACK, state.attack + stats[slot].attack + bonus(state, 'mutation', slot));
      } else if (id === 'bomb' && state.units > 0) {
        activate(id, slot);
        const used = Math.min(2, state.units);
        state.units -= used;
        damage(Math.round(stats[slot].damage * used * (state.enemyId === 'armor' ? 0.4 : 1) * (bonus(state, 'bomb', slot) || 1) * (bonus(state, 'attack', slot) || 1) * synergies[slot].damageMultiplier), id, slot);
        enqueue('bomb', used, id, slot);
      }
    }

    if (state.upgrades.power) {
      const amount = gainEnergy(state, state.upgrades.power * 2);
      note(state, -1, 'energy', '발전기: 에너지 +' + amount);
    }
    if (state.upgrades.training) gainUnits(state, state.upgrades.training);
    if (state.enemyId === 'drain') {
      state.energy = Math.max(0, state.energy - 3);
      note(state, -1, 'drain', '적 코어: 에너지 -3');
    }
    for (let slot = 0; slot < 8 && state.hp > 0; slot++) { act(state.slots[slot], slot); flush(); }
    if (state.hp > 0 && state.units > 0) {
      state.metrics.basic.activations++;
      damage(Math.round(state.units * state.attack * armyMultiplier(state)), 'basic', -1);
      flush();
    }
    if (state.hp > 0) {
      const lost = Math.min(state.units, state.enemyAttack);
      state.units -= lost;
      if (lost) note(state, -1, 'loss', '적 반격: 병사 -' + lost);
      if (state.wave >= 4 && state.turn % 3 === 0) {
        const restored = state.wave * 2;
        state.shield = Math.min(MAX_RESOURCE, state.shield + restored);
        note(state, -1, 'shield', '적 방어막 재생 +' + restored);
      }
    }
    // Account once per turn, regardless of the number of production flushes.
    state.eventsTotal += processed;
    state.chainPeak = Math.max(state.chainPeak, processed);
    log(state, state.turn + '턴 · 피해 ' + (hpBefore - state.hp) + ' · 병사 ' + state.units + ' · 에너지 ' + state.energy + ' · 연쇄 ' + processed);
    if (state.hp === 0) finishBattle(state, true);
    else if (state.turn >= OBJECTIVES[state.objectiveId].limit) finishBattle(state, false);
    return state;
  }
  function nextWave(state) {
    if (!state || state.phase !== 'report' || !state.report || !state.report.win || state.wave >= 8) return state;
    state.wave++;
    state.phase = 'prepare';
    gainUnits(state, 3);
    state.needsReward = true;
    const empty = state.slots.indexOf(null);
    state.selectedSlot = empty >= 0 ? empty : state.selectedSlot;
    rollRoutes(state); rollOffers(state); resetBattle(state);
    log(state, state.wave + '웨이브 준비 · 지원 병사 +3. 모듈과 경로를 선택하세요.');
    return state;
  }
  function getHints(state) {
    const hints = [];
    if (!state.slots.includes('mine') && !state.upgrades.power) hints.push('채굴기 또는 발전기 확장으로 에너지를 공급하세요.');
    state.slots.forEach((id, slot) => {
      if ((id === 'echo' || id === 'boost') && !ACTIVE.includes(state.slots[slot - 1])) hints.push((slot + 1) + '번 증폭기 바로 앞에 채굴·복제·훈련·변이·자폭 모듈을 놓으세요.');
    });
    if (state.slots.includes('bomb') && !state.slots.includes('revive')) hints.push('자폭과 재생을 연결하면 병사 소비를 줄일 수 있습니다.');
    if (state.enemyId === 'jam') hints.push('이번 코어는 복제·훈련 비용을 2 높입니다. 에너지 생산을 늘리세요.');
    if (state.enemyId === 'armor' && state.slots.includes('bomb')) hints.push('이번 코어는 자폭 피해를 60% 줄입니다. 복제와 기본 공격도 준비하세요.');
    if (state.wave >= 4) hints.push('적은 3턴마다 방어막을 재생합니다. 훈련·방어 확장으로 병력을 유지하세요.');
    if (!hints.length) hints.push('지형 보너스는 기계가 놓인 구역에 적용됩니다. 생산 순서와 지도 위치를 함께 조정하세요.');
    return hints;
  }

  function record(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
  function keys(value, expected) { return record(value) && Object.keys(value).length === expected.length && expected.every(key => own(value, key)); }
  function validMetrics(value) {
    return keys(value, METRIC_IDS) && METRIC_IDS.every(id => keys(value[id], ['activations', 'damage', 'clones', 'energy']) && Object.values(value[id]).every(number => integer(number, 0, MAX_METRIC)));
  }
  function validText(value) { return typeof value === 'string' && value.length <= 500; }
  function validId(table, id) { return typeof id === 'string' && own(table, id); }
  function denseArray(value, length) { return Array.isArray(value) && value.length === length && Array.from({ length }, (_, index) => own(value, index)).every(Boolean); }
  function validateRun(value) {
    // No coercion: saves are untrusted data and never run through combat until this schema succeeds.
    try {
      const stateKeys = ['version', 'seed', 'rngState', 'loadoutId', 'phase', 'wave', 'energy', 'units', 'attack', 'slots', 'positions', 'selectedSlot', 'needsReward', 'offers', 'routes', 'routePending', 'sectorId', 'objectiveId', 'enemyId', 'upgrades', 'turn', 'hp', 'maxHp', 'shield', 'enemyAttack', 'metrics', 'totalDamage', 'eventsTotal', 'chainPeak', 'log', 'lastTurn', 'report'];
      if (!record(value) || ![1, 2, 3].includes(value.version)) return false;
      const extraKeys = value.version === 3 ? ['connectors', 'machineLevels'] : value.version === 2 ? ['connectors'] : [];
      if (!keys(value, [...stateKeys, ...extraKeys])) return false;
      if (!integer(value.seed, 1, 4294967295) || !integer(value.rngState, 1, 4294967295)) return false;
      if (!LOADOUTS.some(loadout => loadout.id === value.loadoutId) || !['prepare', 'battle', 'report', 'won', 'lost'].includes(value.phase)) return false;
      if (!integer(value.wave, 1, 8) || !integer(value.energy, 0, MAX_RESOURCE) || !integer(value.units, 0, MAX_UNITS) || !integer(value.attack, 1, MAX_ATTACK)) return false;
      if (!denseArray(value.slots, 8) || !value.slots.every(id => id === null || validId(MODULES, id))) return false;
      if (!denseArray(value.positions, 8) || !value.positions.every(position => keys(position, ['x', 'y']) && integer(position.x, 0, 11) && integer(position.y, 0, 6))) return false;
      if (new Set(value.positions.map(position => position.x + ':' + position.y)).size !== 8) return false;
      if (value.version === 3 && (!denseArray(value.machineLevels, 8) || !value.machineLevels.every((level, slot) => value.slots[slot] ? integer(level, 1, 3) : level === 0))) return false;
      if ([2, 3].includes(value.version)) {
        if (!Array.isArray(value.connectors) || value.connectors.length > 2 || !denseArray(value.connectors, value.connectors.length)) return false;
        if (!value.connectors.every(link => keys(link, ['from', 'to']) && synergyKind(value, link.from, link.to))) return false;
        if (new Set(value.connectors.map(link => link.from + ':' + link.to)).size !== value.connectors.length) return false;
      }
      if (!integer(value.selectedSlot, 0, 7) || typeof value.needsReward !== 'boolean' || typeof value.routePending !== 'boolean') return false;
      if (!denseArray(value.offers, 3) || new Set(value.offers).size !== 3 || !value.offers.every(id => validId(MODULES, id))) return false;
      const routeValid = route => keys(route, ['sectorId', 'objectiveId', 'enemyId']) && validId(SECTOR_BY_ID, route.sectorId) && validId(OBJECTIVES, route.objectiveId) && validId(ENEMIES, route.enemyId);
      if (!denseArray(value.routes, 2) || !value.routes.every(routeValid)) return false;
      if (!validId(SECTOR_BY_ID, value.sectorId) || !validId(OBJECTIVES, value.objectiveId) || !validId(ENEMIES, value.enemyId)) return false;
      if (!keys(value.upgrades, ['power', 'training', 'fort']) || !Object.values(value.upgrades).every(level => integer(level, 0, 3))) return false;
      const limit = OBJECTIVES[value.objectiveId].limit;
      if (!integer(value.turn, 0, limit) || !integer(value.maxHp, 1, MAX_RESOURCE) || !integer(value.hp, 0, value.maxHp) || !integer(value.shield, 0, MAX_RESOURCE) || !integer(value.enemyAttack, 0, 100)) return false;
      if (value.maxHp !== Math.round(WAVE_HP[value.wave - 1] * (value.enemyId === 'swarm' ? 0.75 : 1))) return false;
      if (!validMetrics(value.metrics) || !integer(value.totalDamage, 0, MAX_METRIC) || !integer(value.eventsTotal, 0, value.turn * EVENT_LIMIT) || !integer(value.chainPeak, 0, Math.min(EVENT_LIMIT, value.eventsTotal))) return false;
      if (!METRIC_IDS.every(id => value.metrics[id].activations <= value.turn * EVENT_LIMIT * 8 && value.metrics[id].energy <= value.metrics[id].activations * (value.version === 3 ? 16 : 10) && value.metrics[id].clones <= value.metrics[id].activations * (value.version === 3 ? 6 : id === 'clone' ? 4 : 3))) return false;
      const waveDamage = METRIC_IDS.reduce((sum, id) => sum + value.metrics[id].damage, 0);
      if (waveDamage !== value.maxHp - value.hp || value.totalDamage < waveDamage || value.totalDamage > WAVE_HP.slice(0, value.wave - 1).reduce((sum, hp) => sum + hp, 0) + waveDamage) return false;
      if (!Array.isArray(value.log) || value.log.length > LOG_LIMIT || !denseArray(value.log, value.log.length) || !value.log.every(validText)) return false;
      const eventKinds = [...MODULE_IDS, 'damage', 'idle', 'energy', 'drain', 'loss', 'shield'];
      if (!Array.isArray(value.lastTurn) || value.lastTurn.length > TURN_LOG_LIMIT || !denseArray(value.lastTurn, value.lastTurn.length) || !value.lastTurn.every(event => keys(event, ['slot', 'kind', 'text']) && integer(event.slot, -1, 7) && eventKinds.includes(event.kind) && validText(event.text))) return false;
      if (value.phase === 'prepare') return value.turn === 0 && value.hp === value.maxHp && value.report === null && value.eventsTotal === 0 && value.chainPeak === 0 && value.lastTurn.length === 0 && METRIC_IDS.every(id => Object.values(value.metrics[id]).every(number => number === 0));
      if (value.needsReward || value.routePending) return false;
      if (value.phase === 'battle') return value.hp > 0 && value.turn < limit && value.report === null;
      const report = value.report;
      if (!keys(report, ['win', 'wave', 'turns', 'damage', 'events', 'peak', 'metrics', 'reason', 'reward']) || typeof report.win !== 'boolean' || !validMetrics(report.metrics)) return false;
      if (report.wave !== value.wave || report.turns !== value.turn || value.turn < 1 || report.damage !== value.maxHp - value.hp || report.events !== value.eventsTotal || report.peak !== value.chainPeak || !integer(report.reward, 0, OBJECTIVES[value.objectiveId].reward + Math.max(4, 12 - value.turn))) return false;
      if (!METRIC_IDS.every(id => Object.keys(value.metrics[id]).every(key => report.metrics[id][key] === value.metrics[id][key]))) return false;
      if (report.win) return value.hp === 0 && report.reason === 'core-destroyed' && ((value.phase === 'won' && value.wave === 8) || (value.phase === 'report' && value.wave < 8));
      return value.phase === 'lost' && value.hp > 0 && value.turn === limit && report.reason === 'turn-limit' && report.reward === 0;
    } catch (_) { return false; }
  }

  return Object.freeze({ MODULES, LOADOUTS, SECTORS, OBJECTIVES, UPGRADES, ENEMIES, createRun, selectSlot, installModule, moveSlot, relocateSlot, chooseRoute, reroll, buyUpgrade, getMachineLevel, getModuleStats, getMachineUpgrade, upgradeMachine, startBattle, tick, nextWave, canStart, getBattlePreview, getHints, validateRun, getSynergies, getSynergyBonus, canConnectSlots, connectSlots, disconnectSlots, getTurnSummary });
});
