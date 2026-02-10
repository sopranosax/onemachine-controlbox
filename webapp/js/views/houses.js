/**
 * Houses View for IoT Control WebApp
 * MASTER role only — CRUD for houses with address details
 */

const Houses = {
    houses: [],
    devices: [],

    async load() {
        if (!Auth.can('houses.view')) {
            Utils.showToast('No tiene permisos para ver esta sección', 'error');
            return;
        }

        await this.loadData();
        this.bindEvents();
    },

    bindEvents() {
        const addBtn = document.getElementById('btn-add-house');
        if (addBtn) {
            addBtn.onclick = () => this.showAddModal();
        }
    },

    async loadData() {
        const tbody = document.getElementById('houses-tbody');
        tbody.innerHTML = '<tr><td colspan="5" class="loading-placeholder">Cargando casas...</td></tr>';

        try {
            const [housesRes, devicesRes] = await Promise.all([
                API.getHouses(),
                API.getDevices()
            ]);
            this.houses = housesRes.houses || [];
            this.devices = devicesRes.devices || [];
            this.renderHouses();
        } catch (error) {
            console.error('Error loading houses:', error);
            tbody.innerHTML = '<tr><td colspan="5" class="loading-placeholder">Error al cargar casas</td></tr>';
        }
    },

    getDeviceCountForHouse(houseId) {
        return this.devices.filter(d => d.house_id === houseId).length;
    },

    /**
     * Convert Google Drive sharing URL to direct image URL
     * Supports: /file/d/FILE_ID/view, /open?id=FILE_ID, /uc?id=FILE_ID
     */
    getDriveImageUrl(url) {
        if (!url) return '';
        let fileId = '';
        // Match /file/d/FILE_ID/
        const match1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match1) fileId = match1[1];
        // Match ?id=FILE_ID
        if (!fileId) {
            const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
            if (match2) fileId = match2[1];
        }
        if (fileId) {
            return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
        }
        // Not a Drive URL, return as-is
        return url;
    },

    renderHouses() {
        const tbody = document.getElementById('houses-tbody');

        if (!this.houses || this.houses.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5">
                        <div class="empty-state">
                            <div class="empty-state-icon">🏘️</div>
                            <p class="empty-state-title">Sin casas registradas</p>
                            <p class="empty-state-message">Agregue casas para organizar sus dispositivos</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.houses.map(h => {
            const address = [h.house_street, h.house_number, h.house_extra].filter(Boolean).join(' ');
            const devCount = this.getDeviceCountForHouse(h.house_id);
            const imgSrc = this.getDriveImageUrl(h.house_img || '');
            const imgHtml = imgSrc
                ? `<img src="${imgSrc}" alt="${h.house_id}" style="width:48px;height:48px;border-radius:8px;object-fit:cover;" onerror="this.outerHTML='<span style=font-size:1.5rem>🏠</span>'">`
                : '<span style="font-size:1.5rem;">🏠</span>';

            return `
                <tr>
                    <td><strong>${Utils.escapeHtml(h.house_id)}</strong></td>
                    <td>${imgHtml}</td>
                    <td>
                        ${Utils.escapeHtml(address || 'Sin dirección')}
                        ${h.house_postcode ? `<br><small style="color:var(--text-secondary);">CP: ${Utils.escapeHtml(h.house_postcode)}</small>` : ''}
                    </td>
                    <td>
                        <span class="status-badge ${devCount > 0 ? 'status-active' : 'status-inactive'}">
                            ${devCount} dispositivo${devCount !== 1 ? 's' : ''}
                        </span>
                    </td>
                    <td class="actions-cell">
                        <button class="btn btn-sm btn-secondary" onclick="Houses.showEditModal('${h.house_id}')">
                            ✏️ Editar
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="Houses.deleteHouse('${h.house_id}')">
                            🗑️ Eliminar
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    showAddModal() {
        if (!Auth.can('houses.create')) {
            Utils.showToast('No tiene permisos', 'error');
            return;
        }

        Utils.showModal({
            title: 'Nueva Casa', content: `
            <form id="house-form">
                <div class="form-group">
                    <label>ID de Casa *</label>
                    <input type="text" id="house-id" placeholder="BES_522" pattern="[A-Z]{3}_[0-9]{1,5}" required>
                    <small>Formato: 3 letras mayúsculas + _ + hasta 5 dígitos</small>
                </div>
                <div class="form-group">
                    <label>Imagen URL (Google Drive)</label>
                    <input type="text" id="house-img" placeholder="https://drive.google.com/...">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Calle</label>
                        <input type="text" id="house-street" placeholder="Av. Las Condes">
                    </div>
                    <div class="form-group">
                        <label>Número</label>
                        <input type="text" id="house-number" placeholder="12450">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Depto/Extra</label>
                        <input type="text" id="house-extra" placeholder="Depto 301">
                    </div>
                    <div class="form-group">
                        <label>Código Postal</label>
                        <input type="text" id="house-postcode" placeholder="7550000">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Latitud</label>
                        <input type="text" id="house-lat" placeholder="-33.4080">
                    </div>
                    <div class="form-group">
                        <label>Longitud</label>
                        <input type="text" id="house-long" placeholder="-70.5670">
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Crear Casa</button>
                </div>
            </form>
        `});

        document.getElementById('house-form').onsubmit = async (e) => {
            e.preventDefault();
            await this.createHouse();
        };
    },

    async createHouse() {
        const data = {
            house_id: document.getElementById('house-id').value.trim(),
            house_img: document.getElementById('house-img').value.trim(),
            house_street: document.getElementById('house-street').value.trim(),
            house_number: document.getElementById('house-number').value.trim(),
            house_extra: document.getElementById('house-extra').value.trim(),
            house_postcode: document.getElementById('house-postcode').value.trim(),
            house_lat: document.getElementById('house-lat').value.trim(),
            house_long: document.getElementById('house-long').value.trim()
        };

        try {
            const result = await API.createHouse(data);
            if (result.success) {
                Utils.showToast('Casa creada correctamente', 'success');
                Utils.closeModal();
                await this.loadData();
            } else {
                Utils.showToast(result.error || 'Error al crear casa', 'error');
            }
        } catch (error) {
            console.error('Error creating house:', error);
            Utils.showToast('Error de conexión', 'error');
        }
    },

    showEditModal(houseId) {
        if (!Auth.can('houses.edit')) {
            Utils.showToast('No tiene permisos', 'error');
            return;
        }

        const house = this.houses.find(h => h.house_id === houseId);
        if (!house) return;

        Utils.showModal({
            title: `Editar Casa: ${houseId}`, content: `
            <form id="house-edit-form">
                <div class="form-group">
                    <label>ID de Casa</label>
                    <input type="text" value="${Utils.escapeHtml(house.house_id)}" disabled>
                </div>
                <div class="form-group">
                    <label>Imagen URL (Google Drive)</label>
                    <input type="text" id="edit-house-img" value="${Utils.escapeHtml(house.house_img || '')}">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Calle</label>
                        <input type="text" id="edit-house-street" value="${Utils.escapeHtml(house.house_street || '')}">
                    </div>
                    <div class="form-group">
                        <label>Número</label>
                        <input type="text" id="edit-house-number" value="${Utils.escapeHtml(house.house_number || '')}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Depto/Extra</label>
                        <input type="text" id="edit-house-extra" value="${Utils.escapeHtml(house.house_extra || '')}">
                    </div>
                    <div class="form-group">
                        <label>Código Postal</label>
                        <input type="text" id="edit-house-postcode" value="${Utils.escapeHtml(house.house_postcode || '')}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Latitud</label>
                        <input type="text" id="edit-house-lat" value="${house.house_lat || ''}">
                    </div>
                    <div class="form-group">
                        <label>Longitud</label>
                        <input type="text" id="edit-house-long" value="${house.house_long || ''}">
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Utils.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar Cambios</button>
                </div>
            </form>
        `});

        document.getElementById('house-edit-form').onsubmit = async (e) => {
            e.preventDefault();
            await this.updateHouse(houseId);
        };
    },

    async updateHouse(houseId) {
        const data = {
            house_img: document.getElementById('edit-house-img').value.trim(),
            house_street: document.getElementById('edit-house-street').value.trim(),
            house_number: document.getElementById('edit-house-number').value.trim(),
            house_extra: document.getElementById('edit-house-extra').value.trim(),
            house_postcode: document.getElementById('edit-house-postcode').value.trim(),
            house_lat: document.getElementById('edit-house-lat').value.trim(),
            house_long: document.getElementById('edit-house-long').value.trim()
        };

        try {
            const result = await API.updateHouse(houseId, data);
            if (result.success) {
                Utils.showToast('Casa actualizada correctamente', 'success');
                Utils.closeModal();
                await this.loadData();
            } else {
                Utils.showToast(result.error || 'Error al actualizar casa', 'error');
            }
        } catch (error) {
            console.error('Error updating house:', error);
            Utils.showToast('Error de conexión', 'error');
        }
    },

    async deleteHouse(houseId) {
        if (!Auth.can('houses.delete')) {
            Utils.showToast('No tiene permisos', 'error');
            return;
        }

        const devCount = this.getDeviceCountForHouse(houseId);
        if (devCount > 0) {
            Utils.showToast(`No se puede eliminar: la casa tiene ${devCount} dispositivo(s) asignado(s)`, 'error');
            return;
        }

        if (!confirm(`¿Eliminar la casa ${houseId}?`)) return;

        try {
            const result = await API.deleteHouse(houseId);
            if (result.success) {
                Utils.showToast('Casa eliminada correctamente', 'success');
                await this.loadData();
            } else {
                Utils.showToast(result.error || 'Error al eliminar casa', 'error');
            }
        } catch (error) {
            console.error('Error deleting house:', error);
            Utils.showToast('Error de conexión', 'error');
        }
    }
};

window.Houses = Houses;
