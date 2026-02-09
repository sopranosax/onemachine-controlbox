/**
 * API Client for IoT Control WebApp
 * Handles all communication with the Google Apps Script backend
 * 
 * Note: Google Apps Script Web Apps require special handling for CORS.
 * Using redirect: 'follow' and mode: 'cors' with proper fetch configuration.
 */

const API = {
    /**
     * GET request to Apps Script
     * @param {string} action - Action name
     * @param {Object} params - Additional parameters
     */
    async get(action, params = {}) {
        const queryParams = new URLSearchParams({ action, ...params });
        const url = `${Config.API_BASE_URL}?${queryParams.toString()}`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                redirect: 'follow'
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API GET Error:', error);
            throw error;
        }
    },

    /**
     * POST request to Apps Script
     * Google Apps Script requires specific handling for POST requests.
     * We use 'application/x-www-form-urlencoded' or send as query params.
     * @param {string} action - Action name
     * @param {Object} data - Request data
     */
    async post(action, data = {}) {
        try {
            // For Google Apps Script, POST with JSON can have CORS issues
            // Using text/plain content type which doesn't trigger preflight
            const response = await fetch(Config.API_BASE_URL, {
                method: 'POST',
                redirect: 'follow',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify({ action, ...data })
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API POST Error:', error);
            throw error;
        }
    },

    // ==================== AUTH ====================

    async validateAdmin(email) {
        // Use GET for simpler CORS handling with Apps Script
        return this.get('validateAdmin', { email });
    },

    // ==================== USERS ====================

    async getUsers(filters = {}) {
        return this.get('getUsers', filters);
    },

    async getUser(uid) {
        return this.get('getUser', { uid });
    },

    async createUser(userData) {
        return this.post('createUser', userData);
    },

    async updateUser(uid, userData) {
        return this.post('updateUser', { uid, ...userData });
    },

    // ==================== USER TOKENS ====================

    async getUserTokens(uid) {
        return this.get('getUserTokens', { uid });
    },

    async updateTokenBalance(uid, tokenType, delta) {
        return this.post('updateTokenBalance', { uid, token_type: tokenType, delta });
    },

    // ==================== DEVICES ====================

    async getDevices() {
        return this.get('getDevices');
    },

    async getDevice(esp32Id) {
        return this.get('getDevice', { esp32_id: esp32Id });
    },

    async createDevice(deviceData) {
        return this.post('createDevice', deviceData);
    },

    async updateDevice(esp32Id, deviceData) {
        return this.post('updateDevice', { esp32_id: esp32Id, ...deviceData });
    },

    // ==================== LOGS ====================

    async getLogs(filters = {}) {
        return this.get('getLogs', filters);
    },

    // ==================== TOKEN TYPES ====================

    async getTokenTypes() {
        return this.get('getTokenTypes');
    },

    async createTokenType(tokenData) {
        return this.post('createTokenType', tokenData);
    },

    async updateTokenType(tokenType, tokenData) {
        return this.post('updateTokenType', { token_type: tokenType, ...tokenData });
    },

    async deleteTokenType(tokenType, force = false) {
        return this.post('deleteTokenType', { token_type: tokenType, force: force });
    },

    // ==================== ADMINS ====================

    async getAdmins() {
        return this.get('getAdmins');
    },

    async createAdmin(adminData) {
        return this.post('createAdmin', adminData);
    },

    async updateAdmin(email, adminData) {
        return this.post('updateAdmin', { email, ...adminData });
    },

    // ==================== DASHBOARD ====================

    async getDashboardStats() {
        return this.get('getDashboardStats');
    },

    // ==================== ADMIN LOG ====================

    async getAdminLog(filters = {}) {
        return this.get('getAdminLog', filters);
    }
};

window.API = API;
