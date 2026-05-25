const API_BASE = '/api';

function getToken() {
    return localStorage.getItem('token');
}

function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': getToken() || ''
    };
}

// Generic API request
async function apiRequest(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: getHeaders()
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    
    if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
        return null;
    }
    
    return response;
}

// Auth API
async function login(email, passkey) {
    const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, passkey })
    });
    return response;
}

async function register(email, passkey, alias) {
    const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, passkey, alias })
    });
    return response;
}

async function getCurrentUser() {
    const response = await apiRequest('/auth/me');
    if (response) return response.json();
    return null;
}

async function logout() {
    await apiRequest('/auth/logout', 'POST');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// Reflections API
async function getReflections() {
    const response = await apiRequest('/reflections');
    if (response) return response.json();
    return null;
}
