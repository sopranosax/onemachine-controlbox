/**
 * Users View for IoT Control WebApp
 * Now supports USER_TYPE (GLOBAL / HOUSE) and house assignments
 */

const Users = {
    users: [],
    tokenTypes: [],
    houses: [],           // All available houses
    devices: [],          // All devices (for token type filtering)
    userHouses: [],       // All user-house assignments [{uid, house_id}]
    searchTerm: '',
    filterStatus: '',     // '' | 'ACTIVO' | 'INACTIVO'
    sortName: '',         // '' | 'asc' | 'desc'

    async load() {
        if (!Auth.can('users.view')) {
            Utils.showToast('No tiene permisos para ver esta sección', 'error');
            return;
        }

        this.renderLoadingState();
        await this.loadTokenTypes();
        await this.loadUsers();
        this.bindEvents();
    },

    bindEvents() {
        const searchInput = document.getElementById('users-search');
        if (searchInput) {
            searchInput.oninput = (e) => this.handleSearch(e.target.value);
        }

        const addBtn = document.getElementById('btn-add-user');
        if (addBtn) {
            addBtn.onclick = () => this.showAddUserModal();
        }

        const statusFilter = document.getElementById('users-filter-status');
        if (statusFilter) {
            statusFilter.value = this.filterStatus;
            statusFilter.onchange = (e) => {
                this.filterStatus = e.target.value;
                this.renderUsers(this.getFilteredUsers());
            };
        }

        const sortName = document.getElementById('users-sort-name');
        if (sortName) {
            sortName.value = this.sortName;
            sortName.onchange = (e) => {
                this.sortName = e.target.value;
                this.renderUsers(this.getFilteredUsers());
            };
        }

        const resetBtn = document.getElementById('btn-reset-users-filters');
        if (resetBtn) {
            resetBtn.onclick = () => {
                this.searchTerm = '';
                this.filterStatus = '';
                this.sortName = '';
                const si = document.getElementById('users-search');
                if (si) si.value = '';
                if (statusFilter) statusFilter.value = '';
                if (sortName) sortName.value = '';
                this.renderUsers(this.getFilteredUsers());
            };
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
            console.error('Error loading token types:', error);
        }
    },

    /**
     * Load users + houses + user-house assignments
     */
    async loadUsers() {
        try {
            const [usersRes, housesRes, uhRes, devicesRes] = await Promise.all([
                API.getUsers(),
                API.getHouses(),
                API.getAllUserHouses(),
                API.getDevices()
            ]);
            this.users = usersRes.users || [];
            this.houses = housesRes.houses || [];
            this.userHouses = uhRes.assignments || [];
            this.devices = devicesRes.devices || [];
            this.renderUsers(this.getFilteredUsers());
        } catch (error) {
            console.error('Error loading users:', error);
            this.users = [];
            this.renderUsers([]);
        }
    },

    /**
     * Render loading state
     */
    renderLoadingState() {
        const tbody = document.getElementById('users-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="loading-placeholder">Cargando usuarios...</td></tr>';
        }
    },

    /**
     * Handle search
     */
    handleSearch(term) {
        this.searchTerm = term.toLowerCase();
        this.renderUsers(this.getFilteredUsers());
    },

    getFilteredUsers() {
        let filtered = [...this.users];

        // Search filter
        if (this.searchTerm) {
            filtered = filtered.filter(user =>
                user.user_name.toLowerCase().includes(this.searchTerm) ||
                user.uid.toLowerCase().includes(this.searchTerm)
            );
        }

        // Status filter
        if (this.filterStatus) {
            filtered = filtered.filter(user => user.status === this.filterStatus);
        }

        // Name sort
        if (this.sortName === 'asc') {
            filtered.sort((a, b) => a.user_name.localeCompare(b.user_name));
        } else if (this.sortName === 'desc') {
            filtered.sort((a, b) => b.user_name.localeCompare(a.user_name));
        }

        return filtered;
    },

    /**
     * Get house IDs assigned to a user
     */
    getHousesForUser(uid) {
        return this.userHouses.filter(a => a.uid === uid).map(a => a.house_id);
    },

    /**
     * Render users table
     */
    renderUsers(users) {
        const tbody = document.getElementById('users-tbody');

        if (!users || users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6">
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
            const userType = user.user_type || 'GLOBAL';
            const typeBadgeClass = userType === 'GLOBAL' ? 'status-active' : 'status-info';
            const userHouseIds = this.getHousesForUser(user.uid);
            const typeLabel = userType === 'GLOBAL'
                ? '🌐 GLOBAL'
                : `🏠 HOUSE (${userHouseIds.length})`;

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
                    <td><span class="status-badge ${typeBadgeClass}" style="font-size:0.8rem;">${typeLabel}</span></td>
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
        const existingTokenTypes = this.tokenTypes.map(t => t.token_type);
        const userType = user.user_type || 'GLOBAL';
        const userHouseIds = this.getHousesForUser(uid);

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

        // Build houses info for HOUSE-type users
        let housesSection = '';
        if (userType !== 'GLOBAL') {
            const housesList = userHouseIds.length > 0
                ? userHouseIds.map(hId => {
                    const h = this.houses.find(x => x.house_id === hId);
                    const addr = h ? [h.house_street, h.house_number].filter(Boolean).join(' ') : '';
                    return `<span class="status-badge status-active" style="font-size:0.85rem;margin:2px;">🏠 ${Utils.escapeHtml(hId)}${addr ? ` — ${Utils.escapeHtml(addr)}` : ''}</span>`;
                }).join(' ')
                : '<span style="color:var(--text-secondary);">Sin casas asignadas</span>';

            housesSection = `
                <div class="section-card">
                    <h4>Casas Asignadas</h4>
                    <div style="display:flex;flex-wrap:wrap;gap:4px;">${housesList}</div>
                </div>
            `;
        }

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
                        <h4>Tipo de Usuario</h4>
                        <span class="status-badge ${userType === 'GLOBAL' ? 'status-active' : 'status-info'}" style="font-size:0.9rem;">
                            ${userType === 'GLOBAL' ? '🌐 GLOBAL — Acceso a todas las casas' : '🏠 HOUSE — Acceso restringido'}
                        </span>
                    </div>

                    ${housesSection}
                    
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
     * Build house checkboxes HTML
     */
    buildHouseCheckboxes(containerId, selectedHouseIds = []) {
        if (this.houses.length === 0) {
            return '<p style="color:var(--text-secondary);font-size:0.85rem;">No hay casas disponibles</p>';
        }
        return this.houses.map(h => {
            const checked = selectedHouseIds.includes(h.house_id) ? 'checked' : '';
            const addr = [h.house_street, h.house_number].filter(Boolean).join(' ');
            return `
                <label style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:0.9rem;cursor:pointer;">
                    <input type="checkbox" class="user-house-cb" value="${Utils.escapeHtml(h.house_id)}" ${checked}>
                    <strong>${Utils.escapeHtml(h.house_id)}</strong>
                    ${addr ? `<span style="color:var(--text-secondary);">— ${Utils.escapeHtml(addr)}</span>` : ''}
                </label>
            `;
        }).join('');
    },

    /**
     * Show add user modal
     */
    showAddUserModal() {
        const houseCbs = this.buildHouseCheckboxes('new-user-houses');

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
                    <div class="form-group">
                        <label for="new-user-type">Tipo de Usuario</label>
                        <select id="new-user-type" class="form-select" onchange="Users.toggleHouseSelector('new')">
                            <option value="GLOBAL">🌐 GLOBAL — Acceso a todas las casas</option>
                            <option value="HOUSE">🏠 HOUSE — Solo casas asignadas</option>
                        </select>
                    </div>
                    <div class="form-group" id="new-user-houses-container" style="display:none;">
                        <label>Casas Asignadas</label>
                        <div id="new-user-houses" style="max-height:200px;overflow-y:auto;border:1px solid var(--border-color, #e2e8f0);border-radius:8px;padding:8px 12px;">
                            ${houseCbs}
                        </div>
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
            const userType = document.getElementById('new-user-type').value;

            if (!uid || !name) {
                Utils.showToast('Complete todos los campos', 'error');
                return;
            }

            // Get selected houses if HOUSE type
            const selectedHouses = userType === 'HOUSE'
                ? [...document.querySelectorAll('#new-user-houses .user-house-cb:checked')].map(cb => cb.value)
                : [];

            try {
                await API.createUser({ uid, user_name: name, status: 'ACTIVO', user_type: userType });
                if (userType === 'HOUSE' && selectedHouses.length > 0) {
                    await API.assignUserHouses(uid, selectedHouses);
                }
                Utils.closeModal();
                Utils.showToast('Usuario creado correctamente', 'success');
                this.load();
            } catch (error) {
                Utils.showToast('Error al crear usuario', 'error');
            }
        };
    },

    /**
     * Toggle house selector visibility in modals
     */
    toggleHouseSelector(prefix) {
        const typeSelect = document.getElementById(`${prefix}-user-type`);
        const container = document.getElementById(`${prefix}-user-houses-container`);
        if (typeSelect && container) {
            container.style.display = typeSelect.value === 'HOUSE' ? '' : 'none';
        }
    },

    /**
     * Edit user
     */
    editUser(uid) {
        const user = this.users.find(u => u.uid === uid);
        if (!user) return;

        const userType = user.user_type || 'GLOBAL';
        const userHouseIds = this.getHousesForUser(uid);
        const houseCbs = this.buildHouseCheckboxes('edit-user-houses', userHouseIds);

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
                    <div class="form-group">
                        <label for="edit-user-type">Tipo de Usuario</label>
                        <select id="edit-user-type" class="form-select" onchange="Users.toggleHouseSelector('edit')">
                            <option value="GLOBAL" ${userType === 'GLOBAL' ? 'selected' : ''}>🌐 GLOBAL — Acceso a todas las casas</option>
                            <option value="HOUSE" ${userType === 'HOUSE' ? 'selected' : ''}>🏠 HOUSE — Solo casas asignadas</option>
                        </select>
                    </div>
                    <div class="form-group" id="edit-user-houses-container" style="display:${userType === 'HOUSE' ? '' : 'none'};">
                        <label>Casas Asignadas</label>
                        <div id="edit-user-houses" style="max-height:200px;overflow-y:auto;border:1px solid var(--border-color, #e2e8f0);border-radius:8px;padding:8px 12px;">
                            ${houseCbs}
                        </div>
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
            const newType = document.getElementById('edit-user-type').value;

            if (!name) {
                Utils.showToast('El nombre es requerido', 'error');
                return;
            }

            // Get selected houses if HOUSE type
            const selectedHouses = newType === 'HOUSE'
                ? [...document.querySelectorAll('#edit-user-houses .user-house-cb:checked')].map(cb => cb.value)
                : [];

            try {
                await API.updateUser(uid, { user_name: name, user_type: newType });
                await API.assignUserHouses(uid, selectedHouses);
                Utils.closeModal();
                Utils.showToast('Usuario actualizado', 'success');
                this.load();
            } catch (error) {
                Utils.showToast('Error al actualizar usuario', 'error');
            }
        };
    },

    /**
     * Get the relevant token types for a user based on their type and house access.
     * GLOBAL: token_types from ALL active devices
     * HOUSE:  token_types from active devices in assigned houses only
     */
    getRelevantTokenTypes(uid, userType) {
        const activeDevices = this.devices.filter(d => {
            const isActive = d.active === true || d.active === 'TRUE' || d.active === 'true' || d.active === 1;
            return isActive;
        });

        let relevantDevices;
        if (userType === 'GLOBAL') {
            relevantDevices = activeDevices;
        } else {
            const userHouseIds = this.getHousesForUser(uid);
            relevantDevices = activeDevices.filter(d => d.house_id && userHouseIds.includes(d.house_id));
        }

        // Unique token types from relevant devices
        const tokenTypeSet = new Set(relevantDevices.map(d => d.token_type).filter(Boolean));
        return [...tokenTypeSet];
    },

    /**
     * Adjust tokens modal — shows only token types from devices the user can access
     */
    adjustTokens(uid) {
        const user = this.users.find(u => u.uid === uid);
        if (!user) return;

        const userType = user.user_type || 'GLOBAL';
        const relevantTypes = this.getRelevantTokenTypes(uid, userType);

        // Build token rows for relevant types only
        const userTokens = user.tokens || {};
        const tokenRows = relevantTypes.map(type => {
            const balance = userTokens[type] || 0;
            const tokenType = this.tokenTypes.find(t => t.token_type === type);
            const isInactive = tokenType && tokenType.status === 'INACTIVO';
            const inactiveTag = isInactive ? ' <span class="token-inactive" style="font-size:0.75rem;">⚠️ INACTIVO</span>' : '';
            return `
                <div class="adjust-token-row" style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border-color, #e2e8f0);">
                    <div style="flex:1;"><strong>${type}</strong>${inactiveTag}</div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <button type="button" class="btn btn-sm btn-secondary" onclick="Users.adjustTokenValue('${type}', -1, ${balance})">−</button>
                        <input type="number" id="token-adjust-${type}" value="${balance}" min="0" style="width:70px;text-align:center;">
                        <button type="button" class="btn btn-sm btn-secondary" onclick="Users.adjustTokenValue('${type}', 1, ${balance})">+</button>
                    </div>
                    <div id="token-preview-${type}" style="font-size:0.85rem;color:var(--text-secondary);min-width:80px;text-align:right;">
                        Actual: ${balance}
                    </div>
                </div>
            `;
        }).join('') || '<p class="text-muted">No hay tokens relevantes para este usuario</p>';

        // Info label
        const scopeLabel = userType === 'GLOBAL'
            ? '🌐 Mostrando tokens de todos los dispositivos activos'
            : `🏠 Mostrando tokens de dispositivos en ${this.getHousesForUser(uid).length} casa(s) asignada(s)`;

        Utils.showModal({
            title: `Ajustar Tokens: ${user.user_name}`,
            content: `
                <form id="adjust-tokens-form">
                    <div style="margin-bottom:12px;padding:8px 12px;background:var(--bg-secondary, #f1f5f9);border-radius:8px;font-size:0.85rem;color:var(--text-secondary);">
                        ${scopeLabel}
                    </div>
                    <div style="margin-bottom:16px;">
                        ${tokenRows}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Guardar Cambios</button>
                    </div>
                </form>
            `
        });

        document.getElementById('adjust-tokens-form').onsubmit = async (e) => {
            e.preventDefault();
            const updates = [];

            for (const type of relevantTypes) {
                const input = document.getElementById(`token-adjust-${type}`);
                if (input) {
                    const newBalance = parseInt(input.value);
                    const oldBalance = (user.tokens || {})[type] || 0;
                    if (newBalance !== oldBalance) {
                        updates.push({ token_type: type, delta: newBalance - oldBalance });
                    }
                }
            }

            if (updates.length === 0) {
                Utils.showToast('No hay cambios', 'info');
                return;
            }

            try {
                for (const update of updates) {
                    await API.updateTokenBalance(uid, update.token_type, update.delta);
                }
                Utils.closeModal();
                Utils.showToast('Tokens actualizados', 'success');
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
        const input = document.getElementById(`token-adjust-${tokenType}`);
        if (input) {
            const current = parseInt(input.value) || 0;
            const newVal = Math.max(0, current + delta);
            input.value = newVal;
            this.updatePreview(tokenType, originalBalance);
        }
    },

    /**
     * Update balance preview
     */
    updatePreview(tokenType, originalBalance) {
        const input = document.getElementById(`token-adjust-${tokenType}`);
        const preview = document.getElementById(`token-preview-${tokenType}`);
        if (input && preview) {
            const newVal = parseInt(input.value) || 0;
            const diff = newVal - originalBalance;
            let diffText = '';
            if (diff > 0) diffText = `<span style="color:var(--color-success, green);">(+${diff})</span>`;
            else if (diff < 0) diffText = `<span style="color:var(--color-danger, red);">(${diff})</span>`;
            preview.innerHTML = `Actual: ${originalBalance} ${diffText}`;
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

        if (!confirm(`¿Desea ${action} al usuario ${user.user_name}?`)) return;

        try {
            await API.updateUser(uid, { status: newStatus });
            Utils.showToast(`Usuario ${newStatus === 'ACTIVO' ? 'activado' : 'desactivado'}`, 'success');
            this.load();
        } catch (error) {
            Utils.showToast('Error al actualizar estado', 'error');
        }
    }
};

// Export for use
window.Users = Users;
