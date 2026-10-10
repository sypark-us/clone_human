(function (root) {
  'use strict';
  const $ = id => document.getElementById(id);
  const t = source => root.CloneHumanI18n?.t(source) || source;
  const media = matchMedia('(min-width: 1001px) and (min-height: 620px)');
  const game = $('game');
  const sidebar = game.querySelector('.control-column');
  const map = $('factory');
  const command = game.querySelector('.command-bar');
  const report = $('report-section');
  const log = game.querySelector('.combat-log');
  const moved = [];
  let desktop = false;
  let selectedTab = 'route';
  let previous = null;
  let current = null;
  let reportShown = false;

  function element(tag, className, id) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (id) node.id = id;
    return node;
  }
  function button(id, className) {
    const node = element('button', className, id);
    node.type = 'button';
    return node;
  }
  function remember(node) {
    const anchor = document.createComment('desktop-layout-origin');
    node.before(anchor);
    moved.push({ node, anchor });
    return node;
  }

  const sections = {
    route: [remember($('route-section'))],
    build: [remember($('reward-section'))],
    machine: [remember(game.querySelector('.inspector'))],
    upgrades: [remember($('upgrades').closest('section')), remember(game.querySelector('.strategy-section'))]
  };
  const battle = remember(game.querySelector('.battle-panel'));
  remember(report); remember(log);
  const manager = element('section', 'desktop-manager');
  const tabs = element('div', 'management-tabs');
  tabs.setAttribute('role', 'tablist');
  const labels = { route: '경로', build: '건설', machine: '설비', upgrades: '확장' };
  const tabButtons = {};
  const panes = {};
  for (const key of Object.keys(labels)) {
    const tab = button('layout-tab-' + key, 'management-tab');
    tab.dataset.layoutTab = key;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', 'layout-pane-' + key);
    tab.addEventListener('click', () => selectTab(key));
    tab.addEventListener('keydown', event => {
      const keys = Object.keys(labels);
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const offset = event.key === 'ArrowLeft' ? -1 : 1;
      const next = event.key === 'Home' ? keys[0] : event.key === 'End' ? keys.at(-1) : keys[(keys.indexOf(key) + offset + keys.length) % keys.length];
      selectTab(next); tabButtons[next].focus();
    });
    tabButtons[key] = tab; tabs.append(tab);
    const pane = element('div', 'management-pane', 'layout-pane-' + key);
    pane.setAttribute('role', 'tabpanel');
    pane.setAttribute('aria-labelledby', tab.id);
    panes[key] = pane;
  }
  manager.append(tabs, ...Object.values(panes));
  const buildEmpty = element('div', 'management-empty', 'layout-build-empty');
  const buildEmptyTitle = element('h3');
  const buildEmptyDescription = element('p');
  buildEmpty.append(buildEmptyTitle, buildEmptyDescription);
  panes.build.append(buildEmpty);
  const utilities = element('div', 'command-tools');
  const logButton = button('layout-log-button', 'quiet-button');
  const reportButton = button('layout-report-button', 'quiet-button');
  reportButton.hidden = true;
  utilities.append(logButton, reportButton);

  function createDialog(id, source) {
    const dialog = element('dialog', 'layout-dialog', id);
    const header = element('div', 'dialog-heading');
    const title = element('h2', '', id + '-title');
    const close = button(id + '-close', 'icon-button');
    close.textContent = '×';
    header.append(title, close); dialog.append(header);
    dialog.setAttribute('aria-labelledby', title.id);
    let returnFocus = null;
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
      if (returnFocus?.isConnected && !game.hidden) returnFocus.focus({ preventScroll: true });
    });
    document.body.append(dialog);
    return {
      node: dialog,
      translate() { title.textContent = t(source); close.setAttribute('aria-label', t('닫기')); },
      open(origin) {
        if (dialog.open) return;
        returnFocus = origin || document.activeElement;
        document.dispatchEvent(new Event('clonehuman:pause'));
        dialog.showModal();
      }
    };
  }
  const logDialog = createDialog('layout-log-dialog', '전투 기록');
  const reportDialog = createDialog('layout-report-dialog', '전투 결과');
  const continueButton = button('layout-report-continue', 'primary-button full-width');
  continueButton.addEventListener('click', () => {
    reportDialog.node.close();
    $('primary-button').click();
  });
  logButton.addEventListener('click', () => logDialog.open(logButton));
  reportButton.addEventListener('click', () => reportDialog.open(reportButton));

  function translate() {
    tabs.setAttribute('aria-label', t('공장 관리'));
    for (const [key, source] of Object.entries(labels)) tabButtons[key].textContent = t(source);
    logButton.textContent = t('전투 기록');
    reportButton.textContent = t('전투 결과');
    continueButton.textContent = t(current?.phase === 'report' ? '다음 웨이브' : '다시 설계');
    buildEmptyTitle.textContent = t('설비 선택 완료');
    buildEmptyDescription.textContent = t('다음 웨이브에서 새 설비를 선택할 수 있습니다.');
    logDialog.translate(); reportDialog.translate();
  }
  function selectTab(key) {
    selectedTab = key;
    for (const name of Object.keys(labels)) {
      const selected = name === key;
      tabButtons[name].setAttribute('aria-selected', String(selected));
      tabButtons[name].tabIndex = selected ? 0 : -1;
      panes[name].hidden = !selected;
    }
  }
  function fitMap() {
    if (!desktop || game.hidden || !map.firstElementChild) return;
    const width = Math.floor(Math.min(map.clientWidth, map.clientHeight * 12 / 7));
    if (width > 0) map.style.setProperty('--map-fit-width', width + 'px');
  }
  function syncMode() {
    const next = media.matches && !game.hidden;
    reportButton.hidden = !current || !['report', 'won', 'lost'].includes(current.phase);
    if (game.hidden) reportShown = false;
    if (next === desktop) { fitMap(); return; }
    desktop = next;
    document.body.classList.toggle('desktop-game', desktop);
    if (desktop) {
      for (const [key, nodes] of Object.entries(sections)) panes[key].append(...nodes);
      sidebar.append(manager, battle);
      command.querySelector('.combat-controls').before(utilities);
      logDialog.node.append(log); log.open = true;
      reportDialog.node.append(report, continueButton);
      selectTab(selectedTab);
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else {
      logDialog.node.close(); reportDialog.node.close();
      for (const { node, anchor } of moved) anchor.after(node);
      manager.remove(); utilities.remove();
      log.open = false;
    }
    requestAnimationFrame(fitMap);
  }
  function presentReport() {
    if (!desktop || !current || !['report', 'won', 'lost'].includes(current.phase) || reportShown || document.querySelector('dialog[open]')) return;
    // Store before opening: the pause event may synchronously rerender the app.
    reportShown = true;
    reportDialog.open($('primary-button'));
  }
  function update(state) {
    current = state;
    if (!['report', 'won', 'lost'].includes(state.phase)) reportShown = false;
    syncMode();
    translate();
    buildEmpty.hidden = state.phase === 'prepare' && state.needsReward;
    if (desktop) {
      if (state.phase === 'prepare' && previous?.phase !== 'prepare') selectTab(state.routePending ? 'route' : state.needsReward ? 'build' : 'machine');
      else if (previous?.routePending && !state.routePending && state.needsReward) selectTab('build');
      else if (previous?.needsReward && !state.needsReward) selectTab('machine');
      else if (previous && previous.selectedSlot !== state.selectedSlot && selectedTab !== 'build') selectTab('machine');
      presentReport();
    }
    previous = { ...state };
  }
  new MutationObserver(syncMode).observe(game, { attributes: true, attributeFilter: ['hidden'] });
  new ResizeObserver(fitMap).observe(map);
  media.addEventListener('change', () => { syncMode(); translate(); presentReport(); });
  translate(); selectTab(selectedTab);
  root.CloneHumanLayout = { update, isDesktop: () => desktop };
})(window);
