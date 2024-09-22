// navbar.js

export async function createNavbar() {
    const navbar = document.createElement('nav');
    navbar.className = 'navbar';

    // 左邊的技能交換 LOGO
    const logo = document.createElement('a');
    logo.href = '/';
    logo.className = 'navbar-logo';
    logo.textContent = '技能交換';

    // 右邊的按鈕容器
    const rightContainer = document.createElement('div');
    rightContainer.className = 'navbar-right';

    // 發布文章按鈕
    const createPostButton = document.createElement('button');
    createPostButton.textContent = '發布文章';
    createPostButton.className = 'navbar-create-post';
    createPostButton.onclick = () => window.location.href = '/create-post.html';

    // 獲取用戶數據
    try {
        const userId = await getUserId();
        if (userId) {
            const userData = await fetchUserProfile(userId);
            if (userData) {
                // 創建用戶頭像
                const avatar = document.createElement('img');
                avatar.className = 'navbar-avatar';
                avatar.src = userData.avatarUrl || 'https://maxchauo-stylish-bucket.s3.ap-northeast-1.amazonaws.com/0_OtvYrwTXmO0Atzj5.webp';
                avatar.alt = 'User Avatar';

                // 創建用戶名稱
                const userName = document.createElement('span');
                userName.className = 'navbar-username';
                userName.textContent = userData.username || 'User';

                rightContainer.appendChild(avatar);
                rightContainer.appendChild(userName);
            }
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }

    // 選單按鈕和下拉選單
    const userMenu = document.createElement('div');
    userMenu.className = 'navbar-user-menu';

    const userMenuButton = document.createElement('button');
    userMenuButton.textContent = '選單';
    userMenuButton.className = 'navbar-user-button';
    userMenu.appendChild(userMenuButton);

    const dropdownContent = document.createElement('div');
    dropdownContent.className = 'dropdown-content';

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

    // 將發布文章按鈕和選單包裹到右側容器
    rightContainer.appendChild(createPostButton);
    rightContainer.appendChild(userMenu);

    // 將 LOGO 和右側按鈕容器添加到導航欄
    navbar.appendChild(logo);
    navbar.appendChild(rightContainer);

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
        .navbar-create-post {
            padding: 5px 10px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        }
        .navbar-user-menu {
            position: relative;
        }
        .navbar-user-button {
            padding: 5px 10px;
            background-color: #f0f0f0;
            border: none;
            border-radius: 5px;
            cursor: pointer;
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
        .navbar-user-menu:hover .dropdown-content {
            display: block;
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
        }
        .navbar-username {
            font-weight: bold;
        }
    `;
    document.head.appendChild(style);
}