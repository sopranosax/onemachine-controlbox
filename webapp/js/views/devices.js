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

        // Filters
        const filters = ['devices-filter-house', 'devices-filter-type', 'devices-filter-status', 'devices-filter-connection'];
        filters.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.onchange = () => this.renderDevices();
            }
        });

        const resetBtn = document.getElementById('btn-reset-devices-filters');
        if (resetBtn) {
            resetBtn.onclick = () => {
                filters.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.value = '';
                });
                this.renderDevices();
            };
        }
    },

    /**
     * Load token types
     */
    async loadTokenTypes() {
        try {
            const response = await API.getTokenTypes();
            this.tokenTypes = response.token_types || [];

            // Populate filter
            const filter = document.getElementById('devices-filter-type');
            if (filter) {
                const currentVal = filter.value;
                const sorted = [...this.tokenTypes].sort((a, b) => a.token_type.localeCompare(b.token_type));
                filter.innerHTML = '<option value="">Todos</option>' +
                    sorted.map(t => `<option value="${t.token_type}">${t.token_type}</option>`).join('');
                filter.value = currentVal; // Restore selection if reloaded
            }
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

            // Populate filter
            const filter = document.getElementById('devices-filter-house');
            if (filter) {
                const currentVal = filter.value;
                const sorted = [...this.houses].sort((a, b) => a.house_id.localeCompare(b.house_id));
                filter.innerHTML = '<option value="">Todas</option>' +
                    sorted.map(h => `<option value="${Utils.escapeHtml(h.house_id)}">${Utils.escapeHtml(h.house_id)}</option>`).join('');
                filter.value = currentVal;
            }
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
                active: d.active === true || d.active === 'TRUE' || d.active === 'true',
                // Normalize time windows to HH:MM 24hr format
                time_window_start: this.formatTime24(d.time_window_start, '08:00'),
                time_window_end: this.formatTime24(d.time_window_end, '23:00')
            }));
            this.renderDevices();
        } catch (error) {
            console.error('Error loading devices:', error);
            this.devices = [];
            this.renderDevices();
        }
    },

    /**
     * Normalize a time value to HH:MM (24hr) format.
     * Google Sheets may return times as ISO dates ("1899-12-30T08:00:00.000Z"),
     * Date objects, plain "HH:MM", or numbers (fraction of day).
     */
    formatTime24(value, fallback) {
        if (!value) return fallback || '00:00';
        const s = String(value);

        // Already in HH:MM format
        if (/^\d{1,2}:\d{2}$/.test(s)) {
            return s.padStart(5, '0');
        }

        // ISO date string: "1899-12-30T08:00:00.000Z" or similar
        if (s.includes('T')) {
            try {
                const d = new Date(s);
                const hh = String(d.getUTCHours()).padStart(2, '0');
                const mm = String(d.getUTCMinutes()).padStart(2, '0');
                return `${hh}:${mm}`;
            } catch (_) { /* fall through */ }
        }

        // Number (fraction of day, e.g. 0.333 = 08:00)
        if (typeof value === 'number' && value >= 0 && value < 1) {
            const totalMin = Math.round(value * 24 * 60);
            const hh = String(Math.floor(totalMin / 60)).padStart(2, '0');
            const mm = String(totalMin % 60).padStart(2, '0');
            return `${hh}:${mm}`;
        }

        return fallback || '00:00';
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

        // Apply filters
        const filterHouse = document.getElementById('devices-filter-house')?.value;
        const filterType = document.getElementById('devices-filter-type')?.value;
        const filterStatus = document.getElementById('devices-filter-status')?.value;
        const filterConnection = document.getElementById('devices-filter-connection')?.value;

        let filteredDevices = this.devices;

        if (filterHouse) {
            filteredDevices = filteredDevices.filter(d => d.house_id === filterHouse);
        }
        if (filterType) {
            filteredDevices = filteredDevices.filter(d => d.token_type === filterType);
        }
        if (filterStatus) {
            const isActive = filterStatus === 'ACTIVO';
            filteredDevices = filteredDevices.filter(d => d.active === isActive);
        }
        if (filterConnection) {
            filteredDevices = filteredDevices.filter(d => {
                const isOnline = Utils.isDeviceOnline(d.last_seen);
                return filterConnection === 'ONLINE' ? isOnline : !isOnline;
            });
        }

        if (!filteredDevices || filteredDevices.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="empty-state">
                            <div class="empty-state-icon">📟</div>
                            <p class="empty-state-title">No hay dispositivos</p>
                            <p class="empty-state-message">No se encontraron dispositivos con los filtros seleccionados</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        const isMaster = Auth.isMaster();

        tbody.innerHTML = filteredDevices.map(device => {
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

        // Calculate operation time for Ventana Horaria
        const twStart = device.time_window_start || '08:00';
        const twEnd = device.time_window_end || '23:00';
        const [sh, sm] = twStart.split(':').map(Number);
        const [eh, em] = twEnd.split(':').map(Number);
        let diffMin = (eh * 60 + em) - (sh * 60 + sm);
        if (diffMin < 0) diffMin += 24 * 60; // overnight window
        const opHours = Math.floor(diffMin / 60);
        const opMins = diffMin % 60;
        const opTimeStr = `${String(opHours).padStart(2, '0')}:${String(opMins).padStart(2, '0')}`;

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
                        <span class="detail-value">${twStart} — ${twEnd} <span style="color:var(--text-secondary);font-size:0.85rem;">(${opTimeStr} hrs operación)</span></span>
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
                            <span id="wifi-pass-visible" style="display:none;">${Utils.escapeHtml(device.wifi_password || '—')}</span>
                            <button class="btn-icon" style="margin-left:8px;font-size:0.85rem;" onclick="Devices.togglePasswordVisibility()" title="Mostrar/ocultar">
                                👁️
                            </button>
                        </span>
                    </div>
                </div>

                <div class="detail-section">
                    <h3 style="margin:0 0 16px 0;color:var(--text-primary);font-size:1.1rem;">🔑 MasterKeys con Acceso</h3>
                    <div id="device-masterkeys-content">
                        <p style="color:var(--text-secondary);font-size:0.9rem;">Cargando masterkeys...</p>
                    </div>
                </div>
            </div>
            ${Auth.isMaster() ? `
            <div style="display:flex;gap:12px;margin-top:24px;justify-content:flex-end;">
                <button class="btn btn-secondary" onclick="Devices.editDevice('${device.esp32_id}')">
                    ✏️ Editar Dispositivo
                </button>
                <button class="btn ${device.active ? 'btn-danger' : 'btn-success'}" onclick="Devices.toggleStatusFromDetail('${device.esp32_id}')">
                    ${device.active ? '🚫 Desactivar' : '✅ Activar'}
                </button>
            </div>
            ` : ''}
        `;

        // Async: load masterkeys for this device
        this.loadDeviceMasterkeys(device.esp32_id);
    },

    /**
     * Fetch and render masterkeys that have access to a device
     */
    async loadDeviceMasterkeys(esp32Id) {
        const contentEl = document.getElementById('device-masterkeys-content');
        if (!contentEl) return;

        try {
            const result = await API.getMasterkeysForDevice(esp32Id);
            const keys = result.masterkeys || [];

            if (!keys.length) {
                contentEl.innerHTML = `
                    <div style="text-align:center;padding:16px 0;color:var(--text-secondary);">
                        <div style="font-size:1.5rem;margin-bottom:6px;">🔓</div>
                        <p style="margin:0;">Sin masterkeys activas para este dispositivo</p>
                    </div>
                `;
                return;
            }

            const levelLabels = { 'GLOBAL': '🌐 Global', 'HOUSE': '🏠 Casa', 'DEVICE': '📟 Dispositivo' };

            contentEl.innerHTML = `
                <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
                    <thead>
                        <tr style="border-bottom:1px solid var(--border-color);">
                            <th style="text-align:left;padding:6px 8px;color:var(--text-secondary);font-weight:600;">ID</th>
                            <th style="text-align:left;padding:6px 8px;color:var(--text-secondary);font-weight:600;">Titular</th>
                            <th style="text-align:left;padding:6px 8px;color:var(--text-secondary);font-weight:600;">Nivel</th>
                            <th style="text-align:left;padding:6px 8px;color:var(--text-secondary);font-weight:600;">Target</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${keys.map(mk => `
                            <tr style="border-bottom:1px solid var(--border-color);">
                                <td style="padding:8px;"><strong>${Utils.escapeHtml(mk.masterkey_id)}</strong></td>
                                <td style="padding:8px;">${Utils.escapeHtml(mk.masterkey_holder || '—')}</td>
                                <td style="padding:8px;">${levelLabels[mk.masterkey_level] || mk.masterkey_level}</td>
                                <td style="padding:8px;">${Utils.escapeHtml(mk.level_target || '—')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } catch (error) {
            console.error('Error loading device masterkeys:', error);
            contentEl.innerHTML = '<p style="color:var(--text-secondary);font-size:0.9rem;">Error al cargar masterkeys</p>';
        }
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
                wifi_password: document.getElementById('new-device-password').value.trim(),
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

        // Fetch FRESH device data so device_echo (sync-status icons) and
        // wifi_networks (WiFi picker) are current, not stale from page-load cache.
        API.getDevice(esp32Id).then(result => {
            const device = result && result.device ? result.device : this.devices.find(d => d.esp32_id === esp32Id);
            if (!device) return;
            // Normalise booleans / time values (same as loadDevices does)
            device.active = device.active === true || device.active === 'TRUE' || device.active === 'true';
            device.time_window_start = this.formatTime24(device.time_window_start, '08:00');
            device.time_window_end = this.formatTime24(device.time_window_end, '23:00');
            this._openEditModal(esp32Id, device);
        }).catch(() => {
            // Fallback to cached data if network fails
            const device = this.devices.find(d => d.esp32_id === esp32Id);
            if (device) this._openEditModal(esp32Id, device);
        });
    },

    /**
     * Internal: build and display the Edit Device modal.
     * Called by editDevice() after fresh device data is fetched.
     */
    _openEditModal(esp32Id, device) {
        const tokenOptions = this.tokenTypes.map(t =>
            `<option value="${t.token_type}" ${t.token_type === device.token_type ? 'selected' : ''}>${t.token_type} — ${Utils.escapeHtml(t.token_name)}</option>`
        ).join('');

        const houseOptions = this.houses.map(h =>
            `<option value="${Utils.escapeHtml(h.house_id)}" ${h.house_id === device.house_id ? 'selected' : ''}>${Utils.escapeHtml(h.house_id)}</option>`
        ).join('');

        const isMaster = Auth.isMaster();
        // Parse device_echo for sync-status icons
        let echo = {};
        try { echo = device.device_echo ? JSON.parse(device.device_echo) : {}; } catch (_) { }
        const si = (field, backendVal) => this._syncIcon(backendVal, echo[field]);

        // Parse scanned networks for the picker (only WPA2-PSK)
        let scannedNets = [];
        try { scannedNets = device.wifi_networks ? JSON.parse(device.wifi_networks) : []; } catch (_) { }

        Utils.showModal({
            title: `Editar: ${esp32Id}`,
            content: `
                <style>
                  .sync-icon{font-size:0.75rem;cursor:default;margin-right:4px;vertical-align:middle;}
                  .wifi-net-card{display:flex;align-items:center;gap:10px;padding:10px 14px;border:2px solid var(--border-color);
                    border-radius:8px;cursor:pointer;margin-bottom:6px;transition:border-color .15s,background .15s;}
                  .wifi-net-card:hover{border-color:var(--primary);background:rgba(99,102,241,.05);}
                  .wifi-net-card.selected{border-color:var(--primary);background:rgba(99,102,241,.1);}
                  .wifi-net-card .net-ssid{font-weight:600;flex:1;}
                  .wifi-net-card .net-dots{letter-spacing:1px;color:var(--primary);}
                  .wifi-net-card .net-auth{font-size:0.72rem;padding:2px 6px;border-radius:100px;
                    background:rgba(99,102,241,.15);color:var(--primary);}
                </style>
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
                        <label for="edit-device-location">${si('location', device.location)} Ubicación *</label>
                        <input type="text" id="edit-device-location" required value="${Utils.escapeHtml(device.location || '')}">
                    </div>
                    <div class="form-group">
                        <label for="edit-device-token-type">${si('token_type', device.token_type)} Tipo de Token *</label>
                        <select id="edit-device-token-type" required>
                            ${tokenOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="edit-device-time">${si('time_limit_min', device.time_limit_min)} Tiempo de Activación (minutos) *</label>
                        <input type="number" id="edit-device-time" required min="1" max="240" value="${device.time_limit_min || 30}">
                    </div>
                    <div class="form-group">
                        <label for="edit-device-reconnect">${si('reconnect_sec', device.reconnect_sec)} Intervalo Reconexión (segundos) *</label>
                        <input type="number" id="edit-device-reconnect" required min="10" max="300" value="${device.reconnect_sec || 30}">
                    </div>
                    <div class="form-row" style="display:flex;gap:12px;">
                        <div class="form-group" style="flex:1;">
                            <label for="edit-device-tw-start">${si('tw_start', device.time_window_start)} Ventana Inicio</label>
                            <input type="time" id="edit-device-tw-start" value="${device.time_window_start || '08:00'}">
                        </div>
                        <div class="form-group" style="flex:1;">
                            <label for="edit-device-tw-end">${si('tw_end', device.time_window_end)} Ventana Fin</label>
                            <input type="time" id="edit-device-tw-end" value="${device.time_window_end || '23:00'}">
                        </div>
                    </div>

                    <!-- WiFi Network Picker (MASTER/ADMIN only) -->
                    <div style="border-top:1px solid var(--border-color);margin:16px 0;padding-top:16px;">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                            <span style="font-size:1.1rem;">📶</span>
                            <strong>WiFi Network</strong>
                            <span style="font-size:0.8rem;color:var(--text-secondary);">(solo WPA2-PSK)</span>
                        </div>
                        ${this._renderWifiPicker(scannedNets, device.wifi_ssid)}
                        <div class="form-group" style="margin-top:10px;">
                            <label for="edit-device-ssid">${si('wifi_ssid', device.wifi_ssid)} WiFi SSID *</label>
                            <input type="text" id="edit-device-ssid" required value="${Utils.escapeHtml(device.wifi_ssid || '')}">
                        </div>
                        <div class="form-group">
                            <label for="edit-device-password">${si('wifi_password', device.wifi_password)} WiFi Password * <span style="font-size:0.75rem;color:var(--text-secondary);">${device.wifi_updated_at ? `Actualizada: ${new Date(device.wifi_updated_at).toLocaleString()}` : 'Sin fecha'}</span></label>
                            <input type="text" id="edit-device-password" required value="${Utils.escapeHtml(device.wifi_password || '')}">
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Guardar Cambios</button>
                    </div>
                </form>
            `
        });

        // Wire up network card clicks
        document.querySelectorAll('.wifi-net-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.wifi-net-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                const ssidInput = document.getElementById('edit-device-ssid');
                if (ssidInput) ssidInput.value = card.dataset.ssid;
            });
        });

        document.getElementById('edit-device-form').onsubmit = async (e) => {
            e.preventDefault();

            const deviceData = {
                location: document.getElementById('edit-device-location').value.trim(),
                token_type: document.getElementById('edit-device-token-type').value,
                time_limit_min: parseInt(document.getElementById('edit-device-time').value),
                reconnect_sec: parseInt(document.getElementById('edit-device-reconnect').value),
                wifi_ssid: document.getElementById('edit-device-ssid').value.trim(),
                wifi_password: document.getElementById('edit-device-password').value.trim(),
                house_id: document.getElementById('edit-device-house').value,
                time_window_start: document.getElementById('edit-device-tw-start').value || '08:00',
                time_window_end: document.getElementById('edit-device-tw-end').value || '23:00'
            };

            try {
                await API.updateDevice(esp32Id, deviceData);
                Utils.closeModal();
                Utils.showToast('Dispositivo actualizado', 'success');
                // If detail view is open, refresh it in place
                const detailPage = document.getElementById('page-device-detail');
                if (detailPage && !detailPage.classList.contains('hidden')) {
                    await this.loadDevices();
                    this.showDetail(esp32Id);
                } else {
                    this.load();
                }
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
     * Toggle device status from detail view (stays on detail page)
     */
    async toggleStatusFromDetail(esp32Id) {
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
                // Reload data and refresh detail view in place
                await this.loadDevices();
                this.showDetail(esp32Id);
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
    },

    /**
     * Returns a 🟢 / 🟡 / ⚫ sync-status icon span comparing the backend
     * stored value vs the device_echo last reported by the device.
     *   🟢  values match  → parameter is live on the device
     *   🟡  values differ → change saved, pending device sync (≤30s)
     *   ⚫  no echo yet   → device hasn't reported back
     *
     * Comparison is loose (toString) to handle numeric vs string values.
     */
    _syncIcon(backendVal, echoVal) {
        const bv = backendVal != null ? String(backendVal).trim() : '';
        const title_prefix = 'Dispositivo: ';
        if (echoVal === undefined || echoVal === null || echoVal === '') {
            return `<span class="sync-icon" title="Sin confirmación del dispositivo">⚫</span>`;
        }
        const ev = String(echoVal).trim();
        if (bv === ev) {
            return `<span class="sync-icon" title="${title_prefix}${ev} ✓ (confirmado)">🟢</span>`;
        }
        return `<span class="sync-icon" title="Cambio pendiente — dispositivo tiene: ${ev}">🟡</span>`;
    },

    /**
     * Returns signal-strength dots (●●●●○ scale) for RSSI.
     */
    _signalDots(rssi) {
        let level = 1;
        if (rssi >= -50) level = 5;
        else if (rssi >= -60) level = 4;
        else if (rssi >= -70) level = 3;
        else if (rssi >= -80) level = 2;
        const filled = '●'.repeat(level);
        const empty = '○'.repeat(5 - level);
        return `<span class="net-dots" title="${rssi} dBm">${filled}${empty}</span>`;
    },

    /**
     * Renders the WiFi Network Picker card list.
     * Only shows WPA2-PSK compatible networks from the last device scan.
     */
    _renderWifiPicker(networks, currentSsid) {
        if (!networks || networks.length === 0) {
            return `<div style="padding:12px;text-align:center;color:var(--text-secondary);font-size:0.9rem;">
                        📡 Sin redes detectadas — enciende el dispositivo para escanear
                    </div>`;
        }
        // Sort by RSSI descending (strongest first)
        const sorted = [...networks].sort((a, b) => (b.rssi || -100) - (a.rssi || -100));
        return sorted.map(net => {
            const ssid = (net.ssid || '').trim();
            const isSelected = ssid === (currentSsid || '').trim();
            return `<div class="wifi-net-card${isSelected ? ' selected' : ''}" data-ssid="${Utils.escapeHtml(ssid)}">
                        ${this._signalDots(net.rssi || -99)}
                        <span class="net-ssid">${Utils.escapeHtml(ssid)}</span>
                        <span class="net-auth">WPA2</span>
                    </div>`;
        }).join('');
    }
};

// Export for use
window.Devices = Devices;
