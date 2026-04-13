document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');
    const appearanceToggle = document.getElementById('appearanceToggle');

    function setTheme(theme) {
        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
            if (themeIcon) themeIcon.textContent = '🌙'; // Dark mode icon for setting back to dark
            if (themeText) themeText.textContent = 'Dark Mode';
            if (appearanceToggle) appearanceToggle.checked = false;
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'dark');
            if (themeIcon) themeIcon.textContent = '☀️'; // Light mode icon for setting to light
            if (themeText) themeText.textContent = 'Light Mode';
            if (appearanceToggle) appearanceToggle.checked = true;
        }
    }

    // Initialize Theme
    const storedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(storedTheme);

    // Sidebar Toggle
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
            setTheme(currentTheme === 'light' ? 'dark' : 'light');
        });
    }

    // Settings Page Toggle
    if (appearanceToggle) {
        appearanceToggle.addEventListener('change', (e) => {
            setTheme(e.target.checked ? 'dark' : 'light');
        });
    }
});
