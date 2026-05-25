
if (document.getElementById('loginForm')) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const registerFormElement = document.getElementById('registerFormElement');
    const showRegister = document.getElementById('showRegister');
    const showLogin = document.getElementById('showLogin');
    const messageDiv = document.getElementById('message');
    
    // Toggle forms
    showRegister.addEventListener('click', function(e) {
        e.preventDefault();
        loginForm.parentElement.style.display = 'none';
        registerForm.style.display = 'block';
    });
    
    showLogin.addEventListener('click', function(e) {
        e.preventDefault();
        registerForm.style.display = 'none';
        loginForm.parentElement.style.display = 'block';
    });
    
    // Login handler
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const passkey = document.getElementById('passkey').value;
        
        messageDiv.textContent = 'Logging in...';
        messageDiv.style.color = '#999';
        
        try {
            const response = await login(email, passkey);
            
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                window.location.href = 'home.html';
            } else {
                messageDiv.textContent = 'Invalid credentials';
                messageDiv.style.color = '#ff6b6b';
            }
        } catch (error) {
            messageDiv.textContent = 'Connection error: ' + error.message;
            messageDiv.style.color = '#ff6b6b';
        }
    });
    
    // Register handler
    registerFormElement.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('regEmail').value;
        const passkey = document.getElementById('regPasskey').value;
        const alias = document.getElementById('regAlias').value || 'Anonymous';
        
        messageDiv.textContent = 'Creating account...';
        messageDiv.style.color = '#999';
        
        try {
            const response = await register(email, passkey, alias);
            
            if (response.ok) {
                messageDiv.textContent = 'Account created! Please login.';
                messageDiv.style.color = '#69db7c';
                registerForm.style.display = 'none';
                loginForm.parentElement.style.display = 'block';
                document.getElementById('email').value = email;
                document.getElementById('passkey').value = '';
            } else {
                const error = await response.text();
                messageDiv.textContent = 'Registration failed: ' + error;
                messageDiv.style.color = '#ff6b6b';
            }
        } catch (error) {
            messageDiv.textContent = 'Connection error: ' + error.message;
            messageDiv.style.color = '#ff6b6b';
        }
    });
}

// Home Page Logic 
if (document.getElementById('userName')) {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
    }
    
    // Load user data
    const userData = localStorage.getItem('user');
    if (userData) {
        const user = JSON.parse(userData);
        document.getElementById('userName').textContent = user.alias || 'User';
        document.getElementById('userRole').textContent = 'Role: ' + (user.role || 'user');
        document.getElementById('userAlias').textContent = user.alias || 'Anonymous';
        document.getElementById('userEmail').textContent = user.email || 'Not available';
        document.getElementById('userRoleDisplay').textContent = user.role || 'user';
        
        // Set avatar
        const avatar = document.querySelector('.avatar');
        if (avatar) {
            avatar.textContent = (user.alias || 'U').charAt(0).toUpperCase();
        }
    }
    
    // Logout handler
    document.getElementById('logoutBtn').addEventListener('click', async function() {
        await logout();
    });
    
    // Test API call
    document.getElementById('testReflections').addEventListener('click', async function() {
        const resultDiv = document.getElementById('reflectionsResult');
        resultDiv.innerHTML = 'Loading...';
        
        try {
            const reflections = await getReflections();
            if (reflections && reflections.length > 0) {
                resultDiv.innerHTML = '<strong>Found ' + reflections.length + ' reflections:</strong><br>' +
                    reflections.slice(0, 3).map(r => 
                        '<div class="reflection-item">' +
                        '<strong>' + (r.userAlias || 'Anonymous') + ':</strong> ' + 
                        r.content.substring(0, 50) + '...' +
                        '</div>'
                    ).join('');
            } else {
                resultDiv.innerHTML = 'No reflections found. Try creating one!';
            }
        } catch (error) {
            resultDiv.innerHTML = 'Error: ' + error.message;
        }
    });
}
