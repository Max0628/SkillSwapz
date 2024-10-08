// combinedUtils.js
let stompClient = null;
const commentCache = {}; // 格式: { postId1: [comment1, comment2], postId2: [comment3] }

export async function getUserId() {
    try {
        const response = await fetch('api/1.0/auth/me', {
            method: 'POST',
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user ID');
        }

        const data = await response.json();
        return data.user_id;
    } catch (error) {
        console.error('Error fetching user ID:', error);
        window.location.href = "auth.html";
        return null;
    }
}

export async function fetchUserDetails(userId) {
    if (!userId) {
        console.error('Invalid userId provided to fetchUserDetails');
        return null;
    }

    try {
        const response = await fetch(`api/1.0/user/profile?userId=${userId}`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch user details for userId: ${userId}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching user details:', error);
        return {
            username: 'Unknown User',
            avatarUrl: 'https://maxchauo-stylish-bucket.s3.ap-northeast-1.amazonaws.com/0_OtvYrwTXmO0Atzj5.webp'
        };
    }
}

export function connectWebSocket(userId) {
    if (!userId) {
        console.error('Invalid userId provided to connectWebSocket');
        return Promise.reject(new Error('Invalid userId'));
    }

    const socket = new SockJS(`/ws?user_id=${encodeURIComponent(userId)}`);
    stompClient = Stomp.over(socket);

    const maxReconnectAttempts = 5;
    const baseDelay = 3000;
    let reconnectAttempts = 0;
    let isConnecting = false;

    function connect() {
        return new Promise((resolve, reject) => {
            if (isConnecting) {
                console.log('Connection attempt already in progress, skipping.');
                return;
            }
            isConnecting = true;

            stompClient.connect(
                {userId: userId},
                frame => {
                    console.log(`Successfully connected to WebSocket, User ID: ${userId}`);
                    reconnectAttempts = 0;
                    isConnecting = false;
                    stompClient.subscribe('/user/queue/unreadCount', function(message) {
                        const unreadCount = JSON.parse(message.body);
                        updateUnreadMessageCount(unreadCount);
                    });
                    resolve(stompClient);
                },
                error => {
                    console.error('WebSocket connection error:', error);
                    isConnecting = false;
                    reconnect(resolve, reject);
                }
            );
        });
    }

    function reconnect(resolve, reject) {
        if (reconnectAttempts >= maxReconnectAttempts) {
            console.error('Maximum reconnection attempts reached. Giving up.');
            reject(new Error('Unable to connect after multiple attempts'));
            return;
        }

        reconnectAttempts++;
        const delay = baseDelay * Math.pow(2, reconnectAttempts - 1);
        console.log(`Preparing reconnection attempt ${reconnectAttempts}, retrying in ${delay}ms...`);

        setTimeout(() => {
            console.log(`Starting reconnection attempt ${reconnectAttempts}`);
            connect().then(resolve).catch(() => {
                reconnect(resolve, reject);
            });
        }, delay);
    }

    stompClient.ws.onclose = (event) => {
        console.log('WebSocket connection closed. Reason:', event.reason);
        if (!isConnecting) {
            reconnect(() => {}, console.error);
        }
    };

    return connect();
}

export async function getUnreadMessageCounts(userId) {
    if (!userId) {
        console.error('Invalid userId provided to getUnreadMessageCounts');
        return {};
    }

    try {
        const response = await fetch(`/api/1.0/chat/unreadCounts?userId=${userId}`, {
            method: 'GET',
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error('Failed to fetch unread message counts');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching unread message counts:', error);
        return {};
    }
}

export async function markMessagesAsRead(chatUuid, userId) {
    if (!chatUuid || !userId) {
        console.error('Invalid chatUuid or userId provided to markMessagesAsRead');
        return;
    }

    try {
        await stompClient.send("/app/markAsRead", {}, JSON.stringify({
            chatUuid: chatUuid,
            userId: userId
        }));
    } catch (error) {
        console.error('Error marking messages as read:', error);
    }
}

export function updateUnreadMessageCount(unreadCount) {
    console.log("Updating unread message count:", unreadCount);
    const event = new CustomEvent('unreadCountUpdated', { detail: unreadCount });
    window.dispatchEvent(event);
}

export async function startChat(receiverId, senderId) {
    if (!receiverId || !senderId) {
        console.error('Invalid receiverId or senderId provided to startChat');
        return null;
    }

    try {
        const response = await fetch('/api/1.0/chat/channel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id_1: senderId, user_id_2: receiverId }),
            credentials: 'include'
        });
        const data = await response.json();
        if (response.ok && data.chat_uuid) {
            await getUnreadMessageCounts(senderId);
            return data.chat_uuid;
        } else {
            throw new Error('Failed to create chat channel: ' + data.message);
        }
    } catch (error) {
        console.error('Error starting chat:', error);
        throw error;
    }
}

export async function fetchLikedAndBookmarkedPosts(userId) {
    if (!userId) {
        console.error('Invalid userId provided to fetchLikedAndBookmarkedPosts');
        return { likedPosts: [], bookmarkedPosts: [] };
    }

    try {
        const [likedPostsResponse, bookmarkedPostsResponse] = await Promise.all([
            fetch('/api/1.0/post/likes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
                credentials: 'include',
            }),
            fetch('/api/1.0/post/bookmarks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
                credentials: 'include',
            }),
        ]);

        const likedPosts = await likedPostsResponse.json();
        const bookmarkedPosts = await bookmarkedPostsResponse.json();

        return { likedPosts, bookmarkedPosts };
    } catch (error) {
        console.error('Error fetching liked or bookmarked posts:', error);
        return { likedPosts: [], bookmarkedPosts: [] };
    }
}

export async function handleLike(postId, userId) {
    if (!postId || !userId) {
        console.error('Invalid postId or userId provided to handleLike');
        return;
    }

    const likeButton = document.getElementById(`like-btn-${postId}`);
    if (!likeButton) {
        console.error(`Like button not found for post ${postId}`);
        return;
    }

    const likeCount = likeButton.querySelector(`#like-count-${postId}`);
    const heartIcon = likeButton.querySelector('i');
    const isCurrentlyLiked = likeButton.classList.contains('liked');

    try {
        likeButton.classList.toggle('liked');
        heartIcon.classList.toggle('fa-solid');
        heartIcon.classList.toggle('fa-regular');
        likeCount.textContent = isCurrentlyLiked ?
            parseInt(likeCount.textContent) - 1 :
            parseInt(likeCount.textContent) + 1;

        const response = await fetch('/api/1.0/post/like', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId, userId }),
            credentials: 'include'
        });

        const result = await response.json();

        if (result.likeCount !== undefined) {
            likeCount.textContent = result.likeCount;
        }

        if (stompClient && stompClient.connected) {
            stompClient.send('/app/post/like', {}, JSON.stringify({
                type: isCurrentlyLiked ? 'UNLIKE_POST' : 'LIKE_POST',
                content: {
                    postId: postId,
                    likeCount: result.likeCount,
                    userId: userId
                }
            }));
        } else {
            console.warn('WebSocket not connected. Unable to send real-time update.');
        }
    } catch (error) {
        console.error('Error liking post:', error);
        // Revert the UI changes if the operation failed
        likeButton.classList.toggle('liked');
        heartIcon.classList.toggle('fa-solid');
        heartIcon.classList.toggle('fa-regular');
        likeCount.textContent = isCurrentlyLiked ?
            parseInt(likeCount.textContent) + 1 :
            parseInt(likeCount.textContent) - 1;
        alert('操作失敗，請稍後再試。');
    }
}

