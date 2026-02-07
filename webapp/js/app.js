/**
 * OneMachine ControlBox - Main Application
 * Lógica principal de la WebApp de administración
 */

// ==================== STATE ====================
let usersData = [];
let devicesData = [];
let logsData = [];

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initMobileMenu();
  initModals();
  initButtons();
  loadConfig();
  loadData();
});

// ==================== MOBILE MENU ====================
function initMobileMenu() {
  const sidebar = document.querySelector('.sidebar');
  const menuBtn = document.getElementById('mobile-menu-btn');
  const closeBtn = document.getElementById('mobile-close-btn');

  // Crear overlay si no existe
  let overlay = document.querySelector('.sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
  }

  // Abrir menú
  menuBtn.addEventListener('click', () => {
    sidebar.classList.add('open');
    overlay.classList.add('active');
  });

  // Cerrar menú con botón X
  closeBtn.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  });

  // Cerrar menú al hacer click en overlay
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  });

  // Cerrar menú al seleccionar una opción (en móvil)
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      }
    });
  });
}

// ==================== NAVIGATION ====================
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const viewName = item.dataset.view;
      switchView(viewName);

      // Update active state
      navItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    });
  });
}

function switchView(viewName) {
  // Hide all views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

  // Show selected view
  const view = document.getElementById(`${viewName}-view`);
  if (view) {
    view.classList.add('active');
  }

  // Update title
  const titles = {
    dashboard: 'Dashboard',
    logs: 'Logs de Acceso',
    users: 'Gestión de Usuarios',
    devices: 'Gestión de Dispositivos',
    config: 'Configuración'
  };
  document.getElementById('page-title').textContent = titles[viewName] || viewName;
}

// ==================== DATA LOADING ====================
async function loadData() {
  try {
    await Promise.all([
      loadUsers(),
      loadDevices(),
      loadLogs()
    ]);
    updateDashboard();
  } catch (error) {
    console.error('Error loading data:', error);
    showToast('Error al cargar datos: ' + error.message, 'error');
  }
}

async function loadUsers() {
  try {
    usersData = await api.getUsers();
    renderUsers();
    return usersData;
  } catch (error) {
    usersData = [];
    throw error;
  }
}

async function loadDevices() {
  try {
    devicesData = await api.getDevices();
    renderDevices();
    populateDeviceFilter();
    return devicesData;
  } catch (error) {
    devicesData = [];
    throw error;
  }
}

async function loadLogs() {
  try {
    logsData = await api.getLogs({ limit: 100 });
    renderLogs();
    return logsData;
  } catch (error) {
    logsData = [];
    throw error;
  }
}

// ==================== DASHBOARD ====================
function updateDashboard() {
  // Device stats
  const activeDevices = devicesData.filter(d => d.active).length;
  const offlineDevices = devicesData.filter(d => isDeviceOffline(d)).length;
  document.getElementById('devices-count').textContent = activeDevices;
  document.getElementById('offline-count').textContent = offlineDevices;

  // User stats
  document.getElementById('users-count').textContent = usersData.length;

  // Token total
  const totalTokens = usersData.reduce((sum, u) => sum + (u.tokens || 0), 0);
  document.getElementById('tokens-total').textContent = totalTokens;

  // Recent events
  renderRecentEvents();
}

function isDeviceOffline(device) {
  if (!device.last_seen) return true;
  const lastSeen = new Date(device.last_seen);
  const threshold = 10 * 60 * 1000; // 10 minutes
  return (Date.now() - lastSeen.getTime()) > threshold;
}

function renderRecentEvents() {
  const container = document.getElementById('recent-events');
  const recentLogs = logsData.slice(0, 5);

  if (recentLogs.length === 0) {
    container.innerHTML = '<p style="color: var(--color-gray);">No hay eventos recientes</p>';
    return;
  }

  container.innerHTML = recentLogs.map(log => `
    <div class="event-item">
      <div class="event-icon ${log.event_type === 'ACCESS_GRANTED' ? 'success' : 'danger'}">
        ${log.event_type === 'ACCESS_GRANTED' ? '✓' : '✗'}
      </div>
      <div class="event-info">
        <div class="event-title">${log.event_type} - ${log.esp32_id}</div>
        <div class="event-time">${formatDate(log.timestamp)}</div>
      </div>
    </div>
  `).join('');
}

