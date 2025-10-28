/**
 * UI заданий - С ОПИСАНИЕМ КАРТЫ
 */

import { createElement, clearContainer, getElement, formatTime, getRemainingTime } from '../utils/helpers.js';
import socket from './socket.js';
import sounds from '../utils/sounds.js';
import vibration from '../utils/vibration.js';

class TasksUI {
  constructor() {
    this.timers = new Map();
  }

  renderActiveTasks(tasks, currentSocketId) {
    const container = getElement('activeTasks');
    if (!container) return;

    const hadTasks = container.children.length > 0;
    const previousTasksCount = container.querySelectorAll('.task-card').length;

    clearContainer(container);
    this.clearAllTimers();

    if (tasks.length === 0) {
      container.innerHTML = '<div class="tasks-empty">Нет активных заданий</div>';
      return;
    }

    tasks.forEach(task => {
      const taskEl = this.createActiveTaskElement(task, currentSocketId);
      container.appendChild(taskEl);
      
      if (task.timer && task.expiresAt) {
        this.startTimer(task);
      }
    });

    // Автопрокрутка к заданиям если:
    // 1. Появились новые задания (было меньше, стало больше)
    // 2. Или если до этого не было заданий
    if (tasks.length > previousTasksCount || !hadTasks) {
      this.scrollToTasks();
    }
  }

