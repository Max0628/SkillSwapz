import { getUserId, fetchLikedAndBookmarkedPosts, displayPost } from './combinedUtils.js';
import { createNavbar, addNavbarStyles } from './navbar.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 添加導航欄
    const navbar = createNavbar();
    document.body.insertBefore(navbar, document.body.firstChild);
    addNavbarStyles();

    const userId = await getUserId();
    if (userId) {
        console.log('Login User Id:', userId);
        await fetchAndDisplayUserPosts(userId);
    } else {
        console.log('User not logged in');
        return null;
    }

    async function fetchAndDisplayUserPosts(userId) {
        try {
            const { likedPosts, bookmarkedPosts } = await fetchLikedAndBookmarkedPosts(userId);
            const response = await fetch(`api/1.0/post/user/${userId}`, { credentials: 'include' });
            const posts = await response.json();
            const postsList = document.getElementById('posts-list');
            postsList.innerHTML = '';
            console.log(posts)
            console.log(postsList)
            posts.forEach(post => {
                displayPost(post, userId, postsList, likedPosts, bookmarkedPosts);
            });
        } catch (error) {
            console.error('Error fetching user posts:', error);
        }
    }
});