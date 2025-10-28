/**
 * Главный файл - СО ЗВУКАМИ И ВИБРАЦИЕЙ
 */

import socket from './modules/socket.js';
import ui from './modules/ui.js';
import playerUI from './modules/playerUI.js';
import cardsUI from './modules/cardsUI.js';
import tasksUI from './modules/tasksUI.js';
import playersListUI from './modules/playersListUI.js';
import eventsUI from './modules/eventsUI.js';
import avatarUpload from './modules/avatarUpload.js';
import sounds from './utils/sounds.js';
import vibration from './utils/vibration.js';
import buttonTimers from './utils/buttonTimers.js';
import { getElement, showError } from './utils/helpers.js';

class Game {
  constructor() {
    this.currentPlayer = null;
    this.init();
  }

  init() {
    console.log('🎮 Инициализация игры...');

    socket.connect();
    ui.initModalHandlers();

    this.initLoginHandlers();
    this.initAdminHandlers();
    this.initSocketHandlers();
    this.initCardHandlers();
    this.initRequestButtons();

    window.completeTask = (taskId) => {
      socket.completeTask(taskId);
    };

    window.failTask = (taskId) => {
      socket.failTask(taskId);
    };

    window.acceptRoleRequest = (requestId) => {
      socket.acceptRequest(requestId);
    };

    window.declineRoleRequest = (requestId) => {
      socket.declineRequest(requestId);
    };
  }

