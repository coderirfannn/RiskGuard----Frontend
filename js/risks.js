// Shared Risk Logic

function getUrlParam(param) {
    const params = new URLSearchParams(window.location.search);
    return params.get(param);
}

function escapeHTML(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function sanitizeText(value) {
    return String(value || '').trim();
}

function impactBadgeClass(impact) {
    const normalized = String(impact || '').toLowerCase();
    if (normalized === 'low' || normalized === 'medium' || normalized === 'high' || normalized === 'critical') {
        return `badge-${normalized}`;
    }
    return 'badge-medium';
}

function setStatusMessage(targetId, message, type) {
    const target = document.getElementById(targetId);
    if (!target) return;
    target.className = `status-message ${type}`;
    target.textContent = message;
}

// 1. Create Risk
function initCreateForm() {
    const form = document.getElementById('createRiskForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('saveBtn');
        btn.textContent = 'Saving...';
        btn.disabled = true;

        const payload = {
            title: sanitizeText(document.getElementById('title').value),
            description: sanitizeText(document.getElementById('description').value),
            probability: document.getElementById('probability').value,
            impact: document.getElementById('impact').value,
            mitigationPlan: sanitizeText(document.getElementById('mitigationPlan').value)
        };

        if (!payload.title || !payload.mitigationPlan) {
            setStatusMessage('createFormMessage', 'Title and mitigation plan are required.', 'error');
            btn.textContent = 'Save Risk';
            btn.disabled = false;
            return;
        }

        try {
            await fetchAPI('/risks', { method: 'POST', body: JSON.stringify(payload) });
            window.location.href = 'dashboard.html';
        } catch (err) {
            setStatusMessage('createFormMessage', err.message || 'Failed to create risk.', 'error');
            btn.textContent = 'Save Risk';
            btn.disabled = false;
        }
    });
}

