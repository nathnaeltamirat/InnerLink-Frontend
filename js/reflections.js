document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    loadReflections();
    setupCreateModal();
    setupLogout();
});

// ===== LOAD REFLECTIONS =====
async function loadReflections() {
    const grid = document.getElementById('reflectionsGrid');
    grid.innerHTML = '<div style="text-align:center;color:#666;padding:40px;">Loading...</div>';

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isVolunteer = currentUser.role === 'volunteer' || currentUser.role === 'admin';

    try {
        const reflections = await window.api.getReflections();
        if (reflections && reflections.length > 0) {
            grid.innerHTML = reflections.map(item => {
                const showTalkButton = isVolunteer && item.userId !== currentUser.id;
                return `
                    <div class="reflection-card">
                        <div class="card-header">
                            <div class="avatar-small">${(item.userAlias || 'A').charAt(0)}</div>
                            <div>
                                <div class="author-name">${item.userAlias || 'Anonymous'}</div>
                                <div class="post-time">${timeAgo(item.createdAt)}</div>
                            </div>
                        </div>
                        <div class="card-content">${item.content}</div>
                        ${item.imageUrl ? `<img src="${item.imageUrl}" class="card-image">` : ''}
                        ${showTalkButton ? `
                            <div class="card-actions">
                                <button class="talk-to-user-btn" data-user-id="${item.userId}">
                                    💬 Talk to User
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');

            // Add event listeners to Talk buttons
            document.querySelectorAll('.talk-to-user-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const targetUserId = this.dataset.userId;
                    initiateVolunteerChat(targetUserId);
                });
            });
        } else {
            grid.innerHTML = '<div style="text-align:center;color:#666;padding:40px;">No reflections yet. Be the first to share.</div>';
        }
    } catch (error) {
        grid.innerHTML = '<div style="text-align:center;color:#ff6b6b;padding:40px;">Error loading reflections</div>';
    }
}

// ===== INITIATE VOLUNTEER CHAT =====
async function initiateVolunteerChat(targetUserId) {
    const activeVolunteer = JSON.parse(localStorage.getItem("user"));
    if (!activeVolunteer) {
        alert("Please re-authenticate your volunteer profile workspace session first.");
        return;
    }

    try {
        const chatRoomInfo = await window.api.initiateConversation(targetUserId);

        localStorage.setItem("AUTO_OPEN_CONVERSATION_ID", chatRoomInfo.conversationId);
        localStorage.setItem("AUTO_OPEN_CONVERSATION_TITLE", chatRoomInfo.title || "Direct Sanctuary Channel");

        window.location.href = "/unified_chat.html";
    } catch (error) {
        console.error("Critical channel redirection process aborted:", error);
        alert("Could not initialize secure dialogue node workspace.");
    }
}

// ===== CREATE REFLECTION MODAL =====
function setupCreateModal() {
    const modal = document.getElementById('createModal');
    const openBtn = document.getElementById('createReflectionBtn');
    const cancelBtn = document.getElementById('cancelModal');
    const submitBtn = document.getElementById('submitReflection');
    const textarea = document.getElementById('reflectionContent');

    openBtn.addEventListener('click', function() {
        modal.classList.add('active');
        textarea.value = '';
        textarea.focus();
    });

    cancelBtn.addEventListener('click', function() {
        modal.classList.remove('active');
    });

    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    submitBtn.addEventListener('click', async function() {
        const content = textarea.value.trim();
        if (!content) {
            alert('Please write something to share.');
            return;
        }

        try {
            const reflection = await window.api.createReflection(content);
            if (reflection) {
                modal.classList.remove('active');
                textarea.value = '';
                loadReflections();
                alert('Reflection shared!');
            }
        } catch (error) {
            alert('Error sharing reflection');
        }
    });
}

// ===== UTILITY =====
function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return minutes + 'm ago';
    if (hours < 24) return hours + 'h ago';
    return days + 'd ago';
}

function setupLogout() {
    document.getElementById('logoutBtn').addEventListener('click', async function() {
        await window.api.logout();
    });
}