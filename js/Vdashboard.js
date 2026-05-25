document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    // Availability toggle
    const toggle = document.getElementById('availabilityToggle');
    toggle.addEventListener('click', function() {
        this.classList.toggle('active');
    });

    // Load waiting support
    loadWaitingSupport();

    // Load active conversations
    loadActiveConversations();
});

function loadWaitingSupport() {
    const list = document.getElementById('waitingList');

    // Sample data - Replace with API call
    const waitingData = [
        {
            id: 1,
            urgency: 'High',
            message: 'Feeling overwhelmed and just need someone to sit with my thoughts for a moment...',
            tags: ['Anxiety', 'Work Stress'],
            time: '2m ago'
        },
        {
            id: 2,
            urgency: 'Stable',
            message: 'I had a hard conversation today and I\'m struggling to process the outcome.',
            tags: ['Relationships'],
            time: '5m ago'
        }
    ];

    list.innerHTML = waitingData.map(item => `
        <div class="support-card ${item.urgency.toLowerCase()}">
            <div class="card-header">
                <span class="urgency-badge ${item.urgency.toLowerCase()}">${item.urgency} Urgency</span>
                <span class="card-time">${item.time}</span>
            </div>
            <div class="card-message">"${item.message}"</div>
            <div class="card-tags">
                ${item.tags.map(tag => `<span class="card-tag">${tag}</span>`).join('')}
            </div>
            <button class="accept-btn" data-id="${item.id}">Accept Support Request</button>
        </div>
    `).join('');

    // Accept buttons
    document.querySelectorAll('.accept-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            alert('Request accepted!');
            this.textContent = 'Accepted ✓';
            this.disabled = true;
        });
    });
}

function loadActiveConversations() {
    const list = document.getElementById('activeConversations');

    // Sample data - Replace with API call
    const convData = [
        {
            id: 8241,
            name: 'User #8241',
            preview: 'Thank you for listening, it really means a lot to me right now.',
            status: 'Typing...'
        },
        {
            id: 7109,
            name: 'User #7109',
            preview: 'I think I\'m starting to feel a bit calmer now. Let\'s try that exercise.',
            status: '12m ago'
        }
    ];

    list.innerHTML = convData.map(item => `
        <div class="conversation-card">
            <div class="user-avatar">${item.name.charAt(0)}</div>
            <div class="conv-info">
                <div class="conv-name">${item.name}</div>
                <div class="conv-preview">${item.preview}</div>
            </div>
            <div class="conv-status">${item.status}</div>
            <div class="conv-arrow">→</div>
        </div>
    `).join('');
}