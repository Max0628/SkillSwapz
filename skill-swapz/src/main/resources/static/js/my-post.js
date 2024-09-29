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
    const navbar = await createNavbar();
    document.body.insertBefore(navbar, document.body.firstChild);
    addNavbarStyles();

    const userId = await getUserId();
    if (userId) {
        console.log('Login User Id:', userId);

        const stompClient = await connectWebSocket(userId);
        await stompClient.subscribe('/user/queue/notifications', onNotificationReceived);

        const postsList = document.getElementById('posts-list');

        postsList.addEventListener('click', async (event) => {
            if (event.target.classList.contains('chat-btn')) {
                event.preventDefault();
                const postId = event.target.id.split('-')[2];
                const post = await fetchPostById(postId);
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

        postsList.addEventListener('click', (event) => {
            if (event.target.classList.contains('tag-btn')) {
                event.preventDefault();
                const tag = event.target.textContent;
                handleTagClick(tag);
            }
        });

        await fetchAndDisplayUserPosts(userId);

        setupSearchAndFilter(userId);

        window.addEventListener('tagSearch', (event) => {
            const searchKeyword = event.detail.keyword;
            filterUserPosts(searchKeyword);
        });
    } else {
        window.location.href = "auth.html";
        console.log('User not logged in');
        return null;
    }
});

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

function setupSearchAndFilter(userId) {
    let debounceTimer;

    const searchInput = document.querySelector('.search-input');
    searchInput.addEventListener('input', (event) => {
        const searchKeyword = event.target.value.trim();

        clearTimeout(debounceTimer);

        debounceTimer = setTimeout(() => {
            filterUserPosts(searchKeyword);
        }, 500);
    });

    document.querySelectorAll('.popular-tags li').forEach(tag => {
        tag.addEventListener('click', (event) => {
            const searchKeyword = event.target.innerText.replace('#', '').trim();
            filterUserPosts(searchKeyword);
        });
    });
}

function filterUserPosts(searchKeyword) {
    const posts = document.querySelectorAll('.post');
    posts.forEach(post => {
        const postContent = post.textContent.toLowerCase();
        const isVisible = postContent.includes(searchKeyword.toLowerCase());
        post.style.display = isVisible ? 'block' : 'none';
    });

    updatePostsTitle(searchKeyword);
}

function updatePostsTitle(searchKeyword) {
    const postTitle = document.querySelector('#posts h2');
    if (searchKeyword) {
        postTitle.textContent = `我的文章 搜索結果：${searchKeyword}`;
    } else {
        postTitle.textContent = '我的文章';
    }
}

async function fetchPostById(postId) {
    try {
        const response = await fetch(`api/1.0/post/${postId}`, { credentials: 'include' });
        return await response.json();
    } catch (error) {
        console.error('Error fetching post by ID:', error);
        return null;
    }
}