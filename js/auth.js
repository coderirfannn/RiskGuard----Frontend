function requireAuth() {
    if (!localStorage.getItem('token')) {
        window.location.href = '/pages/login.html';
    }
}

function requireGuest() {
    if (localStorage.getItem('token')) {
        window.location.href = '/pages/dashboard.html';
    }
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = '/pages/login.html';
}

function loadSidebar() {
    document.getElementById('sidebar-container').innerHTML = `
        <div class="sidebar">
            <h2>RiskGuard</h2>
            <ul>
                <li><a href="/pages/dashboard.html">Dashboard</a></li>
                <li><a href="/pages/risks.html">All Risks</a></li>
                <li><a href="/pages/create-risk.html">Report Risk</a></li>
                <li><a href="/pages/profile.html">Profile</a></li>
                <li><a href="#" onclick="logout()">Logout</a></li>
            </ul>
        </div>
    `;
}
