/**
 * Roles View for IoT Control WebApp (MASTER only)
 */

const Roles = {
    admins: [],

    async load() {
        if (!Auth.can('roles.view')) {
            Utils.showToast('Acceso no autorizado', 'error');
            App.navigateTo('dashboard');
            return;
        }

        this.bindEvents();
        this.renderLoadingState();

        try {
            await this.loadAdmins();
        } catch (error) {
            console.error('Error loading admins:', error);
            Utils.showToast('Error al cargar roles', 'error');
        }
    },

    bindEvents() {
        const addBtn = document.getElementById('btn-add-admin');
        if (addBtn) {
            addBtn.onclick = () => this.showAddAdminModal();
            addBtn.style.display = Auth.can('roles.create') ? '' : 'none';
        }
    },

    async loadAdmins() {
        try {
            const response = await API.getAdmins();
            this.admins = response.admins || [];
        } catch (e) {
            this.admins = [
                { admin_email: 'master@example.com', role: 'MASTER', status: 'ACTIVO' },
                { admin_email: 'admin@example.com', role: 'ADMIN', status: 'ACTIVO' },
                { admin_email: 'viewer@example.com', role: 'VIEWER', status: 'INACTIVO' }
            ];
        }
        this.renderAdmins(this.admins);
    },

    renderLoadingState() {
        document.getElementById('admins-tbody').innerHTML = '<tr><td colspan="4" class="loading-placeholder">Cargando...</td></tr>';
    },

    renderAdmins(admins) {
        const tbody = document.getElementById('admins-tbody');

        if (!admins?.length) {
            tbody.innerHTML = '<tr><td colspan="4"><div class="empty-state"><p>No hay administradores</p></div></td></tr>';
            return;
        }

        const canEdit = Auth.can('roles.edit');

        tbody.innerHTML = admins.map(admin => {
            const statusClass = admin.status === 'ACTIVO' ? 'badge-success' : 'badge-danger';
            const roleClass = admin.role === 'MASTER' ? 'badge-warning' : admin.role === 'ADMIN' ? 'badge-info' : 'badge-secondary';

            return `
                <tr>
                    <td>${Utils.escapeHtml(admin.admin_email)}</td>
                    <td><span class="badge ${roleClass}">${admin.role}</span></td>
                    <td><span class="badge ${statusClass}">${admin.status}</span></td>
                    <td>
                        <div class="action-buttons">
                            ${canEdit ? `
                                <button class="action-btn edit" onclick="Roles.editAdmin('${admin.admin_email}')" title="Editar">✏️</button>
                                <button class="action-btn ${admin.status === 'ACTIVO' ? 'delete' : 'view'}" onclick="Roles.toggleStatus('${admin.admin_email}')" title="${admin.status === 'ACTIVO' ? 'Desactivar' : 'Activar'}">${admin.status === 'ACTIVO' ? '🚫' : '✓'}</button>
                            ` : '-'}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    showAddAdminModal() {
        Utils.showModal({
            title: 'Nuevo Administrador',
            content: `
                <form id="add-admin-form">
                    <div class="form-group">
                        <label for="new-admin-email">Email *</label>
                        <input type="email" id="new-admin-email" required placeholder="admin@ejemplo.com">
                    </div>
                    <div class="form-group">
                        <label for="new-admin-role">Rol *</label>
                        <select id="new-admin-role" required>
                            <option value="VIEWER">VIEWER</option>
                            <option value="ADMIN">ADMIN</option>
                            <option value="MASTER">MASTER</option>
                        </select>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Crear</button>
                    </div>
                </form>
            `
        });

        document.getElementById('add-admin-form').onsubmit = async (e) => {
            e.preventDefault();
            const email = document.getElementById('new-admin-email').value.trim();
            const role = document.getElementById('new-admin-role').value;

            try {
                await API.createAdmin({ admin_email: email, role, status: 'ACTIVO' });
                Utils.closeModal();
                Utils.showToast('Administrador creado', 'success');
                this.load();
            } catch (error) {
                Utils.showToast('Error al crear administrador', 'error');
            }
        };
    },

    editAdmin(email) {
        const admin = this.admins.find(a => a.admin_email === email);
        if (!admin) return;

        Utils.showModal({
            title: 'Editar Administrador',
            content: `
                <form id="edit-admin-form">
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" value="${Utils.escapeHtml(admin.admin_email)}" disabled>
                    </div>
                    <div class="form-group">
                        <label for="edit-admin-role">Rol *</label>
                        <select id="edit-admin-role" required>
                            <option value="VIEWER" ${admin.role === 'VIEWER' ? 'selected' : ''}>VIEWER</option>
                            <option value="ADMIN" ${admin.role === 'ADMIN' ? 'selected' : ''}>ADMIN</option>
                            <option value="MASTER" ${admin.role === 'MASTER' ? 'selected' : ''}>MASTER</option>
                        </select>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Guardar</button>
                    </div>
                </form>
            `
        });

        document.getElementById('edit-admin-form').onsubmit = async (e) => {
            e.preventDefault();
            const role = document.getElementById('edit-admin-role').value;

            try {
                await API.updateAdmin(email, { role });
                Utils.closeModal();
                Utils.showToast('Administrador actualizado', 'success');
                this.load();
            } catch (error) {
                Utils.showToast('Error al actualizar', 'error');
            }
        };
    },

    async toggleStatus(email) {
        const admin = this.admins.find(a => a.admin_email === email);
        if (!admin) return;

        const newStatus = admin.status === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
        const action = admin.status === 'ACTIVO' ? 'desactivar' : 'activar';

        const confirmed = await Utils.showConfirm({
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} Administrador`,
            message: `¿Está seguro que desea ${action} a ${admin.admin_email}?`,
            type: admin.status === 'ACTIVO' ? 'danger' : 'info'
        });

        if (confirmed) {
            try {
                await API.updateAdmin(email, { status: newStatus });
                Utils.showToast(`Administrador ${newStatus === 'ACTIVO' ? 'activado' : 'desactivado'}`, 'success');
                this.load();
            } catch (error) {
                Utils.showToast('Error al actualizar', 'error');
            }
        }
    }
};

window.Roles = Roles;
