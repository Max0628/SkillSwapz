// explore.js
import {
    getUserId,
    fetchLikedAndBookmarkedPosts,
    displayPost,
    connectWebSocket,
    subscribeToPostEvents,
    formatTimeAgo
} from './combinedUtils.js';
import { createNavbar, addNavbarStyles } from './navbar.js';

let currentSearchKeyword = null;
let currentPage = 0;
let isLoading = false;
let hasMorePosts = true;

document.addEventListener('DOMContentLoaded', async () => {
    const categoryContainer = document.getElementById('category-container');
    const searchInput = document.getElementById('search-input');

    const userId = await getUserId();
    if (!userId) {
        window.location.href = "landingPage.html";
        console.log('User not logged in');
        return;
    }

    const navbar = await createNavbar();
    document.body.insertBefore(navbar, document.body.firstChild);
    await addNavbarStyles();

    // 初始化 WebSocket 連接
    const stompClient = await connectWebSocket(userId);
    await setupWebSocketSubscriptions(stompClient, userId);

    // 設置搜尋和標籤點擊事件
    setupSearchAndFilter(userId);

    // 加載分類和標籤
    await fetchCategories();

    // 加載初始貼文（如果需要）
    await fetchAndDisplayPosts(userId, currentSearchKeyword, currentPage);

    // 設置滾動監聽器（如果需要支持無限滾動）
    setupScrollListener(userId);

    // 更新 URL 並加載對應搜尋結果
    async function updateURLAndFetchPosts(userId, searchKeyword = null) {
        currentSearchKeyword = searchKeyword;
        currentPage = 0;
        hasMorePosts = true;
        isLoading = false;
        let newUrl = '/explore.html';
        if (searchKeyword) {
            newUrl += `?search=${encodeURIComponent(searchKeyword)}`;
        }
        window.history.pushState({}, '', newUrl);

        const postsList = document.getElementById('posts-list');
        postsList.innerHTML = ''; // 清空現有的貼文

        // 加載第一頁的搜尋結果
        await fetchAndDisplayPosts(userId, currentSearchKeyword, currentPage);
    }


    function setupSearchAndFilter(userId) {
        // 偵測使用者按下 Enter 鍵來觸發搜尋
        searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); // 防止預設的 Enter 行為
                const searchKeyword = event.target.value.trim();
                sendSearchKeywordToIndex(searchKeyword);
            }
        });

        // 點擊標籤進行搜尋
        categoryContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('tag')) {
                const tagKeyword = event.target.textContent.replace('#', '').trim();
                sendSearchKeywordToIndex(tagKeyword);
            }
        });
    }
    function sendSearchKeywordToIndex(searchKeyword) {
        // 直接導航到 index.html 並傳遞搜尋關鍵字作為 URL 參數
        window.location.href = `/index.html?search=${encodeURIComponent(searchKeyword)}`;
    }


    async function fetchCategories() {
        try {
            const response = await fetch('/api/1.0/post/category');
            const categories = await response.json();
            displayCategories(categories);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    }

    function displayCategories(categories) {
        categoryContainer.innerHTML = '';
        categories.forEach(category => {
            const categoryCard = document.createElement('div');
            categoryCard.classList.add('category-card');

            const categoryTitle = document.createElement('h3');
            categoryTitle.textContent = category.categoryName;
            categoryCard.appendChild(categoryTitle);

            const tagList = document.createElement('div');
            tagList.classList.add('tag-list');

            category.tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.classList.add('tag');
                tagElement.textContent = `#${tag.tagName}`;
                tagList.appendChild(tagElement);
            });

            categoryCard.appendChild(tagList);
            categoryContainer.appendChild(categoryCard);
        });
    }

    async function fetchAndDisplayPosts(userId, searchKeyword = null, page = 0, size = 10) {
        try {
            let apiUrl = `api/1.0/post?page=${page}&size=${size}`;
            if (searchKeyword) {
                apiUrl += `&keyword=${encodeURIComponent(searchKeyword)}`;
            }

            const [likedAndBookmarkedData, postResponse] = await Promise.all([
                fetchLikedAndBookmarkedPosts(userId),
                fetch(apiUrl, { credentials: 'include' })
            ]);

            if (!postResponse.ok) {
                console.error('Error response from server:', await postResponse.text());
                throw new Error(`HTTP error! status: ${postResponse.status}`);
            }

            const posts = await postResponse.json();

            const { likedPosts, bookmarkedPosts } = likedAndBookmarkedData;
            const postsList = document.getElementById('posts-list');

            if (page === 0) {
                postsList.innerHTML = '';
            }

            if (posts.length === 0) {
                postsList.innerHTML += '<p>No posts found</p>';
            } else {
                for (const post of posts) {
                    await displayPost(post, userId, postsList, likedPosts, bookmarkedPosts);
                }
            }

            hasMorePosts = posts.length === size;
        } catch (error) {
            console.error('Error in fetchAndDisplayPosts:', error);
        }
    }

    function setupScrollListener(userId) {
        window.addEventListener('scroll', async () => {
            const { scrollTop, scrollHeight, clientHeight } = document.documentElement;

            if (scrollTop + clientHeight >= scrollHeight - 50 && !isLoading && hasMorePosts) {
                isLoading = true;
                currentPage++;

                await fetchAndDisplayPosts(userId, currentSearchKeyword, currentPage);
                isLoading = false;
            }
        });
    }

    async function setupWebSocketSubscriptions(stompClient, userId) {
        // 這裡可以複製 index.js 中的訂閱邏輯
        subscribeToPostEvents(stompClient, (postEvent) => {
            // 根據 postEvent 處理即時更新
        }, userId);
    }

});
