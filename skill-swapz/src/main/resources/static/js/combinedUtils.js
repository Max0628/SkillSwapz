// combinedUtils.js
//取得當前登入使用者的id
export async function getUserId() {
    try {
        const response = await fetch('api/1.0/auth/me', {
            method: 'POST',
            credentials: 'include',
        });

        const data = await response.json();

        if (response.ok) {
            return data.user_id; //回傳當前登入的使用者id
        } else {
            console.error('Error fetching user ID:', data.message);
            return null;
        }
    } catch (error) {
        console.error('Error fetching user ID:', error);
        return null;
    }
}

//連接到websocket
export function connectWebSocket(userId) {
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

//開始聊天按鈕
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


//獲取目前按讚與收藏狀態
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

//處理按讚
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
            likeCount.textContent = currentCount + 1;  // 增加讚數
        } else if (result.message === "Like removed successfully.") {
            likeButton.classList.remove('liked');
            likeCount.textContent = currentCount - 1;  // 減少讚數
        }
    } catch (error) {
        console.error('Error liking post:', error);
    }
}


//處理收藏
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
            alert('評論已送出！');
            commentInput.value = '';
        } else {
            console.error('Error commenting on post');
        }
    } catch (error) {
        console.error('Error commenting:', error);
    }
}
export function displayPost(post, userId, postsList, likedPosts, bookmarkedPosts) {
    const postDiv = document.createElement('div');
    postDiv.classList.add('post');

    // 發文者 ID 和文章類型
    let postContent = `
    <div class="post-header">
        <strong class="post-author">發文者 ID：${post.userId}</strong> <!-- 左上角的發文者ID -->
        <div class="post-type">${post.type}</div> <!-- 右上角的文章類型 -->
    </div>
    `;

    // 顯示地點等其他資訊
    postContent += `
    <p><strong>地點：</strong> ${post.location}</p>
    `;

    // 根據文章類型顯示不同的欄位
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

    // 文章內容欄位，現在顯示在標籤的上方
    postContent += `
    <p><strong>內容：</strong> ${post.content}</p>
    `;

    // 標籤欄位，顯示在文章內容的下方
    if (post.tag && post.tag.length > 0) {
        const tags = post.tag.map(tag => `<span class="tag">${tag}</span>`).join(' ');
        postContent += `<p><strong>標籤：</strong> ${tags}</p>`;
    }

    // 動作按鈕區域：按讚、收藏、留言、開始聊天
    postContent += `
        <div class="action-buttons">
            <button class="like-btn" id="like-btn-${post.id}">
                <i class="fas fa-thumbs-up"></i> 喜歡 
                <span id="like-count-${post.id}">${post.likeCount}</span>
            </button>
            <button class="bookmark-btn" id="bookmark-btn-${post.id}"><i class="fas fa-bookmark"></i> 收藏</button>
            <button class="comment-toggle-btn" id="comment-toggle-btn-${post.id}"><i class="fas fa-comment"></i> 留言 (${post.comments ? post.comments.length : 0})</button>
            <button class="chat-btn" id="chat-btn-${post.id}"><i class="fas fa-comments"></i> 開始聊天</button>
        </div>
    `;

    // 留言區，初始狀態隱藏
    let commentsHTML = '';
    if (post.comments && post.comments.length > 0) {
        commentsHTML = post.comments.map(comment => `<p>${comment.content} - User ${comment.user_id}</p>`).join('');
    }

    postContent += `
        <div class="comment-section" id="comment-section-${post.id}" style="display: none;"> 
            <div>${commentsHTML}</div>
            <div class="comment-box">
                <textarea id="comment-input-${post.id}" placeholder="輸入評論..."></textarea>
                <button class="comment-btn" id="comment-btn-${post.id}">送出評論</button>
            </div>
        </div>
    `;

    postDiv.innerHTML = postContent;
    postsList.appendChild(postDiv);

    // 處理按讚邏輯
    if (likedPosts.includes(post.id)) {
        document.getElementById(`like-btn-${post.id}`).classList.add('liked');
    }

    // 處理收藏邏輯
    if (bookmarkedPosts.includes(post.id)) {
        document.getElementById(`bookmark-btn-${post.id}`).classList.add('bookmarked');
    }

    // 綁定按讚按鈕事件
    document.getElementById(`like-btn-${post.id}`).addEventListener('click', () => handleLike(post.id, userId));

    // 綁定收藏按鈕事件
    document.getElementById(`bookmark-btn-${post.id}`).addEventListener('click', () => handleBookmark(post.id, userId));

    // 綁定留言按鈕事件，控制留言區顯示或隱藏
    document.getElementById(`comment-toggle-btn-${post.id}`).addEventListener('click', () => {
        const commentSection = document.getElementById(`comment-section-${post.id}`);
        commentSection.style.display = commentSection.style.display === 'none' ? 'block' : 'none';
    });

    // 綁定送出評論按鈕事件
    document.getElementById(`comment-btn-${post.id}`).addEventListener('click', () => handleComment(post.id, userId));

    // 綁定開始聊天按鈕事件
    document.getElementById(`chat-btn-${post.id}`).addEventListener('click', (event) => {
        event.preventDefault();
        startChat(post.userId, userId);
    });
}






