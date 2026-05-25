document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    // Load user data
    const userData = localStorage.getItem('user');
    if (userData) {
        const user = JSON.parse(userData);
        document.getElementById('avatarLetter').textContent = (user.alias || 'S').charAt(0).toUpperCase();
        document.getElementById('aliasInput').value = user.alias || 'Silent Observer';

        // Set mood
        const mood = user.currentMood || 'Meditative';
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mood === mood);
        });
    }

    // Mood buttons
    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Toggles
    document.querySelectorAll('.toggle-switch').forEach(toggle => {
        toggle.addEventListener('click', function() {
            this.classList.toggle('active');
        });
    });

    // Save
    document.getElementById('saveBtn').addEventListener('click', function() {
        const alias = document.getElementById('aliasInput').value;
        const mood = document.querySelector('.mood-btn.active')?.dataset.mood || 'Meditative';
        const isAnonymous = document.getElementById('anonymousToggle').classList.contains('active');

        // Save to localStorage
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        user.alias = alias;
        user.currentMood = mood;
        user.isAnonymous = isAnonymous;
        localStorage.setItem('user', JSON.stringify(user));

        alert('Settings saved!');
    });

    // Discard
    document.getElementById('discardBtn').addEventListener('click', function() {
        window.location.href = 'home.html';
    });

    // Erase
    document.getElementById('erasePresence').addEventListener('click', function() {
        if (confirm('Are you sure you want to erase your presence?')) {
            localStorage.clear();
            window.location.href = 'index.html';
        }
    });
});