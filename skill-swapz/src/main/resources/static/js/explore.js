import {
    getUserId,
    fetchLikedAndBookmarkedPosts,
    displayPost,
    connectWebSocket,
    subscribeToPostEvents,
    formatTimeAgo
} from './combinedUtils.js';
import { createNavbar, addNavbarStyles } from './navbar.js';

let currentSearchKeyword = null;
let currentPage = 0;
let isLoading = false;
let hasMorePosts = true;

document.addEventListener('DOMContentLoaded', async () => {
    const categoryContainer = document.getElementById('category-container');
    const searchInput = document.getElementById('search-input');

    const userId = await getUserId();
    if (!userId) {
        window.location.href = "landingPage.html";
        ('User not logged in');
        return;
    }

    const navbar = await createNavbar();
    document.body.insertBefore(navbar, document.body.firstChild);
    await addNavbarStyles();

        const stompClient = await connectWebSocket(userId);
    await setupWebSocketSubscriptions(stompClient, userId);

        setupSearchAndFilter(userId);

        await fetchCategories();

        await fetchAndDisplayPosts(userId, currentSearchKeyword, currentPage);

        setupScrollListener(userId);

        async function updateURLAndFetchPosts(userId, searchKeyword = null) {
        currentSearchKeyword = searchKeyword;
        currentPage = 0;
        hasMorePosts = true;
        isLoading = false;
        let newUrl = '/explore.html';
        if (searchKeyword) {
            newUrl += `?search=${encodeURIComponent(searchKeyword)}`;
        }
        window.history.pushState({}, '', newUrl);

        const postsList = document.getElementById('posts-list');
        postsList.innerHTML = '';
                await fetchAndDisplayPosts(userId, currentSearchKeyword, currentPage);
    }


    function setupSearchAndFilter(userId) {
                searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();                 const searchKeyword = event.target.value.trim();
                sendSearchKeywordToIndex(searchKeyword);
            }
        });

                categoryContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('tag')) {
                const tagKeyword = event.target.textContent.replace('#', '').trim();
                sendSearchKeywordToIndex(tagKeyword);
            }
        });
    }
    function sendSearchKeywordToIndex(searchKeyword) {
                window.location.href = `/index.html?search=${encodeURIComponent(searchKeyword)}`;
    }


    async function fetchCategories() {
        try {
            const response = await fetch('/api/1.0/post/category');
            const categories = await response.json();
            displayCategories(categories);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    }

    function displayCategories(categories) {
        categoryContainer.innerHTML = '';
        categories.forEach(category => {
            const categoryCard = document.createElement('div');
            categoryCard.classList.add('category-card');

            const categoryTitle = document.createElement('h3');
            categoryTitle.textContent = category.categoryName;
            categoryCard.appendChild(categoryTitle);

            const tagList = document.createElement('div');
            tagList.classList.add('tag-list');

            category.tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.classList.add('tag');
                tagElement.textContent = `#${tag.tagName}`;
                tagList.appendChild(tagElement);
            });

            categoryCard.appendChild(tagList);
            categoryContainer.appendChild(categoryCard);
        });
    }

    async function fetchAndDisplayPosts(userId, searchKeyword = null, page = 0, size = 10) {
        try {
            let apiUrl = `api/1.0/post?page=${page}&size=${size}`;
            if (searchKeyword) {
                apiUrl += `&keyword=${encodeURIComponent(searchKeyword)}`;
            }

            const [likedAndBookmarkedData, postResponse] = await Promise.all([
                fetchLikedAndBookmarkedPosts(userId),
                fetch(apiUrl, { credentials: 'include' })
            ]);

            if (!postResponse.ok) {
                console.error('Error response from server:', await postResponse.text());
                throw new Error(`HTTP error! status: ${postResponse.status}`);
            }

            const posts = await postResponse.json();

            const { likedPosts, bookmarkedPosts } = likedAndBookmarkedData;
            const postsList = document.getElementById('posts-list');

            if (page === 0) {
                postsList.innerHTML = '';
            }

            if (posts.length === 0) {
                postsList.innerHTML += '<p>No posts found</p>';
            } else {
                for (const post of posts) {
                    await displayPost(post, userId, postsList, likedPosts, bookmarkedPosts);
                }
            }

            hasMorePosts = posts.length === size;
        } catch (error) {
            console.error('Error in fetchAndDisplayPosts:', error);
        }
    }

    function setupScrollListener(userId) {
        window.addEventListener('scroll', async () => {
            const { scrollTop, scrollHeight, clientHeight } = document.documentElement;

            if (scrollTop + clientHeight >= scrollHeight - 50 && !isLoading && hasMorePosts) {
                isLoading = true;
                currentPage++;

                await fetchAndDisplayPosts(userId, currentSearchKeyword, currentPage);
                isLoading = false;
            }
        });
    }

    async function setupWebSocketSubscriptions(stompClient, userId) {
                subscribeToPostEvents(stompClient, (postEvent) => {
                    }, userId);
    }

});
