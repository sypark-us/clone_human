'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const E = require('../js/engine');
const I18n = require('../js/i18n');

// map.js is a browser script; run it against the real engine and translator with a stub matchMedia.
function loadMap() {
  const sandbox = { CloneHumanEngine: E, CloneHumanI18n: I18n, matchMedia: () => ({ matches: false, addEventListener() {} }) };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/map.js'), 'utf8'), sandbox);
  return sandbox.CloneHumanMap;
}
const numbers = text => new Set(text.match(/\d+(?:\.\d+)?/g));

test('every machine summary shows exactly the engine stats at each level, in both languages', () => {
  const map = loadMap();
  try {
    for (const language of ['ko', 'en']) {
      I18n.setLanguage(language);
      for (const id of Object.keys(E.MODULES)) for (const level of [1, 2, 3]) {
        const text = map.summary(id, level);
        const expected = new Set(Object.values(E.getModuleStats(id, level)).map(String));
        assert.deepEqual(numbers(text), expected, language + ' ' + id + ' Lv.' + level + ': ' + text);
      }
    }
  } finally { I18n.setLanguage('ko'); }
});

test('summaries match the current rules for cost, bomb and half-HP triggers', () => {
  const map = loadMap();
  try {
    I18n.setLanguage('ko');
    assert.equal(map.summary('soldier', 1), '2 E → 복제인간 2명');
    assert.equal(map.summary('clone', 2), '4 E → 복제인간 3명');
    assert.equal(map.summary('mutation', 1), '5 E → 공격력 +1');
    assert.equal(map.summary('bomb', 2), '복제인간 1명 → 피해 22 + 공격력 × 2');
    assert.match(map.summary('onkill', 1), /절반/);
    assert.match(map.summary('autoclone', 1), /절반/);
    I18n.setLanguage('en');
    assert.equal(map.summary('soldier', 1), '2 E → 2 clones');
    assert.equal(map.summary('bomb', 2), '1 clone → 22 + attack × 2 damage');
    assert.match(map.summary('onkill', 1), /half HP/);
    assert.match(map.summary('autoclone', 1), /half HP/);
  } finally { I18n.setLanguage('ko'); }
});
