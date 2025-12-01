let currentUser = null;
const selectedImages = [];

async function loadUserData() {
  try {
    const userData = localStorage.getItem('user');
    if (userData) {
      currentUser = JSON.parse(userData);
      updateUserInfo();
    }
  } catch (error) {
    console.error('Ошибка загрузки данных пользователя:', error);
  }
}

function updateUserInfo() {
  if (currentUser && currentUser.photo) {
    const avatar = document.querySelector('.user-avatar');
    if (avatar) {
      avatar.src = currentUser.photo;
    }
  }
}

function handleImageSelect(event) {
  const files = event.target.files;

  if (files.length > 0) {
    const file = files[0];
    selectedImages.length = 0;
    selectedImages.push(file);

    updateImagePreview();
    updateImageCountDisplay();
  }

  event.target.value = '';
}

function removeImage(index) {
  selectedImages.splice(index, 1);
  updateImagePreview();
  updateImageCountDisplay();
}

function updateImagePreview() {
  const preview = document.getElementById('imagePreview');
  preview.innerHTML = '';

  selectedImages.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const previewItem = document.createElement('div');
      previewItem.className = 'preview-item';
      previewItem.innerHTML = `
          <img src="${e.target.result}" alt="Preview">
          <button type="button" class="remove-image" onclick="removeImage(${index})">
            <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
          </button>
        `;
      preview.appendChild(previewItem);
    };
    reader.readAsDataURL(file);
  });
}

function updateImageCountDisplay() {
  const totalImagesCount = selectedImages.length;

  const countDisplay = document.getElementById('imageCountDisplay') || createImageCountDisplay();
  countDisplay.textContent = `Изображений: ${totalImagesCount}/1`;

  if (totalImagesCount < 1) {
    countDisplay.className = 'image-count-warning';
  } else if (totalImagesCount === 1) {
    countDisplay.className = 'image-count-success';
  } else {
    countDisplay.className = 'image-count-error';
  }
}

function createImageCountDisplay() {
  const countDisplay = document.createElement('div');
  countDisplay.id = 'imageCountDisplay';
  countDisplay.style.margin = '10px 0';
  countDisplay.style.fontWeight = 'bold';
  countDisplay.style.padding = '5px';
  countDisplay.style.borderRadius = '4px';

  const imageInput = document.getElementById('images');
  if (imageInput && imageInput.parentNode) {
    imageInput.parentNode.insertBefore(countDisplay, imageInput.nextSibling);
  }

  return countDisplay;
}

function resetForm() {
  document.getElementById('addFlightForm').reset();
  selectedImages.length = 0;
  document.getElementById('imagePreview').innerHTML = '';
  updateImageCountDisplay();
}

async function handleFormSubmit(e) {
  e.preventDefault();
  if (selectedImages.length !== 1) {
    showError(`Авиабилет должен содержать ровно 1 изображение. Сейчас: ${selectedImages.length}`);
    return;
  }

  const formData = new FormData();
  formData.append('airline', document.getElementById('airline').value);
  formData.append('flight_number', document.getElementById('flight_number').value);
  formData.append('departure_city', document.getElementById('departure_city').value);
  formData.append('arrival_city', document.getElementById('arrival_city').value);
  formData.append('departure_time', document.getElementById('departure_time').value);
  formData.append('arrival_time', document.getElementById('arrival_time').value);
  formData.append('price', document.getElementById('price').value);
  formData.append('baggage_price', document.getElementById('baggage_price').value);
  formData.append('aircraft_type', document.getElementById('aircraft_type').value);
  formData.append('total_seats', document.getElementById('total_seats').value);
  formData.append('available', document.getElementById('available').checked);

  selectedImages.forEach((image, index) => {
    formData.append('images', image);
  });

  try {
    const response = await fetch('/api/flights/add', {
      method: 'POST',
      body: formData
    });
    const result = await response.json();
    if (result.success) {
      showSuccess('Перелет успешно добавлен!');
      resetForm();
    } else {
      showError('Ошибка при добавлении перелета: ' + result.error);
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Произошла ошибка при отправке формы');
  }
}
function initFlightsManager() {
  loadUserData();
  updateImageCountDisplay();
  const addFlightForm = document.getElementById('addFlightForm');
  if (addFlightForm) {
    addFlightForm.removeEventListener('submit', handleFormSubmit);
    addFlightForm.addEventListener('submit', handleFormSubmit);
  }
}

function showError(message) {
  showNotification(message, 'error');
}

function showSuccess(message) {
  showNotification(message, 'success');
}

function showNotification(message, type = 'info') {
  let notificationContainer = document.querySelector('.notification-container');
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.className = 'notification-container';
    document.body.appendChild(notificationContainer);
  }

  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon material-symbols-outlined">${getNotificationIcon(type)}</span>
        <span class="notification-message">${message}</span>
      </div>
    `;

  notificationContainer.appendChild(notification);

  setTimeout(() => notification.classList.add('show'), 100);
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 4000);
}

function getNotificationIcon(type) {
  const icons = {
    success: 'check_circle',
    error: 'error',
    warning: 'warning',
    info: 'info'
  };
  return icons[type] || 'info';
}

document.addEventListener('DOMContentLoaded', function() {
  initFlightsManager();
});
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  initFlightsManager();
}