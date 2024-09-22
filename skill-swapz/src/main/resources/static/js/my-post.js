//my-post.js
import {
    connectWebSocket,
    displayPost,
    fetchLikedAndBookmarkedPosts,
    getUserId,
    handleTagClick,
    startChat
} from './combinedUtils.js';
import {addNavbarStyles, createNavbar} from './navbar.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 添加導航欄
    const navbar = await createNavbar();
    document.body.insertBefore(navbar, document.body.firstChild);
    addNavbarStyles();

    const userId = await getUserId();
    if (userId) {
        console.log('Login User Id:', userId);

        // 連接 WebSocket 並訂閱通知
        const stompClient = await connectWebSocket(userId);
        await stompClient.subscribe('/user/queue/notifications', onNotificationReceived);

        const postsList = document.getElementById('posts-list');

        // 使用事件委託處理聊天按鈕點擊
        postsList.addEventListener('click', async (event) => {
            if (event.target.classList.contains('chat-btn')) {
                event.preventDefault();
                const postId = event.target.id.split('-')[2];
                const post = await fetchPostById(postId); // 假設有這個函數來獲取單個帖子信息
                if (post) {
                    try {
                        const chatUuid = await startChat(post.userId, userId);
                        window.location.href = `/chat.html?chatUuid=${chatUuid}&receiverId=${post.userId}&username=User ${post.userId}`;
                    } catch (error) {
                        console.error('Error starting chat:', error);
                        alert('無法啟動聊天，請稍後再試。');
                    }
                }
            }
        });

        // 使用事件委託處理標籤點擊
        postsList.addEventListener('click', (event) => {
            if (event.target.classList.contains('tag-btn')) {
                event.preventDefault();
                const tag = event.target.textContent;
                handleTagClick(tag);
            }
        });

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
});

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

// 假設的函數，用於獲取單個帖子信息
async function fetchPostById(postId) {
    try {
        const response = await fetch(`api/1.0/post/${postId}`, { credentials: 'include' });
        return await response.json();
    } catch (error) {
        console.error('Error fetching post by ID:', error);
        return null;
    }
}