const selectedCities = [];
const selectedImages = [];

function addCity() {
  const cityInput = document.getElementById('newCity');
  const city = cityInput.value.trim();

  if (city && !selectedCities.includes(city)) {
    selectedCities.push(city);
    updateCitiesList();
    cityInput.value = '';
  }
}

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

document.addEventListener('DOMContentLoaded', function() {
  loadUserData();
  updateImageCountDisplay();
});

function removeCity(index) {
  selectedCities.splice(index, 1);
  updateCitiesList();
}

function updateCitiesList() {
  const citiesList = document.getElementById('citiesList');
  const citiesInput = document.getElementById('available_cities');

  citiesList.innerHTML = '';
  selectedCities.forEach((city, index) => {
    const cityTag = document.createElement('div');
    cityTag.className = 'city-tag';
    cityTag.innerHTML = `
        ${city}
        <button type="button" class="remove-city" onclick="removeCity(${index})">
          <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
        </button>
      `;
    citiesList.appendChild(cityTag);
  });

  citiesInput.value = JSON.stringify(selectedCities);
}

function handleImageSelect(event) {
  const files = event.target.files;
  const remainingSlots = 4 - selectedImages.length;

  if (remainingSlots <= 0) {
    showError('Тур должен содержать ровно 4 изображения. Удалите существующие, чтобы добавить новые.');
    event.target.value = '';
    return;
  }
  const filesToAdd = Math.min(files.length, remainingSlots);

  for (let i = 0; i < filesToAdd; i++) {
    const file = files[i];
    selectedImages.push(file);
  }
  if (files.length > filesToAdd) {
    showError(`Можно добавить только ${filesToAdd} из ${files.length} изображений. Всего должно быть ровно 4.`);
  }

  updateImagePreview();
  updateImageCountDisplay();
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
  countDisplay.textContent = `Изображений: ${totalImagesCount}/4`;

  if (totalImagesCount < 4) {
    countDisplay.className = 'image-count-warning';
  } else if (totalImagesCount === 4) {
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

document.getElementById('addTourForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  if (selectedImages.length !== 4) {
    showError(`Тур должен содержать ровно 4 изображения. Сейчас: ${selectedImages.length}`);
    return;
  }
  const formData = new FormData();
  formData.append('title', document.getElementById('title').value);
  formData.append('description', document.getElementById('description').value);
  formData.append('country', document.getElementById('country').value);
  formData.append('city', document.getElementById('city').value);
  formData.append('start_date', document.getElementById('start_date').value);
  formData.append('end_date', document.getElementById('end_date').value);
  formData.append('price', document.getElementById('price').value);
  formData.append('transportation_included', document.getElementById('transportation_included').checked);
  formData.append('available', document.getElementById('available').checked);
  formData.append('available_cities', document.getElementById('available_cities').value);
  selectedImages.forEach((image, index) => {
    formData.append('images', image);
  });

  try {
    const response = await fetch('/api/tours/add', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (result.success) {
      showSuccess('Тур успешно добавлен!');
      window.location.href = '/manager/main-menu/tours';
    } else {
      showError('Ошибка при добавлении тура: ' + result.error);
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Произошла ошибка при отправке формы');
  }
});

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