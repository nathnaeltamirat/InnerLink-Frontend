document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    loadReflections();
    setupCreateModal();
});

function loadReflections() {
    const grid = document.getElementById('reflectionsGrid');

    // Sample data - Replace with API call
    const reflectionsData = [
        {
            id: 1,
            author: 'Sarah M.',
            time: '2h ago',
            content: 'Today, I sat by the window for ten minutes without my phone. The way the light shifted across the floor felt like a conversation I\'ve been missing for years.',
            avatarColor: 'avatar-green',
            tags: []
        },
        {
            id: 2,
            author: 'Elena',
            time: '8h ago',
            content: 'It is okay to not be productive today. Sometimes the most radical thing you can do is rest deeply and without apology.',
            avatarColor: 'avatar-pink',
            tags: ['Permission', 'Grace']
        },
        {
            id: 3,
            author: 'David K.',
            time: '5h ago',
            content: 'The morning fog in the valley felt like a blanket for the mind.',
            image: 'images/morning_fog.png',
            avatarColor: 'avatar-orange',
            tags: []
        },
        {
            id: 4,
            author: 'Marcus',
            time: '1d ago',
            content: '"The quieter you become, the more you can hear." — Rumi',
            avatarColor: 'avatar-green',
            tags: []
        }
    ];

    grid.innerHTML = reflectionsData.map(item => `
        <div class="reflection-card">
            <div class="card-header">
                <div class="avatar-small ${item.avatarColor || ''}">${item.author.charAt(0)}</div>
                <div>
                    <div class="author-name">${item.author}</div>
                    <div class="post-time">${item.time}</div>
                </div>
            </div>
            <div class="card-content">${item.content}</div>
            ${item.image ? `<img src="${item.image}" class="card-image" alt="Reflection image">` : ''}
            ${item.tags && item.tags.length > 0 ? `
                <div class="card-tags">
                    ${item.tags.map(tag => `<span class="tag-pill">${tag}</span>`).join('')}
                </div>
            ` : ''}
            <div class="card-actions">
                <span>💛 Breathe with them</span>
                <span>💭 Offer a thought</span>
            </div>
        </div>
    `).join('');
}

function setupCreateModal() {
    const modal = document.getElementById('createModal');
    const openBtn = document.getElementById('createReflectionBtn');
    const cancelBtn = document.getElementById('cancelModal');
    const submitBtn = document.getElementById('submitReflection');

    openBtn.addEventListener('click', function() {
        modal.classList.add('active');
    });

    cancelBtn.addEventListener('click', function() {
        modal.classList.remove('active');
    });

    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    submitBtn.addEventListener('click', function() {
        const content = document.getElementById('reflectionContent').value;
        if (content.trim()) {
            alert('Reflection posted!');
            modal.classList.remove('active');
            document.getElementById('reflectionContent').value = '';
            // Reload reflections
            loadReflections();
        }
    });
}