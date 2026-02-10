/**
 * Houses View for IoT Control WebApp
 * MASTER: full CRUD + detail view for all houses
 * ADMIN: view only assigned houses + detail view
 */

const Houses = {
    houses: [],
    devices: [],
    admins: [],          // All admins (ADMIN role only)
    adminHouses: [],     // All admin-house assignments [{admin_email, house_id}]
    _pendingImg: '',

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
            // Only MASTER can create houses
            addBtn.style.display = Auth.can('houses.create') ? '' : 'none';
            addBtn.onclick = () => this.showAddModal();
        }
    },

    async loadData() {
        const tbody = document.getElementById('houses-tbody');
        tbody.innerHTML = '<tr><td colspan="6" class="loading-placeholder">Cargando casas...</td></tr>';

        try {
            const [housesRes, devicesRes, adminsRes, ahRes] = await Promise.all([
                API.getHouses(),
                API.getDevices(),
                API.getAdmins(),
                API.getAllAdminHouses()
            ]);

            this.adminHouses = ahRes.assignments || [];
            this.devices = devicesRes.devices || [];
            // Only keep ADMIN-role users (not MASTER, not VIEWER)
            this.admins = (adminsRes.admins || []).filter(a => a.role === 'ADMIN' && a.status === 'ACTIVO');

            let allHouses = housesRes.houses || [];

            // ADMIN: filter to only assigned houses
            if (Auth.hasRole(Config.ROLES.ADMIN) && !Auth.isMaster()) {
                const myEmail = Auth.getEmail();
                const myHouseIds = this.adminHouses
                    .filter(a => a.admin_email === myEmail)
                    .map(a => a.house_id);
                allHouses = allHouses.filter(h => myHouseIds.includes(h.house_id));
            }

            this.houses = allHouses;
            this.renderHouses();
        } catch (error) {
            console.error('Error loading houses:', error);
            tbody.innerHTML = '<tr><td colspan="6" class="loading-placeholder">Error al cargar casas</td></tr>';
        }
    },

    getDeviceCountForHouse(houseId) {
        return this.devices.filter(d => d.house_id === houseId).length;
    },

    getDevicesForHouse(houseId) {
        return this.devices.filter(d => d.house_id === houseId);
    },

    /**
     * Get the admin email assigned to a house (or empty string)
     */
    getAdminForHouse(houseId) {
        const assignment = this.adminHouses.find(a => a.house_id === houseId);
        return assignment ? assignment.admin_email : '';
    },

    /**
     * Build admin <select> options HTML.
     */
    buildAdminSelectHtml(selectId, selectedEmail) {
        const options = this.admins.map(a => {
            const sel = a.admin_email === selectedEmail ? 'selected' : '';
            return `<option value="${Utils.escapeHtml(a.admin_email)}" ${sel}>${Utils.escapeHtml(a.admin_email)}</option>`;
        }).join('');
        return `<select id="${selectId}" class="form-select" style="min-width:140px;">
                    <option value="" ${!selectedEmail ? 'selected' : ''}>— Sin asignar —</option>
                    ${options}
                </select>`;
    },

    /**
     * Render the houses table
     */
    renderHouses() {
        const tbody = document.getElementById('houses-tbody');
        const isMaster = Auth.isMaster();

        if (!this.houses || this.houses.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="empty-state">
                            <div class="empty-state-icon">🏘️</div>
                            <p class="empty-state-title">Sin casas registradas</p>
                            <p class="empty-state-message">${isMaster ? 'Agregue casas para organizar sus dispositivos' : 'No tiene casas asignadas'}</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.houses.map(h => {
            const address = [h.house_street, h.house_number, h.house_extra].filter(Boolean).join(' ');
            const devCount = this.getDeviceCountForHouse(h.house_id);
            const adminEmail = this.getAdminForHouse(h.house_id);
            const imgSrc = h.house_img || '';
            const imgHtml = imgSrc
                ? `<img src="${imgSrc}" alt="${h.house_id}" style="width:48px;height:48px;border-radius:8px;object-fit:cover;" onerror="this.outerHTML='<span style=font-size:1.5rem>🏠</span>'">`
                : '<span style="font-size:1.5rem;">🏠</span>';

            // Admin column: MASTER sees dropdown, ADMIN sees text
            let adminCell = '';
            if (isMaster) {
                const adminSelectId = `admin-select-${h.house_id.replace(/[^a-zA-Z0-9]/g, '_')}`;
                const adminOptions = this.admins.map(a => {
                    const sel = a.admin_email === adminEmail ? 'selected' : '';
                    return `<option value="${Utils.escapeHtml(a.admin_email)}" ${sel}>${Utils.escapeHtml(a.admin_email)}</option>`;
                }).join('');
                adminCell = `
                    <select id="${adminSelectId}" class="form-select" style="min-width:140px;font-size:0.85rem;padding:4px 8px;"
                        onchange="Houses.assignAdmin('${h.house_id}', this.value)">
                        <option value="" ${!adminEmail ? 'selected' : ''}>— Sin asignar —</option>
                        ${adminOptions}
                    </select>`;
            } else {
                adminCell = adminEmail ? Utils.escapeHtml(adminEmail) : '<span style="color:var(--text-secondary);">—</span>';
            }

            // Action buttons: Ver for all, Editar/Eliminar for MASTER only
            let actions = `
                <button class="btn btn-sm btn-secondary" onclick="Houses.showDetail('${h.house_id}')" title="Ver detalle">
                    👁️ Ver
                </button>
            `;
            if (isMaster) {
                actions += `
                    <button class="btn btn-sm btn-secondary" onclick="Houses.showEditModal('${h.house_id}')" title="Editar">
                        ✏️
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="Houses.deleteHouse('${h.house_id}')" title="Eliminar">
                        🗑️
                    </button>
                `;
            }

            return `
                <tr>
                    <td><strong>${Utils.escapeHtml(h.house_id)}</strong></td>
                    <td>${imgHtml}</td>
                    <td>
                        ${Utils.escapeHtml(address || 'Sin dirección')}
                        ${h.house_postcode ? `<br><small style="color:var(--text-secondary);">CP: ${Utils.escapeHtml(h.house_postcode)}</small>` : ''}
                    </td>
                    <td>${adminCell}</td>
                    <td>
                        <span class="status-badge ${devCount > 0 ? 'status-active' : 'status-inactive'}">
                            ${devCount} dispositivo${devCount !== 1 ? 's' : ''}
                        </span>
                    </td>
                    <td class="actions-cell" style="white-space:nowrap;">
                        ${actions}
                    </td>
                </tr>
            `;
        }).join('');
    },

    // ==================== DETAIL VIEW ====================

    /**
     * Show house detail page
     */
    showDetail(houseId) {
        const house = this.houses.find(h => h.house_id === houseId);
        if (!house) {
            Utils.showToast('Casa no encontrada', 'error');
            return;
        }

        // Hide houses table, show detail section
        document.getElementById('page-houses').classList.add('hidden');
        document.getElementById('page-house-detail').classList.remove('hidden');

        // Set title
        document.getElementById('house-detail-title').textContent = `Casa: ${house.house_id}`;

        // Build detail
        const adminEmail = this.getAdminForHouse(houseId);
        const houseDevices = this.getDevicesForHouse(houseId);
        const fullAddress = [house.house_street, house.house_number, house.house_extra].filter(Boolean).join(' ');
        const imgSrc = house.house_img || '';
        const imgHtml = imgSrc
            ? `<img src="${imgSrc}" alt="${house.house_id}" style="width:120px;height:120px;border-radius:12px;object-fit:cover;" onerror="this.outerHTML='<span style=font-size:3rem>🏠</span>'">`
            : '<span style="font-size:3rem;">🏠</span>';

        const isMaster = Auth.isMaster();

        const container = document.getElementById('house-detail-content');
        container.innerHTML = `
            <div class="device-detail-grid">
                <div class="detail-section">
                    <h3 style="margin:0 0 16px 0;color:var(--text-primary);font-size:1.1rem;">🏠 Información de la Casa</h3>
                    <div style="text-align:center;margin-bottom:16px;">
                        ${imgHtml}
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">ID Casa</span>
                        <span class="detail-value"><strong>${Utils.escapeHtml(house.house_id)}</strong></span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Dirección</span>
                        <span class="detail-value">${Utils.escapeHtml(fullAddress || 'Sin dirección')}</span>
                    </div>
                    ${house.house_postcode ? `
                    <div class="detail-row">
                        <span class="detail-label">Código Postal</span>
                        <span class="detail-value">${Utils.escapeHtml(house.house_postcode)}</span>
                    </div>
                    ` : ''}
                    <div class="detail-row">
                        <span class="detail-label">Administrador</span>
                        <span class="detail-value">
                            ${adminEmail
                ? `<span class="status-badge status-active" style="font-size:0.85rem;">👤 ${Utils.escapeHtml(adminEmail)}</span>`
                : '<span style="color:var(--text-secondary);">Sin asignar</span>'}
                        </span>
                    </div>
                </div>

                <div class="detail-section">
                    <h3 style="margin:0 0 16px 0;color:var(--text-primary);font-size:1.1rem;">🗺️ Ubicación</h3>
                    <div class="detail-row">
                        <span class="detail-label">Latitud</span>
                        <span class="detail-value">${house.house_lat || '—'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Longitud</span>
                        <span class="detail-value">${house.house_long || '—'}</span>
                    </div>
                    <div style="margin-top:16px;padding:24px;background:var(--color-gray-100, #f3f4f6);border-radius:8px;text-align:center;color:var(--text-secondary);">
                        <span style="font-size:2rem;">🗺️</span>
                        <p style="margin:8px 0 0 0;font-size:0.9rem;">Mapa próximamente</p>
                        ${house.house_lat && house.house_long ? `<p style="margin:4px 0 0 0;font-size:0.8rem;">📍 ${house.house_lat}, ${house.house_long}</p>` : ''}
                    </div>
                </div>

                <div class="detail-section" style="grid-column: 1 / -1;">
                    <h3 style="margin:0 0 16px 0;color:var(--text-primary);font-size:1.1rem;">📟 Dispositivos en esta Casa (${houseDevices.length})</h3>
                    ${houseDevices.length > 0 ? `
                    <div class="table-container" style="margin:0;">
                        <table class="data-table" style="margin:0;">
                            <thead>
                                <tr>
                                    <th>ID Dispositivo</th>
                                    <th>Ubicación</th>
                                    <th>Tipo</th>
                                    <th>Estado</th>
                                    <th>Conexión</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${houseDevices.map(d => {
                    const isOnline = Utils.isDeviceOnline(d.last_seen);
                    const statusClass = isOnline ? 'online' : 'offline';
                    const statusText = isOnline ? 'Online' : 'Offline';
                    const isActive = d.active === true || d.active === 'TRUE' || d.active === 'true';
                    const activeText = isActive ? 'Activo' : 'Inactivo';
                    const activeBadge = isActive ? 'status-active' : 'status-inactive';
                    return `
                                        <tr>
                                            <td><strong>${Utils.escapeHtml(d.esp32_id)}</strong></td>
                                            <td>${Utils.escapeHtml(d.location || '—')}</td>
                                            <td>${Utils.escapeHtml(d.token_type || '—')}</td>
                                            <td><span class="status-badge ${activeBadge}">${activeText}</span></td>
                                            <td>
                                                <span style="display:inline-flex;align-items:center;gap:6px;">
                                                    <span class="status-dot ${statusClass}"></span>
                                                    ${statusText}
                                                </span>
                                            </td>
                                        </tr>
                                    `;
                }).join('')}
                            </tbody>
                        </table>
                    </div>
                    ` : `
                    <div style="text-align:center;padding:24px;color:var(--text-secondary);">
                        <span style="font-size:2rem;">📟</span>
                        <p style="margin:8px 0 0 0;">No hay dispositivos en esta casa</p>
                    </div>
                    `}
                </div>
            </div>
            ${isMaster ? `
            <div style="display:flex;gap:12px;margin-top:24px;justify-content:flex-end;">
                <button class="btn btn-secondary" onclick="Houses.showEditModal('${house.house_id}')">
                    ✏️ Editar Casa
                </button>
            </div>
            ` : ''}
        `;
    },

    /**
     * Navigate back to houses list
     */
    backToList() {
        document.getElementById('page-house-detail').classList.add('hidden');
        document.getElementById('page-houses').classList.remove('hidden');
    },

    // ==================== MODALS ====================

    showAddModal() {
        if (!Auth.can('houses.create')) {
            Utils.showToast('No tiene permisos', 'error');
            return;
        }

        const adminSelectHtml = this.buildAdminSelectHtml('house-admin', '');

        Utils.showModal({
            title: 'Nueva Casa', content: `
            <form id="house-form">
                <div class="form-group">
                    <label>ID de Casa *</label>
                    <input type="text" id="house-id" placeholder="BES_522" pattern="[A-Z]{3}_[0-9]{1,5}" required>
                    <small>Formato: 3 letras mayúsculas + _ + hasta 5 dígitos</small>
                </div>
                <div class="form-group">
                    <label>Imagen de la Casa</label>
                    <input type="file" id="house-img-file" accept="image/*" style="margin-bottom:8px;">
                    <div id="house-img-preview" style="margin-top:6px;"></div>
                </div>
                <div class="form-group">
                    <label>Administrador</label>
                    ${adminSelectHtml}
                    <small style="color:var(--text-secondary);">ADMIN responsable de esta casa</small>
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

        this._pendingImg = '';
        document.getElementById('house-img-file').onchange = (e) => this.handleImageUpload(e, 'house-img-preview');

        document.getElementById('house-form').onsubmit = async (e) => {
            e.preventDefault();
            await this.createHouse();
        };
    },

    /**
     * Read an image file, resize to max 120px, and convert to base64 JPEG.
     */
    handleImageUpload(event, previewId) {
        const file = event.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            Utils.showToast('Seleccione un archivo de imagen', 'error');
            return;
        }
        const preview = document.getElementById(previewId);
        if (preview) preview.innerHTML = '<span style="color:var(--text-secondary);">Procesando imagen...</span>';

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const MAX = 120;
                let w = img.width, h = img.height;
                if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
                else { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
                this._pendingImg = dataUrl;
                if (preview) {
                    preview.innerHTML = `<img src="${dataUrl}" style="width:80px;height:80px;border-radius:8px;object-fit:cover;">
                        <br><small style="color:var(--text-secondary);">${Math.round(dataUrl.length / 1024)}KB</small>`;
                }
                if (dataUrl.length > 45000) {
                    Utils.showToast('Imagen muy grande, intente una más pequeña', 'warning');
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    },

    async createHouse() {
        const houseId = document.getElementById('house-id').value.trim();
        const adminEmail = document.getElementById('house-admin').value;

        const data = {
            house_id: houseId,
            house_img: this._pendingImg,
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
                if (adminEmail) {
                    await API.assignHouseAdmin(houseId, adminEmail);
                }
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

        const currentAdmin = this.getAdminForHouse(houseId);
        const adminSelectHtml = this.buildAdminSelectHtml('edit-house-admin', currentAdmin);

        Utils.showModal({
            title: `Editar Casa: ${houseId}`, content: `
            <form id="house-edit-form">
                <div class="form-group">
                    <label>ID de Casa</label>
                    <input type="text" value="${Utils.escapeHtml(house.house_id)}" disabled>
                </div>
                <div class="form-group">
                    <label>Imagen de la Casa</label>
                    <input type="file" id="edit-house-img-file" accept="image/*" style="margin-bottom:8px;">
                    <div id="edit-house-img-preview" style="margin-top:6px;">${house.house_img
                    ? `<img src="${house.house_img}" style="width:80px;height:80px;border-radius:8px;object-fit:cover;">`
                    : '<span style="color:var(--text-secondary);">Sin imagen</span>'
                }</div>
                    <small style="color:var(--text-secondary);">Seleccione nueva imagen para reemplazar</small>
                </div>
                <div class="form-group">
                    <label>Administrador</label>
                    ${adminSelectHtml}
                    <small style="color:var(--text-secondary);">ADMIN responsable de esta casa</small>
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

        this._pendingImg = house.house_img || '';
        document.getElementById('edit-house-img-file').onchange = (e) => this.handleImageUpload(e, 'edit-house-img-preview');

        document.getElementById('house-edit-form').onsubmit = async (e) => {
            e.preventDefault();
            await this.updateHouse(houseId);
        };
    },

    async updateHouse(houseId) {
        const adminEmail = document.getElementById('edit-house-admin').value;

        const data = {
            house_img: this._pendingImg,
            house_street: document.getElementById('edit-house-street').value.trim(),
            house_number: document.getElementById('edit-house-number').value.trim(),
            house_extra: document.getElementById('edit-house-extra').value.trim(),
            house_postcode: document.getElementById('edit-house-postcode').value.trim(),
            house_lat: document.getElementById('edit-house-lat').value.trim(),
            house_long: document.getElementById('edit-house-long').value.trim()
        };

        try {
            const [updateResult] = await Promise.all([
                API.updateHouse(houseId, data),
                API.assignHouseAdmin(houseId, adminEmail)
            ]);
            if (updateResult.success) {
                Utils.showToast('Casa actualizada correctamente', 'success');
                Utils.closeModal();
                // If detail view is open, refresh it
                const detailPage = document.getElementById('page-house-detail');
                if (detailPage && !detailPage.classList.contains('hidden')) {
                    await this.loadData();
                    this.showDetail(houseId);
                } else {
                    await this.loadData();
                }
            } else {
                Utils.showToast(updateResult.error || 'Error al actualizar casa', 'error');
            }
        } catch (error) {
            console.error('Error updating house:', error);
            Utils.showToast('Error de conexión', 'error');
        }
    },

    /**
     * Assign an admin to a house (inline from table dropdown)
     */
    async assignAdmin(houseId, adminEmail) {
        try {
            const result = await API.assignHouseAdmin(houseId, adminEmail);
            if (result.success) {
                this.adminHouses = this.adminHouses.filter(a => a.house_id !== houseId);
                if (adminEmail) {
                    this.adminHouses.push({ admin_email: adminEmail, house_id: houseId });
                }
                Utils.showToast(
                    adminEmail
                        ? `Admin ${adminEmail} asignado a ${houseId}`
                        : `Admin desasignado de ${houseId}`,
                    'success'
                );
            } else {
                Utils.showToast(result.error || 'Error al asignar admin', 'error');
                await this.loadData();
            }
        } catch (error) {
            console.error('Error assigning admin:', error);
            Utils.showToast('Error de conexión', 'error');
            await this.loadData();
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
            await API.assignHouseAdmin(houseId, '');
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