export async function handleBookmark(postId, userId) {
    if (!postId || !userId) {
        console.error('Invalid postId or userId provided to handleBookmark');
        return;
    }

    const bookmarkButton = document.getElementById(`bookmark-btn-${postId}`);
    if (!bookmarkButton) {
        console.error(`Bookmark button not found for post ${postId}`);
        return;
    }

    const bookmarkIcon = bookmarkButton.querySelector('i');

    try {
        bookmarkButton.classList.toggle('bookmarked');
        bookmarkIcon.classList.toggle('fa-solid');
        bookmarkIcon.classList.toggle('fa-regular');

        const response = await fetch('/api/1.0/post/bookMark', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId, userId }),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Bookmark operation failed');
        }
    } catch (error) {
        console.error('Error bookmarking post:', error);
        // Revert the UI changes if the operation failed
        bookmarkButton.classList.toggle('bookmarked');
        bookmarkIcon.classList.toggle('fa-solid');
        bookmarkIcon.classList.toggle('fa-regular');
        alert('收藏操作失敗，請稍後再試。');
    }
}
export async function handleComment(postId, userId) {
    if (!postId || !userId) {
        console.error('Invalid postId or userId provided to handleComment');
        return;
    }

    const commentInput = document.getElementById(`comment-input-${postId}`);
    if (!commentInput) {
        console.error(`Comment input not found for post ${postId}`);
        return;
    }

    const commentContent = commentInput.value.trim();
    if (!commentContent) {
        alert('請輸入評論');
        return;
    }

    try {
        const response = await fetch('/api/1.0/post/comment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                post_id: postId,
                user_id: userId,
                content: commentContent
            }),
            credentials: 'include'
        });

        if (response.ok) {
            commentInput.value = '';
            commentInput.focus();
            // 不在這裡更新 UI，等待 WebSocket 事件
        } else {
            const errorData = await response.json();
            console.error('Error commenting on post:', errorData.content || 'Unknown error');
            alert(`發表評論失敗: ${errorData.content || '請稍後再試。'}`);
        }
    } catch (error) {
        console.error('Error commenting:', error);
        alert('發表評論失敗，請稍後再試。');
    }
}
export async function createCommentElement(commentData, currentUserId) {
    if (!commentData || !currentUserId) {
        console.error("Invalid input: commentData or currentUserId is missing");
        return null;
    }

    const commentElement = document.createElement('div');
    commentElement.classList.add('comment');
    commentElement.setAttribute('data-comment-id', String(commentData.id));


    // 使用佔位符
    let avatarUrl = 'https://maxchauo-stylish-bucket.s3.ap-northeast-1.amazonaws.com/0_OtvYrwTXmO0Atzj5.webp';
    let username = 'Loading...';

    const createdAt = formatTimeAgo(commentData.createdAt);

    commentElement.innerHTML = `
    <div class="comment-container">
        <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(username)}" class="comment-avatar">
        <div class="comment-content">
            <div class="comment-header">
                <span class="comment-username">${escapeHtml(username)}</span>
                <span class="comment-time">${escapeHtml(createdAt)}</span>
            </div>
            <p class="comment-text">${escapeHtml(commentData.content)}</p>
        </div>
        ${String(commentData.user_id) === String(currentUserId) ?
        `<button class="delete-comment-btn">
            <span class="material-icons-outlined">remove_circle_outline</span>
        </button>` : ''}
    </div>
    `;

    // 異步加載用戶詳情
    fetchUserDetails(commentData.user_id).then(userDetails => {
        const avatarImg = commentElement.querySelector('.comment-avatar');
        const usernameSpan = commentElement.querySelector('.comment-username');

        if (userDetails) {
            avatarImg.src = userDetails.avatarUrl || avatarUrl;
            usernameSpan.textContent = userDetails.username || 'Unknown User';
        }
    }).catch(error => {
        console.error("Error fetching user details:", error);
    });

    if (String(currentUserId) === String(commentData.user_id)) {
        const deleteButton = commentElement.querySelector('.delete-comment-btn');
        if (deleteButton) {
            deleteButton.addEventListener('click', () => {
                handleDeleteComment(commentData.id, currentUserId, commentData.post_id);
            });
        }
    }

    return commentElement;
}

