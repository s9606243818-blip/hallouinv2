/**
 * Управление состоянием игры - С НОРМАЛИЗАЦИЕЙ НИКОВ
 */

class GameState {
  constructor() {
    this.players = new Map(); // socketId -> player data
    this.profiles = new Map(); // normalizedNickname -> saved profile
    this.gameStarted = false;
    this.adminNickname = null; // Нормализованный ник админа
  }

  // НОВАЯ ФУНКЦИЯ: Нормализация ника
  normalizeNickname(nickname) {
    // Приводим к нижнему регистру и убираем лишние пробелы
    return nickname.toLowerCase().trim();
  }

  // Добавить игрока
  addPlayer(socketId, nickname, avatar = null) {
    const normalizedNickname = this.normalizeNickname(nickname);
    
    // КРИТИЧНО: Админ ТОЛЬКО если:
    // 1. В нике есть "admin"
    // 2. ЕЩЕ НЕТ другого админа в игре
    const hasAdminInNick = normalizedNickname.includes('admin');
    const isFirstAdmin = hasAdminInNick && 
      (this.adminNickname === null || this.adminNickname === normalizedNickname);
    
    // Восстановление профиля или создание нового (по нормализованному нику!)
    let profile = this.profiles.get(normalizedNickname);
    
    if (profile) {
      console.log(`♻️ Восстановление профиля для ${nickname}:`, {
        avatar: profile.avatar,
        role: profile.role,
        hp: profile.hp,
        exp: profile.exp,
        level: profile.level,
        likes: profile.likes,
        tasks: profile.activeTasks ? profile.activeTasks.length : 0
      });
    } else {
      console.log(`🆕 Создание нового профиля для ${nickname}`);
      profile = {
        avatar: null,
        role: null,
        hp: 100,
        exp: 0,
        level: 1,
        likes: 0,
        likedBy: [],
        activeTasks: []
      };
    }

    const player = {
      socketId,
      nickname, // Оригинальный ник для отображения
      normalizedNickname, // Нормализованный для поиска
      avatar: avatar || profile.avatar,
      role: isFirstAdmin ? 'admin' : profile.role,
      hp: profile.hp,
      exp: profile.exp,
      level: profile.level,
      likes: profile.likes,
      likedBy: profile.likedBy || [],
      actionCards: [],
      roleCards: [],
      activeTasks: profile.activeTasks || [],
      usedCards: []
    };

    this.players.set(socketId, player);

    // КРИТИЧНО: Сохраняем нормализованный ник админа
    if (isFirstAdmin && this.adminNickname === null) {
      this.adminNickname = normalizedNickname;
      console.log(`👑 ${nickname} стал ЕДИНСТВЕННЫМ админом`);
    } else if (isFirstAdmin && this.adminNickname === normalizedNickname) {
      console.log(`👑 ${nickname} переподключился как админ`);
    } else if (hasAdminInNick && this.adminNickname !== null && this.adminNickname !== normalizedNickname) {
      console.log(`⚠️ ${nickname} попытался стать админом, но админ уже есть`);
    }

    // Обновляем socketId во ВСЕХ заданиях
    this.updateSocketIdInTasks(normalizedNickname, socketId);

    return player;
  }

  // Обновить socketId во всех заданиях
  updateSocketIdInTasks(normalizedNickname, newSocketId) {
    console.log(`🔄 Обновление socketId для ${normalizedNickname} -> ${newSocketId}`);
    
    const allPlayers = this.getAllPlayers();
    let updatedCount = 0;

    allPlayers.forEach(player => {
      player.activeTasks.forEach(task => {
        // Используем нормализованные ники для сравнения
        if (task.creatorNormalizedNickname === normalizedNickname) {
          console.log(`  ✓ Обновлен creatorSocketId в задании #${task.id}`);
          task.creatorSocketId = newSocketId;
          updatedCount++;
        }

        if (task.targetNormalizedNickname === normalizedNickname) {
          console.log(`  ✓ Обновлен targetSocketId в задании #${task.id}`);
          task.targetSocketId = newSocketId;
          updatedCount++;
        }

        if (task.target1NormalizedNickname === normalizedNickname) {
          console.log(`  ✓ Обновлен targetSocketId1 в задании #${task.id}`);
          task.targetSocketId1 = newSocketId;
          updatedCount++;
        }

        if (task.target2NormalizedNickname === normalizedNickname) {
          console.log(`  ✓ Обновлен targetSocketId2 в задании #${task.id}`);
          task.targetSocketId2 = newSocketId;
          updatedCount++;
        }

        if (task.fromNormalizedNickname === normalizedNickname) {
          console.log(`  ✓ Обновлен fromSocketId в запросе #${task.id}`);
          task.fromSocketId = newSocketId;
          updatedCount++;
        }
      });
    });

    console.log(`✅ Обновлено ${updatedCount} ссылок на socketId`);
  }

