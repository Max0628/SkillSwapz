import { getUserId, fetchLikedAndBookmarkedPosts, displayPost } from './combinedUtils.js';

document.addEventListener('DOMContentLoaded', async () => {
    const userId = await getUserId();
    if (!userId) {
        window.location.href = "landingPage.html";
        ('User not logged in');
        return;
    }

    ('Login User Id:', userId);

    try {
        const { likedPosts, bookmarkedPosts } = await fetchLikedAndBookmarkedPosts(userId);
        await fetchPosts(userId, likedPosts, bookmarkedPosts);
        setupTagSearchListener(userId, likedPosts, bookmarkedPosts);
    } catch (error) {
        console.error('Error fetching liked or bookmarked posts:', error);
    }

    async function fetchPosts(userId, likedPosts = [], bookmarkedPosts = [], keyword = '', page = 0, size = 10) {
        try {
            let apiUrl = `api/1.0/post?page=${page}&size=${size}`;
            if (keyword) {
                apiUrl += `&keyword=${encodeURIComponent(keyword)}`;
            }
            ('Fetching posts from URL:', apiUrl);

            const [likedAndBookmarkedData, postResponse] = await Promise.all([
                fetchLikedAndBookmarkedPosts(userId),
                fetch(apiUrl, { credentials: 'include' })
            ]);

            if (!postResponse.ok) {
                console.error('Error response from server:', await postResponse.text());
                throw new Error(`HTTP error! status: ${postResponse.status}`);
            }

            const posts = await postResponse.json();
            const postsList = document.getElementById('posts-list');
            postsList.innerHTML = '';

            if (posts.length === 0) {
                ('No posts received from server');
                postsList.innerHTML += '<p>No posts found</p>';
            } else {
                for (const post of posts) {
                    displayPost(post, userId, postsList, likedPosts, bookmarkedPosts);
                }
            }
        } catch (error) {
            console.error('Error fetching posts:', error);
        }
    }


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
