(function (root) {
  'use strict';
  const t = (...args) => root.CloneHumanI18n.t(...args);
  const NS = 'http://www.w3.org/2000/svg';
  const COLORS = { mine: '#d7af68', clone: '#7ed9b2', soldier: '#9cc4dc', echo: '#b9a2e3', boost: '#edc873', bomb: '#e99576', recycle: '#92bb88', mutation: '#b4a0d3', onclone: '#75cbbb', onkill: '#dbbc71', autoclone: '#90bbd6', revive: '#8ed49d' };
  const symbols = {
    mine: '<path d="M18 21h28v8H18zM24 29h16v21H24z"/><path d="m28 50 4 7 4-7M19 17l8-8h10l8 8"/><path d="M19 36h7m12 0h7"/>',
    clone: '<rect x="18" y="9" width="28" height="47" rx="9"/><path d="M18 18h28M18 47h28M26 24c19 7-7 14 12 21M38 24c-19 7 7 14-12 21M27 28h10m-10 11h10"/>',
    soldier: '<path d="m32 9 19 8v16c0 11-12 20-19 24-7-4-19-13-19-24V17z"/><path d="M32 21v23m-9-15h18"/>',
    echo: '<path d="M20 10h24m-24 44h24M23 10v12l18 20v12M41 10v12L23 42v12M25 32h14"/>',
    boost: '<path d="m35 8-19 29h14l-1 20 20-31H35z"/>',
    bomb: '<circle cx="31" cy="38" r="17"/><path d="m38 22 4-8h10M26 31l10 14m-11 0 12-14M49 6l2 4m7 3-4 1"/>',
    recycle: '<path d="m22 20 9-12 11 18m-2-10 2 10-10-1M48 31l7 13-23 1m7 5-7-5 7-7M25 47H11l11-19m-9 3 9-3 3 9"/>',
    mutation: '<path d="M24 9h16M27 9v20L14 48q-3 8 6 8h24q9 0 6-8L37 29V9M21 41h22"/><circle cx="29" cy="46" r="2"/><circle cx="36" cy="38" r="2"/>',
    onclone: '<circle cx="22" cy="26" r="9"/><circle cx="43" cy="40" r="9"/><path d="M34 17h14v13m0-13-14 13M16 40v12h14m-14 0 13-12"/>',
    onkill: '<path d="m14 25 9-13h19l10 13-20 30zM14 25h38M23 12l9 43 10-43"/>',
    autoclone: '<path d="M11 53V24l14 8V20l15 9V11h10v42zM18 42h6m7 0h6m7 0h3"/>',
    revive: '<path d="M25 12h14v14h14v14H39v14H25V40H11V26h14z"/>'
  };
  function machine(id, decorative) {
    const color = COLORS[id] || '#7a8b8d';
    return '<svg viewBox="0 0 80 88" ' + (decorative === false ? '' : 'aria-hidden="true"') + ' class="machine-art" style="--machine-color:' + color + '">' +
      '<ellipse cx="40" cy="77" rx="33" ry="9" fill="#060c0d" opacity=".7"/>' +
      '<path d="m8 63 32-13 32 13v10L40 86 8 73z" fill="#182c2c" stroke="#3a5150"/>' +
      '<path d="M12 16 40 5l28 11v45L40 73 12 61z" fill="#253a3b" stroke="#526561"/>' +
      '<path d="m40 5 28 11-28 11-28-11z" fill="#465550"/><path d="M40 27v46l28-12V16z" fill="#1b2d30"/>' +
      '<rect x="15" y="18" width="48" height="47" rx="4" fill="#162628" stroke="' + color + '" stroke-width="1.5"/>' +
      '<g transform="translate(18 17) scale(.65)" fill="none" stroke="' + color + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' + (symbols[id] || '<path d="M32 17v30M17 32h30"/>') + '</g>' +
      '<rect x="20" y="67" width="11" height="3" rx="1" fill="' + color + '"/><circle cx="58" cy="69" r="2" fill="' + color + '"/></svg>';
  }
  function cloneArt() {
    return '<svg viewBox="0 0 38 58" aria-hidden="true"><path d="M10 19h18l4 23-7 4v11h-7V43h-2v14H9V43l-5-2z" fill="#639487"/><path d="M11 22h16v15H11z" fill="#a4c5ae"/><path d="M11 5h17v17H11z" fill="#cadaaf"/><path d="M9 10h21v9H9z" fill="#314b47"/><path d="M12 13h14" stroke="#b7ebbd" stroke-width="3"/><path d="m9 26-5 12M29 26l5 12" stroke="#83a994" stroke-width="6"/></svg>';
  }
  function enemyArt() {
    return '<svg viewBox="0 0 140 125" aria-hidden="true"><ellipse cx="70" cy="114" rx="53" ry="8" fill="#0a1112"/><path d="m36 63-17 10-9 35h13l13-19m68-26 17 10 9 35h-13l-13-19" fill="#684e48" stroke="#b98268" stroke-width="2"/><path d="m70 8 37 21 9 49-25 31H49L24 78l9-49z" fill="#3d3936" stroke="#927f64" stroke-width="2"/><path d="m38 31 32-17 32 17-8 24H46z" fill="#6c6250"/><path d="M39 63h62l-8 26H47z" fill="#1a2425"/><path d="M45 43h50l-8 14H53z" fill="#ed946c"/><path d="M51 72h38" stroke="#e7a17e" stroke-width="4"/><path d="M55 98v12m30-12v12M70 20v13" stroke="#a89070" stroke-width="4"/></svg>';
  }
  const summaries = {
    mine: '에너지 +4 / 턴', clone: '4 E → 복제인간 2명', soldier: '3 E → 복제인간 1명',
    mutation: '5 E → 공격력 +2', bomb: '복제인간 2명 → 피해 28', echo: '앞 생산 설비 2회 추가 실행',
    boost: '앞 생산 설비 1회 추가 실행', recycle: '공격 적중 → +2 E', onclone: '복제 → 추가 공격',
    onkill: '코어 격파 → +8 E', autoclone: '코어 격파 → 복제인간 +2', revive: '폭파 → 복제인간 1명 복귀'
  };
  function summary(id) { return t(summaries[id] || '빈 슬롯에 새 설비를 설치하세요.'); }
  class FactoryMap {
    constructor(container, engine, onSelect, onMove, onConnect) {
      this.container = container;
      this.engine = engine;
      this.onSelect = onSelect;
      this.onMove = onMove;
      this.onConnect = onConnect;
      this.zoom = 1;
      this.moving = false;
      this.draggedSlot = null;
      container.innerHTML = '<div class="map-world"><div class="map-terrain"></div><div class="zone-wash zone-a"></div><div class="zone-wash zone-b"></div><div class="zone-wash zone-c"></div><div class="map-grid"></div><svg class="map-belts" viewBox="0 0 960 560" aria-hidden="true"></svg><svg class="map-synergies" viewBox="0 0 960 560" aria-hidden="true"></svg><div class="map-tiles" role="grid" aria-label="공장 지도. 방향키로 탐색하고 Enter로 선택합니다."></div><div class="map-zone-labels" aria-hidden="true"></div></div>';
      this.world = container.querySelector('.map-world');
      this.belts = container.querySelector('.map-belts');
      this.synergies = container.querySelector('.map-synergies');
      this.tiles = container.querySelector('.map-tiles');
      for (let y = 0; y < 7; y++) {
        const row = document.createElement('div');
        row.className = 'map-row'; row.setAttribute('role', 'row');
        for (let x = 0; x < 12; x++) {
          const cell = document.createElement('div'); cell.setAttribute('role', 'gridcell');
          const tile = document.createElement('button');
          tile.type = 'button'; tile.className = 'map-tile'; tile.dataset.x = x; tile.dataset.y = y;
          tile.tabIndex = x === 0 && y === 0 ? 0 : -1;
          tile.addEventListener('click', event => { this.interact(x, y); if (event.pointerType === 'touch') this.showTooltip(tile); });
          tile.addEventListener('keydown', event => this.key(event, x, y));
          tile.addEventListener('dragstart', event => this.startDrag(event, x, y));
          tile.addEventListener('dragover', event => {
            if (this.dragTarget(x, y) < 0) return;
            event.preventDefault(); event.dataTransfer.dropEffect = 'move';
            tile.classList.add('drop-target');
          });
          tile.addEventListener('dragleave', event => {
            if (!tile.contains(event.relatedTarget)) tile.classList.remove('drop-target');
          });
          tile.addEventListener('drop', event => {
            const source = this.draggedSlot, target = this.dragTarget(x, y);
            if (target < 0) return;
            event.preventDefault(); this.clearDrag(); this.onMove(source, x, y);
          });
          tile.addEventListener('dragend', () => this.clearDrag());
          cell.append(tile); row.append(cell);
        }
        this.tiles.append(row);
      }
      this.buttons = [...this.tiles.querySelectorAll('button')];
      this.tooltip = document.createElement('div');
      this.tooltip.id = 'machine-tooltip'; this.tooltip.className = 'machine-tooltip';
      this.tooltip.setAttribute('role', 'tooltip'); this.tooltip.hidden = true;
      document.body.append(this.tooltip);
      this.bindTooltips(this.tiles);
      this.tooltip.addEventListener('pointerenter', () => clearTimeout(this.tooltipTimer));
      this.tooltip.addEventListener('pointerleave', () => this.hideTooltip());
      document.addEventListener('pointerdown', event => {
        if (!this.tooltipButton?.contains(event.target) && !this.tooltip.contains(event.target)) this.hideTooltip();
      });
      document.addEventListener('keydown', event => { if (event.key === 'Escape') this.hideTooltip(); });
      window.addEventListener('scroll', () => this.positionTooltip(), true);
      window.addEventListener('resize', () => this.hideTooltip());
    }
    bindTooltips(host) {
      const buttonFor = event => {
        const button = event.target.closest('button');
        return button && host.contains(button) ? button : null;
      };
      host.addEventListener('pointerover', event => {
        const button = buttonFor(event);
        if (!button || button.contains(event.relatedTarget) || event.pointerType === 'touch') return;
        clearTimeout(this.tooltipTimer);
        this.tooltipTimer = setTimeout(() => this.showTooltip(button), 200);
      });
      host.addEventListener('pointerout', event => {
        const button = buttonFor(event);
        if (!button || button.contains(event.relatedTarget) || document.activeElement === button) return;
        clearTimeout(this.tooltipTimer);
        this.tooltipTimer = setTimeout(() => this.hideTooltip(), 120);
      });
      host.addEventListener('focusin', event => { const button = buttonFor(event); if (button) this.showTooltip(button); });
      host.addEventListener('focusout', event => {
        const button = buttonFor(event);
        if (button && button === this.tooltipButton && !button.matches(':hover') && !this.tooltip.matches(':hover')) this.hideTooltip();
      });
    }
    hideTooltip() {
      clearTimeout(this.tooltipTimer);
      this.tooltipButton?.removeAttribute('aria-describedby');
      this.tooltipButton = null; this.tooltip.hidden = true;
    }
    showTooltip(button) {
      const slot = button?.dataset.slot !== undefined ? Number(button.dataset.slot) : this.state?.positions.findIndex(p => p.x === Number(button?.dataset.x) && p.y === Number(button?.dataset.y));
      const id = this.state?.slots[slot];
      this.hideTooltip();
      if (!id || this.draggedSlot !== null || !button.isConnected || !button.getClientRects().length || document.querySelector('dialog[open]')) return;
      const title = document.createElement('strong'), effect = document.createElement('span'), bonuses = document.createElement('small');
      title.textContent = t(this.engine.MODULES[id].name);
      effect.textContent = t('기본: {effect}', { effect: summary(id) });
      const lane = this.engine.SECTORS.find(s => s.id === this.state.sectorId).lanes[Math.floor(this.state.positions[slot].x / 4)];
      const applies = { mine: ['mine'], clone: ['clone', 'attack', 'defense'], soldier: ['attack', 'defense'], mutation: ['mutation'], bomb: ['bomb', 'attack'], recycle: ['recycle'], onclone: ['attack'], revive: ['defense'] };
      const bonus = this.engine.getSynergyBonus(this.state, slot);
      const lines = [];
      if (applies[id]?.includes(lane.kind)) lines.push(t(lane.name));
      if (bonus.costReduction) lines.push(t('비용 -1 E'));
      if (bonus.clones) lines.push(t('복제인간 +1'));
      if (bonus.damageMultiplier > 1) lines.push(t('폭파 피해 +20%'));
      bonuses.textContent = lines.join(' · '); bonuses.hidden = !lines.length;
      this.tooltip.replaceChildren(title, effect, bonuses);
      this.tooltipButton = button; button.setAttribute('aria-describedby', this.tooltip.id);
      this.tooltip.hidden = false; this.positionTooltip();
    }
    refreshTooltip(host) {
      if (!this.tooltipButton) return;
      let button = this.tooltipButton;
      // The rack is rebuilt on renders; map tile buttons remain stable.
      if (!button.isConnected && button.dataset.slot !== undefined) button = host?.querySelector('[data-slot="' + button.dataset.slot + '"]');
      this.showTooltip(button);
    }
    positionTooltip() {
      if (this.tooltip.hidden || !this.tooltipButton?.isConnected) return;
      const anchor = this.tooltipButton.getBoundingClientRect(), tip = this.tooltip.getBoundingClientRect();
      const clip = this.container.contains(this.tooltipButton) ? this.container.getBoundingClientRect() : { left: 0, right: innerWidth, top: 0, bottom: innerHeight };
      if (anchor.bottom <= Math.max(0, clip.top) || anchor.top >= Math.min(innerHeight, clip.bottom) || anchor.right <= Math.max(0, clip.left) || anchor.left >= Math.min(innerWidth, clip.right)) { this.hideTooltip(); return; }
      const left = Math.max(8, Math.min(innerWidth - tip.width - 8, anchor.left + (anchor.width - tip.width) / 2));
      const below = anchor.bottom + 7;
      this.tooltip.style.left = left + 'px';
      this.tooltip.style.top = (below + tip.height <= innerHeight - 8 ? Math.max(8, below) : Math.max(8, anchor.top - tip.height - 7)) + 'px';
    }
    canDrag() {
      return this.state?.phase === 'prepare' && !this.moving && !this.connecting;
    }
    dragTarget(x, y) {
      if (this.draggedSlot === null || !this.canDrag()) return -1;
      const target = this.state.positions.findIndex(position => position.x === x && position.y === y);
      return target !== this.draggedSlot && this.state.slots[target] ? target : -1;
    }
    startDrag(event, x, y) {
      const source = this.state?.positions.findIndex(position => position.x === x && position.y === y);
      if (!this.canDrag() || !this.state.slots[source]) { event.preventDefault(); return; }
      this.hideTooltip();
      this.draggedSlot = source;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('application/x-clone-human-slot', String(source));
      this.world.classList.add('drag-mode');
      this.buttons.forEach(button => {
        const bx = Number(button.dataset.x), by = Number(button.dataset.y);
        button.classList.toggle('drag-source', bx === x && by === y);
        button.classList.toggle('swap-target', this.dragTarget(bx, by) >= 0);
      });
    }
    clearDrag() {
      this.draggedSlot = null;
      this.world.classList.remove('drag-mode');
      this.buttons.forEach(button => button.classList.remove('drag-source', 'swap-target', 'drop-target'));
    }
    interact(x, y) {
      if (!this.state || this.state.phase !== 'prepare') return;
      const index = this.state.positions.findIndex(pos => pos.x === x && pos.y === y);
      if (this.connecting) {
        if (index !== -1 && this.engine.canConnectSlots(this.state, this.state.selectedSlot, index)) this.onConnect?.(this.state.selectedSlot, index);
        return;
      }
      if (this.moving) this.onMove(this.state.selectedSlot, x, y);
      else if (index !== -1) this.onSelect(index);
      else this.onSelect(-1, { x, y });
    }
    key(event, x, y) {
      const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      const delta = directions[event.key];
      if (!delta) return;
      event.preventDefault();
      const nx = Math.min(11, Math.max(0, x + delta[0]));
      const ny = Math.min(6, Math.max(0, y + delta[1]));
      this.buttons.forEach(button => { button.tabIndex = -1; });
      const next = this.buttons[ny * 12 + nx]; next.tabIndex = 0; next.focus();
    }
    setZoom(value) {
      this.zoom = Math.max(1, Math.min(1.8, value));
      this.world.style.width = (this.zoom * 100) + '%';
      this.world.style.setProperty('--map-zoom', this.zoom);
      this.positionTooltip();
    }
    render(state, moving, paused, connecting = false) {
      this.clearDrag();
      this.state = state; this.moving = moving; this.connecting = connecting;
      this.tiles.setAttribute('aria-label', t('공장 지도. 방향키로 탐색하고 Enter로 선택합니다.'));
      const sector = this.engine.SECTORS.find(item => item.id === state.sectorId);
      this.world.classList.toggle('running', state.phase === 'battle' && !paused);
      this.world.classList.toggle('move-mode', moving);
      this.world.classList.toggle('connect-mode', connecting);
      this.world.dataset.sector = state.sectorId;
      const synergies = this.engine.getSynergies?.(state) || [];
      const neighbors = new Set(synergies.filter(link => link.via === 'adjacent' && (link.from === state.selectedSlot || link.to === state.selectedSlot)).map(link => link.from === state.selectedSlot ? link.to : link.from));
      const active = new Set((state.lastTurn || []).map(event => event.slot));
      this.buttons.forEach((button, index) => {
        const x = index % 12, y = Math.floor(index / 12);
        const slot = state.positions.findIndex(pos => pos.x === x && pos.y === y);
        const kind = slot === -1 ? null : state.slots[slot];
        const module = this.engine.MODULES[kind];
        const zone = sector?.lanes[Math.floor(x / 4)];
        const connectTarget = connecting && slot !== -1 && this.engine.canConnectSlots(state, state.selectedSlot, slot);
        button.className = 'map-tile' + (slot !== -1 ? ' occupied' : '') + (slot === state.selectedSlot ? ' selected' : '') + (neighbors.has(slot) ? ' synergy-neighbor' : '') + (connectTarget ? ' connect-target' : '') + (state.phase === 'battle' && active.has(slot) && !paused ? ' working' : '');
        button.setAttribute('aria-label', (slot !== -1 ? t('슬롯 {slot}', { slot: slot + 1 }) + ' · ' + t(module?.name || '빈 설비') : t('빈 땅')) + ' · ' + (x + 1) + ',' + (y + 1) + ' · ' + t(zone?.name || '') + (connectTarget ? ' · ' + t('연결 가능') : neighbors.has(slot) ? ' · ' + t('인접 효과') : ''));
        if (connecting) button.setAttribute('aria-disabled', String(!connectTarget));
        else button.removeAttribute('aria-disabled');
        button.draggable = !!kind && this.canDrag();
        button.setAttribute('aria-pressed', String(slot !== -1 && slot === state.selectedSlot));
        if (slot !== -1) {
          button.innerHTML = '<span class="machine-number">' + (slot + 1) + '</span>' + (kind ? machine(kind) : '<span class="empty-pad"><span>+</span></span>') + '<span class="machine-label">' + t(module?.name || '빈 설비') + '</span>';
        } else {
          const ore = ((x * 13 + y * 19) % 17 === 0 || (x < 3 && y === 5));
          button.innerHTML = ore ? '<span class="ore ore-' + Math.floor(x / 4) + '" aria-hidden="true"><i></i><i></i><i></i></span>' : '';
        }
      });
      this.belts.replaceChildren();
      state.positions.slice(0, -1).forEach((pos, i) => {
        const next = state.positions[i + 1];
        const sx = pos.x * 80 + 40, sy = pos.y * 80 + 44;
        const ex = next.x * 80 + 40, ey = next.y * 80 + 44;
        const d = 'M' + sx + ' ' + sy + ' H' + ex + ' V' + ey;
        for (const cls of ['belt-edge', 'belt-base', 'belt-flow']) {
          const path = document.createElementNS(NS, 'path');
          path.setAttribute('d', d); path.setAttribute('class', cls); this.belts.append(path);
        }
      });
      this.renderSynergies(state, synergies);
      const labels = this.container.querySelector('.map-zone-labels');
      labels.replaceChildren();
      (sector?.lanes || []).forEach((lane, i) => {
        const label = document.createElement('span');
        label.textContent = ['A', 'B', 'C'][i] + ' / ' + t(lane.name);
        labels.append(label);
      });
      this.refreshTooltip();
    }
    renderSynergies(state, links) {
      this.synergies.replaceChildren();
      const colors = { energy: '#f2cb79', clone: '#83e5b4', attack: '#f28c70' };
      const names = { energy: '에너지 연결', clone: '복제 연결', attack: '공격 연결' };
      const defs = document.createElementNS(NS, 'defs');
      for (const [kind, color] of Object.entries(colors)) {
        const marker = document.createElementNS(NS, 'marker');
        marker.id = 'synergy-arrow-' + kind;
        for (const [key, value] of Object.entries({ viewBox: '0 0 10 10', refX: '8', refY: '5', markerWidth: '4', markerHeight: '4', orient: 'auto-start-reverse' })) marker.setAttribute(key, value);
        const arrow = document.createElementNS(NS, 'path');
        arrow.setAttribute('d', 'M0 0 10 5 0 10z'); arrow.setAttribute('fill', color);
        marker.append(arrow); defs.append(marker);
      }
      this.synergies.append(defs);
      for (const link of links) {
        const from = state.positions[link.from], to = state.positions[link.to];
        const dx = to.x - from.x, dy = to.y - from.y;
        const length = Math.hypot(dx, dy) || 1;
        const sx = from.x * 80 + 40 + dx / length * 23;
        const sy = from.y * 80 + 44 + dy / length * 23;
        const ex = to.x * 80 + 40 - dx / length * 27;
        const ey = to.y * 80 + 44 - dy / length * 27;
        const d = link.via === 'connector' ? `M${sx} ${sy} Q${(sx + ex) / 2} ${Math.max(16, Math.min(sy, ey) - 64)} ${ex} ${ey}` : `M${sx} ${sy} L${ex} ${ey}`;
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('d', d);
        path.setAttribute('class', 'synergy-link synergy-' + link.kind + (link.via === 'connector' ? ' manual-connector' : ' adjacent-link'));
        path.setAttribute('stroke', colors[link.kind]);
        path.setAttribute('marker-end', 'url(#synergy-arrow-' + link.kind + ')');
        path.dataset.from = link.from; path.dataset.to = link.to; path.dataset.via = link.via;
        const title = document.createElementNS(NS, 'title');
        title.textContent = t(names[link.kind]) + ' · ' + t(link.via === 'connector' ? '직접 연결' : '인접 효과');
        path.append(title); this.synergies.append(path);
      }
    }
  }
  root.CloneHumanMap = { FactoryMap, machine, summary, cloneArt, enemyArt, COLORS };
})(typeof window !== 'undefined' ? window : globalThis);
