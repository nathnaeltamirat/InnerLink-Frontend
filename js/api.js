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

// ===== AUTH =====
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

// ===== USER =====
async function getUserProfile(userId) {
    const response = await apiRequest(`/users/${userId}`);
    if (response) return response.json();
    return null;
}

async function updateUserProfile(userId, data) {
    const response = await apiRequest(`/users/${userId}`, 'PUT', data);
    if (response) return response.json();
    return null;
}

// ===== REFLECTIONS =====
async function getReflections() {
    const response = await apiRequest('/reflections');
    if (response) return response.json();
    return null;
}

async function createReflection(content) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const response = await apiRequest('/reflections', 'POST', {
        content: content,
        userId: user.id
    });
    if (response) return response.json();
    return null;
}

// ===== VOLUNTEER CHAT =====
async function initiateConversation(targetUserId) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const payload = {
        userId: targetUserId,
        volunteerId: user.id || user._id
    };

    const response = await fetch('http://localhost:8888/api/conversations/initiate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error('Failed to initiate conversation');
    }

    return response.json();
}

// ===== EXPORT =====
window.api = {
    login,
    register,
    getCurrentUser,
    logout,
    getUserProfile,
    updateUserProfile,
    getReflections,
    createReflection,
    initiateConversation
};