export async function displayPost(post, userId, postsList, likedPosts, bookmarkedPosts, isNewPost = false, stompClient) {
    if (!post || !userId || !postsList) {
        console.error('Invalid input provided to displayPost');
        return;
    }

    const postId = post.postId || post.id;

    const postDiv = document.createElement('div');
    postDiv.classList.add('post');
    postDiv.id = `post-${postId}`;

    try {
        const authorDetails = await fetchUserDetails(post.userId);
        const postCreatedAt = formatTimeAgo(post.createdAt);

        let postContent = `
          <div class="post-header" style="display: flex; align-items: center;">
            <div class="post-avatar-container" style="display: flex; align-items: center;">
                <img src="${escapeHtml(authorDetails?.avatarUrl || 'https://maxchauo-stylish-bucket.s3.ap-northeast-1.amazonaws.com/0_OtvYrwTXmO0Atzj5.webp')}" alt="User Avatar" class="post-avatar" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                <strong class="post-author" style="margin-left: 10px;">${escapeHtml(authorDetails?.username || 'Unknown User')}</strong>
            </div>
            <div class="post-info" style="margin-left: 20px;">
                <div class="post-type">${escapeHtml(post.type)}</div>
                <span class="post-time">${escapeHtml(postCreatedAt)}</span>
                <div class="post-actual-time">${escapeHtml(post.time || '')}</div>
            </div>
        </div>
        <p><span class="label-tag">地點</span> ${escapeHtml(post.location)}</p>
    `;

        if (post.type === '找學生') {
            postContent += `
        <p><span class="label-tag">擅長技能</span> ${escapeHtml(post.skillOffered)}</p>
        <p><span class="label-tag">薪資</span> ${escapeHtml(post.salary)}</p>
        `;
        } else if (post.type === '找老師') {
            postContent += `
        <p><span class="label-tag">想學技能</span> ${escapeHtml(post.skillWanted)}</p>
        <p><span class="label-tag">薪資</span> ${escapeHtml(post.salary)}</p>
        `;
        } else if (post.type === '交換技能') {
            postContent += `
        <p><span class="label-tag">擅長技能</span> ${escapeHtml(post.skillOffered)}</p>
        <p><span class="label-tag">想學技能</span> ${escapeHtml(post.skillWanted)}</p>
        `;
        } else if (post.type === '讀書會') {
            postContent += `
        <p><span class="label-tag">讀書會目的</span> ${escapeHtml(post.bookClubPurpose || post.skillOffered)}</p>
        `;
        }

        postContent += `
    <p><span class="label-tag">內容/進行方式</span> ${escapeHtml(post.content)}</p>
    `;

        if (post.tag && post.tag.length > 0) {
            const tags = post.tag.map(tag => `<button class="tag-btn label-tag tags" > # ${escapeHtml(tag)}</button>`).join(' ');
            postContent += `<p>${tags}</p>`;
        }

        postContent += `
       <div class="action-buttons" style="margin-bottom: 16px;">
            <button class="action-btn like-btn" id="like-btn-${postId}" data-liked="${likedPosts.includes(postId)}">
                <i class="fa-${likedPosts.includes(postId) ? 'solid' : 'regular'} fa-heart"></i> 
                <span id="like-count-${postId}">${post.likeCount || 0}</span>
            </button>
            <button class="action-btn bookmark-btn ${bookmarkedPosts.includes(postId) ? 'bookmarked' : ''}" id="bookmark-btn-${postId}">
                <i class="fa-${bookmarkedPosts.includes(postId) ? 'solid' : 'regular'} fa-bookmark"></i>
            </button>
            <button class="action-btn comment-toggle-btn" id="comment-toggle-btn-${postId}">
                <i class="fa-regular fa-comment-dots"></i>
                <span id="comment-count-${postId}">${post.commentCount || 0}</span>
            </button>
            ${String(post.userId).trim() !== String(userId).trim() ?
            `<button class="action-btn chat-btn" id="chat-btn-${postId}">
                <span class="chat-icon"><i class="fa-regular fa-comments"></i></span>
            </button>`
            : ''}
            ${String(post.userId).trim() === String(userId).trim() ?
            `<button class="action-btn delete-btn" id="delete-btn-${postId}">
                    <i class="fa-regular fa-trash-can"></i>
                </button>`
            : ''}
        </div>
        `;

        postContent += `
        <div class="comment-section" id="comment-section-${postId}" style="display: none;"> 
            <div class="comments-container"></div>
            <div class="comment-box">
                <div class="textarea-container">
                    <textarea id="comment-input-${postId}" placeholder="輸入評論..."></textarea>
                    <button class="comment-btn" id="comment-btn-${postId}">
                        <i class="fa-regular fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        </div>
        `;

        postDiv.innerHTML = postContent;

        let commentsLoaded = false;
        postDiv.querySelector(`#like-btn-${postId}`).addEventListener('click', () => handleLike(postId, userId));
        postDiv.querySelector(`#bookmark-btn-${postId}`).addEventListener('click', () => handleBookmark(postId, userId));
        postDiv.querySelector(`#comment-toggle-btn-${postId}`).addEventListener('click', async () => {
            const commentSection = postDiv.querySelector(`#comment-section-${postId}`);
            commentSection.style.display = commentSection.style.display === 'none' ? 'block' : 'none';

            const commentsContainer = postDiv.querySelector('.comments-container');

            if (commentSection.style.display === 'block' && !commentsLoaded) {
                try {
                    const comments = await fetchPostComments(postId);

                    if (comments.length > 0) {
                        for (const comment of comments) {
                            addCommentToDOM(comment, userId, commentsContainer);
                        }
                    } else {
                        commentsContainer.innerHTML = '<p></p>';
                    }
                    commentsLoaded = true;

                    // 展開後清除暫存的評論
                    if (commentCache[postId]) {
                        delete commentCache[postId];
                    }
                } catch (error) {
                    console.error(`Failed to load comments for post ${postId}:`, error);
                    commentsContainer.innerHTML = '<p>Error loading comments.</p>';
                }
            }
        });


        postDiv.querySelector(`#comment-btn-${postId}`).addEventListener('click', () => handleComment(postId, userId));

        if (String(post.userId).trim() !== String(userId).trim()) {
            const chatButton = postDiv.querySelector(`#chat-btn-${postId}`);
            if (chatButton) {
                chatButton.addEventListener('click', (event) => {
                    event.preventDefault();
                    startChat(post.userId, userId);
                });
            }
        }
        if (String(post.userId).trim() === String(userId).trim()) {
            const deleteButton = postDiv.querySelector(`#delete-btn-${postId}`);
            if (deleteButton) {
                deleteButton.addEventListener('click', () => handleDelete(postId, userId));
            }
        }

        postDiv.querySelectorAll('.tag-btn').forEach(tagBtn => {
            tagBtn.addEventListener('click', (event) => {
                event.preventDefault();
                const tag = event.target.textContent.trim();
                handleTagClick(tag);
            });
        });

        const likeButton = postDiv.querySelector(`#like-btn-${postId}`);
        if (likedPosts.includes(postId)) {
            likeButton.classList.add('liked');
            likeButton.querySelector('i').classList.replace('fa-regular', 'fa-solid');
        }

        if (bookmarkedPosts.includes(postId)) {
            postDiv.querySelector(`#bookmark-btn-${postId}`).classList.add('bookmarked');
        }

        if (isNewPost) {
            postsList.insertBefore(postDiv, postsList.firstChild);
        } else {
            postsList.appendChild(postDiv);
        }
    } catch (error) {
        console.error('Error displaying post:', error);
    }
}

