import {displayPost, fetchLikedAndBookmarkedPosts, getUserId, handleBookmark} from './combinedUtils.js';
import {addNavbarStyles, createNavbar} from './navbar.js';

document.addEventListener('DOMContentLoaded', async () => {

    const navbar = createNavbar();
    document.body.insertBefore(navbar, document.body.firstChild);
    addNavbarStyles();

    const userId = await getUserId();
    if (userId) {
        console.log('Login User Id:', userId);
        await fetchAndDisplayBookmarkedPosts(userId);
    } else {
        console.log('User not logged in');
        return null;
    }

    async function fetchAndDisplayBookmarkedPosts(userId) {
        try {
            const {likedPosts, bookmarkedPosts} = await fetchLikedAndBookmarkedPosts(userId);
            const postsList = document.getElementById('bookmarks-list');
            postsList.innerHTML = '';

            for (const postId of bookmarkedPosts) {
                const response = await fetch(`/api/1.0/post/${postId}`, {credentials: 'include'});
                const post = await response.json();
                displayPost(post, userId, postsList, likedPosts, bookmarkedPosts);
            }

            const bookmarkButtons = document.querySelectorAll('.bookmark-btn');
            bookmarkButtons.forEach(button => {
                button.addEventListener('click', async (event) => {
                    const postId = event.target.id.split('-')[2];
                    await handleBookmark(postId, userId);
                    if (!event.target.classList.contains('bookmarked')) {
                        postsList.removeChild(event.target.closest('.post'));
                    }
                });
            });
        } catch (error) {
            console.error('Error fetching bookmarked posts:', error);
        }
    }
});