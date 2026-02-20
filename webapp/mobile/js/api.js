/**
 * API Client — Admin Mobile App
 */
const API = {
    async get(action, params = {}) {
        const qs = new URLSearchParams({ action, ...params });
        const res = await fetch(`${Config.API_BASE_URL}?${qs}`, { method: 'GET', redirect: 'follow' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    },

    async post(action, data = {}) {
        const res = await fetch(Config.API_BASE_URL, {
            method: 'POST',
            redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action, ...data })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    },

    // Auth
    validateAdmin(email) { return this.get('validateAdmin', { email }); },

    // Data
    getAdminHouses(email) { return this.get('getAdminHouses', { email }); },
    getHouses() { return this.get('getHouses'); },
    getUsers() { return this.get('getUsers'); },
    getTokenTypes() { return this.get('getTokenTypes'); },
    getDevices() { return this.get('getDevices'); },
    getLogs(filters = {}) { return this.get('getLogs', filters); },

    // Token balance
    updateTokenBalance(uid, tokenType, delta) {
        return this.post('updateTokenBalance', { uid, token_type: tokenType, delta: Number(delta) });
    }
};
