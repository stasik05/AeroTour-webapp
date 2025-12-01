let selectedTour = null;
const editSelectedCities = [];
const editSelectedImages = [];
let currentUser = null;

async function loadTours() {
  try {
    const response = await fetch('/api/tours/all');
    const result = await response.json();
    if (result.success) {
      displayTours(result.tours);
    } else {
      console.error('Error loading tours:', result.error);
    }
  } catch (error) {
    console.error('Error:', error);
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

document.addEventListener('DOMContentLoaded', loadUserData);

function displayTours(tours) {
  const container = document.getElementById('toursContainer');
  container.innerHTML = '';

  tours.forEach(tour => {
    const tourElement = document.createElement('div');
    tourElement.className = 'tour-item';
    tourElement.innerHTML = `
        <div class="tour-title">${tour.title}</div>
        <div class="tour-details">
          ${tour.country}, ${tour.city}<br>
          ${tour.dates}<br>
          ${tour.price}
        </div>
      `;

    tourElement.addEventListener('click', () => selectTour(tour.id));
    container.appendChild(tourElement);
  });
}

async function selectTour(tourId) {
  try {
    const response = await fetch(`/api/tours/${tourId}`);
    const result = await response.json();

    if (result.success) {
      selectedTour = result.tour;
      displayTourForm();
      updateEditForm(selectedTour);
    } else {
      showError('Ошибка загрузки тура: ' + result.error);
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Произошла ошибка при загрузке тура');
  }
}

function displayTourForm() {
  document.getElementById('noTourSelected').style.display = 'none';
  document.getElementById('editTourForm').style.display = 'block';
}

function updateEditForm(tour) {
  document.getElementById('edit_tour_id').value = tour.id;
  document.getElementById('edit_title').value = tour.title;
  document.getElementById('edit_description').value = tour.description;
  document.getElementById('edit_country').value = tour.country;
  document.getElementById('edit_city').value = tour.city;
  document.getElementById('edit_start_date').value = tour.startDate;
  document.getElementById('edit_end_date').value = tour.endDate;
  document.getElementById('edit_price').value = typeof tour.price === 'string'
    ? parseFloat(tour.price.replace(/[^\d.,]/g, '').replace(',', '.'))
    : tour.price;

  document.getElementById('edit_transportation_included').checked = tour.transportationIncluded;
  document.getElementById('edit_available').checked = tour.available !== false;
  editSelectedCities.length = 0;
  if (tour.availableCities && Array.isArray(tour.availableCities)) {
    tour.availableCities.forEach(city => editSelectedCities.push(city));
  }
  updateEditCitiesList();

  const existingImagesContainer = document.getElementById('existingImages');
  existingImagesContainer.innerHTML = '';

  if (tour.images && tour.images.length > 0) {
    tour.images.forEach(image => {
      const imgElement = document.createElement('div');
      imgElement.className = 'preview-item';
      imgElement.innerHTML = `
        <img src="${image.url}" alt="Tour image">
        <button type="button" class="remove-image" onclick="deleteImage(${image.id})">
          <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
        </button>
      `;
      existingImagesContainer.appendChild(imgElement);
    });
  }

  editSelectedImages.length = 0;
  updateEditImagePreview();
  updateImageCountDisplay();
}

function addEditCity() {
  const cityInput = document.getElementById('edit_newCity');
  const city = cityInput.value.trim();

  if (city && !editSelectedCities.includes(city)) {
    editSelectedCities.push(city);
    updateEditCitiesList();
    cityInput.value = '';
  }
}

function removeEditCity(index) {
  editSelectedCities.splice(index, 1);
  updateEditCitiesList();
}

function updateEditCitiesList() {
  const citiesList = document.getElementById('editCitiesList');
  const citiesInput = document.getElementById('edit_available_cities');

  citiesList.innerHTML = '';
  editSelectedCities.forEach((city, index) => {
    const cityTag = document.createElement('div');
    cityTag.className = 'city-tag';
    cityTag.innerHTML = `
        ${city}
        <button type="button" class="remove-city" onclick="removeEditCity(${index})">
          <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
        </button>
      `;
    citiesList.appendChild(cityTag);
  });

  citiesInput.value = JSON.stringify(editSelectedCities);
}

function handleEditImageSelect(event) {
  const files = event.target.files;
  const existingImagesCount = document.getElementById('existingImages').children.length;
  const currentTotalImages = existingImagesCount + editSelectedImages.length;
  const remainingSlots = 4 - currentTotalImages;

  if (remainingSlots <= 0) {
    showError('Тур должен содержать ровно 4 изображения. Удалите существующие, чтобы добавить новые.');
    event.target.value = '';
    return;
  }
  const filesToAdd = Math.min(files.length, remainingSlots);
  for (let i = 0; i < filesToAdd; i++) {
    const file = files[i];
    editSelectedImages.push(file);
  }
  if (files.length > filesToAdd) {
    showError(`Можно добавить только ${filesToAdd} из ${files.length} изображений. Всего должно быть ровно 4.`);
  }

  updateEditImagePreview();
  updateImageCountDisplay();
  event.target.value = '';
}

function removeEditImage(index) {
  editSelectedImages.splice(index, 1);
  updateEditImagePreview();
  updateImageCountDisplay();
}

function updateEditImagePreview() {
  const preview = document.getElementById('editImagePreview');
  preview.innerHTML = '';

  editSelectedImages.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const previewItem = document.createElement('div');
      previewItem.className = 'preview-item';
      previewItem.innerHTML = `
          <img src="${e.target.result}" alt="Preview">
          <button type="button" class="remove-image" onclick="removeEditImage(${index})">
            <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
          </button>
        `;
      preview.appendChild(previewItem);
    };
    reader.readAsDataURL(file);
  });
}

