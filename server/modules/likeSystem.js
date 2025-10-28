/**
 * Система лайков - С СОХРАНЕНИЕМ В ПРОФИЛЕ
 */

const gameState = require('./gameState');

class LikeSystem {
  likePlayer(fromSocketId, toSocketId) {
    const fromPlayer = gameState.getPlayer(fromSocketId);
    const toPlayer = gameState.getPlayer(toSocketId);

    if (!fromPlayer || !toPlayer) {
      return { success: false, error: 'Игрок не найден' };
    }

    if (fromSocketId === toSocketId) {
      return { success: false, error: 'Нельзя лайкать самого себя' };
    }

    // КРИТИЧНО: проверяем по профилю - лайкнул ли уже этот игрок кого-то
    const fromProfile = gameState.profiles.get(fromPlayer.nickname);
    if (fromProfile && fromProfile.likedBy && fromProfile.likedBy.includes(fromPlayer.nickname)) {
      return { success: false, error: 'Вы уже использовали свой лайк' };
    }

    // Проверяем - не лайкал ли уже этот игрок ранее
    if (toPlayer.likedBy.includes(fromPlayer.nickname)) {
      return { success: false, error: 'Вы уже лайкали этого игрока' };
    }

    // Добавить лайк
    toPlayer.likes += 1;
    toPlayer.likedBy.push(fromPlayer.nickname);
    
    // КРИТИЧНО: Сохранить в профиль получателя
    const toProfile = gameState.profiles.get(toPlayer.nickname);
    if (toProfile) {
      toProfile.likes = toPlayer.likes;
      toProfile.likedBy = toPlayer.likedBy;
    } else {
      gameState.profiles.set(toPlayer.nickname, {
        avatar: toPlayer.avatar,
        role: toPlayer.role === 'admin' ? null : toPlayer.role,
        hp: toPlayer.hp,
        exp: toPlayer.exp,
        level: toPlayer.level,
        likes: toPlayer.likes,
        likedBy: toPlayer.likedBy
      });
    }

    console.log(`💖 ${fromPlayer.nickname} лайкнул ${toPlayer.nickname} (всего: ${toPlayer.likes})`);

    return {
      success: true,
      from: fromPlayer.nickname,
      to: toPlayer.nickname,
      totalLikes: toPlayer.likes
    };
  }

  getLikesInfo() {
    const players = gameState.getAllPlayers();
    
    return players.map(player => ({
      nickname: player.nickname,
      likes: player.likes,
      likedBy: player.likedBy
    }));
  }

  hasGivenLike(nickname) {
    // Проверяем по профилю - давал ли этот игрок лайк кому-то
    const allPlayers = gameState.getAllPlayers();
    for (const player of allPlayers) {
      if (player.likedBy.includes(nickname)) {
        return true;
      }
    }
    return false;
  }
}

module.exports = new LikeSystem();
