/**
 * Token Types View for IoT Control WebApp
 * MASTER role only
 */

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
        // Add token type button
        const addBtn = document.getElementById('add-token-type-btn');
        if (addBtn) {
            addBtn.onclick = () => this.showAddModal();
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
                { token_type: 'WSH', token_name: 'Lavadora', description: 'Token para uso de lavadora', status: 'ACTIVO' },
                { token_type: 'DRY', token_name: 'Secadora', description: 'Token para uso de secadora', status: 'ACTIVO' }
            ];
            this.renderTokenTypes();
        }
    },

    renderTokenTypes() {
        const container = document.getElementById('token-types-list');

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
                            <td>
                                <span class="status-badge ${t.status === 'ACTIVO' ? 'status-active' : 'status-inactive'}">
                                    ${t.status}
                                </span>
                            </td>
                            <td class="actions-cell">
                                <button class="btn btn-sm btn-secondary" onclick="TokenTypes.editTokenType('${t.token_type}')">
                                    ✏️ Editar
                                </button>
                                <button class="btn btn-sm ${t.status === 'ACTIVO' ? 'btn-warning' : 'btn-success'}" 
                                        onclick="TokenTypes.toggleStatus('${t.token_type}', '${t.status}')">
                                    ${t.status === 'ACTIVO' ? '⏸️ Desactivar' : '▶️ Activar'}
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="TokenTypes.deleteTokenType('${t.token_type}')">
                                    🗑️ Eliminar
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    showAddModal() {
        const content = `
            <form id="add-token-type-form">
                <div class="form-group">
                    <label for="new-token-code">Código (ej: WSH, DRY)</label>
                    <input type="text" id="new-token-code" required maxlength="10" 
                           pattern="[A-Za-z0-9]+" placeholder="Código único en mayúsculas">
                </div>
                <div class="form-group">
                    <label for="new-token-name">Nombre</label>
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
            </form>
        `;

        Utils.showModal({
            title: 'Nuevo Tipo de Token',
            content: content,
            confirmText: 'Crear',
            onConfirm: async () => {
                const tokenType = document.getElementById('new-token-code').value.trim().toUpperCase();
                const tokenName = document.getElementById('new-token-name').value.trim();
                const description = document.getElementById('new-token-description').value.trim();
                const status = document.getElementById('new-token-status').value;

                if (!tokenType || !tokenName) {
                    Utils.showToast('Código y nombre son requeridos', 'error');
                    return false;
                }

                try {
                    const response = await API.createTokenType({
                        token_type: tokenType,
                        token_name: tokenName,
                        description: description,
                        status: status
                    });

                    if (response.success) {
                        Utils.showToast('Tipo de token creado exitosamente', 'success');
                        this.loadTokenTypes();
                        return true;
                    } else {
                        Utils.showToast(response.error || 'Error al crear', 'error');
                        return false;
                    }
                } catch (error) {
                    Utils.showToast('Error de conexión', 'error');
                    return false;
                }
            }
        });
    },

    editTokenType(tokenType) {
        const token = this.tokenTypes.find(t => t.token_type === tokenType);
        if (!token) return;

        const content = `
            <form id="edit-token-type-form">
                <div class="form-group">
                    <label>Código</label>
                    <input type="text" value="${Utils.escapeHtml(token.token_type)}" disabled>
                </div>
                <div class="form-group">
                    <label for="edit-token-name">Nombre</label>
                    <input type="text" id="edit-token-name" required value="${Utils.escapeHtml(token.token_name)}">
                </div>
                <div class="form-group">
                    <label for="edit-token-description">Descripción</label>
                    <textarea id="edit-token-description" rows="2">${Utils.escapeHtml(token.description || '')}</textarea>
                </div>
            </form>
        `;

        Utils.showModal({
            title: `Editar: ${token.token_name}`,
            content: content,
            confirmText: 'Guardar',
            onConfirm: async () => {
                const tokenName = document.getElementById('edit-token-name').value.trim();
                const description = document.getElementById('edit-token-description').value.trim();

                try {
                    const response = await API.updateTokenType(tokenType, {
                        token_name: tokenName,
                        description: description
                    });

                    if (response.success) {
                        Utils.showToast('Tipo de token actualizado', 'success');
                        this.loadTokenTypes();
                        return true;
                    } else {
                        Utils.showToast(response.error || 'Error al actualizar', 'error');
                        return false;
                    }
                } catch (error) {
                    Utils.showToast('Error de conexión', 'error');
                    return false;
                }
            }
        });
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
        const confirmed = await Utils.showConfirm({
            title: 'Eliminar Tipo de Token',
            message: `¿Está seguro que desea eliminar el tipo de token "${tokenType}"? Esta acción no se puede deshacer.`,
            confirmText: 'Eliminar',
            type: 'danger'
        });

        if (confirmed) {
            try {
                const response = await API.deleteTokenType(tokenType);
                if (response.success) {
                    Utils.showToast('Tipo de token eliminado', 'success');
                    this.loadTokenTypes();
                } else {
                    Utils.showToast(response.error || 'Error al eliminar', 'error');
                }
            } catch (error) {
                Utils.showToast('Error de conexión', 'error');
            }
        }
    }
};

window.TokenTypes = TokenTypes;
