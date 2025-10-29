/**
 * Управление заданиями - ПРАВИЛЬНАЯ ЛОГИКА ДЛЯ "НА ДВОИХ"
 */

const gameState = require('./gameState');
const playerManager = require('./playerManager');

class TaskManager {
  constructor() {
    this.taskIdCounter = 1;
    this.activeTimers = new Map();
    this.io = null;
  }

  setIO(io) {
    this.io = io;
  }

  createTask(card, creatorSocketId, targetSocketId = null) {
    const creator = gameState.getPlayer(creatorSocketId);
    if (!creator) return { success: false, error: 'Создатель не найден' };

    const taskId = this.taskIdCounter++;
    const task = {
      id: taskId,
      cardId: card.id,
      cardName: card.name,
      description: card.description || '',
      type: card.type,
      timer: card.timer || 60,
      creatorSocketId,
      creatorNickname: creator.nickname,
      targetSocketId,
      targetNickname: null,
      startTime: Date.now(),
      expiresAt: card.timer ? Date.now() + (card.timer * 1000) : null,
      completed: false,
      exp: card.exp || 20
    };

    if (card.type === 'both' && targetSocketId) {
      const target = gameState.getPlayer(targetSocketId);
      if (target) {
        task.targetNickname = target.nickname;
        creator.activeTasks.push({ ...task });
        target.activeTasks.push({ ...task });
        console.log(`✅ Задание "на двоих" #${taskId} добавлено: ${creator.nickname} + ${target.nickname}`);
      }
    } 
    else if (card.type === 'other' && targetSocketId) {
      const target = gameState.getPlayer(targetSocketId);
      if (target) {
        task.targetNickname = target.nickname;
        creator.activeTasks.push({ ...task });
        target.activeTasks.push({ ...task });
        console.log(`✅ Задание "на другого" #${taskId} добавлено: создатель=${creator.nickname}, цель=${target.nickname}`);
      }
    }

    if (task.timer) {
      this.setAutoFail(task);
    }

    return { success: true, task };
  }

  createTaskForTwo(card, creatorSocketId, targetSocketId1, targetSocketId2) {
    const creator = gameState.getPlayer(creatorSocketId);
    if (!creator) return { success: false, error: 'Создатель не найден' };

    const target1 = gameState.getPlayer(targetSocketId1);
    const target2 = gameState.getPlayer(targetSocketId2);
    
    if (!target1 || !target2) {
      return { success: false, error: 'Один из игроков не найден' };
    }

    const taskId = this.taskIdCounter++;
    const task = {
      id: taskId,
      cardId: card.id,
      cardName: card.name,
      description: card.description || '',
      type: 'both',
      timer: card.timer || 60,
      creatorSocketId,
      creatorNickname: creator.nickname,
      targetSocketId1,
      targetSocketId2,
      target1Nickname: target1.nickname,
      target2Nickname: target2.nickname,
      startTime: Date.now(),
      expiresAt: card.timer ? Date.now() + (card.timer * 1000) : null,
      completed: false,
      exp: card.exp || 20
    };

    // Добавляем задание ОБОИМ выбранным игрокам
    target1.activeTasks.push({ ...task });
    target2.activeTasks.push({ ...task });
    
    // И создателю показываем
    creator.activeTasks.push({ ...task });

    console.log(`✅ Задание "на двоих" #${taskId} создано для: ${target1.nickname} + ${target2.nickname} (от ${creator.nickname})`);

    if (task.timer) {
      this.setAutoFail(task);
    }

    return { success: true, task };
  }

  setAutoFail(task) {
    const timeout = setTimeout(() => {
      console.log(`⏰ Таймер истек для задания #${task.id} - АВТОПРОВАЛ`);
      this.autoFailTask(task.id);
    }, task.timer * 1000);

    this.activeTimers.set(task.id, timeout);
    console.log(`⏱️ Таймер установлен для задания #${task.id} на ${task.timer} сек`);
  }

