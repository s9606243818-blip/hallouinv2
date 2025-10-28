/**
 * Система сессий - Управление переподключениями
 */

const gameState = require('./gameState');

class SessionManager {
  constructor() {
    // nickname -> { timeout, disconnectTime }
    this.disconnectedPlayers = new Map();
    this.RECONNECT_TIMEOUT = 5 * 60 * 1000; // 5 минут для переподключения
  }

  // Игрок отключился
  handleDisconnect(socketId) {
    const player = gameState.getPlayer(socketId);
    if (!player) return;

    const nickname = player.nickname;
    console.log(`🔌 ${nickname} отключился, даем ${this.RECONNECT_TIMEOUT / 1000}с на переподключение`);

    // Устанавливаем таймер
    const timeout = setTimeout(() => {
      console.log(`⏰ Время истекло для ${nickname} - окончательное удаление`);
      this.permanentlyRemove(nickname);
    }, this.RECONNECT_TIMEOUT);

    this.disconnectedPlayers.set(nickname, {
      timeout,
      disconnectTime: Date.now(),
      profile: gameState.profiles.get(nickname)
    });

    // Временно удаляем из активных игроков
    gameState.removePlayer(socketId);
  }

  // Игрок переподключился
  handleReconnect(nickname) {
    const session = this.disconnectedPlayers.get(nickname);
    if (!session) {
      console.log(`✅ ${nickname} подключается впервые`);
      return false; // Новый игрок
    }

    console.log(`🔄 ${nickname} переподключился! Восстановление сессии...`);
    
    // Отменяем таймер удаления
    clearTimeout(session.timeout);
    this.disconnectedPlayers.delete(nickname);

    return true; // Переподключение
  }

  // Окончательно удалить игрока
  permanentlyRemove(nickname) {
    gameState.permanentlyRemovePlayer(nickname);
    this.disconnectedPlayers.delete(nickname);
  }

  // Проверить - находится ли игрок в процессе переподключения
  isReconnecting(nickname) {
    return this.disconnectedPlayers.has(nickname);
  }

  // Получить время до окончательного удаления
  getTimeLeft(nickname) {
    const session = this.disconnectedPlayers.get(nickname);
    if (!session) return 0;

    const elapsed = Date.now() - session.disconnectTime;
    const remaining = this.RECONNECT_TIMEOUT - elapsed;
    return Math.max(0, remaining);
  }
}

module.exports = new SessionManager();
