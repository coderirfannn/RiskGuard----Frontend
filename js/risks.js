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

function projectIdFromRisk(risk) {
    return risk?.project?._id || risk?.projectId || risk?.project || null;
}

function projectNameFromRisk(risk) {
    return risk?.project?.name || risk?.project?.title || risk?.projectName || 'Unknown Project';
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

async function renderRiskHistory(riskId, loader, timeline) {
    loader.style.display = 'block';
    timeline.style.display = 'none';
    try {
        const historyData = await fetchAPI(`/risks/${riskId}/history`);
        if (!Array.isArray(historyData) || historyData.length === 0) {
            loader.textContent = 'No history logs found.';
            return false;
        }

        timeline.innerHTML = historyData.map(log => `
            <div class="timeline-item card" style="margin-bottom:15px; padding:15px;">
                <span class="timeline-date">${escapeHTML(new Date(log.changedAt).toLocaleString())}</span>
                <strong>Status changed to: </strong> <span class="badge badge-medium">${escapeHTML(log.status)}</span>
            </div>
        `).join('');

        loader.style.display = 'none';
        timeline.style.display = 'block';
        return true;
    } catch (err) {
        loader.textContent = 'Failed to load history log.';
        return false;
    }
}

async function updateRiskStatus(id, status) {
    const note = sanitizeText(document.getElementById('modalStatusNote')?.value || '');
    return fetchAPI(`/risks/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, note })
    });
}

// 1. Create Risk
function initCreateForm() {
    const form = document.getElementById('createRiskForm');
    if (!form) return;
    const projectId = getUrlParam('projectId');
    const projectLink = document.getElementById('projectLink');
    const projectName = document.getElementById('projectName');
    const projectContext = document.getElementById('projectContext');

    if (!projectId) {
        setStatusMessage('createFormMessage', 'Create a project first, then open it to add risks.', 'error');
        window.location.href = 'dashboard.html';
        return;
    }

    (async () => {
        try {
            const project = await fetchAPI(`/projects/${projectId}`);
            const projectTitle = project?.name || project?.title || 'Project';
            if (projectLink) {
                projectLink.href = `project-detail.html?id=${encodeURIComponent(projectId)}`;
                projectLink.textContent = projectTitle;
            }
            if (projectName) {
                projectName.textContent = projectTitle;
            }
            if (projectContext) {
                projectContext.textContent = project?.description || 'Risks can only be created inside a project.';
            }
        } catch (err) {
            setStatusMessage('createFormMessage', err.message || 'Unable to load project context.', 'error');
        }
    })();
    
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
            mitigationActions: sanitizeText(document.getElementById('mitigationPlan').value),
            mitigationPlan: sanitizeText(document.getElementById('mitigationPlan').value)
        };

        if (!payload.title || !payload.mitigationPlan) {
            setStatusMessage('createFormMessage', 'Title and mitigation plan are required.', 'error');
            btn.textContent = 'Save Risk';
            btn.disabled = false;
            return;
        }

        try {
            await fetchAPI(`/projects/${projectId}/risks`, { method: 'POST', body: JSON.stringify(payload) });
            window.location.href = `project-detail.html?id=${encodeURIComponent(projectId)}`;
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
    const projectIdParam = getUrlParam('projectId');

    const loader = document.getElementById('loader');
    const details = document.getElementById('detailsWrapper');
    const projectLink = document.getElementById('projectLink');
    const projectName = document.getElementById('projectName');
    const projectDescription = document.getElementById('projectDescription');
    const historyLoader = document.getElementById('historyLoader');
    const historyTimeline = document.getElementById('riskHistoryTimeline');
    const statusModal = document.getElementById('statusModal');
    const statusModalBackdrop = document.getElementById('statusModalBackdrop');
    const modalStatusSelect = document.getElementById('modalStatusSelect');
    const modalStatusNote = document.getElementById('modalStatusNote');
    const confirmStatusBtn = document.getElementById('confirmStatusBtn');
    const closeStatusModalBtn = document.getElementById('closeStatusModalBtn');
    const cancelStatusModalBtn = document.getElementById('cancelStatusModalBtn');

    function openStatusModal(initialStatus) {
        modalStatusSelect.value = initialStatus;
        modalStatusNote.value = '';
        statusModal.hidden = false;
        statusModalBackdrop.hidden = false;
        statusModal.setAttribute('aria-hidden', 'false');
    }

    function closeStatusModal() {
        statusModal.hidden = true;
        statusModalBackdrop.hidden = true;
        statusModal.setAttribute('aria-hidden', 'true');
    }

    try {
        const risk = await fetchAPI(`/risks/${id}`);
        const projectId = projectIdParam || projectIdFromRisk(risk);

        document.getElementById('editBtn').href = `update-risk.html?id=${id}${projectId ? `&projectId=${encodeURIComponent(projectId)}` : ''}`;
        document.getElementById('historyBtn').href = `history.html?id=${id}${projectId ? `&projectId=${encodeURIComponent(projectId)}` : ''}`;
        document.getElementById('riskTitle').textContent = risk.title;
        document.getElementById('riskId').textContent = `ID: ${risk._id}`;
        document.getElementById('riskDesc').textContent = risk.description || 'No description provided.';
        document.getElementById('riskMitigation').textContent = risk.mitigationActions || risk.mitigationPlan || 'No mitigation actions provided.';

        if (projectId) {
            try {
                const project = await fetchAPI(`/projects/${projectId}`);
                const projectTitle = project?.name || project?.title || projectNameFromRisk(risk);
                if (projectLink) {
                    projectLink.href = `project-detail.html?id=${encodeURIComponent(projectId)}`;
                    projectLink.textContent = projectTitle;
                }
                if (projectName) {
                    projectName.textContent = projectTitle;
                }
                if (projectDescription) {
                    projectDescription.textContent = project?.description || `Project linked to ${projectTitle}.`;
                }
            } catch (err) {
                if (projectLink) {
                    projectLink.textContent = projectNameFromRisk(risk);
                    projectLink.href = `project-detail.html?id=${encodeURIComponent(projectId)}`;
                }
                if (projectName) {
                    projectName.textContent = projectNameFromRisk(risk);
                }
                if (projectDescription) {
                    projectDescription.textContent = 'Project details are unavailable.';
                }
            }
        }
        
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

        await renderRiskHistory(id, historyLoader, historyTimeline);

        loader.style.display = 'none';
        details.style.display = 'grid';
        document.getElementById('historySection').style.display = 'block';
    } catch (err) {
        document.getElementById('riskTitle').textContent = 'Risk not found';
        loader.textContent = 'Could not load risk.';
    }

    // Status Update Binding
    document.getElementById('updateStatusBtn').addEventListener('click', async () => {
        openStatusModal(document.getElementById('quickStatusUpdate').value);
    });

    confirmStatusBtn.addEventListener('click', async () => {
        const updateBtn = document.getElementById('updateStatusBtn');
        const newStatus = modalStatusSelect.value;
        const previousText = confirmStatusBtn.textContent;
        confirmStatusBtn.textContent = 'Updating...';
        confirmStatusBtn.disabled = true;
        try {
            await updateRiskStatus(id, newStatus);
            document.getElementById('quickStatusUpdate').value = newStatus;
            setStatusMessage('viewRiskMessage', 'Status updated successfully.', 'success');
            const statusEl = document.getElementById('riskStatus');
            statusEl.textContent = newStatus;
            statusEl.className = `badge badge-${newStatus.toLowerCase() === 'resolved' ? 'success' : 'medium'}`;
            await renderRiskHistory(id, historyLoader, historyTimeline);
            document.getElementById('historySection').style.display = 'block';
            updateBtn.disabled = false;
            closeStatusModal();
        } catch (err) {
            setStatusMessage('viewRiskMessage', err.message || 'Failed to update status.', 'error');
        } finally {
            confirmStatusBtn.textContent = previousText;
            confirmStatusBtn.disabled = false;
        }
    });

    closeStatusModalBtn.addEventListener('click', closeStatusModal);
    cancelStatusModalBtn.addEventListener('click', closeStatusModal);
    statusModalBackdrop.addEventListener('click', closeStatusModal);
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !statusModal.hidden) {
            closeStatusModal();
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
        document.getElementById('mitigationPlan').value = risk.mitigationActions || risk.mitigationPlan || '';
        
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
            mitigationActions: sanitizeText(document.getElementById('mitigationPlan').value),
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
    const projectId = getUrlParam('projectId');

    document.getElementById('backBtn').href = `view-risk.html?id=${id}${projectId ? `&projectId=${encodeURIComponent(projectId)}` : ''}`;
    const loader = document.getElementById('loader');
    const timeline = document.getElementById('timelineList');

    await renderRiskHistory(id, loader, timeline);
}

// 5. Load All Risks
async function loadAllRisks() {
    const loader = document.getElementById('loader');
    const risksGrid = document.getElementById('all-risks-grid');
    loader.style.display = 'block';

    try {
        const risks = await fetchAPI('/risks');
        if (risks.length === 0) {
            risksGrid.innerHTML = '<div class="empty-state"><h3>No risks have been reported.</h3><p>Create a project first, then add risks inside it.</p></div>';
        } else {
            risksGrid.innerHTML = risks.map(risk => `
                <div class="card">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h3 style="margin:0"><a href="view-risk.html?id=${encodeURIComponent(risk._id)}${projectIdFromRisk(risk) ? `&projectId=${encodeURIComponent(projectIdFromRisk(risk))}` : ''}">${escapeHTML(risk.title)}</a></h3>
                        <span class="badge ${impactBadgeClass(risk.impact)}">${escapeHTML(risk.impact)}</span>
                    </div>
                    <p class="line-clamp-2" style="margin:10px 0; font-size:14px; color:var(--text-color); opacity:0.8;">
                        ${escapeHTML(risk.mitigationActions || risk.mitigationPlan || '')}
                    </p>
                    ${projectIdFromRisk(risk) ? `<p style="margin:0 0 10px 0; font-size:13px; color:var(--text-muted);">Project: <a href="project-detail.html?id=${encodeURIComponent(projectIdFromRisk(risk))}">${escapeHTML(projectNameFromRisk(risk))}</a></p>` : `<p style="margin:0 0 10px 0; font-size:13px; color:var(--text-muted);">Project: ${escapeHTML(projectNameFromRisk(risk))}</p>`}
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
