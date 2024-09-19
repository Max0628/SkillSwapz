//navbar.js
export function createNavbar() {
    const navbar = document.createElement('nav');
    navbar.className = 'navbar';

    const logo = document.createElement('a');
    logo.href = '/';
    logo.className = 'navbar-logo';
    logo.textContent = '技能交換';

    const title = document.createElement('h1');
    title.textContent = '最新文章';
    title.className = 'navbar-title';

    const searchBox = document.createElement('input');
    searchBox.type = 'text';
    searchBox.placeholder = '搜索';
    searchBox.className = 'navbar-search';

    const createPostButton = document.createElement('button');
    createPostButton.textContent = '發布文章';
    createPostButton.className = 'navbar-create-post';
    createPostButton.onclick = () => window.location.href = '/create-post.html';

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

    navbar.appendChild(logo);
    navbar.appendChild(title);
    navbar.appendChild(searchBox);
    navbar.appendChild(createPostButton);
    navbar.appendChild(userMenu);

    return navbar;
}

export function addNavbarStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .navbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 20px;
            background-color: #ffffff;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .navbar-logo {
            font-size: 20px;
            font-weight: bold;
            text-decoration: none;
            color: #333;
        }
        .navbar-title {
            font-size: 24px;
            margin: 0;
        }
        .navbar-search {
            padding: 5px 10px;
            border-radius: 20px;
            border: 1px solid #ddd;
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
    `;
    document.head.appendChild(style);
}