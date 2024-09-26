// index.js
import {
    connectWebSocket,
    displayPost,
    fetchLikedAndBookmarkedPosts,
    fetchPostById,
    getUserId,
    startChat,
    subscribeToNewPosts,
    subscribeToPostUpdates
} from './combinedUtils.js';
import {addNavbarStyles, createNavbar} from './navbar.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const navbar = await createNavbar();
        document.body.insertBefore(navbar, document.body.firstChild);
        addNavbarStyles();

        const userId = await getUserId();
        if (!userId) {
            window.location.href = "auth.html";
            console.log('User not logged in');
            return;
        }

        console.log('Login User Id:', userId);

        const urlParams = new URLSearchParams(window.location.search);
        const searchKeyword = urlParams.get('search') || null;

        const postTitle = document.querySelector('#posts h2');
        postTitle.textContent = searchKeyword ? decodeURIComponent(searchKeyword) : '所有文章';

        const postsList = document.getElementById('posts-list');
        const stompClient = await connectWebSocket(userId);

        setupPostListeners(postsList, userId);
        await setupWebSocketSubscriptions(stompClient, userId);
        setupSearchAndFilter(userId);

        const { likedPosts, bookmarkedPosts } = await fetchAndDisplayPosts(userId, searchKeyword);

        window.addEventListener('tagSearch', (event) => {
            const searchKeyword = event.detail.keyword;
            updateURLAndFetchPosts(userId, searchKeyword);
        });

    } catch (error) {
        console.error('Error in main execution:', error);
        alert('發生錯誤，請刷新頁面或稍後再試。');
    }
});

function setupPostListeners(postsList, userId) {
    postsList.addEventListener('click', async (event) => {
        if (event.target.classList.contains('chat-btn')) {
            event.preventDefault();
            const postId = event.target.id.split('-')[2];
            const post = await fetchPostById(postId);
            if (post) {
                try {
                    const chatUuid = await startChat(post.userId, userId);
                    const redirectUrl = `/chat.html?chatUuid=${chatUuid}&receiverId=${post.userId}&username=User ${post.userId}`;
                    window.location.href = redirectUrl;
                } catch (error) {
                    console.error('Error starting chat:', error);
                    alert('無法啟動聊天，請稍後再試。');
                }
            }
        }
    });
}

async function setupWebSocketSubscriptions(stompClient, userId) {
    await stompClient.subscribe('/user/queue/notifications', onNotificationReceived);

    subscribeToNewPosts(stompClient, async (newPost) => {
        console.log('New post received:', newPost);
        newPost.likeCount = newPost.likeCount || 0;
        requestAnimationFrame(() => {
            const postsList = document.getElementById('posts-list');
            displayPost(newPost, userId, postsList, [], [], true);
        });
    });

    subscribeToPostUpdates(stompClient, (updateMessage) => {
        console.log('Post update received:', updateMessage);
        if (updateMessage.type === 'DELETE_POST') {
            removePostFromUI(updateMessage.postId);
        } else if (updateMessage.type === 'CREATE_POST') {
            const postsList = document.getElementById('posts-list');
            displayPost(updateMessage, userId, postsList, [], [], true);
        }
    });
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

async function renderPosts(posts, userId, postsList, likedPosts, bookmarkedPosts) {
    for (const post of posts) {
        await displayPost(post, userId, postsList, likedPosts, bookmarkedPosts);
    }
}

async function fetchAndDisplayPosts(userId, searchKeyword = null) {
    try {
        let apiUrl = 'api/1.0/post';
        if (searchKeyword) {
            apiUrl += `?keyword=${encodeURIComponent(searchKeyword)}`;
        }

        const [likedAndBookmarkedData, postResponse] = await Promise.all([
            fetchLikedAndBookmarkedPosts(userId),
            fetch(apiUrl, { credentials: 'include' })
        ]);

        const posts = await postResponse.json();
        const { likedPosts, bookmarkedPosts } = likedAndBookmarkedData;

        const postsList = document.getElementById('posts-list');
        postsList.innerHTML = '';

        await renderPosts(posts, userId, postsList, likedPosts, bookmarkedPosts);
        return { likedPosts, bookmarkedPosts };

    } catch (error) {
        console.error('Error fetching posts:', error);
        alert('獲取貼文失敗，請稍後再試。');
        return { likedPosts: [], bookmarkedPosts: [] };
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
    postTitle.textContent = searchKeyword ? searchKeyword : '所有文章';

    fetchAndDisplayPosts(userId, searchKeyword);
}

function removePostFromUI(postId) {
    const postElement = document.getElementById(`post-${postId}`);
    if (postElement) {
        postElement.remove();
    } else {
        console.warn(`Post element with id ${postId} not found`);
    }
}