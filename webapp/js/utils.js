/**
 * Utility functions for IoT Control WebApp
 */

const Utils = {
    /**
     * Format a date to locale string
     * @param {string|Date} date - Date to format
     * @param {boolean} includeTime - Include time in output
     * @returns {string} Formatted date
     */
    formatDate(date, includeTime = true) {
        if (!date) return '-';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';

        const options = {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        };

        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
            options.second = '2-digit';
        }

        return d.toLocaleString('es-CL', options);
    },

    /**
     * Format relative time (e.g., "hace 5 minutos")
     * @param {string|Date} date - Date to format
     * @returns {string} Relative time string
     */
    formatRelativeTime(date) {
        if (!date) return '-';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';

        const now = new Date();
        const diffMs = now - d;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffSec < 60) return 'hace un momento';
        if (diffMin < 60) return `hace ${diffMin} min`;
        if (diffHour < 24) return `hace ${diffHour}h`;
        if (diffDay < 7) return `hace ${diffDay}d`;

        return this.formatDate(date, false);
    },

    /**
     * Generate a UUID
     * @returns {string} UUID
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean}
     */
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    /**
     * Escape HTML to prevent XSS
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * Debounce function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Show toast notification
     * @param {string} message - Message to show
     * @param {string} type - Type: 'success', 'error', 'warning'
     */
    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: '✓',
            error: '✕',
            warning: '!'
        };

        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.success}</span>
            <span class="toast-message">${this.escapeHtml(message)}</span>
        `;

        container.appendChild(toast);

        // Auto remove after duration
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, Config.UI.TOAST_DURATION);
    },

    /**
     * Show confirmation modal
     * @param {Object} options - Modal options
     * @returns {Promise<boolean>} True if confirmed
     */
    showConfirm(options) {
        return new Promise((resolve) => {
            const { title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', type = 'warning' } = options;

            const overlay = document.getElementById('modal-overlay');
            const container = document.getElementById('modal-container');

            const icons = {
                warning: '⚠️',
                danger: '🗑️',
                info: 'ℹ️'
            };

            container.innerHTML = `
                <div class="confirm-dialog">
                    <div class="confirm-icon ${type}">${icons[type] || icons.warning}</div>
                    <h3 class="confirm-title">${this.escapeHtml(title)}</h3>
                    <p class="confirm-message">${this.escapeHtml(message)}</p>
                    <div class="confirm-actions">
                        <button class="btn btn-secondary" id="confirm-cancel">${cancelText}</button>
                        <button class="btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'}" id="confirm-ok">${confirmText}</button>
                    </div>
                </div>
            `;

            overlay.classList.remove('hidden');

            const cleanup = () => {
                overlay.classList.add('hidden');
                container.innerHTML = '';
            };

            document.getElementById('confirm-cancel').onclick = () => {
                cleanup();
                resolve(false);
            };

            document.getElementById('confirm-ok').onclick = () => {
                cleanup();
                resolve(true);
            };

            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    cleanup();
                    resolve(false);
                }
            };
        });
    },

    /**
     * Show modal with custom content
     * @param {Object} options - Modal options
     */
    showModal(options) {
        const { title, content, onClose } = options;

        const overlay = document.getElementById('modal-overlay');
        const container = document.getElementById('modal-container');

        container.innerHTML = `
            <div class="modal-header">
                <h3>${this.escapeHtml(title)}</h3>
                <button class="modal-close" id="modal-close-btn">&times;</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
        `;

        overlay.classList.remove('hidden');

        const closeModal = () => {
            overlay.classList.add('hidden');
            container.innerHTML = '';
            if (typeof onClose === 'function') onClose();
        };

        document.getElementById('modal-close-btn').onclick = closeModal;

        overlay.onclick = (e) => {
            if (e.target === overlay) closeModal();
        };

        return { close: closeModal };
    },

    /**
     * Close any open modal
     */
    closeModal() {
        const overlay = document.getElementById('modal-overlay');
        const container = document.getElementById('modal-container');
        overlay.classList.add('hidden');
        container.innerHTML = '';
    },

    /**
     * Check if device is online based on LAST_SEEN
     * @param {string|Date} lastSeen - Last seen timestamp
     * @returns {boolean}
     */
    isDeviceOnline(lastSeen) {
        if (!lastSeen) return false;
        const d = new Date(lastSeen);
        if (isNaN(d.getTime())) return false;

        const now = new Date();
        const diffMs = now - d;
        const diffMin = diffMs / (1000 * 60);

        return diffMin <= Config.UI.OFFLINE_THRESHOLD_MIN;
    },

    /**
     * Get event type badge class
     * @param {string} eventType - Event type
     * @returns {string} CSS class
     */
    getEventBadgeClass(eventType) {
        switch (eventType) {
            case Config.EVENT_TYPES.ACCESS_GRANTED:
                return 'badge-success';
            case Config.EVENT_TYPES.ACCESS_DENIED:
                return 'badge-danger';
            case Config.EVENT_TYPES.ERROR:
                return 'badge-warning';
            default:
                return 'badge-info';
        }
    },

    /**
     * Get event type display name
     * @param {string} eventType - Event type
     * @returns {string} Display name
     */
    getEventTypeName(eventType) {
        const names = {
            [Config.EVENT_TYPES.ACCESS_GRANTED]: 'Acceso Concedido',
            [Config.EVENT_TYPES.ACCESS_DENIED]: 'Acceso Denegado',
            [Config.EVENT_TYPES.IN_USE]: 'En Uso',
            [Config.EVENT_TYPES.ERROR]: 'Error',
            [Config.EVENT_TYPES.WIFI_DOWN]: 'WiFi Caído',
            [Config.EVENT_TYPES.WIFI_RESTORED]: 'WiFi Restaurado',
            [Config.EVENT_TYPES.DEVICE_RESTARTED]: 'Reinicio Dispositivo'
        };
        return names[eventType] || eventType;
    },

    /**
     * Export data to CSV
     * @param {Array} data - Array of objects
     * @param {string} filename - Filename without extension
     */
    exportToCsv(data, filename) {
        if (!data || !data.length) {
            this.showToast('No hay datos para exportar', 'warning');
            return;
        }

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row =>
                headers.map(h => {
                    let val = row[h] || '';
                    // Escape quotes and wrap in quotes if contains comma
                    if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
                        val = `"${val.replace(/"/g, '""')}"`;
                    }
                    return val;
                }).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        this.showToast('Archivo exportado correctamente', 'success');
    }
};

// Export for use
window.Utils = Utils;
