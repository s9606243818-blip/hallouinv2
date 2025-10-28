/**
 * UI списка игроков - С СКРЫТИЕМ "admin" В НИКЕ
 */

import { createElement, clearContainer, getElement } from '../utils/helpers.js';
import socket from './socket.js';

class PlayersListUI {
  constructor() {
    this.currentSocketId = null;
    this.isAdmin = false;
  }

  setCurrentPlayer(socketId) {
    this.currentSocketId = socketId;
  }

  render(players) {
    const container = getElement('playersList');
    if (!container) return;

    clearContainer(container);

    if (players.length === 0) {
      container.innerHTML = '<p style="opacity:0.7;">Нет игроков</p>';
      return;
    }

    const currentPlayer = players.find(p => p.socketId === this.currentSocketId);
    this.isAdmin = currentPlayer && currentPlayer.role === 'admin';
    const currentPlayerHasGivenLike = currentPlayer && currentPlayer.hasGivenLike;

    const sorted = [...players].sort((a, b) => {
      if (b.exp !== a.exp) return b.exp - a.exp;
      return b.likes - a.likes;
    });

    sorted.forEach((player, index) => {
      const playerEl = this.createPlayerElement(player, index, currentPlayerHasGivenLike);
      container.appendChild(playerEl);
    });
  }

  // НОВАЯ ФУНКЦИЯ: Убрать "admin" из ника
  cleanNickname(nickname) {
    // Убираем "admin" (регистронезависимо) и лишние пробелы
    return nickname
      .replace(/admin/gi, '')
      .trim()
      .replace(/\s+/g, ' ') || 'Игрок';
  }

  createPlayerElement(player, index, currentPlayerHasGivenLike) {
    const isCurrentPlayer = player.socketId === this.currentSocketId;

    const playerEl = createElement('div', ['player-item']);
    
    if (index === 0) playerEl.classList.add('top1');
    if (index === 1) playerEl.classList.add('top2');

    const roleEmoji = this.getRoleEmoji(player.role);
    const roleName = this.getRoleName(player.role);

    // Показываем кнопку лайка только если:
    // 1. Это не текущий игрок
    // 2. Текущий игрок еще не использовал свой лайк
    const canLike = !isCurrentPlayer && !currentPlayerHasGivenLike;

    // ВАЖНО: Очищаем ник от "admin"
    const displayName = this.cleanNickname(player.nickname);

    playerEl.innerHTML = `
      <img src="${player.avatar || '/avatars/default.svg'}" alt="${displayName}" class="player-item-avatar">
      <div class="player-item-content">
        <div class="player-item-header">
          <div class="player-item-info">
            <div class="player-item-name">${displayName}${isCurrentPlayer ? ' (Вы)' : ''}</div>
            <div class="player-item-stats">
              📊 LVL ${player.level} | ❤️ HP ${player.hp} | 👍 ${player.likes}
            </div>
          </div>
          ${player.role !== 'player' ? `<div class="player-item-role">${roleEmoji} ${roleName}</div>` : ''}
        </div>
        ${canLike ? `
          <button class="like-btn" onclick="window.likePlayer('${player.socketId}')">
            👍 Лайк анонимно
          </button>
        ` : ''}
      </div>
    `;

    return playerEl;
  }

  getRoleEmoji(role) {
    const emojis = {
      admin: '👑',
      bartender: '🍺',
      healer: '⚕️',
      dealer: '🎴',
      dj: '🎵',
      player: ''
    };
    return emojis[role] || '';
  }

  getRoleName(role) {
    const names = {
      admin: 'Админ',
      bartender: 'Бармен',
      healer: 'Целитель',
      dealer: 'Дилер',
      dj: 'DJ',
      player: ''
    };
    return names[role] || '';
  }
}

window.likePlayer = (targetSocketId) => {
  socket.likePlayer(targetSocketId);
};

export default new PlayersListUI();
