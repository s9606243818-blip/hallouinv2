/**
 * Socket.IO обработчики - С ПРОВЕРКОЙ ДУБЛИКАТОВ НИКОВ
 */

const gameState = require('./gameState');
const playerManager = require('./playerManager');
const roleManager = require('./roleManager');
const cardManager = require('./cardManager');
const taskManager = require('./taskManager');
const likeSystem = require('./likeSystem');
const requestSystem = require('./requestSystem');

function setupSocketHandlers(io) {
  
  taskManager.setIO(io);
  
  function broadcastPlayersCount() {
    const count = gameState.getAllPlayers().length;
    io.emit('playersCount', count);
  }
  
  io.on('connection', (socket) => {
    console.log(`Новое подключение: ${socket.id}`);
    
    socket.emit('playersCount', gameState.getAllPlayers().length);

    socket.on('join', (data) => {
      const { nickname, avatar } = data;
      const result = playerManager.joinPlayer(socket.id, nickname, avatar);
      
      if (result.success) {
        cardManager.dealInitialCards(socket.id);
        const player = gameState.getPlayer(socket.id);
        
        socket.emit('joinSuccess', playerManager.getPlayerData(player));
        socket.emit('gameState', {
          players: playerManager.getPlayersList(),
          you: playerManager.getPlayerData(player)
        });
        
        io.emit('playersUpdate', playerManager.getPlayersList());
        broadcastPlayersCount();
        
        io.emit('notification', {
          message: `${nickname} присоединился к игре`,
          type: 'join'
        });
      } else {
        // ❌ Ошибка - ник занят!
        console.log(`⚠️ Отклонен вход для ${nickname}: ${result.error}`);
        socket.emit('joinError', { 
          message: result.error 
        });
      }
    });

    socket.on('useActionCard', (data) => {
      const { cardId, targetSocketId } = data;
      const result = cardManager.useActionCard(socket.id, cardId, targetSocketId);
      
      if (result.success) {
        const taskResult = taskManager.createTask(result.card, socket.id, targetSocketId);
        
        if (taskResult.success) {
          const player = gameState.getPlayer(socket.id);
          socket.emit('playerUpdate', playerManager.getPlayerData(player));
          
          if (targetSocketId) {
            const target = gameState.getPlayer(targetSocketId);
            io.to(targetSocketId).emit('playerUpdate', playerManager.getPlayerData(target));
          }
          
          io.emit('notification', {
            message: `${player.nickname} использовал карту: ${result.card.name}`,
            type: 'card'
          });
        }
      } else {
        socket.emit('error', { message: result.error });
      }
    });

    socket.on('useActionCardForTwo', (data) => {
      const { cardId, targetSocketId1, targetSocketId2 } = data;
      const result = cardManager.useActionCard(socket.id, cardId);
      
      if (result.success) {
        const taskResult = taskManager.createTaskForTwo(result.card, socket.id, targetSocketId1, targetSocketId2);
        
        if (taskResult.success) {
          const player = gameState.getPlayer(socket.id);
          const target1 = gameState.getPlayer(targetSocketId1);
          const target2 = gameState.getPlayer(targetSocketId2);
          
          socket.emit('playerUpdate', playerManager.getPlayerData(player));
          io.to(targetSocketId1).emit('playerUpdate', playerManager.getPlayerData(target1));
          io.to(targetSocketId2).emit('playerUpdate', playerManager.getPlayerData(target2));
          
          io.emit('notification', {
            message: `${player.nickname} дал задание: ${result.card.name} для ${target1.nickname} и ${target2.nickname}`,
            type: 'card'
          });
        }
      } else {
        socket.emit('error', { message: result.error });
      }
    });

    socket.on('useRoleCard', (data) => {
      const { cardId, targetSocketId } = data;
      const result = cardManager.useRoleCard(socket.id, cardId, targetSocketId);
      
      if (result.success) {
        const player = gameState.getPlayer(socket.id);
        
        if (result.card.action === 'serve_self') {
          const drinkCard = {
            id: result.card.id,
            name: '🍺 Выпей напиток',
            type: 'other',
            timer: 30,
            exp: 10
          };
          taskManager.createTask(drinkCard, socket.id, socket.id);
          socket.emit('playerUpdate', playerManager.getPlayerData(player));
          io.emit('notification', {
            message: `${player.nickname} налил себе напиток`,
            type: 'role'
          });
        }
        else if (result.card.action === 'serve_other' && targetSocketId) {
          const drinkCard = {
            id: result.card.id,
            name: '🍺 Выпей напиток от бармена',
            type: 'other',
            timer: 30,
            exp: 10
          };
          taskManager.createTask(drinkCard, socket.id, targetSocketId);
          const target = gameState.getPlayer(targetSocketId);
          io.to(targetSocketId).emit('playerUpdate', playerManager.getPlayerData(target));
          socket.emit('playerUpdate', playerManager.getPlayerData(player));
          io.emit('notification', {
            message: `${player.nickname} налил напиток для игрока`,
            type: 'role'
          });
        }
        else if (result.card.action === 'serve_all') {
          const allPlayers = gameState.getAllPlayers();
          allPlayers.forEach(p => {
            const drinkCard = {
              id: result.card.id + p.socketId,
              name: '🍺 Выпей шот от бармена',
              type: 'other',
              timer: 30,
              exp: 10
            };
            taskManager.createTask(drinkCard, socket.id, p.socketId);
            io.to(p.socketId).emit('playerUpdate', playerManager.getPlayerData(p));
          });
          socket.emit('playerUpdate', playerManager.getPlayerData(player));
          io.emit('notification', {
            message: `${player.nickname} налил всем по шоту!`,
            type: 'role'
          });
        }
      } else {
        socket.emit('error', { message: result.error });
      }
    });

    socket.on('completeTask', (data) => {
      const { taskId } = data;
      
      const creator = gameState.getPlayer(socket.id);
      if (!creator) {
        socket.emit('error', { message: 'Создатель не найден' });
        return;
      }
      
      const task = creator.activeTasks.find(t => t.id === taskId);
      if (!task) {
        socket.emit('error', { message: 'Задание не найдено' });
        return;
      }
      
      const participantIds = new Set();
      participantIds.add(task.creatorSocketId);
      if (task.targetSocketId) participantIds.add(task.targetSocketId);
      if (task.targetSocketId1) participantIds.add(task.targetSocketId1);
      if (task.targetSocketId2) participantIds.add(task.targetSocketId2);
      
      const result = taskManager.completeTask(socket.id, taskId);
      
      if (result.success) {
        participantIds.forEach(participantId => {
          const participant = gameState.getPlayer(participantId);
          if (participant) {
            io.to(participantId).emit('playerUpdate', playerManager.getPlayerData(participant));
          }
        });
        
        io.emit('playersUpdate', playerManager.getPlayersList());
        io.emit('notification', {
          message: `Задание выполнено! +20 EXP`,
          type: 'task'
        });
      } else {
        socket.emit('error', { message: result.error });
      }
    });

    socket.on('failTask', (data) => {
      const { taskId } = data;
      
      const creator = gameState.getPlayer(socket.id);
      if (!creator) {
        socket.emit('error', { message: 'Создатель не найден' });
        return;
      }
      
      const task = creator.activeTasks.find(t => t.id === taskId);
      if (!task) {
        socket.emit('error', { message: 'Задание не найдено' });
        return;
      }
      
      const participantIds = new Set();
      participantIds.add(task.creatorSocketId);
      if (task.targetSocketId) participantIds.add(task.targetSocketId);
      if (task.targetSocketId1) participantIds.add(task.targetSocketId1);
      if (task.targetSocketId2) participantIds.add(task.targetSocketId2);
      
      const result = taskManager.failTask(socket.id, taskId);
      
      if (result.success) {
        participantIds.forEach(participantId => {
          const participant = gameState.getPlayer(participantId);
          if (participant) {
            io.to(participantId).emit('playerUpdate', playerManager.getPlayerData(participant));
          }
        });
        
        io.emit('playersUpdate', playerManager.getPlayersList());
        io.emit('notification', {
          message: `Задание не выполнено! -40 HP`,
          type: 'task'
        });
      } else {
        socket.emit('error', { message: result.error });
      }
    });

    socket.on('sendRequestToRole', (data) => {
      const { role, requestType } = data;
      const result = requestSystem.createRequest(socket.id, role, requestType);
      
      if (result.success) {
        result.roleHolders.forEach(roleSocketId => {
          const rolePlayer = gameState.getPlayer(roleSocketId);
          io.to(roleSocketId).emit('playerUpdate', playerManager.getPlayerData(rolePlayer));
        });
        
        socket.emit('notification', {
          message: `Запрос отправлен к ${role}`,
          type: 'request'
        });
      } else {
        socket.emit('error', { message: result.error });
      }
    });

    socket.on('acceptRequest', (data) => {
      const { requestId } = data;
      const result = requestSystem.acceptRequest(requestId, socket.id);
      
      if (result.success) {
        const acceptor = gameState.getPlayer(socket.id);
        const requester = gameState.getPlayer(result.request.fromSocketId);
        
        io.to(result.request.fromSocketId).emit('playerUpdate', playerManager.getPlayerData(requester));
        socket.emit('playerUpdate', playerManager.getPlayerData(acceptor));
        
        const actionMessages = {
          healed: `${acceptor.nickname} вылечил ${requester.nickname} на 30 HP`,
          dealt_cards: `${acceptor.nickname} выдал ${requester.nickname} 2 карты`,
          played_music: `${acceptor.nickname} включил трек для ${requester.nickname}`
        };
        
        io.emit('notification', {
          message: actionMessages[result.action] || 'Запрос выполнен',
          type: 'role'
        });
        
        io.emit('playersUpdate', playerManager.getPlayersList());
      } else {
        socket.emit('error', { message: result.error });
      }
    });

    socket.on('declineRequest', (data) => {
      const { requestId } = data;
      const result = requestSystem.declineRequest(requestId, socket.id);
      
      if (result.success) {
        const decliner = gameState.getPlayer(socket.id);
        const requester = gameState.getPlayer(result.request.fromSocketId);
        
        io.to(result.request.fromSocketId).emit('playerUpdate', playerManager.getPlayerData(requester));
        socket.emit('playerUpdate', playerManager.getPlayerData(decliner));
        
        io.emit('notification', {
          message: `${decliner.nickname} отклонил запрос от ${requester.nickname}`,
          type: 'request'
        });
      } else {
        socket.emit('error', { message: result.error });
      }
    });

    socket.on('likePlayer', (data) => {
      const { targetSocketId } = data;
      const result = likeSystem.likePlayer(socket.id, targetSocketId);
      
      if (result.success) {
        io.emit('playersUpdate', playerManager.getPlayersList());
        
        const admin = gameState.getAllPlayers().find(p => p.role === 'admin');
        if (admin) {
          io.to(admin.socketId).emit('notification', {
            message: `${result.from} лайкнул ${result.to}`,
            type: 'like'
          });
        }
      } else {
        socket.emit('error', { message: result.error });
      }
    });

    socket.on('updateAvatar', (data) => {
      const { avatarPath } = data;
      const player = gameState.getPlayer(socket.id);
      
      if (player) {
        player.avatar = avatarPath;
        
        const profile = gameState.profiles.get(player.normalizedNickname);
        if (profile) {
          profile.avatar = avatarPath;
        }
        
        io.emit('playersUpdate', playerManager.getPlayersList());
      }
    });

    socket.on('adminAssignRole', (data) => {
      const { targetSocketId, role } = data;
      const result = roleManager.assignRole(socket.id, targetSocketId, role);
      
      if (result.success) {
        const target = gameState.getPlayer(targetSocketId);
        io.to(targetSocketId).emit('playerUpdate', playerManager.getPlayerData(target));
        
        io.emit('playersUpdate', playerManager.getPlayersList());
        
        io.emit('notification', {
          message: `${result.player} получил роль: ${role}`,
          type: 'admin'
        });
      } else {
        socket.emit('error', { message: result.error });
      }
    });

    socket.on('adminDealCards', () => {
      const result = cardManager.dealCardsToAll(socket.id, 2);
      
      if (result.success) {
        const players = gameState.getAllPlayers();
        
        players.forEach(player => {
          io.to(player.socketId).emit('playerUpdate', playerManager.getPlayerData(player));
        });
        
        io.emit('notification', {
          message: `Админ раздал всем по 2 карты`,
          type: 'admin'
        });
      } else {
        socket.emit('error', { message: result.error });
      }
    });

    socket.on('adminResetGame', () => {
      if (gameState.isAdmin(socket.id)) {
        gameState.resetGame();
        const players = gameState.getAllPlayers();
        
        players.forEach(player => {
          io.to(player.socketId).emit('playerUpdate', playerManager.getPlayerData(player));
        });
        
        io.emit('playersUpdate', playerManager.getPlayersList());
        
        io.emit('notification', {
          message: `Игра перезапущена!`,
          type: 'admin'
        });
      }
    });

    socket.on('disconnect', () => {
      const player = gameState.getPlayer(socket.id);
      if (player) {
        const nickname = player.nickname;
        playerManager.leavePlayer(socket.id);
        
        io.emit('playersUpdate', playerManager.getPlayersList());
        broadcastPlayersCount();
        
        io.emit('notification', {
          message: `${nickname} покинул игру`,
          type: 'leave'
        });
      }
      console.log(`Отключение: ${socket.id}`);
    });
  });
}

module.exports = setupSocketHandlers;
