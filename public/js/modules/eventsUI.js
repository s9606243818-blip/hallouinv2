/**
 * UI событий - ЛАЙКИ ВИДНЫ ТОЛЬКО АДМИНУ
 */

import { createElement, getElement } from '../utils/helpers.js';

class EventsUI {
  constructor() {
    this.maxEvents = 50;
    this.isAdmin = false;
  }

  setAdmin(isAdmin) {
    this.isAdmin = isAdmin;
  }

  addEvent(message, type) {
    // КРИТИЧНО: лайки видны только админу
    if (type === 'like' && !this.isAdmin) {
      return;
    }

    const container = getElement('eventsList');
    if (!container) return;

    const eventEl = createElement('div', ['event-item', type]);
    eventEl.textContent = message;

    // Добавить в начало списка
    if (container.firstChild) {
      container.insertBefore(eventEl, container.firstChild);
    } else {
      container.appendChild(eventEl);
    }

    // Ограничить количество событий
    while (container.children.length > this.maxEvents) {
      container.removeChild(container.lastChild);
    }
  }

  clear() {
    const container = getElement('eventsList');
    if (container) {
      container.innerHTML = '';
    }
  }
}

export default new EventsUI();