  // Удалить игрока
  removePlayer(socketId) {
    const player = this.players.get(socketId);
    if (player) {
      // Если админ вышел - не сбрасываем (даем шанс переподключиться)
      if (player.normalizedNickname === this.adminNickname) {
        console.log(`⚠️ Админ ${player.nickname} отключился (может вернуться в течение 5 минут)`);
      }
      
      // Сохранить профиль (по нормализованному нику!)
      this.profiles.set(player.normalizedNickname, {
        avatar: player.avatar,
        role: player.role, // Сохраняем роль включая admin!
        hp: player.hp,
        exp: player.exp,
        level: player.level,
        likes: player.likes,
        likedBy: player.likedBy,
        activeTasks: player.activeTasks
      });

      console.log(`💾 Профиль сохранен для ${player.nickname} (${player.activeTasks.length} заданий)`);
      this.players.delete(socketId);
    }
  }

  // Полностью удалить игрока (при долгом отсутствии)
  permanentlyRemovePlayer(nickname) {
    const normalizedNickname = this.normalizeNickname(nickname);
    
    // Освободить админа если это был он
    if (normalizedNickname === this.adminNickname) {
      console.log(`❌ Админ ${nickname} окончательно покинул игру`);
      this.adminNickname = null;
    }
    
    this.profiles.delete(normalizedNickname);
    console.log(`🗑️ Профиль ${nickname} удален окончательно`);
  }

  // Получить игрока
  getPlayer(socketId) {
    return this.players.get(socketId);
  }

  // Получить игрока по нику (регистронезависимо!)
  getPlayerByNickname(nickname) {
    const normalizedNickname = this.normalizeNickname(nickname);
    for (let player of this.players.values()) {
      if (player.normalizedNickname === normalizedNickname) {
        return player;
      }
    }
    return null;
  }

  // Получить всех игроков
  getAllPlayers() {
    return Array.from(this.players.values());
  }

  // Получить отсортированных игроков
  getSortedPlayers() {
    return this.getAllPlayers().sort((a, b) => b.level - a.level || b.exp - a.exp);
  }

  // Обновить профиль игрока
  updatePlayer(socketId, updates) {
    const player = this.players.get(socketId);
    if (player) {
      Object.assign(player, updates);
      
      if (updates.exp !== undefined) {
        player.level = Math.floor(player.exp / 100) + 1;
      }
      
      // Сохраняем по нормализованному нику
      this.profiles.set(player.normalizedNickname, {
        avatar: player.avatar,
        role: player.role,
        hp: player.hp,
        exp: player.exp,
        level: player.level,
        likes: player.likes,
        likedBy: player.likedBy,
        activeTasks: player.activeTasks
      });
    }
    return player;
  }

  // Сбросить игру
  resetGame() {
    for (let player of this.players.values()) {
      player.actionCards = [];
      player.roleCards = [];
      player.activeTasks = [];
      player.usedCards = [];
      player.hp = 100;
      
      if (player.role !== 'admin') {
        player.role = null;
      }
    }
    this.gameStarted = false;
  }

  // Получить админа
  getAdmin() {
    for (let player of this.players.values()) {
      if (player.normalizedNickname === this.adminNickname) {
        return player;
      }
    }
    return null;
  }

  // Проверка прав админа
  isAdmin(socketId) {
    const player = this.players.get(socketId);
    if (!player) {
      console.log(`⚠️ isAdmin: игрок с socketId=${socketId} не найден`);
      return false;
    }
    
    const isAdminNow = player.normalizedNickname === this.adminNickname;
    console.log(`🔍 isAdmin проверка: ${player.nickname} -> ${isAdminNow}`);
    return isAdminNow;
  }
}

module.exports = new GameState();
