const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function audioHarness() {
  const gains = [], oscillators = [];
  class AudioContext {
    constructor() { this.state = 'running'; this.currentTime = 1; this.destination = {}; }
    createGain() {
      const node = { gain: { value: 1, setValueAtTime(value) { this.value = value; }, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect(destination) { this.destination = destination; }, disconnect() {} };
      gains.push(node); return node;
    }
    createOscillator() {
      const node = { frequency: {}, connect(destination) { this.destination = destination; }, start() {}, stop() {}, disconnect() {} };
      oscillators.push(node); return node;
    }
    async resume() { this.state = 'running'; }
    async suspend() { this.state = 'suspended'; }
  }
  const window = { AudioContext };
  vm.runInNewContext(fs.readFileSync(require.resolve('../js/audio.js'), 'utf8'), { window, setInterval: () => 1, clearInterval() {} });
  return { audio: new window.CloneHumanAudio(), gains, oscillators };
}

test('music mute silences already scheduled music without muting effects', async () => {
  const { audio, oscillators } = audioHarness();
  audio.configure({ music: true, sfx: true });
  await audio.unlock(); audio.note();
  const musicEnvelope = oscillators[0].destination;
  const musicBus = musicEnvelope.destination;
  audio.configure({ music: false, sfx: true });
  assert.equal(musicBus.gain?.value, 0);
  audio.play('place');
  const effectBus = oscillators.at(-1).destination.destination;
  assert.notEqual(effectBus, musicBus);
  assert.equal(effectBus.gain.value, 1);
});

test('effects mute silences scheduled effects while music remains enabled', async () => {
  const { audio, oscillators } = audioHarness();
  audio.configure({ music: true, sfx: true }); await audio.unlock();
  audio.play('win');
  const effectBus = oscillators[0].destination.destination;
  audio.configure({ music: true, sfx: false });
  assert.equal(effectBus.gain?.value, 0);
  audio.note();
  assert.equal(oscillators.at(-1).destination.destination.gain.value, 1);
});

test('audio stays dormant before interaction and suspends while hidden', async () => {
  const { audio, oscillators } = audioHarness();
  audio.configure({ music: true, sfx: true }); audio.play('place');
  assert.equal(audio.context, null); assert.equal(oscillators.length, 0);
  await audio.unlock(); await audio.setHidden(true);
  assert.equal(audio.context.state, 'suspended');
  assert.equal(audio.interval, null);
  await audio.setHidden(false);
  assert.equal(audio.context.state, 'running');
});
