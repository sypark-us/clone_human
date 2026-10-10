(function (root) {
  'use strict';
  const t = (...args) => root.CloneHumanI18n.t(...args);
  class MachineUpgrades {
    constructor(engine, getState, summary, purchase, hideTooltip) {
      this.engine = engine; this.getState = getState; this.summary = summary;
      this.purchase = purchase; this.hideTooltip = hideTooltip;
      this.panelButton = document.getElementById('machine-upgrade-button');
      this.popup = document.createElement('div');
      this.popup.id = 'machine-upgrade-menu'; this.popup.className = 'machine-upgrade-menu'; this.popup.hidden = true;
      this.popup.setAttribute('role', 'dialog'); this.popup.setAttribute('aria-labelledby', 'machine-upgrade-title');
      this.popup.innerHTML = '<div class="upgrade-menu-heading"><strong id="machine-upgrade-title"></strong><button type="button" class="icon-button upgrade-menu-close">×</button></div><div class="upgrade-menu-level"></div><p class="upgrade-menu-current"></p><p class="upgrade-menu-next"></p><small class="upgrade-menu-reason"></small><button type="button" class="primary-button full-width" data-machine-purchase></button>';
      document.body.append(this.popup);
      this.closeButton = this.popup.querySelector('.upgrade-menu-close');
      this.buyButton = this.popup.querySelector('[data-machine-purchase]');
      this.closeButton.addEventListener('click', () => this.close(true));
      this.buyButton.addEventListener('click', () => {
        const slot = this.slot;
        if (!this.engine.getMachineUpgrade(this.getState(), slot).canUpgrade) return;
        this.close(true); this.purchase(slot);
      });
      this.panelButton.addEventListener('click', () => this.open(this.getState()?.selectedSlot, this.panelButton));
      document.addEventListener('contextmenu', event => {
        const anchor = event.target.closest('.map-tile, .rack-slot');
        const slot = this.slotFor(anchor);
        if (!this.getState()?.slots[slot]) return;
        event.preventDefault(); this.open(slot, anchor);
      });
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !this.popup.hidden) { event.preventDefault(); this.close(true); return; }
        if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
          const anchor = event.target.closest('.map-tile, .rack-slot'), slot = this.slotFor(anchor);
          if (this.getState()?.slots[slot]) { event.preventDefault(); this.open(slot, anchor); }
        }
      });
      document.addEventListener('pointerdown', event => { if (!this.popup.contains(event.target)) this.close(); });
      document.addEventListener('focusin', event => { if (!this.popup.hidden && !this.popup.contains(event.target)) this.close(); });
      document.addEventListener('dragstart', () => this.close(), true);
      window.addEventListener('scroll', () => {
        if (this.popup.hidden) return;
        const rect = this.anchor.getBoundingClientRect();
        // A click can queue its scroll-into-view event before opening the preview.
        // Dismiss only when the source actually moves after the preview opens.
        if (rect.left !== this.anchorRect.left || rect.top !== this.anchorRect.top) this.close();
      }, true);
      window.addEventListener('resize', () => this.close());
    }
    slotFor(anchor) {
      const state = this.getState();
      if (!anchor || !state) return -1;
      return anchor.dataset.slot !== undefined ? Number(anchor.dataset.slot) : state.positions.findIndex(p => p.x === Number(anchor.dataset.x) && p.y === Number(anchor.dataset.y));
    }
    close(restoreFocus = false) {
      if (this.popup.hidden) return;
      const anchor = this.anchor;
      this.popup.hidden = true; this.anchor = null; this.slot = null;
      if (restoreFocus && anchor?.isConnected) anchor.focus({ preventScroll: true });
      this.hideTooltip();
    }
    update() {
      this.close();
      const state = this.getState(), upgrade = this.engine.getMachineUpgrade(state, state?.selectedSlot);
      this.panelButton.disabled = !upgrade.level;
      this.panelButton.textContent = t('설비 강화') + (upgrade.cost ? ' · ' + upgrade.cost + ' E' : '');
    }
    open(slot, anchor) {
      const state = this.getState(), id = state?.slots[slot];
      if (!id || !anchor?.isConnected || !anchor.getClientRects().length || document.querySelector('dialog[open]')) return;
      const upgrade = this.engine.getMachineUpgrade(state, slot);
      this.close(); this.hideTooltip(); this.slot = slot; this.anchor = anchor;
      this.popup.querySelector('#machine-upgrade-title').textContent = t(this.engine.MODULES[id].name);
      this.closeButton.setAttribute('aria-label', t('닫기'));
      this.popup.querySelector('.upgrade-menu-level').textContent = upgrade.nextLevel ? 'Lv.' + upgrade.level + ' → Lv.' + upgrade.nextLevel : 'Lv.' + upgrade.level;
      this.popup.querySelector('.upgrade-menu-current').textContent = t('현재: {effect}', { effect: this.summary(id, upgrade.level) });
      const next = this.popup.querySelector('.upgrade-menu-next');
      next.textContent = upgrade.nextLevel ? t('강화 후: {effect}', { effect: this.summary(id, upgrade.nextLevel) }) : '';
      next.hidden = !upgrade.nextLevel;
      const reason = !upgrade.nextLevel ? '최대 단계' : state.phase !== 'prepare' ? '웨이브 사이에 강화할 수 있습니다.' : !upgrade.canUpgrade ? '에너지가 부족합니다.' : '지형과 연결 보너스는 유지됩니다.';
      this.popup.querySelector('.upgrade-menu-reason').textContent = t(reason);
      this.buyButton.textContent = t(upgrade.nextLevel ? '강화 · {cost} E' : '최대 단계', { cost: upgrade.cost });
      this.buyButton.disabled = !upgrade.canUpgrade;
      this.popup.hidden = false;
      const rect = anchor.getBoundingClientRect(), box = this.popup.getBoundingClientRect();
      this.anchorRect = rect;
      this.popup.style.left = Math.max(8, Math.min(innerWidth - box.width - 8, rect.left)) + 'px';
      const top = rect.bottom + box.height + 7 <= innerHeight - 8 ? rect.bottom + 7 : rect.top - box.height - 7;
      this.popup.style.top = Math.max(8, Math.min(innerHeight - box.height - 8, top)) + 'px';
      (upgrade.canUpgrade ? this.buyButton : this.closeButton).focus({ preventScroll: true });
    }
  }
  root.CloneHumanMachineUpgrades = MachineUpgrades;
})(typeof window !== 'undefined' ? window : globalThis);