function updateImageCountDisplay() {
  const existingImagesCount = document.getElementById('existingImages').children.length;
  const newImagesCount = editSelectedImages.length;
  const totalImagesCount = existingImagesCount + newImagesCount;

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

  const imageInput = document.getElementById('edit_images');
  imageInput.parentNode.insertBefore(countDisplay, imageInput.nextSibling);

  return countDisplay;
}

async function deleteImage(imageId) {
  if (!confirm('Удалить это изображение?')) return;

  try {
    const response = await fetch(`/api/tours/image/${imageId}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (result.success) {
      showSuccess('Изображение удалено');
      if (selectedTour) {
        selectTour(selectedTour.id);
      }
    } else {
      showError('Ошибка при удалении изображения: ' + result.error);
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Произошла ошибка при удалении изображения');
  }
}

document.getElementById('editTourForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  if (!selectedTour) {
    showError('Тур не выбран');
    return;
  }
  const existingImagesCount = document.getElementById('existingImages').children.length;
  const totalImagesCount = existingImagesCount + editSelectedImages.length;
  if (totalImagesCount !== 4) {
    showError(`Тур должен содержать ровно 4 изображения. Сейчас: ${totalImagesCount}`);
    return;
  }
  const formData = new FormData();
  formData.append('title', document.getElementById('edit_title').value);
  formData.append('description', document.getElementById('edit_description').value);
  formData.append('country', document.getElementById('edit_country').value);
  formData.append('city', document.getElementById('edit_city').value);
  formData.append('start_date', document.getElementById('edit_start_date').value);
  formData.append('end_date', document.getElementById('edit_end_date').value);
  formData.append('price', document.getElementById('edit_price').value);
  formData.append('transportation_included', document.getElementById('edit_transportation_included').checked);
  formData.append('available', document.getElementById('edit_available').checked);
  formData.append('available_cities', document.getElementById('edit_available_cities').value);

  editSelectedImages.forEach((image, index) => {
    formData.append('images', image);
  });

  try {
    const response = await fetch(`/api/tours/update/${selectedTour.id}`, {
      method: 'PUT',
      body: formData
    });

    const result = await response.json();

    if (result.success) {
      showSuccess('Тур успешно обновлен!');
      loadTours();
      document.getElementById('noTourSelected').style.display = 'block';
      document.getElementById('editTourForm').style.display = 'none';
      selectedTour = null;
      editSelectedImages.length = 0;
    } else {
      showError('Ошибка при обновлении тура: ' + result.error);
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Произошла ошибка при отправке формы');
  }
});

function showSuccess(message) {
  showNotification(message, 'success');
}

function showError(message) {
  showNotification(message, 'error');
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

document.addEventListener('DOMContentLoaded', loadTours);