  autoFailTask(taskId) {
    console.log(`❌ Автопровал задания #${taskId}`);
    
    const allPlayers = gameState.getAllPlayers();
    let task = null;

    for (const player of allPlayers) {
      const foundTask = player.activeTasks.find(t => t.id === taskId);
      if (foundTask) {
        task = foundTask;
        break;
      }
    }

    if (!task) {
      console.log(`❌ Задание #${taskId} не найдено`);
      return;
    }

    const hpLosers = [];
    
    // Определяем кто теряет HP
    if (task.targetSocketId1 && task.targetSocketId2) {
      // Задание "на двоих" - оба теряют HP
      hpLosers.push(task.targetSocketId1);
      hpLosers.push(task.targetSocketId2);
    } else if (task.type === 'other' && task.targetSocketId) {
      // Задание "на другого" - только цель теряет HP
      hpLosers.push(task.targetSocketId);
    } else if (task.type === 'both' && task.targetSocketId) {
      // Старая логика "на двоих" - оба теряют HP
      hpLosers.push(task.creatorSocketId);
      hpLosers.push(task.targetSocketId);
    }

    const updatedPlayers = [];
    hpLosers.forEach(socketId => {
      const updatedPlayer = playerManager.changeHP(socketId, -40);
      if (updatedPlayer) {
        updatedPlayers.push(updatedPlayer);
        console.log(`💔 -40 HP → ${updatedPlayer.nickname}`);
      }
    });

    this.removeTask(taskId);

    if (this.io) {
      updatedPlayers.forEach(playerData => {
        this.io.to(playerData.socketId).emit('playerUpdate', playerData);
      });
      
      const creator = gameState.getPlayer(task.creatorSocketId);
      if (creator) {
        this.io.to(task.creatorSocketId).emit('playerUpdate', playerManager.getPlayerData(creator));
      }
      
      this.io.emit('playersUpdate', playerManager.getPlayersList());
      this.io.emit('notification', {
        message: `⏰ Время истекло! Задание провалено - ${hpLosers.length > 1 ? 'обоим' : 'игроку'} -40 HP`,
        type: 'task'
      });
    }

    return { success: true, taskId, autoFailed: true };
  }

  taskExists(taskId) {
    const allPlayers = gameState.getAllPlayers();
    for (const player of allPlayers) {
      if (player.activeTasks.find(t => t.id === taskId)) {
        return true;
      }
    }
    return false;
  }

  completeTask(creatorSocketId, taskId) {
    console.log(`✅ Попытка выполнить задание #${taskId} от ${creatorSocketId}`);
    
    const creator = gameState.getPlayer(creatorSocketId);
    if (!creator) {
      console.log(`❌ Создатель не найден`);
      return { success: false, error: 'Создатель не найден' };
    }

    const task = creator.activeTasks.find(t => t.id === taskId);
    if (!task) {
      console.log(`❌ Задание #${taskId} не найдено в activeTasks игрока ${creator.nickname}`);
      console.log(`Активные задания: ${creator.activeTasks.map(t => t.id).join(', ')}`);
      return { success: false, error: 'Задание не найдено' };
    }

    if (task.creatorSocketId !== creatorSocketId) {
      console.log(`❌ Только создатель может завершить задание`);
      return { success: false, error: 'Только создатель может завершить' };
    }

    const expReceivers = [];
    
    // Определяем кто получает EXP
    if (task.targetSocketId1 && task.targetSocketId2) {
      // Задание "на двоих" для двух игроков - оба получают EXP
      expReceivers.push(task.targetSocketId1);
      expReceivers.push(task.targetSocketId2);
      console.log(`✅ Задание "на двоих" - опыт получат: ${task.target1Nickname} и ${task.target2Nickname}`);
    }
    else if (task.type === 'other' && task.targetSocketId) {
      // Задание "на другого" - только цель получает EXP
      expReceivers.push(task.targetSocketId);
      console.log(`✅ Задание "на другого" - опыт получит: ${task.targetNickname}`);
    } else if (task.type === 'both' && task.targetSocketId) {
      // Старая логика "на двоих" - оба получают EXP
      expReceivers.push(task.creatorSocketId);
      expReceivers.push(task.targetSocketId);
      console.log(`✅ Задание "на двоих" (старая) - опыт получат оба`);
    }

    const updatedPlayers = [];
    expReceivers.forEach(socketId => {
      const updatedPlayer = playerManager.addExp(socketId, task.exp);
      if (updatedPlayer) {
        updatedPlayers.push(updatedPlayer);
        console.log(`✅ +${task.exp} EXP → ${updatedPlayer.nickname}`);
      }
    });

    this.removeTask(taskId);
    console.log(`🗑️ Задание #${taskId} удалено`);

    return { 
      success: true, 
      taskId, 
      completed: true,
      updatedPlayers 
    };
  }

