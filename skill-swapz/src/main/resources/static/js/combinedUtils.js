// combinedUtils.js
let stompClient = null;


export async function getUserId() {
    try {
        const response = await fetch('api/1.0/auth/me', {
            method: 'POST',
            credentials: 'include',
        });

        const data = await response.json();

        if (response.ok) {
            return data.user_id;
        } else {
            throw new Error(data.message || 'Failed to fetch user ID');
        }
    } catch (error) {
        console.error('Error fetching user ID:', error);
        window.location.href = "auth.html";
        return null;
    }
}

export async function fetchUserDetails(userId) {
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

export async function startChat(receiverId, senderId) {
    try {
        const response = await fetch('/api/1.0/chat/channel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id_1: senderId, user_id_2: receiverId }),
            credentials: 'include'
        });
        const data = await response.json();
        if (response.ok && data.chat_uuid) {
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
    const likeButton = document.getElementById(`like-btn-${postId}`);
    if (!likeButton) {
        console.error(`Like button not found for post ${postId}`);
        return;
    }

    const likeCount = likeButton.querySelector(`#like-count-${postId}`);
    const heartIcon = likeButton.querySelector('i');
    const isCurrentlyLiked = likeButton.classList.contains('liked');

    try {
        if (isCurrentlyLiked) {
            likeButton.classList.remove('liked');
            heartIcon.classList.replace('fa-solid', 'fa-regular');
            likeCount.textContent = parseInt(likeCount.textContent) - 1;
        } else {
            likeButton.classList.add('liked');
            heartIcon.classList.replace('fa-regular', 'fa-solid');
            likeCount.textContent = parseInt(likeCount.textContent) + 1;
        }

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
        alert('操作失敗，請稍後再試。');
    }
}

export async function handleBookmark(postId, userId) {
    try {
        const response = await fetch('/api/1.0/post/bookMark', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId, userId }),
            credentials: 'include'
        });

        const bookmarkButton = document.getElementById(`bookmark-btn-${postId}`);
        bookmarkButton.classList.toggle('bookmarked');
    } catch (error) {
        console.error('Error bookmarking post:', error);
    }
}

export async function handleComment(postId, userId) {
    const commentInput = document.getElementById(`comment-input-${postId}`);
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
            const result = await response.json();
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
    try {
        console.log("createCommentElement being executing");

        if (!commentData || !currentUserId) {
            throw new Error("Invalid input: commentData or currentUserId is missing");
        }

        const commentElement = document.createElement('div');
        commentElement.classList.add('comment');
        commentElement.setAttribute('data-comment-id', commentData.id);

        let userDetails, avatarUrl, username;
        try {
            userDetails = await fetchUserDetails(commentData.user_id);
            avatarUrl = userDetails?.avatarUrl || 'default_avatar_url';
            username = userDetails?.username || 'Unknown User';
        } catch (error) {
            console.error("Error fetching user details:", error);
            avatarUrl = 'default_avatar_url';
            username = 'Unknown User';
        }

        const createdAt = new Date(commentData.createdAt).toLocaleString();

        commentElement.innerHTML = `
            <div class="comment-container">
                <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(username)}" class="comment-avatar">
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-username">${escapeHtml(username)}</span>
                        <span class="comment-time">${escapeHtml(createdAt)}</span>
                    </div>
                    <p class="comment-text">${escapeHtml(commentData.content)}</p>
                    ${String(commentData.user_id) === String(currentUserId) ? '<button class="delete-comment-btn">刪除</button>' : ''}
                </div>
            </div>
        `;

        // 添加样式
        const avatarImg = commentElement.querySelector('.comment-avatar');
        if (avatarImg) {
            avatarImg.style.width = '30px';
            avatarImg.style.height = '30px';
            avatarImg.style.borderRadius = '50%';
            avatarImg.style.objectFit = 'cover';
        } else {
            console.warn("Avatar image element not found");
        }

        // 绑定删除按钮的事件
        if (String(currentUserId) === String(commentData.user_id)) {
            const deleteButton = commentElement.querySelector('.delete-comment-btn');
            if (deleteButton) {
                // 傳遞commentId 和 currentUserId
                deleteButton.addEventListener('click', () => {
                    console.log(commentData.id)
                    console.log(currentUserId)
                    handleDeleteComment(commentData.id, currentUserId);
                });
            } else {
                console.warn("Delete button not found for user's own comment");
            }
        }

        return commentElement;
    } catch (error) {
        console.error("Error in createCommentElement:", error);
        throw error;
    }
}



