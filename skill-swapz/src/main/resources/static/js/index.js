import {
    connectWebSocket,
    createCommentElement,
    displayPost,
    fetchLikedAndBookmarkedPosts,
    fetchPostById,
    getUserId,
    handleDeleteComment,
    startChat,
    subscribeToPostEvents,
    updateCommentCount,
    updateLikeCount,
    formatTimeAgo, showEditForm
} from './combinedUtils.js';
import {addNavbarStyles, createNavbar} from './navbar.js';
let currentSearchKeyword = null;
let currentPage = 0;
let isLoading = false;
let hasMorePosts = true;
let currentUserId = getUserId();

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const navbar = await createNavbar();
        await document.body.insertBefore(navbar, document.body.firstChild);
        await addNavbarStyles();

        const userId = await getUserId();
        if (!userId) {
            window.location.href = "landingPage.html";
            ('User not logged in');
            return;
        }

        ('Login User Id:', userId);

        const urlParams = new URLSearchParams(window.location.search);
        const searchKeyword = urlParams.get('search') || null;
        currentSearchKeyword = searchKeyword;
        const postTitle = document.querySelector('#posts h2');
        postTitle.textContent = searchKeyword ? decodeURIComponent(searchKeyword) : '所有文章';

        const postsList = document.getElementById('posts-list');
        const stompClient = await connectWebSocket(userId);



        await setupWebSocketSubscriptions(stompClient, userId);

        setupPostListeners(postsList, userId);
        await fetchPopularTags();


                setupScrollListener(userId);

                await fetchAndDisplayPosts(userId, currentSearchKeyword, currentPage);

                        setupSearchAndFilter(userId);


        window.addEventListener('tagSearch', (event) => {
            const searchKeyword = event.detail.keyword;
            updateURLAndFetchPosts(userId, searchKeyword);
        });

        window.addEventListener('message', (event) => {
            if (event.data && event.data.searchKeyword) {
                const searchKeyword = event.data.searchKeyword;
                (async () => {
                    const userId = await getUserId();                     updateURLAndFetchPosts(userId, searchKeyword);
                })().catch(error => console.error('Error handling message event:', error));
            }
        });


    } catch (error) {
        console.error('Error in main execution:', error);
        alert('發生錯誤，請刷新頁面或稍後再試。');
    }
});

function setupPostListeners(postsList, userId) {
    postsList.addEventListener('click', async (event) => {
        if (event.target.classList.contains('chat-btn')) {
            event.preventDefault();
            const postId = event.target.id.split('-')[2];
            const post = await fetchPostById(postId);
            if (post) {
                try {
                    const chatUuid = await startChat(post.userId, userId);
                    const redirectUrl = `/chat.html?chatUuid=${chatUuid}&receiverId=${post.userId}&username=User ${post.userId}`;
                    window.location.href = redirectUrl;
                } catch (error) {
                    return null;
                    console.error('Error starting chat:', error);
                    alert('無法啟動聊天，請稍後再試。');
                }
            }
        }
                if (event.target.classList.contains('edit-btn')) {
            event.preventDefault();
            try {
                const postId = event.target.id.split('-')[2];
                const post = await fetchPostById(postId);
                if (post && post.userId === userId) {
                                        showEditForm(post);
                } else {
                                    }
            } catch (error) {
                console.error('Error fetching post or showing edit form:', error);
                            }
        }
    });
}

