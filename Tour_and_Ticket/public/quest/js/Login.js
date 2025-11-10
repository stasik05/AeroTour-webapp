import {AuthService} from '/shared/js/AuthService.js'

// Добавляем стили для глазка
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
document.querySelector('.login-form').addEventListener('submit', async(e) =>
{
  e.preventDefault()
  const formData = new FormData(e.target);
  const credentials =
    {
      email:formData.get('email'),
      password:formData.get('password')
    };
  clearErrors();
  try
  {
    const result = await AuthService.login(credentials);
    if(result.success)
    {
      showMessage('Вход выполнен успешно! Перенаправление...', 'success');
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      setTimeout(()=>
      {
        window.location.href = '/client/mainClientWindow.html'
      },100);
    }
  }
  catch(error)
  {
    handleError(error);
  }
});
function clearErrors()
{
  const existingErrors = document.querySelectorAll('.error-message');
  existingErrors.forEach(error => error.remove());
  const errorInputs = document.querySelectorAll('.form-input1.error');
  errorInputs.forEach(input => input.classList.remove('error'));
}
function showMessage(text, type)
{
  const existingMessage = document.querySelector('.form-message');
  if (existingMessage) existingMessage.remove();
  const message = document.createElement('div');
  message.className = `form-message ${type}`;
  message.textContent = text;
  message.style.cssText = `
            padding: 10px;
            margin: 15px 0;
            border-radius: 4px;
            text-align: center;
            font-size: 14px;
            ${type === 'success' ? 'background: #d4edda; color: #155724; border: 1px solid #c3e6cb;' : 'background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;'}
        `;
  document.querySelector('.login-form').prepend(message);
}
function handleError(error)
{
  if (error.errors)
  {
    error.errors.forEach(err =>
    {
      const input = document.querySelector(`[name="${err.field}"]`);
      if (input)
      {
        input.classList.add('error');
        input.style.borderColor = '#e74c3c';
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = err.message;
        errorElement.style.cssText = 'color: #e74c3c; font-size: 12px; margin-top: 5px;';
        input.parentNode.appendChild(errorElement);
      }
    });
  }
  else
  {
    showMessage(error.error || 'Ошибка входа', 'error');
  }
}
function createPasswordToggle(inputId)
{
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
document.addEventListener('DOMContentLoaded', function() {
  const passwordInput = document.querySelector('input[name="password"]');
  if (passwordInput) {
    // Добавляем id если его нет
    if (!passwordInput.id) {
      passwordInput.id = 'login-password';
    }
    createPasswordToggle(passwordInput.id);
  }
});