//my-post.js
import {
    connectWebSocket,
    displayPost,
    fetchLikedAndBookmarkedPosts,
    getUserId,
    handleTagClick,
    startChat,
    subscribeToPostEvents,
    updateLikeCount,
    updateCommentCount,
    createCommentElement,
    handleDelete,
    handleBookmark
} from './combinedUtils.js';
import {addNavbarStyles, createNavbar} from './navbar.js';

let stompClient;
let currentUserId;

document.addEventListener('DOMContentLoaded', async () => {
    const navbar = await createNavbar();
    await document.body.insertBefore(navbar, document.body.firstChild);
    addNavbarStyles();

    currentUserId = await getUserId();
    if (currentUserId) {
        console.log('Login User Id:', currentUserId);

        stompClient = await connectWebSocket(currentUserId);
        await setupWebSocketSubscriptions(stompClient, currentUserId);

        const postsList = document.getElementById('posts-list');
        setupPostInteractions(postsList, currentUserId);

        await fetchAndDisplayUserPosts(currentUserId);

        setupSearchAndFilter(currentUserId);

        window.addEventListener('tagSearch', (event) => {
            const searchKeyword = event.detail.keyword;
            filterUserPosts(searchKeyword);
        });
    } else {
        window.location.href = "landingPage.html";
        console.log('User not logged in');
        return null;
    }
});

async function setupWebSocketSubscriptions(stompClient, userId) {
    stompClient.subscribe('/user/queue/notifications', onNotificationReceived);

    subscribeToPostEvents(stompClient, (postEvent) => {
        console.log("Received postEvent: ", postEvent);

        if (!postEvent || !postEvent.content) {
            console.warn("Invalid postEvent or missing content");
            return;
        }

        switch (postEvent.type) {
            case 'CREATE_POST':
                handleNewPost(postEvent.content);
                break;
            case 'UPDATE_POST':
                handlePostUpdate(postEvent.content);
                break;
            case 'DELETE_POST':
                removePostFromUI(postEvent.content.postId);
                break;
            case 'LIKE_POST':
            case 'UNLIKE_POST':
                handleLikeUpdate(postEvent.content);
                break;
            case 'CREATE_COMMENT':
                handleCommentUpdate(postEvent.content);
                break;
            case 'DELETE_COMMENT':
                handleDeleteComment(postEvent.content);
                break;
            default:
                console.log('Received unknown post event type:', postEvent.type);
        }
    }, userId);
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

function setupPostInteractions(postsList, userId) {
    postsList.addEventListener('click', async (event) => {
        const target = event.target;

        if (target.classList.contains('chat-btn')) {
            event.preventDefault();
            const postId = target.id.split('-')[2];
            const post = await fetchPostById(postId);
            if (post) {
                try {
                    const chatUuid = await startChat(post.userId, userId);
                    window.location.href = `/chat.html?chatUuid=${chatUuid}&receiverId=${post.userId}&username=User ${post.userId}`;
                } catch (error) {
                    return null;
                    // console.error('Error starting chat:', error);
                    // alert('無法啟動聊天，請稍後再試。');
                }
            }
        } else if (target.classList.contains('tag-btn')) {
            event.preventDefault();
            const tag = target.textContent;
            handleTagClick(tag);
        } else if (target.classList.contains('delete-btn')) {
            const postId = target.id.split('-')[2];
            await handleDelete(postId, userId);
        } else if (target.classList.contains('like-btn')) {
            const postId = target.id.split('-')[2];
            // Assuming you have a handleLike function in combinedUtils.js
            await handleLike(postId, userId);
        } else if (target.classList.contains('bookmark-btn')) {
            const postId = target.id.split('-')[2];
            await handleBookmark(postId, userId);
        }
    });
}

async function fetchAndDisplayUserPosts(userId, searchKeyword = null) {
    try {
        const { likedPosts, bookmarkedPosts } = await fetchLikedAndBookmarkedPosts(userId);
        const response = await fetch(`api/1.0/post/user/${userId}`, { credentials: 'include' });
        let posts = await response.json();
        const postsList = document.getElementById('posts-list');
        postsList.innerHTML = '';
        console.log(posts);
        console.log(postsList);

        posts = posts.map(post => ({
            ...post,
            createdAt: adjustTimeForBookmarks(post.createdAt)
        }));
        posts.sort((a, b) => b.createdAt - a.createdAt);

        for (const post of posts) {
            if (!searchKeyword || post.content.includes(searchKeyword) || post.tag.includes(searchKeyword)) {
                await displayPost(post, userId, postsList, likedPosts, bookmarkedPosts);
            }
        }
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
    const posts = Array.from(document.querySelectorAll('.post'));
    posts.sort((a, b) => {
        const dateA = adjustTimeForBookmarks(a.querySelector('.post-actual-time').textContent);
        const dateB = adjustTimeForBookmarks(b.querySelector('.post-actual-time').textContent);
        return dateB - dateA;
    });

    const postsList = document.getElementById('posts-list');
    postsList.innerHTML = '';

    posts.forEach(post => {
        const postContent = post.textContent.toLowerCase();
        const isVisible = postContent.includes(searchKeyword.toLowerCase());
        if (isVisible) {
            postsList.appendChild(post);
        }
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

async function handleNewPost(postData) {
    if (postData.userId === currentUserId) {
        const { likedPosts, bookmarkedPosts } = await fetchLikedAndBookmarkedPosts(currentUserId);
        const postsList = document.getElementById('posts-list');
        await displayPost(postData, currentUserId, postsList, likedPosts, bookmarkedPosts, true);
    }
}

async function handlePostUpdate(postData) {
    if (postData.userId === currentUserId) {
        const postElement = document.getElementById(`post-${postData.id}`);
        if (postElement) {
            const { likedPosts, bookmarkedPosts } = await fetchLikedAndBookmarkedPosts(currentUserId);
            const postsList = document.getElementById('posts-list');
            postElement.remove();
            await displayPost(postData, currentUserId, postsList, likedPosts, bookmarkedPosts);
        }
    }
}

function removePostFromUI(postId) {
    const postElement = document.getElementById(`post-${postId}`);
    if (postElement) {
        postElement.remove();
    }
}

function handleLikeUpdate(content) {
    const { postId, likeCount } = content;
    updateLikeCount(postId, likeCount);
}

async function handleCommentUpdate(content) {
    const { post_id: postId, id: commentId } = content;
    const commentSection = document.getElementById(`comment-section-${postId}`);
    if (commentSection) {
        const newComment = await createCommentElement(content, currentUserId);
        commentSection.querySelector('.comments-container').appendChild(newComment);
        updateCommentCount(postId, true);
    }
}

function handleDeleteComment(content) {
    const { commentId, postId } = content;
    const commentElement = document.querySelector(`[data-comment-id='${commentId}']`);
    if (commentElement) {
        commentElement.remove();
        updateCommentCount(postId, false);
    }
}

function adjustTimeForBookmarks(dateString) {
    const date = new Date(dateString);
    date.setHours(date.getHours() + 8);
    return date;
}