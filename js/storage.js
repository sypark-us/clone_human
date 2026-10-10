(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CloneHumanStorage = factory();
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var KEY = 'clone-human:save';
  var VERSION = 1;
  // Bound parsing and stored data well below typical browser storage quotas.
  var MAX_RECORD_CHARS = 256 * 1024;
  var hasOwn = Object.prototype.hasOwnProperty;

  function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function sanitizeSettings(value) {
    var settings = { music: false, sfx: true, speed: 1, tutorialSeen: false };
    if (!isObject(value)) return settings;
    ['music', 'sfx', 'tutorialSeen'].forEach(function (key) {
      if (hasOwn.call(value, key) && typeof value[key] === 'boolean') settings[key] = value[key];
    });
    if (hasOwn.call(value, 'speed') && [0.5, 1, 2, 3].indexOf(value.speed) !== -1) {
      settings.speed = value.speed;
    }
    return settings;
  }

  function createStore(storage, validateRun) {
    function validRun(run) {
      try {
        return typeof validateRun === 'function' && validateRun(run) === true;
      } catch (_) {
        return false;
      }
    }

    function load() {
      var result = { run: null, settings: sanitizeSettings(null), error: null };
      var raw;
      try {
        raw = storage.getItem(KEY);
      } catch (_) {
        result.error = '저장소를 사용할 수 없습니다.';
        return result;
      }
      if (raw === null) return result;
      if (typeof raw !== 'string' || raw.length > MAX_RECORD_CHARS) {
        result.error = '저장 데이터의 크기 또는 형식이 올바르지 않습니다.';
        return result;
      }
      var record;
      try {
        record = JSON.parse(raw);
      } catch (_) {
        result.error = '저장 데이터를 읽을 수 없습니다.';
        return result;
      }
      if (!isObject(record) || !hasOwn.call(record, 'version') || !hasOwn.call(record, 'run')) {
        result.error = '저장 데이터 형식이 올바르지 않습니다.';
        return result;
      }
      if (record.version !== VERSION) {
        result.error = '지원하지 않는 저장 버전입니다.';
        return result;
      }
      result.settings = sanitizeSettings(record.settings);
      if (record.run !== null && !validRun(record.run)) {
        result.error = '저장된 게임이 올바르지 않습니다.';
        return result;
      }
      result.run = record.run;
      return result;
    }

    function save(run, settings) {
      if (run !== null && !validRun(run)) {
        return { ok: false, error: '게임 데이터가 올바르지 않아 저장하지 못했습니다.' };
      }
      var raw;
      try {
        raw = JSON.stringify({ version: VERSION, run: run, settings: sanitizeSettings(settings) });
        if (raw.length > MAX_RECORD_CHARS) {
          return { ok: false, error: '저장 데이터가 너무 큽니다.' };
        }
        // Validate the actual JSON snapshot, including any toJSON transformations.
        var snapshot = JSON.parse(raw);
        if (run !== null && !validRun(snapshot.run)) {
          return { ok: false, error: '직렬화된 게임 데이터가 올바르지 않습니다.' };
        }
      } catch (_) {
        return { ok: false, error: '게임 데이터를 저장 형식으로 변환할 수 없습니다.' };
      }
      try {
        storage.setItem(KEY, raw);
      } catch (_) {
        return { ok: false, error: '저장 공간이 부족하거나 저장소를 사용할 수 없습니다.' };
      }
      return { ok: true, error: null };
    }

    return {
      load: load,
      save: save,
      clearRun: function (settings) { return save(null, settings); }
    };
  }

  return { createStore: createStore };
}));
