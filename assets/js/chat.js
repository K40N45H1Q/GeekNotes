// assets/js/chat.js
// Сообщения идут сверху вниз. Новые добавляются в конец. Системные сообщения обычные.

(function () {
  'use strict';

  const input = document.getElementById('chatInput');
  const messages = document.getElementById('messages');
  const sendBtn = document.querySelector('.send-btn');

  let username = 'unknown';
  let initialHistory = [];

  // Получаем username и историю из data-атрибутов
  const userDataEl = document.getElementById('user-data');
  if (userDataEl) {
    const ds = userDataEl.dataset || {};

    if (typeof ds.username === 'string' && ds.username.length > 0) {
      username = ds.username;
    }

    const raw = userDataEl.getAttribute('data-history');
    if (raw && raw.length > 0) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) initialHistory = parsed;
      } catch (e) {
        console.warn('Failed to parse initial chat history', e);
      }
    }
  }

  // WebSocket
  const socket = new WebSocket('ws://127.0.0.1:8000/ws');

  socket.addEventListener('open', () => {
    // Сообщаем серверу имя — он создаёт одно системное сообщение
    try {
      socket.send(JSON.stringify({ type: 'join', user: username }));
    } catch (e) {
      console.error('Failed to send join message', e);
    }
  });

  socket.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data);
      addMessage(data.user || 'unknown', data.text || '');
    } catch (e) {
      console.error('Invalid WS message', e);
    }
  });

  socket.addEventListener('error', () => {
    addMessage('system', 'WebSocket error');
  });

  socket.addEventListener('close', () => {
    addMessage('system', 'Disconnected from server');
  });

  // Отправка сообщения
  function sendMessage() {
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    if (socket.readyState !== WebSocket.OPEN) {
      addMessage('system', 'WebSocket not connected');
      return;
    }

    const payload = { user: username, text: text };
    socket.send(JSON.stringify(payload));
    input.value = '';
  }

  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
  }

  // Экранирование HTML
  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));
  }

  // Добавление сообщения в конец
  function addMessage(user, text) {
    if (!messages) return;

    const div = document.createElement('div');
    div.className = 'msg';

    // Системные сообщения — обычный стиль
    div.innerHTML = `<strong>[${escapeHTML(user).toUpperCase()}]</strong>: ${escapeHTML(text)}`;


    messages.appendChild(div);

    // Автоскролл вниз
    messages.scrollTop = messages.scrollHeight;
  }

  // Рендер истории (старые → новые)
  (function renderInitialHistory() {
    if (!Array.isArray(initialHistory) || initialHistory.length === 0) return;

    for (let i = 0; i < initialHistory.length; i++) {
      const m = initialHistory[i];
      addMessage(m.user || 'unknown', m.text || '');
    }
  })();

})();
