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

function setStatusMessage(targetId, message, type) {
    const target = document.getElementById(targetId);
    if (!target) return;
    target.className = `status-message ${type}`;
    target.textContent = message;
}

function projectTitle(project) {
    return project?.title || project?.name || 'Untitled Project';
}

function projectRiskCount(project) {
    const directCount = project?.riskCount ?? project?.risksCount ?? project?.stats?.riskCount ?? project?.stats?.risks;
    if (typeof directCount === 'number') {
        return directCount;
    }

    if (Array.isArray(project?.risks)) {
        return project.risks.length;
    }

    return 0;
}

function impactBadgeClass(impact) {
    const normalized = String(impact || '').toLowerCase();
    if (normalized === 'low' || normalized === 'medium' || normalized === 'high' || normalized === 'critical') {
        return `badge-${normalized}`;
    }
    return 'badge-medium';
}

function renderProjectRisk(risk, projectId) {
    const riskId = encodeURIComponent(risk?._id || risk?.id || '');
    const riskProjectId = encodeURIComponent(projectId);

    return `
        <div class="card project-card">
            <div class="project-card__header">
                <div class="project-card__meta">
                    <h3 style="margin:0 0 8px 0;"><a href="view-risk.html?id=${riskId}&projectId=${riskProjectId}">${escapeHTML(risk.title || 'Untitled Risk')}</a></h3>
                    <p style="margin:0; color:var(--text-muted);">${escapeHTML(risk.description || 'No description provided.')}</p>
                </div>
                <span class="badge ${impactBadgeClass(risk.impact)}">${escapeHTML(risk.impact || 'Medium')}</span>
            </div>
            <p class="line-clamp-2" style="margin:0; font-size:14px; color:var(--text-color); opacity:0.8;">
                ${escapeHTML(risk.mitigationActions || risk.mitigationPlan || 'No mitigation actions provided.')}
            </p>
            <div class="project-card__footer">
                <span style="color:var(--text-muted); font-size:14px;">Status: <strong>${escapeHTML(risk.status || 'Identified')}</strong></span>
                <a href="view-risk.html?id=${riskId}&projectId=${riskProjectId}" class="btn btn-primary" style="width:auto;">Open Risk</a>
            </div>
        </div>
    `;
}

async function initCreateProjectForm() {
    const form = document.getElementById('createProjectForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById('saveProjectBtn');
        const previousText = saveBtn.textContent;
        const payload = {
            title: sanitizeText(document.getElementById('projectTitle').value),
            description: sanitizeText(document.getElementById('projectDescription').value),
            startDate: document.getElementById('projectStartDate').value,
            endDate: document.getElementById('projectEndDate').value
        };

        setStatusMessage('createProjectMessage', '', '');

        if (!payload.title || !payload.startDate || !payload.endDate) {
            setStatusMessage('createProjectMessage', 'Title, start date, and end date are required.', 'error');
            return;
        }

        if (new Date(payload.startDate) > new Date(payload.endDate)) {
            setStatusMessage('createProjectMessage', 'Start date cannot be after end date.', 'error');
            return;
        }

        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;

        try {
            const createdProject = await fetchAPI('/projects', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            const createdId = createdProject && (createdProject._id || createdProject.id);
            window.location.href = createdId ? `project-detail.html?id=${encodeURIComponent(createdId)}` : 'dashboard.html';
        } catch (err) {
            setStatusMessage('createProjectMessage', err.message || 'Failed to create project.', 'error');
            saveBtn.textContent = previousText;
            saveBtn.disabled = false;
        }
    });
}

function renderProjectMeta(project, totalRisks) {
    document.getElementById('projectTitle').textContent = projectTitle(project);
    document.getElementById('projectDescription').textContent = project?.description || 'No project description provided.';
    document.getElementById('breadcrumbProjectName').textContent = projectTitle(project);
    document.getElementById('projectStartDate').textContent = project?.startDate ? new Date(project.startDate).toLocaleDateString() : '-';
    document.getElementById('projectEndDate').textContent = project?.endDate ? new Date(project.endDate).toLocaleDateString() : '-';
    document.getElementById('projectRiskCount').textContent = String(totalRisks);
}

