const API_URL = "";
let token = localStorage.getItem('access_token');
let currentUser = null;

// DOM Elements
const views = document.querySelectorAll('.view');
const navMenu = document.getElementById('nav-menu');
const adminLink = document.getElementById('admin-link');
const notificationArea = document.getElementById('notification-area');

// Navigation
document.querySelectorAll('a[data-view]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        showView(e.target.dataset.view);
    });
});

document.getElementById('logout-btn').addEventListener('click', (e) => {
    e.preventDefault();
    logout();
});


// Mobile Nav Toggle
const navToggle = document.getElementById('nav-toggle');
if (navToggle) {
    navToggle.addEventListener('click', (e) => {
        // Prevent default might not be strictly necessary for a button, but good practice
        e.stopPropagation();
        navMenu.classList.toggle('mobile-open');
        document.body.classList.toggle('nav-open'); // For burger animation
    });

    // Close nav when clicking a link
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('mobile-open');
            document.body.classList.remove('nav-open');
        });
    });

    // Close nav when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('nav') && !e.target.closest('#nav-toggle') && navMenu.classList.contains('mobile-open')) {
            navMenu.classList.remove('mobile-open');
            document.body.classList.remove('nav-open');
        }
    });
}


function showView(viewId) {
    views.forEach(view => view.classList.add('hidden'));
    document.getElementById(`${viewId}-view`).classList.remove('hidden');

    if (viewId === 'challenges') loadChallenges();
    if (viewId === 'scoreboard') loadScoreboard();
    if (viewId === 'admin') loadAdminPanel();
}

function showNotification(message, type = 'success') {
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.textContent = message;
    notificationArea.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}

// Auth Logic
async function checkAuth() {
    if (!token) {
        showView('auth');
        navMenu.classList.add('hidden');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Auth failed');

        currentUser = await res.json();
        navMenu.classList.remove('hidden');

        if (currentUser.is_admin) {
            adminLink.classList.remove('hidden');
        } else {
            adminLink.classList.add('hidden');
        }

        showView('challenges');
    } catch (e) {
        logout();
    }
}

function logout() {
    token = null;
    localStorage.removeItem('access_token');
    currentUser = null;
    navMenu.classList.add('hidden');
    showView('auth');
}

// Login / Register Forms
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showLoginBtn = document.getElementById('show-login-btn');
const showRegisterBtn = document.getElementById('show-register-btn');

showLoginBtn.addEventListener('click', () => {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    showLoginBtn.style.opacity = '1';
    showRegisterBtn.style.opacity = '0.5';
});

showRegisterBtn.addEventListener('click', () => {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    showLoginBtn.style.opacity = '0.5';
    showRegisterBtn.style.opacity = '1';
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(loginForm);
    try {
        const res = await fetch(`${API_URL}/token`, {
            method: 'POST',
            body: formData
        });
        if (!res.ok) throw new Error('Login failed');
        const data = await res.json();
        token = data.access_token;
        localStorage.setItem('access_token', token);
        checkAuth();
        showNotification('Access Granted');
    } catch (e) {
        showNotification('Access Denied: Invalid Credentials', 'error');
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(registerForm);
    const data = Object.fromEntries(formData.entries());

    try {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Registration failed');
        const resData = await res.json();
        token = resData.access_token;
        localStorage.setItem('access_token', token);
        checkAuth();
        showNotification('User Initialized successfully');
    } catch (e) {
        showNotification('Registration Failed: Username likely taken', 'error');
    }
});

// Challenges Logic
async function loadChallenges() {
    const list = document.getElementById('challenges-list');
    list.innerHTML = '<p>Loading modules...</p>';

    try {
        const res = await fetch(`${API_URL}/challenges`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const challenges = await res.json();

        if (challenges.length === 0) {
            list.innerHTML = '<p>No active challenges found.</p>';
            return;
        }

        list.innerHTML = '';
        challenges.forEach(c => {
            const card = document.createElement('div');
            card.className = 'panel challenge-card';
            card.innerHTML = `
                <div class="flex justify-between">
                    <h3>${c.title} <small>[${c.category}]</small></h3>
                    <span class="points">${c.points} PTS</span>
                </div>
                <p class="mb-1">${c.description}</p>
                <form class="flag-form" data-id="${c.id}">
                    <div class="flex">
                        <input type="text" name="flag" placeholder="Enter Flag..." style="margin-bottom:0">
                        <button type="submit" class="btn">Submit</button>
                    </div>
                </form>
            `;
            list.appendChild(card);

            // Handle submission
            card.querySelector('form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const flag = e.target.flag.value;
                await submitFlag(c.id, flag);
            });
        });
    } catch (e) {
        console.error(e);
        showNotification('Failed to load challenges', 'error');
    }
}

async function submitFlag(challengeId, flag) {
    try {
        const res = await fetch(`${API_URL}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ challenge_id: challengeId, flag: flag })
        });

        const data = await res.json();
        if (!res.ok) {
            showNotification(data.detail || 'Submission Failed', 'error');
        } else {
            showNotification(`Correct! +${data.points} Points`);
            // Could mark as solved visually here without reload
        }
    } catch (e) {
        showNotification('Error submitting flag', 'error');
    }
}

// Scoreboard Logic
async function loadScoreboard() {
    const tbody = document.getElementById('scoreboard-body');
    tbody.innerHTML = '<tr><td colspan="4">Calculating...</td></tr>';

    try {
        const res = await fetch(`${API_URL}/scoreboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        tbody.innerHTML = '';
        data.forEach((entry, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${index + 1}</td>
                <td>${entry.username} ${entry.is_admin ? '<small>[ADMIN]</small>' : ''}</td>
                <td>${entry.score}</td>
                <td style="color: ${index < 3 ? 'var(--accent-color)' : 'inherit'}">${index < 3 ? 'ELITE' : 'ACTIVE'}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (e) {
        showNotification('Failed to load scoreboard', 'error');
    }
}

// Admin Logic
// Add Challenge
document.getElementById('add-challenge-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
        const res = await fetch(`${API_URL}/challenges`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (!res.ok) throw new Error('Failed to create');

        showNotification('Challenge Injected Successfully');
        e.target.reset();
        loadAdminPanel(); // Refresh list
    } catch (e) {
        showNotification('Creation Failed', 'error');
    }
});

async function loadAdminPanel() {
    const list = document.getElementById('admin-challenges-list');
    list.innerHTML = 'Loading...';

    try {
        const res = await fetch(`${API_URL}/challenges`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const challenges = await res.json();

        list.innerHTML = '';
        challenges.forEach(c => {
            const item = document.createElement('div');
            item.className = 'panel flex justify-between items-center';
            item.style.padding = '0.5rem 1rem';
            item.innerHTML = `
                <span>${c.title} (${c.points} pts)</span>
                <button class="btn btn-danger" onclick="deleteChallenge(${c.id})">Delete</button>
            `;
            list.appendChild(item);
        });
    } catch (e) {
        list.innerHTML = 'Error loading challenges';
    }
}

async function deleteChallenge(id) {
    if (!confirm('Are you sure you want to delete this challenge?')) return;

    try {
        const res = await fetch(`${API_URL}/challenges/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showNotification('Challenge Deleted');
            loadAdminPanel();
        } else {
            showNotification('Delete failed', 'error');
        }
    } catch (e) {
        showNotification('Error deleting challenge', 'error');
    }
}

// Init
checkAuth();
