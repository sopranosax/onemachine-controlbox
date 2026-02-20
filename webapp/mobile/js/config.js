/**
 * Configuration — Admin Mobile App
 */
const Config = {
    API_BASE_URL: 'https://script.google.com/macros/s/AKfycbzV_3SizcAAjgzoLyKR8GUmHcLxAyVKoVKn1AfsJdTOdS4Sn7ZDCg-Z1WEc1lQnhPR3/exec',

    ROLES: { MASTER: 'MASTER', ADMIN: 'ADMIN' },

    STORAGE_KEYS: {
        EMAIL: 'mob_admin_email',
        ROLE: 'mob_admin_role',
        NAME: 'mob_admin_name'
    },

    TOAST_DURATION: 3000
};

Object.freeze(Config);