export async function displayPost(post, userId, postsList, likedPosts, bookmarkedPosts, isNewPost = false, stompClient) {
    const postId = post.postId || post.id;

    const postDiv = document.createElement('div');
    postDiv.classList.add('post');
    postDiv.id = `post-${postId}`;

    const authorDetails = await fetchUserDetails(post.userId);

    let postContent = `
    <div class="post-header">
        <img src="${escapeHtml(authorDetails?.avatarUrl || 'https://maxchauo-stylish-bucket.s3.ap-northeast-1.amazonaws.com/0_OtvYrwTXmO0Atzj5.webp')}" alt="User Avatar" class="post-avatar">
        <strong class="post-author">${escapeHtml(authorDetails?.username || 'Unknown User')}</strong>
        <div class="post-type">${escapeHtml(post.type)}</div>
    </div>
    <p><strong>地點：</strong> ${escapeHtml(post.location)}</p>
    `;

    if (post.type === '找學生') {
        postContent += `
        <p><strong>技能提供：</strong> ${escapeHtml(post.skillOffered)}</p>
        <p><strong>薪資：</strong> ${escapeHtml(post.salary)}</p>
        `;
    } else if (post.type === '找老師') {
        postContent += `
        <p><strong>需要的技能：</strong> ${escapeHtml(post.skillWanted)}</p>
        <p><strong>薪資：</strong> ${escapeHtml(post.salary)}</p>
        `;
    } else if (post.type === '交換技能') {
        postContent += `
        <p><strong>提供的技能：</strong> ${escapeHtml(post.skillOffered)}</p>
        <p><strong>想要的技能：</strong> ${escapeHtml(post.skillWanted)}</p>
        `;
    } else if (post.type === '讀書會') {
        postContent += `
        <p><strong>讀書會目的：</strong> ${escapeHtml(post.bookClubPurpose || post.skillOffered)}</p>
        `;
    }

    postContent += `
    <p><strong>內容：</strong> ${escapeHtml(post.content)}</p>
    `;

    if (post.tag && post.tag.length > 0) {
        const tags = post.tag.map(tag => `<button class="tag-btn"># ${escapeHtml(tag)}</button>`).join(' ');
        postContent += `<p><strong>標籤：</strong> ${tags}</p>`;
    }

    // 插入新的 action buttons HTML
    postContent += `
    <div class="action-buttons">
        <button class="action-btn like-btn" id="like-btn-${postId}" data-liked="${likedPosts.includes(postId)}">
            <i class="fa-${likedPosts.includes(postId) ? 'solid' : 'regular'} fa-heart"></i> 
            <span id="like-count-${postId}">${post.likeCount || 0}</span>
        </button>
        <button class="action-btn bookmark-btn" id="bookmark-btn-${postId}">
            <i class="fa-regular fa-bookmark"></i>
        </button>
        <button class="action-btn comment-toggle-btn" id="comment-toggle-btn-${postId}">
            <i class="fa-regular fa-comment"></i> 
            <span>${post.comments ? post.comments.length : 0}</span>
        </button>
        <button class="action-btn chat-btn" id="chat-btn-${postId}">
            <i class="fa-regular fa-envelope"></i>
        </button>
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
            <textarea id="comment-input-${postId}" placeholder="輸入評論..."></textarea>
            <button class="comment-btn" id="comment-btn-${postId}">
                <i class="fa-regular fa-paper-plane"></i>
            </button>
        </div>
    </div>
    `;

    postDiv.innerHTML = postContent;

    // 設置事件監聽器
    postDiv.querySelector(`#like-btn-${postId}`).addEventListener('click', () => handleLike(postId, userId, stompClient));
    postDiv.querySelector(`#bookmark-btn-${postId}`).addEventListener('click', () => handleBookmark(postId, userId));
    postDiv.querySelector(`#comment-toggle-btn-${postId}`).addEventListener('click', () => {
        const commentSection = postDiv.querySelector(`#comment-section-${postId}`);
        commentSection.style.display = commentSection.style.display === 'none' ? 'block' : 'none';
    });
    postDiv.querySelector(`#comment-btn-${postId}`).addEventListener('click', () => handleComment(postId, userId));
    postDiv.querySelector(`#chat-btn-${postId}`).addEventListener('click', (event) => {
        event.preventDefault();
        startChat(post.userId, userId);
    });
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

    // 設置初始狀態
    const likeButton = postDiv.querySelector(`#like-btn-${postId}`);
    if (likedPosts.includes(postId)) {
        likeButton.classList.add('liked');
        likeButton.querySelector('i').classList.replace('fa-regular', 'fa-solid');
    }

    if (bookmarkedPosts.includes(postId)) {
        postDiv.querySelector(`#bookmark-btn-${postId}`).classList.add('bookmarked');
    }

    // 添加評論
    const commentsContainer = postDiv.querySelector('.comments-container');
    if (post.comments && post.comments.length > 0) {
        for (const comment of post.comments) {
            const commentElement = await createCommentElement(comment, userId);
            commentsContainer.appendChild(commentElement);
        }
    }

    if (isNewPost) {
        postsList.insertBefore(postDiv, postsList.firstChild);
    } else {
        postsList.appendChild(postDiv);
    }
}

