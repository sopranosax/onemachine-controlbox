/**
 * Logs View for IoT Control WebApp
 * Multi-select filters for Casa, Dispositivo, Tipo Token, Evento.
 */

const Logs = {
    logs: [],
    devices: [],
    houses: [],
    tokenTypes: [],
    selectedHouses: [],
    selectedDevices: [],
    selectedTokenTypes: [],
    selectedEventTypes: [],

    // Same 9 user interaction event types as Dashboard (A-Z)
    EVENT_TYPES: [
        'ACCESS_GRANTED',
        'INACTIVE_USER',
        'INVALID_TOKEN_TYPE',
        'MASTERKEY_ACCESS',
        'MASTERKEY_ACCESS_OFFLINE',
        'NO_TOKENS',
        'NOT_IN_HOUSE_USER',
        'OUTSIDE_TIME_WINDOW',
        'UNREGISTERED_USER'
    ],

    async load() {
        this.initFilters();
        this.renderLoadingState();

        try {
            await this.loadFilterData();
            this.buildMultiSelects();
            this.bindEvents();
            await this.loadLogs();
        } catch (error) {
            console.error('Error loading logs:', error);
            Utils.showToast('Error al cargar logs', 'error');
        }
    },

    // ==================== FILTER DEFAULTS ====================
    initFilters() {
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);

        const dateFrom = document.getElementById('filter-date-from');
        const dateTo = document.getElementById('filter-date-to');
        if (dateFrom) dateFrom.value = weekAgo.toISOString().split('T')[0];
        if (dateTo) dateTo.value = today.toISOString().split('T')[0];
    },

    // ==================== LOAD FILTER DATA ====================
    async loadFilterData() {
        try {
            const [devicesRes, housesRes, tokensRes] = await Promise.all([
                API.getDevices(),
                API.getHouses(),
                API.getTokenTypes()
            ]);

            this.devices = (devicesRes.devices || []).sort((a, b) =>
                (a.esp32_id || '').localeCompare(b.esp32_id || ''));
            this.houses = (housesRes.houses || []).sort((a, b) =>
                (a.house_id || '').localeCompare(b.house_id || ''));
            this.tokenTypes = (tokensRes.token_types || []).sort((a, b) =>
                (a.token_type || '').localeCompare(b.token_type || ''));
        } catch (e) {
            console.error('Error loading filter data:', e);
        }
    },

    // ==================== MULTI-SELECT BUILDER ====================
    buildMultiSelect(prefix, options, selectedArr, defaultLabel, labelFn) {
        const btn = document.getElementById(`${prefix}-btn`);
        const dropdown = document.getElementById(`${prefix}-dropdown`);
        if (!btn || !dropdown) return;

        const getLabel = labelFn || (v => v);

        dropdown.innerHTML = options.map(opt => {
            const checked = selectedArr.length === 0 ? 'checked' : (selectedArr.includes(opt) ? 'checked' : '');
            return `<label><input type="checkbox" value="${Utils.escapeHtml(opt)}" ${checked}> ${Utils.escapeHtml(getLabel(opt))}</label>`;
        }).join('');

        const updateLabel = () => {
            const checked = Array.from(dropdown.querySelectorAll('input:checked')).map(cb => cb.value);
            if (checked.length === 0 || checked.length === options.length) {
                btn.textContent = defaultLabel;
            } else if (checked.length === 1) {
                btn.textContent = getLabel(checked[0]);
            } else {
                btn.textContent = `${checked.length} sel.`;
            }
        };
        updateLabel();

        btn.onclick = (e) => {
            e.stopPropagation();
            document.querySelectorAll('.multi-select-dropdown').forEach(d => {
                if (d !== dropdown) d.classList.add('hidden');
            });
            dropdown.classList.toggle('hidden');
        };

        // Handle checkbox changes — only update state, no auto-refresh
        dropdown.addEventListener('change', () => {
            updateLabel();
            const checked = Array.from(dropdown.querySelectorAll('input:checked')).map(cb => cb.value);
            if (prefix === 'log-house') {
                this.selectedHouses = checked.length === options.length ? [] : checked;
            } else if (prefix === 'log-device') {
                this.selectedDevices = checked.length === options.length ? [] : checked;
            } else if (prefix === 'log-token') {
                this.selectedTokenTypes = checked.length === options.length ? [] : checked;
            } else if (prefix === 'log-event') {
                this.selectedEventTypes = checked.length === options.length ? [] : checked;
            }
        });
    },

    buildMultiSelects() {
        this.buildMultiSelect('log-house', this.houses.map(h => h.house_id), this.selectedHouses, 'Todas');
        this.buildMultiSelect('log-device', this.devices.map(d => d.esp32_id), this.selectedDevices, 'Todos');
        this.buildMultiSelect('log-token', this.tokenTypes.map(t => t.token_type), this.selectedTokenTypes, 'Todos');
        this.buildMultiSelect('log-event', this.EVENT_TYPES, this.selectedEventTypes, 'Todos', v => Utils.getEventTypeName(v));
    },

    // ==================== EVENT BINDING ====================
    bindEvents() {
        const exportBtn = document.getElementById('btn-export-logs');
        if (exportBtn) {
            exportBtn.onclick = () => this.exportLogs();
            exportBtn.style.display = Auth.can('logs.export') ? '' : 'none';
        }

        // "Buscar" button triggers filtering
        const searchBtn = document.getElementById('btn-search-logs');
        if (searchBtn) searchBtn.onclick = () => this.applyFilters();

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.multi-select')) {
                document.querySelectorAll('.multi-select-dropdown').forEach(d => d.classList.add('hidden'));
            }
        });
    },

    // ==================== LOAD LOGS ====================
    async loadLogs() {
        try {
            const response = await API.getLogs(this.filters || {});
            this.logs = response.logs || [];
        } catch (e) {
            this.logs = [];
        }
        this.applyFilters();
    },

    renderLoadingState() {
        const tbody = document.getElementById('logs-tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="loading-placeholder">Cargando...</td></tr>';
    },

    // ==================== CLIENT-SIDE FILTERING ====================
    applyFilters() {
        let filtered = [...this.logs];

        // Date range filter (use the raw timestamp from logs)
        const dateFrom = document.getElementById('filter-date-from')?.value;
        const dateTo = document.getElementById('filter-date-to')?.value;
        // Note: date filtering is done server-side via API.getLogs; client-side filtering
        // is for the multi-select filters only.

        // House filter
        if (this.selectedHouses.length > 0) {
            filtered = filtered.filter(l => this.selectedHouses.includes(l.house_id || ''));
        }

        // Device filter
        if (this.selectedDevices.length > 0) {
            filtered = filtered.filter(l => this.selectedDevices.includes(l.esp32_id));
        }

        // Token type filter
        if (this.selectedTokenTypes.length > 0) {
            filtered = filtered.filter(l => this.selectedTokenTypes.includes(l.token_type));
        }

        // Event type filter
        if (this.selectedEventTypes.length > 0) {
            filtered = filtered.filter(l => this.selectedEventTypes.includes(l.event_type));
        }

        this.renderLogs(filtered);
    },

    // ==================== RENDER TABLE ====================
    renderLogs(logs) {
        const tbody = document.getElementById('logs-tbody');

        if (!logs || !logs.length) {
            tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><p>No hay registros</p></div></td></tr>';
            return;
        }

        tbody.innerHTML = logs.map(log => {
            const isOfflineMk = log.event_type === 'MASTERKEY_ACCESS_OFFLINE';
            const isMkEvent = log.is_masterkey_event || log.event_type === 'MASTERKEY_ACCESS' || isOfflineMk;

            let nameCell;
            if (isMkEvent) {
                const mkLabel = isOfflineMk
                    ? `${Utils.escapeHtml(log.masterkey_holder || log.uid)} <span style="color:var(--text-secondary);font-size:0.8rem;">(🔑 MK 📴)</span>`
                    : `${Utils.escapeHtml(log.masterkey_holder || log.uid)} <span style="color:var(--text-secondary);font-size:0.8rem;">(🔑 MK)</span>`;
                nameCell = mkLabel;
            } else {
                nameCell = Utils.escapeHtml(log.user_name || '-');
            }

            return `
                <tr>
                    <td>${Utils.formatDate(log.timestamp)}</td>
                    <td><code>${Utils.escapeHtml(log.uid || '-')}</code></td>
                    <td>${nameCell}</td>
                    <td>${Utils.escapeHtml(log.house_id || '-')}</td>
                    <td><a href="#" onclick="App.navigateTo('devices'); return false;" style="color:var(--accent-primary);text-decoration:none;"><code>${log.esp32_id}</code></a></td>
                    <td><span class="badge badge-info">${log.token_type}</span></td>
                    <td><span class="badge ${Utils.getEventBadgeClass(log.event_type)}">${Utils.getEventTypeName(log.event_type)}</span></td>
                    <td>${log.token_balance_after != null ? log.token_balance_after : '-'}</td>
                </tr>
            `;
        }).join('');
    },

    // ==================== EXPORT ====================
    exportLogs() {
        if (!this.logs?.length) {
            Utils.showToast('No hay datos', 'warning');
            return;
        }
        Utils.exportToCsv(this.logs.map(l => ({
            Fecha: Utils.formatDate(l.timestamp),
            UID: l.uid,
            Usuario: l.user_name || '',
            Titular_MK: l.masterkey_holder || '',
            Casa: l.house_id || '',
            Dispositivo: l.esp32_id,
            Token: l.token_type,
            Evento: l.event_type,
            Balance: l.token_balance_after ?? ''
        })), 'logs');
    }
};

window.Logs = Logs;
