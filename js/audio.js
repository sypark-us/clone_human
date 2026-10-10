(function (root) {
  'use strict';
  // Original 16-step ambient score. All tones are synthesized locally.
  class FactoryAudio {
    constructor() {
      this.context = null; this.music = false; this.sfx = true;
      this.hidden = false; this.interval = null; this.step = 0; this.unlocked = false;
    }
    async unlock() {
      try {
        const Context = root.AudioContext || root.webkitAudioContext;
        if (!Context) return false;
        if (!this.context) {
          this.context = new Context();
          this.musicBus = this.context.createGain();
          this.effectsBus = this.context.createGain();
          this.musicBus.connect(this.context.destination);
          this.effectsBus.connect(this.context.destination);
          this.configure({ music: this.music, sfx: this.sfx });
        }
        if (this.context.state === 'suspended' && !this.hidden) await this.context.resume();
        this.unlocked = true; this.schedule(); return true;
      } catch (_) { return false; }
    }
    configure(settings) {
      this.music = settings.music; this.sfx = settings.sfx;
      if (this.context) {
        this.musicBus.gain.setValueAtTime(this.music ? 1 : 0, this.context.currentTime);
        this.effectsBus.gain.setValueAtTime(this.sfx ? 1 : 0, this.context.currentTime);
      }
      this.schedule();
    }
    tone(frequency, duration, volume, type = 'sine', offset = 0, channel = 'effects') {
      if (!this.context || this.context.state !== 'running' || this.hidden) return;
      const time = this.context.currentTime + offset;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(volume, time + .025);
      gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
      oscillator.connect(gain); gain.connect(channel === 'music' ? this.musicBus : this.effectsBus);
      oscillator.start(time); oscillator.stop(time + duration + .02);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    }
    schedule() {
      if (this.interval) { clearInterval(this.interval); this.interval = null; }
      if (!this.music || !this.unlocked || this.hidden) return;
      this.interval = setInterval(() => this.note(), 380);
    }
    note() {
      const progression = [110, 87.307, 130.813, 97.999];
      const rootNote = progression[Math.floor(this.step / 16) % progression.length];
      const melody = [0, 7, 12, 7, 3, 7, 15, 12, 0, 7, 10, 7, 3, 12, 7, 3];
      this.tone(rootNote * Math.pow(2, melody[this.step % 16] / 12) * 2, 1.4, .026, 'sine', 0, 'music');
      if (this.step % 4 === 0) this.tone(rootNote / 2, 1.5, .044, 'triangle', 0, 'music');
      if (this.step % 8 === 0) {
        this.tone(rootNote, 2.8, .018, 'sine', 0, 'music');
        this.tone(rootNote * 1.4983, 2.8, .014, 'sine', 0, 'music');
      }
      this.step = (this.step + 1) % 64;
    }
    play(kind) {
      if (!this.sfx || !this.unlocked) return;
      if (kind === 'win') [261.626, 329.628, 391.995, 523.251].forEach((hz, i) => this.tone(hz, .45, .045, 'sine', i * .1));
      else if (kind === 'lose') [220, 174.614, 130.813].forEach((hz, i) => this.tone(hz, .6, .04, 'triangle', i * .18));
      else if (kind === 'turn') { this.tone(110, .12, .035, 'triangle'); this.tone(440, .08, .012, 'sine', .04); }
      else if (kind === 'place') { this.tone(440, .15, .035); this.tone(660, .2, .025, 'sine', .06); }
      else this.tone(330, .09, .025);
    }
    async setHidden(hidden) {
      this.hidden = hidden; this.schedule();
      try {
        if (this.context && hidden) await this.context.suspend();
        else if (this.context && this.unlocked) await this.context.resume();
      } catch (_) { /* Audio stays optional if the browser refuses playback. */ }
    }
  }
  root.CloneHumanAudio = FactoryAudio;
})(typeof window !== 'undefined' ? window : globalThis);
