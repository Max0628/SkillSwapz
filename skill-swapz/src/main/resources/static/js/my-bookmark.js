import { displayPost, fetchLikedAndBookmarkedPosts, getUserId, handleBookmark, startChat, connectWebSocket, handleTagClick,handleDelete } from './combinedUtils.js';
import { addNavbarStyles, createNavbar } from './navbar.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 生成導航欄
    const navbar = createNavbar();
    await document.body.insertBefore(await navbar, document.body.firstChild);
    addNavbarStyles();

    // 獲取用戶 ID 並顯示書籤文章
    const userId = await getUserId();
    if (userId) {
        console.log('Login User Id:', userId);

        // 連接 WebSocket 並訂閱通知
        const stompClient = await connectWebSocket(userId);
        stompClient.subscribe('/user/queue/notifications', onNotificationReceived);

        await fetchAndDisplayBookmarkedPosts(userId);

        // 綁定搜尋框和側邊欄的搜尋邏輯
        setupSearchAndFilter(userId);

        // 添加標籤搜索事件監聽器
        window.addEventListener('tagSearch', (event) => {
            const searchKeyword = event.detail.keyword;
            filterBookmarkedPosts(searchKeyword);
        });
    } else {
        window.location.href = "auth.html";
        console.log('User not logged in');
        return null;
    }

    // 處理 WebSocket 接收的通知
    function onNotificationReceived(notification) {
        const data = JSON.parse(notification.body);
        if (data.type === 'newChat') {
            showNotification(`New chat request from User ${data.senderId}`);
        }
    }

    // 顯示桌面通知
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

    // 獲取並顯示書籤文章
    async function fetchAndDisplayBookmarkedPosts(userId, searchKeyword = null) {
        try {
            const { likedPosts, bookmarkedPosts } = await fetchLikedAndBookmarkedPosts(userId);
            const postsList = document.getElementById('bookmarks-list');
            postsList.innerHTML = '';

            const fullPosts = [];

            for (const postId of bookmarkedPosts) {
                const response = await fetch(`/api/1.0/post/${postId}`, { credentials: 'include' });
                const post = await response.json();
                if (!searchKeyword || post.content.includes(searchKeyword) || post.tag.includes(searchKeyword)) {
                    displayPost(post, userId, postsList, likedPosts, bookmarkedPosts);
                    fullPosts.push(post);
                }
            }

            setupPostInteractions(fullPosts, userId, postsList);
        } catch (error) {
            console.error('Error fetching bookmarked posts:', error);
        }
    }

    function setupPostInteractions(fullPosts, userId, postsList) {
        // 綁定聊天按鈕事件
        document.querySelectorAll('.chat-btn').forEach(button => {
            button.addEventListener('click', async (event) => {
                event.preventDefault();
                const postId = event.target.id.split('-')[2];
                const post = fullPosts.find(p => p.id.toString() === postId);
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

        // 綁定收藏按鈕事件
        document.querySelectorAll('.bookmark-btn').forEach(button => {
            button.addEventListener('click', async (event) => {
                const postId = event.target.id.split('-')[2];
                await handleBookmark(postId, userId);
                if (!event.target.classList.contains('bookmarked')) {
                    postsList.removeChild(event.target.closest('.post'));
                }
            });
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
        let debounceTimer;

        const searchInput = document.querySelector('.search-input');
        searchInput.addEventListener('input', (event) => {
            const searchKeyword = event.target.value.trim();

            clearTimeout(debounceTimer);

            debounceTimer = setTimeout(() => {
                filterBookmarkedPosts(searchKeyword);
            }, 500);
        });

        document.querySelectorAll('.popular-tags li').forEach(tag => {
            tag.addEventListener('click', (event) => {
                const searchKeyword = event.target.innerText.replace('#', '').trim();
                filterBookmarkedPosts(searchKeyword);
            });
        });
    }

    // 過濾書籤文章
    function filterBookmarkedPosts(searchKeyword) {
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
            postTitle.textContent = `我的書籤搜索結果：${searchKeyword}`;
        } else {
            postTitle.textContent = '我的書籤';
        }
    }
});