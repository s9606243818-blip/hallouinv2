/**
 * Управление картами - С ПРОВЕРКОЙ HP
 */

const gameState = require('./gameState');

class CardManager {
  constructor() {
    this.actionCards = require('../data/actionCards');
    this.roleCards = require('../data/roleCards');
    this.adminCards = require('../data/adminCards');
    this.deck = [...this.actionCards];
    this.shuffleDeck();
  }

  shuffleDeck() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  dealInitialCards(socketId) {
    return this.dealCards(socketId, 5);
  }

  dealCards(socketId, count = 2) {
    const player = gameState.getPlayer(socketId);
    if (!player) return { success: false, error: 'Игрок не найден' };

    if (player.actionCards.length + count > 10) {
      count = 10 - player.actionCards.length;
    }

    if (count <= 0) {
      return { success: false, error: 'У вас максимум карт (10)' };
    }

    if (this.deck.length < count) {
      this.deck = [...this.actionCards];
      this.shuffleDeck();
    }

    const newCards = this.deck.splice(0, count);
    player.actionCards.push(...newCards);

    return { 
      success: true, 
      cards: newCards,
      totalCards: player.actionCards.length
    };
  }

  dealCardsToAll(adminSocketId, count = 2) {
    if (!gameState.isAdmin(adminSocketId)) {
      return { success: false, error: 'Только админ может раздавать карты всем' };
    }

    const players = gameState.getAllPlayers();
    const results = [];

    players.forEach(player => {
      const result = this.dealCards(player.socketId, count);
      if (result.success) {
        results.push({
          nickname: player.nickname,
          cardsCount: result.cards.length
        });
      }
    });

    return { success: true, results };
  }

  useActionCard(socketId, cardId, targetSocketId = null) {
    const player = gameState.getPlayer(socketId);
    if (!player) return { success: false, error: 'Игрок не найден' };

    // КРИТИЧНО: Проверка HP
    if (player.hp <= 0) {
      return { 
        success: false, 
        error: 'У вас закончились жизни! Нажмите кнопку "Запросить лечение" чтобы продолжить игру',
        needsHealing: true 
      };
    }

    const cardIndex = player.actionCards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
      return { success: false, error: 'Карта не найдена' };
    }

    const card = player.actionCards[cardIndex];

    // 🚫 Специальная логика для карты "Отмена задания"
    if (card.type === 'cancel_task') {
      // Проверяем есть ли активные задания
      if (!player.activeTasks || player.activeTasks.length === 0) {
        return { success: false, error: 'Нет активных заданий' };
      }

      // Получаем последнее (самое новое) задание
      const lastTask = player.activeTasks[player.activeTasks.length - 1];

      // Игнорируем запросы к ролям (role_request)
      if (lastTask.type === 'role_request') {
        return { success: false, error: 'Нельзя отменить запросы к ролям' };
      }

      player.actionCards.splice(cardIndex, 1);

      return {
        success: true,
        card,
        isCancelTask: true,
        taskToCancel: lastTask
      };
    }

    if (card.type === 'other' && !targetSocketId) {
      return { success: false, error: 'Нужно выбрать цель' };
    }

    player.actionCards.splice(cardIndex, 1);
    player.exp += 5;

    return {
      success: true,
      card,
      targetSocketId
    };
  }

  useRoleCard(socketId, cardId, targetSocketId = null) {
    const player = gameState.getPlayer(socketId);
    if (!player) return { success: false, error: 'Игрок не найден' };

    // КРИТИЧНО: Проверка HP (роли тоже не могут использовать карты при 0 HP)
    if (player.hp <= 0) {
      return { 
        success: false, 
        error: 'У вас закончились жизни! Нажмите кнопку "Запросить лечение" чтобы продолжить игру',
        needsHealing: true 
      };
    }

    const cardIndex = player.roleCards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
      return { success: false, error: 'Карта роли не найдена' };
    }

    const card = player.roleCards[cardIndex];

    player.roleCards.splice(cardIndex, 1);

    if (player.role && this.roleCards[player.role]) {
      const roleCardsDeck = this.roleCards[player.role];
      const randomCard = roleCardsDeck[Math.floor(Math.random() * roleCardsDeck.length)];
      player.roleCards.push(randomCard);
    }

    return {
      success: true,
      card,
      targetSocketId
    };
  }

  getAdminCard(adminSocketId) {
    if (!gameState.isAdmin(adminSocketId)) {
      return { success: false, error: 'Только админ может использовать админские карты' };
    }

    const randomCard = this.adminCards[Math.floor(Math.random() * this.adminCards.length)];
    
    return {
      success: true,
      card: randomCard
    };
  }

  giveCancelCard(adminSocketId, targetSocketId) {
    if (!gameState.isAdmin(adminSocketId)) {
      return { success: false, error: 'Только админ может выдавать карты' };
    }

    const target = gameState.getPlayer(targetSocketId);
    if (!target) {
      return { success: false, error: 'Игрок не найден' };
    }

    if (target.actionCards.length >= 10) {
      return { success: false, error: 'У игрока максимум карт (10)' };
    }

    // Карта "Отмена задания"
    const cancelCard = {
      id: 102,
      name: "🚫 ОТМЕНА ЗАДАНИЯ",
      type: "cancel_task",
      timer: 0,
      exp: 0,
      description: "Отменяет последнее активное задание. Отправитель -20 HP"
    };

    target.actionCards.push(cancelCard);

    return {
      success: true,
      targetNickname: target.nickname
    };
  }
}

module.exports = new CardManager();
