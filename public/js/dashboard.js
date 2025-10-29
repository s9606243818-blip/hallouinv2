/**
 * Dashboard - отображение игровой информации на большом экране
 */

const socket = io();
let activeTasks = [];
let events = [];
const MAX_EVENTS = 20;

// Подключение
socket.on('connect', () => {
  console.log('📊 Dashboard подключен');
});

// Количество игроков
socket.on('playersCount', (count) => {
  document.getElementById('onlineCount').textContent = count;
});

// Обновление списка игроков
socket.on('playersUpdate', (players) => {
  renderPlayers(players);
  
  // Обновляем задания (собираем из всех игроков)
  const allTasks = new Map();
  players.forEach(player => {
    if (player.activeTasks) {
      player.activeTasks.forEach(task => {
        if (!allTasks.has(task.id)) {
          allTasks.set(task.id, task);
        }
      });
    }
  });
  
  activeTasks = Array.from(allTasks.values());
  renderTasks();
});

// Состояние игры (при загрузке)
socket.on('gameState', (state) => {
  if (state.players) {
    renderPlayers(state.players);
    
    // Собираем задания
    const allTasks = new Map();
    state.players.forEach(player => {
      if (player.activeTasks) {
        player.activeTasks.forEach(task => {
          if (!allTasks.has(task.id)) {
            allTasks.set(task.id, task);
          }
        });
      }
    });
    
    activeTasks = Array.from(allTasks.values());
    renderTasks();
  }
});

// События
socket.on('notification', (data) => {
  addEvent(data);
});

// Рендер игроков
function renderPlayers(players) {
  const container = document.getElementById('playersList');
  
  if (!players || players.length === 0) {
    container.innerHTML = '<div class="empty-state">Нет игроков</div>';
    return;
  }
  
  // Сортируем: живые сверху, мёртвые снизу
  const sorted = [...players].sort((a, b) => {
    if (a.hp === 0 && b.hp > 0) return 1;
    if (a.hp > 0 && b.hp === 0) return -1;
    return b.level - a.level;
  });
  
  container.innerHTML = sorted.map(player => {
    const isDead = player.hp === 0;
    const statusClass = isDead ? 'dead' : 'alive';
    const statusEmoji = isDead ? '💀' : '💚';
    
    const roleLabels = {
      admin: '👑 Админ',
      bartender: '🍺 Бармен',
      healer: '⚕️ Целитель',
      dealer: '🎴 Дилер',
      dj: '🎵 DJ'
    };
    
    const roleLabel = roleLabels[player.role] || '👤 Игрок';
    
    return `
      <div class="player-card ${statusClass}">
        <div class="player-header">
          <img src="${player.avatar || '/avatars/default.png'}" alt="${player.nickname}" class="player-avatar">
          <div>
            <div class="player-name">${statusEmoji} ${player.nickname}</div>
            <div style="opacity: 0.8; font-size: 0.9rem;">${isDead ? 'Ждёт лечения' : 'В игре'}</div>
          </div>
          <div class="player-role">${roleLabel}</div>
        </div>
        <div class="player-stats">
          <div class="stat">
            <div class="stat-label">❤️ HP</div>
            <div class="stat-value">${player.hp}/100</div>
          </div>
          <div class="stat">
            <div class="stat-label">⭐ Level</div>
            <div class="stat-value">${player.level}</div>
          </div>
          <div class="stat">
            <div class="stat-label">✨ EXP</div>
            <div class="stat-value">${player.exp}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Рендер заданий
function renderTasks() {
  const container = document.getElementById('tasksList');
  
  if (!activeTasks || activeTasks.length === 0) {
    container.innerHTML = '<div class="empty-state">Нет активных заданий</div>';
    return;
  }
  
  container.innerHTML = activeTasks.map(task => {
    // Определяем участников
    let participants = '';
    if (task.targetSocketId1 && task.targetSocketId2) {
      participants = `${task.target1Nickname} & ${task.target2Nickname}`;
    } else if (task.type === 'other' && task.targetNickname) {
      participants = task.targetNickname;
    } else if (task.type === 'both' && task.targetNickname) {
      participants = `${task.creatorNickname} & ${task.targetNickname}`;
    }
    
    // Вычисляем оставшееся время
    const now = Date.now();
    const timeLeft = Math.max(0, Math.floor((task.expiresAt - now) / 1000));
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Определяем состояние таймера
    let timerClass = '';
    if (timeLeft <= 10) {
      timerClass = 'critical';
    } else if (timeLeft <= 30) {
      timerClass = 'warning';
    }
    
    return `
      <div class="task-card">
        <div class="task-header">🎯 ${task.cardName}</div>
        <div class="task-players">
          От: ${task.creatorNickname}<br>
          Для: ${participants}
        </div>
        ${task.description ? `<div style="opacity: 0.8; margin-bottom: 10px;">${task.description}</div>` : ''}
        <div class="task-timer ${timerClass}">
          ⏱️ ${timeStr}
        </div>
      </div>
    `;
  }).join('');
}

// Добавить событие
function addEvent(data) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('ru-RU', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
  
  events.unshift({
    message: data.message,
    type: data.type || 'default',
    time: timeStr
  });
  
  // Ограничиваем количество событий
  if (events.length > MAX_EVENTS) {
    events = events.slice(0, MAX_EVENTS);
  }
  
  renderEvents();
}

// Рендер событий
function renderEvents() {
  const container = document.getElementById('eventsList');
  
  if (events.length === 0) {
    container.innerHTML = '<div class="empty-state">Пока нет событий</div>';
    return;
  }
  
  container.innerHTML = events.map(event => `
    <div class="event ${event.type}">
      <div>${event.message}</div>
      <div class="event-time">${event.time}</div>
    </div>
  `).join('');
}

// Обновление таймеров каждую секунду
setInterval(() => {
  if (activeTasks.length > 0) {
    renderTasks();
  }
}, 1000);

// Запрос начального состояния
socket.emit('getDashboardState');
