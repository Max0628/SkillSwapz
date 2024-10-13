/* JavaScript 部分 */
document.addEventListener('DOMContentLoaded', function() {
    const features = document.querySelectorAll('.feature');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const modalOverlay = document.getElementById('modal-overlay');
    const formsWrapper = document.getElementById('forms-wrapper');
    const ctaButton = document.querySelector('.cta-button');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.1
    });

    features.forEach(feature => {
        observer.observe(feature);
    });

    // 滾動效果
    const scrollElements = document.querySelectorAll('.scroll-fade');

    const elementInView = (el, dividend = 1) => {
        const elementTop = el.getBoundingClientRect().top;
        return (
            elementTop <=
            (window.innerHeight || document.documentElement.clientHeight) / dividend
        );
    };

    const displayScrollElement = (element) => {
        element.classList.add('scrolled');
    };

    const hideScrollElement = (element) => {
        element.classList.remove('scrolled');
    };

    const handleScrollAnimation = () => {
        scrollElements.forEach((el) => {
            if (elementInView(el, 1.25)) {
                displayScrollElement(el);
            } else {
                hideScrollElement(el);
            }
        });
    };

    window.addEventListener('scroll', () => {
        handleScrollAnimation();
    });

    ctaButton.addEventListener('click', (e) => {
        e.preventDefault();
        showModal();
    });

    document.getElementById('show-register').addEventListener('click', (e) => {
        e.preventDefault();
        toggleForms(loginForm, registerForm);
    });

    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        toggleForms(registerForm, loginForm);
    });

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        await login(email, password);
    });

    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        await register(username, email, password);
    });

    function showModal() {
        modalOverlay.style.display = 'block';
        formsWrapper.style.display = 'block';
    }

    function hideModal() {
        modalOverlay.style.display = 'none';
        formsWrapper.style.display = 'none';
    }

    modalOverlay.addEventListener('click', hideModal); // 點擊遮罩隱藏 Modal

    function toggleForms(hideForm, showForm) {
        hideForm.classList.add('fade-out');
        setTimeout(() => {
            hideForm.style.display = 'none';
            showForm.style.display = 'block';
            hideForm.classList.remove('fade-out');
            showForm.classList.add('fade-in');
        }, 300);
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
