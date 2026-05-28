// Находим блок для контента
const container = document.getElementById('content');

// Создаем заголовок для текста
const textBlock = document.createElement('h1');

// Добавляем нужный текст
textBlock.textContent = 'Привет петя';

// Выводим его на страницу
container.appendChild(textBlock);