  initLoginHandlers() {
    const joinBtn = getElement('joinBtn');
    const nicknameInput = getElement('nicknameInput');

    if (joinBtn && nicknameInput) {
      joinBtn.addEventListener('click', () => {
        const nickname = nicknameInput.value.trim();
        if (nickname.length < 2) {
          showError('Никнейм должен быть минимум 2 символа');
          vibration.short();
          return;
        }
        socket.join(nickname);
      });

      nicknameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          joinBtn.click();
        }
      });
    }
  }

  initAdminHandlers() {
    const assignRolesBtn = getElement('adminAssignRolesBtn');
    const dealCardsBtn = getElement('adminDealCardsBtn');
    const showLikesBtn = getElement('showLikesBtn');
    const resetBtn = getElement('adminResetBtn');

    if (assignRolesBtn) {
      assignRolesBtn.addEventListener('click', () => {
        ui.showRolesModal();
      });
    }

    if (dealCardsBtn) {
      dealCardsBtn.addEventListener('click', () => {
        socket.adminDealCards();
      });
    }

    if (showLikesBtn) {
      showLikesBtn.addEventListener('click', () => {
        this.showLikesModal();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Вы уверены, что хотите перезапустить игру?')) {
          socket.adminResetGame();
        }
      });
    }
  }

  showLikesModal() {
    const players = window.playersListData || [];
    const modal = getElement('likesModal');
    const statsList = getElement('likesStatsList');
    
    if (!modal || !statsList) return;

    statsList.innerHTML = '';

    if (players.length === 0) {
      statsList.innerHTML = '<p style="opacity:0.7;">Нет игроков</p>';
    } else {
      players.forEach(player => {
        const likedBy = player.likedBy || [];
        const item = document.createElement('div');
        item.className = 'likes-stats-item';
        item.innerHTML = `
          <div class="likes-stats-name">${player.nickname}</div>
          <div class="likes-stats-count">👍 ${player.likes} лайков</div>
          <div class="likes-stats-by">От: ${likedBy.length > 0 ? likedBy.join(', ') : 'никого'}</div>
        `;
        statsList.appendChild(item);
      });
    }

    modal.classList.add('active');
  }

  initCardHandlers() {
    cardsUI.setCardSelectHandler((card, isRoleCard) => {
      if (this.currentPlayer && this.currentPlayer.hp <= 0) {
        cardsUI.showNeedsHealingMessage();
        vibration.fail();
        return;
      }
      ui.showTargetModal(card, isRoleCard);
    });
  }

  initRequestButtons() {
    const healBtn = getElement('requestHealBtn');
    const cardsBtn = getElement('requestCardsBtn');
    const musicBtn = getElement('requestMusicBtn');

    // Инициализируем кнопки с таймерами
    if (healBtn) {
      buttonTimers.initButton('heal', healBtn);
      
      healBtn.addEventListener('click', () => {
        // Проверяем таймер
        if (!buttonTimers.canUse('heal')) {
          const timeLeft = buttonTimers.getTimeLeft('heal');
          const minutes = Math.floor(timeLeft / 60000);
          const seconds = Math.floor((timeLeft % 60000) / 1000);
          showError(`Подождите ещё ${minutes}:${seconds.toString().padStart(2, '0')}`);
          vibration.fail();
          return;
        }

        socket.sendRequestToRole('healer', 'heal');
        sounds.notification();
        vibration.short();
        
        // Запускаем таймер
        buttonTimers.startTimer('heal', healBtn);
      });
    }

    if (cardsBtn) {
      buttonTimers.initButton('cards', cardsBtn);
      
      cardsBtn.addEventListener('click', () => {
        if (this.currentPlayer && this.currentPlayer.hp <= 0) {
          cardsUI.showNeedsHealingMessage();
          vibration.fail();
          return;
        }
        
        // Проверяем таймер
        if (!buttonTimers.canUse('cards')) {
          const timeLeft = buttonTimers.getTimeLeft('cards');
          const minutes = Math.floor(timeLeft / 60000);
          const seconds = Math.floor((timeLeft % 60000) / 1000);
          showError(`Подождите ещё ${minutes}:${seconds.toString().padStart(2, '0')}`);
          vibration.fail();
          return;
        }
        
        socket.sendRequestToRole('dealer', 'cards');
        sounds.notification();
        vibration.short();
        
        // Запускаем таймер
        buttonTimers.startTimer('cards', cardsBtn);
      });
    }

    if (musicBtn) {
      buttonTimers.initButton('music', musicBtn);
      
      musicBtn.addEventListener('click', () => {
        if (this.currentPlayer && this.currentPlayer.hp <= 0) {
          cardsUI.showNeedsHealingMessage();
          vibration.fail();
          return;
        }
        
        // Проверяем таймер
        if (!buttonTimers.canUse('music')) {
          const timeLeft = buttonTimers.getTimeLeft('music');
          const minutes = Math.floor(timeLeft / 60000);
          const seconds = Math.floor((timeLeft % 60000) / 1000);
          showError(`Подождите ещё ${minutes}:${seconds.toString().padStart(2, '0')}`);
          vibration.fail();
          return;
        }
        
        socket.sendRequestToRole('dj', 'music');
        sounds.notification();
        vibration.short();
        
        // Запускаем таймер
        buttonTimers.startTimer('music', musicBtn);
      });
    }
  }

  initSocketHandlers() {
    socket.on('joinSuccess', (player) => {
      console.log('✅ Вход успешен:', player);
      this.currentPlayer = player;
      window.currentPlayerSocketId = player.socketId;
      ui.hideModal('loginModal');
      
      // Звук и вибрация входа
      sounds.join();
      vibration.success();
      
      const gameContainer = getElement('gameContainer');
      if (gameContainer) {
        gameContainer.style.display = 'grid';
      }
      
      playerUI.show();
      playersListUI.setCurrentPlayer(player.socketId);

      if (player.role === 'admin') {
        ui.showAdminPanel();
        eventsUI.setAdmin(true);
        sounds.admin(); // Особый звук для админа
        vibration.pattern();
      }
    });

    socket.on('joinError', (data) => {
      console.error('❌ Ошибка входа:', data.message);
      showError(data.message || 'Ошибка при входе');
      
      // Звук и вибрация ошибки
      sounds.fail();
      vibration.fail();
      
      const loginModal = getElement('loginModal');
      if (loginModal) {
        loginModal.classList.add('active');
      }
      
      const nicknameInput = getElement('nicknameInput');
      if (nicknameInput) {
        nicknameInput.value = '';
        nicknameInput.focus();
      }
    });

    socket.on('playersCount', (count) => {
      console.log('👥 Игроков онлайн:', count);
      const countElement = getElement('onlineCount');
      if (countElement) {
        countElement.textContent = count;
      }
    });

    socket.on('gameState', (state) => {
      console.log('📊 Состояние игры:', state);
      if (state.you) {
        this.updatePlayer(state.you);
      }
      if (state.players) {
        playersListUI.render(state.players);
        window.playersListData = state.players;
      }
    });

    socket.on('playerUpdate', (player) => {
      console.log('🔄 Обновление игрока:', player);
      
      // Проверяем - изменилось ли HP
      if (this.currentPlayer && player.socketId === this.currentPlayer.socketId) {
        const oldHP = this.currentPlayer.hp;
        const newHP = player.hp;
        
        // HP упало до 0
        if (newHP === 0 && oldHP > 0) {
          sounds.fail();
          vibration.critical();
        }
        // HP восстановилось
        else if (newHP > oldHP) {
          sounds.success();
          vibration.short();
        }
        // HP упало
        else if (newHP < oldHP) {
          sounds.notification();
          vibration.short();
        }
      }
      
      this.updatePlayer(player);
    });

    socket.on('playersUpdate', (players) => {
      console.log('👥 Обновление списка игроков:', players);
      playersListUI.render(players);
      window.playersListData = players;
    });

    socket.on('notification', (data) => {
      console.log('📢 Уведомление:', data);
      eventsUI.addEvent(data.message, data.type);
      
      // Звуки и вибрация в зависимости от типа события
      switch(data.type) {
        case 'task':
          if (data.message.includes('выполнено')) {
            sounds.success();
            vibration.success();
          } else {
            sounds.fail();
            vibration.fail();
          }
          break;
        case 'card':
          sounds.card();
          vibration.short();
          break;
        case 'like':
          sounds.like();
          vibration.like();
          break;
        case 'admin':
          if (data.message.includes('раздал')) {
            sounds.deal();
            vibration.pattern();
          } else {
            sounds.admin();
            vibration.short();
          }
          break;
        case 'join':
        case 'reconnect':
          sounds.join();
          vibration.short();
          break;
        default:
          sounds.notification();
          vibration.short();
      }
    });

    socket.on('error', (data) => {
      console.error('❌ Ошибка:', data);
      
      sounds.fail();
      vibration.fail();
      
      if (data.needsHealing) {
        cardsUI.showNeedsHealingMessage();
        vibration.critical();
      } else {
        showError(data.message || 'Произошла ошибка');
      }
    });
  }

  updatePlayer(playerData) {
    this.currentPlayer = playerData;
    window.currentPlayerSocketId = playerData.socketId;
    
    cardsUI.setPlayerHP(playerData.hp);
    
    playerUI.updatePlayer(playerData);
    cardsUI.renderActionCards(playerData.actionCards || []);
    cardsUI.renderRoleCards(playerData.roleCards || [], playerData.role);
    tasksUI.renderActiveTasks(playerData.activeTasks || [], playerData.socketId);

    if (playerData.role === 'admin') {
      ui.showAdminPanel();
      eventsUI.setAdmin(true);
    } else {
      ui.hideAdminPanel();
      eventsUI.setAdmin(false);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new Game();
});
