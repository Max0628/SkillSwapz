// combinedUtils.js

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
            console.error('Error fetching user ID:', data.message);
            return null;
        }
    } catch (error) {
        console.error('Error fetching user ID:', error);
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
            throw new Error('Failed to fetch user details');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching user details:', error);
        return null;
    }
}

export function connectWebSocket(userId) {
    console.log('WebSocket connected. Client timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
    const socket = new SockJS(`/ws?user_id=${encodeURIComponent(userId)}`);
    const stompClient = Stomp.over(socket);

    return new Promise((resolve, reject) => {
        stompClient.connect({}, () => {
            console.log(`Connected to WebSocket for user: ${userId}`);
            resolve(stompClient);
        }, (error) => {
            console.error('WebSocket connection error:', error);
            reject(error);
        });
    });
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
    try {
        const response = await fetch('/api/1.0/post/like', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId, userId }),
            credentials: 'include'
        });

        const result = await response.json();
        const likeButton = document.getElementById(`like-btn-${postId}`);
        const likeCount = likeButton.querySelector(`#like-count-${postId}`);
        let currentCount = parseInt(likeCount.textContent);

        if (result.message === "Like added successfully.") {
            likeButton.classList.add('liked');
            likeCount.textContent = currentCount + 1;
        } else if (result.message === "Like removed successfully.") {
            likeButton.classList.remove('liked');
            likeCount.textContent = currentCount - 1;
        }
    } catch (error) {
        console.error('Error liking post:', error);
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
            body: JSON.stringify({ post_id: postId, user_id: userId, content: commentContent }),
            credentials: 'include'
        });

        if (response.ok) {
            const commentData = await response.json();
            const commentSection = document.getElementById(`comment-section-${postId}`);
            const newComment = await createCommentElement(commentData, userId);
            commentSection.insertBefore(newComment, commentSection.firstChild);
            commentInput.value = '';
        } else {
            console.error('Error commenting on post');
        }
    } catch (error) {
        console.error('Error commenting:', error);
    }
}

async function createCommentElement(comment, currentUserId) {
    const commentElement = document.createElement('div');
    commentElement.classList.add('comment');

    const userDetails = await fetchUserDetails(comment.user_id);
    const avatarUrl = userDetails?.avatarUrl || 'https://maxchauo-stylish-bucket.s3.ap-northeast-1.amazonaws.com/0_OtvYrwTXmO0Atzj5.webp';
    const username = userDetails?.username || 'Unknown User';

    commentElement.innerHTML = `
        <div class="comment-container">
            <img src="${avatarUrl}" alt="${username}" class="comment-avatar">
            <div class="comment-content">
                <div class="comment-header">
                    <span class="comment-username">${username}</span>
                </div>
                <p class="comment-text">${comment.content}</p>
            </div>
        </div>
    `;

    // 獲取剛剛插入的 img 元素，然後動態設置樣式
    const avatarImg = commentElement.querySelector('.comment-avatar');
    avatarImg.style.width = '30px';  // 設置寬度
    avatarImg.style.height = '30px'; // 設置高度
    avatarImg.style.borderRadius = '50%'; // 確保圖片為圓形
    avatarImg.style.objectFit = 'cover';  // 確保圖片不變形

    return commentElement;
}

