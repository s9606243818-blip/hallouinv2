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
}

module.exports = new CardManager();
