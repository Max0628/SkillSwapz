// index.js
import {
    connectWebSocket,
    displayPost,
    fetchLikedAndBookmarkedPosts,
    getUserId,
    startChat,
    subscribeToNewPosts
} from './combinedUtils.js';
import {addNavbarStyles, createNavbar} from './navbar.js';

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

        postsList.addEventListener('click', async (event) => {
            if (event.target.classList.contains('chat-btn')) {
                event.preventDefault();
                console.log('Chat button clicked:', event.target.id);
                const postId = event.target.id.split('-')[2];
                const post = await fetchPostById(postId);
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


        const stompClient = await connectWebSocket(userId);
        await stompClient.subscribe('/user/queue/notifications', onNotificationReceived);

        setupSearchAndFilter(userId);

        const result = await fetchAndDisplayPosts(userId, searchKeyword);
        const likedPosts = result?.likedPosts || [];
        const bookmarkedPosts = result?.bookmarkedPosts || [];


        subscribeToNewPosts(stompClient, async (newPost) => {
            console.log('New post received:', newPost);
            requestAnimationFrame(() => {
                const postsList = document.getElementById('posts-list');
                displayPost(newPost, userId, postsList, likedPosts, bookmarkedPosts, true);
            });
        });



        window.addEventListener('tagSearch', (event) => {
            const searchKeyword = event.detail.keyword;
            updateURLAndFetchPosts(userId, searchKeyword);
        });
    } else {
        window.location.href = "auth.html";
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
            return {likedPosts, bookmarkedPosts};

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

async function fetchPostById(postId) {
    try {
        const response = await fetch(`api/1.0/post/${postId}`, { credentials: 'include' });
        return await response.json();
    } catch (error) {
        console.error('Error fetching post by ID:', error);
        return null;
    }
}
