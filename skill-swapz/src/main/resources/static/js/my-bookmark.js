//my-bookmarks.js
import { displayPost, fetchLikedAndBookmarkedPosts, getUserId, handleBookmark, startChat, connectWebSocket, handleTagClick, handleDelete, subscribeToPostEvents, updateLikeCount, updateCommentCount, createCommentElement } from './combinedUtils.js';
import { addNavbarStyles, createNavbar } from './navbar.js';

let stompClient;
let currentUserId;

document.addEventListener('DOMContentLoaded', async () => {
    const navbar = createNavbar();
    await document.body.insertBefore(await navbar, document.body.firstChild);
    addNavbarStyles();

    currentUserId = await getUserId();
    if (currentUserId) {
        console.log('Login User Id:', currentUserId);

        stompClient = await connectWebSocket(currentUserId);
        await setupWebSocketSubscriptions(stompClient, currentUserId);

        await fetchAndDisplayBookmarkedPosts(currentUserId);

        setupSearchAndFilter(currentUserId);

        window.addEventListener('tagSearch', (event) => {
            const searchKeyword = event.detail.keyword;
            filterBookmarkedPosts(searchKeyword);
        });
    } else {
        window.location.href = "auth.html";
        console.log('User not logged in');
        return null;
    }
});

async function setupWebSocketSubscriptions(stompClient, userId) {
    await stompClient.subscribe('/user/queue/notifications', onNotificationReceived);

    subscribeToPostEvents(stompClient, (postEvent) => {
        console.log("Received postEvent: ", postEvent);

        if (!postEvent || !postEvent.content) {
            console.warn("Invalid postEvent or missing content");
            return;
        }

        switch (postEvent.type) {
            case 'BOOKMARK_POST':
            case 'UNBOOKMARK_POST':
                handleBookmarkUpdate(postEvent.content);
                break;
            case 'UPDATE_POST':
                handleBookmarkedPostUpdate(postEvent.content);
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
            case 'DELETE_POST':
                removePostFromUI(postEvent.content.postId);
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

async function fetchAndDisplayBookmarkedPosts(userId, searchKeyword = null) {
    try {
        const { likedPosts, bookmarkedPosts } = await fetchLikedAndBookmarkedPosts(userId);
        const postsList = document.getElementById('bookmarks-list');
        postsList.innerHTML = '';

        for (const postId of bookmarkedPosts) {
            const response = await fetch(`/api/1.0/post/${postId}`, { credentials: 'include' });
            const post = await response.json();
            if (!searchKeyword || post.content.includes(searchKeyword) || post.tag.includes(searchKeyword)) {
                await displayPost(post, userId, postsList, likedPosts, bookmarkedPosts);
            }
        }

        setupPostInteractions(userId, postsList);
    } catch (error) {
        console.error('Error fetching bookmarked posts:', error);
    }
}

function setupPostInteractions(userId, postsList) {
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
        } else if (target.classList.contains('bookmark-btn')) {
            const postId = target.id.split('-')[2];
            await handleBookmark(postId, userId);
            if (!target.classList.contains('bookmarked')) {
                postsList.removeChild(target.closest('.post'));
            }
        } else if (target.classList.contains('tag-btn')) {
            event.preventDefault();
            const tag = target.textContent;
            handleTagClick(tag);
        }
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

function handleBookmarkUpdate(content) {
    const { postId, isBookmarked } = content;
    if (isBookmarked) {
        fetchAndDisplayBookmarkedPosts(currentUserId);
    } else {
        removePostFromUI(postId);
    }
}

async function handleBookmarkedPostUpdate(content) {
    const { postId } = content;
    const postElement = document.getElementById(`post-${postId}`);
    if (postElement) {
        const updatedPost = await fetchPostById(postId);
        const postsList = document.getElementById('bookmarks-list');
        const { likedPosts, bookmarkedPosts } = await fetchLikedAndBookmarkedPosts(currentUserId);
        postElement.remove();
        await displayPost(updatedPost, currentUserId, postsList, likedPosts, bookmarkedPosts);
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

function removePostFromUI(postId) {
    const postElement = document.getElementById(`post-${postId}`);
    if (postElement) {
        postElement.remove();
    }
}

async function fetchPostById(postId) {
    try {
        const response = await fetch(`/api/1.0/post/${postId}`, { credentials: 'include' });
        if (!response.ok) {
            throw new Error('Failed to fetch post');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching post by ID:', error);
        return null;
    }
}