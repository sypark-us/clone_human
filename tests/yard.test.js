'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const I18n = require('../js/i18n.js');
const E = require('../js/engine.js');

test('the factory yard label and every upgrade prop name have English copy', () => {
  I18n.setLanguage('en');
  try {
    for (const source of ['공장 마당', ...E.UPGRADES.map(upgrade => upgrade.name)]) {
      const text = I18n.t(source);
      assert.notEqual(text, source, source);
      assert.doesNotMatch(text, /[가-힣]/, source);
    }
  } finally { I18n.setLanguage('ko'); }
});
