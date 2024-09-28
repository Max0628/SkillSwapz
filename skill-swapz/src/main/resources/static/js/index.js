// index.js
import {
    connectWebSocket,
    createCommentElement,
    displayPost,
    fetchLikedAndBookmarkedPosts,
    fetchPostById,
    getUserId,
    startChat,
    subscribeToPostEvents,
    updateCommentCount,
    updateLikeCount
} from './combinedUtils.js';
import {addNavbarStyles, createNavbar} from './navbar.js';

let currentUserId = getUserId();

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

        await setupWebSocketSubscriptions(stompClient, userId);

        setupPostListeners(postsList, userId);



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
    console.log("setupWebSocketSubscriptions is called with userId:", userId);
    await stompClient.subscribe('/user/queue/notifications', onNotificationReceived);

    subscribeToPostEvents(stompClient, (postEvent) => {
        console.log("Received postEvent: ", postEvent);
        console.log(postEvent.type)
        const postsList = document.getElementById('posts-list');
        switch (postEvent.type) {
            case 'CREATE_POST':
                const newPost = postEvent.content;
                console.log("EXECUTING CREATE_POST");
                console.log("New post:", newPost.postId);
                newPost.likeCount = 0;
                displayPost(newPost, userId, postsList, [], [], true);
                break;
            case 'DELETE_POST':
                const postId = postEvent.content.postId;
                console.log("Deleting post with ID:", postId);
                removePostFromUI(postId);
                break;
            case 'LIKE_POST':
            case 'UNLIKE_POST':
                const likedPostId = postEvent.content.postId;
                const likeCount = postEvent.content.likeCount;
                console.log("UNLIKE A POST");
                updateLikeCount(likedPostId, likeCount);
                break;
            case 'CREATE_COMMENT':
                console.log("CREATING COMMENT in setupWebSocketSubscriptions", commentData);
                const commentData = postEvent.content;
                const commentSection = document.getElementById(`comment-section-${commentData.post_id}`);
                if (commentSection) {
                    console.log("commentSection is true");
                    createCommentElement(commentData, userId)  // 這裡傳入 userId 作為 currentUserId
                        .then(newComment => {
                            commentSection.appendChild(newComment);
                            updateCommentCount(commentData.post_id, true);
                            console.log("HIHIHIHIHI");
                        })
                        .catch(error => console.error('Error creating comment element:', error));
                } else {
                    console.warn(`Comment section not found for postId: ${commentData.post_id}`);
                }
                break;
            case 'ERROR':
                console.error('Error event received:', postEvent.content);
                break;
            default:
                console.log('Received unknown post event type:', postEvent.type);
        }
    }, userId);  // 將 userId 作為 currentUserId 傳遞
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

        for (const post of posts) {
            await displayPost(post, userId, postsList, likedPosts, bookmarkedPosts);
        }

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

export function removePostFromUI(postId) {
    if (!postId) {
        console.error('Invalid postId provided to removePostFromUI');
        return;
    }

    const postElement = document.getElementById(`post-${postId}`);
    if (postElement) {
        postElement.remove();
        console.log(`Post with ID ${postId} successfully removed from UI`);
    } else {
        console.warn(`Post element with ID ${postId} not found in the DOM`);
    }
}

