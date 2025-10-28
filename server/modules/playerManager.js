/**
 * Управление игроками - С ПРОВЕРКОЙ ДУБЛИКАТОВ НИКОВ
 */

const gameState = require('./gameState');

class PlayerManager {
  
  joinPlayer(socketId, nickname, avatar) {
    // КРИТИЧНО: Проверка - занят ли ник
    const existingPlayer = gameState.getPlayerByNickname(nickname);
    
    if (existingPlayer) {
      // Ник уже занят другим активным игроком!
      console.log(`❌ Попытка входа: ник "${nickname}" уже занят игроком ${existingPlayer.socketId}`);
      return {
        success: false,
        error: 'Этот ник уже используется другим игроком. Выберите другой ник.'
      };
    }
    
    // Ник свободен - можно входить
    const player = gameState.addPlayer(socketId, nickname, avatar);
    console.log(`✅ Игрок "${nickname}" успешно вошел`);
    
    return {
      success: true,
      player: this.getPlayerData(player)
    };
  }

  leavePlayer(socketId) {
    gameState.removePlayer(socketId);
  }

  hasGivenLike(nickname) {
    // Проверяем - давал ли игрок с этим ником лайк кому-то
    const allPlayers = gameState.getAllPlayers();
    for (const player of allPlayers) {
      if (player.likedBy.includes(nickname)) {
        return true;
      }
    }
    return false;
  }

  getPlayerData(player) {
    if (!player) return null;
    
    return {
      socketId: player.socketId,
      nickname: player.nickname,
      avatar: player.avatar,
      role: player.role,
      hp: player.hp,
      exp: player.exp,
      level: player.level,
      likes: player.likes,
      likedBy: player.likedBy,
      hasGivenLike: this.hasGivenLike(player.nickname),
      actionCards: player.actionCards,
      roleCards: player.roleCards,
      activeTasks: player.activeTasks,
      usedCards: player.usedCards
    };
  }

  getPlayersList() {
    return gameState.getSortedPlayers().map(player => ({
      socketId: player.socketId,
      nickname: player.nickname,
      avatar: player.avatar,
      role: player.role,
      level: player.level,
      hp: player.hp,
      likes: player.likes,
      likedBy: player.likedBy,
      hasGivenLike: this.hasGivenLike(player.nickname)
    }));
  }

  addExp(socketId, amount) {
    const player = gameState.getPlayer(socketId);
    if (!player) return;

    const newExp = player.exp + amount;
    gameState.updatePlayer(socketId, { exp: newExp });
    
    return this.getPlayerData(player);
  }

  changeHP(socketId, amount) {
    const player = gameState.getPlayer(socketId);
    if (!player) return;

    const newHP = Math.max(0, Math.min(100, player.hp + amount));
    gameState.updatePlayer(socketId, { hp: newHP });
    
    return this.getPlayerData(player);
  }

  updateAvatar(socketId, avatarPath) {
    const player = gameState.getPlayer(socketId);
    if (!player) return;

    gameState.updatePlayer(socketId, { avatar: avatarPath });
    return this.getPlayerData(player);
  }
}

module.exports = new PlayerManager();
