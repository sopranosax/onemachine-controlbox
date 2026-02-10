/**
 * Dashboard View for IoT Control WebApp
 */

const Dashboard = {
    /**
     * Load dashboard data
     */
    async load() {
        this.renderLoadingState();

        try {
            // For demo, use mock data
            // In production, call API.getDashboardStats()
            const stats = await this.fetchStats();
            this.renderStats(stats);

            const events = await this.fetchRecentEvents();
            this.renderRecentEvents(events);
        } catch (error) {
            console.error('Error loading dashboard:', error);
            Utils.showToast('Error al cargar el dashboard', 'error');
        }
    },

    /**
     * Fetch dashboard statistics
     */
    async fetchStats() {
        // Mock data for demo - replace with API call
        try {
            const response = await API.getDashboardStats();
            return response.stats;
        } catch (error) {
            // Return mock data if API fails
            return {
                devicesActive: 5,
                devicesOffline: 1,
                accessToday: 47,
                tokensConsumed: 32
            };
        }
    },

    /**
     * Fetch recent events
     */
    async fetchRecentEvents() {
        try {
            const response = await API.getLogs({ limit: Config.UI.RECENT_EVENTS_LIMIT });
            return response.logs || [];
        } catch (error) {
            // Return mock data if API fails
            return [
                { timestamp: new Date().toISOString(), uid: 'ABC123', user_name: 'Juan Pérez', esp32_id: 'ESP32-01', event_type: 'ACCESS_GRANTED', token_type: 'WSH' },
                { timestamp: new Date(Date.now() - 300000).toISOString(), uid: 'DEF456', user_name: 'María García', esp32_id: 'ESP32-02', event_type: 'ACCESS_DENIED', token_type: 'DRY' },
                { timestamp: new Date(Date.now() - 600000).toISOString(), uid: 'GHI789', user_name: 'Carlos López', esp32_id: 'ESP32-01', event_type: 'ACCESS_GRANTED', token_type: 'WSH' }
            ];
        }
    },

    /**
     * Render loading state
     */
    renderLoadingState() {
        document.getElementById('stat-devices-active').textContent = '...';
        document.getElementById('stat-devices-offline').textContent = '...';
        document.getElementById('stat-access-today').textContent = '...';
        document.getElementById('stat-tokens-consumed').textContent = '...';
        document.getElementById('recent-events').innerHTML = '<div class="loading-placeholder">Cargando eventos...</div>';
    },

    /**
     * Render statistics
     */
    renderStats(stats) {
        document.getElementById('stat-devices-active').textContent = stats.devicesActive || 0;
        document.getElementById('stat-devices-offline').textContent = stats.devicesOffline || 0;
        document.getElementById('stat-access-today').textContent = stats.accessToday || 0;
        document.getElementById('stat-tokens-consumed').textContent = stats.tokensConsumed || 0;
    },

    /**
     * Render recent events list
     */
    renderRecentEvents(events) {
        const container = document.getElementById('recent-events');

        if (!events || events.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <p class="empty-state-title">Sin eventos recientes</p>
                    <p class="empty-state-message">Los eventos de acceso aparecerán aquí</p>
                </div>
            `;
            return;
        }

        container.innerHTML = events.map(event => {
            const iconClass = event.event_type === 'ACCESS_GRANTED' ? 'granted' :
                event.event_type === 'ACCESS_DENIED' ? 'denied' : 'error';
            const icon = event.event_type === 'ACCESS_GRANTED' ? '✓' :
                event.event_type === 'ACCESS_DENIED' ? '✕' : '!';

            return `
                <div class="event-item">
                    <div class="event-icon ${iconClass}">${icon}</div>
                    <div class="event-details">
                        <div class="event-title">${Utils.escapeHtml(event.user_name || event.uid)}</div>
                        <div class="event-subtitle">${Utils.escapeHtml(event.esp32_id)} • ${event.token_type}</div>
                    </div>
                    <div class="event-time">${Utils.formatRelativeTime(event.timestamp)}</div>
                </div>
            `;
        }).join('');
    }
};

// Export for use
window.Dashboard = Dashboard;
