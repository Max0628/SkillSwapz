// index.js
import {
    connectWebSocket,
    createCommentElement,
    displayPost,
    fetchLikedAndBookmarkedPosts,
    fetchPostById,
    getUserId,
    handleDeleteComment,
    startChat,
    subscribeToPostEvents,
    updateCommentCount,
    updateLikeCount,
    formatTimeAgo
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
        setupScrollListener(userId, searchKeyword);
        setupSearchAndFilter(userId);

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

        if (!postEvent || !postEvent.content) {
            console.warn("Invalid postEvent or missing content");
            return;
        }

        const postsList = document.getElementById('posts-list');
        switch (postEvent.type) {
            case 'CREATE_POST': {
                const newPost = postEvent.content;
                console.log("EXECUTING CREATE_POST");
                console.log("New post:", newPost.postId);
                newPost.likeCount = 0;
                newPost.createdAt = formatTimeAgo(newPost.createdAt); // 格式化創建時間
                displayPost(newPost, userId, postsList, [], [], true);
                break;
            }

            case 'DELETE_POST': {
                const postId = postEvent.content.postId;
                console.log("Deleting post with ID:", postId);
                removePostFromUI(postId);
                break;
            }

            case 'LIKE_POST':
            case 'UNLIKE_POST': {
                const likedPostId = postEvent.content.postId;
                const likeCount = postEvent.content.likeCount;
                console.log("UNLIKE A POST");
                updateLikeCount(likedPostId, likeCount);
                break;
            }

            case 'CREATE_COMMENT': {
                console.log("CREATING COMMENT in setupWebSocketSubscriptions", postEvent.content);
                const commentData = postEvent.content;
                const commentSection = document.getElementById(`comment-section-${commentData.post_id}`);
                if (commentSection) {
                    console.log("commentSection is true");
                    createCommentElement(commentData, userId)
                        .then(newComment => {
                            commentSection.appendChild(newComment);
                            updateCommentCount(commentData.post_id, true);
                        })
                        .catch(error => console.error('Error creating comment element:', error));
                } else {
                    console.warn(`Comment section not found for postId: ${commentData.post_id}`);
                }
                break;
            }

            case 'DELETE_COMMENT': {
                console.log("Handling DELETE_COMMENT in subscribeToPostEvents", postEvent.content, "currentUserId:", userId);
                const {commentId, postId} = postEvent.content;
                handleDeleteComment(commentId, undefined, postId);
                break;
            }

            case 'ERROR': {
                console.error('Error event received:', postEvent.content);
                break;
            }

            default: {
                console.log('Received unknown post event type:', postEvent.type);
            }
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

async function renderPosts(posts, userId, postsList, likedPosts, bookmarkedPosts) {
    for (const post of posts) {
        await displayPost(post, userId, postsList, likedPosts, bookmarkedPosts);
    }
}


async function fetchAndDisplayPosts(userId, searchKeyword = null, page = 0, size = 10) {
    try {
        let apiUrl = `api/1.0/post?page=${page}&size=${size}`;
        if (searchKeyword) {
            apiUrl += `&keyword=${encodeURIComponent(searchKeyword)}`;
        }

        const [likedAndBookmarkedData, postResponse] = await Promise.all([
            fetchLikedAndBookmarkedPosts(userId),
            fetch(apiUrl, { credentials: 'include' })
        ]);

        const posts = await postResponse.json();
        const { likedPosts, bookmarkedPosts } = likedAndBookmarkedData;
        const postsList = document.getElementById('posts-list');

        if (page === 0) {
            postsList.innerHTML = ''; // 清空現有的帖子，只在第一頁時執行
        }

        await renderPosts(posts, userId, postsList, likedPosts, bookmarkedPosts);

        return { likedPosts, bookmarkedPosts, hasMore: posts.length === size };

    } catch (error) {
        console.error('Error fetching posts:', error);
        alert('獲取貼文失敗，請稍後再試。');
        return { likedPosts: [], bookmarkedPosts: [], hasMore: false };
    }
}

function setupSearchAndFilter(userId) {
    const searchInput = document.querySelector('.search-input');
    let debounceTimer;

    searchInput.addEventListener('input', (event) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const searchKeyword = event.target.value.trim();
            updateURLAndFetchPosts(userId, searchKeyword);
        }, 300); // 300ms 延遲
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

    const postsList = document.getElementById('posts-list');
    postsList.innerHTML = ''; // 清空現有的帖子

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


function setupScrollListener(userId, searchKeyword) {
    let currentPage = 0;
    let isLoading = false;
    let hasMorePosts = true;

    window.addEventListener('scroll', async () => {
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;

        // 如果滾動接近底部且不是正在加載，則加載下一頁資料
        if (scrollTop + clientHeight >= scrollHeight - 50 && !isLoading && hasMorePosts) {
            isLoading = true;
            currentPage++;

            const { hasMore } = await fetchAndDisplayPosts(userId, searchKeyword, currentPage);
            hasMorePosts = hasMore;  // 如果返回的資料小於 size，表示沒有更多資料了
            isLoading = false;
        }
    });
}



