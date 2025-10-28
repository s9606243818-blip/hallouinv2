/**
 * Константы приложения
 */

export const ROLES = {
  ADMIN: 'admin',
  BARTENDER: 'bartender',
  HEALER: 'healer',
  DEALER: 'dealer',
  DJ: 'dj'
};

export const ROLE_NAMES = {
  admin: '👑 Админ',
  bartender: '🍺 Бармен',
  healer: '⚕️ Целитель',
  dealer: '🎴 Дилер',
  dj: '🎵 Диджей'
};

export const CARD_TYPES = {
  SELF: 'self',
  OTHER: 'other',
  BOTH: 'both',
  ALL: 'all'
};

export const EVENT_TYPES = {
  JOIN: 'join',
  LEAVE: 'leave',
  CARD: 'card',
  TASK: 'task',
  LIKE: 'like',
  ADMIN: 'admin',
  ROLE: 'role'
};

export const MAX_ACTION_CARDS = 10;
export const MAX_ROLE_CARDS = 1;