export async function displayPost(post, userId, postsList, likedPosts, bookmarkedPosts) {
    const postDiv = document.createElement('div');
    postDiv.classList.add('post');
    postDiv.id = `post-${post.id}`;

    const authorDetails = await fetchUserDetails(post.userId);

    let postContent = `
   <div class="post-header">
        <img src="${authorDetails?.avatarUrl || 'https://maxchauo-stylish-bucket.s3.ap-northeast-1.amazonaws.com/0_OtvYrwTXmO0Atzj5.webp'}" alt="User Avatar" class="post-avatar">
        <strong class="post-author">${authorDetails?.username || 'Unknown User'}</strong>
        <div class="post-type">${post.type}</div>
    </div>
    <p><strong>地點：</strong> ${post.location}</p>
    `;

    if (post.type === '找學生') {
        postContent += `
        <p><strong>技能提供：</strong> ${post.skillOffered}</p>
        <p><strong>薪資：</strong> ${post.salary}</p>
        `;
    } else if (post.type === '找老師') {
        postContent += `
        <p><strong>需要的技能：</strong> ${post.skillWanted}</p>
        <p><strong>薪資：</strong> ${post.salary}</p>
        `;
    } else if (post.type === '交換技能') {
        postContent += `
        <p><strong>提供的技能：</strong> ${post.skillOffered}</p>
        <p><strong>想要的技能：</strong> ${post.skillWanted}</p>
        `;
    } else if (post.type === '讀書會') {
        postContent += `
        <p><strong>讀書會目的：</strong> ${post.bookClubPurpose || post.skillOffered}</p>
        `;
    }

    postContent += `
    <p><strong>內容：</strong> ${post.content}</p>
    `;

    if (post.tag && post.tag.length > 0) {
        const tags = post.tag.map(tag => `<button class="tag-btn"># ${tag}</button>`).join(' ');
        postContent += `<p><strong>標籤：</strong> ${tags}</p>`;
    }

    postContent += `
    <div class="action-buttons">
        <button class="action-btn like-btn" id="like-btn-${post.id}">
            <i class="fa-regular fa-heart"></i> 
            <span id="like-count-${post.id}">${post.likeCount}</span>
        </button>
        <button class="action-btn bookmark-btn" id="bookmark-btn-${post.id}">
            <i class="fa-regular fa-bookmark"></i>
        </button>
        <button class="action-btn comment-toggle-btn" id="comment-toggle-btn-${post.id}">
            <i class="fa-regular fa-comment"></i> 
            <span>${post.comments ? post.comments.length : 0}</span>
        </button>
        <button class="action-btn chat-btn" id="chat-btn-${post.id}">
            <i class="fa-regular fa-envelope"></i>
        </button>
        ${String(post.userId).trim() === String(userId).trim() ?
        `<button class="action-btn delete-btn" id="delete-btn-${post.id}">
                <i class="fa-regular fa-trash-can"></i>
            </button>`
        : ''}
    </div>
    `;

    postContent += `
    <div class="comment-section" id="comment-section-${post.id}" style="display: none;"> 
        <div class="comments-container"></div>
        <div class="comment-box">
            <textarea id="comment-input-${post.id}" placeholder="輸入評論..."></textarea>
            <button class="comment-btn" id="comment-btn-${post.id}">
                <i class="fa-regular fa-paper-plane"></i>
            </button>
        </div>
    </div>
`;


    postDiv.innerHTML = postContent;
    postsList.appendChild(postDiv);

    if (likedPosts.includes(post.id)) {
        document.getElementById(`like-btn-${post.id}`).classList.add('liked');
    }

    if (bookmarkedPosts.includes(post.id)) {
        document.getElementById(`bookmark-btn-${post.id}`).classList.add('bookmarked');
    }

    // 加載評論
    const commentsContainer = postDiv.querySelector('.comments-container');
    if (post.comments && post.comments.length > 0) {
        for (const comment of post.comments) {
            const commentElement = await createCommentElement(comment, userId);
            commentsContainer.appendChild(commentElement);
        }
    }

    // 事件監聽器
    document.getElementById(`like-btn-${post.id}`).addEventListener('click', () => handleLike(post.id, userId));
    document.getElementById(`bookmark-btn-${post.id}`).addEventListener('click', () => handleBookmark(post.id, userId));
    document.getElementById(`comment-toggle-btn-${post.id}`).addEventListener('click', () => {
        const commentSection = document.getElementById(`comment-section-${post.id}`);
        commentSection.style.display = commentSection.style.display === 'none' ? 'block' : 'none';
    });
    document.getElementById(`comment-btn-${post.id}`).addEventListener('click', () => handleComment(post.id, userId));
    document.getElementById(`chat-btn-${post.id}`).addEventListener('click', (event) => {
        event.preventDefault();
        startChat(post.userId, userId);
    });
    if (String(post.userId).trim() === String(userId).trim()) {
        const deleteButton = document.getElementById(`delete-btn-${post.id}`);
        if (deleteButton) {
            deleteButton.addEventListener('click', () => handleDelete(post.id, userId));
        }
    }

    postDiv.querySelectorAll('.tag-btn').forEach(tagBtn => {
        tagBtn.addEventListener('click', (event) => {
            event.preventDefault();
            const tag = event.target.textContent;
            handleTagClick(tag);
        });
    });
}

export function handleTagClick(tag) {
    // 移除 tag 前的 # 符號並去掉前後的空格
    const cleanTag = tag.replace(/^#/, '').trim();

    // 將不含 # 和多餘空格的標籤傳遞給搜尋
    const searchKeyword = encodeURIComponent(cleanTag);
    const newUrl = `/index.html?search=${searchKeyword}`;
    window.history.pushState({}, '', newUrl);

    const event = new CustomEvent('tagSearch', { detail: { keyword: cleanTag } });
    window.dispatchEvent(event);
}

export async function handleDelete(postId, userId) {
    console.log('Delete function called for post:', postId, 'by user:', userId);
    if (!confirm('確定要刪除這篇貼文嗎？此操作不可逆。')) {
        return;
    }

    try {
        const response = await fetch(`/api/1.0/post/${postId}?userId=${userId}`, {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok) {
            const postElement = document.getElementById(`post-${postId}`);
            postElement.remove();
            alert(data.message || '貼文已成功刪除');
        } else {
            throw new Error(data.message || '刪除貼文失敗');
        }
    } catch (error) {
        console.error('Error deleting post:', error);
        alert(`刪除貼文失敗: ${error.message}`);
    }
}

// 新增的函數，用於獲取單個帖子信息
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

// 新增的函數，用於更新評論計數
export function updateCommentCount(postId, increment = true) {
    const commentToggleBtn = document.getElementById(`comment-toggle-btn-${postId}`);
    const countSpan = commentToggleBtn.querySelector('span');
    let currentCount = parseInt(countSpan.textContent);
    currentCount = increment ? currentCount + 1 : currentCount - 1;
    countSpan.textContent = currentCount.toString();
}

// 可能需要的輔助函數，用於轉義HTML字符
export function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}