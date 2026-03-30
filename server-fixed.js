const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Импорт функций базы данных
const {
  initializeDatabase,
  createUser,
  findUserByUsername,
  verifyPassword,
  addMessage,
  getRecentMessages,
  getAllUsers
} = require('./src/database-railway');

const app = express();
const server = http.createServer(app);

// Конфигурация для продакшена
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dep-chat-secret-key-change-in-production';

// Настройка Socket.IO
const io = socketIo(server, {
  cors: {
    origin: isProduction ? process.env.FRONTEND_URL || "*" : "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

console.log(`🚀 Запуск Дэп-Чата`);
console.log(`📡 Порт: ${PORT}`);
console.log(`🌍 Режим: ${isProduction ? 'Production' : 'Development'}`);

// Middleware
app.use(cors({
  origin: isProduction ? process.env.FRONTEND_URL || "*" : "*",
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ========== КРИТИЧЕСКИ ВАЖНО ДЛЯ RAILWAY ==========
// Health check ДОЛЖЕН быть ДО инициализации базы данных
// Railway проверяет health check сразу после запуска контейнера

// Простой health check который работает мгновенно
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: 'dep-chat',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint для проверки
app.get('/', (req, res) => {
  res.json({ 
    message: 'Дэп-Чат API',
    version: '1.0.0',
    endpoints: ['/health', '/api/register', '/api/login', '/api/chat']
  });
});

// Middleware для проверки JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Токен отсутствует' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Недействительный токен' });
    }
    req.user = user;
    next();
  });
};

// Маршруты для аутентификации
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Имя пользователя и пароль обязательны' });
    }
    
    if (username.length < 3) {
      return res.status(400).json({ error: 'Имя пользователя должно быть не менее 3 символов' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
    }
    
    const existingUser = await findUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Пользователь уже существует' });
    }
    
    const user = await createUser(username, password);
    console.log(`✅ Зарегистрирован новый пользователь: ${username}`);
    
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({ 
      message: 'Регистрация успешна', 
      token,
      user: { id: user.id, username: user.username }
    });
  } catch (error) {
    console.error('❌ Ошибка регистрации:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Неверные учетные данные' });
    }
    
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Неверные учетные данные' });
    }
    
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ 
      message: 'Вход выполнен успешно', 
      token,
      user: { id: user.id, username: user.username }
    });
  } catch (error) {
    console.error('❌ Ошибка входа:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Защищенные маршруты
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('❌ Ошибка получения пользователей:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

app.get('/api/messages', authenticateToken, async (req, res) => {
  try {
    const messages = await getRecentMessages();
    res.json(messages);
  } catch (error) {
    console.error('❌ Ошибка получения сообщений:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

app.get('/api/me', authenticateToken, (req, res) => {
  res.json(req.user);
});

// WebSocket соединения
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log(`🔌 Новое подключение: ${socket.id}`);
  
  socket.on('authenticate', async (token) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.id;
      socket.username = decoded.username;
      
      onlineUsers.set(socket.id, decoded.username);
      
      socket.emit('authenticated', { username: decoded.username });
      socket.broadcast.emit('userJoined', decoded.username);
      
      console.log(`👤 ${decoded.username} присоединился к чату`);
      
      // Отправляем список онлайн пользователей
      const onlineList = Array.from(onlineUsers.values());
      io.emit('onlineUsers', onlineList);
    } catch (error) {
      socket.emit('authError', 'Недействительный токен');
    }
  });
  
  socket.on('sendMessage', async (data) => {
    if (!socket.username || !data.text) return;
    
    try {
      const message = await addMessage(socket.userId, socket.username, data.text);
      
      const messageWithId = {
        id: message.id,
        username: socket.username,
        text: data.text,
        timestamp: new Date().toISOString()
      };
      
      io.emit('newMessage', messageWithId);
      console.log(`💬 Новое сообщение от ${socket.username}: ${data.text.substring(0, 50)}${data.text.length > 50 ? '...' : ''}`);
    } catch (error) {
      console.error('❌ Ошибка сохранения сообщения:', error);
    }
  });
  
  socket.on('disconnect', () => {
    if (socket.username) {
      onlineUsers.delete(socket.id);
      socket.broadcast.emit('userLeft', socket.username);
      console.log(`👋 ${socket.username} отключился`);
      
      const onlineList = Array.from(onlineUsers.values());
      io.emit('onlineUsers', onlineList);
    }
  });
});

// Страница чата
app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// Обработка 404
app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('🔥 Необработанная ошибка:', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// Инициализация и запуск сервера с правильной последовательностью
async function startServer() {
  try {
    // 1. Сначала запускаем сервер БЫСТРО
    server.listen(PORT, () => {
      console.log(`✅ HTTP сервер запущен на порту ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
      console.log(`📍 Главная: http://localhost:${PORT}`);
      console.log(`🔧 Режим: ${isProduction ? 'Production' : 'Development'}`);
    });
    
    // 2. Затем инициализируем базу данных (может занять время)
    console.log('🔄 Инициализация базы данных...');
    await initializeDatabase();
    console.log('✅ База данных готова');
    
    // 3. Сервер полностью готов
    console.log('🚀 Дэп-Чат полностью готов к работе!');
    
    if (isProduction) {
      console.log('🌐 Приложение доступно из интернета');
    }
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 SIGTERM получен, завершаем работу...');
      server.close(() => {
        console.log('✅ Сервер остановлен');
        process.exit(0);
      });
    });
    
    process.on('SIGINT', () => {
      console.log('🛑 SIGINT получен, завершаем работу...');
      server.close(() => {
        console.log('✅ Сервер остановлен');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('❌ Критическая ошибка запуска сервера:', error);
    // Сервер уже запущен, но база данных не работает
    // Это нормально для health check - он все равно будет работать
    console.log('⚠️ База данных не доступна, но сервер продолжает работу');
  }
}

// Запуск сервера
startServer();