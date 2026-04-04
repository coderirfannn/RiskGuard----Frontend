function pagePath(fileName) {
    return window.location.pathname.includes('/pages/') ? fileName : `pages/${fileName}`;
}

function requireAuth() {
    if (!localStorage.getItem('token')) {
        window.location.href = pagePath('login.html');
    }
}

function requireGuest() {
    if (localStorage.getItem('token')) {
        window.location.href = pagePath('dashboard.html');
    }
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = pagePath('login.html');
}

function loadSidebar() {
    const sidebarContainer = document.getElementById('sidebar-container');
    if (!sidebarContainer) return;

    sidebarContainer.innerHTML = `
        <div class="sidebar">
            <h2>RiskGuard</h2>
            <ul>
                <li><a href="dashboard.html">Dashboard</a></li>
                <li><a href="risks.html">All Risks</a></li>
                <li><a href="create-risk.html">Report Risk</a></li>
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
