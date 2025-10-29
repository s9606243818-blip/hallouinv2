/**
 * Socket.IO клиент - С ПОДДЕРЖКОЙ МОБИЛЬНЫХ УСТРОЙСТВ И АВТОПОДКЛЮЧЕНИЕМ
 */

class SocketClient {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.handlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
    this.userNickname = null;
    this.userAvatar = null;
    this.isPageVisible = true;
    
    // Инициализация Page Visibility API для обработки блокировки экрана
    this.setupVisibilityHandling();
  }

  /**
   * Настройка обработки видимости страницы (блокировка экрана)
   */
  setupVisibilityHandling() {
    // Определяем правильное имя события в зависимости от браузера
    let hidden, visibilityChange;
    if (typeof document.hidden !== 'undefined') {
      hidden = 'hidden';
      visibilityChange = 'visibilitychange';
    } else if (typeof document.webkitHidden !== 'undefined') {
      hidden = 'webkitHidden';
      visibilityChange = 'webkitvisibilitychange';
    } else if (typeof document.mozHidden !== 'undefined') {
      hidden = 'mozHidden';
      visibilityChange = 'mozvisibilitychange';
    }

    // Обработчик изменения видимости
    document.addEventListener(visibilityChange, () => {
      this.isPageVisible = !document[hidden];
      
      if (this.isPageVisible) {
        console.log('📱 Страница снова видима - проверяем соединение');
        this.handlePageVisible();
      } else {
        console.log('📱 Страница скрыта (экран заблокирован)');
        this.handlePageHidden();
      }
    });

    // Также отслеживаем события focus/blur для дополнительной надёжности
    window.addEventListener('focus', () => {
      console.log('🔆 Окно в фокусе');
      this.handlePageVisible();
    });

    window.addEventListener('blur', () => {
      console.log('🌙 Окно вне фокуса');
    });
  }

  /**
   * Обработка когда страница становится видимой
   */
  handlePageVisible() {
    // Проверяем соединение
    if (!this.connected || !this.socket?.connected) {
      console.log('🔄 Переподключение после возврата на страницу');
      this.reconnect();
    } else {
      // Отправляем ping чтобы убедиться что соединение живо
      this.emit('ping');
    }
  }

  /**
   * Обработка когда страница скрывается
   */
  handlePageHidden() {
    // Не разрываем соединение намеренно
    // Socket.IO сам попытается поддерживать соединение
  }

  connect() {
    console.log('🔌 Подключение к серверу...');
    
    this.socket = io({
      // Важные настройки для мобильных устройств
      reconnection: true,              // Автопереподключение
      reconnectionAttempts: Infinity,  // Бесконечные попытки
      reconnectionDelay: 1000,         // Задержка между попытками (1 сек)
      reconnectionDelayMax: 5000,      // Максимальная задержка (5 сек)
      timeout: 20000,                  // Таймаут подключения (20 сек)
      transports: ['websocket', 'polling'], // Websocket + fallback на polling
      
      // 📱 КРИТИЧНО для мобильных: увеличиваем таймауты до 10 МИНУТ
      pingTimeout: 600000,             // 10 минут до отключения
      pingInterval: 25000,             // Проверка каждые 25 сек
      
      // Дополнительные настройки
      forceNew: false,                 // Повторно использовать существующее соединение
      multiplex: true,                 // Множественные сокеты через одно соединение
    });
    
    this.setupSocketHandlers();
    return this;
  }

  setupSocketHandlers() {
    this.socket.on('connect', () => {
      console.log('✅ Подключено к серверу');
      this.connected = true;
      this.reconnectAttempts = 0;
      
      // Если это переподключение, заново присоединяемся к игре
      if (this.userNickname) {
        console.log('🔄 Переподключение - заново вступаем в игру');
        this.rejoin();
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Отключено от сервера:', reason);
      this.connected = false;
      
      // Автоматическое переподключение уже настроено в socket.io
      // Но можем показать уведомление пользователю
      if (reason === 'io server disconnect') {
        // Сервер принудительно отключил
        console.log('⚠️ Сервер разорвал соединение');
      } else if (reason === 'transport close' || reason === 'transport error') {
        // Проблемы с сетью
        console.log('📡 Проблемы с сетью, переподключаемся...');
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Успешное переподключение (попытка ${attemptNumber})`);
      this.connected = true;
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Попытка переподключения ${attemptNumber}...`);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('❌ Ошибка переподключения:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Не удалось переподключиться');
      this.showConnectionError();
    });

    this.socket.on('error', (data) => {
      console.error('Socket error:', data);
      if (this.handlers.has('error')) {
        this.handlers.get('error')(data);
      }
    });

    // Обработка ping от сервера
    this.socket.on('pong', () => {
      console.log('🏓 Pong получен - соединение живо');
    });
  }

  /**
   * Ручное переподключение
   */
  reconnect() {
    if (this.socket) {
      console.log('🔄 Ручное переподключение...');
      this.socket.connect();
    } else {
      this.connect();
    }
  }

  /**
   * Повторное присоединение к игре после переподключения
   */
  rejoin() {
    if (this.userNickname) {
      console.log('♻️ Повторное вступление в игру:', this.userNickname);
      this.emit('join', { 
        nickname: this.userNickname, 
        avatar: this.userAvatar,
        isRejoin: true // Флаг что это переподключение
      });
    }
  }

  /**
   * Показать ошибку подключения
   */
  showConnectionError() {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'connection-error';
    errorDiv.innerHTML = `
      <div class="connection-error-content">
        <div class="connection-error-icon">📡</div>
        <div class="connection-error-title">Потеряно соединение</div>
        <div class="connection-error-text">Проверьте интернет-соединение</div>
        <button class="connection-error-btn" onclick="location.reload()">Перезагрузить</button>
      </div>
    `;
    document.body.appendChild(errorDiv);
    
    // Автоматически скрыть через 5 секунд
    setTimeout(() => {
      if (this.connected) {
        errorDiv.remove();
      }
    }, 5000);
  }

  on(event, handler) {
    this.handlers.set(event, handler);
    this.socket.on(event, handler);
  }

  emit(event, data) {
    if (this.connected && this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('⚠️ Socket не подключен, событие в очередь:', event);
      // Можно добавить очередь событий для отправки после переподключения
    }
  }

  join(nickname, avatar = null) {
    // Сохраняем данные для переподключения
    this.userNickname = nickname;
    this.userAvatar = avatar;
    
    this.emit('join', { nickname, avatar });
  }

  useActionCard(cardId, targetSocketId = null) {
    this.emit('useActionCard', { cardId, targetSocketId });
  }

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

  adminGiveCancelCard(targetSocketId) {
    this.emit('adminGiveCancelCard', { targetSocketId });
  }
}

export default new SocketClient();