async function setupWebSocketSubscriptions(stompClient, userId) {
    ("setupWebSocketSubscriptions is called with userId:", userId);
    await stompClient.subscribe('/user/queue/notifications', onNotificationReceived);

    subscribeToPostEvents(stompClient, (postEvent) => {
        ("Received postEvent: ", postEvent);

        if (!postEvent || !postEvent.content) {
            console.warn("Invalid postEvent or missing content");
            return;
        }

        const postsList = document.getElementById('posts-list');
        switch (postEvent.type) {
            case 'CREATE_POST': {
                const newPost = postEvent.content;
                ("EXECUTING CREATE_POST");
                ("New post:", newPost.postId);
                newPost.likeCount = 0;

                                const adjustedDate = new Date(newPost.createdAt);
                adjustedDate.setHours(adjustedDate.getHours() + 8);
                newPost.createdAt = adjustedDate.toISOString();

                displayPost(newPost, userId, postsList, [], [], true);
                break;
            }

            case 'DELETE_POST': {
                const postId = postEvent.content.postId;
                ("Deleting post with ID:", postId);
                removePostFromUI(postId);
                break;
            }

            case 'LIKE_POST':
            case 'UNLIKE_POST': {
                const likedPostId = postEvent.content.postId;
                const likeCount = postEvent.content.likeCount;
                ("UNLIKE A POST");
                updateLikeCount(likedPostId, likeCount);
                break;
            }

            case 'CREATE_COMMENT': {
                ("CREATING COMMENT in setupWebSocketSubscriptions", postEvent.content);
                const commentData = postEvent.content;
                const commentSection = document.getElementById(`comment-section-${commentData.postId}`);
                if (commentSection) {
                    ("commentSection is true");
                    createCommentElement(commentData, userId)
                        .then(newComment => {
                            commentSection.appendChild(newComment);
                            updateCommentCount(commentData.postId, true);
                        })
                        .catch(error => console.error('Error creating comment element:', error));
                } else {
                    console.warn(`Comment section not found for postId: ${commentData.postId}`);
                }
                break;
            }

            case 'DELETE_COMMENT': {
                ("Handling DELETE_COMMENT in subscribeToPostEvents", postEvent.content, "currentUserId:", userId);
                const {commentId, postId} = postEvent.content;
                handleDeleteComment(commentId, undefined, postId);
                break;
            }

            case 'UPDATE_POST': {
                const updatedPost = postEvent.content;
                ("Updating post with ID:", updatedPost.postId);

                                const postElement = document.getElementById(`post-${updatedPost.postId}`);
                if (postElement) {
                                        const locationElement = postElement.querySelector('.post-location');
                    if (locationElement) {
                        locationElement.textContent = updatedPost.location || '未提供';
                    }

                                        const skillOfferedElement = postElement.querySelector('.post-skill-offered');
                    if (skillOfferedElement) {
                        skillOfferedElement.textContent = updatedPost.skillOffered || '';
                    }

                                        const skillWantedElement = postElement.querySelector('.post-skill-wanted');
                    if (skillWantedElement) {
                        skillWantedElement.textContent = updatedPost.skillWanted || '';
                    }

                                        const salaryElement = postElement.querySelector('.post-salary');
                    if (salaryElement) {
                        salaryElement.textContent = updatedPost.salary || '';
                    }

                                        const contentElement = postElement.querySelector('.post-content');
                    if (contentElement) {
                        contentElement.textContent = updatedPost.content || '';
                    }

                                        const bookClubPurposeElement = postElement.querySelector('.post-bookClubPurpose');
                    if (bookClubPurposeElement) {
                        bookClubPurposeElement.textContent = updatedPost.bookClubPurpose || '';
                    }

                                        const tagsElement = postElement.querySelector('.post-tags');
                    if (tagsElement) {
                        const updatedTags = updatedPost.tag ? updatedPost.tag.map(tag => `<button class="tag-btn label-tag tags">#${tag}</button>`).join(' ') : '';
                        tagsElement.innerHTML = updatedTags;
                    }
                } else {
                    console.warn('Post element not found, cannot update DOM.');
                }
                break;
            }




            case 'ERROR': {
                console.error('Error event received:', postEvent.content);
                break;
            }

            default: {
                ('Received unknown post event type:', postEvent.type);
            }
        }
    }, userId);
}



function onNotificationReceived(notification) {
    const data = JSON.parse(notification.body);
    if (data.type === 'newChat') {
        showNotification(`New chat request from User ${data.senderId}`);
    }
}

function showNotification(message) {
    if (Notification.permission === "granted") {
        new Notification(message);
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                new Notification(message);
            }
        });
    }
}

async function renderPosts(posts, userId, postsList, likedPosts, bookmarkedPosts) {
    if (Array.isArray(posts)) {
        for (const post of posts) {
            await displayPost(post, userId, postsList, likedPosts, bookmarkedPosts);
        }
    } else {
        console.error("Posts is not an array:", posts);
    }
}


