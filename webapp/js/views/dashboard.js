/**
 * Dashboard View - Token Usage Chart
 * Renders stat cards and a Canvas bar chart with multi-select filters.
 */
const Dashboard = {
    tokenTypes: [],
    houses: [],
    chartData: [],
    selectedHouses: [],
    selectedTokenTypes: [],
    selectedEventTypes: ['ACCESS_GRANTED'],
    startDate: '',
    endDate: '',
    _tooltip: null,
    _barHitAreas: [],

    // User interaction event types (A-Z)
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
        const dateEl = document.getElementById('current-date');
        if (dateEl) {
            dateEl.textContent = new Date().toLocaleDateString('es-CL', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
        }

        this.initFilterDefaults();
        await this.fetchStats();
        await this.loadFilters();
        this.bindFilterEvents();
        await this.loadChartData();
    },

    // ==================== STATS ====================
    async fetchStats() {
        try {
            const response = await API.getDashboardStats();
            if (response.success) {
                this.renderStats(response.stats);
            }
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    },

    renderStats(stats) {
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('stat-devices-active', stats.devicesActive || 0);
        set('stat-devices-offline', stats.devicesOffline || 0);
        set('stat-access-today', stats.accessToday || 0);
        set('stat-tokens-consumed', stats.tokensConsumed || 0);
    },

    // ==================== FILTER DEFAULTS ====================
    initFilterDefaults() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        this.startDate = `${y}-${m}-01`;
        this.endDate = `${y}-${m}-${String(now.getDate()).padStart(2, '0')}`;

        const startEl = document.getElementById('chart-date-start');
        const endEl = document.getElementById('chart-date-end');
        if (startEl) startEl.value = this.startDate;
        if (endEl) endEl.value = this.endDate;
    },

    // ==================== LOAD FILTER OPTIONS ====================
    async loadFilters() {
        try {
            const [housesRes, tokensRes] = await Promise.all([
                API.getHouses(),
                API.getTokenTypes()
            ]);

            if (housesRes.success) {
                this.houses = (housesRes.houses || []).sort((a, b) =>
                    (a.house_id || '').localeCompare(b.house_id || ''));
            }
            if (tokensRes.success) {
                this.tokenTypes = (tokensRes.token_types || []).sort((a, b) =>
                    (a.token_type || '').localeCompare(b.token_type || ''));
            }
        } catch (e) {
            console.error('Error loading filters:', e);
        }

        this.buildMultiSelect('chart-house', this.houses.map(h => h.house_id), this.selectedHouses, 'Todas');
        this.buildMultiSelect('chart-token', this.tokenTypes.map(t => t.token_type), this.selectedTokenTypes, 'Todos');
        this.buildMultiSelect('chart-event', this.EVENT_TYPES, this.selectedEventTypes, 'Evento', v => Utils.getEventTypeName(v));
    },

    // ==================== MULTI-SELECT BUILDER ====================
    buildMultiSelect(prefix, options, selectedArr, defaultLabel, labelFn) {
        const btn = document.getElementById(`${prefix}-btn`);
        const dropdown = document.getElementById(`${prefix}-dropdown`);
        if (!btn || !dropdown) return;

        const getLabel = labelFn || (v => v);

        dropdown.innerHTML = options.map(opt => {
            const checked = selectedArr.length === 0 || selectedArr.includes(opt) ? 'checked' : '';
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

        // Toggle dropdown
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
            if (prefix === 'chart-house') {
                this.selectedHouses = checked.length === options.length ? [] : checked;
            } else if (prefix === 'chart-token') {
                this.selectedTokenTypes = checked.length === options.length ? [] : checked;
            } else if (prefix === 'chart-event') {
                this.selectedEventTypes = checked.length === options.length ? [] : checked;
            }
        });
    },

    // ==================== FILTER EVENT BINDING ====================
    bindFilterEvents() {
        const startEl = document.getElementById('chart-date-start');
        const endEl = document.getElementById('chart-date-end');

        // Date inputs just update state, no auto-refresh
        if (startEl) startEl.addEventListener('change', () => { this.startDate = startEl.value; });
        if (endEl) endEl.addEventListener('change', () => { this.endDate = endEl.value; });

        // "Actualizar Gráfico" button triggers the query
        const refreshBtn = document.getElementById('btn-refresh-chart');
        if (refreshBtn) refreshBtn.onclick = () => this.loadChartData();

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.multi-select')) {
                document.querySelectorAll('.multi-select-dropdown').forEach(d => d.classList.add('hidden'));
            }
        });
    },

    // ==================== LOAD CHART DATA ====================
    async loadChartData() {
        try {
            const filters = {
                start_date: this.startDate,
                end_date: this.endDate
            };
            if (this.selectedHouses.length > 0) {
                filters.house_ids = this.selectedHouses.join(',');
            }
            if (this.selectedTokenTypes.length > 0) {
                filters.token_types = this.selectedTokenTypes.join(',');
            }
            if (this.selectedEventTypes.length > 0) {
                filters.event_types = this.selectedEventTypes.join(',');
            }

            const response = await API.getChartData(filters);
            if (response.success) {
                this.chartData = response.chart_data || [];
                this.renderChart();
                this.renderLegend();
            }
        } catch (error) {
            console.error('Error loading chart data:', error);
        }
    },

    // ==================== CHART RENDERING ====================
    getColorForTokenType(tokenType) {
        const tt = this.tokenTypes.find(t => t.token_type === tokenType);
        return (tt && tt.token_type_color) || '#6366F1';
    },

    renderChart() {
        const canvas = document.getElementById('dashboard-chart');
        if (!canvas) return;
        const container = canvas.parentElement;
        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        const W = rect.width;
        const H = rect.height;

        // Clear
        ctx.clearRect(0, 0, W, H);

        // Build date range
        const dates = this.buildDateRange(this.startDate, this.endDate);
        if (dates.length === 0) return;

        // Find unique token types in data
        const seriesSet = new Set();
        this.chartData.forEach(d => seriesSet.add(d.token_type));
        const series = Array.from(seriesSet).sort();
        if (series.length === 0) {
            this.drawEmptyState(ctx, W, H);
            return;
        }

        // Build data matrix: { date: { tokenType: count } }
        const matrix = {};
        dates.forEach(d => { matrix[d] = {}; });
        this.chartData.forEach(d => {
            if (matrix[d.date] !== undefined) {
                matrix[d.date][d.token_type] = d.count;
            }
        });

        // Find max value for Y scale
        let maxVal = 0;
        dates.forEach(d => {
            series.forEach(s => {
                const v = matrix[d][s] || 0;
                if (v > maxVal) maxVal = v;
            });
        });
        if (maxVal === 0) maxVal = 1;

        // Chart margins
        const marginLeft = 48;
        const marginRight = 16;
        const marginTop = 16;
        const marginBottom = 56;
        const chartW = W - marginLeft - marginRight;
        const chartH = H - marginTop - marginBottom;

        // Draw Y axis grid lines & labels
        const ySteps = this.niceSteps(maxVal);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.font = '11px Inter, sans-serif';
        ySteps.forEach(val => {
            const y = marginTop + chartH - (val / maxVal) * chartH;
            // Grid line
            ctx.strokeStyle = '#e5e7eb';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(marginLeft, y);
            ctx.lineTo(W - marginRight, y);
            ctx.stroke();
            // Label
            ctx.fillStyle = '#9ca3af';
            ctx.fillText(val.toString(), marginLeft - 8, y);
        });

        // Draw bars (grouped)
        const groupWidth = chartW / dates.length;
        const groupPadding = Math.max(groupWidth * 0.2, 4);
        const barAreaWidth = groupWidth - groupPadding;
        const barWidth = Math.max(barAreaWidth / series.length, 2);
        const actualBarWidth = Math.min(barWidth, 36);

        this._barHitAreas = [];

        dates.forEach((date, di) => {
            const groupX = marginLeft + di * groupWidth + groupPadding / 2;
            series.forEach((tokenType, si) => {
                const count = matrix[date][tokenType] || 0;
                const barH = (count / maxVal) * chartH;
                const x = groupX + si * actualBarWidth;
                const y = marginTop + chartH - barH;

                const color = this.getColorForTokenType(tokenType);

                // Draw bar with rounded tops
                ctx.fillStyle = color;
                ctx.beginPath();
                const r = Math.min(3, actualBarWidth / 4);
                if (barH > r * 2) {
                    ctx.moveTo(x, y + r);
                    ctx.arcTo(x, y, x + r, y, r);
                    ctx.arcTo(x + actualBarWidth, y, x + actualBarWidth, y + r, r);
                    ctx.lineTo(x + actualBarWidth, marginTop + chartH);
                    ctx.lineTo(x, marginTop + chartH);
                } else if (barH > 0) {
                    ctx.rect(x, y, actualBarWidth, barH);
                }
                ctx.fill();

                // Store hit area for tooltip
                this._barHitAreas.push({
                    x, y, w: actualBarWidth, h: barH,
                    date, tokenType, count, color
                });
            });

            // X-axis label (day number for short range, full date for longer)
            ctx.fillStyle = '#9ca3af';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            const labelX = groupX + (series.length * actualBarWidth) / 2;
            const labelY = marginTop + chartH + 6;
            const label = dates.length <= 31 ? date.slice(8) : date.slice(5);
            ctx.fillText(label, labelX, labelY);
        });

        // Attach tooltip handler
        this.setupTooltip(canvas);
    },

    drawEmptyState(ctx, W, H) {
        ctx.fillStyle = '#9ca3af';
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No hay datos para el período seleccionado', W / 2, H / 2);
    },

    buildDateRange(startStr, endStr) {
        const dates = [];
        const start = new Date(startStr + 'T00:00:00');
        const end = new Date(endStr + 'T00:00:00');
        if (isNaN(start) || isNaN(end) || start > end) return dates;
        const d = new Date(start);
        while (d <= end) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            dates.push(`${y}-${m}-${day}`);
            d.setDate(d.getDate() + 1);
        }
        return dates;
    },

    niceSteps(maxVal) {
        const target = 5;
        const rough = maxVal / target;
        const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
        const residual = rough / magnitude;
        let tick;
        if (residual <= 1.5) tick = magnitude;
        else if (residual <= 3.5) tick = 2 * magnitude;
        else if (residual <= 7.5) tick = 5 * magnitude;
        else tick = 10 * magnitude;
        tick = Math.max(1, Math.round(tick));

        const steps = [];
        for (let v = 0; v <= maxVal; v += tick) {
            steps.push(v);
        }
        if (steps[steps.length - 1] < maxVal) {
            steps.push(steps[steps.length - 1] + tick);
        }
        return steps;
    },

    // ==================== TOOLTIP ====================
    setupTooltip(canvas) {
        if (!this._tooltip) {
            this._tooltip = document.createElement('div');
            this._tooltip.className = 'chart-tooltip';
            canvas.parentElement.appendChild(this._tooltip);
        }
        const tooltip = this._tooltip;

        canvas.onmousemove = (e) => {
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;

            let hit = null;
            for (const bar of this._barHitAreas) {
                if (mx >= bar.x && mx <= bar.x + bar.w && my >= bar.y && my <= bar.y + bar.h) {
                    hit = bar;
                    break;
                }
            }

            if (hit) {
                const tokenName = this.getTokenName(hit.tokenType);
                tooltip.innerHTML = `<strong>${hit.date}</strong><br>` +
                    `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${hit.color};margin-right:4px;"></span>` +
                    `${Utils.escapeHtml(tokenName)}: <strong>${hit.count}</strong>`;
                tooltip.classList.add('visible');

                // Position tooltip
                let tx = hit.x + hit.w + 10;
                let ty = hit.y - 10;
                if (tx + 160 > rect.width) tx = hit.x - 160;
                if (ty < 0) ty = 10;
                tooltip.style.left = tx + 'px';
                tooltip.style.top = ty + 'px';
            } else {
                tooltip.classList.remove('visible');
            }
        };

        canvas.onmouseleave = () => {
            tooltip.classList.remove('visible');
        };
    },

    getTokenName(tokenType) {
        const tt = this.tokenTypes.find(t => t.token_type === tokenType);
        return tt ? `${tt.token_name} (${tt.token_type})` : tokenType;
    },

    // ==================== LEGEND ====================
    renderLegend() {
        const legendEl = document.getElementById('chart-legend');
        if (!legendEl) return;

        const seriesSet = new Set();
        this.chartData.forEach(d => seriesSet.add(d.token_type));
        const series = Array.from(seriesSet).sort();

        legendEl.innerHTML = series.map(tokenType => {
            const color = this.getColorForTokenType(tokenType);
            const name = this.getTokenName(tokenType);
            return `<div class="chart-legend-item">
                <span class="chart-legend-swatch" style="background:${color}"></span>
                <span>${Utils.escapeHtml(name)}</span>
            </div>`;
        }).join('');
    }
};
