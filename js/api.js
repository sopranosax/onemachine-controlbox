/**
 * OneMachine ControlBox - API Client
 * Comunicación con el backend Google Apps Script
 */

class API {
  constructor() {
    this.baseUrl = localStorage.getItem('backendUrl') || '';
  }

  setBaseUrl(url) {
    this.baseUrl = url;
    localStorage.setItem('backendUrl', url);
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  // ==================== GET REQUESTS ====================

  async get(action, params = {}) {
    if (!this.baseUrl) {
      throw new Error('Backend URL no configurada');
    }

    const queryParams = new URLSearchParams({ action, ...params });
    const url = `${this.baseUrl}?${queryParams}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API GET Error:', error);
      throw error;
    }
  }

  async post(action, data = {}) {
    if (!this.baseUrl) {
      throw new Error('Backend URL no configurada');
    }

    try {
      // Google Apps Script requiere este formato especial para evitar CORS preflight
      // No podemos usar Content-Type: application/json porque causa preflight OPTIONS
      // que Apps Script no maneja correctamente.
      // La solución es enviar como text/plain (no requiere preflight) y parsear en el backend.
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        mode: 'cors',
        redirect: 'follow',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ action, ...data }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API POST Error:', error);
      throw error;
    }
  }

  // ==================== USERS ====================

  async getUsers() {
    return this.get('users');
  }

  async createUser(userData) {
    return this.post('createUser', {
      uid: userData.uid,
      user_name: userData.user_name,
      tokens: userData.tokens || 0,
      admin_email: userData.admin_email || 'WebApp'
    });
  }

  async updateUser(userData) {
    return this.post('updateUser', {
      uid: userData.uid,
      user_name: userData.user_name,
      status: userData.status,
      admin_email: userData.admin_email || 'WebApp'
    });
  }

  async updateTokens(uid, amount, adminEmail = 'WebApp') {
    return this.post('updateTokens', {
      uid: uid,
      amount: amount,
      admin_email: adminEmail
    });
  }

  // ==================== DEVICES ====================

  async getDevices() {
    return this.get('devices');
  }

  async createDevice(deviceData) {
    return this.post('createDevice', {
      esp32_id: deviceData.esp32_id,
      location: deviceData.location,
      time_limit_min: deviceData.time_limit_min || 15,
      wifi_ssid: deviceData.wifi_ssid,
      wifi_password: deviceData.wifi_password,
      master_key: deviceData.master_key,
      admin_email: deviceData.admin_email || 'WebApp'
    });
  }

  async editDevice(deviceData) {
    return this.post('editDevice', {
      esp32_id: deviceData.esp32_id,
      location: deviceData.location,
      active: deviceData.active,
      time_limit_min: deviceData.time_limit_min,
      wifi_ssid: deviceData.wifi_ssid,
      wifi_password: deviceData.wifi_password,
      master_key: deviceData.master_key,
      admin_email: deviceData.admin_email || 'WebApp'
    });
  }

  // ==================== LOGS ====================

  async getLogs(filters = {}) {
    return this.get('logs', filters);
  }

  // ==================== CONFIG ====================

  async getDeviceConfig(esp32Id) {
    return this.get('deviceConfig', { esp32_id: esp32Id });
  }
}

// Instancia global
const api = new API();