async function fetchAndDisplayPosts(userId, searchKeyword = null, page = 0, size = 10) {
    try {
        let apiUrl = `api/1.0/post?page=${page}&size=${size}`;
        if (searchKeyword) {
            apiUrl += `&keyword=${encodeURIComponent(searchKeyword)}`;
        }
        ('Fetching posts from URL:', apiUrl);

        const [likedAndBookmarkedData, postResponse] = await Promise.all([
            fetchLikedAndBookmarkedPosts(userId),
            fetch(apiUrl, { credentials: 'include' })
        ]);

        ('Liked and Bookmarked data:', likedAndBookmarkedData);
        ('Post response status:', postResponse.status);
        ('Post response headers:', Object.fromEntries(postResponse.headers.entries()));

        if (!postResponse.ok) {
            console.error('Error response from server:', await postResponse.text());
            throw new Error(`HTTP error! status: ${postResponse.status}`);
        }

        const posts = await postResponse.json();
        ('Fetched posts:', posts);

        const { likedPosts, bookmarkedPosts } = likedAndBookmarkedData;
        const postsList = document.getElementById('posts-list');

        if (page === 0) {
            postsList.innerHTML = '';
            ('Cleared existing posts');
        }

        if (posts.length === 0) {
            ('No posts received from server');
            postsList.innerHTML += '<p>No posts found</p>';
        } else {
            ('Rendering posts');
            await renderPosts(posts, userId, postsList, likedPosts, bookmarkedPosts);
        }

        ('Finished processing posts');
        return { likedPosts, bookmarkedPosts, hasMore: posts.length === size };
    } catch (error) {
        console.error('Error in fetchAndDisplayPosts:', error);
        return { likedPosts: [], bookmarkedPosts: [], hasMore: false };
    }
}

function setupSearchAndFilter(userId) {
    const searchInput = document.querySelector('.search-input');

        searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();             const searchKeyword = event.target.value.trim();
            updateURLAndFetchPosts(userId, searchKeyword);
        }
    });

        document.querySelectorAll('.popular-tags li').forEach(tag => {
        tag.addEventListener('click', (event) => {
            const searchKeyword = event.target.innerText.replace('#', '').trim();
            updateURLAndFetchPosts(userId, searchKeyword);
        });
    });
}


async function updateURLAndFetchPosts(userId, searchKeyword = null) {
    currentSearchKeyword = searchKeyword;      currentPage = 0;      hasMorePosts = true;      isLoading = false;      let newUrl = '/index.html';
    if (searchKeyword) {
        newUrl += `?search=${encodeURIComponent(searchKeyword)}`;
    }
    window.history.pushState({}, '', newUrl);

    const postTitle = document.querySelector('#posts h2');
    postTitle.textContent = searchKeyword ? decodeURIComponent(searchKeyword) : '所有文章';

    const postsList = document.getElementById('posts-list');
    postsList.innerHTML = '';
        await fetchAndDisplayPosts(userId, currentSearchKeyword, currentPage);
}


export function removePostFromUI(postId) {
    if (!postId) {
        console.error('Invalid postId provided to removePostFromUI');
        return;
    }

    const postElement = document.getElementById(`post-${postId}`);
    if (postElement) {
        postElement.remove();
        (`Post with ID ${postId} successfully removed from UI`);
    } else {
        console.warn(`Post element with ID ${postId} not found in the DOM`);
    }
}


function setupScrollListener(userId) {
    window.addEventListener('scroll', async () => {
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;

                if (scrollTop + clientHeight >= scrollHeight - 50 && !isLoading && hasMorePosts) {
            isLoading = true;
            currentPage++;

            const { hasMore } = await fetchAndDisplayPosts(userId, currentSearchKeyword, currentPage);
            hasMorePosts = hasMore;              isLoading = false;
        }
    });
}



export async function fetchPopularTags() {
    try {
        const response = await fetch('/api/1.0/post/tags/popular');
        const popularTags = await response.json();
        const popularTagsList = document.querySelector('.popular-tags');
        popularTagsList.innerHTML = '';
        popularTags.forEach(tagObj => {
            const li = document.createElement('li');
            li.textContent = `#${tagObj.tag}`;              popularTagsList.appendChild(li);
        });

                document.querySelectorAll('.popular-tags li').forEach(tag => {
            tag.addEventListener('click', (event) => {
                const searchKeyword = event.target.innerText.replace('#', '').trim();
                updateURLAndFetchPosts(currentUserId, searchKeyword);
            });
        });

    } catch (error) {
        console.error('Error fetching popular tags:', error);
    }
}
