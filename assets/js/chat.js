const username = "admin"; // ← имя по умолчанию

const input = document.getElementById('chatInput');
const messages = document.getElementById('messages');

input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim() !== '') {
        addMessage(input.value.trim());
        input.value = '';
    }
});

function addMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'msg';

    msg.innerHTML = `<strong>[${username.toUpperCase()}]:</strong> ${text}`;

    messages.prepend(msg); // если используешь column-reverse
}