// ==================== USERS RENDER ====================
function renderUsers() {
  const container = document.getElementById('users-grid');

  if (usersData.length === 0) {
    container.innerHTML = '<p style="color: var(--color-gray);">No hay usuarios registrados</p>';
    return;
  }

  container.innerHTML = usersData.map(user => `
    <div class="entity-card">
      <div class="entity-header">
        <div>
          <div class="entity-name">${user.user_name}</div>
          <div class="entity-id">${user.uid}</div>
        </div>
        <span class="badge ${user.status === 'Activo' ? 'badge-success' : 'badge-danger'}">
          ${user.status}
        </span>
      </div>
      <div class="entity-details">
        <div class="entity-detail">
          <span class="entity-detail-label">Tokens</span>
          <span class="entity-detail-value">${user.tokens}</span>
        </div>
        <div class="entity-detail">
          <span class="entity-detail-label">Actualizado</span>
          <span class="entity-detail-value">${formatDate(user.updated_at)}</span>
        </div>
      </div>
      <div class="entity-actions">
        <button class="btn btn-secondary btn-sm" onclick="openTokensModal('${user.uid}', '${user.user_name}', ${user.tokens})">
          🎫 Tokens
        </button>
        <button class="btn btn-secondary btn-sm" onclick="openEditUserModal('${user.uid}')">
          ✏️ Editar
        </button>
      </div>
    </div>
  `).join('');
}

