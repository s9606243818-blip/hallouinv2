/**
 * Система запросов - ИСПРАВЛЕНА ПРОВЕРКА РОЛЕЙ
 */

const gameState = require('./gameState');
const playerManager = require('./playerManager');
const cardManager = require('./cardManager');

class RequestSystem {
  constructor() {
    this.requestIdCounter = 1;
    this.djCooldowns = new Map(); // socketId -> timestamp
  }

  createRequest(fromSocketId, targetRole, requestType) {
    const requester = gameState.getPlayer(fromSocketId);
    if (!requester) return { success: false, error: 'Игрок не найден' };

    // Проверка кулдауна для DJ
    if (requestType === 'music') {
      const lastRequest = this.djCooldowns.get(fromSocketId);
      const cooldown = 30 * 60 * 1000; // 30 минут
      
      if (lastRequest && Date.now() - lastRequest < cooldown) {
        const remaining = Math.ceil((cooldown - (Date.now() - lastRequest)) / 60000);
        return { 
          success: false, 
          error: `Можно запросить трек через ${remaining} мин` 
        };
      }
    }

    console.log(`📨 Создание запроса к ${targetRole} от ${requester.nickname}`);

    // Найти игроков с этой ролью - КРИТИЧНО: проверка на строгое равенство
    const roleHolders = gameState.getAllPlayers().filter(p => {
      console.log(`Проверка игрока ${p.nickname}: роль = ${p.role}`);
      return p.role === targetRole;
    });
    
    console.log(`Найдено игроков с ролью ${targetRole}: ${roleHolders.length}`);
    
    if (roleHolders.length === 0) {
      return { success: false, error: `Нет игроков с ролью ${targetRole}` };
    }

    const requestId = this.requestIdCounter++;
    
    const taskNames = {
      heal: '⚕️ Вылечить игрока',
      cards: '🎴 Выдать карты игроку',
      music: '🎵 Включить трек для игрока'
    };

    const task = {
      id: requestId,
      cardName: taskNames[requestType] || 'Запрос',
      type: 'role_request',
      requestType,
      fromSocketId,
      fromNickname: requester.nickname,
      createdAt: Date.now(),
      timer: null,
      expiresAt: null
    };

    // Добавить задание в activeTasks каждого игрока с ролью
    roleHolders.forEach(rolePlayer => {
      console.log(`Добавление задания игроку ${rolePlayer.nickname}`);
      rolePlayer.activeTasks.push({ ...task, creatorSocketId: rolePlayer.socketId });
    });

    // Установить кулдаун для DJ
    if (requestType === 'music') {
      this.djCooldowns.set(fromSocketId, Date.now());
    }

    return { 
      success: true, 
      request: task,
      roleHolders: roleHolders.map(p => p.socketId)
    };
  }

  acceptRequest(requestId, acceptorSocketId) {
    const acceptor = gameState.getPlayer(acceptorSocketId);
    if (!acceptor) return { success: false, error: 'Игрок не найден' };

    const taskIndex = acceptor.activeTasks.findIndex(t => t.id === requestId);
    if (taskIndex === -1) {
      return { success: false, error: 'Задание не найдено' };
    }

    const task = acceptor.activeTasks[taskIndex];
    const requester = gameState.getPlayer(task.fromSocketId);
    if (!requester) return { success: false, error: 'Запросивший не найден' };

    acceptor.activeTasks.splice(taskIndex, 1);

    const roleHolders = gameState.getAllPlayers().filter(p => p.role === acceptor.role);
    roleHolders.forEach(rp => {
      rp.activeTasks = rp.activeTasks.filter(t => t.id !== requestId);
    });

    let result = { success: true, request: task };

    if (task.requestType === 'heal') {
      playerManager.changeHP(task.fromSocketId, 30);
      playerManager.addExp(acceptorSocketId, 20);
      result.action = 'healed';
    } 
    else if (task.requestType === 'cards') {
      cardManager.dealCards(task.fromSocketId, 2);
      playerManager.addExp(acceptorSocketId, 20);
      result.action = 'dealt_cards';
    }
    else if (task.requestType === 'music') {
      playerManager.addExp(acceptorSocketId, 20);
      result.action = 'played_music';
    }

    return result;
  }

  declineRequest(requestId, declinerSocketId) {
    const decliner = gameState.getPlayer(declinerSocketId);
    if (!decliner) return { success: false, error: 'Игрок не найден' };

    const taskIndex = decliner.activeTasks.findIndex(t => t.id === requestId);
    if (taskIndex === -1) {
      return { success: false, error: 'Задание не найдено' };
    }

    const task = decliner.activeTasks[taskIndex];
    const requester = gameState.getPlayer(task.fromSocketId);
    if (!requester) return { success: false, error: 'Запросивший не найден' };

    decliner.activeTasks.splice(taskIndex, 1);

    const roleHolders = gameState.getAllPlayers().filter(p => p.role === decliner.role);
    roleHolders.forEach(rp => {
      rp.activeTasks = rp.activeTasks.filter(t => t.id !== requestId);
    });

    // Все роли наказывают одинаково: -40 HP
    if (task.requestType === 'heal' || 
        task.requestType === 'cards' || 
        task.requestType === 'music') {
      playerManager.changeHP(task.fromSocketId, -40);
    }

    return { 
      success: true, 
      request: task 
    };
  }
}

module.exports = new RequestSystem();