async function loadProjectRisks(projectId) {
    const riskGrid = document.getElementById('project-risks-grid');
    const emptyState = document.getElementById('project-empty-state');
    const risks = await fetchAPI(`/projects/${projectId}/risks`);
    const totalRisks = Array.isArray(risks) ? risks.length : 0;

    if (!totalRisks) {
        emptyState.style.display = 'block';
        riskGrid.innerHTML = '';
    } else {
        emptyState.style.display = 'none';
        riskGrid.innerHTML = risks.map((risk) => renderProjectRisk(risk, projectId)).join('');
    }

    document.getElementById('projectRiskCount').textContent = String(totalRisks);
    return totalRisks;
}

async function initProjectDetail() {
    const projectId = getUrlParam('id');
    if (!projectId) return window.location.href = 'dashboard.html';

    const loader = document.getElementById('loader');
    const createRiskBtn = document.getElementById('createRiskBtn');
    const createRiskBackdrop = document.getElementById('createRiskBackdrop');
    const createRiskModal = document.getElementById('createRiskModal');
    const closeCreateRiskModalBtn = document.getElementById('closeCreateRiskModalBtn');
    const cancelCreateRiskModalBtn = document.getElementById('cancelCreateRiskModalBtn');
    const createRiskModalForm = document.getElementById('createRiskModalForm');
    const saveRiskModalBtn = document.getElementById('saveRiskModalBtn');

    const openRiskModal = () => {
        setStatusMessage('createRiskModalMessage', '', '');
        createRiskModalForm.reset();
        createRiskModal.hidden = false;
        createRiskBackdrop.hidden = false;
        createRiskModal.setAttribute('aria-hidden', 'false');
    };

    const closeRiskModal = () => {
        createRiskModal.hidden = true;
        createRiskBackdrop.hidden = true;
        createRiskModal.setAttribute('aria-hidden', 'true');
    };

    try {
        const project = await fetchAPI(`/projects/${projectId}`);
        const totalRisks = await loadProjectRisks(projectId);
        renderProjectMeta(project, totalRisks);

        loader.style.display = 'none';
        document.getElementById('projectSummary').style.display = 'grid';
        document.getElementById('projectRisksSection').style.display = 'block';
    } catch (err) {
        loader.textContent = err.message || 'Failed to load project.';
    }

    createRiskBtn.addEventListener('click', openRiskModal);
    closeCreateRiskModalBtn.addEventListener('click', closeRiskModal);
    cancelCreateRiskModalBtn.addEventListener('click', closeRiskModal);
    createRiskBackdrop.addEventListener('click', closeRiskModal);

    createRiskModalForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const payload = {
            title: sanitizeText(document.getElementById('riskTitle').value),
            description: sanitizeText(document.getElementById('riskDescription').value),
            probability: document.getElementById('riskProbability').value,
            impact: document.getElementById('riskImpact').value,
            mitigationActions: sanitizeText(document.getElementById('riskMitigationActions').value),
            mitigationPlan: sanitizeText(document.getElementById('riskMitigationActions').value)
        };

        if (!payload.title || !payload.mitigationActions) {
            setStatusMessage('createRiskModalMessage', 'Title and mitigation actions are required.', 'error');
            return;
        }

        const previousText = saveRiskModalBtn.textContent;
        saveRiskModalBtn.textContent = 'Creating...';
        saveRiskModalBtn.disabled = true;

        try {
            await fetchAPI(`/projects/${projectId}/risks`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            await loadProjectRisks(projectId);
            closeRiskModal();
        } catch (err) {
            setStatusMessage('createRiskModalMessage', err.message || 'Failed to create risk.', 'error');
        } finally {
            saveRiskModalBtn.textContent = previousText;
            saveRiskModalBtn.disabled = false;
        }
    });
}