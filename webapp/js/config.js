/**
 * Configuration file for IoT Control WebApp
 */

const Config = {
    // Google Apps Script Web App URL
    // Replace with your deployed Apps Script Web App URL
    API_BASE_URL: 'https://script.google.com/macros/s/AKfycbzV_3SizcAAjgzoLyKR8GUmHcLxAyVKoVKn1AfsJdTOdS4Sn7ZDCg-Z1WEc1lQnhPR3/exec',

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

    // User interaction event types (A-Z)
    EVENT_TYPES: {
        ACCESS_GRANTED: 'ACCESS_GRANTED',
        INACTIVE_USER: 'INACTIVE_USER',
        INVALID_TOKEN_TYPE: 'INVALID_TOKEN_TYPE',
        MASTERKEY_ACCESS: 'MASTERKEY_ACCESS',
        MASTERKEY_ACCESS_OFFLINE: 'MASTERKEY_ACCESS_OFFLINE',
        NO_TOKENS: 'NO_TOKENS',
        NOT_IN_HOUSE_USER: 'NOT_IN_HOUSE_USER',
        OUTSIDE_TIME_WINDOW: 'OUTSIDE_TIME_WINDOW',
        UNREGISTERED_USER: 'UNREGISTERED_USER'
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
