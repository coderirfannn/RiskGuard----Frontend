document.addEventListener('DOMContentLoaded', () => {
    requireAuth();
    loadSidebar();
    loadProjectDashboard();
});

function escapeHTML(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function impactBadgeClass(impact) {
    const normalized = String(impact || '').toLowerCase();
    if (normalized === 'low' || normalized === 'medium' || normalized === 'high' || normalized === 'critical') {
        return `badge-${normalized}`;
    }
    return 'badge-medium';
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

async function loadProjectDashboard() {
    const loader = document.getElementById('loader');
    const statsGrid = document.getElementById('stats-grid');
    const projectsList = document.getElementById('projects-list');
    
    loader.style.display = 'block';

    try {
        const projects = await fetchAPI('/projects');
        const totalProjects = Array.isArray(projects) ? projects.length : 0;
        const totalRisks = Array.isArray(projects)
            ? projects.reduce((sum, project) => sum + projectRiskCount(project), 0)
            : 0;

        document.getElementById('statProjects').textContent = totalProjects;
        document.getElementById('statRisks').textContent = totalRisks;
        statsGrid.style.display = 'grid';

        if (totalProjects === 0) {
            projectsList.innerHTML = `
                <div class="empty-state">
                    <h3>No projects yet</h3>
                    <p>Create your first project before adding any risks.</p>
                    <a href="create-project.html" class="btn btn-primary" style="width:auto;">Create Project</a>
                </div>
            `;
        } else {
            projectsList.innerHTML = projects.map(project => {
                const riskCount = projectRiskCount(project);
                return `
                    <div class="card project-card">
                        <div class="project-card__header">
                            <div class="project-card__meta">
                                <h3 style="margin:0 0 8px 0;"><a href="project-detail.html?id=${encodeURIComponent(project._id)}">${escapeHTML(project.name || project.title || 'Untitled Project')}</a></h3>
                                <p style="margin:0; color:var(--text-muted);">${escapeHTML(project.description || 'No description provided.')}</p>
                            </div>
                            <span class="badge badge-medium">${riskCount} risk${riskCount === 1 ? '' : 's'}</span>
                        </div>
                        <div class="project-card__footer">
                            <span style="color:var(--text-muted); font-size:14px;">Created ${escapeHTML(project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'recently')}</span>
                            <a href="project-detail.html?id=${encodeURIComponent(project._id)}" class="btn btn-primary" style="width:auto;">Open Project</a>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (err) {
        projectsList.innerHTML = '<p style="color:var(--danger)">Failed to load projects. Please try again.</p>';
    } finally {
        loader.style.display = 'none';
    }
}
