/**
 * Configuration file for IoT Control WebApp
 */

const Config = {
    // Google Apps Script Web App URL
    // Replace with your deployed Apps Script Web App URL
    API_BASE_URL: 'https://script.google.com/macros/s/AKfycbz_GMUOnJHzE-7tzUr_-21sdjrfg5cqsxh0rwY1rcUwcalpSrdkcIv8Z8Rb4DaFH-DWBw/exec',

    // Roles
    ROLES: {
        MASTER: 'MASTER',
        ADMIN: 'ADMIN',
        VIEWER: 'VIEWER'
    },

    // Status values
    STATUS: {
        ACTIVE: 'ACTIVO',
        INACTIVE: 'INACTIVO'
    },

    // Event types
    EVENT_TYPES: {
        ACCESS_GRANTED: 'ACCESS_GRANTED',
        ACCESS_DENIED: 'ACCESS_DENIED',
        IN_USE: 'IN_USE',
        ERROR: 'ERROR',
        WIFI_DOWN: 'WIFI_DOWN',
        WIFI_RESTORED: 'WIFI_RESTORED',
        DEVICE_RESTARTED: 'DEVICE_RESTARTED'
    },

    // UI Settings
    UI: {
        OFFLINE_THRESHOLD_MIN: 5,
        RECENT_EVENTS_LIMIT: 10,
        ITEMS_PER_PAGE: 20,
        TOAST_DURATION: 4000
    },

    // Local Storage Keys
    STORAGE_KEYS: {
        USER_EMAIL: 'iot_user_email',
        USER_ROLE: 'iot_user_role',
        USER_NAME: 'iot_user_name'
    }
};

Object.freeze(Config);
Object.freeze(Config.ROLES);
Object.freeze(Config.STATUS);
Object.freeze(Config.EVENT_TYPES);
Object.freeze(Config.UI);
Object.freeze(Config.STORAGE_KEYS);
