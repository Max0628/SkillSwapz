import { getUnreadMessageCounts } from './combinedUtils.js';

let unreadCountBadge = null;
let dropdownUnreadBadge = null;

window.addEventListener('unreadCountUpdated', (event) => {
    console.log("Received unreadCountUpdated event:", event.detail);
    updateNavbarUnreadCount(event.detail);
});

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
                const createPostButton = createCreatePostButton();
                const userName = createUserName(userData);
                const avatar = createAvatar(userData);
                unreadCountBadge = createUnreadCountBadge();

                avatar.addEventListener('click', toggleDropdown);

                rightContainer.append(createPostButton, userName, avatar);
            }
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }

    const userMenu = createUserMenu();
    rightContainer.appendChild(userMenu);
    navbar.append(logo, rightContainer);

    document.addEventListener('click', hideDropdownOnClick);

    return navbar;
}

async function updateUnreadMessageCount(userId) {
    try {
        const unreadCounts = await getUnreadMessageCounts(userId);
        const totalUnreadCount = Object.values(unreadCounts).reduce((total, count) => total + count, 0);
        await updateNavbarUnreadCount(totalUnreadCount);
    } catch (error) {
        console.error('Error updating unread message count:', error);
    }
}

export function updateNavbarUnreadCount(unreadCount) {
    const avatarUnreadBadge = document.getElementById('avatar-unread-badge');
    if (avatarUnreadBadge && dropdownUnreadBadge) {
        const displayStyle = unreadCount > 0 ? 'inline-block' : 'none';
        const badgeText = unreadCount > 0 ? unreadCount : '';

        avatarUnreadBadge.textContent = badgeText;
        avatarUnreadBadge.style.display = displayStyle;

        dropdownUnreadBadge.textContent = badgeText;
        dropdownUnreadBadge.style.display = displayStyle;
    } else {
        console.warn('Unread count badges not found, retrying...');
        setTimeout(() => updateNavbarUnreadCount(unreadCount), 100);
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

function createElementWithClass(element, className) {
    const el = document.createElement(element);
    el.className = className;
    return el;
}

function createLogo() {
    const logo = createElementWithClass('a', 'navbar-logo');
    logo.href = '/';

    const img = document.createElement('img');
    img.src = 'https://maxchauo-stylish-bucket.s3.ap-northeast-1.amazonaws.com/logo2-removebg-preview.png';
    img.alt = '技能交換 Logo';
    img.classList.add('logo-image');

    logo.appendChild(img);
    return logo;
}

function createCreatePostButton() {
    const button = createElementWithClass('a', 'create-post-button');
    button.href = '/create-post.html';
    button.textContent = '發布文章';
    return button;
}

function createAvatar(userData) {
    const avatarWrapper = createElementWithClass('div', 'navbar-avatar-wrapper');

    const avatar = createElementWithClass('img', 'navbar-avatar');
    avatar.src = userData.avatarUrl || 'https://maxchauo-stylish-bucket.s3.ap-northeast-1.amazonaws.com/0_OtvYrwTXmO0Atzj5.webp';
    avatar.alt = 'User Avatar';

    const avatarUnreadBadge = createUnreadCountBadge();
    avatarUnreadBadge.id = 'avatar-unread-badge';
    avatarWrapper.append(avatar, avatarUnreadBadge);

    return avatarWrapper;
}

function createUserName(userData) {
    const userName = createElementWithClass('span', 'navbar-username');
    userName.textContent = userData.username || 'User';
    return userName;
}

function createUnreadCountBadge() {
    const badge = createElementWithClass('span', 'total-unread-badge');
    badge.style.display = 'none';
    return badge;
}

function createUserMenu() {
    const userMenu = createElementWithClass('div', 'navbar-user-menu');
    const dropdownContent = createElementWithClass('div', 'dropdown-content');

    const menuItems = [
        { name: '訊息', href: '/chat.html', id: 'messageMenuItem' },
        { name: '個人資料', href: '/profile.html' },
        { name: '我的文章', href: '/my-post.html' },
        { name: '收藏文章', href: '/my-bookmark.html' },
        { name: '登出', href: '/logout' }
    ];

    menuItems.forEach(item => {
        const menuItem = createElementWithClass('a', '');
        menuItem.href = item.href;
        menuItem.textContent = item.name;

        if (item.id === 'messageMenuItem') {
            dropdownUnreadBadge = createUnreadCountBadge();
            dropdownUnreadBadge.id = 'dropdown-unread-badge';
            menuItem.appendChild(dropdownUnreadBadge);
        }

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
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 1000;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 20px;
            background-color: #E0E0E0;
        }
        .navbar-logo {
            font-size: 20px;
            padding-left: 10px;
            font-weight: bold;
            text-decoration: none;
            color: #333;
        }
        .logo-image {
            width: 15rem;
            height: auto;
        }
        .navbar-right {
            display: flex;
            padding-left: 20px;
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
            top: 100%; /* 這會讓下拉選單從父元素的底部開始 */
            margin-top: 35px; /* 這會讓下拉選單再往下移動10像素 */
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
            position: relative;
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
        .navbar-avatar-wrapper {
            position: relative;
            display: inline-block;
        }
        .total-unread-badge, #dropdown-unread-badge {
            position: absolute;
            background-color: red;
            color: white;
            padding: 2px 5px;
            border-radius: 50%;
            font-size: 10px;
            font-weight: bold;
            display: none;
        }
        .total-unread-badge {
            top: -5px;
            right: -5px;
        }
        #dropdown-unread-badge {
            top: 50%;
            right: 10px;
            transform: translateY(-50%);
        }
        .create-post-button {
            padding: 8px 16px;
            background-color: #FFD700;
            border: 2px solid black ;
            color: black;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            text-decoration: none;
            font-weight: bold;
        }
        .create-post-button:hover {
            background-color: #F7D794;
        }
        #avatar-unread-badge {
        position: absolute;
        top: -5px;
        right: -5px;
        background-color: red;
        color: white;
        padding: 2px 5px;
        border-radius: 50%;
        font-size: 10px;
        font-weight: bold;
        display: none;
        }
    `;
    document.head.appendChild(style);
}