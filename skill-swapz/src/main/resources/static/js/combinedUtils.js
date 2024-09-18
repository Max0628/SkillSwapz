//combinedUtils.js
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

export function connectWebSocket(userId, chatUuid, onMessageReceived) {
    const socket = new SockJS(`/ws?user_id=${encodeURIComponent(userId)}`);
    const stompClient = Stomp.over(socket);

    stompClient.connect({}, () => {
        console.log(`Connected to WebSocket with chat UUID: ${chatUuid}`);
        stompClient.subscribe(`/queue/private/${chatUuid}`, (message) => {
            onMessageReceived(JSON.parse(message.body));
        });
    }, (error) => {
        console.error('WebSocket connection error:', error);
    });

    return stompClient;
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

export function displayPost(post, userId, postsList, likedPosts, bookmarkedPosts) {
    const postDiv = document.createElement('div');
    postDiv.classList.add('post');

    let postContent = `
    <h3>${post.type}</h3>
    <p><strong>地點：</strong> ${post.location}</p>
    <p><strong>發文者 ID：</strong> ${post.userId}</p>
    <p><strong>內容：</strong> ${post.content}</p>
    <p><strong>讚數：</strong> <span id="like-count-${post.id}">${post.likeCount}</span></p>
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

    if (post.tag && post.tag.length > 0) {
        const tags = post.tag.map(tag => `<span class="tag">${tag}</span>`).join(' ');
        postContent += `<p><strong>標籤：</strong> ${tags}</p>`;
    }

    if (post.comments && post.comments.length > 0) {
        const comments = post.comments.map(comment => `<p>${comment.content} - User ${comment.user_id}</p>`).join('');
        postContent += `<div><strong>留言：</strong>${comments}</div>`;
    }

    // 新增開始聊天按鈕
    postContent += `
        <div class="action-buttons">
            <button class="like-btn" id="like-btn-${post.id}"><i class="fas fa-thumbs-up"></i> 喜歡</button>
            <button class="bookmark-btn" id="bookmark-btn-${post.id}"><i class="fas fa-bookmark"></i> 收藏</button>
            <button class="chat-btn" id="chat-btn-${post.id}"><i class="fas fa-comments"></i> 開始聊天</button>
        </div>
        <div class="comment-box">
            <textarea id="comment-input-${post.id}" placeholder="輸入評論..."></textarea>
            <button class="comment-btn" id="comment-btn-${post.id}">送出評論</button>
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

    // 綁定按鈕事件
    document.getElementById(`like-btn-${post.id}`).addEventListener('click', () => handleLike(post.id, userId));
    document.getElementById(`bookmark-btn-${post.id}`).addEventListener('click', () => handleBookmark(post.id, userId));
    document.getElementById(`comment-btn-${post.id}`).addEventListener('click', () => handleComment(post.id, userId));

    // 綁定開始聊天按鈕事件
    document.getElementById(`chat-btn-${post.id}`).addEventListener('click', () => startChat(post.userId, userId));
}


async function startChat(receiverId, senderId) {
    try {
        const response = await fetch('/api/1.0/chat/channel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id_1: senderId, user_id_2: receiverId }),
            credentials: 'include'
        });

        const data = await response.json();
        if (response.ok && data.chat_uuid) {
            // 成功創建/獲取聊天室，跳轉到聊天頁面
            window.location.href = `/chat.html?chatUuid=${data.chat_uuid}&receiverId=${receiverId}`;
        } else {
            console.error('Failed to create chat channel:', data.message);
        }
    } catch (error) {
        console.error('Error starting chat:', error);
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
        const likeCount = document.getElementById(`like-count-${postId}`);
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
            alert('評論已送出！');
            commentInput.value = '';
        } else {
            console.error('Error commenting on post');
        }
    } catch (error) {
        console.error('Error commenting:', error);
    }


}

