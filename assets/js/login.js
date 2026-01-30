// assets/js/login.js
(function () {
  'use strict';

  const form = document.getElementById('loginForm');
  const username = document.getElementById('username');
  const password = document.getElementById('password');
  const errorForm = document.getElementById('error-form');
  const errorText = document.getElementById('errorText');
  const loginCard = document.querySelector('.login-card');
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

  let repositionHandlersAdded = false;
  let hideTimeout = null;
  let hideAnimationTimeout = null;

  function positionErrorBox() {
    if (!loginCard || !errorForm) return;
    const prevDisplay = errorForm.style.display;
    const prevVisibility = errorForm.style.visibility;
    errorForm.style.display = prevDisplay || 'block';
    errorForm.style.visibility = 'hidden';
    const cardRect = loginCard.getBoundingClientRect();
    const errRect = errorForm.getBoundingClientRect();
    const top = Math.round(cardRect.top - errRect.height - 12);
    const clampedTop = Math.max(8, top);
    errorForm.style.top = clampedTop + 'px';
    errorForm.style.visibility = prevVisibility || '';
    if (!prevDisplay) errorForm.style.display = '';
  }

  function showNotification(message) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
    if (hideAnimationTimeout) {
      clearTimeout(hideAnimationTimeout);
      hideAnimationTimeout = null;
    }
    if (errorText) errorText.textContent = message;
    if (!errorForm) return;
    errorForm.classList.remove('active');
    errorForm.style.display = 'block';
    errorForm.style.visibility = 'hidden';
    positionErrorBox();
    void errorForm.offsetHeight;
    errorForm.style.visibility = '';
    requestAnimationFrame(() => errorForm.classList.add('active'));
    if (!repositionHandlersAdded) {
      window.addEventListener('resize', positionErrorBox);
      window.addEventListener('scroll', positionErrorBox, { passive: true });
      repositionHandlersAdded = true;
    }
    hideTimeout = setTimeout(hideError, 3000);
  }

  function hideError() {
    if (!errorForm) return;
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

  function submitToIndex(usernameValue, passwordValue) {
    if (!form) {
      console.error('loginForm not found');
      return;
    }

    try { form.enctype = 'application/x-www-form-urlencoded'; } catch (e) {}

    if (!form.querySelector('[name="login"]')) {
      const i = document.createElement('input');
      i.type = 'hidden';
      i.name = 'login';
      form.appendChild(i);
    }
    if (!form.querySelector('[name="password"]')) {
      const i = document.createElement('input');
      i.type = 'hidden';
      i.name = 'password';
      form.appendChild(i);
    }

    form.querySelector('[name="login"]').value = usernameValue;
    form.querySelector('[name="password"]').value = passwordValue;

    if (submitBtn) submitBtn.disabled = true;

    setTimeout(() => {
      console.log('Submitting form to /chat with', {
        login: form.querySelector('[name="login"]').value,
        password: form.querySelector('[name="password"]').value ? '***' : null
      });
      form.submit();
    }, 50);
  }

  async function submitViaFetchAndRedirect(loginVal, passVal) {
    try {
      const body = new URLSearchParams({ login: loginVal, password: passVal });
      const r = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        credentials: 'same-origin',
        body
      });
      if (r.redirected) {
        window.location.href = r.url;
        return;
      }
      const text = await r.text();
      document.open();
      document.write(text);
      document.close();
    } catch (err) {
      console.error('submitViaFetchAndRedirect error', err);
      showNotification('Network error during final submit');
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!username || !password) {
        console.error('username or password input missing');
        return;
      }

      const loginVal = username.value.trim();
      const passVal = password.value.trim();
      if (!loginVal || !passVal) {
        showNotification('All fields are required!');
        return;
      }

      let response;
      try {
        response = await fetch('/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          credentials: 'same-origin',
          body: new URLSearchParams({ login: loginVal, password: passVal })
        });
      } catch (err) {
        console.error('Network error', err);
        showNotification('Network error');
        return;
      }

      try {
        const contentType = response.headers.get('content-type') || '';
        let result = {};
        if (contentType.includes('application/json')) {
          result = await response.json();
        } else {
          console.warn('Non-JSON response from /login:', contentType);
          showNotification('Server error');
          if (submitBtn) submitBtn.disabled = false;
          return;
        }

        if (result.ok) {
          showNotification('AUTHORIZED!');
          setTimeout(() => {
            submitToIndex(loginVal, passVal);
          }, 600);
          return;
        }

        showNotification(result.message || 'ACCESS DENIED!');
        if (submitBtn) submitBtn.disabled = false;
      } catch (err) {
        console.error('Error parsing /login response', err);
        showNotification('Unknown error');
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  } else {
    console.error('loginForm element not found on page');
  }

  let hideDebounce;
  if (username) username.addEventListener('input', () => {
    clearTimeout(hideDebounce);
    hideDebounce = setTimeout(hideError, 80);
  });
  if (password) password.addEventListener('input', () => {
    clearTimeout(hideDebounce);
    hideDebounce = setTimeout(hideError, 80);
  });
})();