//auth.js
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    document.getElementById('show-register').addEventListener('click', (e) => {
        e.preventDefault();
        toggleForms(loginForm, registerForm);
    });

    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        toggleForms(registerForm, loginForm);
    });

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        await login(email, password);
    });

    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        await register(username, email, password);
    });

    function toggleForms(hideForm, showForm) {
        hideForm.style.display = 'none';
        showForm.style.display = 'block';
    }

    async function login(email, password) {
        try {
            const response = await fetch('api/1.0/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            if (response.ok) {
                document.cookie = `access_token=${data}; path=/; secure; HttpOnly;`;
                window.location.href = 'index.html';
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Error during login:', error);
        }
    }

    async function register(username, email, password) {
        try {
            const response = await fetch('api/1.0/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();
            if (response.ok) {
                await login(email, password);
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Error during registration:', error);
        }
    }
});
