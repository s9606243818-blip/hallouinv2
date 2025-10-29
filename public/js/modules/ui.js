/**
 * UI интерфейс - ПРАВИЛЬНАЯ ЛОГИКА ДЛЯ "НА ДВОИХ"
 */

import { getElement } from '../utils/helpers.js';
import socket from './socket.js';

class UI {
  constructor() {
    this.currentPlayer = null;
    this.selectedCard = null;
    this.selectedPlayers = new Set(); // Для карт "на двоих"
  }

  showModal(modalId) {
    const modal = getElement(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  }

  hideModal(modalId) {
    const modal = getElement(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  }

  showTargetModal(card, isRoleCard = false) {
    this.selectedCard = card;
    this.selectedPlayers.clear();
    
    const modal = getElement('targetModal');
    const container = getElement('targetPlayersList');
    const cardInfo = getElement('selectedCardInfo');
    
    if (!modal || !container) return;

    container.innerHTML = '';
    
    // Показываем информацию о карте
    if (cardInfo) {
      const typeLabel = card.type === 'both' ? '👥 На двоих' : '👤 На другого';
      const typeColor = card.type === 'both' ? '#6366f1' : '#ec4899';
      
      cardInfo.innerHTML = `
        <div style="margin-bottom: 20px; padding: 16px; background: rgba(255,255,255,0.05); border-radius: 12px;">
          <div style="font-size: 1.1rem; font-weight: 700; margin-bottom: 8px;">${card.name}</div>
          <div style="font-size: 0.85rem; color: ${typeColor}; font-weight: 600; margin-bottom: 8px;">${typeLabel}</div>
          ${card.description ? `<div style="font-size: 0.9rem; opacity: 0.8; line-height: 1.5;">${card.description}</div>` : ''}
        </div>
      `;
    }

    // Получить всех игроков кроме текущего
    const allPlayers = window.playersListData || [];
    const currentSocketId = window.currentPlayerSocketId;
    const otherPlayers = allPlayers.filter(p => p.socketId !== currentSocketId);

    if (otherPlayers.length === 0) {
      container.innerHTML = '<p style="opacity:0.7;text-align:center;padding:20px;">Нет других игроков</p>';
      return;
    }

    // Для карт "на двоих" - выбор ДВУХ игроков
    if (card.type === 'both' && !isRoleCard) {
      const instruction = document.createElement('p');
      instruction.style.cssText = 'text-align: center; margin-bottom: 16px; font-size: 0.9rem; opacity: 0.8;';
      instruction.textContent = '⚠️ Выберите ровно 2 игроков для совместного задания';
      container.appendChild(instruction);

      otherPlayers.forEach(player => {
        const playerEl = document.createElement('div');
        playerEl.className = 'target-item';
        playerEl.innerHTML = `
          <span>${player.nickname} (LVL ${player.level}, HP ${player.hp})</span>
        `;

        playerEl.addEventListener('click', () => {
          // Для "на двоих" выбираем максимум 2 игроков
          if (this.selectedPlayers.has(player.socketId)) {
            // Снимаем выделение
            this.selectedPlayers.delete(player.socketId);
            playerEl.classList.remove('selected');
          } else if (this.selectedPlayers.size < 2) {
            // Добавляем выделение
            this.selectedPlayers.add(player.socketId);
            playerEl.classList.add('selected');
          } else {
            alert('⚠️ Можно выбрать максимум 2 игроков!');
          }
        });

        container.appendChild(playerEl);
      });

      // Кнопка подтверждения
      const confirmBtn = document.createElement('button');
      confirmBtn.textContent = '✓ Подтвердить выбор';
      confirmBtn.style.cssText = 'width: 100%; margin-top: 16px; padding: 14px;';
      confirmBtn.addEventListener('click', () => {
        if (this.selectedPlayers.size !== 2) {
          alert('⚠️ Для задания "на двоих" нужно выбрать ровно 2 игроков!');
          return;
        }
        
        // Отправляем задание ДВУМ выбранным игрокам
        const selectedArray = Array.from(this.selectedPlayers);
        socket.useActionCardForTwo(card.id, selectedArray[0], selectedArray[1]);
        this.hideModal('targetModal');
      });
      container.appendChild(confirmBtn);
      
    } else {
      // Для карт "на другого" - обычный выбор
      otherPlayers.forEach(player => {
        const playerEl = document.createElement('div');
        playerEl.className = 'target-item';
        playerEl.textContent = `${player.nickname} (LVL ${player.level}, HP ${player.hp})`;

        playerEl.addEventListener('click', () => {
          if (isRoleCard) {
            socket.useRoleCard(card.id, player.socketId);
          } else {
            socket.useActionCard(card.id, player.socketId);
          }
          this.hideModal('targetModal');
        });

        container.appendChild(playerEl);
      });
    }

    this.showModal('targetModal');
  }

  showRolesModal() {
    const modal = getElement('rolesModal');
    const container = getElement('rolesPlayersList');
    
    if (!modal || !container) return;

    container.innerHTML = '';

    const allPlayers = window.playersListData || [];
    const currentSocketId = window.currentPlayerSocketId;
    const otherPlayers = allPlayers.filter(p => p.socketId !== currentSocketId);

    if (otherPlayers.length === 0) {
      container.innerHTML = '<p style="opacity:0.7;text-align:center;padding:20px;">Нет других игроков</p>';
    } else {
      otherPlayers.forEach(player => {
        const playerEl = document.createElement('div');
        playerEl.className = 'role-item';
        
        playerEl.innerHTML = `
          <span class="role-item-name">${player.nickname}</span>
          <select class="role-select" data-player="${player.socketId}">
            <option value="">Выберите роль</option>
            <option value="bartender">🍺 Бармен</option>
            <option value="healer">⚕️ Целитель</option>
            <option value="dealer">🎴 Дилер</option>
            <option value="dj">🎵 DJ</option>
          </select>
        `;

        const select = playerEl.querySelector('select');
        if (player.role && player.role !== 'player' && player.role !== 'admin') {
          select.value = player.role;
        }

        select.addEventListener('change', (e) => {
          const role = e.target.value;
          if (role) {
            socket.adminAssignRole(player.socketId, role);
          }
        });

        container.appendChild(playerEl);
      });
    }

    this.showModal('rolesModal');
  }

  showGiveCancelCardModal() {
    const modal = getElement('giveCancelCardModal');
    const container = getElement('giveCancelPlayersList');
    
    if (!modal || !container) return;

    container.innerHTML = '';

    const allPlayers = window.playersListData || [];

    if (allPlayers.length === 0) {
      container.innerHTML = '<p style="opacity:0.7;text-align:center;padding:20px;">Нет игроков</p>';
      return;
    }

    allPlayers.forEach(player => {
      const playerEl = document.createElement('div');
      playerEl.className = 'target-item';
      playerEl.innerHTML = `
        <span>${player.nickname} (LVL ${player.level}, HP ${player.hp})</span>
        <span style="font-size: 0.75rem; opacity: 0.7;">Карт: ${player.actionCards || 0}/10</span>
      `;

      playerEl.addEventListener('click', () => {
        socket.adminGiveCancelCard(player.socketId);
        this.hideModal('giveCancelCardModal');
      });

      container.appendChild(playerEl);
    });

    this.showModal('giveCancelCardModal');
  }

  showAdminPanel() {
    const panel = getElement('adminPanel');
    if (panel) {
      panel.style.display = 'block';
    }
  }

  hideAdminPanel() {
    const panel = getElement('adminPanel');
    if (panel) {
      panel.style.display = 'none';
    }
  }

  initModalHandlers() {
    document.querySelectorAll('.close-modal').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal) {
          modal.classList.remove('active');
        }
      });
    });

    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
    });
  }
}

export default new UI();
