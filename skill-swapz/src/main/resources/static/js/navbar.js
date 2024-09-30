import { getUnreadMessageCounts } from './combinedUtils.js';

// 監聽未讀消息計數更新事件
window.addEventListener('unreadCountUpdated', (event) => {
    console.log("Received unreadCountUpdated event:", event.detail);
    updateNavbarUnreadCount(event.detail);
});

// 頁面加載時更新未讀消息計數
document.addEventListener('DOMContentLoaded', async () => {
    const userId = await getUserId();
    if (userId) {
        await updateUnreadMessageCount(userId);
    }
});

export async function createNavbar() {
    const navbar = createElementWithClass('nav', 'navbar');
    const logo = createLogo();
    const rightContainer = createElementWithClass('div', 'navbar-right');

    try {
        const userId = await getUserId();
        if (userId) {
            const userData = await fetchUserProfile(userId);
            if (userData) {
                const avatar = createAvatar(userData);
                const userName = createUserName(userData);
                const unreadCountBadge = createUnreadCountBadge();

                avatar.addEventListener('click', toggleDropdown);

                rightContainer.append(unreadCountBadge, userName, avatar);
            }
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }

    const userMenu = createUserMenu();
    rightContainer.appendChild(userMenu);
    navbar.append(logo, rightContainer);

    // 添加全局點擊事件，點擊其他地方隱藏選單
    document.addEventListener('click', hideDropdownOnClick);

    return navbar;
}

async function updateUnreadMessageCount(userId) {
    try {
        const unreadCounts = await getUnreadMessageCounts(userId);
        const totalUnreadCount = Object.values(unreadCounts).reduce((total, count) => total + count, 0);
        updateNavbarUnreadCount(totalUnreadCount);
    } catch (error) {
        console.error('Error updating unread message count:', error);
    }
}

function updateNavbarUnreadCount(unreadCount) {
    const unreadCountBadge = document.getElementById('total-unread-badge');
    if (unreadCountBadge) {
        unreadCountBadge.textContent = unreadCount > 0 ? unreadCount : '';
        unreadCountBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    } else {
        console.warn('Unread count badge not found in the DOM');
    }
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

// Utility functions for creating elements and handling DOM
function createElementWithClass(element, className) {
    const el = document.createElement(element);
    el.className = className;
    return el;
}

function createLogo() {
    const logo = createElementWithClass('a', 'navbar-logo');
    logo.href = '/';
    logo.textContent = '技能交換';
    return logo;
}

function createAvatar(userData) {
    const avatar = createElementWithClass('img', 'navbar-avatar');
    avatar.src = userData.avatarUrl || 'https://maxchauo-stylish-bucket.s3.ap-northeast-1.amazonaws.com/0_OtvYrwTXmO0Atzj5.webp';
    avatar.alt = 'User Avatar';
    return avatar;
}

function createUserName(userData) {
    const userName = createElementWithClass('span', 'navbar-username');
    userName.textContent = userData.username || 'User';
    return userName;
}

function createUnreadCountBadge() {
    const unreadCountBadge = createElementWithClass('span', 'total-unread-badge');
    unreadCountBadge.id = 'total-unread-badge';
    unreadCountBadge.style.display = 'none'; // 初始時隱藏
    return unreadCountBadge;
}

function createUserMenu() {
    const userMenu = createElementWithClass('div', 'navbar-user-menu');
    const dropdownContent = createElementWithClass('div', 'dropdown-content');

    const menuItems = [
        { name: '訊息', href: '/chat.html' },
        { name: '個人資料', href: '/profile.html' },
        { name: '我的文章', href: '/my-post.html' },
        { name: '收藏文章', href: '/my-bookmark.html' },
        { name: '登出', href: '/logout' }
    ];

    const createPostItem = createElementWithClass('a', '');
    createPostItem.href = '/create-post.html';
    createPostItem.textContent = '發布文章';
    dropdownContent.appendChild(createPostItem);

    menuItems.forEach(item => {
        const menuItem = createElementWithClass('a', '');
        menuItem.href = item.href;
        menuItem.textContent = item.name;
        dropdownContent.appendChild(menuItem);
    });

    userMenu.appendChild(dropdownContent);
    return userMenu;
}

function toggleDropdown() {
    const dropdownContent = document.querySelector('.dropdown-content');
    dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
}

function hideDropdownOnClick(event) {
    const dropdownContent = document.querySelector('.dropdown-content');
    const avatar = document.querySelector('.navbar-avatar');
    if (!avatar.contains(event.target) && !dropdownContent.contains(event.target)) {
        dropdownContent.style.display = 'none';
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
