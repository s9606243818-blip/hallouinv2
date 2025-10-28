/**
 * Звуковой менеджер - ГЕНЕРАЦИЯ ЗВУКОВ ЧЕРЕЗ WEB AUDIO API
 * Никаких внешних файлов не нужно!
 */

class SoundManager {
  constructor() {
    this.audioContext = null;
    this.enabled = true;
    this.volume = 0.3; // Громкость по умолчанию
    this.init();
  }

  init() {
    try {
      // Создаем AudioContext при первом взаимодействии
      window.addEventListener('click', () => {
        if (!this.audioContext) {
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
      }, { once: true });
    } catch (e) {
      console.warn('Web Audio API не поддерживается:', e);
      this.enabled = false;
    }
  }

  // Базовая функция создания звука
  playTone(frequency, duration, type = 'sine') {
    if (!this.enabled || !this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  // 🎴 Звук получения карты
  card() {
    if (!this.audioContext) return;
    
    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Быстрый "свист" вверх
    oscillator.frequency.setValueAtTime(400, now);
    oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.1);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(this.volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    oscillator.start(now);
    oscillator.stop(now + 0.15);
  }

  // ✅ Звук успеха (выполнено задание)
  success() {
    if (!this.audioContext) return;
    
    const now = this.audioContext.currentTime;
    
    // Три быстрых ноты вверх
    [523, 659, 784].forEach((freq, i) => {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      const startTime = now + (i * 0.08);
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(this.volume, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.1);
    });
  }

  // ❌ Звук провала (задание не выполнено)
  fail() {
    if (!this.audioContext) return;
    
    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Грустный звук вниз
    oscillator.frequency.setValueAtTime(400, now);
    oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.3);
    oscillator.type = 'sawtooth';

    gainNode.gain.setValueAtTime(this.volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    oscillator.start(now);
    oscillator.stop(now + 0.3);
  }

  // 👍 Звук лайка
  like() {
    if (!this.audioContext) return;
    
    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Милый "пинг"
    oscillator.frequency.setValueAtTime(800, now);
    oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(this.volume * 0.8, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    oscillator.start(now);
    oscillator.stop(now + 0.2);
  }

  // 🚪 Звук входа игрока
  join() {
    if (!this.audioContext) return;
    
    const now = this.audioContext.currentTime;
    
    // Два коротких "бипа"
    [600, 800].forEach((freq, i) => {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      const startTime = now + (i * 0.1);
      oscillator.frequency.value = freq;
      oscillator.type = 'square';

      gainNode.gain.setValueAtTime(this.volume * 0.5, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.08);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.08);
    });
  }

  // 🎵 Звук выдачи карт админом
  deal() {
    if (!this.audioContext) return;
    
    const now = this.audioContext.currentTime;
    
    // Быстрая последовательность звуков
    [400, 450, 500, 550, 600].forEach((freq, i) => {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      const startTime = now + (i * 0.05);
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(this.volume * 0.4, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.08);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.08);
    });
  }

  // 📢 Звук уведомления
  notification() {
    if (!this.audioContext) return;
    
    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.setValueAtTime(600, now);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(this.volume * 0.6, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    oscillator.start(now);
    oscillator.stop(now + 0.15);
  }

  // 👑 Звук админа (особый)
  admin() {
    if (!this.audioContext) return;
    
    const now = this.audioContext.currentTime;
    
    // Торжественный звук
    [523, 659, 784, 1047].forEach((freq, i) => {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      const startTime = now + (i * 0.1);
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(this.volume * 0.7, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.15);
    });
  }

  // Включить/выключить звуки
  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  // Установить громкость (0-1)
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
  }
}

export default new SoundManager();
