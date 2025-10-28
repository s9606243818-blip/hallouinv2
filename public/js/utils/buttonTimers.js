/**
 * Управление таймерами для кнопок запросов
 */

class ButtonTimers {
  constructor() {
    this.timers = new Map();
    this.cooldowns = {
      heal: 5 * 60 * 1000,    // 5 минут в миллисекундах
      cards: 5 * 60 * 1000,   // 5 минут
      music: 5 * 60 * 1000    // 5 минут (можно изменить если нужно)
    };
    
    // Загружаем сохранённые таймеры из localStorage
    this.loadTimers();
  }

  /**
   * Проверить, можно ли использовать кнопку
   */
  canUse(type) {
    const timer = this.timers.get(type);
    if (!timer) return true;
    
    const now = Date.now();
    return now >= timer.endTime;
  }

  /**
   * Получить оставшееся время (в миллисекундах)
   */
  getTimeLeft(type) {
    const timer = this.timers.get(type);
    if (!timer) return 0;
    
    const now = Date.now();
    const timeLeft = timer.endTime - now;
    return Math.max(0, timeLeft);
  }

  /**
   * Запустить таймер для кнопки
   */
  startTimer(type, buttonElement) {
    const cooldown = this.cooldowns[type];
    if (!cooldown) return;

    const endTime = Date.now() + cooldown;
    
    this.timers.set(type, {
      endTime,
      intervalId: null
    });

    // Сохраняем в localStorage
    this.saveTimers();

    // Обновляем UI
    this.updateButton(type, buttonElement);

    // Запускаем обновление каждую секунду
    const intervalId = setInterval(() => {
      if (this.canUse(type)) {
        this.stopTimer(type, buttonElement);
      } else {
        this.updateButton(type, buttonElement);
      }
    }, 1000);

    // Сохраняем ID интервала
    const timer = this.timers.get(type);
    timer.intervalId = intervalId;
  }

  /**
   * Остановить таймер
   */
  stopTimer(type, buttonElement) {
    const timer = this.timers.get(type);
    if (!timer) return;

    // Очищаем интервал
    if (timer.intervalId) {
      clearInterval(timer.intervalId);
    }

    // Удаляем таймер
    this.timers.delete(type);
    this.saveTimers();

    // Восстанавливаем кнопку
    this.restoreButton(type, buttonElement);
  }

  /**
   * Обновить отображение кнопки
   */
  updateButton(type, buttonElement) {
    if (!buttonElement) return;

    const timeLeft = this.getTimeLeft(type);
    if (timeLeft <= 0) {
      this.restoreButton(type, buttonElement);
      return;
    }

    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    buttonElement.disabled = true;
    buttonElement.classList.add('timer-active');
    
    // Сохраняем оригинальный текст если ещё не сохранён
    if (!buttonElement.dataset.originalText) {
      buttonElement.dataset.originalText = buttonElement.textContent;
    }

    buttonElement.textContent = `⏱️ ${timeString}`;
  }

  /**
   * Восстановить кнопку в исходное состояние
   */
  restoreButton(type, buttonElement) {
    if (!buttonElement) return;

    buttonElement.disabled = false;
    buttonElement.classList.remove('timer-active');
    
    if (buttonElement.dataset.originalText) {
      buttonElement.textContent = buttonElement.dataset.originalText;
    }
  }

  /**
   * Сохранить таймеры в localStorage
   */
  saveTimers() {
    const timersData = {};
    this.timers.forEach((timer, type) => {
      timersData[type] = {
        endTime: timer.endTime
      };
    });
    localStorage.setItem('requestTimers', JSON.stringify(timersData));
  }

  /**
   * Загрузить таймеры из localStorage
   */
  loadTimers() {
    try {
      const data = localStorage.getItem('requestTimers');
      if (!data) return;

      const timersData = JSON.parse(data);
      const now = Date.now();

      Object.entries(timersData).forEach(([type, timer]) => {
        // Проверяем, не истёк ли таймер
        if (timer.endTime > now) {
          this.timers.set(type, {
            endTime: timer.endTime,
            intervalId: null
          });
        }
      });
    } catch (error) {
      console.error('Ошибка загрузки таймеров:', error);
      localStorage.removeItem('requestTimers');
    }
  }

  /**
   * Инициализировать кнопку (проверить сохранённый таймер)
   */
  initButton(type, buttonElement) {
    if (!buttonElement) return;

    // Сохраняем оригинальный текст
    if (!buttonElement.dataset.originalText) {
      buttonElement.dataset.originalText = buttonElement.textContent;
    }

    // Если есть активный таймер - запускаем обновление
    if (!this.canUse(type)) {
      this.updateButton(type, buttonElement);

      // Запускаем интервал обновления
      const intervalId = setInterval(() => {
        if (this.canUse(type)) {
          this.stopTimer(type, buttonElement);
        } else {
          this.updateButton(type, buttonElement);
        }
      }, 1000);

      // Сохраняем ID интервала
      const timer = this.timers.get(type);
      if (timer) {
        timer.intervalId = intervalId;
      }
    }
  }

  /**
   * Сбросить все таймеры (для отладки)
   */
  resetAll() {
    this.timers.forEach((timer) => {
      if (timer.intervalId) {
        clearInterval(timer.intervalId);
      }
    });
    this.timers.clear();
    localStorage.removeItem('requestTimers');
  }

  /**
   * Получить информацию о всех таймерах (для отладки)
   */
  getStatus() {
    const status = {};
    ['heal', 'cards', 'music'].forEach(type => {
      const timeLeft = this.getTimeLeft(type);
      status[type] = {
        canUse: this.canUse(type),
        timeLeft: timeLeft,
        timeLeftFormatted: this.formatTime(timeLeft)
      };
    });
    return status;
  }

  /**
   * Форматировать время для отображения
   */
  formatTime(ms) {
    if (ms <= 0) return '0:00';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

export default new ButtonTimers();
