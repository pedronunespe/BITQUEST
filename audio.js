// ==========================================
// SISTEMA DE EFEITOS SONOROS EM WEB AUDIO API
// Funciona 100% offline sem necessidade de arquivos externos de áudio
// ==========================================

class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.initialized = false;
  }

  init() {
    if (!this.initialized) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
        this.initialized = true;
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playTone(freq, type, duration, startTime = 0, gainLevel = 0.15) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type; // 'sine', 'square', 'sawtooth', 'triangle'
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);

      gain.gain.setValueAtTime(gainLevel, this.ctx.currentTime + startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + startTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime + startTime);
      osc.stop(this.ctx.currentTime + startTime + duration);
    } catch (e) {
      console.warn("Erro ao emitir som:", e);
    }
  }

  playAttack() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    // Som de golpe com corte rápido
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.18);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.18);
    } catch (e) {}
  }

  playMagic() {
    if (this.muted) return;
    this.init();
    // Arpeggio brilhante
    this.playTone(440, "sine", 0.15, 0.0, 0.12);
    this.playTone(660, "triangle", 0.18, 0.08, 0.15);
    this.playTone(880, "sine", 0.22, 0.16, 0.18);
    this.playTone(1320, "triangle", 0.28, 0.24, 0.12);
  }

  playCorrect() {
    if (this.muted) return;
    this.init();
    // Som clássico de acerto alegre
    this.playTone(523.25, "sine", 0.12, 0.0, 0.15); // C5
    this.playTone(659.25, "sine", 0.12, 0.09, 0.16); // E5
    this.playTone(783.99, "sine", 0.15, 0.18, 0.18); // G5
    this.playTone(1046.50, "triangle", 0.35, 0.27, 0.2); // C6
  }

  playWrong() {
    if (this.muted) return;
    this.init();
    // Som grave de erro suave
    this.playTone(220, "sawtooth", 0.18, 0.0, 0.15);
    this.playTone(180, "sawtooth", 0.28, 0.14, 0.18);
  }

  playDefend() {
    if (this.muted) return;
    this.init();
    // Som metálico de escudo
    this.playTone(180, "triangle", 0.08, 0.0, 0.2);
    this.playTone(400, "square", 0.15, 0.04, 0.1);
    this.playTone(300, "sine", 0.22, 0.1, 0.12);
  }

  playItemUse() {
    if (this.muted) return;
    this.init();
    // Som de poção / borbulho
    this.playTone(350, "sine", 0.1, 0.0, 0.12);
    this.playTone(520, "sine", 0.1, 0.08, 0.14);
    this.playTone(700, "sine", 0.18, 0.16, 0.16);
  }

  playLevelUp() {
    if (this.muted) return;
    this.init();
    // Fanfarra triunfante
    const notes = [440, 554.37, 659.25, 880, 1108.73];
    notes.forEach((freq, idx) => {
      this.playTone(freq, "triangle", 0.2, idx * 0.09, 0.18);
    });
    this.playTone(1318.51, "sine", 0.5, 0.48, 0.22);
  }

  playVictory() {
    if (this.muted) return;
    this.init();
    const melody = [523, 659, 783, 1046, 783, 1046];
    melody.forEach((f, i) => {
      this.playTone(f, "triangle", 0.22, i * 0.12, 0.16);
    });
  }

  playDefeat() {
    if (this.muted) return;
    this.init();
    const sadTones = [400, 370, 340, 290];
    sadTones.forEach((f, i) => {
      this.playTone(f, "sawtooth", 0.25, i * 0.15, 0.14);
    });
  }

  playClick() {
    if (this.muted) return;
    this.init();
    this.playTone(600, "sine", 0.04, 0.0, 0.08);
  }
}

// Instância global de áudio
const soundFX = new SoundManager();
