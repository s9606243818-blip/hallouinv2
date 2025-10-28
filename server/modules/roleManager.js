/**
 * Управление ролями
 * Назначение и проверка ролей игроков
 */

const gameState = require('./gameState');

const ROLES = {
  ADMIN: 'admin',
  BARTENDER: 'bartender',
  HEALER: 'healer',
  DEALER: 'dealer',
  DJ: 'dj'
};

class RoleManager {
  
  // Назначить роль игроку (только админ)
  assignRole(adminSocketId, targetSocketId, role) {
    // Проверка прав админа
    if (!gameState.isAdmin(adminSocketId)) {
      return { success: false, error: 'Только админ может назначать роли' };
    }

    const player = gameState.getPlayer(targetSocketId);
    if (!player) {
      return { success: false, error: 'Игрок не найден' };
    }

    // Нельзя изменить роль админа
    if (player.role === ROLES.ADMIN) {
      return { success: false, error: 'Нельзя изменить роль админа' };
    }

    // Назначить роль
    gameState.updatePlayer(targetSocketId, { role });

    // Добавить карту роли
    const roleCard = this.getRoleCard(role);
    if (roleCard) {
      player.roleCards = [roleCard];
    }

    return { 
      success: true, 
      player: player.nickname,
      role 
    };
  }

  // Получить стартовую карту роли
  getRoleCard(role) {
    const roleCards = require('../data/roleCards');
    
    if (roleCards[role] && roleCards[role].length > 0) {
      return roleCards[role][0];
    }
    
    return null;
  }

  // Проверить, имеет ли игрок роль
  hasRole(socketId, role) {
    const player = gameState.getPlayer(socketId);
    return player && player.role === role;
  }

  // Получить список доступных ролей
  getAvailableRoles() {
    return Object.values(ROLES).filter(role => role !== ROLES.ADMIN);
  }
}

module.exports = new RoleManager();
module.exports.ROLES = ROLES;