  /**
   * Плавная прокрутка к блоку активных заданий
   */
  scrollToTasks() {
    const tasksContainer = getElement('activeTasks');
    if (!tasksContainer) return;

    // Находим родительский блок карт
    const cardsBlock = tasksContainer.closest('.cards-block');
    if (!cardsBlock) return;

    // Небольшая задержка для плавности
    setTimeout(() => {
      cardsBlock.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start'
      });

      // Подсветка на секунду
      const section = tasksContainer.closest('.cards-section');
      if (section) {
        section.classList.add('highlight');
        setTimeout(() => {
          section.classList.remove('highlight');
        }, 2000);
      }
    }, 100);
  }

  createActiveTaskElement(task, currentSocketId) {
    const taskEl = createElement('div', ['task-card']);
    taskEl.setAttribute('data-id', task.id);
    
    const isRoleRequest = task.type === 'role_request';
    const isCreator = task.creatorSocketId === currentSocketId;
    const isTarget = task.targetSocketId === currentSocketId;
    const isTarget1 = task.targetSocketId1 === currentSocketId;
    const isTarget2 = task.targetSocketId2 === currentSocketId;
    const isParticipant = isTarget1 || isTarget2;
    
    let badge = '';
    let buttons = '';
    let infoItems = [];
    
    // Бейдж роли
    if (isCreator) {
      badge = '<span class="task-badge creator">Ваше</span>';
    } else if (isTarget || isParticipant) {
      badge = '<span class="task-badge target">Вам</span>';
    }
    
    // ВАЖНО: Добавляем описание карты
    const descriptionHtml = task.description 
      ? `<div class="task-description">${task.description}</div>` 
      : '';
    
    // Таймер с прогресс-баром
    let timerHtml = '';
    if (task.timer && task.expiresAt) {
      timerHtml = `
        <div class="task-timer">
          <div class="timer-label">
            <span>⏱️ Осталось:</span>
            <span class="timer-value" id="timer-${task.id}">--:--</span>
          </div>
          <div class="timer-progress">
            <div class="timer-progress-bar" id="progress-${task.id}"></div>
          </div>
        </div>
      `;
    }
    
    // Информация о задании
    if (isRoleRequest) {
      infoItems.push(`<div class="task-info-item">👤 От: <strong>${task.fromNickname}</strong></div>`);
      buttons = `
        <div class="task-actions">
          <button onclick="window.acceptRoleRequest(${task.id})" class="task-btn task-btn-complete">
            ✓ Выполнить (+20 EXP)
          </button>
          <button onclick="window.declineRoleRequest(${task.id})" class="task-btn task-btn-fail">
            ✗ Отказать
          </button>
        </div>
      `;
    } 
    else if (task.type === 'other' && isCreator && !isTarget) {
      infoItems.push(`<div class="task-info-item">👤 Игрок: <strong>${task.targetNickname}</strong></div>`);
      infoItems.push(`<div class="task-info-item">⭐ Награда: <strong>+${task.exp || 20} EXP</strong></div>`);
      buttons = `
        <div class="task-actions">
          <button onclick="window.completeTask(${task.id})" class="task-btn task-btn-complete">
            ✓ Выполнено
          </button>
          <button onclick="window.failTask(${task.id})" class="task-btn task-btn-fail">
            ✗ Не выполнено (-40 HP)
          </button>
        </div>
      `;
    }
    else if (task.type === 'both' && isCreator) {
      const targets = task.target1Nickname && task.target2Nickname 
        ? `${task.target1Nickname} и ${task.target2Nickname}`
        : task.targetNickname || 'партнеры';
      
      infoItems.push(`<div class="task-info-item">👥 Игроки: <strong>${targets}</strong></div>`);
      infoItems.push(`<div class="task-info-item">⭐ Награда: <strong>+${task.exp || 20} EXP обоим</strong></div>`);
      buttons = `
        <div class="task-actions">
          <button onclick="window.completeTask(${task.id})" class="task-btn task-btn-complete">
            ✓ Выполнено
          </button>
          <button onclick="window.failTask(${task.id})" class="task-btn task-btn-fail">
            ✗ Не выполнено (-40 HP обоим)
          </button>
        </div>
      `;
    }
    else if (task.type === 'both' && isParticipant) {
      const partnerNickname = isTarget1 ? task.target2Nickname : task.target1Nickname;
      infoItems.push(`<div class="task-info-item">👤 От: <strong>${task.creatorNickname}</strong></div>`);
      infoItems.push(`<div class="task-info-item">👥 Партнер: <strong>${partnerNickname}</strong></div>`);
    }
    else if (isTarget) {
      infoItems.push(`<div class="task-info-item">👤 От: <strong>${task.creatorNickname}</strong></div>`);
    }

    taskEl.innerHTML = `
      <div class="task-header">
        <div class="task-title">${task.cardName}</div>
        ${badge}
      </div>
      ${descriptionHtml}
      ${timerHtml}
      ${infoItems.length > 0 ? `<div class="task-info">${infoItems.join('')}</div>` : ''}
      ${buttons}
    `;
    
    return taskEl;
  }

  startTimer(task) {
    if (this.timers.has(task.id)) {
      clearInterval(this.timers.get(task.id));
    }

    const timerEl = getElement(`timer-${task.id}`);
    const progressBar = getElement(`progress-${task.id}`);
    if (!timerEl) return;

    const totalTime = task.timer; // Общее время в секундах

    const updateTimer = () => {
      const remaining = getRemainingTime(task.expiresAt);
      
      if (remaining === null || remaining <= 0) {
        timerEl.textContent = '00:00';
        if (progressBar) {
          progressBar.style.width = '0%';
          progressBar.classList.remove('warning', 'critical');
        }
        
        const interval = this.timers.get(task.id);
        if (interval) {
          clearInterval(interval);
          this.timers.delete(task.id);
        }
        return;
      }

      // Обновляем текст таймера
      timerEl.textContent = formatTime(remaining);
      
      // Обновляем прогресс-бар
      if (progressBar) {
        const percent = (remaining / totalTime) * 100;
        progressBar.style.width = `${percent}%`;
        
        // Меняем цвет в зависимости от времени
        progressBar.classList.remove('warning', 'critical');
        if (remaining <= 5) {
          progressBar.classList.add('critical');
          // Вибрация на последних секундах
          if (remaining === 5) {
            vibration.short();
          }
        } else if (remaining <= 10) {
          progressBar.classList.add('warning');
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    this.timers.set(task.id, interval);
  }

  clearAllTimers() {
    this.timers.forEach(interval => clearInterval(interval));
    this.timers.clear();
  }
  
  // Анимация выполнения задания
  animateComplete(taskId) {
    const taskEl = document.querySelector(`[data-id="${taskId}"]`);
    if (taskEl) {
      taskEl.classList.add('completing');
      sounds.success();
      vibration.success();
      setTimeout(() => taskEl.remove(), 500);
    }
  }
  
  // Анимация провала задания
  animateFail(taskId) {
    const taskEl = document.querySelector(`[data-id="${taskId}"]`);
    if (taskEl) {
      taskEl.classList.add('failing');
      sounds.fail();
      vibration.fail();
      setTimeout(() => taskEl.remove(), 500);
    }
  }
}

export default new TasksUI();
