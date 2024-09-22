// index.js
import {
    getUserId,
    fetchLikedAndBookmarkedPosts,
    displayPost,
    startChat,
    connectWebSocket,
    handleTagClick,
    handleDelete
} from './combinedUtils.js';
import { createNavbar, addNavbarStyles } from './navbar.js';

document.addEventListener('DOMContentLoaded', async () => {
    const navbar = await createNavbar();
    document.body.insertBefore(navbar, document.body.firstChild);
    addNavbarStyles();

    const userId = await getUserId();
    if (userId) {
        console.log('Login User Id:', userId);

        const urlParams = new URLSearchParams(window.location.search);
        const searchKeyword = urlParams.get('search') || null;

        const postTitle = document.querySelector('#posts h2');
        if (searchKeyword) {
            postTitle.textContent = decodeURIComponent(searchKeyword);
        } else {
            postTitle.textContent = '所有文章';
        }

        const postsList = document.getElementById('posts-list');

        // 使用事件委託處理聊天按鈕點擊
        postsList.addEventListener('click', async (event) => {
            if (event.target.classList.contains('chat-btn')) {
                event.preventDefault();
                console.log('Chat button clicked:', event.target.id);
                const postId = event.target.id.split('-')[2];
                const post = await fetchPostById(postId); // 假設有這個函數來獲取單個帖子信息
                if (post) {
                    try {
                        const chatUuid = await startChat(post.userId, userId);
                        console.log('index.js Chat UUID:', chatUuid);
                        const redirectUrl = `/chat.html?chatUuid=${chatUuid}&receiverId=${post.userId}&username=User ${post.userId}`;
                        console.log('Redirecting to:', redirectUrl);
                        window.location.href = redirectUrl;
                    } catch (error) {
                        console.error('Error starting chat:', error);
                        alert('無法啟動聊天，請稍後再試。');
                    }
                }
            }
        });

        await fetchAndDisplayPosts(userId, searchKeyword);

        const stompClient = await connectWebSocket(userId);
        await stompClient.subscribe('/user/queue/notifications', onNotificationReceived);

        setupSearchAndFilter(userId);

        window.addEventListener('tagSearch', (event) => {
            const searchKeyword = event.detail.keyword;
            updateURLAndFetchPosts(userId, searchKeyword);
        });
    } else {
        console.log('User not logged in');
        return null;
    }

    async function onNotificationReceived(notification) {
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

    async function fetchAndDisplayPosts(userId, searchKeyword = null) {
        try {
            const { likedPosts, bookmarkedPosts } = await fetchLikedAndBookmarkedPosts(userId);

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
        } catch (error) {
            console.error('Error fetching posts:', error);
        }
    }

    function setupSearchAndFilter(userId) {
        const searchInput = document.querySelector('.search-input');
        searchInput.addEventListener('input', (event) => {
            const searchKeyword = event.target.value.trim();
            updateURLAndFetchPosts(userId, searchKeyword);
        });

        document.querySelectorAll('.popular-tags li').forEach(tag => {
            tag.addEventListener('click', (event) => {
                const searchKeyword = event.target.innerText.replace('#', '').trim();
                updateURLAndFetchPosts(userId, searchKeyword);
            });
        });
    }

    function updateURLAndFetchPosts(userId, searchKeyword = null) {
        let newUrl = '/index.html';
        if (searchKeyword) {
            newUrl += `?search=${encodeURIComponent(searchKeyword)}`;
        }
        window.history.pushState({}, '', newUrl);

        const postTitle = document.querySelector('#posts h2');
        if (searchKeyword) {
            postTitle.textContent = searchKeyword;
        } else {
            postTitle.textContent = '所有文章';
        }

        fetchAndDisplayPosts(userId, searchKeyword);
    }
});

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