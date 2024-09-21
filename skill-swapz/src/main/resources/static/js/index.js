import { getUserId, fetchLikedAndBookmarkedPosts, displayPost, startChat, connectWebSocket } from './combinedUtils.js';
import { createNavbar, addNavbarStyles } from './navbar.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 添加導航欄
    const navbar = createNavbar();
    document.body.insertBefore(navbar, document.body.firstChild);
    addNavbarStyles();


    // 獲取用戶 ID
    const userId = await getUserId();
    if (userId) {
        console.log('Login User Id:', userId);

        // 從 URL 中獲取搜尋關鍵字
        const urlParams = new URLSearchParams(window.location.search);
        const searchKeyword = urlParams.get('search') || null;

        // 更新 h2 標籤，根據是否有搜尋關鍵字
        const postTitle = document.querySelector('#posts h2');
        if (searchKeyword) {
            postTitle.textContent = decodeURIComponent(searchKeyword); // 更新 h2 為搜尋關鍵字
        } else {
            postTitle.textContent = '所有文章'; // 預設顯示
        }

        // 預設顯示所有文章
        await fetchAndDisplayPosts(userId, searchKeyword);

        // 連接 WebSocket 並訂閱通知
        const stompClient = await connectWebSocket(userId);
        stompClient.subscribe('/user/queue/notifications', onNotificationReceived);

        // 綁定搜尋和分類篩選事件
        setupSearchAndFilter(userId);
    } else {
        console.log('User not logged in');
        return null;
    }

    function onNotificationReceived(notification) {
        const data = JSON.parse(notification.body);
        if (data.type === 'newChat') {
            showNotification(`New chat request from User ${data.senderId}`);
        }
    }

    function showNotification(message) {
        if (Notification.permission === "granted") {
            new Notification(message);
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    new Notification(message);
                }
            });
        }
    }

    // 主要的文章獲取與顯示邏輯，帶有搜尋與分類功能
    async function fetchAndDisplayPosts(userId, searchKeyword = null) {
        try {
            const { likedPosts, bookmarkedPosts } = await fetchLikedAndBookmarkedPosts(userId);

            // 構建 API URL，根據關鍵字篩選
            let apiUrl = 'api/1.0/post';
            if (searchKeyword) {
                apiUrl += `?keyword=${encodeURIComponent(searchKeyword)}`;
            }

            const response = await fetch(apiUrl, { credentials: 'include' });
            const posts = await response.json();
            const postsList = document.getElementById('posts-list');
            postsList.innerHTML = '';

            posts.forEach(post => {
                displayPost(post, userId, postsList, likedPosts, bookmarkedPosts);
            });

            // 綁定聊天按鈕事件
            document.querySelectorAll('.chat-btn').forEach(button => {
                button.addEventListener('click', async (event) => {
                    event.preventDefault();
                    const postId = event.target.id.split('-')[2];
                    const post = posts.find(p => p.id.toString() === postId);
                    if (post) {
                        try {
                            const chatUuid = await startChat(post.userId, userId);
                            window.location.href = `/chat.html?chatUuid=${chatUuid}&receiverId=${post.userId}&username=User ${post.userId}`;
                        } catch (error) {
                            console.error('Error starting chat:', error);
                            alert('無法啟動聊天，請稍後再試。');
                        }
                    }
                });
            });
        } catch (error) {
            console.error('Error fetching posts:', error);
        }
    }

    function setupSearchAndFilter(userId) {
        // 綁定搜尋框
        const searchInput = document.querySelector('.search-input');
        searchInput.addEventListener('input', (event) => {
            const searchKeyword = event.target.value.trim();
            updateURLAndFetchPosts(userId, searchKeyword);
        });

        // 綁定分類標籤
        document.querySelectorAll('.popular-tags li').forEach(tag => {
            tag.addEventListener('click', (event) => {
                const searchKeyword = event.target.innerText.replace('#', '').trim();
                updateURLAndFetchPosts(userId, searchKeyword);
            });
        });
    }

// 更新 URL 並重新獲取文章
    function updateURLAndFetchPosts(userId, searchKeyword = null) {
        let newUrl = '/index.html';
        if (searchKeyword) {
            newUrl += `?search=${encodeURIComponent(searchKeyword)}`;
        }
        window.history.pushState({}, '', newUrl);

        // 更新 h2 標籤
        const postTitle = document.querySelector('#posts h2');
        if (searchKeyword) {
            postTitle.textContent = searchKeyword;  // 更新 h2 為搜尋關鍵字
        } else {
            postTitle.textContent = '所有文章';    // 如果沒有關鍵字，顯示預設的標題
        }

        // 重新獲取並顯示文章
        fetchAndDisplayPosts(userId, searchKeyword);
    }

});
