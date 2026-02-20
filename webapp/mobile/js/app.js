/**
 * Admin Mobile App — Main Controller
 * Views: Login → Houses → Users → Token Editor | Logs
 */
const App = {
    // ── state ──
    user: null,
    houses: [],
    users: [],
    tokenTypes: [],
    logs: [],
    devices: [],
    selectedHouse: null,
    selectedUser: null,
    currentTab: 'users',   // 'users' | 'logs'
    usersSubView: 'houses', // 'houses' | 'list' | 'editor'

    // ── bootstrap ──
    init() {
        const email = localStorage.getItem(Config.STORAGE_KEYS.EMAIL);
        const role = localStorage.getItem(Config.STORAGE_KEYS.ROLE);
        const name = localStorage.getItem(Config.STORAGE_KEYS.NAME);
        if (email && role) {
            this.user = { email, role, name: name || email };
            this.showApp();
        } else {
            this.showLogin();
        }
    },

    // ═══════════════════════ LOGIN ═══════════════════════
    showLogin() {
        document.getElementById('app').innerHTML = `
            <div class="view login-view active">
                <div class="login-icon"><img src="icons/OneMachineCtrlBx_icon.png" alt="CtrlBx" class="login-logo"></div>
                <div class="login-title">CtrlBx Admin</div>
                <div class="login-subtitle">Acceso exclusivo para administradores</div>
                <form class="login-form" id="login-form">
                    <input type="email" id="login-email" placeholder="Email de administrador" required autocomplete="email">
                    <button type="submit" class="btn-primary" id="login-btn">Ingresar</button>
                    <div class="login-error" id="login-error"></div>
                </form>
            </div>
        `;
        document.getElementById('login-form').onsubmit = e => this.handleLogin(e);
    },

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim().toLowerCase();
        const errEl = document.getElementById('login-error');
        const btn = document.getElementById('login-btn');
        errEl.textContent = '';
        btn.disabled = true;
        btn.textContent = 'Verificando…';

        try {
            const res = await API.validateAdmin(email);
            if (!res.success || !res.admin) throw new Error('Email no autorizado');
            if (res.admin.status !== 'ACTIVO') throw new Error('Cuenta inactiva');
            const role = res.admin.role;
            if (role !== 'MASTER' && role !== 'ADMIN') throw new Error('Solo ADMIN/MASTER');

            localStorage.setItem(Config.STORAGE_KEYS.EMAIL, res.admin.email);
            localStorage.setItem(Config.STORAGE_KEYS.ROLE, role);
            localStorage.setItem(Config.STORAGE_KEYS.NAME, res.admin.name || email);
            this.user = { email: res.admin.email, role, name: res.admin.name || email };
            this.showApp();
        } catch (err) {
            errEl.textContent = err.message || 'Error de autenticación';
            btn.disabled = false;
            btn.textContent = 'Ingresar';
        }
    },

    logout() {
        localStorage.removeItem(Config.STORAGE_KEYS.EMAIL);
        localStorage.removeItem(Config.STORAGE_KEYS.ROLE);
        localStorage.removeItem(Config.STORAGE_KEYS.NAME);
        this.user = null;
        this.showLogin();
    },

    // ═══════════════════════ APP SHELL ═══════════════════════
    showApp() {
        document.getElementById('app').innerHTML = `
            <div id="view-users" class="view active">
                <header class="app-header" id="header-users">
                    <h1 id="header-title">Casas</h1>
                    <button class="logout-btn" onclick="App.logout()" title="Cerrar sesión">Salir</button>
                </header>
                <div class="view-content" id="content-users"></div>
            </div>
            <div id="view-logs" class="view">
                <header class="app-header">
                    <h1>Registro de Eventos</h1>
                    <button class="logout-btn" onclick="App.logout()" title="Cerrar sesión">Salir</button>
                </header>
                <div class="view-content" id="content-logs"></div>
            </div>
            <nav class="tab-bar">
                <button id="tab-users" class="active" onclick="App.switchTab('users')">
                    <span class="tab-icon">👥</span> Usuarios
                </button>
                <button id="tab-logs" onclick="App.switchTab('logs')">
                    <span class="tab-icon">📋</span> Registro
                </button>
            </nav>
        `;
        this.currentTab = 'users';
        this.usersSubView = 'houses';
        this.loadData();
    },

    switchTab(tab) {
        this.currentTab = tab;
        document.getElementById('view-users').classList.toggle('active', tab === 'users');
        document.getElementById('view-logs').classList.toggle('active', tab === 'logs');
        document.getElementById('tab-users').classList.toggle('active', tab === 'users');
        document.getElementById('tab-logs').classList.toggle('active', tab === 'logs');

        if (tab === 'users') {
            this.usersSubView = 'houses';
            this.renderHouses();
        }
        if (tab === 'logs' && this.logs.length === 0) this.loadLogs();
    },

    // ═══════════════════════ DATA LOADING ═══════════════════════
    allowedHouseIds: null, // null = all (MASTER), Set = filtered (ADMIN)

    async loadData() {
        const el = document.getElementById('content-users');
        el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const fetches = [API.getHouses(), API.getUsers(), API.getTokenTypes()];

            // ADMIN role: also fetch their allowed houses
            if (this.user.role !== 'MASTER') {
                fetches.push(API.getAdminHouses(this.user.email));
            }

            const [hRes, uRes, tRes, ahRes] = await Promise.all(fetches);

            // Build allowed house set for ADMIN
            if (this.user.role !== 'MASTER' && ahRes && ahRes.houses) {
                this.allowedHouseIds = new Set(ahRes.houses);
            } else {
                this.allowedHouseIds = null; // MASTER sees all
            }

            let houses = (hRes.houses || []).sort((a, b) => a.house_id.localeCompare(b.house_id));
            if (this.allowedHouseIds) {
                houses = houses.filter(h => this.allowedHouseIds.has(h.house_id));
            }
            this.houses = houses;
            this.users = uRes.users || [];
            this.tokenTypes = (tRes.token_types || []).filter(t => t.status === 'ACTIVO');
            this.renderHouses();
        } catch (err) {
            el.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Error al cargar datos</div></div>';
        }
    },

    async loadLogs() {
        const el = document.getElementById('content-logs');
        el.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
        try {
            const [logRes, devRes] = await Promise.all([
                API.getLogs({ limit: 200 }),
                this.devices.length ? Promise.resolve({ devices: this.devices }) : API.getDevices()
            ]);
            let logs = logRes.logs || [];
            this.devices = devRes.devices || [];

            // ADMIN: filter logs to only allowed houses
            if (this.allowedHouseIds) {
                logs = logs.filter(l => this.allowedHouseIds.has(l.house_id));
            }
            this.logs = logs;
            this.renderLogs();
        } catch (err) {
            el.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Error al cargar registros</div></div>';
        }
    },

    // ═══════════════════════ HOUSES VIEW ═══════════════════════
    renderHouses() {
        this.usersSubView = 'houses';
        this.updateHeader('Casas', false);
        const el = document.getElementById('content-users');

        if (!this.houses.length) {
            el.innerHTML = '<div class="empty-state"><div class="empty-icon">🏠</div><div class="empty-title">No hay casas</div></div>';
            return;
        }

        el.innerHTML = '<div class="house-grid">' + this.houses.map(h => {
            const addr = [h.house_street, h.house_number].filter(Boolean).join(' ');
            const residentCount = this.users.filter(u => u.user_residence === h.house_id).length;
            const imgHtml = h.house_img
                ? `<img class="house-card-img" src="${this.esc(h.house_img)}" alt="${this.esc(h.house_id)}" onerror="this.outerHTML='<div class=\\'house-card-img-placeholder\\'>🏠</div>'">`
                : '<div class="house-card-img-placeholder">🏠</div>';

            return `
                <div class="house-card" onclick="App.selectHouse('${this.esc(h.house_id)}')">
                    ${imgHtml}
                    <div class="house-card-body">
                        <div class="house-card-id">${this.esc(h.house_id)}</div>
                        ${addr ? `<div class="house-card-addr">${this.esc(addr)}</div>` : ''}
                        <div class="house-card-count">${residentCount} residente${residentCount !== 1 ? 's' : ''}</div>
                    </div>
                </div>
            `;
        }).join('') + '</div>';
    },

    selectHouse(houseId) {
        this.selectedHouse = houseId;
        this.renderUserList();
    },

    // ═══════════════════════ USER LIST VIEW ═══════════════════════
    renderUserList() {
        this.usersSubView = 'list';
        this.updateHeader(this.selectedHouse, true);
        const el = document.getElementById('content-users');

        const residents = this.users
            .filter(u => u.user_residence === this.selectedHouse)
            .sort((a, b) => (a.user_name || '').localeCompare(b.user_name || ''));

        if (!residents.length) {
            el.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-title">Sin residentes</div><div class="empty-msg">No hay usuarios asignados a esta casa</div></div>';
            return;
        }

        el.innerHTML = residents.map(u => {
            const statusCls = u.status === 'ACTIVO' ? 'status-activo' : 'status-inactivo';

            // Token pills for active token types only
            const tokenPills = this.tokenTypes.map(tt => {
                const balance = (u.tokens && u.tokens[tt.token_type] != null) ? u.tokens[tt.token_type] : 0;
                const color = tt.token_type_color || '#6366f1';
                return `
                    <div class="token-pill">
                        <span class="token-dot" style="background:${color}"></span>
                        <span class="token-pill-label">${this.esc(tt.token_type)}</span>
                        <span class="token-pill-balance">${balance}</span>
                    </div>
                `;
            }).join('');

            return `
                <div class="user-card" onclick="App.selectUser('${this.esc(u.uid)}')">
                    <div class="user-card-top">
                        <span class="user-card-name">${this.esc(u.user_name)}<span class="user-card-status ${statusCls}">${u.status}</span></span>
                        <span class="user-card-uid">${this.esc(u.uid)}</span>
                    </div>
                    ${tokenPills ? `<div class="user-card-tokens">${tokenPills}</div>` : ''}
                </div>
            `;
        }).join('');
    },

    selectUser(uid) {
        this.selectedUser = this.users.find(u => u.uid === uid);
        if (this.selectedUser) this.renderTokenEditor();
    },

    // ═══════════════════════ TOKEN EDITOR VIEW ═══════════════════════
    // Stores the original balances snapshot when entering the editor
    editorOriginal: {},   // { tokenType: originalBalance }
    editorCurrent: {},    // { tokenType: currentBalance  }

    renderTokenEditor() {
        this.usersSubView = 'editor';
        this.updateHeader('Ajustar Tokens', true);
        const el = document.getElementById('content-users');
        const u = this.selectedUser;

        // Snapshot original balances
        this.editorOriginal = {};
        this.editorCurrent = {};
        this.tokenTypes.forEach(tt => {
            const bal = (u.tokens && u.tokens[tt.token_type] != null) ? Number(u.tokens[tt.token_type]) : 0;
            this.editorOriginal[tt.token_type] = bal;
            this.editorCurrent[tt.token_type] = bal;
        });

        const cards = this.tokenTypes.map(tt => {
            const balance = this.editorOriginal[tt.token_type];
            const color = tt.token_type_color || '#6366f1';
            return `
                <div class="token-editor-card" id="te-${this.esc(tt.token_type)}">
                    <span class="token-editor-dot" style="background:${color}"></span>
                    <div class="token-editor-info">
                        <div class="token-editor-type">${this.esc(tt.token_type)}</div>
                        <div class="token-editor-desc">${this.esc(tt.description || tt.token_name || '')}</div>
                    </div>
                    <div class="token-editor-controls">
                        <button onclick="App.adjustToken('${this.esc(tt.token_type)}',-1)">−</button>
                        <div class="token-editor-balance" id="bal-${this.esc(tt.token_type)}">${balance}</div>
                        <button onclick="App.adjustToken('${this.esc(tt.token_type)}',1)">+</button>
                    </div>
                </div>
            `;
        }).join('');

        el.innerHTML = `
            <div class="editor-header">
                <div class="editor-avatar">👤</div>
                <div class="editor-name">${this.esc(u.user_name)}</div>
                <div class="editor-uid">${this.esc(u.uid)}</div>
            </div>
            ${cards || '<div class="empty-state"><div class="empty-icon">🎟️</div><div class="empty-title">Sin tipos de token activos</div></div>'}
            <div class="editor-actions">
                <button class="btn-cancel" onclick="App.cancelEditor()">Cancelar</button>
                <button class="btn-save" id="btn-save-tokens" onclick="App.saveTokens()">Actualizar</button>
            </div>
        `;
    },

    /** Locally adjust a token balance (no API call) */
    adjustToken(tokenType, delta) {
        const balEl = document.getElementById(`bal-${tokenType}`);
        if (!balEl) return;
        const current = this.editorCurrent[tokenType] ?? 0;
        const next = current + delta;
        if (next < 0) {
            this.toast('El balance no puede ser negativo', 'warning');
            return;
        }
        this.editorCurrent[tokenType] = next;
        balEl.textContent = next;

        // Highlight changed values
        const orig = this.editorOriginal[tokenType] ?? 0;
        balEl.classList.toggle('balance-changed', next !== orig);
    },

    /** Cancelar — revert all values and go back to user list */
    cancelEditor() {
        this.renderUserList();
    },

    /** Actualizar — send only changed balances to backend */
    async saveTokens() {
        const u = this.selectedUser;
        if (!u) return;

        // Compute deltas for changed token types
        const changes = [];
        for (const tt of this.tokenTypes) {
            const orig = this.editorOriginal[tt.token_type] ?? 0;
            const curr = this.editorCurrent[tt.token_type] ?? 0;
            const delta = curr - orig;
            if (delta !== 0) {
                changes.push({ token_type: tt.token_type, delta });
            }
        }

        if (!changes.length) {
            this.toast('Sin cambios', 'warning');
            return;
        }

        const btn = document.getElementById('btn-save-tokens');
        if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }

        try {
            // Send each changed balance sequentially
            for (const ch of changes) {
                const res = await API.updateTokenBalance(u.uid, ch.token_type, ch.delta);
                if (!res.success) throw new Error(res.error || `Error en ${ch.token_type}`);
                // Update local user state with confirmed backend value
                if (!u.tokens) u.tokens = {};
                u.tokens[ch.token_type] = res.new_balance;
            }
            this.toast('Balances actualizados ✓');
            this.renderUserList();
        } catch (err) {
            this.toast(err.message || 'Error al guardar', 'error');
            if (btn) { btn.disabled = false; btn.textContent = 'Actualizar'; }
        }
    },

    // ═══════════════════════ LOGS VIEW ═══════════════════════
    renderLogs() {
        const el = document.getElementById('content-logs');

        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

        const filtersHtml = `
            <div class="log-filters">
                <label>Desde</label>
                <input type="date" id="mob-log-from" value="${weekAgo}">
                <label>Hasta</label>
                <input type="date" id="mob-log-to" value="${today}">
                <button class="btn-sm" onclick="App.filterLogs()">Buscar</button>
            </div>
        `;

        el.innerHTML = filtersHtml + '<div id="log-list">' + this.buildLogCards(this.logs) + '</div>';
    },

    filterLogs() {
        const from = document.getElementById('mob-log-from')?.value;
        const to = document.getElementById('mob-log-to')?.value;
        let filtered = [...this.logs];

        if (from) {
            const fd = new Date(from); fd.setHours(0, 0, 0, 0);
            filtered = filtered.filter(l => new Date(l.timestamp) >= fd);
        }
        if (to) {
            const td = new Date(to); td.setHours(23, 59, 59, 999);
            filtered = filtered.filter(l => new Date(l.timestamp) <= td);
        }
        document.getElementById('log-list').innerHTML = this.buildLogCards(filtered);
    },

    buildLogCards(logs) {
        if (!logs.length) {
            return '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">Sin registros</div></div>';
        }

        return logs.map(l => {
            const badge = this.getEventBadge(l.event_type);
            const eventName = this.getEventName(l.event_type);

            const isMk = l.is_masterkey_event || l.event_type === 'MASTERKEY_ACCESS' || l.event_type === 'MASTERKEY_ACCESS_OFFLINE';
            const nameDisplay = isMk
                ? `${this.esc(l.masterkey_holder || l.uid)} 🔑`
                : this.esc(l.user_name || '-');

            return `
                <div class="log-card">
                    <div class="log-card-top">
                        <span class="log-card-time">${this.fmtDate(l.timestamp)}</span>
                        <span class="log-card-event ${badge}">${eventName}</span>
                    </div>
                    <div class="log-card-body">
                        <span><span class="log-card-label">Nombre</span> ${nameDisplay}</span>
                        <span><span class="log-card-label">UID</span> <code>${this.esc(l.uid || '-')}</code></span>
                        <span><span class="log-card-label">Casa</span> ${this.esc(l.house_id || '-')}</span>
                        <span><span class="log-card-label">Dispos.</span> <code>${this.esc(l.esp32_id || '-')}</code></span>
                        <span><span class="log-card-label">Token</span> ${this.esc(l.token_type || '-')}</span>
                        ${l.token_balance_after != null ? `<span><span class="log-card-label">Saldo</span> ${l.token_balance_after}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    // ═══════════════════════ HEADER / NAVIGATION ═══════════════════════
    updateHeader(title, showBack) {
        const headerEl = document.getElementById('header-users');
        const titleEl = document.getElementById('header-title');
        if (titleEl) titleEl.textContent = title;

        // Manage back button
        const existingBack = headerEl.querySelector('.back-btn');
        if (showBack && !existingBack) {
            const btn = document.createElement('button');
            btn.className = 'back-btn';
            btn.textContent = '←';
            btn.onclick = () => this.goBack();
            headerEl.insertBefore(btn, headerEl.firstChild);
        } else if (!showBack && existingBack) {
            existingBack.remove();
        }
    },

    goBack() {
        if (this.usersSubView === 'editor') {
            this.renderUserList();
        } else if (this.usersSubView === 'list') {
            this.renderHouses();
        }
    },

    // ═══════════════════════ HELPERS ═══════════════════════
    esc(str) {
        if (!str) return '';
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    },

    fmtDate(date) {
        if (!date) return '-';
        const d = new Date(date);
        return isNaN(d) ? '-' : d.toLocaleString('es-CL', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    },

    getEventBadge(type) {
        switch (type) {
            case 'ACCESS_GRANTED': case 'MASTERKEY_ACCESS':
                return 'log-badge-success';
            case 'MASTERKEY_ACCESS_OFFLINE':
                return 'log-badge-warning';
            case 'INACTIVE_USER': case 'INVALID_TOKEN_TYPE':
            case 'NO_TOKENS': case 'NOT_IN_HOUSE_USER':
            case 'OUTSIDE_TIME_WINDOW': case 'UNREGISTERED_USER':
                return 'log-badge-danger';
            default: return 'log-badge-info';
        }
    },

    getEventName(type) {
        const m = {
            'ACCESS_GRANTED': 'Acceso',
            'INACTIVE_USER': 'Inactivo',
            'INVALID_TOKEN_TYPE': 'Token Inválido',
            'MASTERKEY_ACCESS': 'MasterKey',
            'MASTERKEY_ACCESS_OFFLINE': 'MK Offline',
            'NO_TOKENS': 'Sin Tokens',
            'NOT_IN_HOUSE_USER': 'No Autorizado',
            'OUTSIDE_TIME_WINDOW': 'Fuera Horario',
            'UNREGISTERED_USER': 'No Registrado'
        };
        return m[type] || type;
    },

    toast(msg, type = 'success') {
        let c = document.getElementById('toast-container');
        if (!c) {
            c = document.createElement('div');
            c.id = 'toast-container';
            c.className = 'toast-container';
            document.body.appendChild(c);
        }
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.textContent = msg;
        c.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, Config.TOAST_DURATION);
    }
};

// ── Boot ──
document.addEventListener('DOMContentLoaded', () => App.init());