// ==================== DEVICES RENDER ====================
function renderDevices() {
  const container = document.getElementById('devices-grid');

  if (devicesData.length === 0) {
    container.innerHTML = '<p style="color: var(--color-gray);">No hay dispositivos registrados</p>';
    return;
  }

  container.innerHTML = devicesData.map(device => {
    const offline = isDeviceOffline(device);
    return `
      <div class="entity-card">
        <div class="entity-header">
          <div>
            <div class="entity-name">${device.esp32_id}</div>
            <div class="entity-id">${device.location || 'Sin ubicación'}</div>
          </div>
          <span class="badge ${device.active ? (offline ? 'badge-warning' : 'badge-success') : 'badge-danger'}">
            ${device.active ? (offline ? 'Offline' : 'Online') : 'Inactivo'}
          </span>
        </div>
        <div class="entity-details">
          <div class="entity-detail">
            <span class="entity-detail-label">Tiempo límite</span>
            <span class="entity-detail-value">${device.time_limit_min} min</span>
          </div>
          <div class="entity-detail">
            <span class="entity-detail-label">Última conexión</span>
            <span class="entity-detail-value">${formatDate(device.last_seen)}</span>
          </div>
        </div>
        <div class="entity-actions">
          <button class="btn btn-secondary btn-sm" onclick="openEditDeviceModal('${device.esp32_id}')">
            ✏️ Editar
          </button>
          <button class="btn btn-${device.active ? 'danger' : 'primary'} btn-sm" 
                  onclick="toggleDevice('${device.esp32_id}', ${!device.active})">
            ${device.active ? '🔴 Desactivar' : '🟢 Activar'}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// ==================== LOGS RENDER ====================
function renderLogs() {
  const tbody = document.getElementById('logs-table-body');

  if (logsData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--color-gray);">No hay logs</td></tr>';
    return;
  }

  tbody.innerHTML = logsData.map(log => `
    <tr>
      <td>${formatDate(log.timestamp)}</td>
      <td><code>${log.uid}</code></td>
      <td>${log.esp32_id}</td>
      <td><span class="badge ${log.event_type.includes('GRANTED') ? 'badge-success' : 'badge-danger'}">${log.event_type}</span></td>
      <td>${log.token_balance}</td>
    </tr>
  `).join('');
}

function populateDeviceFilter() {
  const select = document.getElementById('filter-device');
  select.innerHTML = '<option value="">Todos los dispositivos</option>';
  devicesData.forEach(d => {
    select.innerHTML += `<option value="${d.esp32_id}">${d.esp32_id}</option>`;
  });
}

// ==================== MODALS ====================
function initModals() {
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) {
      closeModal();
    }
  });
}

function openModal(title, bodyHtml, footerHtml) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-footer').innerHTML = footerHtml;
  document.getElementById('modal-overlay').classList.add('active');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
}

// User Modal
function openAddUserModal() {
  openModal('Nuevo Usuario', `
    <div class="form-group">
      <label>UID de Tarjeta RFID</label>
      <input type="text" id="user-uid" class="input" placeholder="Ej: A1B2C3D4" required>
    </div>
    <div class="form-group">
      <label>Nombre del Usuario</label>
      <input type="text" id="user-name" class="input" placeholder="Nombre completo" required>
    </div>
    <div class="form-group">
      <label>Tokens Iniciales</label>
      <input type="number" id="user-tokens" class="input" value="0" min="0">
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="createUser()">Crear Usuario</button>
  `);
}

function openEditUserModal(uid) {
  const user = usersData.find(u => u.uid === uid);
  if (!user) return;

  openModal('Editar Usuario', `
    <div class="form-group">
      <label>UID</label>
      <input type="text" class="input" value="${user.uid}" disabled>
    </div>
    <div class="form-group">
      <label>Nombre del Usuario</label>
      <input type="text" id="edit-user-name" class="input" value="${user.user_name}">
    </div>
    <div class="form-group">
      <label>Estado</label>
      <select id="edit-user-status" class="input">
        <option value="Activo" ${user.status === 'Activo' ? 'selected' : ''}>Activo</option>
        <option value="Inactivo" ${user.status === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
      </select>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="updateUser('${uid}')">Guardar</button>
  `);
}

function openTokensModal(uid, userName, currentTokens) {
  openModal(`Tokens - ${userName}`, `
    <p>Tokens actuales: <strong>${currentTokens}</strong></p>
    <div class="form-group">
      <label>Cantidad a agregar/restar</label>
      <input type="number" id="tokens-amount" class="input" value="0">
      <small style="color: var(--color-gray);">Use números negativos para restar tokens</small>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="updateUserTokens('${uid}')">Aplicar</button>
  `);
}

// Device Modal
function openAddDeviceModal() {
  openModal('Nuevo Dispositivo', `
    <div class="form-group">
      <label>ID del ESP32</label>
      <input type="text" id="device-id" class="input" placeholder="Ej: ESP32_001" required>
    </div>
    <div class="form-group">
      <label>Ubicación</label>
      <input type="text" id="device-location" class="input" placeholder="Ej: Lavandería Piso 1">
    </div>
    <div class="form-group">
      <label>Tiempo límite (minutos)</label>
      <input type="number" id="device-time" class="input" value="15" min="1" max="240">
    </div>
    <div class="form-group">
      <label>WiFi SSID</label>
      <input type="text" id="device-ssid" class="input" placeholder="Nombre de red WiFi">
    </div>
    <div class="form-group">
      <label>WiFi Password</label>
      <input type="password" id="device-password" class="input" placeholder="Contraseña WiFi">
    </div>
    <div class="form-group">
      <label>Master Key (UID tarjeta maestra)</label>
      <input type="text" id="device-masterkey" class="input" placeholder="Opcional">
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="createDevice()">Crear Dispositivo</button>
  `);
}

function openEditDeviceModal(esp32Id) {
  const device = devicesData.find(d => d.esp32_id === esp32Id);
  if (!device) return;

  openModal('Editar Dispositivo', `
    <div class="form-group">
      <label>ID del ESP32</label>
      <input type="text" class="input" value="${device.esp32_id}" disabled>
    </div>
    <div class="form-group">
      <label>Ubicación</label>
      <input type="text" id="edit-device-location" class="input" value="${device.location || ''}">
    </div>
    <div class="form-group">
      <label>Tiempo límite (minutos)</label>
      <input type="number" id="edit-device-time" class="input" value="${device.time_limit_min}" min="1" max="240">
    </div>
    <div class="form-group">
      <label>WiFi SSID</label>
      <input type="text" id="edit-device-ssid" class="input" value="${device.wifi_ssid || ''}">
    </div>
    <div class="form-group">
      <label>WiFi Password</label>
      <input type="password" id="edit-device-password" class="input" value="${device.wifi_password || ''}">
    </div>
    <div class="form-group">
      <label>Master Key</label>
      <input type="text" id="edit-device-masterkey" class="input" value="${device.master_key || ''}">
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="editDevice('${esp32Id}')">Guardar</button>
  `);
}

// ==================== API ACTIONS ====================
async function createUser() {
  const uid = document.getElementById('user-uid').value.trim().toUpperCase();
  const name = document.getElementById('user-name').value.trim();
  const tokens = parseInt(document.getElementById('user-tokens').value) || 0;

  if (!uid || !name) {
    showToast('Complete todos los campos requeridos', 'error');
    return;
  }

  try {
    await api.createUser({ uid, user_name: name, tokens });
    showToast('Usuario creado exitosamente', 'success');
    closeModal();
    loadUsers();
    updateDashboard();
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
}

async function updateUser(uid) {
  const name = document.getElementById('edit-user-name').value.trim();
  const status = document.getElementById('edit-user-status').value;

  try {
    await api.updateUser({ uid, user_name: name, status });
    showToast('Usuario actualizado', 'success');
    closeModal();
    loadUsers();
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
}

async function updateUserTokens(uid) {
  const amount = parseInt(document.getElementById('tokens-amount').value) || 0;

  if (amount === 0) {
    closeModal();
    return;
  }

  try {
    await api.updateTokens(uid, amount);
    showToast(`Tokens ${amount > 0 ? 'agregados' : 'restados'} exitosamente`, 'success');
    closeModal();
    loadUsers();
    updateDashboard();
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
}

async function createDevice() {
  const data = {
    esp32_id: document.getElementById('device-id').value.trim().toUpperCase(),
    location: document.getElementById('device-location').value.trim(),
    time_limit_min: parseInt(document.getElementById('device-time').value) || 15,
    wifi_ssid: document.getElementById('device-ssid').value.trim(),
    wifi_password: document.getElementById('device-password').value,
    master_key: document.getElementById('device-masterkey').value.trim().toUpperCase()
  };

  if (!data.esp32_id) {
    showToast('Ingrese un ID de dispositivo', 'error');
    return;
  }

  try {
    await api.createDevice(data);
    showToast('Dispositivo creado exitosamente', 'success');
    closeModal();
    loadDevices();
    updateDashboard();
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
}

async function editDevice(esp32Id) {
  const data = {
    esp32_id: esp32Id,
    location: document.getElementById('edit-device-location').value.trim(),
    time_limit_min: parseInt(document.getElementById('edit-device-time').value) || 15,
    wifi_ssid: document.getElementById('edit-device-ssid').value.trim(),
    wifi_password: document.getElementById('edit-device-password').value,
    master_key: document.getElementById('edit-device-masterkey').value.trim().toUpperCase()
  };

  try {
    await api.editDevice(data);
    showToast('Dispositivo actualizado', 'success');
    closeModal();
    loadDevices();
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
}

async function toggleDevice(esp32Id, active) {
  if (!confirm(`¿${active ? 'Activar' : 'Desactivar'} este dispositivo?`)) {
    return;
  }

  try {
    await api.editDevice({ esp32_id: esp32Id, active });
    showToast(`Dispositivo ${active ? 'activado' : 'desactivado'}`, 'success');
    loadDevices();
    updateDashboard();
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
}

// ==================== BUTTONS ====================
function initButtons() {
  // Refresh
  document.getElementById('refresh-btn').addEventListener('click', loadData);

  // Add User
  document.getElementById('add-user-btn').addEventListener('click', openAddUserModal);

  // Add Device
  document.getElementById('add-device-btn').addEventListener('click', openAddDeviceModal);

  // Save Config
  document.getElementById('save-config-btn').addEventListener('click', saveConfig);

  // Apply Filters
  document.getElementById('apply-filters').addEventListener('click', applyLogFilters);
}

// ==================== CONFIG ====================
function loadConfig() {
  const url = api.getBaseUrl();
  document.getElementById('config-backend-url').value = url;
}

function saveConfig() {
  const url = document.getElementById('config-backend-url').value.trim();
  if (!url) {
    showToast('Ingrese una URL válida', 'error');
    return;
  }

  api.setBaseUrl(url);
  showToast('Configuración guardada', 'success');
  loadData();
}

// ==================== FILTERS ====================
async function applyLogFilters() {
  const esp32_id = document.getElementById('filter-device').value;
  const event_type = document.getElementById('filter-event').value;

  try {
    logsData = await api.getLogs({ esp32_id, event_type, limit: 100 });
    renderLogs();
    showToast('Filtros aplicados', 'success');
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
}

// ==================== UTILITIES ====================
function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span> ${message}`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
