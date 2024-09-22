//my-post.js
import {
    connectWebSocket,
    displayPost,
    fetchLikedAndBookmarkedPosts,
    getUserId,
    handleTagClick,
    startChat,
    handleDelete
} from './combinedUtils.js';
import {addNavbarStyles, createNavbar} from './navbar.js';

document.addEventListener('DOMContentLoaded', async options => {
    // 添加導航欄
    const navbar =await createNavbar();
    document.body.insertBefore(navbar, document.body.firstChild);
    addNavbarStyles();

    const userId = await getUserId();
    if (userId) {
        console.log('Login User Id:', userId);

        // 連接 WebSocket 並訂閱通知
        const stompClient = await connectWebSocket(userId);
        stompClient.subscribe('/user/queue/notifications', onNotificationReceived);

        await fetchAndDisplayUserPosts(userId);

        // 綁定搜尋和分類篩選事件
        setupSearchAndFilter(userId);

        // 添加標籤搜索事件監聽器
        window.addEventListener('tagSearch', (event) => {
            const searchKeyword = event.detail.keyword;
            filterUserPosts(searchKeyword);
        });
    } else {
        console.log('User not logged in');
        return null;
    }

    // 接收 WebSocket 通知的函數
    function onNotificationReceived(notification) {
        const data = JSON.parse(notification.body);
        if (data.type === 'newChat') {
            showNotification(`New chat request from User ${data.senderId}`);
        }
    }

    // 顯示通知
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

    // 獲取並顯示用戶的文章
    async function fetchAndDisplayUserPosts(userId, searchKeyword = null) {
        try {
            const { likedPosts, bookmarkedPosts } = await fetchLikedAndBookmarkedPosts(userId);
            const response = await fetch(`api/1.0/post/user/${userId}`, { credentials: 'include' });
            const posts = await response.json();
            const postsList = document.getElementById('posts-list');
            postsList.innerHTML = '';
            console.log(posts);
            console.log(postsList);

            posts.forEach(post => {
                if (!searchKeyword || post.content.includes(searchKeyword) || post.tag.includes(searchKeyword)) {
                    displayPost(post, userId, postsList, likedPosts, bookmarkedPosts);
                }
            });

            setupPostInteractions(posts, userId);
        } catch (error) {
            console.error('Error fetching user posts:', error);
        }
    }

    function setupPostInteractions(posts, userId) {
        // 綁定聊天按鈕事件
        posts.forEach(post => {
            const chatBtn = document.querySelector(`#chat-btn-${post.id}`);
            if (chatBtn) {
                chatBtn.addEventListener('click', async (event) => {
                    event.preventDefault();
                    try {
                        const chatUuid = await startChat(post.userId, userId);
                        window.location.href = `/chat.html?chatUuid=${chatUuid}&receiverId=${post.userId}&username=User ${post.userId}`;
                    } catch (error) {
                        console.error('Error starting chat:', error);
                        alert('無法啟動聊天，請稍後再試。');
                    }
                });
            }
        });

        // 綁定標籤點擊事件
        document.querySelectorAll('.tag-btn').forEach(tagBtn => {
            tagBtn.addEventListener('click', (event) => {
                event.preventDefault();
                const tag = event.target.textContent;
                handleTagClick(tag);
            });
        });
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
                filterUserPosts(searchKeyword);
            }, 500);  // 500 毫秒延遲
        });

        // 綁定分類標籤
        document.querySelectorAll('.popular-tags li').forEach(tag => {
            tag.addEventListener('click', (event) => {
                const searchKeyword = event.target.innerText.replace('#', '').trim();
                filterUserPosts(searchKeyword);
            });
        });
    }

    // 過濾用戶文章
    function filterUserPosts(searchKeyword) {
        const posts = document.querySelectorAll('.post');
        posts.forEach(post => {
            const postContent = post.textContent.toLowerCase();
            const isVisible = postContent.includes(searchKeyword.toLowerCase());
            post.style.display = isVisible ? 'block' : 'none';
        });

        updatePostsTitle(searchKeyword);
    }

    // 更新文章標題
    function updatePostsTitle(searchKeyword) {
        const postTitle = document.querySelector('#posts h2');
        if (searchKeyword) {
            postTitle.textContent = `我的文章搜索結果：${searchKeyword}`;
        } else {
            postTitle.textContent = '我的文章';
        }
    }
});