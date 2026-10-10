(function (root, factory) {
  'use strict';
  const content = factory();
  if (typeof module === 'object' && module.exports) module.exports = content;
  else root.CloneHumanContent = content;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Korean source text is the key. The engine and existing saves stay unchanged.
  // Translation is not HTML sanitization: consumers must render text safely.
  const dictionary = new Map(Object.entries({
    '채굴기': 'Miner',
    '매 턴 에너지 +4. 광맥 구역에서 추가 생산.': 'Each turn: +4 energy. Ore zones increase output.',
    '복제 배양기': 'Clone Vat',
    '에너지 4 → 병사 2명. 배양 구역에서 +1명.': '4 energy → 2 clones. Cultivation zones add +1 clone.',
    '훈련소': 'Training Station',
    '에너지 3 → 병사 1명.': '3 energy → 1 clone.',
    '시간 복제기': 'Time Echo',
    '바로 앞 생산 모듈을 2회 추가 실행. 증폭기와 반응 모듈은 복제하지 않음.': 'Runs the preceding production module 2 additional times. Cannot repeat Time Echo, Amplifier, or reaction modules.',
    '증폭기': 'Amplifier',
    '바로 앞 생산 모듈을 1회 추가 실행. 증폭기와 반응 모듈은 복제하지 않음.': 'Runs the preceding production module 1 additional time. Cannot repeat Time Echo, Amplifier, or reaction modules.',
    '자폭 발사대': 'Demolition Launcher',
    '병사 최대 2명 소비. 병사 1명당 피해 14.': 'Consumes up to 2 clones. Converts 1 clone into 14 damage.',
    '회수기': 'Recycler',
    '코어 또는 방어막에 피해를 줄 때마다 에너지 +2.': 'Gains +2 energy each time the core or its shield takes damage.',
    '변이 연구소': 'Mutation Lab',
    '에너지 5 → 병사당 공격력 영구 +2.': '5 energy → a permanent +2 attack per clone.',
    '복제 반응기': 'Clone Reactor',
    '복제·훈련·처치 복제 시 새 병사 수 × 공격력만큼 추가 공격.': 'Cloning, training, and kill-triggered cloning deal extra damage equal to new clones × attack.',
    '처치 회수기': 'Kill Salvager',
    '적 코어 처치 시 에너지 +8. 전투당 한 번.': 'Gains +8 energy when the enemy core is destroyed. Triggers once per battle.',
    '자동 복제기': 'Auto Cloner',
    '적 코어 처치 시 병사 +2. 복제 반응도 발동.': 'Creates +2 clones when the enemy core is destroyed. Also triggers clone reactions.',
    '재생 장치': 'Regenerator',
    '자폭이 발동할 때마다 병사 1명 복귀. 복제 반응은 발동하지 않음.': 'Returns 1 clone after each demolition activation. Does not trigger clone reactions.',

    '균형 생산': 'Balanced Production',
    '채굴·복제·훈련으로 시작하는 안정적인 공장.': 'A reliable factory starting with mining, cloning, and training.',
    '채굴 중심': 'Mining Focus',
    '두 채굴기로 에너지를 비축하고 공장을 확장.': 'Stockpile energy with two Miners and expand your factory.',
    '복제 중심': 'Cloning Focus',
    '복제와 반응 공격을 연결하는 연쇄 공장.': 'Chain cloning and reaction attacks together.',
    '자폭 중심': 'Demolition Focus',
    '자폭 후 재생으로 병사를 회수하는 공격 공장.': 'An offensive factory that regenerates clones after demolition.',
    '변이 중심': 'Mutation Focus',
    '초반부터 공격력을 키워 후반 코어를 돌파.': 'Build attack early to break through later cores.',
    '회수 중심': 'Recovery Focus',
    '공격 피해를 에너지로 바꾸는 순환 공장.': 'A recycling factory that turns damage into energy.',

    '폐공장': 'Abandoned Factory',
    '광맥에서 에너지를 채굴하고 전장에 병력 생산 시설을 배치하세요.': 'Mine energy from ore deposits and place clone production facilities in the combat zone.',
    '철광맥 · 채굴 +2': 'Iron Vein · Mining +2',
    '이 구역의 채굴기는 실행마다 에너지 +2.': 'Miners in this zone gain +2 additional energy per activation.',
    '배양실 · 복제 +1': 'Cultivation Chamber · Cloning +1',
    '이 구역의 복제 배양기는 실행마다 병사 +1.': 'Clone Vats in this zone produce +1 additional clone per activation.',
    '전장 · 공격 ×1.3': 'Combat Zone · Attack ×1.3',
    '이 구역의 자폭·복제 반응 피해 ×1.3. 복제·훈련소가 있으면 기본 공격도 ×1.3. 중첩 없음.': 'Demolition and clone reaction damage in this zone ×1.3. A Clone Vat or Training Station here also grants basic attack ×1.3. Does not stack.',
    '에너지 협곡': 'Energy Canyon',
    '중앙 방어 지대의 복제·훈련·재생 장치마다 병사 손실 -1.': 'Each Clone Vat, Training Station, or Regenerator in the central defense zone reduces clone losses by 1.',
    '발전소 · 채굴 +3': 'Power Station · Mining +3',
    '이 구역의 채굴기는 실행마다 에너지 +3.': 'Miners in this zone gain +3 additional energy per activation.',
    '방어 지대 · 병력 시설당 손실 -1': 'Defense Zone · Losses -1 per clone facility',
    '이 구역의 복제·훈련·재생 장치 하나마다 턴당 병사 손실 -1.': 'Each Clone Vat, Training Station, or Regenerator in this zone reduces clone losses per turn by 1.',
    '폭약 창고 · 자폭 ×1.6': 'Explosives Depot · Demolition ×1.6',
    '이 구역의 자폭 발사대 피해 ×1.6.': 'Demolition Launcher damage in this zone ×1.6.',
    '유전자 연구소': 'Genetics Lab',
    '변이·복제·회수 기계의 위치를 맞추면 생산 효율이 높아집니다.': 'Place mutation, cloning, and recycling machines in their matching zones to improve production.',
    '변이실 · 공격력 성장 +2': 'Mutation Chamber · Attack growth +2',
    '이 구역의 변이 연구소는 실행마다 공격력을 2 더 증가시킴.': 'Mutation Labs in this zone add 2 more attack per activation.',
    '재활용실 · 회수 +1': 'Recycling Room · Recovery +1',
    '이 구역의 회수기는 피해 회수마다 에너지 +1 추가.': 'Recyclers in this zone gain +1 additional energy per damaging hit.',
    '황무지': 'Wasteland',
    '자폭과 고지대 공격에 유리한 거친 지형.': 'Rough terrain favoring demolition and attacks from high ground.',
    '폭발 지대 · 자폭 ×1.5': 'Blast Zone · Demolition ×1.5',
    '이 구역의 자폭 발사대 피해 ×1.5.': 'Demolition Launcher damage in this zone ×1.5.',
    '자원 지대 · 채굴 +2': 'Resource Field · Mining +2',
    '고지대 · 공격 ×1.5': 'High Ground · Attack ×1.5',
    '이 구역의 자폭·복제 반응 피해 ×1.5. 복제·훈련소가 있으면 기본 공격도 ×1.5. 중첩 없음.': 'Demolition and clone reaction damage in this zone ×1.5. A Clone Vat or Training Station here also grants basic attack ×1.5. Does not stack.',
    '중앙 통제실': 'Central Control',
    '공격 구역의 복제·훈련소가 기본 공격도 강화합니다. 배율은 중첩되지 않습니다.': 'Clone Vats and Training Stations in attack zones also boost basic attacks. Multipliers do not stack.',
    '복제 증폭 · 복제 +1': 'Cloning Boost · Cloning +1',
    '전투 증폭 · 공격 ×1.6': 'Combat Boost · Attack ×1.6',
    '이 구역의 자폭·복제 반응 피해 ×1.6. 복제·훈련소가 있으면 기본 공격도 ×1.6. 중첩 없음.': 'Demolition and clone reaction damage in this zone ×1.6. A Clone Vat or Training Station here also grants basic attack ×1.6. Does not stack.',
    '동력 핵심 · 채굴 +4': 'Power Nexus · Mining +4',
    '이 구역의 채굴기는 실행마다 에너지 +4.': 'Miners in this zone gain +4 additional energy per activation.',

    '코어 정복': 'Core Capture',
    '12턴 안에 격파. 에너지 +3과 속도 보너스.': 'Destroy the core within 12 turns. Gain +3 energy and a bonus for finishing early.',
    '긴급 돌파': 'Rapid Breach',
    '8턴 안에 격파. 에너지 +12와 속도 보너스.': 'Destroy the core within 8 turns. Gain +12 energy and a bonus for finishing early.',
    '방어선 돌파': 'Defensive Breach',
    '병사 손실 +1. 12턴 안에 격파하면 에너지 +10과 속도 보너스. 빠른 격파도 성공.': 'Clone losses +1. Destroy the core within 12 turns for +10 energy and a bonus for finishing early. Early kills also succeed.',
    '발전기 확장': 'Generator Expansion',
    '단계마다 매 턴 에너지 +2.': 'Each level grants +2 energy per turn.',
    '복제 배양조': 'Growth Tanks',
    '단계마다 매 턴 병사 +1. 복제 반응은 발동하지 않음.': 'Each level grants +1 clone per turn. Does not trigger clone reactions.',
    '방어벽 증설': 'Fortifications',
    '단계마다 턴당 병사 손실 -1.': 'Each level reduces clone losses per turn by 1.',

    '감시 코어': 'Sentry Core',
    '기본 전투 패턴. 생산망을 시험하세요.': 'Standard combat pattern. Put your production line to the test.',
    '복제 억제 코어': 'Suppression Core',
    '복제·훈련 비용 +2.': 'Cloning and training cost +2 energy.',
    '에너지 흡수 코어': 'Draining Core',
    '매 턴 시작 시 에너지 -3.': 'Drains 3 energy at the start of each turn.',
    '폭발 방어 코어': 'Blastproof Core',
    '자폭 피해 60% 감소.': 'Demolition damage is reduced by 60%.',
    '시간 교란 코어': 'Disruption Core',
    '시간 복제·증폭의 추가 실행 횟수 -1.': 'Time Echo and Amplifier perform 1 fewer additional activation.',
    '군집 코어': 'Swarm Core',
    '턴당 병사 손실 +2. 코어 체력 25% 감소.': 'Clone losses per turn +2. The core has 25% less health.',

    '채굴기 또는 발전기 확장으로 에너지를 공급하세요.': 'Supply energy with a Miner or Generator Expansion.',
    '자폭과 재생을 연결하면 병사 소비를 줄일 수 있습니다.': 'Combine demolition and regeneration to reduce clone consumption.',
    '이번 코어는 복제·훈련 비용을 2 높입니다. 에너지 생산을 늘리세요.': 'This core increases cloning and training costs by 2. Increase energy production.',
    '이번 코어는 자폭 피해를 60% 줄입니다. 복제와 기본 공격도 준비하세요.': 'This core reduces demolition damage by 60%. Prepare cloning and basic attacks too.',
    '적은 3턴마다 방어막을 재생합니다. 훈련·방어 확장으로 병력을 유지하세요.': 'The enemy regenerates its shield every 3 turns. Use training and fortification upgrades to maintain your army.',
    '지형 보너스는 기계가 놓인 구역에 적용됩니다. 생산 순서와 지도 위치를 함께 조정하세요.': 'Terrain bonuses apply to machines placed in that zone. Adjust both production order and map positions.',

    '저장소를 사용할 수 없습니다.': 'Browser storage is unavailable.',
    '저장 데이터의 크기 또는 형식이 올바르지 않습니다.': 'The saved data has an invalid size or format.',
    '저장 데이터를 읽을 수 없습니다.': 'The saved data could not be read.',
    '저장 데이터 형식이 올바르지 않습니다.': 'The saved data format is invalid.',
    '지원하지 않는 저장 버전입니다.': 'This save version is not supported.',
    '저장된 게임이 올바르지 않습니다.': 'The saved game data is invalid.',
    '게임 데이터가 올바르지 않아 저장하지 못했습니다.': 'The game could not be saved because its data is invalid.',
    '저장 데이터가 너무 큽니다.': 'The save data is too large.',
    '직렬화된 게임 데이터가 올바르지 않습니다.': 'The game data became invalid while preparing the save.',
    '게임 데이터를 저장 형식으로 변환할 수 없습니다.': 'The game data could not be converted to the save format.',
    '저장 공간이 부족하거나 저장소를 사용할 수 없습니다.': 'Storage is full or unavailable.',

    '모듈 다시 뽑기: 에너지 -6.': 'Module reroll: -6 energy.',
    '제한 시간 초과. 공장 설계를 바꾸어 다시 도전하세요.': 'Turn limit reached. Redesign your factory and try again.',
    '복제 반응 공격': 'Clone reaction attack',
    '자폭 병사 1명 재생': 'Regenerated 1 clone after demolition',
    '적 코어: 에너지 -3': 'Enemy core: -3 energy'
  }));

  // Enumerate named legacy messages so arbitrary saved strings never enter a
  // partial name replacement or a catch-all capture for player-provided text.
  const moduleNames = ['채굴기', '복제 배양기', '훈련소', '시간 복제기', '증폭기', '자폭 발사대', '회수기', '변이 연구소', '복제 반응기', '처치 회수기', '자동 복제기', '재생 장치'];
  const loadoutNames = ['균형 생산', '채굴 중심', '복제 중심', '자폭 중심', '변이 중심', '회수 중심'];
  const sectorNames = ['폐공장', '에너지 협곡', '유전자 연구소', '황무지', '중앙 통제실'];
  const objectiveNames = ['코어 정복', '긴급 돌파', '방어선 돌파'];
  const upgradeNames = ['발전기 확장', '복제 배양조', '방어벽 증설'];
  const enemyNames = ['감시 코어', '복제 억제 코어', '에너지 흡수 코어', '폭발 방어 코어', '시간 교란 코어', '군집 코어'];
  for (const name of loadoutNames) dictionary.set(name + ' 공장 가동 준비. 모듈과 진입 경로를 선택하세요.', dictionary.get(name) + ' factory ready. Choose a module and an entry route.');
  for (const sector of sectorNames) for (const objective of objectiveNames) dictionary.set('경로 선택: ' + sector + ' · ' + objective, 'Route selected: ' + dictionary.get(sector) + ' · ' + dictionary.get(objective));
  for (const name of upgradeNames) for (let level = 1; level <= 3; level++) dictionary.set(name + ' ' + level + '단계.', dictionary.get(name) + ' upgraded to level ' + level + '.');
  for (let index = 1; index <= 8; index++) {
    for (const name of moduleNames) dictionary.set(index + '번 슬롯에 ' + name + ' 설치.', 'Installed ' + dictionary.get(name) + ' in slot ' + index + '.');
    for (const name of enemyNames) dictionary.set(index + '웨이브 시작 · ' + name, 'Wave ' + index + ' started · ' + dictionary.get(name));
    dictionary.set(index + '번 증폭기 바로 앞에 채굴·복제·훈련·변이·자폭 모듈을 놓으세요.', 'Place a Miner, Clone Vat, Training Station, Mutation Lab, or Demolition Launcher directly before the amplifier in slot ' + index + '.');
    if (index > 1) dictionary.set(index + '웨이브 준비 · 지원 병사 +3. 모듈과 경로를 선택하세요.', 'Preparing wave ' + index + ' · +3 reinforcement clones. Choose a module and a route.');
  }

  // Numeric legacy messages are fully anchored and accept only bounded decimal
  // values, never arbitrary strings. No substitutions are applied to unknown text.
  const amount = '(0|[1-9][0-9]{0,5})';
  const templates = [
    [new RegExp('^코어 격파! 에너지 \\+' + amount + ' · 다음 웨이브 준비 가능\\.$'), match => 'Core destroyed! +' + match[1] + ' energy · Ready to prepare the next wave.'],
    [new RegExp('^코어 격파! 에너지 \\+' + amount + ' · 모든 구역 해방\\.$'), match => 'Core destroyed! +' + match[1] + ' energy · All sectors liberated.'],
    [new RegExp('^피해 ' + amount + '(?: · 방어막 ' + amount + ')?$'), match => 'Damage ' + match[1] + (match[2] === undefined ? '' : ' · Shield damage ' + match[2])],
    [new RegExp('^피해 회수: 에너지 \\+' + amount + '$'), match => 'Damage recycled: +' + match[1] + ' energy'],
    [new RegExp('^에너지 부족: ' + amount + ' 필요$'), match => 'Not enough energy: ' + match[1] + ' required'],
    [new RegExp('^발전기: 에너지 \\+' + amount + '$'), match => 'Generator: +' + match[1] + ' energy'],
    [new RegExp('^적 반격: 병사 -' + amount + '$'), match => 'Enemy retaliation: -' + match[1] + ' clones'],
    [new RegExp('^적 방어막 재생 \\+' + amount + '$'), match => 'Enemy shield regenerated: +' + match[1]],
    [new RegExp('^([1-9]|1[0-2])턴 · 피해 ' + amount + ' · 병사 ' + amount + ' · 에너지 ' + amount + ' · 연쇄 ' + amount + '$'), match => 'Turn ' + match[1] + ' · Damage ' + match[2] + ' · Clones ' + match[3] + ' · Energy ' + match[4] + ' · Chain events ' + match[5]]
  ];

  function translate(text, language) {
    if (language !== 'en' || typeof text !== 'string') return text;
    if (dictionary.has(text)) return dictionary.get(text);
    if (text.length > 500) return text;
    for (const [pattern, render] of templates) {
      const match = pattern.exec(text);
      // JavaScript's `$` also matches before a trailing newline. Require the
      // entire value so a near-match in a saved log still passes through exactly.
      if (match && match[0] === text) return render(match);
    }
    return text;
  }

  return Object.freeze({ translate });
});
