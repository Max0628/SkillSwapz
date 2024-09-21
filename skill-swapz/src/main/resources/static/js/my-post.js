import { getUserId, fetchLikedAndBookmarkedPosts, displayPost } from './combinedUtils.js';
import { createNavbar, addNavbarStyles } from './navbar.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 添加導航欄
    const navbar = createNavbar();
    document.body.insertBefore(navbar, document.body.firstChild);
    addNavbarStyles();

    const userId = await getUserId();
    if (userId) {
        console.log('Login User Id:', userId);
        await fetchAndDisplayUserPosts(userId);

        // 綁定搜尋和分類篩選事件
        setupSearchAndFilter(userId);
    } else {
        console.log('User not logged in');
        return null;
    }

    async function fetchAndDisplayUserPosts(userId) {
        try {
            const { likedPosts, bookmarkedPosts } = await fetchLikedAndBookmarkedPosts(userId);
            const response = await fetch(`api/1.0/post/user/${userId}`, { credentials: 'include' });
            const posts = await response.json();
            const postsList = document.getElementById('posts-list');
            postsList.innerHTML = '';
            console.log(posts);
            console.log(postsList);
            posts.forEach(post => {
                displayPost(post, userId, postsList, likedPosts, bookmarkedPosts);
            });
        } catch (error) {
            console.error('Error fetching user posts:', error);
        }
    }

    // 綁定搜尋和篩選事件，加入防抖功能
    function setupSearchAndFilter(userId) {
        let debounceTimer;  // 防抖計時器

        // 綁定搜尋框
        const searchInput = document.querySelector('.search-input');
        searchInput.addEventListener('input', (event) => {
            const searchKeyword = event.target.value.trim();

            // 清除之前的計時器
            clearTimeout(debounceTimer);

            // 設置防抖計時器，延遲 500 毫秒後執行搜尋
            debounceTimer = setTimeout(() => {
                updateURLAndRedirectToIndex(userId, searchKeyword);
            }, 500);  // 500 毫秒延遲
        });

        // 綁定分類標籤
        document.querySelectorAll('.popular-tags li').forEach(tag => {
            tag.addEventListener('click', (event) => {
                const searchKeyword = event.target.innerText.replace('#', '').trim();
                updateURLAndRedirectToIndex(userId, searchKeyword);  // 點擊標籤時不需要防抖
            });
        });
    }

    // 更新 URL 並重定向到 index.html 進行搜尋
    function updateURLAndRedirectToIndex(userId, searchKeyword = null) {
        let newUrl = '/index.html';
        if (searchKeyword) {
            newUrl += `?search=${encodeURIComponent(searchKeyword)}`;
        }
        window.location.href = newUrl; // 重定向到 index.html
    }
});
