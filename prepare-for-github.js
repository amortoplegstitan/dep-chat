const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('=== Подготовка проекта Дэп-Чат для GitHub ===\n');

// Список файлов и папок, которые должны быть в проекте
const expectedFiles = [
  'package.json',
  'server.js',
  'README.md',
  'DEPLOY.md',
  'GITHUB_UPLOAD.md',
  '.gitignore',
  'init-demo.js',
  'src/database.js',
  'public/index.html',
  'public/chat.html',
  'public/styles.css',
  'public/chat.css',
  'public/auth.js',
  'public/chat.js'
];

console.log('Проверка наличия файлов...');
let allFilesExist = true;

expectedFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - ОТСУТСТВУЕТ`);
    allFilesExist = false;
  }
});

console.log('\n=== Инструкция по загрузке на GitHub ===\n');

if (!allFilesExist) {
  console.log('ВНИМАНИЕ: Некоторые файлы отсутствуют!');
  console.log('Рекомендуется проверить структуру проекта перед загрузкой на GitHub.\n');
}

console.log('1. Откройте https://github.com и войдите в свой аккаунт');
console.log('2. Нажмите "+" → "New repository"');
console.log('3. Название: "dep-chat", описание: "Реальный чат для общения"');
console.log('4. НЕ добавляйте README, .gitignore или license');
console.log('5. Нажмите "Create repository"');
console.log('6. На открывшейся странице нажмите "uploading an existing file"');
console.log('7. Перетащите ВСЕ файлы из этой папки в окно браузера');
console.log('8. Нажмите "Commit changes"');
console.log('\nИЛИ используйте GitHub Desktop:');
console.log('1. Установите GitHub Desktop с https://desktop.github.com/');
console.log('2. Откройте приложение → File → Add Local Repository');
console.log('3. Выберите эту папку и нажмите "Publish repository"');
console.log('\nПосле загрузки проект будет доступен по адресу:');
console.log('https://github.com/ВАШ-ЛОГИН/dep-chat');
console.log('\nДля развертывания в интернете:');
console.log('1. Скопируйте URL вашего репозитория');
console.log('2. Используйте его на Railway.app, Render.com или Heroku');
console.log('3. Друг сможет зайти по выданному хостингом URL');

// Создаем ZIP архив (опционально)
console.log('\n=== Создание ZIP архива (опционально) ===');
console.log('Вы можете создать ZIP архив всех файлов и загрузить его на GitHub:');

const filesToZip = [
  'package.json',
  'server.js',
  'README.md',
  'DEPLOY.md',
  'GITHUB_UPLOAD.md',
  '.gitignore',
  'init-demo.js',
  'src',
  'public'
];

console.log('\nЧтобы создать ZIP вручную:');
console.log('1. Выделите все файлы в папке проекта');
console.log('2. Щелкните правой кнопкой → "Отправить" → "Сжатая ZIP-папка"');
console.log('3. Назовите архив "dep-chat.zip"');
console.log('4. На GitHub можно загрузить ZIP вместо отдельных файлов');

console.log('\n=== Готово! ===');
console.log('Проект "Дэп-Чат" готов для загрузки на GitHub.');
console.log('Сервер продолжает работать на http://localhost:3000');