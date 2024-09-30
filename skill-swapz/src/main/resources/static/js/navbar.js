export async function createNavbar() {
    const navbar = document.createElement('nav');
    navbar.className = 'navbar';

    const logo = document.createElement('a');
    logo.href = '/';
    logo.className = 'navbar-logo';
    logo.textContent = '技能交換';

    const rightContainer = document.createElement('div');
    rightContainer.className = 'navbar-right';

    try {
        const userId = await getUserId();
        if (userId) {
            const userData = await fetchUserProfile(userId);
            if (userData) {
                const avatar = document.createElement('img');
                avatar.className = 'navbar-avatar';
                avatar.src = userData.avatarUrl || 'https://maxchauo-stylish-bucket.s3.ap-northeast-1.amazonaws.com/0_OtvYrwTXmO0Atzj5.webp';
                avatar.alt = 'User Avatar';

                const userName = document.createElement('span');
                userName.className = 'navbar-username';
                userName.textContent = userData.username || 'User';

                // 將選單顯示事件綁定到大頭貼
                avatar.addEventListener('click', function() {
                    const dropdownContent = document.querySelector('.dropdown-content');
                    dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
                });

                rightContainer.appendChild(userName);
                rightContainer.appendChild(avatar);
            }
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }

    const userMenu = document.createElement('div');
    userMenu.className = 'navbar-user-menu';

    const dropdownContent = document.createElement('div');
    dropdownContent.className = 'dropdown-content';

    // 將發布文章按鈕添加到下拉選單的最上方
    const createPostItem = document.createElement('a');
    createPostItem.href = '/create-post.html';
    createPostItem.textContent = '發布文章';
    dropdownContent.appendChild(createPostItem);

    const menuItems = [
        { name: '訊息', href: '/chat.html' },
        { name: '個人資料', href: '/profile.html' },
        { name: '我的文章', href: '/my-post.html' },
        { name: '收藏文章', href: '/my-bookmark.html' },
        { name: '登出', href: '/logout' }
    ];

    menuItems.forEach(item => {
        const menuItem = document.createElement('a');
        menuItem.href = item.href;
        menuItem.textContent = item.name;
        dropdownContent.appendChild(menuItem);
    });

    userMenu.appendChild(dropdownContent);
    rightContainer.appendChild(userMenu);

    navbar.appendChild(logo);
    navbar.appendChild(rightContainer);

    // 添加全局點擊事件，點擊其他地方隱藏選單
    document.addEventListener('click', function(event) {
        const dropdownContent = document.querySelector('.dropdown-content');
        const avatar = document.querySelector('.navbar-avatar');

        // 如果點擊不在大頭貼或選單內，則隱藏選單
        if (!avatar.contains(event.target) && !dropdownContent.contains(event.target)) {
            dropdownContent.style.display = 'none';
        }
    });

    return navbar;
}

async function getUserId() {
    try {
        const response = await fetch('api/1.0/auth/me', {
            method: 'POST',
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user ID');
        }

        const data = await response.json();
        return data.user_id;
    } catch (error) {
        console.error('Error fetching user ID:', error);
        return null;
    }
}

async function fetchUserProfile(userId) {
    try {
        const response = await fetch(`/api/1.0/user/profile?userId=${userId}`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user profile');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }
}

export function addNavbarStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .navbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 20px;
            background-color: #e0e0e0;
        }
        .navbar-logo {
            font-size: 20px;
            font-weight: bold;
            text-decoration: none;
            color: #333;
        }
        .navbar-right {
            display: flex;
            align-items: center;
            gap: 20px;
        }
        .navbar-user-menu {
            position: relative;
        }
        .dropdown-content {
            display: none;
            position: absolute;
            right: 0;
            background-color: #f9f9f9;
            min-width: 160px;
            box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
            z-index: 1;
        }
        .dropdown-content a {
            color: black;
            padding: 12px 16px;
            text-decoration: none;
            display: block;
        }
        .dropdown-content a:hover {
            background-color: #f1f1f1;
        }
        .navbar-avatar {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            object-fit: cover;
            cursor: pointer;
        }
        .navbar-username {
            font-weight: bold;
        }
    `;
    document.head.appendChild(style);
}
