/**
 * MasterKeys View for IoT Control WebApp
 * MASTER role only — CRUD for masterkeys with level-based logic
 */

const MasterKeys = {
    masterkeys: [],
    houses: [],
    devices: [],

    async load() {
        if (!Auth.can('masterkeys.view')) {
            Utils.showToast('No tiene permisos para ver esta sección', 'error');
            return;
        }

        await this.loadData();
        this.bindEvents();
    },

    bindEvents() {
        const addBtn = document.getElementById('btn-add-masterkey');
        if (addBtn) {
            addBtn.onclick = () => this.showAddModal();
        }
    },

    async loadData() {
        const tbody = document.getElementById('masterkeys-tbody');
        tbody.innerHTML = '<tr><td colspan="5" class="loading-placeholder">Cargando masterkeys...</td></tr>';

        try {
            const [mkRes, housesRes, devicesRes] = await Promise.all([
                API.getMasterkeys(),
                API.getHouses(),
                API.getDevices()
            ]);
            this.masterkeys = mkRes.masterkeys || [];
            this.houses = housesRes.houses || [];
            this.devices = devicesRes.devices || [];
            this.renderMasterkeys();
        } catch (error) {
            console.error('Error loading masterkeys:', error);
            tbody.innerHTML = '<tr><td colspan="5" class="loading-placeholder">Error al cargar masterkeys</td></tr>';
        }
    },

    getLevelLabel(level) {
        const labels = { 'GLOBAL': '🌐 Global', 'HOUSE': '🏠 Casa', 'DEVICE': '📟 Dispositivo' };
        return labels[level] || level;
    },

    getTargetLabel(mk) {
        if (mk.masterkey_level === 'GLOBAL') return '—';
        if (mk.masterkey_level === 'HOUSE') {
            const house = this.houses.find(h => h.house_id === mk.level_target);
            return house ? `${mk.level_target} (${house.house_street || ''})` : mk.level_target || '—';
        }
        if (mk.masterkey_level === 'DEVICE') {
            const device = this.devices.find(d => d.esp32_id === mk.level_target);
            return device ? `${mk.level_target} (${device.location || ''})` : mk.level_target || '—';
        }
        return mk.level_target || '—';
    },

    renderMasterkeys() {
        const tbody = document.getElementById('masterkeys-tbody');

        if (!this.masterkeys || this.masterkeys.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5">
                        <div class="empty-state">
                            <div class="empty-state-icon">🔑</div>
                            <p class="empty-state-title">Sin masterkeys</p>
                            <p class="empty-state-message">Agregue masterkeys para control de acceso por llave maestra</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.masterkeys.map(mk => `
            <tr>
                <td><strong>${Utils.escapeHtml(mk.masterkey_id)}</strong></td>
                <td>${this.getLevelLabel(mk.masterkey_level)}</td>
                <td>${Utils.escapeHtml(this.getTargetLabel(mk))}</td>
                <td>
                    <span class="status-badge ${mk.state === 'ACTIVA' ? 'status-active' : 'status-inactive'}">
                        ${mk.state}
                    </span>
                </td>
                <td class="actions-cell">
                    <button class="btn btn-sm btn-secondary" onclick="MasterKeys.showEditModal('${mk.masterkey_id}')">
                        ✏️ Editar
                    </button>
                    <button class="btn btn-sm ${mk.state === 'ACTIVA' ? 'btn-warning' : 'btn-success'}"
                            onclick="MasterKeys.toggleState('${mk.masterkey_id}', '${mk.state}')">
                        ${mk.state === 'ACTIVA' ? '⏸️ Desactivar' : '▶️ Activar'}
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="MasterKeys.deleteMasterkey('${mk.masterkey_id}')">
                        🗑️ Eliminar
                    </button>
                </td>
            </tr>
        `).join('');
    },

    showAddModal() {
        if (!Auth.can('masterkeys.create')) {
            Utils.showToast('No tiene permisos', 'error');
            return;
        }

        const housesOptions = this.houses.map(h =>
            `<option value="${h.house_id}">${h.house_id} — ${h.house_street || ''} ${h.house_number || ''}</option>`
        ).join('');

        const devicesOptions = this.devices.map(d =>
            `<option value="${d.esp32_id}">${d.esp32_id} — ${d.location || ''}</option>`
        ).join('');

        Utils.showModal({
            title: 'Nueva MasterKey', content: `
            <form id="masterkey-form">
                <div class="form-group">
                    <label>ID MasterKey *</label>
                    <input type="text" id="mk-id" placeholder="MK_GLOBAL_001" required>
                </div>
                <div class="form-group">
                    <label>Nivel *</label>
                    <select id="mk-level" required>
                        <option value="GLOBAL">🌐 Global (todas las casas y dispositivos)</option>
                        <option value="HOUSE">🏠 Casa (todos los dispositivos de una casa)</option>
                        <option value="DEVICE">📟 Dispositivo (un dispositivo específico)</option>
                    </select>
                </div>
                <div class="form-group" id="mk-target-house-group" style="display:none;">
                    <label>Casa Target</label>
                    <select id="mk-target-house">
                        <option value="">Seleccione casa...</option>
                        ${housesOptions}
                    </select>
                </div>
                <div class="form-group" id="mk-target-device-group" style="display:none;">
                    <label>Dispositivo Target</label>
                    <select id="mk-target-device">
                        <option value="">Seleccione dispositivo...</option>
                        ${devicesOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>Estado</label>
                    <select id="mk-state">
                        <option value="ACTIVA">Activa</option>
                        <option value="INACTIVA">Inactiva</option>
                    </select>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Crear MasterKey</button>
                </div>
            </form>
        `});

        // Toggle target fields based on level
        document.getElementById('mk-level').onchange = (e) => {
            const level = e.target.value;
            document.getElementById('mk-target-house-group').style.display = level === 'HOUSE' ? '' : 'none';
            document.getElementById('mk-target-device-group').style.display = level === 'DEVICE' ? '' : 'none';
        };

        document.getElementById('masterkey-form').onsubmit = async (e) => {
            e.preventDefault();
            await this.createMasterkey();
        };
    },

    async createMasterkey() {
        const level = document.getElementById('mk-level').value;
        let levelTarget = '';
        if (level === 'HOUSE') levelTarget = document.getElementById('mk-target-house').value;
        if (level === 'DEVICE') levelTarget = document.getElementById('mk-target-device').value;

        if ((level === 'HOUSE' || level === 'DEVICE') && !levelTarget) {
            Utils.showToast('Debe seleccionar un target para el nivel elegido', 'error');
            return;
        }

        const data = {
            masterkey_id: document.getElementById('mk-id').value.trim(),
            masterkey_level: level,
            level_target: levelTarget,
            state: document.getElementById('mk-state').value
        };

        try {
            const result = await API.createMasterkey(data);
            if (result.success) {
                Utils.showToast('MasterKey creada correctamente', 'success');
                Utils.closeModal();
                await this.loadData();
            } else {
                Utils.showToast(result.error || 'Error al crear masterkey', 'error');
            }
        } catch (error) {
            console.error('Error creating masterkey:', error);
            Utils.showToast('Error de conexión', 'error');
        }
    },

    showEditModal(masterkeyId) {
        if (!Auth.can('masterkeys.edit')) {
            Utils.showToast('No tiene permisos', 'error');
            return;
        }

        const mk = this.masterkeys.find(m => m.masterkey_id === masterkeyId);
        if (!mk) return;

        const housesOptions = this.houses.map(h =>
            `<option value="${h.house_id}" ${mk.level_target === h.house_id ? 'selected' : ''}>${h.house_id} — ${h.house_street || ''} ${h.house_number || ''}</option>`
        ).join('');

        const devicesOptions = this.devices.map(d =>
            `<option value="${d.esp32_id}" ${mk.level_target === d.esp32_id ? 'selected' : ''}>${d.esp32_id} — ${d.location || ''}</option>`
        ).join('');

        Utils.showModal({
            title: `Editar MasterKey: ${masterkeyId}`, content: `
            <form id="masterkey-edit-form">
                <div class="form-group">
                    <label>ID MasterKey</label>
                    <input type="text" value="${Utils.escapeHtml(mk.masterkey_id)}" disabled>
                </div>
                <div class="form-group">
                    <label>Nivel</label>
                    <select id="edit-mk-level">
                        <option value="GLOBAL" ${mk.masterkey_level === 'GLOBAL' ? 'selected' : ''}>🌐 Global</option>
                        <option value="HOUSE" ${mk.masterkey_level === 'HOUSE' ? 'selected' : ''}>🏠 Casa</option>
                        <option value="DEVICE" ${mk.masterkey_level === 'DEVICE' ? 'selected' : ''}>📟 Dispositivo</option>
                    </select>
                </div>
                <div class="form-group" id="edit-mk-target-house-group" style="display:${mk.masterkey_level === 'HOUSE' ? '' : 'none'};">
                    <label>Casa Target</label>
                    <select id="edit-mk-target-house">
                        <option value="">Seleccione casa...</option>
                        ${housesOptions}
                    </select>
                </div>
                <div class="form-group" id="edit-mk-target-device-group" style="display:${mk.masterkey_level === 'DEVICE' ? '' : 'none'};">
                    <label>Dispositivo Target</label>
                    <select id="edit-mk-target-device">
                        <option value="">Seleccione dispositivo...</option>
                        ${devicesOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>Estado</label>
                    <select id="edit-mk-state">
                        <option value="ACTIVA" ${mk.state === 'ACTIVA' ? 'selected' : ''}>Activa</option>
                        <option value="INACTIVA" ${mk.state === 'INACTIVA' ? 'selected' : ''}>Inactiva</option>
                    </select>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar Cambios</button>
                </div>
            </form>
        `});

        document.getElementById('edit-mk-level').onchange = (e) => {
            const level = e.target.value;
            document.getElementById('edit-mk-target-house-group').style.display = level === 'HOUSE' ? '' : 'none';
            document.getElementById('edit-mk-target-device-group').style.display = level === 'DEVICE' ? '' : 'none';
        };

        document.getElementById('masterkey-edit-form').onsubmit = async (e) => {
            e.preventDefault();
            await this.updateMasterkey(masterkeyId);
        };
    },

    async updateMasterkey(masterkeyId) {
        const level = document.getElementById('edit-mk-level').value;
        let levelTarget = '';
        if (level === 'HOUSE') levelTarget = document.getElementById('edit-mk-target-house').value;
        if (level === 'DEVICE') levelTarget = document.getElementById('edit-mk-target-device').value;

        const data = {
            masterkey_level: level,
            level_target: levelTarget,
            state: document.getElementById('edit-mk-state').value
        };

        try {
            const result = await API.updateMasterkey(masterkeyId, data);
            if (result.success) {
                Utils.showToast('MasterKey actualizada correctamente', 'success');
                Utils.closeModal();
                await this.loadData();
            } else {
                Utils.showToast(result.error || 'Error al actualizar masterkey', 'error');
            }
        } catch (error) {
            console.error('Error updating masterkey:', error);
            Utils.showToast('Error de conexión', 'error');
        }
    },

    async toggleState(masterkeyId, currentState) {
        const newState = currentState === 'ACTIVA' ? 'INACTIVA' : 'ACTIVA';
        try {
            const result = await API.updateMasterkey(masterkeyId, { state: newState });
            if (result.success) {
                Utils.showToast(`MasterKey ${newState === 'ACTIVA' ? 'activada' : 'desactivada'}`, 'success');
                await this.loadData();
            } else {
                Utils.showToast(result.error || 'Error', 'error');
            }
        } catch (error) {
            console.error('Error toggling masterkey:', error);
            Utils.showToast('Error de conexión', 'error');
        }
    },

    async deleteMasterkey(masterkeyId) {
        if (!Auth.can('masterkeys.delete')) {
            Utils.showToast('No tiene permisos', 'error');
            return;
        }

        if (!confirm(`¿Eliminar la masterkey ${masterkeyId}?`)) return;

        try {
            const result = await API.deleteMasterkey(masterkeyId);
            if (result.success) {
                Utils.showToast('MasterKey eliminada correctamente', 'success');
                await this.loadData();
            } else {
                Utils.showToast(result.error || 'Error al eliminar masterkey', 'error');
            }
        } catch (error) {
            console.error('Error deleting masterkey:', error);
            Utils.showToast('Error de conexión', 'error');
        }
    }
};

window.MasterKeys = MasterKeys;
