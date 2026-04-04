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
    return project?.name || project?.title || 'Untitled Project';
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
    const riskId = encodeURIComponent(risk._id);
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
                ${escapeHTML(risk.mitigationPlan || 'No mitigation actions provided.')}
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
            name: sanitizeText(document.getElementById('projectName').value),
            description: sanitizeText(document.getElementById('projectDescription').value)
        };

        setStatusMessage('createProjectMessage', '', '');

        if (!payload.name) {
            setStatusMessage('createProjectMessage', 'Project name is required.', 'error');
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

async function initProjectDetail() {
    const projectId = getUrlParam('id');
    if (!projectId) return window.location.href = 'dashboard.html';

    const loader = document.getElementById('loader');
    const projectNameEl = document.getElementById('projectTitle');
    const projectDescriptionEl = document.getElementById('projectDescription');
    const riskGrid = document.getElementById('project-risks-grid');
    const emptyState = document.getElementById('project-empty-state');
    const createRiskBtn = document.getElementById('createRiskBtn');

    try {
        const project = await fetchAPI(`/projects/${projectId}`);
        const risks = await fetchAPI(`/projects/${projectId}/risks`);
        const totalRisks = Array.isArray(risks) ? risks.length : 0;

        projectNameEl.textContent = projectTitle(project);
        projectDescriptionEl.textContent = project?.description || 'No project description provided.';
        document.getElementById('breadcrumbProjectName').textContent = projectTitle(project);
        document.getElementById('projectCreated').textContent = project?.createdAt ? new Date(project.createdAt).toLocaleDateString() : '-';
        document.getElementById('projectRiskCount').textContent = String(totalRisks);
        document.getElementById('projectOwner').textContent = project?.createdBy?.name || project?.owner?.name || 'Unknown';
        createRiskBtn.href = `create-risk.html?projectId=${encodeURIComponent(projectId)}`;

        if (!totalRisks) {
            emptyState.style.display = 'block';
            riskGrid.innerHTML = '';
        } else {
            emptyState.style.display = 'none';
            riskGrid.innerHTML = risks.map((risk) => renderProjectRisk(risk, projectId)).join('');
        }

        loader.style.display = 'none';
        document.getElementById('projectSummary').style.display = 'grid';
        document.getElementById('projectRisksSection').style.display = 'block';
    } catch (err) {
        loader.textContent = err.message || 'Failed to load project.';
    }
}