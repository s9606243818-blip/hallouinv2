/**
 * Менеджер вибрации - ДЛЯ МОБИЛЬНЫХ УСТРОЙСТВ
 */

class VibrationManager {
  constructor() {
    this.enabled = 'vibrate' in navigator;
    this.intensity = 1.0; // Интенсивность (0-1)
  }

  // Базовая вибрация
  vibrate(pattern = [100]) {
    if (!this.enabled) return;
    
    // Применяем интенсивность
    const adjustedPattern = pattern.map(p => 
      typeof p === 'number' ? Math.floor(p * this.intensity) : p
    );
    
    navigator.vibrate(adjustedPattern);
  }

  // 🎴 Короткая вибрация (получена карта)
  short() {
    this.vibrate([30]);
  }

  // ✅ Успех (задание выполнено)
  success() {
    this.vibrate([50, 50, 50]); // Три коротких
  }

  // ❌ Провал (задание не выполнено)
  fail() {
    this.vibrate([200]); // Одна длинная
  }

  // 👍 Лайк
  like() {
    this.vibrate([40, 30, 40]); // Ритмичный
  }

  // 📢 Уведомление
  notification() {
    this.vibrate([50]);
  }

  // 🚨 Критично (HP = 0)
  critical() {
    this.vibrate([100, 50, 100, 50, 100]); // Тревожный
  }

  // 🎵 Длинная (особое событие)
  long() {
    this.vibrate([300]);
  }

  // 🔄 Паттерн (для админа)
  pattern() {
    this.vibrate([50, 100, 50, 100, 50]);
  }

  // Включить/выключить
  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  // Установить интенсивность (0-1)
  setIntensity(intensity) {
    this.intensity = Math.max(0, Math.min(1, intensity));
  }

  // Остановить вибрацию
  stop() {
    if (this.enabled) {
      navigator.vibrate(0);
    }
  }
}

export default new VibrationManager();
