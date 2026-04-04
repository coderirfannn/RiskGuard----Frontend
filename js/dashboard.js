document.addEventListener('DOMContentLoaded', () => {
    requireAuth();
    loadSidebar();
    loadDashboard();
});

async function loadDashboard() {
    const loader = document.getElementById('loader');
    const statsGrid = document.getElementById('stats-grid');
    const risksList = document.getElementById('risks-list');
    
    loader.style.display = 'block';

    try {
        const stats = await fetchAPI('/risks/stats');
        document.getElementById('statTotal').textContent = stats.total;
        document.getElementById('statCritical').textContent = stats.highAndCritical;
        document.getElementById('statResolved').textContent = stats.resolved;
        statsGrid.style.display = 'grid';

        const risks = await fetchAPI('/risks');
        
        if (risks.length === 0) {
            risksList.innerHTML = '<p>No risks reported yet.</p>';
        } else {
            risksList.innerHTML = risks.slice(0, 5).map(risk => `
                <div class="card" style="padding: 15px 20px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h3 style="margin:0"><a href="view-risk.html?id=${risk._id}">${risk.title}</a></h3>
                        <span class="badge badge-${risk.impact.toLowerCase()}">${risk.impact} Impact</span>
                    </div>
                    <p style="margin:10px 0 0 0; font-size:14px; color:var(--text-color); opacity:0.8">
                        Status: <strong>${risk.status}</strong> | Created by: ${risk.createdBy ? risk.createdBy.name : 'Unknown'}
                    </p>
                </div>
            `).join('');
        }
    } catch (err) {
        risksList.innerHTML = '<p style="color:var(--danger)">Failed to load data. Please try again.</p>';
    } finally {
        loader.style.display = 'none';
    }
}
