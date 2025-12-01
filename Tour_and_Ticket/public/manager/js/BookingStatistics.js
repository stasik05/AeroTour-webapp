let charts = {};
let currentStatsData = {};
let isInitialized = false;
let currentUser = null;
function initializeApp() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
    document.addEventListener('DOMContentLoaded', loadUserData);
  } else {
    startApp();
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

function startApp() {
  checkElementsAndLoad(0);
}

function checkElementsAndLoad(attempt) {
  const maxAttempts = 10;

  const requiredElements = {
    yearFilter: document.getElementById('yearFilter'),
    typeFilter: document.getElementById('typeFilter'),
    statusFilter: document.getElementById('statusFilter'),
    groupByFilter: document.getElementById('groupByFilter'),
    statsOverview: document.getElementById('statsOverview')
  };

  const missingElements = Object.entries(requiredElements)
    .filter(([key, element]) => !element)
    .map(([key]) => key);
  loadYears();
  loadStatistics();
}
async function loadYears() {
  try {
    const response = await fetch('/api/bookings/stats/years');
    const data = await response.json();

    if (data.success) {
      const yearFilter = document.getElementById('yearFilter');
      if (yearFilter) {
        yearFilter.innerHTML = '<option value="all">Все годы</option>';
        data.years.forEach(year => {
          const option = document.createElement('option');
          option.value = year;
          option.textContent = year;
          yearFilter.appendChild(option);
        });
      }
    }
  } catch (error) {
    console.error('Error loading years:', error);
  }
}

async function loadStatistics() {
  try {
    showLoading(true);
    const filters = {
      year: getSafeElementValue('yearFilter', 'all'),
      type: getSafeElementValue('typeFilter', 'all'),
      status: getSafeElementValue('statusFilter', 'all'),
      groupBy: getSafeElementValue('groupByFilter', 'month')
    };

    const params = new URLSearchParams(filters);
    const response = await fetch(`/api/bookings/stats/data?${params}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.success) {
      currentStatsData = data.stats;
      updateStatsOverviewWithRetry(data.stats.overview);
      renderCharts(data.stats);
    } else {
      showError('Ошибка при загрузке статистики: ' + (data.message || 'Неизвестная ошибка'));
    }
  } catch (error) {
    showError('Ошибка при загрузке статистики: ' + error.message);
  } finally {
    showLoading(false);
  }
}
function getSafeElementValue(elementId, defaultValue) {
  const element = document.getElementById(elementId);
  return element ? element.value : defaultValue;
}
function updateStatsOverviewWithRetry(overview, attempt = 0) {
  const maxAttempts = 5;

  if (!overview) {
    console.warn("Overview data is missing");
    return;
  }

  const elements = {
    totalBookings: document.getElementById('totalBookings'),
    totalRevenue: document.getElementById('totalRevenue'),
    avgBookingValue: document.getElementById('avgBookingValue'),
    completionRate: document.getElementById('completionRate')
  };

  const missingElements = Object.entries(elements)
    .filter(([key, element]) => !element)
    .map(([key]) => key);

  if (missingElements.length > 0)
  {

    if (attempt < maxAttempts) {
      setTimeout(() => updateStatsOverviewWithRetry(overview, attempt + 1), 50);
      return;
    } else {
      console.error('Failed to update stats after', maxAttempts, 'attempts');
      return;
    }
  }
  try {
    elements.totalBookings.textContent = formatNumber(overview.totalBookings ?? 0);
    elements.totalRevenue.textContent = formatCurrency(overview.totalRevenue ?? 0);
    elements.avgBookingValue.textContent = formatCurrency(overview.avgBookingValue ?? 0);
    elements.completionRate.textContent = overview.completionRate + `%`;
  } catch (error) {
    console.error('Error updating stats overview:', error);
  }
}
function formatNumber(value) {
  return (value ?? 0).toLocaleString('ru-RU');
}
function formatCurrency(value) {
  return `${formatNumber(value)} €`;
}

function renderCharts(stats)
{
  Object.values(charts).forEach(chart => {
    if (chart && typeof chart.destroy === 'function') {
      chart.destroy();
    }
  });
  charts = {};
  function createChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.warn(`Canvas element with id '${canvasId}' not found`);
      return null;
    }
    try {
      return new Chart(canvas.getContext('2d'), config);
    } catch (error) {
      console.error(`Error creating chart for ${canvasId}:`, error);
      return null;
    }
  }
  if (stats.bookingsByMonth) {
    charts.bookingsByMonth = createChart('bookingsByMonthChart', {
      type: 'line',
      data: {
        labels: stats.bookingsByMonth.labels || [],
        datasets: [{
          label: 'Количество бронирований',
          data: stats.bookingsByMonth.data || [],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Количество'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Месяцы'
            }
          }
        }
      }
    });
  }
  if (stats.bookingsByType) {
    charts.bookingsByType = createChart('bookingsByTypeChart', {
      type: 'pie',
      data: {
        labels: stats.bookingsByType.labels || [],
        datasets: [{
          data: stats.bookingsByType.data || [],
          backgroundColor: [
            '#3b82f6',
            '#10b981',
            '#f59e0b',
            '#ef4444',
            '#8b5cf6'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right'
          }
        }
      }
    });
  }
  if (stats.revenueByMonth) {
    charts.revenueByMonth = createChart('revenueByMonthChart', {
      type: 'bar',
      data: {
        labels: stats.revenueByMonth.labels || [],
        datasets: [{
          label: 'Выручка (€)',
          data: stats.revenueByMonth.data || [],
          backgroundColor: 'rgba(16, 185, 129, 0.7)',
          borderColor: '#10b981',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Выручка (€)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Месяцы'
            }
          }
        }
      }
    });
  }
  if (stats.bookingsByCountry) {
    charts.bookingsByCountry = createChart('bookingsByCountryChart', {
      type: 'bar',
      data: {
        labels: stats.bookingsByCountry.labels || [],
        datasets: [{
          label: 'Количество бронирований',
          data: stats.bookingsByCountry.data || [],
          backgroundColor: 'rgba(139, 92, 246, 0.7)',
          borderColor: '#8b5cf6',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Количество бронирований'
            }
          }
        }
      }
    });
  }
  if (stats.bookingsByStatus) {
    charts.bookingsByStatus = createChart('bookingsByStatusChart', {
      type: 'doughnut',
      data: {
        labels: stats.bookingsByStatus.labels || [],
        datasets: [{
          data: stats.bookingsByStatus.data || [],
          backgroundColor: [
            '#10b981',
            '#3b82f6',
            '#ef4444'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right'
          }
        }
      }
    });
  }
  if (stats.bookingsByCity) {
    charts.bookingsByCity = createChart('bookingsByCityChart', {
      type: 'bar',
      data: {
        labels: stats.bookingsByCity.labels || [],
        datasets: [{
          label: 'Количество бронирований',
          data: stats.bookingsByCity.data || [],
          backgroundColor: 'rgba(245, 158, 11, 0.7)',
          borderColor: '#f59e0b',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Количество бронирований'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Города'
            }
          }
        }
      }
    });
  }
  if (stats.bookingsBySeason) {
    charts.bookingsBySeason = createChart('bookingsBySeasonChart', {
      type: 'polarArea',
      data: {
        labels: stats.bookingsBySeason.labels || ['Зима', 'Весна', 'Лето', 'Осень'],
        datasets: [{
          data: stats.bookingsBySeason.data || [],
          backgroundColor: [
            '#3b82f6',
            '#10b981',
            '#f59e0b',
            '#ef4444'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right'
          }
        }
      }
    });
  }
  if (stats.bookingsByPrice) {
    charts.bookingsByPrice = createChart('bookingsByPriceChart', {
      type: 'bar',
      data: {
        labels: stats.bookingsByPrice.labels || ['0-100€', '101-300€', '301-500€', '501-1000€', '1000+€'],
        datasets: [{
          label: 'Количество бронирований',
          data: stats.bookingsByPrice.data || [],
          backgroundColor: 'rgba(168, 85, 247, 0.7)',
          borderColor: '#a855f7',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Количество бронирований'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Диапазоны стоимости'
            }
          }
        }
      }
    });
  }
  if (stats.bookingsByTravelers) {
    charts.bookingsByTravelers = createChart('bookingsByTravelersChart', {
      type: 'line',
      data: {
        labels: stats.bookingsByTravelers.labels || ['1', '2', '3', '4', '5+'],
        datasets: [{
          label: 'Количество бронирований',
          data: stats.bookingsByTravelers.data || [],
          borderColor: '#ec4899',
          backgroundColor: 'rgba(236, 72, 153, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Количество бронирований'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Количество путешественников'
            }
          }
        }
      }
    });
  }
  if (stats.bookingsByAirline) {
    charts.bookingsByAirline = createChart('bookingsByAirlineChart', {
      type: 'doughnut',
      data: {
        labels: stats.bookingsByAirline.labels || [],
        datasets: [{
          data: stats.bookingsByAirline.data || [],
          backgroundColor: [
            '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
            '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#64748b'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right'
          }
        }
      }
    });
  }
  const missingCharts = [
    'bookingsBySeasonChart',
    'bookingsByPriceChart',
    'bookingsByTravelersChart'
  ];
  missingCharts.forEach(chartId => {
    const canvas = document.getElementById(chartId);
    if (canvas && !charts[chartId.replace('Chart', '')]) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Данные отсутствуют', canvas.width / 2, canvas.height / 2);
    }
  });
}
function resetFilters() {
  setSafeElementValue('yearFilter', 'all');
  setSafeElementValue('typeFilter', 'all');
  setSafeElementValue('statusFilter', 'all');
  setSafeElementValue('groupByFilter', 'month');
  loadStatistics();
}
function setSafeElementValue(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) {
    element.value = value;
  }
}
function exportData(format) {
  const pdfBtn = document.getElementById('pdfExportBtn');
  const excelBtn = document.getElementById('excelExportBtn');
  const targetBtn = format === 'pdf' ? pdfBtn : excelBtn;

  try {
    if (targetBtn) {
      targetBtn.disabled = true;
      targetBtn.classList.add('btn-loading');
    }
    if (!currentStatsData || Object.keys(currentStatsData).length === 0) {
      throw new Error('Нет данных для экспорта. Сначала загрузите статистику.');
    }
    switch (format) {
      case 'excel':
        exportToExcel();
        break;
      case 'pdf':
        exportToPDF();
        break;
      default:
        throw new Error('Неизвестный формат экспорта');
    }
  } catch (error) {
    console.error('Export error:', error);
    showError('Ошибка при экспорте данных: ' + error.message);
  } finally {
    if (targetBtn) {
      targetBtn.disabled = false;
      targetBtn.classList.remove('btn-loading');
    }
  }
}
function showLoading(show)
{
  const statsOverview = document.getElementById('statsOverview');
  const chartsGrid = document.querySelector('.charts-grid');
  if (show) {
    if (statsOverview) {
      statsOverview.dataset.originalContent = statsOverview.innerHTML;
      const statsLoadingHTML = `
        <div class="stat-card loading" style="grid-column: 1 / -1;">
          <span class="material-symbols-outlined" style="font-size: 48px; margin-bottom: 16px;">sync</span>
          <div>Загрузка статистики...</div>
        </div>
      `;
      statsOverview.innerHTML = statsLoadingHTML;
    }

    if (chartsGrid) {
      chartsGrid.classList.add('loading-charts');
    }
  } else {
    if (statsOverview && statsOverview.dataset.originalContent) {
      statsOverview.innerHTML = statsOverview.dataset.originalContent;
    }
    if (chartsGrid) {
      chartsGrid.classList.remove('loading-charts');
    }
  }
}
function exportToExcel() {
  const wb = XLSX.utils.book_new();
  const overviewData = [
    ['Статистика бронирований', ''],
    ['Период', getExportPeriod()],
    ['Дата экспорта', new Date().toLocaleDateString('ru-RU')],
    [''],
    ['Показатель', 'Значение'],
    ['Всего бронирований', currentStatsData.overview?.totalBookings || 0],
    ['Общая выручка', `${(currentStatsData.overview?.totalRevenue || 0).toLocaleString('ru-RU')} €`],
    ['Средний чек', `${(currentStatsData.overview?.avgBookingValue || 0).toLocaleString('ru-RU')} €`],
    ['Процент завершения', `${currentStatsData.overview?.completionRate || 0}%`]
  ];
  const overviewWs = XLSX.utils.aoa_to_sheet(overviewData);
  XLSX.utils.book_append_sheet(wb, overviewWs, 'Общая статистика');
  if (currentStatsData.bookingsByMonth) {
    const monthlyData = [
      ['Бронирования по месяцам'],
      ['Месяц', 'Количество бронирований', 'Выручка (€)']
    ];
    currentStatsData.bookingsByMonth.labels.forEach((label, index) => {
      monthlyData.push([
        label,
        currentStatsData.bookingsByMonth.data[index] || 0,
        (currentStatsData.revenueByMonth?.data[index] || 0).toLocaleString('ru-RU')
      ]);
    });
    const monthlyWs = XLSX.utils.aoa_to_sheet(monthlyData);
    XLSX.utils.book_append_sheet(wb, monthlyWs, 'По месяцам');
  }
  if (currentStatsData.bookingsByType) {
    const typeData = [
      ['Распределение по типам бронирований'],
      ['Тип', 'Количество', 'Доля (%)']
    ];
    const total = currentStatsData.bookingsByType.data.reduce((sum, val) => sum + val, 0);
    currentStatsData.bookingsByType.labels.forEach((label, index) => {
      const count = currentStatsData.bookingsByType.data[index] || 0;
      const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
      typeData.push([label, count, `${percentage}%`]);
    });
    const typeWs = XLSX.utils.aoa_to_sheet(typeData);
    XLSX.utils.book_append_sheet(wb, typeWs, 'По типам');
  }
  if (currentStatsData.bookingsByCountry) {
    const countryData = [
      ['Бронирования по странам'],
      ['Страна', 'Количество бронирований']
    ];
    currentStatsData.bookingsByCountry.labels.forEach((label, index) => {
      countryData.push([label, currentStatsData.bookingsByCountry.data[index] || 0]);
    });
    const countryWs = XLSX.utils.aoa_to_sheet(countryData);
    XLSX.utils.book_append_sheet(wb, countryWs, 'По странам');
  }
  if (currentStatsData.bookingsBySeason) {
    const seasonData = [
      ['Бронирования по сезонам'],
      ['Сезон', 'Количество бронирований', 'Доля (%)']
    ];
    const total = currentStatsData.bookingsBySeason.data.reduce((sum, val) => sum + val, 0);
    currentStatsData.bookingsBySeason.labels.forEach((label, index) => {
      const count = currentStatsData.bookingsBySeason.data[index] || 0;
      const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
      seasonData.push([label, count, `${percentage}%`]);
    });

    const seasonWs = XLSX.utils.aoa_to_sheet(seasonData);
    XLSX.utils.book_append_sheet(wb, seasonWs, 'По сезонам');
  }
  const fileName = `Статистика_бронирований_${getExportPeriod()}_${new Date().getTime()}.xlsx`;
  XLSX.writeFile(wb, fileName);

  showSuccess('Excel файл успешно скачан');
}
function exportToPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text('Статистика бронирований', 105, 20, { align: 'center' });
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Период: ${getExportPeriod()}`, 20, 35);
  doc.text(`Дата экспорта: ${new Date().toLocaleDateString('ru-RU')}`, 20, 45);
  let yPosition = 65;
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text('Общая статистика', 20, yPosition);
  yPosition += 10;

  doc.setFontSize(12);
  const overview = currentStatsData.overview || {};
  doc.text(`• Всего бронирований: ${overview.totalBookings || 0}`, 25, yPosition);
  yPosition += 8;
  doc.text(`• Общая выручка: ${(overview.totalRevenue || 0).toLocaleString('ru-RU')} €`, 25, yPosition);
  yPosition += 8;
  doc.text(`• Средний чек: ${(overview.avgBookingValue || 0).toLocaleString('ru-RU')} €`, 25, yPosition);
  yPosition += 8;
  doc.text(`• Процент завершения: ${overview.completionRate || 0}%`, 25, yPosition);
  yPosition += 20;
  if (currentStatsData.bookingsByMonth && yPosition < 250) {
    doc.setFontSize(16);
    doc.text('Бронирования по месяцам', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    currentStatsData.bookingsByMonth.labels.forEach((label, index) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      const count = currentStatsData.bookingsByMonth.data[index] || 0;
      doc.text(`• ${label}: ${count} бронирований`, 25, yPosition);
      yPosition += 6;
    });
    yPosition += 10;
  }
  if (currentStatsData.bookingsByType && yPosition < 250) {
    doc.setFontSize(16);
    doc.text('Распределение по типам', 20, yPosition);
    yPosition += 10;
    doc.setFontSize(10);
    const total = currentStatsData.bookingsByType.data.reduce((sum, val) => sum + val, 0);
    currentStatsData.bookingsByType.labels.forEach((label, index) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      const count = currentStatsData.bookingsByType.data[index] || 0;
      const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
      doc.text(`• ${label}: ${count} (${percentage}%)`, 25, yPosition);
      yPosition += 6;
    });
  }
  const fileName = `Статистика_бронирований_${getExportPeriod()}_${new Date().getTime()}.pdf`;
  doc.save(fileName);

  showSuccess('PDF файл успешно скачан');
}
function getExportPeriod() {
  const yearFilter = document.getElementById('yearFilter');
  const year = yearFilter ? yearFilter.value : 'all';

  if (year === 'all') {
    return 'Все годы';
  } else {
    return year;
  }
}
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
        <span class="notification-icon material-symbols-outlined">${this.getNotificationIcon(type)}</span>
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

initializeApp();