export async function fetchPostComments(postId) {
    if (!postId) {
        console.error('Invalid postId provided to fetchPostComments');
        return [];
    }

    try {
        const response = await fetch(`/api/1.0/post/${postId}/comments`, {
            method: 'GET',
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch comments for postId ${postId}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching comments for postId ${postId}:`, error);
        return [];
    }
}

export function handleTagClick(tag) {
    if (!tag) {
        console.error('Invalid tag provided to handleTagClick');
        return;
    }

    const cleanTag = tag.replace(/^#/, '').trim();
    const searchKeyword = encodeURIComponent(cleanTag);
    const newUrl = `/index.html?search=${searchKeyword}`;
    window.history.pushState({}, '', newUrl);
    const event = new CustomEvent('tagSearch', { detail: { keyword: cleanTag } });
    window.dispatchEvent(event);
}

export async function handleDelete(postId, userId) {
    if (isNaN(postId) || isNaN(userId)) {
        console.error('Invalid postId or userId');
        return;
    }
    if (!confirm('確定要刪除這篇貼文嗎？此操作不可逆。')) {
        return;
    }

    try {
        const response = await fetch(`/api/1.0/post/${postId}?userId=${userId}`, {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            credentials: 'include'
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || '刪除貼文失敗');
        }

        const postElement = document.getElementById(`post-${postId}`);
        if (postElement) {
            postElement.remove();
        }
        alert('貼文已成功刪除');
    } catch (error) {
        console.error('Error deleting post:', error);
        alert(`刪除貼文失敗: ${error.message}`);
    }
}

export async function fetchPostById(postId) {
    if (!postId) {
        console.error('Invalid postId provided to fetchPostById');
        return null;
    }

    try {
        const response = await fetch(`api/1.0/post/${postId}`, { credentials: 'include' });
        if (!response.ok) {
            throw new Error('Failed to fetch post');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching post by ID:', error);
        return null;
    }
}

export function updateCommentCount(postId, increment = true) {
    if (!postId) {
        console.error('Invalid postId provided to updateCommentCount');
        return;
    }

    const commentToggleBtn = document.getElementById(`comment-toggle-btn-${postId}`);
    if (commentToggleBtn) {
        const countSpan = commentToggleBtn.querySelector('span');
        if (countSpan) {
            let currentCount = parseInt(countSpan.textContent);
            currentCount = increment ? currentCount + 1 : Math.max(currentCount - 1, 0);
            countSpan.textContent = currentCount.toString();
        } else {
            console.warn(`Count span not found for postId: ${postId}`);
        }
    } else {
        console.warn(`Comment toggle button not found for postId: ${postId}`);
    }
}

export function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') {
        return '';
    }
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
const addedComments = new Set();

export function subscribeToPostEvents(stompClient, callback, currentUserId) {
    if (!stompClient || !callback || !currentUserId) {
        console.error('Invalid input provided to subscribeToPostEvents');
        return;
    }

    console.log("Subscribing to /topic/post with currentUserId:", currentUserId);
    stompClient.subscribe('/topic/post', function (message) {
        console.log("Subscription to /topic/post successful");
        const postEvent = JSON.parse(message.body);

        console.log("Received postEvent: ", postEvent);

        switch (postEvent.type) {
            case 'LIKE_POST':
            case 'UNLIKE_POST':
                handleLikePost(postEvent.content);
                break;

            case 'CREATE_COMMENT':
                console.log("Handling CREATE_COMMENT in subscribeToPostEvents", postEvent.content, "currentUserId:", currentUserId);
                handleCreateComment(postEvent.content, currentUserId);
                break;

            case 'DELETE_COMMENT':
                console.log("Handling DELETE_COMMENT in subscribeToPostEvents", postEvent.content, "currentUserId:", postEvent.content.userId);
                handleDeleteComment(postEvent.content.commentId, undefined, postEvent.content.postId);
                break;

            default:
                callback(postEvent);
                break;
        }
    });
}

async function handleLikePost(content) {
    const { postId, likeCount } = content;
    await updateLikeCount(postId, likeCount);
}

export function updateLikeCount(postId, count) {
    if (!postId) {
        console.error('Invalid postId provided to updateLikeCount');
        return;
    }

    const likeCountElement = document.querySelector(`#like-count-${postId}`);
    if (likeCountElement) {
        likeCountElement.textContent = count;
    } else {
        console.warn(`Like count element not found for postId: ${postId}`);
    }
}

function handleCreateComment(commentData, currentUserId) {
    console.log("handleCreateComment called with:", { commentData, currentUserId });

    if (!commentData || !currentUserId) {
        console.error("Invalid input: commentData or currentUserId is missing");
        return;
    }

    const commentSection = document.querySelector(`#comment-section-${commentData.post_id}`);
    if (!commentSection) {
        console.warn(`Comment section not found for postId: ${commentData.post_id}`);
        return;
    }

    const commentContainer = commentSection.querySelector('.comments-container');
    if (!commentContainer) {
        console.warn(`Comment container not found for postId: ${commentData.post_id}`);
        return;
    }

    // 使用 getComputedStyle 判斷留言區是否展開
    if (getComputedStyle(commentSection).display === 'none') {
        // 留言區未展開，暫存評論
        if (!commentCache[commentData.post_id]) {
            commentCache[commentData.post_id] = [];
        }
        commentCache[commentData.post_id].push(commentData);
        console.log(`Comment cached for postId ${commentData.post_id}`);
    } else {
        // 留言區已展開，直接添加評論到 DOM
        addCommentToDOM(commentData, currentUserId, commentContainer);
    }

    // 更新評論數量
    updateCommentCount(commentData.post_id, true);
}


function addCommentToDOM(commentData, currentUserId, commentContainer) {
    // 檢查評論是否已存在
    if (commentContainer.querySelector(`[data-comment-id="${String(commentData.id)}"]`)) {
        console.log("Comment already exists, skipping addition");
        return;
    }

    createCommentElement(commentData, currentUserId)
        .then(newComment => {
            if (!newComment) {
                throw new Error("Created comment element is null or undefined");
            }
            commentContainer.appendChild(newComment);
            console.log("Comment successfully added to the DOM");
        })
        .catch(error => {
            console.error('Error creating or inserting comment element:', error);
        });
}
export async function handleDeleteComment(commentId, userId, postId) {
    console.log("executing handleDeleteComment");

    if (!commentId) {
        console.error('Invalid commentId provided to handleDeleteComment');
        return;
    }

    // 移除 DOM 中的评论
    const commentElement = document.querySelector(`[data-comment-id='${commentId}']`);
    if (commentElement) {
        commentElement.remove();
        console.log(`Comment with ID ${commentId} removed from the DOM`);
    } else {
        console.warn(`Comment element not found for commentId: ${commentId}`);
    }

    // 从缓存中移除评论
    if (postId && commentCache[postId]) {
        commentCache[postId] = commentCache[postId].filter(comment => comment.id !== commentId);
    }

    // 只有当 userId 未定义（即通过 WebSocket 调用）时，才更新评论数量
    if (postId && userId === undefined) {
        updateCommentCount(postId, false);
    }

    if (userId !== undefined) {
        // 用户确认删除操作
        if (!confirm('確定要刪除這條評論嗎？此操作不可逆。')) {
            return;
        }

        try {
            const response = await fetch(`/api/1.0/post/comment/${commentId}?userId=${userId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || '刪除評論失敗');
            }

            alert('評論已成功刪除');
        } catch (error) {
            console.error('Error deleting comment:', error);
            alert(`刪除評論失敗: ${error.message || '請稍後再試。'}`);
        }
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

    // 如果時間差小於 60 秒，顯示「剛剛發佈」
    if (diffInSeconds < 60) {
        return '剛剛發佈';
    } else if (diffInSeconds < 3600) { // 小於 1 小時，顯示多少分鐘前
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} 分鐘前`;
    } else if (diffInSeconds < 86400) { // 小於 24 小時，顯示多少小時前
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} 小時前`;
    } else if (diffInSeconds < 2592000) { // 小於 30 天，顯示多少天前
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} 天前`;
    } else if (diffInSeconds < 31536000) { // 小於一年，顯示多少個月前
        const months = Math.floor(diffInSeconds / 2592000);
        return `${months} 個月前`;
    } else { // 超過一年，顯示多少年前
        const years = Math.floor(diffInSeconds / 31536000);
        return `${years} 年前`;
    }
}