export function handleTagClick(tag) {
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
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function subscribeToPostEvents(stompClient, callback, currentUserId) {
    console.log("Subscribing to /topic/post with currentUserId:", currentUserId);
    stompClient.subscribe('/topic/post', function (message) {
        console.log("Subscription to /topic/post successful");
        const postEvent = JSON.parse(message.body);
        const { commentId, userId } = postEvent.content;

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
                console.log("Handling DELETE_COMMENT in subscribeToPostEvents", postEvent.content, "currentUserId:", userId);
                const { commentId, postId } = postEvent.content;
                handleDeleteComment(commentId, undefined, postId);
                break;

            default:
                callback(postEvent);
                break;
        }
    });
}



//like related
async function handleLikePost(content) {
    const { postId, likeCount } = content;
    await updateLikeCount(postId, likeCount);
}

export function updateLikeCount(postId, count) {
    const likeCountElement = document.querySelector(`#like-count-${postId}`);
    if (likeCountElement) {
        likeCountElement.textContent = count;
    } else {
        console.warn(`Like count element not found for postId: ${postId}`);
    }
}


//comment related
function handleCreateComment(commentData, currentUserId) {
    console.log("handleCreateComment called with:", { commentData, currentUserId });

    if (!commentData || !currentUserId) {
        console.error("Invalid input: commentData or currentUserId is missing");
        return;
    }

    const commentSection = document.getElementById(`comment-section-${commentData.post_id}`);
    if (!commentSection) {
        console.warn(`Comment section not found for postId: ${commentData.post_id}`);
        return;
    }

    console.log("開始處理評論: ", commentData);
    createCommentElement(commentData, currentUserId)
        .then(newComment => {
            if (!newComment) {
                throw new Error("Created comment element is null or undefined");
            }
            commentSection.insertBefore(newComment, commentSection.firstChild);
            updateCommentCount(commentData.post_id, true);
            console.log("Comment successfully added to the DOM");
        })
        .catch(error => {
            console.error('Error creating or inserting comment element:', error);
        });
}



export async function handleDeleteComment(commentId, userId, postId) {
    console.log("executing handleDeleteComment");

    // 移除留言元素
    const commentElement = document.querySelector(`[data-comment-id='${commentId}']`);
    if (commentElement) {
        commentElement.remove();
        console.log(`Comment with ID ${commentId} removed from the DOM`);
    } else {
        console.warn(`Comment element not found for commentId: ${commentId}`);
    }

    // 更新留言計數器
    if (postId) {
        updateCommentCount(postId, false); // 確保這裡正確減少留言數
    } else {
        console.warn('Post ID is not provided, cannot update comment count');
    }

    // 如果有 userId，表示是使用者主動刪除，需要發送請求到後端
    if (typeof userId !== 'undefined') {
        // 確認刪除操作
        if (!confirm('確定要刪除這條評論嗎？此操作不可逆。')) {
            return;
        }

        try {
            // 發送刪除請求到後端
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
            alert(`刪除評論失敗: ${error.message}`);
            return;
        }
    }
}
