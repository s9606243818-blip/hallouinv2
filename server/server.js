/**
 * Главный файл сервера
 * Multiplayer Card Game
 */

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const multer = require('multer');
const setupSocketHandlers = require('./modules/socketHandlers');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;

// === НАСТРОЙКА ЗАГРУЗКИ АВАТАРОВ ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/avatars'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 }, // 4MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Только JPG и PNG форматы'));
    }
  }
});

// === MIDDLEWARE ===
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// === МАРШРУТЫ ===

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Загрузка аватара
app.post('/upload-avatar', upload.single('avatar'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Файл не загружен' });
  }
  
  const avatarPath = `/avatars/${req.file.filename}`;
  res.json({ success: true, avatarPath });
});

// === SOCKET.IO ===
setupSocketHandlers(io);

// === ЗАПУСК СЕРВЕРА ===
server.listen(PORT, () => {
  console.log(`🎮 Сервер запущен на http://localhost:${PORT}`);
  console.log(`📡 Socket.IO готов к подключениям`);
});
