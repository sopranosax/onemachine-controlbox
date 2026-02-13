/**
 * Logs View for IoT Control WebApp
 */

const Logs = {
    logs: [],
    devices: [],
    filters: {},

    async load() {
        this.bindEvents();
        this.initFilters();
        this.renderLoadingState();

        try {
            await this.loadDevices();
            await this.loadLogs();
        } catch (error) {
            console.error('Error loading logs:', error);
            Utils.showToast('Error al cargar logs', 'error');
        }
    },

    bindEvents() {
        const exportBtn = document.getElementById('btn-export-logs');
        if (exportBtn) {
            exportBtn.onclick = () => this.exportLogs();
            exportBtn.style.display = Auth.can('logs.export') ? '' : 'none';
        }

        // Instant filters (matching devices page pattern)
        const filters = ['filter-device', 'filter-event-type'];
        filters.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.onchange = () => this.applyFilters();
        });

        // Date filters also apply instantly
        const dateFilters = ['filter-date-from', 'filter-date-to'];
        dateFilters.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.onchange = () => this.applyFilters();
        });
    },

    initFilters() {
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);

        const dateFrom = document.getElementById('filter-date-from');
        const dateTo = document.getElementById('filter-date-to');

        if (dateFrom) dateFrom.value = weekAgo.toISOString().split('T')[0];
        if (dateTo) dateTo.value = today.toISOString().split('T')[0];
    },

    async loadDevices() {
        try {
            const response = await API.getDevices();
            this.devices = response.devices || [];
        } catch (e) {
            this.devices = [];
        }

        const deviceSelect = document.getElementById('filter-device');
        if (deviceSelect) {
            deviceSelect.innerHTML = '<option value="">Todos</option>' +
                this.devices.map(d => `<option value="${d.esp32_id}">${d.esp32_id}</option>`).join('');
        }
    },

    async loadLogs() {
        try {
            const response = await API.getLogs(this.filters);
            this.logs = response.logs || [];
        } catch (e) {
            this.logs = [
                { timestamp: new Date().toISOString(), uid: 'ABC123', user_name: 'Juan', esp32_id: 'ESP-01', token_type: 'WSH', event_type: 'ACCESS_GRANTED', token_balance_after: 4 },
                { timestamp: new Date(Date.now() - 300000).toISOString(), uid: 'DEF456', user_name: 'María', esp32_id: 'ESP-02', token_type: 'DRY', event_type: 'ACCESS_DENIED', token_balance_after: 0 }
            ];
        }
        this.renderLogs(this.logs);
    },

    renderLoadingState() {
        document.getElementById('logs-tbody').innerHTML = '<tr><td colspan="8" class="loading-placeholder">Cargando...</td></tr>';
    },

    applyFilters() {
        this.filters = {
            dateFrom: document.getElementById('filter-date-from').value,
            dateTo: document.getElementById('filter-date-to').value,
            device: document.getElementById('filter-device').value,
            eventType: document.getElementById('filter-event-type').value
        };

        let filtered = [...this.logs];
        if (this.filters.device) filtered = filtered.filter(l => l.esp32_id === this.filters.device);
        if (this.filters.eventType) filtered = filtered.filter(l => l.event_type === this.filters.eventType);

        this.renderLogs(filtered);
    },

    renderLogs(logs) {
        const tbody = document.getElementById('logs-tbody');

        if (!logs || !logs.length) {
            tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><p>No hay registros</p></div></td></tr>';
            return;
        }

        tbody.innerHTML = logs.map(log => {
            // Reason badge styling
            let reasonBadge = '';
            const reason = log.reason || '';
            if (reason.startsWith('MASTERKEY_')) {
                const level = reason.replace('MASTERKEY_', '');
                reasonBadge = `<span class="badge badge-success" title="Acceso por llave maestra">🔑 MK:${level}</span>`;
            } else if (reason === 'OUTSIDE_TIME_WINDOW') {
                reasonBadge = `<span class="badge badge-warning" title="Fuera de ventana horaria">⏰ Fuera horario</span>`;
            } else if (reason === 'NO_TOKENS') {
                reasonBadge = `<span class="badge badge-danger">Sin tokens</span>`;
            } else if (reason === 'OK') {
                reasonBadge = `<span class="badge badge-info">OK</span>`;
            } else if (reason) {
                reasonBadge = `<span class="badge">${Utils.escapeHtml(reason)}</span>`;
            } else {
                reasonBadge = '-';
            }

            return `
                <tr>
                    <td>${Utils.formatDate(log.timestamp)}</td>
                    <td><code>${Utils.escapeHtml(log.uid || '-')}</code></td>
                    <td>${Utils.escapeHtml(log.user_name || '-')}</td>
                    <td><a href="#" onclick="App.navigateTo('devices'); return false;" style="color:var(--accent-primary);text-decoration:none;"><code>${log.esp32_id}</code></a></td>
                    <td><span class="badge badge-info">${log.token_type}</span></td>
                    <td><span class="badge ${Utils.getEventBadgeClass(log.event_type)}">${Utils.getEventTypeName(log.event_type)}</span></td>
                    <td>${reasonBadge}</td>
                    <td>${log.token_balance_after != null ? log.token_balance_after : '-'}</td>
                </tr>
            `;
        }).join('');
    },

    exportLogs() {
        if (!this.logs?.length) {
            Utils.showToast('No hay datos', 'warning');
            return;
        }
        Utils.exportToCsv(this.logs.map(l => ({
            Fecha: Utils.formatDate(l.timestamp),
            UID: l.uid,
            Usuario: l.user_name || '',
            Dispositivo: l.esp32_id,
            Token: l.token_type,
            Evento: l.event_type,
            Balance: l.token_balance_after ?? ''
        })), 'logs');
    }
};

window.Logs = Logs;
