(function () {
  'use strict';
  const E = window.CloneHumanEngine;
  const Art = window.CloneHumanMap;
  const I = window.CloneHumanI18n;
  const t = I.t;
  const $ = id => document.getElementById(id);
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const number = value => Number(value).toLocaleString(I.getLanguage() === 'en' ? 'en-US' : 'ko-KR');
  const kindName = { energy: '에너지', clone: '생산', chain: '연쇄', attack: '공격' };
  let storage;
  try { storage = window.localStorage; } catch (_) { storage = null; }
  const store = window.CloneHumanStorage.createStore(storage, E.validateRun);
  const loaded = store.load();
  let run = loaded.run;
  let settings = loaded.settings;
  I.capturePage(document);
  I.setLanguage(settings.language);
  I.applyPage(document);
  let saveResult = null;
  let paused = true;
  let moving = false;
  let connecting = false;
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
    (index, x, y) => { moving = false; connecting = false; act(() => { E.selectSlot(run, index); E.relocateSlot(run, index, x, y); }, 'place'); toast('설비를 옮겼습니다. 지형 보너스를 확인하세요.'); },
    (from, to) => {
      if (!E.canConnectSlots(run, from, to)) return;
      connecting = false; act(() => E.connectSlots(run, from, to), 'place'); toast('연결했습니다.');
    }
  );

  map.bindTooltips($('slot-rack'));

  function toast(message) {
    $('toast').textContent = t(message); $('toast').hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4200);
  }
  function renderSaveStatus() {
    const error = saveResult ? saveResult.error : loaded.error;
    const corrupt = !saveResult && loaded.error;
    $('save-status').classList.toggle('error', !!error);
    $('save-status').textContent = t(error ? (corrupt ? '저장 확인 필요' : '저장 불가') : saveResult ? '자동 저장됨' : '로컬 저장');
    $('save-status').title = error ? t(error) : t('이 브라우저에 진행 상황이 저장되었습니다.');
    $('save-warning').hidden = !error;
    if (error) {
      const message = corrupt
        ? t('{error} 새 공장을 시작하면 새 저장 데이터로 교체됩니다.', { error: t(error) })
        : t('진행 상황을 저장하지 못했습니다. 저장 공간과 브라우저 설정을 확인하세요. 현재 탭에서는 계속 플레이할 수 있지만, 닫으면 최근 진행이 사라집니다.');
      $('save-warning').textContent = message;
      $('welcome-save-note').textContent = corrupt ? message : t('{error} 현재 탭에서는 계속 플레이할 수 있습니다.', { error: t(error) });
      $('save-status').setAttribute('aria-label', t(error));
    } else {
      $('save-status').removeAttribute('aria-label');
      $('welcome-save-note').textContent = t('진행 상황은 이 브라우저에 자동으로 저장됩니다.');
    }
  }
  function save() {
    saveResult = store.save(run, settings);
    renderSaveStatus();
    if (!saveResult.ok && !saveFailed) toast('자동 저장에 실패했습니다. 상단의 저장 안내를 확인하세요.');
    saveFailed = !saveResult.ok;
    return saveResult.ok;
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
    if (run.phase !== 'battle' && !window.CloneHumanLayout?.isDesktop()) $('report-section').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
      E.startBattle(run); paused = false; moving = false; connecting = false; audio.play('place');
    } else if (run.phase === 'battle') paused = !paused;
    else if (run.phase === 'report') { E.nextWave(run); paused = true; moving = false; connecting = false; $('factory').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else { showWelcome(); return; }
    save(); render(); schedule();
  }
  function showWelcome() {
    paused = true; stopTimer(); welcomeVisible = true;
    $('game').hidden = true; $('welcome').hidden = false;
    renderWelcomeLabels();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function renderWelcomeLabels() {
    $('resume-button').hidden = !run;
    $('resume-button').textContent = t(run && ['won', 'lost'].includes(run.phase) ? '지난 결과 보기 →' : '이어하기 →');
    $('launch-button').className = run ? 'secondary-button' : 'primary-button';
    $('launch-button').textContent = t(run ? '새 공장 시작' : '공장 가동 →');
  }
  function enterGame() {
    welcomeVisible = false; $('welcome').hidden = true; $('game').hidden = false;
    paused = true; moving = false; connecting = false; render();
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
    $('music-button').textContent = t(settings.music ? '음악 켜짐' : '음악 꺼짐');
    $('music-button').setAttribute('aria-pressed', String(settings.music));
    $('sfx-button').textContent = t(settings.sfx ? '효과음 켜짐' : '효과음 꺼짐');
    $('sfx-button').setAttribute('aria-pressed', String(settings.sfx));
    $('speed-select').value = String(settings.speed);
    $('language-select').value = settings.language;
  }
  function renderCampaign() {
    $('campaign').innerHTML = Array.from({ length: 8 }, (_, i) => {
      const wave = i + 1;
      const complete = wave < run.wave || (wave === run.wave && ['report', 'won'].includes(run.phase));
      return '<div class="campaign-node ' + (complete ? 'complete' : wave === run.wave ? 'current' : '') + '"' + (wave === run.wave ? ' aria-current="step"' : '') + '><span class="campaign-number">' + (complete ? '✓' : wave) + '</span><span>' + escape(wave === 8 ? t('최종 코어') : t('구역 {wave}', { wave })) + '</span></div>';
    }).join('');
  }
  const upgradeSummaries = { power: '+2 E / 턴', training: '복제인간 +1 / 턴', fort: '아군 손실 -1 / 턴' };
  function bonusText(bonus) {
    return [bonus.costReduction && t('비용 -1 E'), bonus.clones && t('복제인간 +1'), bonus.damageMultiplier > 1 && t('폭파 피해 +20%')].filter(Boolean);
  }
  function renderModuleDetails() {
    if (!run) return;
    const id = run.slots[run.selectedSlot];
    const module = E.MODULES[id];
    const sector = E.SECTORS.find(item => item.id === run.sectorId);
    const lane = sector.lanes[Math.floor(run.positions[run.selectedSlot].x / 4)];
    $('module-detail-title').textContent = t(module?.name || '빈 설비');
    $('module-detail-description').textContent = t(module?.description || '빈 슬롯에 새 설비를 설치하세요.');
    $('module-detail-terrain').textContent = t(lane.name) + ': ' + t(lane.description || '') + ' ' + bonusText(E.getSynergyBonus(run, run.selectedSlot)).join(' · ');
  }
  function renderRouteDetails() {
    if (!run) return;
    const routes = run.routePending ? run.routes : [{ sectorId: run.sectorId, enemyId: run.enemyId, objectiveId: run.objectiveId }];
    $('route-detail-content').innerHTML = routes.map(route => {
      const sector = E.SECTORS.find(item => item.id === route.sectorId);
      const objective = E.OBJECTIVES[route.objectiveId], enemy = E.ENEMIES[route.enemyId];
      return '<article><h3>' + escape(t(sector.name)) + '</h3><p>' + escape(t(enemy.name)) + ': ' + escape(t(enemy.description)) + '</p><p>' + escape(t(objective.description)) + '</p><ul>' + sector.lanes.map(lane => '<li>' + escape(t(lane.name)) + ': ' + escape(t(lane.description)) + '</li>').join('') + '</ul></article>';
    }).join('');
  }
  function renderRoutes() {
    renderRouteDetails();
    if (run.routePending) {
      $('routes').innerHTML = run.routes.map((route, index) => {
        const sector = E.SECTORS.find(item => item.id === route.sectorId);
        const objective = E.OBJECTIVES[route.objectiveId];
        const enemy = E.ENEMIES[route.enemyId];
        return '<button class="route-card" data-route="' + index + '"><div class="route-top"><strong>' + escape(t(sector.name)) + '</strong><span>' + escape(t('+{amount} 에너지', { amount: objective.reward })) + '</span></div><p>' + escape(t(objective.name)) + ' · ' + escape(t('{limit}턴 제한', { limit: objective.limit })) + '</p><small>' + escape(t(enemy.name)) + '</small><small>' + escape(sector.lanes.map(lane => t(lane.name).split(' · ')[0]).join(' / ')) + '</small></button>';
      }).join('');
    } else {
      const sector = E.SECTORS.find(item => item.id === run.sectorId);
      const objective = E.OBJECTIVES[run.objectiveId];
      $('routes').innerHTML = '<div class="route-choice"><span class="route-check">✓</span><div><strong>' + escape(t(sector.name)) + '</strong><p>' + escape(t('{limit}턴 제한', { limit: objective.limit })) + '</p></div></div>';
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
    $('selected-slot').textContent = t('슬롯 {slot} · {zone} 구역', { slot: run.selectedSlot + 1, zone: ['A', 'B', 'C'][zone] });
    $('selected-name').textContent = t(module?.name || '빈 설비');
    $('selected-description').textContent = Art.summary(id);
    $('selected-terrain').textContent = t(lane.name);
    $('selected-bonuses').textContent = bonusText(E.getSynergyBonus(run, run.selectedSlot)).join(' · ');
    $('connect-button').disabled = run.phase !== 'prepare' || (!connecting && !run.slots.some((_, i) => E.canConnectSlots(run, run.selectedSlot, i)));
    $('connect-button').textContent = t(connecting ? '연결 취소 · Esc' : '설비 연결');
    $('connect-button').setAttribute('aria-pressed', String(connecting));
    const links = run.connectors || [];
    $('connections-summary').textContent = t('직접 연결 {count} / 2', { count: links.length });
    $('connections-list').innerHTML = links.map(link => '<div><span>' + (link.from + 1) + ' → ' + (link.to + 1) + '</span><button class="quiet-button" data-disconnect="' + link.from + ':' + link.to + '" ' + (run.phase !== 'prepare' ? 'disabled' : '') + ' aria-label="' + escape(t('연결 {from} → {to} 제거', { from: link.from + 1, to: link.to + 1 })) + '">' + escape(t('제거')) + '</button></div>').join('') || '<p>' + escape(t('선택 사항 · 먼 설비를 연결하세요.')) + '</p>';
    renderModuleDetails();
    $('move-button').disabled = run.phase !== 'prepare';
    $('move-button').textContent = t(moving ? '이동 취소 · Esc' : '지도에서 이동');
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
    $('reward-instruction').textContent = t(selected ? '슬롯 {slot}의 {name} 교체 · 기존 설비는 사라집니다.' : '슬롯 {slot}에 새 설비를 설치합니다.', { slot: run.selectedSlot + 1, name: selected ? t(selected.name) : '' });
    $('offers').innerHTML = run.offers.map(id => {
      const module = E.MODULES[id];
      return '<button class="offer" data-install="' + id + '"><div class="offer-top">' + Art.machine(id) + '<strong>' + escape(t(module.name)) + '</strong></div><span>' + escape(Art.summary(id)) + '</span><small>' + escape(t(selected ? '현재 설비 교체 →' : '선택한 슬롯에 설치 →')) + '</small></button>';
    }).join('');
    $('reroll-button').disabled = run.energy < 6;
  }
  function renderUpgrades() {
    $('upgrades').innerHTML = E.UPGRADES.map(upgrade => {
      const level = run.upgrades[upgrade.id];
      const disabled = run.phase !== 'prepare' || run.energy < upgrade.cost || level >= upgrade.maxLevel;
      return '<button class="upgrade" data-upgrade="' + upgrade.id + '" ' + (disabled ? 'disabled' : '') + '><span><strong>' + escape(t(upgrade.name)) + '<span class="upgrade-level">Lv.' + level + '/' + upgrade.maxLevel + '</span></strong><small>' + escape(t(upgradeSummaries[upgrade.id])) + '</small></span><span class="upgrade-price">' + (level >= upgrade.maxLevel ? escape(t('최대 단계')) : upgrade.cost + ' E') + '</span></button>';
    }).join('');
  }
  function renderBattle() { window.CloneHumanCombat.render(run, E.getBattlePreview(run), paused); }
  function renderReport() {
    const report = run.report;
    $('report-section').hidden = !report;
    if (!report) return;
    $('report-title').textContent = t(run.phase === 'won' ? '공장이 미래를 만들었습니다.' : report.win ? '구역 {wave} 돌파 완료' : '생산 라인이 멈췄습니다.', { wave: report.wave });
    $('report-reason').textContent = t({ 'core-destroyed': '적 코어를 격파했습니다. 생산과 연쇄 효과를 확인하세요.', 'turn-limit': '제한 턴 안에 코어를 격파하지 못했습니다. 에너지 공급과 공격 설비의 순서를 바꿔 보세요.' }[report.reason] || '전투가 끝났습니다.');
    $('report-reward').textContent = report.win ? t('+{amount} 에너지', { amount: report.reward }) : t('다시 설계하세요');
    $('report-stats').innerHTML = [['전투 턴', report.turns], ['처리한 피해', report.damage], ['연쇄 이벤트', report.events], ['최대 턴 연쇄', report.peak]].map(([label, value]) => '<div>' + escape(t(label)) + '<strong>' + number(value) + '</strong></div>').join('');
    const entries = Object.entries(report.metrics).filter(([, metric]) => metric.damage > 0).sort((a, b) => b[1].damage - a[1].damage);
    const maximum = Math.max(1, ...entries.map(([, metric]) => metric.damage));
    $('report-modules').innerHTML = entries.map(([id, metric]) => '<div class="report-module"><span>' + escape(t(E.MODULES[id]?.name || '기본 공격')) + '</span><div class="contribution"><span style="width:' + (metric.damage / maximum * 100) + '%"></span></div><span>' + escape(t('{damage} 피해', { damage: number(metric.damage) })) + '</span></div>').join('');
  }
  function renderCommand() {
    let title, detail, label;
    if (run.phase === 'prepare') {
      title = connecting ? '연결할 설비를 선택하세요' : moving ? '이동할 땅을 선택하세요' : run.routePending ? '1. 경로 선택' : run.needsReward ? '2. 설비 추가' : '3. 전투 시작';
      detail = run.routePending ? '다음 경로를 선택하세요.' : run.needsReward ? '새 설비를 설치하세요.' : '적 코어를 파괴하세요.';
      label = '전투 시작';
    } else if (run.phase === 'battle') {
      title = paused ? '전투 일시정지됨' : '교전 중';
      detail = t('턴 {turn} / {limit}', { turn: run.turn, limit: E.OBJECTIVES[run.objectiveId].limit }) + ' · ' + t(paused ? '한 턴씩 결과를 확인할 수 있습니다.' : '설비가 순서대로 작동합니다.');
      label = paused ? '전투 계속' : '전투 일시정지';
    } else if (run.phase === 'report') { title = '다음 구역으로'; detail = '새 설비를 확보하고 공장을 확장하세요.'; label = '다음 웨이브'; }
    else { title = run.phase === 'won' ? '8개 구역 돌파 완료' : '이번 도전 종료'; detail = '다른 설계로 새로운 공장을 시작하세요.'; label = '다시 설계'; }
    $('command-title').textContent = t(title); $('command-detail').textContent = t(detail);
    $('primary-button').innerHTML = escape(t(label)) + '<span aria-hidden="true">' + (run.phase === 'battle' && !paused ? 'Ⅱ' : '→') + '</span>';
    $('primary-button').disabled = run.phase === 'prepare' && !E.canStart(run);
    $('step-button').hidden = run.phase !== 'battle';
    $('step-button').disabled = !paused;
    $('build-status').textContent = t(run.phase === 'prepare' ? '건설 모드' : '관찰 모드');
    $('map-instruction').textContent = t(connecting ? '빛나는 설비를 선택해 연결하세요. Esc로 취소합니다.' : moving ? '목적지를 선택하세요. 이미 설비가 있는 땅은 서로 위치를 바꿉니다.' : run.phase === 'prepare' ? '설비끼리 드래그해 위치 교환 · 클릭으로 선택' : '컨베이어 순서로 생산됩니다. 전투 중에는 배치가 잠깁니다.');
  }
  function render() {
    const focusedSlot = document.activeElement?.dataset.slot;
    renderAudio();
    if (!run) return;
    const sector = E.SECTORS.find(item => item.id === run.sectorId);
    $('sector-name').textContent = t('적: {enemy}', { enemy: t(E.ENEMIES[run.enemyId].name) });
    $('mission-description').textContent = t('{sector} · {limit}턴 안에 코어 파괴', { sector: t(sector.name), limit: E.OBJECTIVES[run.objectiveId].limit });
    $('energy').textContent = number(run.energy); $('units').textContent = number(run.units);
    $('attack').textContent = number(run.attack); $('total-damage').textContent = number(run.totalDamage);
    $('wave-label').textContent = run.wave + ' / 8';
    renderCampaign(); renderRoutes(); renderInspector(); renderOffers(); renderUpgrades(); renderBattle(); renderReport(); renderCommand();
    map.render(run, moving, paused, connecting);
    $('slot-rack').innerHTML = run.slots.map((id, i) => '<button class="rack-slot ' + (i === run.selectedSlot ? 'selected' : '') + '" data-slot="' + i + '" aria-pressed="' + (i === run.selectedSlot) + '" aria-label="' + escape(t('슬롯 {slot}', { slot: i + 1 })) + ' · ' + escape(t(E.MODULES[id]?.name || '빈 설비')) + '" ' + (run.phase !== 'prepare' ? 'disabled' : '') + '><b>' + (i + 1) + '</b>' + (id ? Art.machine(id) : '<span class="rack-empty">+</span>') + '<span>' + escape(t(E.MODULES[id]?.name || '빈 설비')) + '</span></button>').join('');
    map.refreshTooltip($('slot-rack'));
    if (focusedSlot !== undefined && run.phase === 'prepare') $('slot-rack').querySelector('[data-slot="' + focusedSlot + '"]')?.focus({ preventScroll: true });
    $('hints').replaceChildren(...E.getHints(run).slice(0, 1).map(text => { const li = document.createElement('li'); li.textContent = t(text); return li; }));
    $('log').replaceChildren(...run.log.map(text => { const li = document.createElement('li'); li.textContent = t(text); return li; }));
    window.CloneHumanLayout?.update({ phase: run.phase, routePending: run.routePending, needsReward: run.needsReward, selectedSlot: run.selectedSlot, moving, connecting });
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
    if (button.dataset.disconnect) { const [from, to] = button.dataset.disconnect.split(':').map(Number); act(() => E.disconnectSlots(run, from, to)); }
    if (button.dataset.slot !== undefined) { connecting = false; }
    if (button.dataset.slot !== undefined) {
      act(() => E.selectSlot(run, Number(button.dataset.slot)));
      if (event.pointerType === 'touch') map.showTooltip($('slot-rack').querySelector('[data-slot="' + run.selectedSlot + '"]'));
    }
    if (button.dataset.route !== undefined) act(() => E.chooseRoute(run, Number(button.dataset.route)), 'place');
    if (button.dataset.install) { act(() => E.installModule(run, button.dataset.install), 'place'); toast('설비를 설치했습니다. 지도에서 위치와 연결을 확인하세요.'); }
    if (button.dataset.upgrade) { act(() => E.buyUpgrade(run, button.dataset.upgrade), 'place'); }
  });
  $('primary-button').addEventListener('click', primary);
  $('step-button').addEventListener('click', () => { if (paused) advanceTurn(); });
  $('speed-select').addEventListener('change', event => { settings.speed = Number(event.target.value); save(); schedule(); });
  $('move-button').addEventListener('click', () => { if (run?.phase !== 'prepare') return; connecting = false; moving = !moving; render(); if (moving) { $('factory').scrollIntoView({ behavior: 'smooth', block: 'center' }); toast('목적지를 클릭하세요. 방향키와 Enter로도 이동할 수 있습니다.'); } });
  $('connect-button').addEventListener('click', () => { if (run?.phase !== 'prepare') return; moving = false; connecting = !connecting; render(); });
  $('route-details-button').addEventListener('click', () => openDialog('route-dialog'));
  $('module-details-button').addEventListener('click', () => openDialog('module-dialog'));
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
    if (event.key === 'Escape' && (moving || connecting)) { moving = false; connecting = false; render(); }
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
    return '<label class="loadout"><input type="radio" name="loadout" value="' + loadout.id + '" ' + (loadout.id === 'balanced' ? 'checked' : '') + '><span><strong>' + escape(t(loadout.name)) + (loadout.id === 'balanced' ? escape(t(' · 추천')) : '') + '</strong><small>' + escape(t({ balanced: '처음이라면 추천', cloning: '많은 병력', explosive: '강력한 폭파' }[loadout.id] || loadout.description)) + '</small></span>' + Art.machine(loadout.slots[1]) + '</label>';
  }
  function renderLibrary() {
  const selected = document.querySelector('input[name="loadout"]:checked')?.value || 'balanced';
  const expanded = document.querySelector('.more-loadouts')?.open || false;
  const recommended = ['balanced', 'cloning', 'explosive'];
  $('loadouts').innerHTML = E.LOADOUTS.filter(item => recommended.includes(item.id)).map(loadoutMarkup).join('') + '<details class="more-loadouts"><summary>' + escape(t('다른 시작 설계 3개')) + '</summary>' + E.LOADOUTS.filter(item => !recommended.includes(item.id)).map(loadoutMarkup).join('') + '</details>';
  $('codex-list').innerHTML = Object.values(E.MODULES).map(module => '<article class="codex-entry">' + Art.machine(module.id) + '<div><small>' + escape(t(kindName[module.kind] || module.kind)) + '</small><h3>' + escape(t(module.name)) + '</h3><p>' + escape(t(module.description)) + '</p></div></article>').join('');
  document.querySelector('input[name="loadout"][value="' + selected + '"]').checked = true;
  document.querySelector('.more-loadouts').open = expanded;
  }
  $('welcome-factory').innerHTML = ['mine', 'clone', 'mutation', 'boost', 'soldier', 'bomb'].map(id => Art.machine(id)).join('');
  $('language-select').addEventListener('change', event => {
    settings.language = event.target.value === 'en' ? 'en' : 'ko';
    I.setLanguage(settings.language); I.applyPage(document);
    $('toast').hidden = true;
    renderLibrary(); renderWelcomeLabels();
    if (!loaded.error || run) save();
    renderSaveStatus(); lastAnnouncedPhase = null; render();
  });
  document.addEventListener('clonehuman:pause', () => {
    if (run?.phase === 'battle') { paused = true; stopTimer(); render(); }
  });
  renderLibrary(); renderSaveStatus(); renderAudio(); showWelcome();
})();
