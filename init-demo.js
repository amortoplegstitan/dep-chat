const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'chat.db'), (err) => {
  if (err) {
    console.error('Ошибка подключения к базе данных:', err);
    process.exit(1);
  }
  
  console.log('Подключение к базе данных установлено');
  
  // Создаем демо-пользователя
  createDemoUser();
});

async function createDemoUser() {
  const username = 'demo';
  const password = 'demo123';
  
  try {
    // Проверяем, существует ли уже пользователь
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, row) => {
      if (err) {
        console.error('Ошибка проверки пользователя:', err);
        db.close();
        return;
      }
      
      if (row) {
        console.log(`Пользователь "${username}" уже существует`);
        db.close();
        return;
      }
      
      // Хешируем пароль
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Добавляем пользователя
      db.run(
        'INSERT INTO users (username, password_hash) VALUES (?, ?)',
        [username, passwordHash],
        function(err) {
          if (err) {
            console.error('Ошибка создания пользователя:', err);
          } else {
            console.log(`Демо-пользователь создан:
              Имя пользователя: ${username}
              Пароль: ${password}
              ID: ${this.lastID}
            `);
            console.log('Вы можете использовать эти учетные данные для входа.');
          }
          db.close();
        }
      );
    });
  } catch (error) {
    console.error('Ошибка:', error);
    db.close();
  }
}