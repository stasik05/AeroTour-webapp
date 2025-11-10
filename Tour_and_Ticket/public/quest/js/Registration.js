import {AuthService} from '/shared/js/AuthService.js'
const style = document.createElement('style');
style.textContent = `
    .form-input1.error {
        border-color: #e74c3c !important;
        box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.1) !important;
    }
    .error-message {
        color: #e74c3c;
        font-size: 12px;
        margin-top: 5px;
    }
    .password-input-container {
        position: relative;
    }
    .password-toggle {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        cursor: pointer;
        color: #6b7280;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .password-toggle:hover {
        color: #374151;
    }
    .password-toggle svg {
        width: 18px;
        height: 18px;
    }
`;
document.head.appendChild(style);

document.querySelector('.registration-form').addEventListener('submit', async(e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const password = formData.get('password');
  const confirmPassword = formData.get('confirm-password');
  const firstName = formData.get('first-name');
  const lastName = formData.get('last-name');
  const email = formData.get('email');

  clearErrors();

  // Проверка имени
  if (!validateName(firstName)) {
    showFieldError('first-name', 'Имя должно содержать только русские буквы и быть одним словом');
    return;
  }

  // Проверка фамилии
  if (!validateName(lastName)) {
    showFieldError('last-name', 'Фамилия должна содержать только русские буквы и быть одним словом');
    return;
  }

  // Проверка email
  if (!validateEmail(email)) {
    showFieldError('email', 'Введите корректный email адрес');
    return;
  }

  // Проверка паролей
  if (password !== confirmPassword) {
    showMessage('Пароли не совпадают','error');
    showFieldError('confirm-password', 'Пароли не совпадают');
    return;
  }

  if (!validatePassword(password)) {
    showMessage('Пароль должен содержать не менее 8 символов, включать буквы и специальные символы', 'error');
    showFieldError('password', 'Пароль должен содержать буквы и специальные символы');
    return;
  }

  const userData = {
    name: firstName,
    lastName: lastName,
    email: email,
    password: password,
    phone: ''
  };

  try {
    const result = await AuthService.register(userData);
    if (result.success) {
      showMessage('Регистрация успешна! Перенаправление...', 'success');
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      setTimeout(() => {
        window.location.href = '/quest/Login.html';
      }, 100);
    }
  } catch(error) {
    handleError(error);
  }
});

// Функции валидации
function validateName(name) {
  const russianNameRegex = /^[А-ЯЁа-яё]+$/;
  return russianNameRegex.test(name) && name.trim().split(' ').length === 1;
}

function validateEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

function validatePassword(password) {
  if (password.length < 8) return false;

  // Проверяем, что есть хотя бы одна буква
  const hasLetter = /[a-zA-Zа-яА-Я]/.test(password);
  // Проверяем, что есть хотя бы один специальный символ или цифра
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?0-9]/.test(password);

  return hasLetter && hasSpecialChar;
}

function showFieldError(fieldName, message) {
  const input = document.querySelector(`[name="${fieldName}"]`);
  if (input) {
    input.classList.add('error');
    input.style.borderColor = '#e74c3c';
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    errorElement.style.cssText = 'color: #e74c3c; font-size: 12px; margin-top: 5px;';
    input.parentNode.appendChild(errorElement);
  }
}

function clearErrors() {
  const existingErrors = document.querySelectorAll('.error-message');
  existingErrors.forEach(error => error.remove());
  const errorInputs = document.querySelectorAll('.form-input1.error');
  errorInputs.forEach(input => input.classList.remove('error'));
  const existingMessage = document.querySelector('.form-message');
  if (existingMessage) existingMessage.remove();
}

function showMessage(text, type) {
  const existingMessage = document.querySelector('.form-message');
  if (existingMessage) existingMessage.remove();
  const message = document.createElement('div');
  message.className = `form-message ${type}`;
  message.textContent = text;
  message.style.cssText = `
        padding: 12px;
        margin: 20px 0;
        border-radius: 6px;
        text-align: center;
        font-size: 14px;
        font-weight: 500;
        ${type === 'success' ?
    'background: #d4edda; color: #155724; border: 1px solid #c3e6cb;' :
    'background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;'
  }
    `;
  const registrationHeader = document.querySelector('.registration-header');
  registrationHeader.appendChild(message);
}

function handleError(error) {
  if (error.errors) {
    error.errors.forEach(err => {
      let fieldName = err.field;
      if (fieldName === 'name') fieldName = 'first-name';
      if (fieldName === 'lastName') fieldName = 'last-name';
      showFieldError(fieldName, err.message);
    });
  } else {
    showMessage(error.error || 'Ошибка регистрации', 'error');
  }
}

// Функция для переключения видимости пароля
function createPasswordToggle(inputId) {
  const container = document.querySelector(`#${inputId}`).parentNode;
  container.classList.add('password-input-container');

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'password-toggle';
  toggle.innerHTML = `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
        </svg>
    `;

  toggle.addEventListener('click', function() {
    const input = document.getElementById(inputId);
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';

    // Обновляем иконку
    this.innerHTML = isPassword ? `
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m9.02 9.02l3.29 3.29m-3.29-3.29l-3.29-3.29"/>
            </svg>
        ` : `
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
        `;
  });

  container.appendChild(toggle);
}

// Валидация паролей при потере фокуса
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirm-password');

function validatePasswordOnBlur() {
  const password = passwordInput.value;

  // Очищаем предыдущие ошибки для поля пароля
  const passwordErrors = passwordInput.parentNode.querySelectorAll('.error-message');
  passwordErrors.forEach(error => error.remove());
  passwordInput.classList.remove('error');

  if (password && !validatePassword(password)) {
    passwordInput.classList.add('error');
    showFieldError('password', 'Пароль должен содержать не менее 8 символов, включать буквы и специальные символы');
  }
}

function validateConfirmPasswordOnBlur() {
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  // Очищаем предыдущие ошибки для поля подтверждения пароля
  const confirmErrors = confirmPasswordInput.parentNode.querySelectorAll('.error-message');
  confirmErrors.forEach(error => error.remove());
  confirmPasswordInput.classList.remove('error');

  if (confirmPassword && password !== confirmPassword) {
    confirmPasswordInput.classList.add('error');
    showFieldError('confirm-password', 'Пароли не совпадают');
  }
}

// Валидация при вводе (только для сброса ошибок)
function clearPasswordErrorOnInput() {
  const errors = passwordInput.parentNode.querySelectorAll('.error-message');
  errors.forEach(error => error.remove());
  passwordInput.classList.remove('error');
}

function clearConfirmPasswordErrorOnInput() {
  const errors = confirmPasswordInput.parentNode.querySelectorAll('.error-message');
  errors.forEach(error => error.remove());
  confirmPasswordInput.classList.remove('error');
}

// Добавляем обработчики событий
passwordInput.addEventListener('blur', validatePasswordOnBlur);
passwordInput.addEventListener('input', clearPasswordErrorOnInput);

confirmPasswordInput.addEventListener('blur', validateConfirmPasswordOnBlur);
confirmPasswordInput.addEventListener('input', clearConfirmPasswordErrorOnInput);

// Добавляем глазки к полям паролей
createPasswordToggle('password');
createPasswordToggle('confirm-password');