// 2. View Risk
async function initViewRisk() {
    const id = getUrlParam('id');
    if (!id) return window.location.href = '404.html';

    const loader = document.getElementById('loader');
    const details = document.getElementById('detailsWrapper');
    document.getElementById('editBtn').href = `update-risk.html?id=${id}`;
    document.getElementById('historyBtn').href = `history.html?id=${id}`;

    try {
        const risk = await fetchAPI(`/risks/${id}`);
        document.getElementById('riskTitle').textContent = risk.title;
        document.getElementById('riskId').textContent = `ID: ${risk._id}`;
        document.getElementById('riskDesc').textContent = risk.description || 'No description provided.';
        document.getElementById('riskMitigation').textContent = risk.mitigationPlan;
        
        const statusEl = document.getElementById('riskStatus');
        statusEl.textContent = risk.status;
        statusEl.className = `badge badge-${risk.status.toLowerCase() === 'resolved' ? 'success' : 'medium'}`;

        document.getElementById('riskProb').textContent = risk.probability;
        const impactEl = document.getElementById('riskImpact');
        impactEl.textContent = risk.impact;
        impactEl.className = `badge badge-${risk.impact.toLowerCase()}`;
        
        document.getElementById('riskCreator').textContent = risk.createdBy ? risk.createdBy.name : 'Unknown';
        document.getElementById('riskDate').textContent = new Date(risk.createdAt).toLocaleDateString();

        document.getElementById('quickStatusUpdate').value = risk.status;

        loader.style.display = 'none';
        details.style.display = 'grid';
    } catch (err) {
        document.getElementById('riskTitle').textContent = 'Risk not found';
        loader.textContent = 'Could not load risk.';
    }

    // Status Update Binding
    document.getElementById('updateStatusBtn').addEventListener('click', async () => {
        const updateBtn = document.getElementById('updateStatusBtn');
        const newStatus = document.getElementById('quickStatusUpdate').value;
        const previousText = updateBtn.textContent;
        updateBtn.textContent = 'Updating...';
        updateBtn.disabled = true;
        try {
            await fetchAPI(`/risks/${id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus })
            });
            setStatusMessage('viewRiskMessage', 'Status updated successfully.', 'success');
            const statusEl = document.getElementById('riskStatus');
            statusEl.textContent = newStatus;
            statusEl.className = `badge badge-${newStatus.toLowerCase() === 'resolved' ? 'success' : 'medium'}`;
        } catch (err) {
            setStatusMessage('viewRiskMessage', err.message || 'Failed to update status.', 'error');
        } finally {
            updateBtn.textContent = previousText;
            updateBtn.disabled = false;
        }
    });
}

// 3. Update Risk
async function initUpdateForm() {
    const id = getUrlParam('id');
    if (!id) return window.location.href = '404.html';

    const form = document.getElementById('updateRiskForm');
    const loader = document.getElementById('loader');

    try {
        const risk = await fetchAPI(`/risks/${id}`);
        document.getElementById('title').value = risk.title;
        document.getElementById('description').value = risk.description || '';
        document.getElementById('probability').value = risk.probability;
        document.getElementById('impact').value = risk.impact;
        document.getElementById('mitigationPlan').value = risk.mitigationPlan;
        
        loader.style.display = 'none';
        form.style.display = 'block';
    } catch (err) {
        loader.textContent = 'Failed to load risk properties.';
    }

    // Handle Save
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById('saveBtn');
        const previousText = saveBtn.textContent;
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;

        const payload = {
            title: sanitizeText(document.getElementById('title').value),
            description: sanitizeText(document.getElementById('description').value),
            probability: document.getElementById('probability').value,
            impact: document.getElementById('impact').value,
            mitigationPlan: sanitizeText(document.getElementById('mitigationPlan').value)
        };

        if (!payload.title || !payload.mitigationPlan) {
            setStatusMessage('updateFormMessage', 'Title and mitigation plan are required.', 'error');
            saveBtn.textContent = previousText;
            saveBtn.disabled = false;
            return;
        }

        try {
            await fetchAPI(`/risks/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
            window.location.href = `view-risk.html?id=${id}`;
        } catch (err) {
            setStatusMessage('updateFormMessage', err.message || 'Failed to update risk.', 'error');
            saveBtn.textContent = previousText;
            saveBtn.disabled = false;
        }
    });

    // Handle Delete
    document.getElementById('delBtn').addEventListener('click', async () => {
        const delBtn = document.getElementById('delBtn');
        if(confirm('Are you sure you want to permanently delete this risk?')) {
            const previousText = delBtn.textContent;
            delBtn.textContent = 'Deleting...';
            delBtn.disabled = true;
            try {
                await fetchAPI(`/risks/${id}`, { method: 'DELETE' });
                window.location.href = 'risks.html';
            } catch (err) {
                setStatusMessage('updateFormMessage', err.message || 'Failed to delete risk.', 'error');
                delBtn.textContent = previousText;
                delBtn.disabled = false;
            }
        }
    });
}

// 4. View History
async function initHistory() {
    const id = getUrlParam('id');
    if (!id) return window.location.href = '404.html';

    document.getElementById('backBtn').href = `view-risk.html?id=${id}`;
    const loader = document.getElementById('loader');
    const timeline = document.getElementById('timelineList');

    try {
        const historyData = await fetchAPI(`/risks/${id}/history`);
        if (historyData.length === 0) {
            loader.textContent = 'No history logs found.';
            return;
        }

        timeline.innerHTML = historyData.map(log => `
            <div class="timeline-item card" style="margin-bottom:15px; padding:15px;">
                <span class="timeline-date">${escapeHTML(new Date(log.changedAt).toLocaleString())}</span>
                <strong>Status changed to: </strong> <span class="badge badge-medium">${escapeHTML(log.status)}</span>
            </div>
        `).join('');

        loader.style.display = 'none';
        timeline.style.display = 'block';
    } catch (err) {
        loader.textContent = 'Failed to load history log.';
    }
}

// 5. Load All Risks
async function loadAllRisks() {
    const loader = document.getElementById('loader');
    const risksGrid = document.getElementById('all-risks-grid');
    loader.style.display = 'block';

    try {
        const risks = await fetchAPI('/risks');
        if (risks.length === 0) {
            risksGrid.innerHTML = '<p>No risks have been reported.</p>';
        } else {
            risksGrid.innerHTML = risks.map(risk => `
                <div class="card">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h3 style="margin:0"><a href="view-risk.html?id=${encodeURIComponent(risk._id)}">${escapeHTML(risk.title)}</a></h3>
                        <span class="badge ${impactBadgeClass(risk.impact)}">${escapeHTML(risk.impact)}</span>
                    </div>
                    <p class="line-clamp-2" style="margin:10px 0; font-size:14px; color:var(--text-color); opacity:0.8;">
                        ${escapeHTML(risk.mitigationPlan)}
                    </p>
                    <div style="font-size:12px; color:var(--text-color); opacity:0.6; margin-top:15px;">
                        Created: ${escapeHTML(new Date(risk.createdAt).toLocaleDateString())}
                    </div>
                </div>
            `).join('');
        }
    } catch (err) {
        risksGrid.innerHTML = '<p style="color:var(--danger)">Failed to load data. Please try again.</p>';
    } finally {
        loader.style.display = 'none';
    }
}
