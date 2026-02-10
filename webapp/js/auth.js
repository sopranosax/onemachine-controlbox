/**
 * Authentication module for IoT Control WebApp
 * Handles simple email-based login against ADMINS table
 */

const Auth = {
    currentUser: null,

    /**
     * Initialize auth - check if user is already logged in
     */
    init() {
        const email = localStorage.getItem(Config.STORAGE_KEYS.USER_EMAIL);
        const role = localStorage.getItem(Config.STORAGE_KEYS.USER_ROLE);
        const name = localStorage.getItem(Config.STORAGE_KEYS.USER_NAME);

        if (email && role) {
            this.currentUser = { email, role, name: name || email };
            return true;
        }
        return false;
    },

    /**
     * Login with email
     * @param {string} email - Admin email
     * @returns {Promise<Object>} User data
     */
    async login(email) {
        try {
            // Call backend to validate admin
            const response = await API.validateAdmin(email);

            if (response.success && response.admin) {
                const admin = response.admin;

                // Check if admin is active
                if (admin.status !== Config.STATUS.ACTIVE) {
                    throw new Error('Esta cuenta está inactiva. Contacte al administrador.');
                }

                // Store in localStorage
                localStorage.setItem(Config.STORAGE_KEYS.USER_EMAIL, admin.email);
                localStorage.setItem(Config.STORAGE_KEYS.USER_ROLE, admin.role);
                localStorage.setItem(Config.STORAGE_KEYS.USER_NAME, admin.name || admin.email);

                // Set current user
                this.currentUser = {
                    email: admin.email,
                    role: admin.role,
                    name: admin.name || admin.email
                };

                return this.currentUser;
            } else {
                throw new Error('Email no autorizado. Verifique sus credenciales.');
            }
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    /**
     * Logout - clear session
     */
    logout() {
        localStorage.removeItem(Config.STORAGE_KEYS.USER_EMAIL);
        localStorage.removeItem(Config.STORAGE_KEYS.USER_ROLE);
        localStorage.removeItem(Config.STORAGE_KEYS.USER_NAME);
        this.currentUser = null;
    },

    /**
     * Check if user is logged in
     * @returns {boolean}
     */
    isLoggedIn() {
        return this.currentUser !== null;
    },

    /**
     * Get current user
     * @returns {Object|null}
     */
    getUser() {
        return this.currentUser;
    },

    /**
     * Get current user role
     * @returns {string|null}
     */
    getRole() {
        return this.currentUser ? this.currentUser.role : null;
    },

    /**
     * Check if current user has a specific role
     * @param {string} role - Role to check
     * @returns {boolean}
     */
    hasRole(role) {
        return this.currentUser && this.currentUser.role === role;
    },

    /**
     * Get current user email
     * @returns {string|null}
     */
    getEmail() {
        return this.currentUser ? this.currentUser.email : null;
    },

    /**
     * Check if user is MASTER
     * @returns {boolean}
     */
    isMaster() {
        return this.hasRole(Config.ROLES.MASTER);
    },

    /**
     * Check if user is ADMIN or higher
     * @returns {boolean}
     */
    isAdmin() {
        return this.hasRole(Config.ROLES.MASTER) || this.hasRole(Config.ROLES.ADMIN);
    },

    /**
     * Check if user can perform an action based on role
     * @param {string} action - Action to check
     * @returns {boolean}
     */
    can(action) {
        const role = this.getRole();
        if (!role) return false;

        // Permission matrix
        const permissions = {
            // User actions
            'users.view': [Config.ROLES.MASTER, Config.ROLES.ADMIN, Config.ROLES.VIEWER],
            'users.create': [Config.ROLES.MASTER, Config.ROLES.ADMIN],
            'users.edit': [Config.ROLES.MASTER, Config.ROLES.ADMIN],
            'users.toggleStatus': [Config.ROLES.MASTER, Config.ROLES.ADMIN],
            'users.adjustTokens': [Config.ROLES.MASTER, Config.ROLES.ADMIN],

            // Device actions
            'devices.view': [Config.ROLES.MASTER, Config.ROLES.ADMIN, Config.ROLES.VIEWER],
            'devices.create': [Config.ROLES.MASTER],
            'devices.edit': [Config.ROLES.MASTER],
            'devices.toggleStatus': [Config.ROLES.MASTER],
            'devices.viewHistory': [Config.ROLES.MASTER],

            // Log actions
            'logs.view': [Config.ROLES.MASTER, Config.ROLES.ADMIN, Config.ROLES.VIEWER],
            'logs.export': [Config.ROLES.MASTER, Config.ROLES.ADMIN],

            // Role actions
            'roles.view': [Config.ROLES.MASTER],
            'roles.create': [Config.ROLES.MASTER],
            'roles.edit': [Config.ROLES.MASTER],
            'roles.viewAdminLog': [Config.ROLES.MASTER],

            // Token Types actions (MASTER only)
            'tokens.view': [Config.ROLES.MASTER],
            'tokens.create': [Config.ROLES.MASTER],
            'tokens.edit': [Config.ROLES.MASTER],
            'tokens.delete': [Config.ROLES.MASTER],

            // Houses actions
            'houses.view': [Config.ROLES.MASTER, Config.ROLES.ADMIN],
            'houses.create': [Config.ROLES.MASTER],
            'houses.edit': [Config.ROLES.MASTER],
            'houses.delete': [Config.ROLES.MASTER],

            // Masterkeys actions (MASTER only)
            'masterkeys.view': [Config.ROLES.MASTER],
            'masterkeys.create': [Config.ROLES.MASTER],
            'masterkeys.edit': [Config.ROLES.MASTER],
            'masterkeys.delete': [Config.ROLES.MASTER],

            // Dashboard
            'dashboard.view': [Config.ROLES.MASTER, Config.ROLES.ADMIN, Config.ROLES.VIEWER]
        };

        return permissions[action] ? permissions[action].includes(role) : false;
    }
};

// Export for use
window.Auth = Auth;
