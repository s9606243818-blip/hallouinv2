/**
 * UI карт - С ПРОВЕРКОЙ HP
 */

import { createElement, clearContainer, getElement } from '../utils/helpers.js';
import { MAX_ACTION_CARDS, MAX_ROLE_CARDS } from '../utils/constants.js';
import socket from './socket.js';

class CardsUI {
  constructor() {
    this.selectedCard = null;
    this.onCardSelect = null;
    this.currentPlayerHP = 100; // Будет обновляться
  }

  setPlayerHP(hp) {
    this.currentPlayerHP = hp;
  }

  renderActionCards(cards) {
    const container = getElement('actionCards');
    const header = container?.closest('.cards-section')?.querySelector('h4');
    
    if (!container) return;

    clearContainer(container);

    if (header) {
      const countSpan = header.querySelector('span') || document.createElement('span');
      countSpan.textContent = `(${cards.length}/${MAX_ACTION_CARDS})`;
      if (!header.querySelector('span')) {
        header.appendChild(countSpan);
      }
    }

    if (cards.length === 0) {
      container.innerHTML = '<p style="color: rgba(255,255,255,0.5); font-size: 0.85rem;">Нет карт</p>';
      return;
    }

    // Проверка HP - блокируем карты если HP <= 0
    const isBlocked = this.currentPlayerHP <= 0;

    cards.forEach(card => {
      const cardEl = this.createCardElement(card, isBlocked);
      cardEl.addEventListener('click', () => this.handleCardClick(card, isBlocked));
      container.appendChild(cardEl);
    });
  }

  renderRoleCards(cards, playerRole) {
    const container = getElement('roleCards');
    const section = container?.closest('.cards-section');
    const header = section?.querySelector('h4');
    
    if (!container || !section) return;

    if (!playerRole || playerRole === 'player' || playerRole === 'admin') {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';

    clearContainer(container);

    if (header) {
      const countSpan = header.querySelector('span') || document.createElement('span');
      countSpan.textContent = `(${cards.length}/${MAX_ROLE_CARDS})`;
      if (!header.querySelector('span')) {
        header.appendChild(countSpan);
      }
    }

    if (cards.length === 0) {
      container.innerHTML = '<p style="color: rgba(255,255,255,0.5); font-size: 0.85rem;">Нет карт роли</p>';
      return;
    }

    // Проверка HP - блокируем карты если HP <= 0
    const isBlocked = this.currentPlayerHP <= 0;

    cards.forEach(card => {
      const cardEl = this.createRoleCardElement(card, isBlocked);
      cardEl.addEventListener('click', () => this.handleRoleCardClick(card, isBlocked));
      container.appendChild(cardEl);
    });
  }

  createCardElement(card, isBlocked = false) {
    const cardEl = createElement('div', ['card']);
    cardEl.setAttribute('data-type', card.type);
    cardEl.setAttribute('data-id', card.id);
    
    // Блокировка карты
    if (isBlocked) {
      cardEl.classList.add('card-blocked');
    }
    
    const descriptionHtml = card.description 
      ? `<div class="card-description">${this.truncateText(card.description, 60)}</div>` 
      : '';
    
    const blockedOverlay = isBlocked 
      ? `<div class="card-blocked-overlay">🚫<br>Нет HP</div>` 
      : '';
    
    cardEl.innerHTML = `
      <div class="card-name">${card.name}</div>
      <div class="card-type">${this.getTypeLabel(card.type)}</div>
      ${descriptionHtml}
      ${blockedOverlay}
    `;
    
    return cardEl;
  }

  createRoleCardElement(card, isBlocked = false) {
    const cardEl = createElement('div', ['card', 'role-card']);
    cardEl.setAttribute('data-id', card.id);
    
    if (isBlocked) {
      cardEl.classList.add('card-blocked');
    }
    
    const blockedOverlay = isBlocked 
      ? `<div class="card-blocked-overlay">🚫<br>Нет HP</div>` 
      : '';
    
    cardEl.innerHTML = `
      <div class="card-name">${card.name}</div>
      <div class="card-type">${card.action}</div>
      ${blockedOverlay}
    `;
    
    return cardEl;
  }

  getTypeLabel(type) {
    const labels = {
      other: 'На другого',
      both: 'На двоих',
      cancel_task: 'На себя'
    };
    return labels[type] || type;
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  handleCardClick(card, isBlocked) {
    if (isBlocked) {
      this.showNeedsHealingMessage();
      return;
    }

    // 🚫 Специальная обработка для карты "Отмена задания"
    if (card.type === 'cancel_task') {
      socket.useActionCard(card.id, null);
      return;
    }

    if (card.type === 'other' || card.type === 'both') {
      if (this.onCardSelect) {
        this.onCardSelect(card);
      }
    }
  }

  handleRoleCardClick(card, isBlocked) {
    if (isBlocked) {
      this.showNeedsHealingMessage();
      return;
    }

    if (card.target === 'self') {
      socket.useRoleCard(card.id);
    } else {
      if (this.onCardSelect) {
        this.onCardSelect(card, true);
      }
    }
  }

  showNeedsHealingMessage() {
    // Создаем всплывающее сообщение
    const existingMsg = document.querySelector('.hp-warning-message');
    if (existingMsg) {
      existingMsg.remove();
    }

    const message = document.createElement('div');
    message.className = 'hp-warning-message';
    message.innerHTML = `
      <div class="hp-warning-content">
        <div class="hp-warning-icon">💔</div>
        <div class="hp-warning-title">У вас закончились жизни!</div>
        <div class="hp-warning-text">Нажмите кнопку "Запросить лечение" чтобы продолжить игру</div>
        <button class="hp-warning-btn" id="goToHealBtn">Запросить лечение</button>
      </div>
    `;

    document.body.appendChild(message);

    // Анимация появления
    setTimeout(() => message.classList.add('show'), 10);

    // Кнопка закрытия по клику на фон
    message.addEventListener('click', (e) => {
      if (e.target === message) {
        message.classList.remove('show');
        setTimeout(() => message.remove(), 300);
      }
    });

    // Кнопка "Запросить лечение"
    const healBtn = document.getElementById('goToHealBtn');
    if (healBtn) {
      healBtn.addEventListener('click', () => {
        message.classList.remove('show');
        setTimeout(() => message.remove(), 300);
        
        // Прокрутка к кнопке и подсветка
        const requestHealBtn = document.getElementById('requestHealBtn');
        if (requestHealBtn) {
          requestHealBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
          requestHealBtn.classList.add('pulse-highlight');
          setTimeout(() => requestHealBtn.classList.remove('pulse-highlight'), 2000);
        }
      });
    }

    // Автоматическое закрытие через 5 секунд
    setTimeout(() => {
      if (message.parentNode) {
        message.classList.remove('show');
        setTimeout(() => message.remove(), 300);
      }
    }, 5000);
  }

  setCardSelectHandler(handler) {
    this.onCardSelect = handler;
  }
}

export default new CardsUI();
