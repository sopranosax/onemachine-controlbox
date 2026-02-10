/**
 * Devices View for IoT Control WebApp
 * Table-based layout with detail view
 */

const Devices = {
    devices: [],
    tokenTypes: [],
    houses: [],

    /**
     * Load devices page
     */
    async load() {
        this.bindEvents();
        this.renderLoadingState();

        try {
            await Promise.all([
                this.loadTokenTypes(),
                this.loadHouses()
            ]);
            await this.loadDevices();
        } catch (error) {
            console.error('Error loading devices:', error);
            Utils.showToast('Error al cargar dispositivos', 'error');
        }
    },

    /**
     * Bind event handlers
     */
    bindEvents() {
        const addBtn = document.getElementById('btn-add-device');
        if (addBtn) {
            addBtn.onclick = () => this.showAddDeviceModal();
            addBtn.style.display = Auth.can('devices.create') ? '' : 'none';
        }
    },

    /**
     * Load token types
     */
    async loadTokenTypes() {
        try {
            const response = await API.getTokenTypes();
            this.tokenTypes = response.token_types || [];
        } catch (error) {
            this.tokenTypes = [];
        }
    },

    /**
     * Load houses for dropdown
     */
    async loadHouses() {
        try {
            const response = await API.getHouses();
            this.houses = response.houses || [];
        } catch (error) {
            this.houses = [];
        }
    },

    /**
     * Load devices
     */
    async loadDevices() {
        try {
            // Only filter by houses for ADMIN (not MASTER) role
            const adminEmail = (Auth.hasRole(Config.ROLES.ADMIN) && !Auth.isMaster()) ? Auth.getEmail() : null;
            const response = await API.getDevices(adminEmail);
            this.devices = (response.devices || []).map(d => ({
                ...d,
                // Normalize active to boolean (Google Sheets may return string)
                active: d.active === true || d.active === 'TRUE' || d.active === 'true'
            }));
            this.renderDevices();
        } catch (error) {
            console.error('Error loading devices:', error);
            this.devices = [];
            this.renderDevices();
        }
    },

    /**
     * Render loading state
     */
    renderLoadingState() {
        const tbody = document.getElementById('devices-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading-placeholder">Cargando dispositivos...</td></tr>';
        }
    },

    /**
     * Render devices table
     */
    renderDevices() {
        const tbody = document.getElementById('devices-tbody');
        if (!tbody) return;

        if (!this.devices || this.devices.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="empty-state">
                            <div class="empty-state-icon">📟</div>
                            <p class="empty-state-title">No hay dispositivos</p>
                            <p class="empty-state-message">Agregue un nuevo dispositivo para comenzar</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        const isMaster = Auth.isMaster();

        tbody.innerHTML = this.devices.map(device => {
            const isOnline = Utils.isDeviceOnline(device.last_seen);
            const statusClass = isOnline ? 'online' : 'offline';
            const statusText = isOnline ? 'Online' : 'Offline';
            const activeText = device.active ? 'Activo' : 'Inactivo';
            const activeBadge = device.active ? 'status-active' : 'status-inactive';

            // Get house name
            const houseDisplay = device.house_id ? Utils.escapeHtml(device.house_id) : '<span style="color:var(--text-secondary);">—</span>';

            // Action buttons
            let actions = `
                <button class="btn btn-sm btn-secondary" onclick="Devices.showDetail('${device.esp32_id}')" title="Ver detalle">
                    👁️ Ver
                </button>
            `;

            if (isMaster) {
                actions += `
                    <button class="btn btn-sm btn-secondary" onclick="Devices.editDevice('${device.esp32_id}')" title="Editar">
                        ✏️
                    </button>
                    <button class="btn btn-sm ${device.active ? 'btn-danger' : 'btn-success'}" onclick="Devices.toggleStatus('${device.esp32_id}')" title="${device.active ? 'Desactivar' : 'Activar'}">
                        ${device.active ? '🚫' : '✅'}
                    </button>
                `;
            }

            return `
                <tr>
                    <td><strong>${Utils.escapeHtml(device.esp32_id)}</strong></td>
                    <td>${houseDisplay}</td>
                    <td>${Utils.escapeHtml(device.location || '')}</td>
                    <td>
                        <span class="${this.isTokenTypeInactive(device.token_type) ? 'token-inactive' : ''}">
                            ${Utils.escapeHtml(device.token_type || '')}
                            ${this.isTokenTypeInactive(device.token_type) ? '<span title="Token type inactivo">⚠️</span>' : ''}
                        </span>
                    </td>
                    <td><span class="status-badge ${activeBadge}">${activeText}</span></td>
                    <td>
                        <span class="device-status" style="display:inline-flex;align-items:center;gap:6px;">
                            <span class="status-dot ${statusClass}"></span>
                            ${statusText}
                        </span>
                    </td>
                    <td class="actions-cell" style="white-space:nowrap;">
                        ${actions}
                    </td>
                </tr>
            `;
        }).join('');
    },

    /**
     * Show device detail page
     */
    showDetail(esp32Id) {
        const device = this.devices.find(d => d.esp32_id === esp32Id);
        if (!device) {
            Utils.showToast('Dispositivo no encontrado', 'error');
            return;
        }

        // Hide devices table, show detail section
        document.getElementById('page-devices').classList.add('hidden');
        document.getElementById('page-device-detail').classList.remove('hidden');

        // Set title
        document.getElementById('device-detail-title').textContent = `Dispositivo: ${device.esp32_id}`;

        // Build detail content
        const isOnline = Utils.isDeviceOnline(device.last_seen);
        const statusClass = isOnline ? 'online' : 'offline';
        const statusText = isOnline ? 'Online' : 'Offline';
        const activeText = device.active ? 'Activo' : 'Inactivo';
        const activeBadge = device.active ? 'status-active' : 'status-inactive';

        // Find token type name
        const tokenInfo = this.tokenTypes.find(t => t.token_type === device.token_type);
        const tokenName = tokenInfo ? `${device.token_type} — ${tokenInfo.token_name}` : device.token_type;

        const container = document.getElementById('device-detail-content');
        container.innerHTML = `
            <div class="device-detail-grid">
                <div class="detail-section">
                    <h3 style="margin:0 0 16px 0;color:var(--text-primary);font-size:1.1rem;">📟 Información General</h3>
                    <div class="detail-row">
                        <span class="detail-label">ID Dispositivo (MAC)</span>
                        <span class="detail-value"><strong>${Utils.escapeHtml(device.esp32_id)}</strong></span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Casa</span>
                        <span class="detail-value">${device.house_id ? `<span class="status-badge status-active" style="font-size:0.85rem;">🏠 ${Utils.escapeHtml(device.house_id)}</span>` : '<span style="color:var(--text-secondary);">Sin asignar</span>'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Ubicación</span>
                        <span class="detail-value">${Utils.escapeHtml(device.location || '—')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Tipo de Token</span>
                        <span class="detail-value">
                            ${Utils.escapeHtml(tokenName || '—')}
                            ${this.isTokenTypeInactive(device.token_type) ? '<span title="Token type inactivo" style="margin-left:4px;">⚠️</span>' : ''}
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Estado</span>
                        <span class="detail-value"><span class="status-badge ${activeBadge}">${activeText}</span></span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Conexión</span>
                        <span class="detail-value" style="display:inline-flex;align-items:center;gap:6px;">
                            <span class="status-dot ${statusClass}"></span>
                            <strong>${statusText}</strong>
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Último Ping</span>
                        <span class="detail-value">${Utils.formatRelativeTime(device.last_seen)}</span>
                    </div>
                </div>

                <div class="detail-section">
                    <h3 style="margin:0 0 16px 0;color:var(--text-primary);font-size:1.1rem;">⚙️ Configuración</h3>
                    <div class="detail-row">
                        <span class="detail-label">Tiempo de Activación</span>
                        <span class="detail-value">${device.time_limit_min || 30} minutos</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Ventana Horaria</span>
                        <span class="detail-value">${device.time_window_start || '08:00'} — ${device.time_window_end || '23:00'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Intervalo de Reconexión</span>
                        <span class="detail-value">${device.reconnect_sec || 30} segundos</span>
                    </div>
                </div>

                <div class="detail-section">
                    <h3 style="margin:0 0 16px 0;color:var(--text-primary);font-size:1.1rem;">📶 Configuración WiFi</h3>
                    <div class="detail-row">
                        <span class="detail-label">SSID</span>
                        <span class="detail-value">${Utils.escapeHtml(device.wifi_ssid || '—')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Contraseña</span>
                        <span class="detail-value">
                            <span id="wifi-pass-hidden">••••••••</span>
                            <span id="wifi-pass-visible" style="display:none;">${Utils.escapeHtml(device.wifi_psswd || '—')}</span>
                            <button class="btn-icon" style="margin-left:8px;font-size:0.85rem;" onclick="Devices.togglePasswordVisibility()" title="Mostrar/ocultar">
                                👁️
                            </button>
                        </span>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Toggle wifi password visibility in detail view
     */
    togglePasswordVisibility() {
        const hidden = document.getElementById('wifi-pass-hidden');
        const visible = document.getElementById('wifi-pass-visible');
        if (hidden && visible) {
            if (hidden.style.display === 'none') {
                hidden.style.display = '';
                visible.style.display = 'none';
            } else {
                hidden.style.display = 'none';
                visible.style.display = '';
            }
        }
    },

    /**
     * Navigate back to devices list
     */
    backToList() {
        document.getElementById('page-device-detail').classList.add('hidden');
        document.getElementById('page-devices').classList.remove('hidden');
    },

    // ==================== MODALS (Create / Edit) ====================

    /**
     * Show add device modal
     */
    showAddDeviceModal() {
        if (!Auth.can('devices.create')) {
            Utils.showToast('No tiene permisos', 'error');
            return;
        }

        const tokenOptions = this.tokenTypes.map(t =>
            `<option value="${t.token_type}">${t.token_type} — ${Utils.escapeHtml(t.token_name)}</option>`
        ).join('');

        const houseOptions = this.houses.map(h =>
            `<option value="${Utils.escapeHtml(h.house_id)}">${Utils.escapeHtml(h.house_id)}</option>`
        ).join('');

        Utils.showModal({
            title: 'Nuevo Dispositivo',
            content: `
                <form id="add-device-form">
                    <div class="form-group">
                        <label for="new-device-id">ID Dispositivo (MAC) *</label>
                        <input type="text" id="new-device-id" required placeholder="AA:BB:CC:DD:EE:FF">
                    </div>
                    <div class="form-group">
                        <label for="new-device-house">Casa</label>
                        <select id="new-device-house">
                            <option value="">— Sin asignar —</option>
                            ${houseOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="new-device-location">Ubicación *</label>
                        <input type="text" id="new-device-location" required placeholder="Lavandería Piso 1">
                    </div>
                    <div class="form-group">
                        <label for="new-device-token-type">Tipo de Token *</label>
                        <select id="new-device-token-type" required>
                            ${tokenOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="new-device-time">Tiempo de Activación (minutos) *</label>
                        <input type="number" id="new-device-time" required min="1" max="240" value="30">
                    </div>
                    <div class="form-group">
                        <label for="new-device-reconnect">Intervalo Reconexión (segundos) *</label>
                        <input type="number" id="new-device-reconnect" required min="10" max="300" value="30">
                    </div>
                    <div class="form-group">
                        <label for="new-device-ssid">WiFi SSID *</label>
                        <input type="text" id="new-device-ssid" required placeholder="Nombre de la red WiFi">
                    </div>
                    <div class="form-group">
                        <label for="new-device-password">WiFi Password *</label>
                        <input type="text" id="new-device-password" required placeholder="Contraseña WiFi">
                    </div>
                    <div class="form-row" style="display:flex;gap:12px;">
                        <div class="form-group" style="flex:1;">
                            <label for="new-device-tw-start">Ventana Inicio</label>
                            <input type="time" id="new-device-tw-start" value="08:00">
                        </div>
                        <div class="form-group" style="flex:1;">
                            <label for="new-device-tw-end">Ventana Fin</label>
                            <input type="time" id="new-device-tw-end" value="23:00">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Crear Dispositivo</button>
                    </div>
                </form>
            `
        });

        document.getElementById('add-device-form').onsubmit = async (e) => {
            e.preventDefault();

            const deviceData = {
                esp32_id: document.getElementById('new-device-id').value.trim(),
                location: document.getElementById('new-device-location').value.trim(),
                token_type: document.getElementById('new-device-token-type').value,
                time_limit_min: parseInt(document.getElementById('new-device-time').value),
                reconnect_sec: parseInt(document.getElementById('new-device-reconnect').value),
                wifi_ssid: document.getElementById('new-device-ssid').value.trim(),
                wifi_psswd: document.getElementById('new-device-password').value.trim(),
                house_id: document.getElementById('new-device-house').value,
                time_window_start: document.getElementById('new-device-tw-start').value || '08:00',
                time_window_end: document.getElementById('new-device-tw-end').value || '23:00',
                active: true
            };

            try {
                const result = await API.createDevice(deviceData);
                if (result.success) {
                    Utils.closeModal();
                    Utils.showToast('Dispositivo creado correctamente', 'success');
                    this.load();
                } else {
                    Utils.showToast(result.error || 'Error al crear dispositivo', 'error');
                }
            } catch (error) {
                Utils.showToast('Error de conexión', 'error');
            }
        };
    },

    /**
     * Edit device modal
     */
    editDevice(esp32Id) {
        if (!Auth.can('devices.edit')) {
            Utils.showToast('No tiene permisos', 'error');
            return;
        }

        const device = this.devices.find(d => d.esp32_id === esp32Id);
        if (!device) return;

        const tokenOptions = this.tokenTypes.map(t =>
            `<option value="${t.token_type}" ${t.token_type === device.token_type ? 'selected' : ''}>${t.token_type} — ${Utils.escapeHtml(t.token_name)}</option>`
        ).join('');

        const houseOptions = this.houses.map(h =>
            `<option value="${Utils.escapeHtml(h.house_id)}" ${h.house_id === device.house_id ? 'selected' : ''}>${Utils.escapeHtml(h.house_id)}</option>`
        ).join('');

        Utils.showModal({
            title: `Editar: ${esp32Id}`,
            content: `
                <form id="edit-device-form">
                    <div class="form-group">
                        <label>ID Dispositivo</label>
                        <input type="text" value="${Utils.escapeHtml(esp32Id)}" disabled>
                    </div>
                    <div class="form-group">
                        <label for="edit-device-house">Casa</label>
                        <select id="edit-device-house">
                            <option value="" ${!device.house_id ? 'selected' : ''}>— Sin asignar —</option>
                            ${houseOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="edit-device-location">Ubicación *</label>
                        <input type="text" id="edit-device-location" required value="${Utils.escapeHtml(device.location || '')}">
                    </div>
                    <div class="form-group">
                        <label for="edit-device-token-type">Tipo de Token *</label>
                        <select id="edit-device-token-type" required>
                            ${tokenOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="edit-device-time">Tiempo de Activación (minutos) *</label>
                        <input type="number" id="edit-device-time" required min="1" max="240" value="${device.time_limit_min || 30}">
                    </div>
                    <div class="form-group">
                        <label for="edit-device-reconnect">Intervalo Reconexión (segundos) *</label>
                        <input type="number" id="edit-device-reconnect" required min="10" max="300" value="${device.reconnect_sec || 30}">
                    </div>
                    <div class="form-group">
                        <label for="edit-device-ssid">WiFi SSID *</label>
                        <input type="text" id="edit-device-ssid" required value="${Utils.escapeHtml(device.wifi_ssid || '')}">
                    </div>
                    <div class="form-group">
                        <label for="edit-device-password">WiFi Password *</label>
                        <input type="text" id="edit-device-password" required value="${Utils.escapeHtml(device.wifi_psswd || '')}">
                    </div>
                    <div class="form-row" style="display:flex;gap:12px;">
                        <div class="form-group" style="flex:1;">
                            <label for="edit-device-tw-start">Ventana Inicio</label>
                            <input type="time" id="edit-device-tw-start" value="${device.time_window_start || '08:00'}">
                        </div>
                        <div class="form-group" style="flex:1;">
                            <label for="edit-device-tw-end">Ventana Fin</label>
                            <input type="time" id="edit-device-tw-end" value="${device.time_window_end || '23:00'}">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Guardar Cambios</button>
                    </div>
                </form>
            `
        });

        document.getElementById('edit-device-form').onsubmit = async (e) => {
            e.preventDefault();

            const deviceData = {
                location: document.getElementById('edit-device-location').value.trim(),
                token_type: document.getElementById('edit-device-token-type').value,
                time_limit_min: parseInt(document.getElementById('edit-device-time').value),
                reconnect_sec: parseInt(document.getElementById('edit-device-reconnect').value),
                wifi_ssid: document.getElementById('edit-device-ssid').value.trim(),
                wifi_psswd: document.getElementById('edit-device-password').value.trim(),
                house_id: document.getElementById('edit-device-house').value,
                time_window_start: document.getElementById('edit-device-tw-start').value || '08:00',
                time_window_end: document.getElementById('edit-device-tw-end').value || '23:00'
            };

            try {
                await API.updateDevice(esp32Id, deviceData);
                Utils.closeModal();
                Utils.showToast('Dispositivo actualizado', 'success');
                this.load();
            } catch (error) {
                Utils.showToast('Error al actualizar dispositivo', 'error');
            }
        };
    },

    /**
     * Toggle device status
     */
    async toggleStatus(esp32Id) {
        const device = this.devices.find(d => d.esp32_id === esp32Id);
        if (!device) return;

        const newStatus = !device.active;
        const action = device.active ? 'desactivar' : 'activar';

        const confirmed = await Utils.showConfirm({
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} Dispositivo`,
            message: `¿Está seguro que desea ${action} el dispositivo ${device.esp32_id}?`,
            confirmText: action.charAt(0).toUpperCase() + action.slice(1),
            type: device.active ? 'danger' : 'info'
        });

        if (confirmed) {
            try {
                await API.updateDevice(esp32Id, { active: newStatus });
                Utils.showToast(`Dispositivo ${newStatus ? 'activado' : 'desactivado'}`, 'success');
                this.load();
            } catch (error) {
                Utils.showToast('Error al actualizar estado', 'error');
            }
        }
    },

    /**
     * Check if a token type is inactive
     * @param {string} tokenType - Token type code
     * @returns {boolean}
     */
    isTokenTypeInactive(tokenType) {
        const token = this.tokenTypes.find(t => t.token_type === tokenType);
        return token && token.status === 'INACTIVO';
    }
};

// Export for use
window.Devices = Devices;
