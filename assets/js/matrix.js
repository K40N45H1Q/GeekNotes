const canvas = document.getElementById('matrix');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// символы и настройки
const letters = ['0', '1'];
const fontSize = 16;
const columns = canvas.width / fontSize;
const drops = [];

// стартовая позиция каждой колонки
for (let x = 0; x < columns; x++) {
    drops[x] = Math.random() * canvas.height / fontSize;
}

function draw() {
    // прозрачный фон для эффекта "следа"
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#0F0'; // зелёный цвет
    ctx.font = fontSize + 'px monospace';

    for (let i = 0; i < drops.length; i++) {
        const text = letters[Math.floor(Math.random() * letters.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        // сброс потока, если дошёл до низа
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
        }

        drops[i]++;
    }
}

// анимация
setInterval(draw, 30);

// ресайз окна
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