  failTask(creatorSocketId, taskId) {
    console.log(`❌ Попытка отклонить задание #${taskId} от ${creatorSocketId}`);
    
    const creator = gameState.getPlayer(creatorSocketId);
    if (!creator) return { success: false, error: 'Создатель не найден' };

    const task = creator.activeTasks.find(t => t.id === taskId);
    if (!task) {
      console.log(`❌ Задание #${taskId} не найдено`);
      return { success: false, error: 'Задание не найдено' };
    }

    if (task.creatorSocketId !== creatorSocketId) {
      return { success: false, error: 'Только создатель может отклонить' };
    }

    const hpLosers = [];
    
    // Определяем кто теряет HP
    if (task.targetSocketId1 && task.targetSocketId2) {
      // Задание "на двоих" для двух игроков - оба теряют HP
      hpLosers.push(task.targetSocketId1);
      hpLosers.push(task.targetSocketId2);
      console.log(`❌ Задание "на двоих" провалено - HP потеряют: ${task.target1Nickname} и ${task.target2Nickname}`);
    }
    else if (task.type === 'other' && task.targetSocketId) {
      // Задание "на другого" - только цель теряет HP
      hpLosers.push(task.targetSocketId);
      console.log(`❌ Задание "на другого" провалено - HP потеряет: ${task.targetNickname}`);
    } else if (task.type === 'both' && task.targetSocketId) {
      // Старая логика "на двоих" - оба теряют HP
      hpLosers.push(task.creatorSocketId);
      hpLosers.push(task.targetSocketId);
      console.log(`❌ Задание "на двоих" (старая) провалено - HP потеряют оба`);
    }

    const updatedPlayers = [];
    hpLosers.forEach(socketId => {
      const updatedPlayer = playerManager.changeHP(socketId, -40);
      if (updatedPlayer) {
        updatedPlayers.push(updatedPlayer);
        console.log(`💔 -40 HP → ${updatedPlayer.nickname}`);
      }
    });

    this.removeTask(taskId);
    console.log(`🗑️ Задание #${taskId} удалено`);

    return { 
      success: true, 
      taskId, 
      failed: true,
      updatedPlayers 
    };
  }

  removeTask(taskId) {
    console.log(`🗑️ Удаление задания #${taskId} у всех игроков`);
    
    const allPlayers = gameState.getAllPlayers();
    
    allPlayers.forEach(player => {
      const before = player.activeTasks.length;
      player.activeTasks = player.activeTasks.filter(t => t.id !== taskId);
      const after = player.activeTasks.length;
      if (before !== after) {
        console.log(`  ✓ Удалено у ${player.nickname}`);
      }
    });

    const timeout = this.activeTimers.get(taskId);
    if (timeout) {
      clearTimeout(timeout);
      this.activeTimers.delete(taskId);
      console.log(`  ✓ Таймер остановлен`);
    }
  }

  /**
   * Проверка и удаление истекших заданий
   */
  cleanupExpiredTasks() {
    console.log('🧽 Проверка истекших заданий...');
    const now = Date.now();
    const allPlayers = gameState.getAllPlayers();
    const expiredTaskIds = new Set();

    // Находим все истекшие задания
    allPlayers.forEach(player => {
      player.activeTasks.forEach(task => {
        if (task.expiresAt && task.expiresAt < now) {
          expiredTaskIds.add(task.id);
          console.log(`  ⏰ Задание #${task.id} истекло (${Math.floor((now - task.expiresAt) / 1000)} сек назад)`);
        }
      });
    });

    // Удаляем истекшие задания без наказания (игроков не было онлайн)
    expiredTaskIds.forEach(taskId => {
      this.removeTask(taskId);
    });

    if (expiredTaskIds.size > 0) {
      console.log(`✅ Удалено ${expiredTaskIds.size} истекших заданий`);
      
      // Обновляем всех игроков
      if (this.io) {
        this.io.emit('playersUpdate', playerManager.getPlayersList());
      }
    } else {
      console.log('✅ Истекших заданий нет');
    }

    return expiredTaskIds.size;
  }
}

module.exports = new TaskManager();
