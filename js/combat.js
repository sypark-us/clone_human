(function (root) {
  'use strict';
  const $ = id => document.getElementById(id);
  const t = (...args) => root.CloneHumanI18n.t(...args);
  const number = value => Number(value).toLocaleString(root.CloneHumanI18n.getLanguage() === 'en' ? 'en-US' : 'ko-KR');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let lastKey = null;
  let lastSeed = null;
  let lastWave = null;
  let lastTurn = null;
  let sequence = 0;
  let clearTimer = null;

  function feedback(id, source, value) {
    const node = $(id);
    node.dataset.value = value;
    node.textContent = t(source, { amount: number(value) });
    node.classList.toggle('has-value', value > 0);
  }
  function render(run, preview, paused) {
    const E = root.CloneHumanEngine;
    const Art = root.CloneHumanMap;
    const panel = $('battle-heading').closest('section');
    const enemy = E.ENEMIES[run.enemyId];
    const result = E.getTurnSummary(run);
    const key = run.seed + ':' + run.wave + ':' + run.turn;
    const isNewTurn = lastKey !== null && lastSeed === run.seed && lastWave === run.wave && run.turn > lastTurn;
    $('battle-phase').textContent = t(run.phase === 'prepare' ? '전투 준비' : run.phase === 'battle' ? paused ? '일시정지' : '교전 중' : run.report?.win ? '코어 격파' : '방어선 붕괴');
    panel.classList.toggle('running', run.phase === 'battle' && !paused);
    panel.dataset.phase = run.phase;
    panel.dataset.combatSequence = sequence;
    $('allies-heading').textContent = t('아군 복제인간');
    $('enemy-heading').textContent = t('적 코어');
    const army = $('clone-army');
    const count = Math.min(8, run.units);
    if (army.dataset.count !== String(count)) {
      army.replaceChildren();
      if (count) army.innerHTML = Array.from({ length: count }, () => Art.cloneArt()).join('');
      else { const empty = document.createElement('span'); empty.className = 'muted'; empty.textContent = t('병력 없음'); army.append(empty); }
      army.dataset.count = count;
    } else if (!count) army.firstElementChild.textContent = t('병력 없음');
    $('army-label').textContent = t('복제인간 {units}명 · 공격력 {attack}', { units: number(run.units), attack: number(run.attack) });
    if (!$('enemy-art').firstElementChild) $('enemy-art').innerHTML = Art.enemyArt();
    $('enemy-name').textContent = t(enemy.name);
    $('enemy-ability').textContent = t(enemy.description);
    $('enemy-hp').textContent = number(preview.hp) + ' / ' + number(preview.maxHp);
    $('health-fill').style.transform = 'scaleX(' + Math.max(0, Math.min(1, preview.hp / preview.maxHp)) + ')';
    $('health-meter').setAttribute('aria-valuenow', preview.hp);
    $('health-meter').setAttribute('aria-valuemax', preview.maxHp);
    $('shield-label').textContent = t('방어막 {shield} · 턴당 병사 손실 {attack}', { shield: number(preview.shield), attack: preview.attack });
    $('turn-label').textContent = t('턴 {turn} / {limit}', { turn: run.turn, limit: preview.limit });
    feedback('combat-damage', '코어 -{amount}', result.damage);
    feedback('combat-shield', '방어막 -{amount}', result.shieldDamage);
    feedback('combat-loss', '반격 손실 -{amount}', result.clonesLost);
    $('combat-feedback').hidden = run.turn === 0;

    if (isNewTurn) {
      sequence++;
      panel.dataset.combatSequence = sequence;
      clearTimeout(clearTimer);
      panel.classList.remove('combat-attack', 'combat-loss');
      if (!reducedMotion.matches) {
        // Restart the finite effects once for this actual engine turn only.
        void panel.offsetWidth;
        if (result.damage + result.shieldDamage > 0) panel.classList.add('combat-attack');
        if (result.clonesLost > 0) panel.classList.add('combat-loss');
        clearTimer = setTimeout(() => panel.classList.remove('combat-attack', 'combat-loss'), 850);
      }
    } else if (lastSeed !== run.seed || lastWave !== run.wave || run.turn < lastTurn) {
      clearTimeout(clearTimer);
      panel.classList.remove('combat-attack', 'combat-loss');
    }
    lastKey = key; lastSeed = run.seed; lastWave = run.wave; lastTurn = run.turn;
  }
  root.CloneHumanCombat = { render };
})(window);
