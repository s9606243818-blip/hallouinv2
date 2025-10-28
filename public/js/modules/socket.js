/**
 * Socket.IO клиент - С ПОДДЕРЖКОЙ ЗАДАНИЙ НА ДВОИХ
 */

class SocketClient {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.handlers = new Map();
  }

  connect() {
    this.socket = io();
    
    this.socket.on('connect', () => {
      console.log('✅ Подключено к серверу');
      this.connected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Отключено от сервера');
      this.connected = false;
    });

    this.socket.on('error', (data) => {
      console.error('Socket error:', data);
      if (this.handlers.has('error')) {
        this.handlers.get('error')(data);
      }
    });

    return this;
  }

  on(event, handler) {
    this.handlers.set(event, handler);
    this.socket.on(event, handler);
  }

  emit(event, data) {
    if (this.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket не подключен');
    }
  }

  join(nickname, avatar = null) {
    this.emit('join', { nickname, avatar });
  }

  useActionCard(cardId, targetSocketId = null) {
    this.emit('useActionCard', { cardId, targetSocketId });
  }

  // НОВОЕ: для карт "на двоих" - отправка двум игрокам
  useActionCardForTwo(cardId, targetSocketId1, targetSocketId2) {
    this.emit('useActionCardForTwo', { cardId, targetSocketId1, targetSocketId2 });
  }

  useRoleCard(cardId, targetSocketId = null) {
    this.emit('useRoleCard', { cardId, targetSocketId });
  }

  completeTask(taskId) {
    this.emit('completeTask', { taskId });
  }

  failTask(taskId) {
    this.emit('failTask', { taskId });
  }

  sendRequestToRole(role, requestType) {
    this.emit('sendRequestToRole', { role, requestType });
  }

  acceptRequest(requestId) {
    this.emit('acceptRequest', { requestId });
  }

  declineRequest(requestId) {
    this.emit('declineRequest', { requestId });
  }

  likePlayer(targetSocketId) {
    this.emit('likePlayer', { targetSocketId });
  }

  updateAvatar(avatarPath) {
    this.emit('updateAvatar', { avatarPath });
  }

  adminAssignRole(targetSocketId, role) {
    this.emit('adminAssignRole', { targetSocketId, role });
  }

  adminDealCards() {
    this.emit('adminDealCards');
  }

  adminResetGame() {
    this.emit('adminResetGame');
  }
}

export default new SocketClient();
