const API_BASE = '/api';

function openModal(id) {
    document.getElementById(id).style.display = 'flex';
}
function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

async function signupUser() {
    const username = document.getElementById('signupUsername').value;
    const password = document.getElementById('signupPassword').value;
    const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    let data = {};
    try {
        data = await res.json();
    } catch (e) {
        data = {};
    }
    if (res.ok) {
        closeModal('signupModal');
        openModal('loginModal');
    } else {
        document.getElementById('signupError').innerText = data.error || 'Signup failed (check backend/API)';
    }
}

async function loginUser() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    let data = {};
    try {
        data = await res.json();
    } catch (e) {
        data = {};
    }
    if (res.ok) {
        localStorage.setItem('token', data.token);
        closeModal('loginModal');
        await showGreeting();
        await restoreSession();
    } else {
        document.getElementById('loginError').innerText = data.error || 'Login failed (check backend/API)';
    }
}

async function showGreeting() {
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.ok) {
        const data = await res.json();
        document.getElementById('authButtons').style.display = 'none';
        document.getElementById('greeting').style.display = 'block';
        document.getElementById('username').innerText = data.username;
    }
}

function logoutUser() {
    localStorage.removeItem('token');
    document.getElementById('authButtons').style.display = 'flex';
    document.getElementById('greeting').style.display = 'none';
    window.location.reload();
}

document.addEventListener('DOMContentLoaded', async function() {
    await showGreeting();
    if (localStorage.getItem('token')) {
        await restoreSession();
    }
});

async function saveSession(playlist, song, position) {
    const token = localStorage.getItem('token');
    if (!token) return;
    await fetch(`${API_BASE}/session`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlist, song, position })
    });
}

async function restoreSession() {
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch(`${API_BASE}/session`, {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.ok) {
        const session = await res.json();
        if (session && session.playlist && session.song) {
            // Load playlist and play song at position
            if (typeof getSongs === 'function' && typeof playMusic === 'function') {
                songs = await getSongs(session.playlist);
                if (typeof highlightActivePlaylist === 'function') highlightActivePlaylist(session.playlist);
                await playMusic(session.song, false);
                if (session.position && typeof currentSong !== 'undefined') {
                    currentSong.currentTime = session.position;
                }
            }
        }
    }
} 