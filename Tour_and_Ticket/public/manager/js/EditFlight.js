let selectedFlight = null;
const editSelectedImages = [];
let currentUser = null;

async function loadFlights() {
  try {
    const response = await fetch('/api/flights/all');
    const result = await response.json();
    if (result.success) {
      displayFlights(result.flights);
    } else {
      console.error('Error loading flights:', result.error);
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

document.addEventListener('DOMContentLoaded', function() {
  loadUserData();
  loadFlights();
});

function displayFlights(flights) {
  const container = document.getElementById('flightsContainer');
  container.innerHTML = '';

  flights.forEach(flight => {
    const flightElement = document.createElement('div');
    flightElement.className = 'flight-item';
    flightElement.innerHTML = `
        <div class="flight-title">${flight.airline} ${flight.flightNumber}</div>
        <div class="flight-details1">
          ${flight.route}<br>
          ${flight.departureTime}<br>
          ${flight.price}
        </div>
      `;

    flightElement.addEventListener('click', () => selectFlight(flight.id));
    container.appendChild(flightElement);
  });
}

async function selectFlight(flightId) {
  try {
    const response = await fetch(`/api/flights/${flightId}`);
    const result = await response.json();

    if (result.success) {
      selectedFlight = result.flight;
      displayFlightForm();
      updateEditForm(selectedFlight);
    } else {
      showError('Ошибка загрузки перелета: ' + result.error);
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Произошла ошибка при загрузке перелета');
  }
}

function displayFlightForm() {
  document.getElementById('noFlightSelected').style.display = 'none';
  document.getElementById('editFlightForm').style.display = 'block';
}

function updateEditForm(flight) {
  document.getElementById('edit_flight_id').value = flight.id;
  document.getElementById('edit_airline').value = flight.airline;
  document.getElementById('edit_flight_number').value = flight.flightNumber;
  document.getElementById('edit_departure_city').value = flight.departureCity;
  document.getElementById('edit_arrival_city').value = flight.arrivalCity;
  document.getElementById('edit_departure_time').value = flight.departureTime;
  document.getElementById('edit_arrival_time').value = flight.arrivalTime;
  document.getElementById('edit_price').value = typeof flight.price === 'string'
    ? parseFloat(flight.price.replace(/[^\d.,]/g, '').replace(',', '.'))
    : flight.price;
  document.getElementById('edit_baggage_price').value = flight.baggagePrice;
  document.getElementById('edit_aircraft_type').value = flight.aircraftType || '';
  document.getElementById('edit_total_seats').value = flight.totalSeats || '';
  document.getElementById('edit_available').checked = flight.available !== false;

  const existingImagesContainer = document.getElementById('existingImages');
  existingImagesContainer.innerHTML = '';

  if (flight.images && flight.images.length > 0) {
    flight.images.forEach(image => {
      const imgElement = document.createElement('div');
      imgElement.className = 'preview-item';
      imgElement.innerHTML = `
        <img src="${image.url}" alt="Flight image">
        <button type="button" class="remove-image" onclick="deleteImage(${image.id})">
          <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
        </button>
      `;
      existingImagesContainer.appendChild(imgElement);
    });
  }

  editSelectedImages.length = 0;
  updateEditImagePreview();
  updateEditImageCountDisplay();
}

function handleEditImageSelect(event) {
  const files = event.target.files;
  const existingImagesCount = document.getElementById('existingImages').children.length;
  const currentTotalImages = existingImagesCount + editSelectedImages.length;
  if (files.length > 0) {
    const file = files[0];
    editSelectedImages.length = 0;
    editSelectedImages.push(file);
    updateEditImagePreview();
    updateEditImageCountDisplay();
  }

  event.target.value = '';
}

function removeEditImage(index) {
  editSelectedImages.splice(index, 1);
  updateEditImagePreview();
  updateEditImageCountDisplay();
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

function updateEditImageCountDisplay() {
  const existingImagesCount = document.getElementById('existingImages').children.length;
  const newImagesCount = editSelectedImages.length;
  const totalImagesCount = existingImagesCount + newImagesCount;

  const countDisplay = document.getElementById('editImageCountDisplay') || createEditImageCountDisplay();
  countDisplay.textContent = `Изображений: ${totalImagesCount}/1`;

  if (totalImagesCount < 1) {
    countDisplay.className = 'image-count-warning';
  } else if (totalImagesCount === 1) {
    countDisplay.className = 'image-count-success';
  } else {
    countDisplay.className = 'image-count-error';
  }
}

function createEditImageCountDisplay() {
  const countDisplay = document.createElement('div');
  countDisplay.id = 'editImageCountDisplay';
  countDisplay.style.margin = '10px 0';
  countDisplay.style.fontWeight = 'bold';
  countDisplay.style.padding = '5px';
  countDisplay.style.borderRadius = '4px';

  const imageInput = document.getElementById('edit_images');
  if (imageInput && imageInput.parentNode) {
    imageInput.parentNode.insertBefore(countDisplay, imageInput.nextSibling);
  }

  return countDisplay;
}

async function deleteImage(imageId) {
  const existingImagesCount = document.getElementById('existingImages').children.length;
  const newImagesCount = editSelectedImages.length;
  const totalImagesCount = existingImagesCount + newImagesCount;

  if (totalImagesCount <= 1) {
    showError('Нельзя удалить изображение: авиабилет должен содержать ровно 1 изображение. Сначала добавьте новое изображение.');
    return;
  }

  if (!confirm('Удалить это изображение?')) return;

  try {
    const response = await fetch(`/api/flights/image/${imageId}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (result.success) {
      showSuccess('Изображение удалено');
      if (selectedFlight) {
        selectFlight(selectedFlight.id);
      }
    } else {
      showError('Ошибка при удалении изображения: ' + result.error);
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Произошла ошибка при удалении изображения');
  }
}

document.getElementById('editFlightForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  if (!selectedFlight) {
    showError('Перелет не выбран');
    return;
  }
  const existingImagesCount = document.getElementById('existingImages').children.length;
  const totalImagesCount = existingImagesCount + editSelectedImages.length;

  if (totalImagesCount !== 1) {
    showError(`Авиабилет должен содержать ровно 1 изображение. Сейчас: ${totalImagesCount}`);
    return;
  }

  const formData = new FormData();
  formData.append('airline', document.getElementById('edit_airline').value);
  formData.append('flight_number', document.getElementById('edit_flight_number').value);
  formData.append('departure_city', document.getElementById('edit_departure_city').value);
  formData.append('arrival_city', document.getElementById('edit_arrival_city').value);
  formData.append('departure_time', document.getElementById('edit_departure_time').value);
  formData.append('arrival_time', document.getElementById('edit_arrival_time').value);
  formData.append('price', document.getElementById('edit_price').value);
  formData.append('baggage_price', document.getElementById('edit_baggage_price').value);
  formData.append('aircraft_type', document.getElementById('edit_aircraft_type').value);
  formData.append('total_seats', document.getElementById('edit_total_seats').value);
  formData.append('available', document.getElementById('edit_available').checked);

  editSelectedImages.forEach((image, index) => {
    formData.append('image', image);
  });

  try {
    const response = await fetch(`/api/flights/update/${selectedFlight.id}`, {
      method: 'PUT',
      body: formData
    });

    const result = await response.json();

    if (result.success) {
      showSuccess('Перелет успешно обновлен!');
      loadFlights();
      document.getElementById('noFlightSelected').style.display = 'block';
      document.getElementById('editFlightForm').style.display = 'none';
      selectedFlight = null;
      editSelectedImages.length = 0;
    } else {
      showError('Ошибка при обновлении перелета: ' + result.error);
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