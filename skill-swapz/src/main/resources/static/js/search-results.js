// search-results.js
import { getUserId, fetchLikedAndBookmarkedPosts, displayPost } from './combinedUtils.js';

document.addEventListener('DOMContentLoaded', async () => {
    const userId = await getUserId();
    if (!userId) {
        window.location.href = "auth.html";
        console.log('User not logged in');
        return;
    }

    console.log('Login User Id:', userId);

    // 獲取按讚和收藏過的貼文，並渲染按鈕顏色
    try {
        const { likedPosts, bookmarkedPosts } = await fetchLikedAndBookmarkedPosts(userId);
        await fetchPosts(userId, likedPosts, bookmarkedPosts);  // 獲取並顯示貼文
    } catch (error) {
        console.error('Error fetching liked or bookmarked posts:', error);
    }

    // 獲取所有貼文數據並動態生成貼文列表
    async function fetchPosts(userId, likedPosts = [], bookmarkedPosts = []) {
        try {
            const response = await fetch('/api/1.0/post', { credentials: 'include' });
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
});
