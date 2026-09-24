export class Audio {
  enabled = true;
  private context?: AudioContext;
  private master?: GainNode;
  private beat = -1;
  unlock() {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
  }
  toggle() { this.enabled = !this.enabled; this.unlock(); return this.enabled; }
  tone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.2, endFreq?: number, delay = 0) {
    if (!this.enabled || !this.context || !this.master) return;
    const c = this.context; const start = c.currentTime + delay;
    const osc = c.createOscillator(); const gain = c.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, start);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + duration);
    gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain); gain.connect(this.master); osc.start(start); osc.stop(start + duration + 0.02);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
  play(event: string, count = 0) {
    if (event === 'collect') this.tone([659, 784, 988, 1175, 1318][count % 5], 0.16, 'sine', 0.34);
    if (event === 'jump') this.tone(220, 0.2, 'triangle', 0.3, 560);
    if (event === 'slide') this.tone(320, 0.18, 'triangle', 0.22, 90);
    if (event === 'crash') { this.tone(120, 0.45, 'sawtooth', 0.32, 35); this.tone(60, 0.5, 'sine', 0.5); }
    if (event === 'smash') this.tone(180, 0.18, 'triangle', 0.4, 60);
    if (event === 'overclock') [440, 554, 659, 880].forEach((f, i) => this.tone(f, 0.45, 'triangle', 0.3, undefined, i * 0.08));
    if (event === 'start') [330, 440, 660].forEach((f, i) => this.tone(f, 0.2, 'sine', 0.3, undefined, i * 0.08));
  }
  update(time: number, running: boolean) {
    const beat = Math.floor(time * 2.8);
    if (!running) { this.beat = -1; return; }
    if (beat === this.beat) return;
    this.beat = beat;
    const notes = [110, 110, 164.81, 130.81, 110, 146.83, 164.81, 98];
    this.tone(notes[beat % notes.length], 0.18, 'triangle', 0.18);
    if (beat % 2 === 0) this.tone(110, 0.12, 'sine', 0.35, 32);
    if (beat % 4 === 2) this.tone(1760, 0.035, 'triangle', 0.05, 600);
  }
}
