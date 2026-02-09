/**
 * Main Application Controller for IoT Control WebApp
 */

const App = {
    currentPage: 'dashboard',

    /**
     * Initialize the application
     */
    init() {
        // Check if user is logged in
        if (Auth.init()) {
            this.showApp();
        } else {
            this.showLogin();
        }

        this.bindEvents();
    },

    /**
     * Bind global event handlers
     */
    bindEvents() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Menu toggle (mobile)
        const menuToggle = document.getElementById('menu-toggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => this.toggleSidebar());
        }

        // Sidebar navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                if (page) this.navigateTo(page);
            });
        });

        // Bottom navigation (mobile)
        document.querySelectorAll('.bottom-nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                if (page) this.navigateTo(page);
            });
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('sidebar');
            const menuToggle = document.getElementById('menu-toggle');
            if (sidebar && !sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        });
    },

    /**
     * Handle login form submission
     */
    async handleLogin(e) {
        e.preventDefault();

        const emailInput = document.getElementById('email');
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const errorEl = document.getElementById('login-error');
        const loader = submitBtn.querySelector('.btn-loader');
        const btnText = submitBtn.querySelector('span:not(.btn-loader)');

        const email = emailInput.value.trim();

        // Validate email
        if (!Utils.isValidEmail(email)) {
            errorEl.textContent = 'Por favor ingrese un email válido';
            errorEl.classList.remove('hidden');
            return;
        }

        // Show loading state
        submitBtn.disabled = true;
        loader.classList.remove('hidden');
        btnText.textContent = 'Ingresando...';
        errorEl.classList.add('hidden');

        try {
            await Auth.login(email);
            this.showApp();
        } catch (error) {
            errorEl.textContent = error.message || 'Error al iniciar sesión';
            errorEl.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
            loader.classList.add('hidden');
            btnText.textContent = 'Ingresar';
        }
    },

    /**
     * Handle logout
     */
    async handleLogout() {
        const confirmed = await Utils.showConfirm({
            title: 'Cerrar Sesión',
            message: '¿Está seguro que desea cerrar sesión?',
            confirmText: 'Cerrar Sesión',
            type: 'info'
        });

        if (confirmed) {
            Auth.logout();
            this.showLogin();
        }
    },

    /**
     * Show login page
     */
    showLogin() {
        document.getElementById('login-page').classList.add('active');
        document.getElementById('login-page').classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');

        // Clear form
        document.getElementById('email').value = '';
        document.getElementById('login-error').classList.add('hidden');
    },

    /**
     * Show main app
     */
    showApp() {
        document.getElementById('login-page').classList.remove('active');
        document.getElementById('login-page').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');

        // Update user info in header
        const user = Auth.getUser();
        if (user) {
            document.getElementById('user-name').textContent = user.name;
            document.getElementById('user-role').textContent = user.role;
        }

        // Hide roles nav for non-MASTER users
        this.updateNavVisibility();

        // Set current date
        this.updateCurrentDate();

        // Load initial page
        this.navigateTo('dashboard');
    },

    /**
     * Update navigation visibility based on role
     */
    updateNavVisibility() {
        const rolesNav = document.getElementById('nav-roles');
        const rolesBottomNav = document.getElementById('bottom-nav-roles');
        const tokensNav = document.getElementById('nav-tokens');
        const tokensBottomNav = document.getElementById('bottom-nav-tokens');

        if (!Auth.can('roles.view')) {
            if (rolesNav) rolesNav.classList.add('hidden');
            if (rolesBottomNav) rolesBottomNav.classList.add('hidden');
        } else {
            if (rolesNav) rolesNav.classList.remove('hidden');
            if (rolesBottomNav) rolesBottomNav.classList.remove('hidden');
        }

        if (!Auth.can('tokens.view')) {
            if (tokensNav) tokensNav.classList.add('hidden');
            if (tokensBottomNav) tokensBottomNav.classList.add('hidden');
        } else {
            if (tokensNav) tokensNav.classList.remove('hidden');
            if (tokensBottomNav) tokensBottomNav.classList.remove('hidden');
        }
    },

    /**
     * Update current date display
     */
    updateCurrentDate() {
        const dateEl = document.getElementById('current-date');
        if (dateEl) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateEl.textContent = new Date().toLocaleDateString('es-CL', options);
        }
    },

    /**
     * Toggle sidebar (mobile)
     */
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('open');
        }
    },

    /**
     * Navigate to a page
     * @param {string} pageName - Page name
     */
    navigateTo(pageName) {
        // Check permission
        const permissionMap = {
            'dashboard': 'dashboard.view',
            'users': 'users.view',
            'devices': 'devices.view',
            'logs': 'logs.view',
            'tokens': 'tokens.view',
            'roles': 'roles.view'
        };

        const requiredPermission = permissionMap[pageName];
        if (requiredPermission && !Auth.can(requiredPermission)) {
            Utils.showToast('No tiene permisos para acceder a esta sección', 'error');
            return;
        }

        this.currentPage = pageName;

        // Update active state in navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === pageName);
        });
        document.querySelectorAll('.bottom-nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === pageName);
        });

        // Show corresponding page section
        document.querySelectorAll('.page-section').forEach(section => {
            section.classList.add('hidden');
        });
        const targetSection = document.getElementById(`page-${pageName}`);
        if (targetSection) {
            targetSection.classList.remove('hidden');
        }

        // Close sidebar on mobile
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('open');

        // Load page data
        this.loadPageData(pageName);
    },

    /**
     * Load data for a specific page
     * @param {string} pageName - Page name
     */
    loadPageData(pageName) {
        switch (pageName) {
            case 'dashboard':
                Dashboard.load();
                break;
            case 'users':
                Users.load();
                break;
            case 'devices':
                Devices.load();
                break;
            case 'logs':
                Logs.load();
                break;
            case 'tokens':
                TokenTypes.load();
                break;
            case 'roles':
                Roles.load();
                break;
        }
    },

    /**
     * Refresh current page data
     */
    refresh() {
        this.loadPageData(this.currentPage);
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Export for use
window.App = App;
