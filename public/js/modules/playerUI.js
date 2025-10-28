/**
 * UI игрока - С ОЧИСТКОЙ НИКА ОТ "admin"
 */

import { getElement } from '../utils/helpers.js';

class PlayerUI {
  constructor() {
    this.player = null;
  }

  // НОВАЯ ФУНКЦИЯ: Убрать "admin" из ника
  cleanNickname(nickname) {
    // Убираем "admin" (регистронезависимо) и лишние пробелы
    return nickname
      .replace(/admin/gi, '')
      .trim()
      .replace(/\s+/g, ' ') || 'Игрок';
  }

  updatePlayer(playerData) {
    this.player = playerData;
    this.render();
  }

  render() {
    if (!this.player) return;

    const avatar = getElement('playerAvatar');
    if (avatar && this.player.avatar) {
      avatar.src = this.player.avatar;
    }

    const nickname = getElement('playerNickname');
    if (nickname) {
      // ВАЖНО: Очищаем ник от "admin"
      nickname.textContent = this.cleanNickname(this.player.nickname);
    }

    const role = getElement('playerRole');
    if (role) {
      const roleNames = {
        admin: '👑 Админ',
        bartender: '🍺 Бармен',
        healer: '⚕️ Целитель',
        dealer: '🎴 Дилер',
        dj: '🎵 DJ'
      };
      role.textContent = roleNames[this.player.role] || 'Игрок';
    }

    const hp = getElement('playerHP');
    const exp = getElement('playerEXP');
    const level = getElement('playerLevel');
    const likes = getElement('playerLikes');

    if (hp) hp.textContent = this.player.hp;
    if (exp) exp.textContent = this.player.exp;
    if (level) level.textContent = this.player.level;
    if (likes) likes.textContent = this.player.likes;
  }

  show() {
    const gameContainer = getElement('gameContainer');
    if (gameContainer) {
      gameContainer.style.display = 'grid';
    }
  }

  hide() {
    const gameContainer = getElement('gameContainer');
    if (gameContainer) {
      gameContainer.style.display = 'none';
    }
  }
}

export default new PlayerUI();
