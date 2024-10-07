// search-results.js
import { getUserId, fetchLikedAndBookmarkedPosts, displayPost, searchPostsByKeyword } from './combinedUtils.js';

document.addEventListener('DOMContentLoaded', async () => {
    const userId = await getUserId();
    if (!userId) {
        window.location.href = "auth.html";
        console.log('User not logged in');
        return;
    }

    console.log('Login User Id:', userId);

    try {
        const { likedPosts, bookmarkedPosts } = await fetchLikedAndBookmarkedPosts(userId);
        await fetchPosts(userId, likedPosts, bookmarkedPosts);
        setupTagSearchListener(userId, likedPosts, bookmarkedPosts);
    } catch (error) {
        console.error('Error fetching liked or bookmarked posts:', error);
    }

    async function fetchPosts(userId, likedPosts = [], bookmarkedPosts = [], keyword = '') {
        try {
            const posts = await searchPostsByKeyword(userId, keyword, likedPosts, bookmarkedPosts);
            const postsList = document.getElementById('posts-list');
            postsList.innerHTML = '';

            posts.forEach(post => {
                displayPost(post, userId, postsList, likedPosts, bookmarkedPosts);
            });
        } catch (error) {
            console.error('Error fetching posts:', error);
        }
    }

    // 設置熱門標籤的監聽事件
    function setupTagSearchListener(userId, likedPosts, bookmarkedPosts) {
        const popularTags = document.querySelectorAll('.popular-tags li');
        popularTags.forEach(tag => {
            tag.addEventListener('click', async (event) => {
                const keyword = event.target.innerText.replace('#', '').trim();
                await fetchPosts(userId, likedPosts, bookmarkedPosts, keyword);
            });
        });
    }
});
