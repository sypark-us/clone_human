(function () {
  'use strict';
  const E = window.CloneHumanEngine;
  const Art = window.CloneHumanMap;
  const $ = id => document.getElementById(id);
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const number = value => Number(value).toLocaleString('ko-KR');
  const kindName = { energy: '에너지', clone: '생산', chain: '연쇄', attack: '공격' };
  let storage;
  try { storage = window.localStorage; } catch (_) { storage = null; }
  const store = window.CloneHumanStorage.createStore(storage, E.validateRun);
  const loaded = store.load();
  let run = loaded.run;
  let settings = loaded.settings;
  let paused = true;
  let moving = false;
  let timer = null;
  let toastTimer = null;
  let lastAnnouncedPhase = null;
  let welcomeVisible = true;
  let saveFailed = false;
  const audio = new window.CloneHumanAudio();
  audio.configure(settings);
  const map = new Art.FactoryMap($('factory'), E,
    (index, position) => {
      if (index < 0) { toast('설비를 선택한 뒤 ‘지도에서 이동’을 눌러 이 땅으로 옮기세요.'); $('coordinates').textContent = (position.x + 1) + ', ' + (position.y + 1); return; }
      act(() => E.selectSlot(run, index));
    },
    (index, x, y) => { act(() => E.relocateSlot(run, index, x, y), 'place'); moving = false; render(); toast('설비를 옮겼습니다. 지형 보너스를 확인하세요.'); }
  );

  function toast(message) {
    $('toast').textContent = message; $('toast').hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4200);
  }
  function save() {
    const result = store.save(run, settings);
    $('save-status').classList.toggle('error', !result.ok);
    $('save-status').textContent = result.ok ? '자동 저장됨' : '저장 불가';
    $('save-status').title = result.error || '이 브라우저에 진행 상황이 저장되었습니다.';
    $('save-warning').hidden = result.ok;
    if (!result.ok) {
      $('welcome-save-note').textContent = result.error + ' 현재 탭에서는 계속 플레이할 수 있습니다.';
      $('save-warning').textContent = '진행 상황을 저장하지 못했습니다. 저장 공간과 브라우저 설정을 확인하세요. 현재 탭에서는 계속 플레이할 수 있지만, 닫으면 최근 진행이 사라집니다.';
      if (!saveFailed) toast('자동 저장에 실패했습니다. 상단의 저장 안내를 확인하세요.');
      $('save-status').setAttribute('aria-label', result.error);
    } else $('save-status').removeAttribute('aria-label');
    saveFailed = !result.ok;
    return result.ok;
  }
  function stopTimer() { if (timer !== null) clearInterval(timer); timer = null; }
  function schedule() {
    stopTimer();
    if (!run || run.phase !== 'battle' || paused || welcomeVisible || document.hidden) return;
    timer = setInterval(advanceTurn, 1100 / settings.speed);
  }
  function advanceTurn() {
    if (!run || run.phase !== 'battle') { stopTimer(); return; }
    E.tick(run);
    audio.play(run.phase === 'lost' ? 'lose' : ['report', 'won'].includes(run.phase) ? 'win' : 'turn');
    if (run.phase !== 'battle') { stopTimer(); paused = true; }
    save(); render();
    if (run.phase !== 'battle') $('report-section').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function act(action, sound = 'click') {
    if (!run) return;
    audio.unlock(); action(); audio.play(sound); save(); render();
  }
  function primary() {
    if (!run || welcomeVisible) return;
    audio.unlock();
    if (run.phase === 'prepare') {
      if (!E.canStart(run)) return;
      E.startBattle(run); paused = false; moving = false; audio.play('place');
    } else if (run.phase === 'battle') paused = !paused;
    else if (run.phase === 'report') { E.nextWave(run); paused = true; moving = false; $('factory').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else { showWelcome(); return; }
    save(); render(); schedule();
  }
  function showWelcome() {
    paused = true; stopTimer(); welcomeVisible = true;
    $('game').hidden = true; $('welcome').hidden = false;
    $('resume-button').hidden = !run;
    $('resume-button').textContent = run && ['won', 'lost'].includes(run.phase) ? '지난 결과 보기 →' : '이어하기 →';
    $('launch-button').className = run ? 'secondary-button' : 'primary-button';
    $('launch-button').textContent = run ? '새 공장 시작' : '공장 가동 →';
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function enterGame() {
    welcomeVisible = false; $('welcome').hidden = true; $('game').hidden = false;
    paused = true; moving = false; render();
    if (run.phase === 'battle') toast('저장된 전투를 불러왔습니다. ‘전투 계속’을 누르면 재개됩니다.');
    $('factory-title').tabIndex = -1; $('factory-title').focus({ preventScroll: true });
  }
  function beginRun() {
    const loadout = new FormData($('new-run-form')).get('loadout') || 'balanced';
    stopTimer();
    const seed = window.crypto?.getRandomValues ? window.crypto.getRandomValues(new Uint32Array(1))[0] : Date.now();
    run = E.createRun({ seed, loadout });
    lastAnnouncedPhase = null;
    save(); enterGame(); audio.unlock(); audio.play('place');
    if (!settings.tutorialSeen) {
      settings.tutorialSeen = true; save(); openDialog('guide-dialog');
    }
  }
  function openDialog(id) {
    if (run?.phase === 'battle') { paused = true; schedule(); render(); }
    $(id).showModal();
  }
  function renderAudio() {
    $('music-button').textContent = settings.music ? '음악 켜짐' : '음악 꺼짐';
    $('music-button').setAttribute('aria-pressed', String(settings.music));
    $('sfx-button').textContent = settings.sfx ? '효과음 켜짐' : '효과음 꺼짐';
    $('sfx-button').setAttribute('aria-pressed', String(settings.sfx));
    $('speed-select').value = String(settings.speed);
  }
  function renderCampaign() {
    $('campaign').innerHTML = Array.from({ length: 8 }, (_, i) => {
      const wave = i + 1;
      const complete = wave < run.wave || (wave === run.wave && ['report', 'won'].includes(run.phase));
      return '<div class="campaign-node ' + (complete ? 'complete' : wave === run.wave ? 'current' : '') + '"' + (wave === run.wave ? ' aria-current="step"' : '') + '><span class="campaign-number">' + (complete ? '✓' : wave) + '</span><span>' + (wave === 8 ? '최종 코어' : '구역 ' + wave) + '</span></div>';
    }).join('');
  }
  function renderRoutes() {
    if (run.routePending) {
      $('routes').innerHTML = run.routes.map((route, index) => {
        const sector = E.SECTORS.find(item => item.id === route.sectorId);
        const objective = E.OBJECTIVES[route.objectiveId];
        const enemy = E.ENEMIES[route.enemyId];
        return '<button class="route-card" data-route="' + index + '"><div class="route-top"><strong>' + escape(sector.name) + '</strong><span>+' + objective.reward + ' 에너지</span></div><p>' + escape(objective.name) + ' · ' + objective.limit + '턴 제한</p><small>' + escape(enemy.name) + '</small><p>' + escape(enemy.description) + '</p><small>' + escape(sector.lanes.map(lane => lane.name).join(' / ')) + '</small></button>';
      }).join('');
    } else {
      const sector = E.SECTORS.find(item => item.id === run.sectorId);
      const objective = E.OBJECTIVES[run.objectiveId];
      $('routes').innerHTML = '<div class="route-choice"><span class="route-check">✓</span><div><strong>' + escape(sector.name) + '</strong><p>' + escape(objective.description) + '</p></div></div>';
    }
  }
  function renderInspector() {
    const id = run.slots[run.selectedSlot];
    const module = E.MODULES[id];
    const sector = E.SECTORS.find(item => item.id === run.sectorId);
    const position = run.positions[run.selectedSlot];
    const zone = Math.floor(position.x / 4);
    const lane = sector.lanes[zone];
    $('selected-art').innerHTML = Art.machine(id);
    $('selected-slot').textContent = '슬롯 ' + (run.selectedSlot + 1) + ' · ' + ['A', 'B', 'C'][zone] + ' 구역';
    $('selected-name').textContent = module?.name || '빈 설비';
    $('selected-description').textContent = module?.description || '새 설비를 선택하면 이 자리에 설치됩니다. 원하는 지형으로 먼저 이동할 수 있습니다.';
    $('selected-terrain').textContent = (run.routePending ? '경로 선택 전 미리보기 · ' : '') + lane.name + '. ' + (lane.description || '');
    $('move-button').disabled = run.phase !== 'prepare';
    $('move-button').textContent = moving ? '이동 취소 · Esc' : '지도에서 이동';
    $('move-button').setAttribute('aria-pressed', String(moving));
    $('move-left').disabled = run.phase !== 'prepare' || run.selectedSlot === 0;
    $('move-right').disabled = run.phase !== 'prepare' || run.selectedSlot === 7;
    $('coordinates').textContent = (position.x + 1) + ', ' + (position.y + 1);
  }
  function renderOffers() {
    const show = run.phase === 'prepare' && run.needsReward;
    $('reward-section').hidden = !show;
    if (!show) return;
    const selected = E.MODULES[run.slots[run.selectedSlot]];
    $('reward-instruction').textContent = '슬롯 ' + (run.selectedSlot + 1) + (selected ? '의 ' + selected.name + ' 교체 · 기존 설비는 사라집니다.' : '에 새 설비를 설치합니다.');
    $('offers').innerHTML = run.offers.map(id => {
      const module = E.MODULES[id];
      return '<button class="offer" data-install="' + id + '"><div class="offer-top">' + Art.machine(id) + '<strong>' + escape(module.name) + '</strong></div><span>' + escape(module.description) + '</span><small>' + (selected ? '현재 설비 교체 →' : '선택한 슬롯에 설치 →') + '</small></button>';
    }).join('');
    $('reroll-button').disabled = run.energy < 6;
  }
  function renderUpgrades() {
    $('upgrades').innerHTML = E.UPGRADES.map(upgrade => {
      const level = run.upgrades[upgrade.id];
      const disabled = run.phase !== 'prepare' || run.energy < upgrade.cost || level >= upgrade.maxLevel;
      return '<button class="upgrade" data-upgrade="' + upgrade.id + '" ' + (disabled ? 'disabled' : '') + '><span><strong>' + escape(upgrade.name) + '<span class="upgrade-level">Lv.' + level + '/' + upgrade.maxLevel + '</span></strong><small>' + escape(upgrade.description) + '</small></span><span class="upgrade-price">' + (level >= upgrade.maxLevel ? '최대 단계' : upgrade.cost + ' E') + '</span></button>';
    }).join('');
  }
  function renderBattle() {
    const preview = E.getBattlePreview(run);
    const enemy = E.ENEMIES[run.enemyId];
    $('battle-phase').textContent = run.phase === 'prepare' ? '전투 준비' : run.phase === 'battle' ? (paused ? '일시정지' : '생산 가동 중') : run.report?.win ? '코어 격파' : '방어선 붕괴';
    $('battle-heading').closest('section').classList.toggle('running', run.phase === 'battle' && !paused);
    $('clone-army').innerHTML = Array.from({ length: Math.min(8, run.units) }, () => Art.cloneArt()).join('') || '<span class="muted">병력 없음</span>';
    $('army-label').textContent = '복제인간 ' + number(run.units) + '명 · 공격력 ' + number(run.attack);
    $('enemy-art').innerHTML = Art.enemyArt();
    $('enemy-name').textContent = enemy.name;
    $('enemy-ability').textContent = enemy.description;
    $('enemy-hp').textContent = number(preview.hp) + ' / ' + number(preview.maxHp);
    $('health-fill').style.transform = 'scaleX(' + Math.max(0, Math.min(1, preview.hp / preview.maxHp)) + ')';
    $('health-meter').setAttribute('aria-valuenow', preview.hp);
    $('health-meter').setAttribute('aria-valuemax', preview.maxHp);
    $('shield-label').textContent = '방어막 ' + number(preview.shield) + ' · 턴당 병사 손실 ' + preview.attack;
    $('turn-label').textContent = '턴 ' + run.turn + ' / ' + preview.limit;
  }
  function renderReport() {
    const report = run.report;
    $('report-section').hidden = !report;
    if (!report) return;
    $('report-title').textContent = run.phase === 'won' ? '공장이 미래를 만들었습니다.' : report.win ? '구역 ' + report.wave + ' 돌파 완료' : '생산 라인이 멈췄습니다.';
    $('report-reason').textContent = { 'core-destroyed': '적 코어를 격파했습니다. 생산과 연쇄 효과를 확인하세요.', 'turn-limit': '제한 턴 안에 코어를 격파하지 못했습니다. 에너지 공급과 공격 설비의 순서를 바꿔 보세요.' }[report.reason] || '전투가 끝났습니다.';
    $('report-reward').textContent = report.win ? '+' + report.reward + ' 에너지' : '다시 설계하세요';
    $('report-stats').innerHTML = [['전투 턴', report.turns], ['처리한 피해', report.damage], ['연쇄 이벤트', report.events], ['최대 턴 연쇄', report.peak]].map(([label, value]) => '<div>' + label + '<strong>' + number(value) + '</strong></div>').join('');
    const entries = Object.entries(report.metrics).filter(([, metric]) => metric.damage > 0).sort((a, b) => b[1].damage - a[1].damage);
    const maximum = Math.max(1, ...entries.map(([, metric]) => metric.damage));
    $('report-modules').innerHTML = entries.map(([id, metric]) => '<div class="report-module"><span>' + escape(E.MODULES[id]?.name || '기본 공격') + '</span><div class="contribution"><span style="width:' + (metric.damage / maximum * 100) + '%"></span></div><span>' + number(metric.damage) + ' 피해</span></div>').join('');
  }
  function renderCommand() {
    let title, detail, label;
    if (run.phase === 'prepare') {
      title = moving ? '이동할 땅을 선택하세요' : '공장 설계 중';
      detail = run.routePending ? '다음 경로를 선택하세요.' : run.needsReward ? '새 설비를 설치하세요.' : '준비 완료. 생산 라인을 가동하세요.';
      label = '전투 시작';
    } else if (run.phase === 'battle') {
      title = paused ? '생산 일시정지' : '생산 가동 중';
      detail = '턴 ' + run.turn + ' / ' + E.OBJECTIVES[run.objectiveId].limit + ' · ' + (paused ? '한 턴씩 결과를 확인할 수 있습니다.' : '설비가 순서대로 작동합니다.');
      label = paused ? '전투 계속' : '일시정지';
    } else if (run.phase === 'report') { title = '다음 구역으로'; detail = '새 설비를 확보하고 공장을 확장하세요.'; label = '다음 웨이브'; }
    else { title = run.phase === 'won' ? '8개 구역 돌파 완료' : '이번 도전 종료'; detail = '다른 설계로 새로운 공장을 시작하세요.'; label = '다시 설계'; }
    $('command-title').textContent = title; $('command-detail').textContent = detail;
    $('primary-button').innerHTML = escape(label) + '<span aria-hidden="true">' + (run.phase === 'battle' && !paused ? 'Ⅱ' : '→') + '</span>';
    $('primary-button').disabled = run.phase === 'prepare' && !E.canStart(run);
    $('step-button').hidden = run.phase !== 'battle';
    $('step-button').disabled = !paused;
    $('build-status').textContent = run.phase === 'prepare' ? '건설 모드' : '관찰 모드';
    $('map-instruction').textContent = moving ? '목적지를 선택하세요. 이미 설비가 있는 땅은 서로 위치를 바꿉니다.' : run.phase === 'prepare' ? '설비 선택 → 이동 · 지형 보너스에 맞춰 배치하세요.' : '컨베이어 순서로 생산됩니다. 전투 중에는 배치가 잠깁니다.';
  }
  function render() {
    const focusedSlot = document.activeElement?.dataset.slot;
    renderAudio();
    if (!run) return;
    const sector = E.SECTORS.find(item => item.id === run.sectorId);
    $('sector-name').textContent = sector.name;
    $('mission-description').textContent = sector.description;
    $('energy').textContent = number(run.energy); $('units').textContent = number(run.units);
    $('attack').textContent = number(run.attack); $('total-damage').textContent = number(run.totalDamage);
    $('wave-label').textContent = run.wave + ' / 8';
    renderCampaign(); renderRoutes(); renderInspector(); renderOffers(); renderUpgrades(); renderBattle(); renderReport(); renderCommand();
    map.render(run, moving, paused);
    $('slot-rack').innerHTML = run.slots.map((id, i) => '<button class="rack-slot ' + (i === run.selectedSlot ? 'selected' : '') + '" data-slot="' + i + '" aria-pressed="' + (i === run.selectedSlot) + '" aria-label="슬롯 ' + (i + 1) + ' · ' + escape(E.MODULES[id]?.name || '빈 설비') + '" ' + (run.phase !== 'prepare' ? 'disabled' : '') + '><b>' + (i + 1) + '</b>' + (id ? Art.machine(id) : '<span class="rack-empty">+</span>') + '<span>' + escape(E.MODULES[id]?.name || '빈 설비') + '</span></button>').join('');
    if (focusedSlot !== undefined && run.phase === 'prepare') $('slot-rack').querySelector('[data-slot="' + focusedSlot + '"]')?.focus({ preventScroll: true });
    $('hints').replaceChildren(...E.getHints(run).map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
    $('log').replaceChildren(...run.log.map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
    if (lastAnnouncedPhase !== run.phase) {
      $('announcer').textContent = run.phase === 'report' || run.phase === 'won' || run.phase === 'lost' ? $('report-title').textContent : $('command-title').textContent;
      lastAnnouncedPhase = run.phase;
    }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.close) { $(button.dataset.close).close(); return; }
    if (run?.phase !== 'prepare') return;
    if (button.dataset.slot !== undefined) act(() => E.selectSlot(run, Number(button.dataset.slot)));
    if (button.dataset.route !== undefined) act(() => E.chooseRoute(run, Number(button.dataset.route)), 'place');
    if (button.dataset.install) { act(() => E.installModule(run, button.dataset.install), 'place'); toast('설비를 설치했습니다. 지도에서 위치와 연결을 확인하세요.'); }
    if (button.dataset.upgrade) { act(() => E.buyUpgrade(run, button.dataset.upgrade), 'place'); }
  });
  $('primary-button').addEventListener('click', primary);
  $('step-button').addEventListener('click', () => { if (paused) advanceTurn(); });
  $('speed-select').addEventListener('change', event => { settings.speed = Number(event.target.value); save(); schedule(); });
  $('move-button').addEventListener('click', () => { if (run?.phase !== 'prepare') return; moving = !moving; render(); if (moving) { $('factory').scrollIntoView({ behavior: 'smooth', block: 'center' }); toast('목적지를 클릭하세요. 방향키와 Enter로도 이동할 수 있습니다.'); } });
  $('move-left').addEventListener('click', () => act(() => E.moveSlot(run, -1)));
  $('move-right').addEventListener('click', () => act(() => E.moveSlot(run, 1)));
  $('reroll-button').addEventListener('click', () => act(() => E.reroll(run)));
  $('zoom-in').addEventListener('click', () => map.setZoom(map.zoom + .2));
  $('zoom-out').addEventListener('click', () => map.setZoom(map.zoom - .2));
  $('zoom-reset').addEventListener('click', () => { map.setZoom(1); $('factory').scrollLeft = 0; $('factory').scrollTop = 0; });
  $('music-button').addEventListener('click', async () => {
    settings.music = !settings.music;
    audio.configure(settings);
    const available = await audio.unlock();
    if (!available && settings.music) { settings.music = false; audio.configure(settings); toast('이 브라우저에서 음악을 재생할 수 없습니다. 게임은 계속할 수 있습니다.'); }
    // Preserve an unreadable save until the user explicitly starts a new run.
    if (!loaded.error || run) save(); renderAudio();
  });
  $('sfx-button').addEventListener('click', () => { settings.sfx = !settings.sfx; audio.configure(settings); audio.unlock(); audio.play('click'); if (!loaded.error || run) save(); renderAudio(); });
  $('new-run-form').addEventListener('submit', event => {
    event.preventDefault();
    if (run && !['won', 'lost'].includes(run.phase)) openDialog('confirm-dialog');
    else beginRun();
  });
  $('confirm-new').addEventListener('click', () => { $('confirm-dialog').close(); beginRun(); });
  $('resume-button').addEventListener('click', () => { if (run) { enterGame(); audio.unlock(); } });
  $('new-game-button').addEventListener('click', showWelcome);
  $('home-button').addEventListener('click', event => { event.preventDefault(); showWelcome(); });
  for (const id of ['help-button', 'welcome-guide']) $(id).addEventListener('click', () => openDialog('guide-dialog'));
  $('codex-button').addEventListener('click', () => openDialog('codex-dialog'));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && moving) { moving = false; render(); }
    if (event.code === 'Space' && !welcomeVisible && !document.querySelector('dialog[open]') && !event.target.closest('button,input,select,textarea,a,summary')) {
      event.preventDefault(); primary();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && run?.phase === 'battle') { paused = true; stopTimer(); render(); }
    audio.setHidden(document.hidden);
  });
  window.addEventListener('pagehide', () => { stopTimer(); if (run) save(); });

  function loadoutMarkup(loadout) {
    return '<label class="loadout"><input type="radio" name="loadout" value="' + loadout.id + '" ' + (loadout.id === 'balanced' ? 'checked' : '') + '><span><strong>' + escape(loadout.name) + (loadout.id === 'balanced' ? ' · 추천' : '') + '</strong><small>' + escape(loadout.description) + '</small></span>' + Art.machine(loadout.slots[1]) + '</label>';
  }
  const recommended = ['balanced', 'cloning', 'explosive'];
  $('loadouts').innerHTML = E.LOADOUTS.filter(item => recommended.includes(item.id)).map(loadoutMarkup).join('') + '<details class="more-loadouts"><summary>다른 시작 설계 3개</summary>' + E.LOADOUTS.filter(item => !recommended.includes(item.id)).map(loadoutMarkup).join('') + '</details>';
  $('codex-list').innerHTML = Object.values(E.MODULES).map(module => '<article class="codex-entry">' + Art.machine(module.id) + '<div><small>' + escape(kindName[module.kind] || module.kind) + '</small><h3>' + escape(module.name) + '</h3><p>' + escape(module.description) + '</p></div></article>').join('');
  $('welcome-factory').innerHTML = ['mine', 'clone', 'mutation', 'boost', 'soldier', 'bomb'].map(id => Art.machine(id)).join('');
  if (loaded.error) {
    $('welcome-save-note').textContent = loaded.error + ' 새 공장을 시작하면 새 저장 데이터로 교체됩니다.';
    $('save-status').textContent = '저장 확인 필요'; $('save-status').classList.add('error');
    $('save-warning').hidden = false;
    $('save-warning').textContent = loaded.error + ' 새 공장을 시작하면 새 저장 데이터로 교체됩니다.';
  }
  renderAudio(); showWelcome();
})();
