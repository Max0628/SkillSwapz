import { displayPost, fetchLikedAndBookmarkedPosts, getUserId, handleBookmark, startChat, connectWebSocket, handleTagClick,handleDelete } from './combinedUtils.js';
import { addNavbarStyles, createNavbar } from './navbar.js';

document.addEventListener('DOMContentLoaded', async () => {
    const navbar = createNavbar();
    await document.body.insertBefore(await navbar, document.body.firstChild);
    addNavbarStyles();

    const userId = await getUserId();
    if (userId) {
        console.log('Login User Id:', userId);

        const stompClient = await connectWebSocket(userId);
        stompClient.subscribe('/user/queue/notifications', onNotificationReceived);

        await fetchAndDisplayBookmarkedPosts(userId);

        setupSearchAndFilter(userId);

        window.addEventListener('tagSearch', (event) => {
            const searchKeyword = event.detail.keyword;
            filterBookmarkedPosts(searchKeyword);
        });
    } else {
        window.location.href = "auth.html";
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

        document.querySelectorAll('.bookmark-btn').forEach(button => {
            button.addEventListener('click', async (event) => {
                const postId = event.target.id.split('-')[2];
                await handleBookmark(postId, userId);
                if (!event.target.classList.contains('bookmarked')) {
                    postsList.removeChild(event.target.closest('.post'));
                }
            });
        });

        document.querySelectorAll('.tag-btn').forEach(tagBtn => {
            tagBtn.addEventListener('click', (event) => {
                event.preventDefault();
                const tag = event.target.textContent;
                handleTagClick(tag);
            });
        });
    }

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

    function filterBookmarkedPosts(searchKeyword) {
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
            postTitle.textContent = `我的收藏 搜索結果：${searchKeyword}`;
        } else {
            postTitle.textContent = '我的收藏';
        }
    }
});