import { displayPost, fetchLikedAndBookmarkedPosts, getUserId, handleBookmark } from './combinedUtils.js';
import { addNavbarStyles, createNavbar } from './navbar.js';

document.addEventListener('DOMContentLoaded', async () => {

    // 生成導航欄
    const navbar = createNavbar();
    document.body.insertBefore(navbar, document.body.firstChild);
    addNavbarStyles();

    // 獲取用戶 ID 並顯示書籤文章
    const userId = await getUserId();
    if (userId) {
        console.log('Login User Id:', userId);
        await fetchAndDisplayBookmarkedPosts(userId);

        // 綁定搜尋框和側邊欄的搜尋邏輯
        setupSearchAndFilter(userId);
    } else {
        console.log('User not logged in');
        return null;
    }

    async function fetchAndDisplayBookmarkedPosts(userId) {
        try {
            const { likedPosts, bookmarkedPosts } = await fetchLikedAndBookmarkedPosts(userId);
            const postsList = document.getElementById('bookmarks-list');
            postsList.innerHTML = '';

            for (const postId of bookmarkedPosts) {
                const response = await fetch(`/api/1.0/post/${postId}`, { credentials: 'include' });
                const post = await response.json();
                displayPost(post, userId, postsList, likedPosts, bookmarkedPosts);
            }

            const bookmarkButtons = document.querySelectorAll('.bookmark-btn');
            bookmarkButtons.forEach(button => {
                button.addEventListener('click', async (event) => {
                    const postId = event.target.id.split('-')[2];
                    await handleBookmark(postId, userId);
                    if (!event.target.classList.contains('bookmarked')) {
                        postsList.removeChild(event.target.closest('.post'));
                    }
                });
            });
        } catch (error) {
            console.error('Error fetching bookmarked posts:', error);
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

            // 設置防抖計時器，延遲500毫秒後執行搜尋
            debounceTimer = setTimeout(() => {
                updateURLAndRedirectToIndex(userId, searchKeyword);
            }, 500);  // 500毫秒延遲
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
