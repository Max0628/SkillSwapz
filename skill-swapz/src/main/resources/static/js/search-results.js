//search-results.js
import { getUserId } from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
    const userId = await getUserId();
    if (userId) {
        console.log('Login User Id:', userId);
        await fetchLikedAndBookmarkedPosts(userId);  // 獲取並顯示貼文和按讚收藏狀態
    } else {
        console.log('User not logged in');
        return null;
    }

    // 獲取按讚和收藏過的貼文，並渲染按鈕顏色
    async function fetchLikedAndBookmarkedPosts(userId) {
        try {
            // 獲取使用者按讚和收藏過的貼文ID
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

            // 獲取並顯示貼文
            await fetchPosts(userId, likedPosts, bookmarkedPosts);
        } catch (error) {
            console.error('Error fetching liked or bookmarked posts:', error);
        }
    }

    // 獲取所有貼文數據並動態生成貼文列表
    async function fetchPosts(userId, likedPosts = [], bookmarkedPosts = []) {
        try {
            const response = await fetch('api/1.0/post', { credentials: 'include' });
            const posts = await response.json();
            const postsList = document.getElementById('posts-list');
            postsList.innerHTML = '';

            posts.forEach(post => {
                displayPost(post, userId, postsList, likedPosts, bookmarkedPosts);
            });
        } catch (error) {
            console.error('Error fetching posts:', error);
        }
    }

    // 動態顯示貼文，並根據是否按讚/收藏過來設置按鈕樣式
    function displayPost(post, userId, postsList, likedPosts, bookmarkedPosts) {
        const postDiv = document.createElement('div');
        postDiv.classList.add('post');

        // 通用欄位
        let postContent = `
        <h3>${post.type} - ${post.location}</h3>
        <p><strong>內容：</strong> ${post.content}</p>
        <p><strong>喜歡數：</strong> <span id="like-count-${post.id}">${post.likeCount}</span></p>
        <p><strong>發文者：</strong> User ${post.userId}</p>
        `;

        // 根據文章類型顯示不同欄位
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
        }

        // 渲染標籤（如果存在）
        if (post.tag && post.tag.length > 0) {
            const tags = post.tag.map(tag => {
                const tagElement = document.createElement('span');
                tagElement.classList.add('tag');
                tagElement.textContent = `#${tag}`;

                // 點擊標籤後跳轉到搜尋頁面，帶上查詢參數
                tagElement.addEventListener('click', () => {
                    window.location.href = `/search-results.html?keyword=${encodeURIComponent(tag)}`;
                });

                return tagElement.outerHTML;  // 使用 outerHTML 來組合 HTML 結構
            }).join(' ');
            postContent += `<p><strong>標籤：</strong> ${tags}</p>`;
        }

        // 渲染留言（如果存在）
        if (post.comments && post.comments.length > 0) {
            const comments = post.comments.map(comment => `<p>${comment.content} - User ${comment.user_id}</p>`).join('');
            postContent += `<div><strong>留言：</strong>${comments}</div>`;
        }

        // 添加收藏、按讚與評論按鈕
        postContent += `
            <div class="action-buttons">
                <button class="like-btn" id="like-btn-${post.id}"><i class="fas fa-thumbs-up"></i> 喜歡</button>
                <button class="bookmark-btn" id="bookmark-btn-${post.id}"><i class="fas fa-bookmark"></i> 收藏</button>
            </div>
            <div class="comment-box">
                <textarea id="comment-input-${post.id}" placeholder="輸入評論..."></textarea>
                <button class="comment-btn" id="comment-btn-${post.id}">送出評論</button>
            </div>
        `;

        postDiv.innerHTML = postContent;
        postsList.appendChild(postDiv);

        // 檢查該文章是否被按讚
        if (likedPosts.includes(post.id)) {
            document.getElementById(`like-btn-${post.id}`).classList.add('liked');
        }

        // 檢查該文章是否被收藏
        if (bookmarkedPosts.includes(post.id)) {
            document.getElementById(`bookmark-btn-${post.id}`).classList.add('bookmarked');
        }

        // 綁定按讚事件
        document.getElementById(`like-btn-${post.id}`).addEventListener('click', () => handleLike(post.id, userId));

        // 綁定收藏事件
        document.getElementById(`bookmark-btn-${post.id}`).addEventListener('click', () => handleBookmark(post.id, userId));

        // 綁定評論事件
        document.getElementById(`comment-btn-${post.id}`).addEventListener('click', () => handleComment(post.id, userId));
    }

    // 按讚功能
    async function handleLike(postId, userId) {
        try {
            const response = await fetch('/api/1.0/post/like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId, userId }),
                credentials: 'include'
            });

            const result = await response.json();  // 確保解析的是 JSON
            const likeButton = document.getElementById(`like-btn-${postId}`);
            const likeCount = document.getElementById(`like-count-${postId}`);
            let currentCount = parseInt(likeCount.textContent);

            if (result.message === "Like added successfully.") {
                likeButton.classList.add('liked'); // 修改按讚按鈕顏色
                likeCount.textContent = currentCount + 1;
            } else if (result.message === "Like removed successfully.") {
                likeButton.classList.remove('liked'); // 取消按讚時還原顏色
                likeCount.textContent = currentCount - 1;
            }

        } catch (error) {
            console.error('Error liking post:', error);
        }
    }

    // 收藏功能
    async function handleBookmark(postId, userId) {
        try {
            const response = await fetch('/api/1.0/post/bookMark', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId, userId }),
                credentials: 'include'
            });

            const bookmarkButton = document.getElementById(`bookmark-btn-${postId}`);
            bookmarkButton.classList.toggle('bookmarked'); // 切換收藏按鈕顏色
        } catch (error) {
            console.error('Error bookmarking post:', error);
        }
    }

    // 新增評論功能
    async function handleComment(postId, userId) {
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
                body: JSON.stringify({ post_id: postId, user_id: userId, content: commentContent }), // 使用 snake_case
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
});
