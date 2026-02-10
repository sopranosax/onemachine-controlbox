/**
 * Users View for IoT Control WebApp
 */

const Users = {
    users: [],
    tokenTypes: [],
    searchTerm: '',

    /**
     * Load users page
     */
    async load() {
        this.bindEvents();
        this.renderLoadingState();

        try {
            // Load token types first
            await this.loadTokenTypes();

            // Load users
            await this.loadUsers();
        } catch (error) {
            console.error('Error loading users:', error);
            Utils.showToast('Error al cargar usuarios', 'error');
        }
    },

    /**
     * Bind event handlers
     */
    bindEvents() {
        // Search input
        const searchInput = document.getElementById('users-search');
        if (searchInput) {
            searchInput.removeEventListener('input', this.handleSearchBound);
            this.handleSearchBound = Utils.debounce((e) => this.handleSearch(e.target.value), 300);
            searchInput.addEventListener('input', this.handleSearchBound);
        }

        // Add user button
        const addBtn = document.getElementById('btn-add-user');
        if (addBtn) {
            addBtn.onclick = () => this.showAddUserModal();
            // Hide if no permission
            addBtn.style.display = Auth.can('users.create') ? '' : 'none';
        }
    },

    /**
     * Load token types
     */
    async loadTokenTypes() {
        try {
            const response = await API.getTokenTypes();
            this.tokenTypes = response.token_types || [];
        } catch (error) {
            // Mock data
            this.tokenTypes = [
                { token_type: 'WSH', token_name: 'Lavadora' },
                { token_type: 'DRY', token_name: 'Secadora' }
            ];
        }
    },

    /**
     * Load users
     */
    async loadUsers() {
        try {
            const response = await API.getUsers();
            this.users = response.users || [];
            this.renderUsers(this.users);
        } catch (error) {
            // Mock data
            this.users = [
                { uid: 'ABC12345', user_name: 'Juan Pérez', status: 'ACTIVO', created_at: '2026-01-15', tokens: { WSH: 5, DRY: 3 } },
                { uid: 'DEF67890', user_name: 'María García', status: 'ACTIVO', created_at: '2026-01-20', tokens: { WSH: 0, DRY: 10 } },
                { uid: 'GHI11111', user_name: 'Carlos López', status: 'INACTIVO', created_at: '2026-02-01', tokens: { WSH: 2, DRY: 0 } }
            ];
            this.renderUsers(this.users);
        }
    },

    /**
     * Render loading state
     */
    renderLoadingState() {
        document.getElementById('users-tbody').innerHTML = `
            <tr><td colspan="5" class="loading-placeholder">Cargando usuarios...</td></tr>
        `;
    },

    /**
     * Handle search
     */
    handleSearch(term) {
        this.searchTerm = term.toLowerCase();
        const filtered = this.users.filter(user =>
            user.user_name.toLowerCase().includes(this.searchTerm) ||
            user.uid.toLowerCase().includes(this.searchTerm)
        );
        this.renderUsers(filtered);
    },

    /**
     * Render users table
     */
    renderUsers(users) {
        const tbody = document.getElementById('users-tbody');

        if (!users || users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5">
                        <div class="empty-state">
                            <div class="empty-state-icon">👥</div>
                            <p class="empty-state-title">No se encontraron usuarios</p>
                            <p class="empty-state-message">${this.searchTerm ? 'Intente con otra búsqueda' : 'Agregue un nuevo usuario para comenzar'}</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        const canEdit = Auth.can('users.edit');
        const canToggle = Auth.can('users.toggleStatus');
        const canAdjust = Auth.can('users.adjustTokens');

        // Get list of existing token types
        const existingTokenTypes = this.tokenTypes.map(t => t.token_type);

        tbody.innerHTML = users.map(user => {
            const statusClass = user.status === 'ACTIVO' ? 'badge-success' : 'badge-danger';
            const tokens = user.tokens || {};
            // Filter to only show existing token types
            const tokenDisplay = Object.entries(tokens)
                .filter(([type, balance]) => existingTokenTypes.includes(type))
                .map(([type, balance]) => {
                    const tokenType = this.tokenTypes.find(t => t.token_type === type);
                    const isInactive = tokenType && tokenType.status === 'INACTIVO';
                    if (isInactive) {
                        return `<span class="token-inactive">${type}: ${balance} ⚠️</span>`;
                    }
                    return `${type}: ${balance}`;
                })
                .join(', ') || '-';

            return `
                <tr>
                    <td><code>${Utils.escapeHtml(user.uid)}</code></td>
                    <td>${Utils.escapeHtml(user.user_name)}</td>
                    <td><span class="badge ${statusClass}">${user.status}</span></td>
                    <td>${tokenDisplay}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view" onclick="Users.viewUser('${user.uid}')" title="Ver detalle">👁️</button>
                            ${canEdit ? `<button class="action-btn edit" onclick="Users.editUser('${user.uid}')" title="Editar">✏️</button>` : ''}
                            ${canAdjust ? `<button class="action-btn" onclick="Users.adjustTokens('${user.uid}')" title="Ajustar tokens">🎟️</button>` : ''}
                            ${canToggle ? `<button class="action-btn ${user.status === 'ACTIVO' ? 'delete' : 'view'}" onclick="Users.toggleStatus('${user.uid}')" title="${user.status === 'ACTIVO' ? 'Desactivar' : 'Activar'}">${user.status === 'ACTIVO' ? '🚫' : '✓'}</button>` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    /**
     * View user detail
     */
    viewUser(uid) {
        const user = this.users.find(u => u.uid === uid);
        if (!user) return;

        const tokens = user.tokens || {};
        // Get list of existing token types
        const existingTokenTypes = this.tokenTypes.map(t => t.token_type);

        const tokenCards = Object.entries(tokens)
            .filter(([type, balance]) => existingTokenTypes.includes(type))
            .map(([type, balance]) => {
                const tokenType = this.tokenTypes.find(t => t.token_type === type);
                const isInactive = tokenType && tokenType.status === 'INACTIVO';
                const inactiveClass = isInactive ? 'token-inactive' : '';
                const inactiveIcon = isInactive ? '<span class="token-inactive-icon" title="Token type inactivo">⚠️</span>' : '';
                return `
                <div class="token-card ${inactiveClass}">
                    <div class="token-type-label">${type} ${inactiveIcon}</div>
                    <div class="token-balance">${balance}</div>
                </div>
            `;
            }).join('') || '<p class="text-muted">Sin tokens asignados</p>';

        Utils.showModal({
            title: 'Detalle de Usuario',
            content: `
                <div class="user-detail">
                    <div class="user-header-card">
                        <div class="user-avatar">👤</div>
                        <div class="user-header-info">
                            <h3>${Utils.escapeHtml(user.user_name)}</h3>
                            <div class="user-uid">${Utils.escapeHtml(user.uid)}</div>
                        </div>
                    </div>
                    
                    <div class="section-card">
                        <h4>Estado</h4>
                        <span class="badge ${user.status === 'ACTIVO' ? 'badge-success' : 'badge-danger'}">${user.status}</span>
                    </div>
                    
                    <div class="section-card">
                        <h4>Tokens Disponibles</h4>
                        <div class="tokens-grid">${tokenCards}</div>
                    </div>
                    
                    <div class="section-card">
                        <h4>Información</h4>
                        <p><strong>Creado:</strong> ${Utils.formatDate(user.created_at, false)}</p>
                        <p><strong>Actualizado:</strong> ${Utils.formatDate(user.updated_at, true)}</p>
                    </div>
                </div>
            `
        });
    },

    /**
     * Show add user modal
     */
    showAddUserModal() {
        Utils.showModal({
            title: 'Nuevo Usuario',
            content: `
                <form id="add-user-form">
                    <div class="form-group">
                        <label for="new-user-uid">UID de Tarjeta RFID *</label>
                        <input type="text" id="new-user-uid" required placeholder="Ej: ABC12345">
                    </div>
                    <div class="form-group">
                        <label for="new-user-name">Nombre del Usuario *</label>
                        <input type="text" id="new-user-name" required placeholder="Nombre completo">
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Crear Usuario</button>
                    </div>
                </form>
            `
        });

        document.getElementById('add-user-form').onsubmit = async (e) => {
            e.preventDefault();
            const uid = document.getElementById('new-user-uid').value.trim();
            const name = document.getElementById('new-user-name').value.trim();

            if (!uid || !name) {
                Utils.showToast('Complete todos los campos', 'error');
                return;
            }

            try {
                await API.createUser({ uid, user_name: name, status: 'ACTIVO' });
                Utils.closeModal();
                Utils.showToast('Usuario creado correctamente', 'success');
                this.load();
            } catch (error) {
                Utils.showToast('Error al crear usuario', 'error');
            }
        };
    },

    /**
     * Edit user
     */
    editUser(uid) {
        const user = this.users.find(u => u.uid === uid);
        if (!user) return;

        Utils.showModal({
            title: 'Editar Usuario',
            content: `
                <form id="edit-user-form">
                    <div class="form-group">
                        <label>UID</label>
                        <input type="text" value="${Utils.escapeHtml(user.uid)}" disabled>
                    </div>
                    <div class="form-group">
                        <label for="edit-user-name">Nombre del Usuario *</label>
                        <input type="text" id="edit-user-name" value="${Utils.escapeHtml(user.user_name)}" required>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Guardar Cambios</button>
                    </div>
                </form>
            `
        });

        document.getElementById('edit-user-form').onsubmit = async (e) => {
            e.preventDefault();
            const name = document.getElementById('edit-user-name').value.trim();

            if (!name) {
                Utils.showToast('El nombre es requerido', 'error');
                return;
            }

            try {
                await API.updateUser(uid, { user_name: name });
                Utils.closeModal();
                Utils.showToast('Usuario actualizado', 'success');
                this.load();
            } catch (error) {
                Utils.showToast('Error al actualizar usuario', 'error');
            }
        };
    },

    /**
     * Adjust tokens modal
     */
    adjustTokens(uid) {
        const user = this.users.find(u => u.uid === uid);
        if (!user) return;

        const tokens = user.tokens || {};
        const adjustments = {};

        const tokenInputs = this.tokenTypes.map(tt => {
            const currentBalance = tokens[tt.token_type] || 0;
            adjustments[tt.token_type] = 0;

            return `
                <div class="token-card">
                    <div class="token-type-label">${tt.token_type} - ${tt.token_name}</div>
                    <div class="token-balance" id="balance-${tt.token_type}">${currentBalance}</div>
                    <div class="token-controls">
                        <button type="button" class="token-btn minus" onclick="Users.adjustTokenValue('${tt.token_type}', -1, ${currentBalance})">−</button>
                        <input type="number" class="token-input" id="adjust-${tt.token_type}" value="0" onchange="Users.updatePreview('${tt.token_type}', ${currentBalance})">
                        <button type="button" class="token-btn plus" onclick="Users.adjustTokenValue('${tt.token_type}', 1, ${currentBalance})">+</button>
                    </div>
                </div>
            `;
        }).join('');

        Utils.showModal({
            title: `Ajustar Tokens - ${user.user_name}`,
            content: `
                <form id="adjust-tokens-form">
                    <div class="tokens-grid">${tokenInputs}</div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Guardar Cambios</button>
                    </div>
                </form>
            `
        });

        // Store for later use
        this.currentAdjustUser = user;

        document.getElementById('adjust-tokens-form').onsubmit = async (e) => {
            e.preventDefault();

            try {
                for (const tt of this.tokenTypes) {
                    const delta = parseInt(document.getElementById(`adjust-${tt.token_type}`).value) || 0;
                    if (delta !== 0) {
                        await API.updateTokenBalance(uid, tt.token_type, delta);
                    }
                }
                Utils.closeModal();
                Utils.showToast('Tokens actualizados correctamente', 'success');
                this.load();
            } catch (error) {
                Utils.showToast('Error al actualizar tokens', 'error');
            }
        };
    },

    /**
     * Adjust token value in modal
     */
    adjustTokenValue(tokenType, delta, originalBalance) {
        const input = document.getElementById(`adjust-${tokenType}`);
        const currentDelta = parseInt(input.value) || 0;
        const newDelta = currentDelta + delta;

        // Don't allow negative final balance
        if (originalBalance + newDelta < 0) {
            Utils.showToast('El balance no puede ser negativo', 'warning');
            return;
        }

        input.value = newDelta;
        this.updatePreview(tokenType, originalBalance);
    },

    /**
     * Update balance preview
     */
    updatePreview(tokenType, originalBalance) {
        const input = document.getElementById(`adjust-${tokenType}`);
        const delta = parseInt(input.value) || 0;
        const newBalance = originalBalance + delta;

        if (newBalance < 0) {
            input.value = -originalBalance;
            document.getElementById(`balance-${tokenType}`).textContent = 0;
        } else {
            document.getElementById(`balance-${tokenType}`).textContent = newBalance;
        }
    },

    /**
     * Toggle user status
     */
    async toggleStatus(uid) {
        const user = this.users.find(u => u.uid === uid);
        if (!user) return;

        const newStatus = user.status === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
        const action = user.status === 'ACTIVO' ? 'desactivar' : 'activar';

        const confirmed = await Utils.showConfirm({
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} Usuario`,
            message: `¿Está seguro que desea ${action} a ${user.user_name}?`,
            confirmText: action.charAt(0).toUpperCase() + action.slice(1),
            type: user.status === 'ACTIVO' ? 'danger' : 'info'
        });

        if (confirmed) {
            try {
                await API.updateUser(uid, { status: newStatus });
                Utils.showToast(`Usuario ${newStatus === 'ACTIVO' ? 'activado' : 'desactivado'}`, 'success');
                this.load();
            } catch (error) {
                Utils.showToast('Error al actualizar estado', 'error');
            }
        }
    }
};

// Export for use
window.Users = Users;
