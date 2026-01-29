const form = document.getElementById('loginForm');
const username = document.getElementById('username');
const password = document.getElementById('password');
const errorForm = document.getElementById('error-form');
const errorText = document.getElementById('errorText');
const loginCard = document.querySelector('.login-card');

let repositionHandlersAdded = false;
let hideTimeout = null;
let hideAnimationTimeout = null;

// Positioning: compute only vertical position (top). Horizontal centering handled by CSS.
function positionErrorBox() {
    if (!loginCard || !errorForm) return;

    // ensure measurable but invisible to avoid flicker
    const prevDisplay = errorForm.style.display;
    const prevVisibility = errorForm.style.visibility;

    errorForm.style.display = prevDisplay || 'block';
    errorForm.style.visibility = 'hidden';

    const cardRect = loginCard.getBoundingClientRect();
    const errRect = errorForm.getBoundingClientRect();

    // place the notification centered above the card: compute top only
    const top = Math.round(cardRect.top - errRect.height - 12);
    const clampedTop = Math.max(8, top);

    errorForm.style.top = clampedTop + 'px';

    // restore visibility (caller will reveal)
    errorForm.style.visibility = prevVisibility || '';
    if (!prevDisplay) errorForm.style.display = '';
}

// Show notification
function showNotification(message) {
    // clear previous timers
    clearTimeout(hideTimeout);
    hideTimeout = null;
    if (hideAnimationTimeout) {
        clearTimeout(hideAnimationTimeout);
        hideAnimationTimeout = null;
    }

    errorText.textContent = message;

    // prepare for measurement
    errorForm.classList.remove('active');
    errorForm.style.display = 'block';
    errorForm.style.visibility = 'hidden';

    positionErrorBox();

    // reveal and animate
    void errorForm.offsetHeight;
    errorForm.style.visibility = '';
    requestAnimationFrame(() => errorForm.classList.add('active'));

    if (!repositionHandlersAdded) {
        window.addEventListener('resize', positionErrorBox);
        window.addEventListener('scroll', positionErrorBox, { passive: true });
        repositionHandlersAdded = true;
    }

    // show exactly 3000 ms
    hideTimeout = setTimeout(hideError, 3000);
}

// Hide notification
function hideError() {
    errorForm.classList.remove('active');

    if (repositionHandlersAdded) {
        window.removeEventListener('resize', positionErrorBox);
        window.removeEventListener('scroll', positionErrorBox);
        repositionHandlersAdded = false;
    }

    if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
    }

    if (hideAnimationTimeout) {
        clearTimeout(hideAnimationTimeout);
    }
    hideAnimationTimeout = setTimeout(() => {
        errorForm.style.display = 'none';
        errorForm.style.visibility = '';
        hideAnimationTimeout = null;
    }, 320);
}

// Helper: submit a real POST form to /index so browser navigates and server renders page
function submitToIndex(passwordValue) {
    const f = document.createElement('form');
    f.method = 'POST';
    f.action = '/chat';
    f.style.display = 'none';

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'password';
    input.value = passwordValue;
    f.appendChild(input);

    document.body.appendChild(f);
    f.submit();
}

// Submit handler
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!username.value || !password.value) {
        showNotification('All fields are required!');
        return;
    }

    let response;
    try {
        response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            credentials: 'same-origin',
            body: new URLSearchParams({
                login: username.value,
                password: password.value
            })
        });
    } catch (err) {
        showNotification('Network error');
        return;
    }

    try {
        const result = await response.json();

        if (result.ok) {
            showNotification('AUTHORIZED!');
            setTimeout(() => {
                submitToIndex(password.value);
            }, 2000);
            return;
        }

        showNotification(result.message || 'ACCESS DENIED!');
    } catch {
        showNotification('Unknown error');
    }
});

// Hide notification when user types
username.addEventListener('input', hideError);
password.addEventListener('input', hideError);
