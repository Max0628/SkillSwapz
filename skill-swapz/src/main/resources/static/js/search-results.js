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

    try {
        const { likedPosts, bookmarkedPosts } = await fetchLikedAndBookmarkedPosts(userId);
        await fetchPosts(userId, likedPosts, bookmarkedPosts);
    } catch (error) {
        console.error('Error fetching liked or bookmarked posts:', error);
    }

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
