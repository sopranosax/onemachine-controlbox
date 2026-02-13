/**
 * Token Types View for IoT Control WebApp
 * MASTER role: full CRUD + reset
 * ADMIN role: view + reset only
 */

const RESET_DATE_OPTIONS = [
    { value: 'SIN FECHA FIJA', label: 'Sin fecha fija' },
    { value: 'PRIMER DÍA DE CADA MES', label: 'Primer día de cada mes' },
    { value: 'ÚLTIMO DÍA DE CADA MES', label: 'Último día de cada mes' }
];

const TokenTypes = {
    tokenTypes: [],

    async load() {
        if (!Auth.can('tokens.view')) {
            Utils.showToast('No tiene permisos para ver esta sección', 'error');
            return;
        }

        await this.loadTokenTypes();
        this.bindEvents();
    },

    bindEvents() {
        // Add token type button (MASTER only)
        const addBtn = document.getElementById('add-token-type-btn');
        if (addBtn) {
            if (Auth.can('tokens.create')) {
                addBtn.style.display = '';
                addBtn.onclick = () => this.showAddModal();
            } else {
                addBtn.style.display = 'none';
            }
        }
    },

    async loadTokenTypes() {
        const container = document.getElementById('token-types-list');
        container.innerHTML = '<div class="loading-placeholder">Cargando tipos de token...</div>';

        try {
            const response = await API.getTokenTypes();
            this.tokenTypes = response.token_types || [];
            this.renderTokenTypes();
        } catch (error) {
            console.error('Error loading token types:', error);
            // Mock data for demo
            this.tokenTypes = [
                { token_type: 'WSH', token_name: 'Lavadora', description: 'Token para uso de lavadora', status: 'ACTIVO', reset_value: 0, reset_date: 'SIN FECHA FIJA' },
                { token_type: 'DRY', token_name: 'Secadora', description: 'Token para uso de secadora', status: 'ACTIVO', reset_value: 0, reset_date: 'SIN FECHA FIJA' }
            ];
            this.renderTokenTypes();
        }
    },

    /**
     * Get a human-readable label for a RESET_DATE value
     */
    getResetDateLabel(value) {
        const option = RESET_DATE_OPTIONS.find(o => o.value === value);
        return option ? option.label : value || 'Sin fecha fija';
    },

    renderTokenTypes() {
        const container = document.getElementById('token-types-list');
        const canEdit = Auth.can('tokens.edit');
        const canDelete = Auth.can('tokens.delete');
        const canReset = Auth.can('tokens.reset');

        if (!this.tokenTypes || this.tokenTypes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎫</div>
                    <p class="empty-state-title">Sin tipos de token</p>
                    <p class="empty-state-message">Agregue tipos de token para comenzar</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Nombre</th>
                        <th>Descripción</th>
                        <th>Reset Value</th>
                        <th>Reset Date</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.tokenTypes.map(t => `
                        <tr>
                            <td><strong>${Utils.escapeHtml(t.token_type)}</strong></td>
                            <td>${Utils.escapeHtml(t.token_name)}</td>
                            <td>${Utils.escapeHtml(t.description || '-')}</td>
                            <td>${t.reset_value || 0}</td>
                            <td>${Utils.escapeHtml(this.getResetDateLabel(t.reset_date))}</td>
                            <td>
                                <span class="status-badge ${t.status === 'ACTIVO' ? 'status-active' : 'status-inactive'}">
                                    ${t.status}
                                </span>
                            </td>
                            <td class="actions-cell">
                                ${canReset && t.status === 'ACTIVO' ? `
                                    <button class="btn btn-sm btn-primary" onclick="TokenTypes.resetBalance('${t.token_type}', ${t.reset_value || 0})">
                                        🔄 Actualizar
                                    </button>
                                ` : ''}
                                ${canEdit ? `
                                    <button class="btn btn-sm btn-secondary" onclick="TokenTypes.editTokenType('${t.token_type}')">
                                        ✏️ Editar
                                    </button>
                                    <button class="btn btn-sm ${t.status === 'ACTIVO' ? 'btn-warning' : 'btn-success'}" 
                                            onclick="TokenTypes.toggleStatus('${t.token_type}', '${t.status}')">
                                        ${t.status === 'ACTIVO' ? '⏸️ Desactivar' : '▶️ Activar'}
                                    </button>
                                ` : ''}
                                ${canDelete ? `
                                    <button class="btn btn-sm btn-danger" onclick="TokenTypes.deleteTokenType('${t.token_type}')">
                                        🗑️ Eliminar
                                    </button>
                                ` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    /**
     * Bulk reset balance for all active users with a given token type
     */
    async resetBalance(tokenType, resetValue) {
        const confirmed = await Utils.showConfirm({
            title: '🔄 Actualizar Balances',
            message: `¿Establecer el balance de TODOS los usuarios activos con token "${tokenType}" a ${resetValue}?\n\nEsta acción reemplazará el balance actual de cada usuario.`,
            confirmText: 'Actualizar',
            type: 'warning'
        });

        if (confirmed) {
            try {
                const response = await API.resetBalanceByTokenType(tokenType, resetValue);
                if (response.success) {
                    Utils.showToast(`Balances actualizados: ${response.users_updated} usuario(s) afectado(s)`, 'success');
                } else {
                    Utils.showToast(response.error || 'Error al actualizar balances', 'error');
                }
            } catch (error) {
                Utils.showToast('Error de conexión', 'error');
            }
        }
    },

    showAddModal() {
        Utils.showModal({
            title: 'Nuevo Tipo de Token',
            content: `
                <form id="add-token-type-form">
                    <div class="form-group">
                        <label for="new-token-code">Código (ej: WSH, DRY) *</label>
                        <input type="text" id="new-token-code" required maxlength="10" 
                               pattern="[A-Za-z0-9]+" placeholder="Código único en mayúsculas">
                    </div>
                    <div class="form-group">
                        <label for="new-token-name">Nombre *</label>
                        <input type="text" id="new-token-name" required placeholder="Nombre descriptivo">
                    </div>
                    <div class="form-group">
                        <label for="new-token-description">Descripción</label>
                        <textarea id="new-token-description" rows="2" placeholder="Descripción opcional"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="new-token-status">Estado</label>
                        <select id="new-token-status">
                            <option value="ACTIVO">Activo</option>
                            <option value="INACTIVO">Inactivo</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="new-token-reset-value">Reset Value</label>
                        <input type="number" id="new-token-reset-value" min="0" value="0" placeholder="0">
                    </div>
                    <div class="form-group">
                        <label for="new-token-reset-date">Reset Date</label>
                        <select id="new-token-reset-date">
                            ${RESET_DATE_OPTIONS.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
                        </select>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Crear Token</button>
                    </div>
                </form>
            `
        });

        document.getElementById('add-token-type-form').onsubmit = async (e) => {
            e.preventDefault();

            const tokenType = document.getElementById('new-token-code').value.trim().toUpperCase();
            const tokenName = document.getElementById('new-token-name').value.trim();
            const description = document.getElementById('new-token-description').value.trim();
            const status = document.getElementById('new-token-status').value;
            const resetValue = parseInt(document.getElementById('new-token-reset-value').value) || 0;
            const resetDate = document.getElementById('new-token-reset-date').value;

            if (!tokenType || !tokenName) {
                Utils.showToast('Código y nombre son requeridos', 'error');
                return;
            }

            try {
                const response = await API.createTokenType({
                    token_type: tokenType,
                    token_name: tokenName,
                    description: description,
                    status: status,
                    reset_value: resetValue,
                    reset_date: resetDate
                });

                if (response.success) {
                    Utils.closeModal();
                    Utils.showToast('Tipo de token creado exitosamente', 'success');
                    this.loadTokenTypes();
                } else {
                    Utils.showToast(response.error || 'Error al crear', 'error');
                }
            } catch (error) {
                Utils.showToast('Error de conexión', 'error');
            }
        };
    },

    editTokenType(tokenType) {
        const token = this.tokenTypes.find(t => t.token_type === tokenType);
        if (!token) return;

        const resetDateOptions = RESET_DATE_OPTIONS.map(o =>
            `<option value="${o.value}" ${(token.reset_date || 'SIN FECHA FIJA') === o.value ? 'selected' : ''}>${o.label}</option>`
        ).join('');

        Utils.showModal({
            title: `Editar: ${token.token_name}`,
            content: `
                <form id="edit-token-type-form">
                    <div class="form-group">
                        <label>Código</label>
                        <input type="text" value="${Utils.escapeHtml(token.token_type)}" disabled>
                    </div>
                    <div class="form-group">
                        <label for="edit-token-name">Nombre *</label>
                        <input type="text" id="edit-token-name" required value="${Utils.escapeHtml(token.token_name)}">
                    </div>
                    <div class="form-group">
                        <label for="edit-token-description">Descripción</label>
                        <textarea id="edit-token-description" rows="2">${Utils.escapeHtml(token.description || '')}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="edit-token-reset-value">Reset Value</label>
                        <input type="number" id="edit-token-reset-value" min="0" value="${token.reset_value || 0}">
                    </div>
                    <div class="form-group">
                        <label for="edit-token-reset-date">Reset Date</label>
                        <select id="edit-token-reset-date">
                            ${resetDateOptions}
                        </select>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Guardar Cambios</button>
                    </div>
                </form>
            `
        });

        document.getElementById('edit-token-type-form').onsubmit = async (e) => {
            e.preventDefault();

            const tokenName = document.getElementById('edit-token-name').value.trim();
            const description = document.getElementById('edit-token-description').value.trim();
            const resetValue = parseInt(document.getElementById('edit-token-reset-value').value) || 0;
            const resetDate = document.getElementById('edit-token-reset-date').value;

            try {
                const response = await API.updateTokenType(tokenType, {
                    token_name: tokenName,
                    description: description,
                    reset_value: resetValue,
                    reset_date: resetDate
                });

                if (response.success) {
                    Utils.closeModal();
                    Utils.showToast('Tipo de token actualizado', 'success');
                    this.loadTokenTypes();
                } else {
                    Utils.showToast(response.error || 'Error al actualizar', 'error');
                }
            } catch (error) {
                Utils.showToast('Error de conexión', 'error');
            }
        };
    },

    async toggleStatus(tokenType, currentStatus) {
        const newStatus = currentStatus === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
        const action = newStatus === 'ACTIVO' ? 'activar' : 'desactivar';

        const confirmed = await Utils.showConfirm({
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} Tipo de Token`,
            message: `¿Está seguro que desea ${action} el tipo de token "${tokenType}"?`,
            confirmText: action.charAt(0).toUpperCase() + action.slice(1),
            type: newStatus === 'ACTIVO' ? 'info' : 'warning'
        });

        if (confirmed) {
            try {
                const response = await API.updateTokenType(tokenType, { status: newStatus });
                if (response.success) {
                    Utils.showToast(`Tipo de token ${newStatus === 'ACTIVO' ? 'activado' : 'desactivado'}`, 'success');
                    this.loadTokenTypes();
                } else {
                    Utils.showToast(response.error || 'Error', 'error');
                }
            } catch (error) {
                Utils.showToast('Error de conexión', 'error');
            }
        }
    },

    async deleteTokenType(tokenType) {
        // First try without force to check if users have balance
        try {
            const response = await API.deleteTokenType(tokenType, false);

            if (response.success) {
                Utils.showToast('Tipo de token eliminado', 'success');
                this.loadTokenTypes();
                return;
            }

            // Check if error is about users having balance
            if (response.error === 'users_have_balance') {
                const confirmed = await Utils.showConfirm({
                    title: '⚠️ Usuarios con Balance',
                    message: `Existen ${response.users_count} usuario(s) con balance total de ${response.total_balance} tokens de tipo "${tokenType}".\n\n¿Desea eliminar este tipo de token de todas formas? Los balances de los usuarios serán eliminados.`,
                    confirmText: 'Confirmar Eliminación',
                    type: 'danger'
                });

                if (confirmed) {
                    // Force delete
                    const forceResponse = await API.deleteTokenType(tokenType, true);
                    if (forceResponse.success) {
                        Utils.showToast('Tipo de token eliminado (balances de usuarios borrados)', 'success');
                        this.loadTokenTypes();
                    } else {
                        Utils.showToast(forceResponse.error || 'Error al eliminar', 'error');
                    }
                }
            } else {
                Utils.showToast(response.error || 'Error al eliminar', 'error');
            }
        } catch (error) {
            Utils.showToast('Error de conexión', 'error');
        }
    },

    /**
     * Get token type status by code
     * @param {string} tokenType - Token type code
     * @returns {string} Status (ACTIVO/INACTIVO)
     */
    getTokenStatus(tokenType) {
        const token = this.tokenTypes.find(t => t.token_type === tokenType);
        return token ? token.status : 'ACTIVO';
    }
};

window.TokenTypes = TokenTypes;
