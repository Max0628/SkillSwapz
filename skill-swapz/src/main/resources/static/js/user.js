//user.js
import {
    connectWebSocket,
    createCommentElement,
    displayPost,
    fetchLikedAndBookmarkedPosts,
    getUserId,
    handleBookmark,
    handleDelete,
    startChat,
    subscribeToPostEvents,
    updateCommentCount,
    updateLikeCount
} from './combinedUtils.js';
import {addNavbarStyles, createNavbar} from './navbar.js';

let stompClient;
let currentUserId;


document.addEventListener('DOMContentLoaded', async () => {
    const userId = getQueryParam('userId');  // 獲取 URL 中的 userId
    if (!userId) {
        console.error('No userId found in URL');
        return;
    }

    const navbar = await createNavbar();
    document.body.insertBefore(navbar, document.body.firstChild);
    addNavbarStyles();

    // 設置 WebSocket 並獲取登入使用者 id
    currentUserId = await getUserId();
    if (currentUserId) {
        console.log('Login User Id:', currentUserId);

        stompClient = await connectWebSocket(currentUserId);
        await setupWebSocketSubscriptions(stompClient, currentUserId);

        // 根據 URL 中的 userId 加載並顯示使用者資料
        await fetchAndDisplayUserProfile(userId);

        // 根據 URL 中的 userId 加載並顯示該使用者發文
        await fetchAndDisplayUserPosts(userId);

    } else {
        window.location.href = "landingPage.html";
    }
});

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}


// 移出到全局作用範圍
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
                }
            }
        } else if (target.classList.contains('tag-btn')) {
            event.preventDefault();
            let tag = target.textContent.trim();  // 去除多餘的空格
            tag = tag.replace(/^#/, '');  // 移除開頭的 #
            console.log("Processed tag: " + tag);
            navigateToSearchPage(tag);
        } else if (target.classList.contains('delete-btn')) {
            const postId = target.id.split('-')[2];
            await handleDelete(postId, userId);
        } else if (target.classList.contains('like-btn')) {
            const postId = target.id.split('-')[2];
            await handleLike(postId, userId);
        } else if (target.classList.contains('bookmark-btn')) {
            const postId = target.id.split('-')[2];
            await handleBookmark(postId, userId);
        }
    });
}
function navigateToSearchPage(tag) {
    console.log("Navigating to search with tag: " + tag);
    if (!tag) {
        console.error('Invalid tag provided to navigateToSearchPage');
        return;
    }
    const cleanTag = tag.trim();  // 再次確保標籤已被處理乾淨
    const searchKeyword = encodeURIComponent(cleanTag);
    window.location.href = `/index.html?search=${searchKeyword}`;
}


async function fetchAndDisplayUserPosts(profileUserId, searchKeyword = null) {
    try {
        const { likedPosts, bookmarkedPosts } = await fetchLikedAndBookmarkedPosts(currentUserId);
        const response = await fetch(`/api/1.0/post/user/${profileUserId}`, { credentials: 'include' });

        if (!response.ok) {
            throw new Error('Failed to fetch user posts');
        }

        let posts = await response.json();
        const postsList = document.querySelector('.posts-list');
        postsList.innerHTML = '';

        posts = posts.map(post => ({
            ...post,
            createdAt: adjustTimeForBookmarks(post.createdAt)
        }));

        posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        for (const post of posts) {
            if (!searchKeyword || post.content.includes(searchKeyword) || post.tag.includes(searchKeyword)) {
                await displayPost(post, currentUserId, postsList, likedPosts, bookmarkedPosts);
            }
        }
        setupPostInteractions(postsList, currentUserId);

    } catch (error) {
        console.error('Error fetching user posts:', error);
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

async function fetchAndDisplayUserProfile(profileUserId) {
    try {
        const response = await fetch(`/api/1.0/user/profile?userId=${profileUserId}`, { credentials: 'include' });
        if (!response.ok) {
            throw new Error('Failed to fetch user profile');
        }

        const userData = await response.json();
        console.log('User Profile Data:', userData);

        // 渲染使用者的個人資料到頁面
        document.querySelector('.user-name').textContent = userData.username;
        document.querySelector('.user-job-title').textContent = userData.jobTitle;

        // 使用 formatTimeAgo 函數來計算加入時間
        const timeAgo = formatTimeAgo(userData.createdAt);
        document.querySelector('.user-create-time').textContent = `${timeAgo}`;

        document.querySelector('.user-intro p').textContent = userData.bio;

        // 預設佔位圖片
        let avatarUrl = userData.avatarUrl || 'https://maxchauo-stylish-bucket.s3.ap-northeast-1.amazonaws.com/0_OtvYrwTXmO0Atzj5.webp';

        // 使用 <img> 顯示大頭貼
        const avatarElement = document.querySelector('.user-avatar');
        avatarElement.src = avatarUrl;
        avatarElement.alt = `${userData.username}'s avatar`;

        // 如果是當前登入的使用者，顯示編輯按鈕或其他功能
        if (currentUserId === profileUserId) {
            document.querySelector('.edit-profile-btn').style.display = 'block';
        }
    } catch (error) {
        console.error('Error fetching user profile:', error);
    }
}



export function formatTimeAgo(dateString) {
    if (!dateString) {
        console.error('Invalid dateString provided to formatTimeAgo');
        return '';
    }

    const date = new Date(dateString);
    const now = new Date();

    // 計算時間差（秒）
    const diffInSeconds = Math.floor((now - date) / 1000);

    console.log(`Now: ${now}, Date: ${date}, Diff in seconds: ${diffInSeconds}`);

    // 如果時間差小於 60 秒，顯示「剛剛加入」
    if (diffInSeconds < 60) {
        return '剛剛加入';
    } else if (diffInSeconds < 3600) { // 小於 1 小時，顯示多少分鐘前
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} 分鐘前加入`;
    } else if (diffInSeconds < 86400) { // 小於 24 小時，顯示多少小時前
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} 小時前加入`;
    } else if (diffInSeconds < 2592000) { // 小於 30 天，顯示多少天前
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} 天前加入`;
    } else if (diffInSeconds < 31536000) { // 小於一年，顯示多少個月前
        const months = Math.floor(diffInSeconds / 2592000);
        return `${months} 個月前加入`;
    } else { // 超過一年，顯示多少年前
        const years = Math.floor(diffInSeconds / 31536000);
        return `${years} 年前加入`;
    }
}

