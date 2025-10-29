/**
 * Dashboard - отображение игровой информации на большом экране
 */

const socket = io();
let activeTasks = [];
let events = [];
let playersData = []; // 👥 Список игроков с аватарками
const MAX_EVENTS = 20;

// Подключение
socket.on('connect', () => {
  console.log('📊 Dashboard подключен');
  socket.emit('getDashboardState');
});

// Количество игроков
socket.on('playersCount', (count) => {
  document.getElementById('onlineCount').textContent = count;
});

// Получение состояния для dashboard
socket.on('dashboardState', (state) => {
  console.log('📊 Получено состояние:', state);
  if (state.players) {
    playersData = state.players; // 👥 Сохраняем игроков
    renderPlayers(state.players);
    collectTasks(state.players);
  }
  if (state.onlineCount !== undefined) {
    document.getElementById('onlineCount').textContent = state.onlineCount;
  }
});

// Обновление списка игроков
socket.on('playersUpdate', (players) => {
  console.log('🔄 playersUpdate:', players);
  playersData = players; // 👥 Сохраняем игроков
  renderPlayers(players);
  collectTasks(players);
});

// События
socket.on('notification', (data) => {
  addEvent(data);
});

// Поиск аватарки игрока по нику
function getPlayerAvatar(nickname) {
  const player = playersData.find(p => p.nickname === nickname);
  return player ? player.avatar : null;
}

// Собираем все активные задания
function collectTasks(players) {
  const allTasks = new Map();
  
  players.forEach(player => {
    if (player.activeTasks && Array.isArray(player.activeTasks)) {
      player.activeTasks.forEach(task => {
        // ✅ Фильтруем: только задания, а не запросы
        if (task.type !== 'role_request' && !allTasks.has(task.id)) {
          allTasks.set(task.id, task);
        }
      });
    }
  });
  
  activeTasks = Array.from(allTasks.values());
  console.log('📋 Активных заданий:', activeTasks.length, activeTasks);
  renderTasks();
}

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
          </div>
          <div class="player-role">${roleLabel}</div>
        </div>
        <div class="player-stats">
          <div class="stat">
            <div class="stat-label">❤️ HP</div>
            <div class="stat-value">${player.hp}/100</div>
          </div>
          <div class="stat">
            <div class="stat-label">⭐ LVL</div>
            <div class="stat-value">${player.level}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Рендер заданий
function renderTasks() {
  const container = document.getElementById('tasksList');
  
  console.log('🎯 Рендер заданий, всего:', activeTasks.length);
  
  if (!activeTasks || activeTasks.length === 0) {
    container.innerHTML = '<div class="empty-state">Нет активных заданий</div>';
    return;
  }
  
  const tasksHTML = activeTasks.map(task => {
    console.log('📋 Task:', task);
    
    // Собираем информацию об участниках
    const creator = {
      nickname: task.creatorNickname,
      avatar: getPlayerAvatar(task.creatorNickname)
    };
    
    const targets = [];
    
    if (task.targetSocketId1 && task.targetSocketId2) {
      // Задание "на двоих"
      targets.push({ 
        nickname: task.target1Nickname, 
        avatar: getPlayerAvatar(task.target1Nickname) 
      });
      targets.push({ 
        nickname: task.target2Nickname, 
        avatar: getPlayerAvatar(task.target2Nickname) 
      });
    } else if (task.targetNickname) {
      targets.push({ 
        nickname: task.targetNickname, 
        avatar: getPlayerAvatar(task.targetNickname) 
      });
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
    
    // HTML для участников - ТОЛЬКО исполнители
    let participantsHTML = '';
    
    if (targets.length > 0) {
      targets.forEach(target => {
        participantsHTML += `
          <div class="task-player">
            <img src="${target.avatar || '/avatars/default.png'}" class="task-player-avatar" alt="${target.nickname}">
            <div>
              <div class="task-player-label">🎯 Выполняет</div>
              <div class="task-player-name">${target.nickname}</div>
            </div>
          </div>
        `;
      });
    }
    
    return `
      <div class="task-card" data-task-id="${task.id}">
        <div class="task-header">🎯 ${task.cardName}</div>
        <div class="task-participants">
          ${participantsHTML}
        </div>
        ${task.description ? `<div style="opacity: 0.7; margin-bottom: 8px; font-size: 0.8rem; text-align: center;">${task.description}</div>` : ''}
        <div class="task-timer ${timerClass}" data-timer-id="${task.id}">
          ⏱️ <span class="timer-value">${timeStr}</span>
        </div>
      </div>
    `;
  }).join('');
  
  // Оборачиваем в grid
  container.innerHTML = `<div class="tasks-grid">${tasksHTML}</div>`;
}

// Обновление только таймеров (без перерисовки всего)
function updateTimersOnly() {
  if (!activeTasks || activeTasks.length === 0) return;
  
  const now = Date.now();
  
  activeTasks.forEach(task => {
    const timerElement = document.querySelector(`[data-timer-id="${task.id}"]`);
    if (!timerElement) return;
    
    const timeLeft = Math.max(0, Math.floor((task.expiresAt - now) / 1000));
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Обновляем только текст
    const valueSpan = timerElement.querySelector('.timer-value');
    if (valueSpan) {
      valueSpan.textContent = timeStr;
    }
    
    // Обновляем класс для анимации
    timerElement.classList.remove('warning', 'critical');
    if (timeLeft <= 10) {
      timerElement.classList.add('critical');
    } else if (timeLeft <= 30) {
      timerElement.classList.add('warning');
    }
  });
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
    updateTimersOnly(); // Только таймеры, без перерисовки!
  }
}, 1000);
