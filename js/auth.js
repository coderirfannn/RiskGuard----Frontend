function pagePath(fileName) {
    return window.location.pathname.includes('/pages/') ? fileName : `pages/${fileName}`;
}

function hasToken() {
    if (typeof getAuthToken === 'function') {
        return !!getAuthToken();
    }
    return !!(sessionStorage.getItem('token') || localStorage.getItem('token'));
}

function requireAuth() {
    if (!hasToken()) {
        window.location.href = pagePath('login.html');
    }
}

function requireGuest() {
    if (hasToken()) {
        window.location.href = pagePath('dashboard.html');
    }
}

function logout() {
    if (typeof clearAuthToken === 'function') {
        clearAuthToken();
    } else {
        sessionStorage.removeItem('token');
        localStorage.removeItem('token');
    }
    window.location.href = pagePath('login.html');
}

function loadSidebar() {
    const sidebarContainer = document.getElementById('sidebar-container');
    if (!sidebarContainer) return;

    sidebarContainer.innerHTML = `
        <div class="sidebar">
            <h2>RiskGuard</h2>
            <ul>
                <li><a href="dashboard.html">Projects</a></li>
                <li><a href="create-project.html">Create Project</a></li>
                <li><a href="risks.html">All Risks</a></li>
                <li><a href="profile.html">Profile</a></li>
                <li><button class="logout-link" id="logoutBtn" type="button">Logout</button></li>
            </ul>
        </div>
    `;

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}
