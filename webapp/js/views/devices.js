/**
 * Devices View for IoT Control WebApp
 */

const Devices = {
    devices: [],
    tokenTypes: [],

    /**
     * Load devices page
     */
    async load() {
        this.bindEvents();
        this.renderLoadingState();

        try {
            await this.loadTokenTypes();
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
            this.tokenTypes = [
                { token_type: 'WSH', token_name: 'Lavadora' },
                { token_type: 'DRY', token_name: 'Secadora' }
            ];
        }
    },

    /**
     * Load devices
     */
    async loadDevices() {
        try {
            // If ADMIN role, filter by assigned houses
            const adminEmail = Auth.isAdmin() ? Auth.getEmail() : null;
            const response = await API.getDevices(adminEmail);
            this.devices = response.devices || [];
            this.renderDevices(this.devices);
        } catch (error) {
            // Mock data
            this.devices = [
                { esp32_id: 'AA:BB:CC:DD:EE:01', location: 'Lavandería Piso 1', active: true, token_type: 'WSH', wifi_ssid: 'IoT_Network', wifi_psswd: 'secret123', reconnect_sec: 30, time_limit_min: 45, last_seen: new Date().toISOString(), house_id: 'BES_522', time_window_start: '08:00', time_window_end: '23:00' },
                { esp32_id: 'AA:BB:CC:DD:EE:02', location: 'Lavandería Piso 2', active: true, token_type: 'DRY', wifi_ssid: 'IoT_Network', wifi_psswd: 'secret123', reconnect_sec: 30, time_limit_min: 60, last_seen: new Date(Date.now() - 600000).toISOString(), house_id: 'BES_522', time_window_start: '07:00', time_window_end: '22:00' },
                { esp32_id: 'AA:BB:CC:DD:EE:03', location: 'Gimnasio', active: false, token_type: 'GYM', wifi_ssid: 'GYM_WiFi', wifi_psswd: 'gym456', reconnect_sec: 60, time_limit_min: 30, last_seen: new Date(Date.now() - 3600000).toISOString(), house_id: '', time_window_start: '06:00', time_window_end: '20:00' }
            ];
            this.renderDevices(this.devices);
        }
    },

    /**
     * Render loading state
     */
    renderLoadingState() {
        document.getElementById('devices-grid').innerHTML = '<div class="loading-placeholder">Cargando dispositivos...</div>';
    },

    /**
     * Render devices grid
     */
    renderDevices(devices) {
        const container = document.getElementById('devices-grid');

        if (!devices || devices.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📟</div>
                    <p class="empty-state-title">No hay dispositivos</p>
                    <p class="empty-state-message">Agregue un nuevo dispositivo para comenzar</p>
                </div>
            `;
            return;
        }

        const canEdit = Auth.can('devices.edit');
        const canViewWifi = Auth.isMaster() || Auth.isAdmin();

        container.innerHTML = devices.map(device => {
            const isOnline = Utils.isDeviceOnline(device.last_seen);
            const statusClass = isOnline ? 'online' : 'offline';
            const statusText = isOnline ? 'Online' : 'Offline';

            return `
                <div class="device-card">
                    <div class="device-header">
                        <span class="device-id">${Utils.escapeHtml(device.esp32_id)}</span>
                        <span class="device-status">
                            <span class="status-dot ${statusClass}"></span>
                            ${statusText}
                        </span>
                    </div>
                    <div class="device-location">📍 ${Utils.escapeHtml(device.location)}</div>
                    ${device.house_id ? `<div class="device-house" style="margin:4px 0;"><span class="status-badge status-active" style="font-size:0.75rem;">🏠 ${Utils.escapeHtml(device.house_id)}</span></div>` : ''}
                    <div class="device-info">
                        <div class="device-info-item">
                            <span class="device-info-label">Token Type</span>
                            <span class="device-info-value ${this.isTokenTypeInactive(device.token_type) ? 'token-inactive' : ''}">
                                ${device.token_type}
                                ${this.isTokenTypeInactive(device.token_type) ? '<span class="token-inactive-icon" title="Token type inactivo">⚠️</span>' : ''}
                            </span>
                        </div>
                        <div class="device-info-item">
                            <span class="device-info-label">Tiempo</span>
                            <span class="device-info-value">${device.time_limit_min} min</span>
                        </div>
                        <div class="device-info-item">
                            <span class="device-info-label">Ventana Horaria</span>
                            <span class="device-info-value">${device.time_window_start || '08:00'} - ${device.time_window_end || '23:00'}</span>
                        </div>
                        <div class="device-info-item">
                            <span class="device-info-label">Reconexión</span>
                            <span class="device-info-value">${device.reconnect_sec} seg</span>
                        </div>
                        <div class="device-info-item">
                            <span class="device-info-label">Último ping</span>
                            <span class="device-info-value">${Utils.formatRelativeTime(device.last_seen)}</span>
                        </div>
                        ${canViewWifi ? `
                        <div class="device-info-item">
                            <span class="device-info-label">WiFi SSID</span>
                            <span class="device-info-value">${Utils.escapeHtml(device.wifi_ssid)}</span>
                        </div>
                        <div class="device-info-item">
                            <span class="device-info-label">WiFi Pass</span>
                            <span class="device-info-value">${Utils.escapeHtml(device.wifi_psswd)}</span>
                        </div>
                        ` : ''}
                    </div>
                    <div class="device-actions">
                        ${canEdit ? `
                            <button class="btn btn-secondary btn-sm" onclick="Devices.editDevice('${device.esp32_id}')">
                                ✏️ Editar
                            </button>
                            <button class="btn ${device.active ? 'btn-danger' : 'btn-success'} btn-sm" onclick="Devices.toggleStatus('${device.esp32_id}')">
                                ${device.active ? '🚫 Desactivar' : '✓ Activar'}
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Show add device modal
     */
    showAddDeviceModal() {
        const tokenOptions = this.tokenTypes.map(tt =>
            `<option value="${tt.token_type}">${tt.token_type} - ${tt.token_name}</option>`
        ).join('');

        Utils.showModal({
            title: 'Nuevo Dispositivo',
            content: `
                <form id="add-device-form">
                    <div class="form-group">
                        <label for="new-device-id">ESP32 ID (MAC Address) *</label>
                        <input type="text" id="new-device-id" required placeholder="AA:BB:CC:DD:EE:FF">
                    </div>
                    <div class="form-group">
                        <label for="new-device-location">Ubicación *</label>
                        <input type="text" id="new-device-location" required placeholder="Ej: Lavandería Piso 1">
                    </div>
                    <div class="form-group">
                        <label for="new-device-token-type">Tipo de Token *</label>
                        <select id="new-device-token-type" required>
                            <option value="">Seleccione...</option>
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
                wifi_psswd: document.getElementById('new-device-password').value,
                active: true
            };

            try {
                await API.createDevice(deviceData);
                Utils.closeModal();
                Utils.showToast('Dispositivo creado correctamente', 'success');
                this.load();
            } catch (error) {
                Utils.showToast('Error al crear dispositivo', 'error');
            }
        };
    },

    /**
     * Edit device
     */
    editDevice(esp32Id) {
        const device = this.devices.find(d => d.esp32_id === esp32Id);
        if (!device) return;

        const tokenOptions = this.tokenTypes.map(tt =>
            `<option value="${tt.token_type}" ${tt.token_type === device.token_type ? 'selected' : ''}>${tt.token_type} - ${tt.token_name}</option>`
        ).join('');

        Utils.showModal({
            title: 'Editar Dispositivo',
            content: `
                <form id="edit-device-form">
                    <div class="form-group">
                        <label>ESP32 ID</label>
                        <input type="text" value="${Utils.escapeHtml(device.esp32_id)}" disabled>
                    </div>
                    <div class="form-group">
                        <label for="edit-device-location">Ubicación *</label>
                        <input type="text" id="edit-device-location" value="${Utils.escapeHtml(device.location)}" required>
                    </div>
                    <div class="form-group">
                        <label for="edit-device-token-type">Tipo de Token *</label>
                        <select id="edit-device-token-type" required>
                            ${tokenOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="edit-device-time">Tiempo de Activación (minutos) *</label>
                        <input type="number" id="edit-device-time" value="${device.time_limit_min}" required min="1" max="240">
                    </div>
                    <div class="form-group">
                        <label for="edit-device-reconnect">Intervalo Reconexión (segundos) *</label>
                        <input type="number" id="edit-device-reconnect" value="${device.reconnect_sec}" required min="10" max="300">
                    </div>
                    <div class="form-group">
                        <label for="edit-device-ssid">WiFi SSID *</label>
                        <input type="text" id="edit-device-ssid" value="${Utils.escapeHtml(device.wifi_ssid)}" required>
                    </div>
                    <div class="form-group">
                        <label for="edit-device-password">WiFi Password *</label>
                        <input type="text" id="edit-device-password" value="${Utils.escapeHtml(device.wifi_psswd)}" required>
                    </div>
                    <div class="form-group">
                        <label for="edit-device-house">Casa</label>
                        <input type="text" id="edit-device-house" value="${Utils.escapeHtml(device.house_id || '')}" placeholder="BES_522">
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
                wifi_psswd: document.getElementById('edit-device-password').value,
                house_id: document.getElementById('edit-device-house').value.trim(),
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
