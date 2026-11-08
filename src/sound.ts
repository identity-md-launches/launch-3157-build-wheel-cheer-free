export class CheerSound {
  private context: AudioContext | null = null;
  get ready(): boolean {
    return this.context?.state === "running";
  }
  async enable(): Promise<boolean> {
    try {
      this.context ??= new AudioContext();
      await this.context.resume();
      return this.ready;
    } catch {
      return false;
    }
  }
  play(): void {
    if (!this.context || this.context.state !== "running") return;
    const context = this.context;
    [659.25, 830.61, 987.77].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + index * 0.08;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.07, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.22);
    });
  }
}
