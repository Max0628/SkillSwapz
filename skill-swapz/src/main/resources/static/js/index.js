// index.js
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
            console.log('User not logged in');
            return;
        }

        console.log('Login User Id:', userId);

        const urlParams = new URLSearchParams(window.location.search);
        const searchKeyword = urlParams.get('search') || null;
        currentSearchKeyword = searchKeyword; // 新增這行
        const postTitle = document.querySelector('#posts h2');
        postTitle.textContent = searchKeyword ? decodeURIComponent(searchKeyword) : '所有文章';

        const postsList = document.getElementById('posts-list');
        const stompClient = await connectWebSocket(userId);



        await setupWebSocketSubscriptions(stompClient, userId);

        setupPostListeners(postsList, userId);
        await fetchPopularTags();


        // 設置滾動監聽器（只需要設置一次）
        setupScrollListener(userId);

        // 加載初始的貼文
        await fetchAndDisplayPosts(userId, currentSearchKeyword, currentPage);

        // const { likedPosts, bookmarkedPosts } = await fetchAndDisplayPosts(userId, searchKeyword);
        // setupScrollListener(userId, searchKeyword);
        setupSearchAndFilter(userId);


        window.addEventListener('tagSearch', (event) => {
            const searchKeyword = event.detail.keyword;
            updateURLAndFetchPosts(userId, searchKeyword);
        });

        window.addEventListener('message', (event) => {
            if (event.data && event.data.searchKeyword) {
                const searchKeyword = event.data.searchKeyword;
                (async () => {
                    const userId = await getUserId(); // 使用 await
                    updateURLAndFetchPosts(userId, searchKeyword);
                })().catch(error => console.error('Error handling message event:', error));
            }
        });


    } catch (error) {
        console.error('Error in main execution:', error);
        // alert('發生錯誤，請刷新頁面或稍後再試。');
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
                    // console.error('Error starting chat:', error);
                    // alert('無法啟動聊天，請稍後再試。');
                }
            }
        }
        // 新增編輯按鈕處理
        if (event.target.classList.contains('edit-btn')) {
            event.preventDefault();
            try {
                const postId = event.target.id.split('-')[2];
                const post = await fetchPostById(postId);
                if (post && post.userId === userId) {
                    // 顯示編輯表單
                    showEditForm(post);
                } else {
                    // alert('您無權編輯此文章');
                }
            } catch (error) {
                console.error('Error fetching post or showing edit form:', error);
                // alert('無法編輯此文章，請稍後再試。');
            }
        }
    });
}

async function setupWebSocketSubscriptions(stompClient, userId) {
    console.log("setupWebSocketSubscriptions is called with userId:", userId);
    await stompClient.subscribe('/user/queue/notifications', onNotificationReceived);

    subscribeToPostEvents(stompClient, (postEvent) => {
        console.log("Received postEvent: ", postEvent);

        if (!postEvent || !postEvent.content) {
            console.warn("Invalid postEvent or missing content");
            return;
        }

        const postsList = document.getElementById('posts-list');
        switch (postEvent.type) {
            case 'CREATE_POST': {
                const newPost = postEvent.content;
                console.log("EXECUTING CREATE_POST");
                console.log("New post:", newPost.postId);
                newPost.likeCount = 0;

                // 調整 WebSocket 接收到的時間
                const adjustedDate = new Date(newPost.createdAt);
                adjustedDate.setHours(adjustedDate.getHours() + 8);
                newPost.createdAt = adjustedDate.toISOString();

                displayPost(newPost, userId, postsList, [], [], true);
                break;
            }

            case 'DELETE_POST': {
                const postId = postEvent.content.postId;
                console.log("Deleting post with ID:", postId);
                removePostFromUI(postId);
                break;
            }

            case 'LIKE_POST':
            case 'UNLIKE_POST': {
                const likedPostId = postEvent.content.postId;
                const likeCount = postEvent.content.likeCount;
                console.log("UNLIKE A POST");
                updateLikeCount(likedPostId, likeCount);
                break;
            }

            case 'CREATE_COMMENT': {
                console.log("CREATING COMMENT in setupWebSocketSubscriptions", postEvent.content);
                const commentData = postEvent.content;
                const commentSection = document.getElementById(`comment-section-${commentData.post_id}`);
                if (commentSection) {
                    console.log("commentSection is true");
                    createCommentElement(commentData, userId)
                        .then(newComment => {
                            commentSection.appendChild(newComment);
                            updateCommentCount(commentData.post_id, true);
                        })
                        .catch(error => console.error('Error creating comment element:', error));
                } else {
                    console.warn(`Comment section not found for postId: ${commentData.post_id}`);
                }
                break;
            }

            case 'DELETE_COMMENT': {
                console.log("Handling DELETE_COMMENT in subscribeToPostEvents", postEvent.content, "currentUserId:", userId);
                const {commentId, postId} = postEvent.content;
                handleDeleteComment(commentId, undefined, postId);
                break;
            }

            case 'UPDATE_POST': {
                const updatedPost = postEvent.content;
                console.log("Updating post with ID:", updatedPost.postId);

                // 找到對應的 DOM 元素
                const postElement = document.getElementById(`post-${updatedPost.postId}`);
                if (postElement) {
                    // 更新地點
                    const locationElement = postElement.querySelector('.post-location');
                    if (locationElement) {
                        locationElement.textContent = updatedPost.location || '未提供';
                    }

                    // 更新擅長技能
                    const skillOfferedElement = postElement.querySelector('.post-skill-offered');
                    if (skillOfferedElement) {
                        skillOfferedElement.textContent = updatedPost.skillOffered || '';
                    }

                    // 更新想學技能
                    const skillWantedElement = postElement.querySelector('.post-skill-wanted');
                    if (skillWantedElement) {
                        skillWantedElement.textContent = updatedPost.skillWanted || '';
                    }

                    // 更新薪資
                    const salaryElement = postElement.querySelector('.post-salary');
                    if (salaryElement) {
                        salaryElement.textContent = updatedPost.salary || '';
                    }

                    // **更新內容/進行方式**
                    const contentElement = postElement.querySelector('.post-content');
                    if (contentElement) {
                        contentElement.textContent = updatedPost.content || '';
                    }

                    // **更新讀書會目的**
                    const bookClubPurposeElement = postElement.querySelector('.post-bookClubPurpose');
                    if (bookClubPurposeElement) {
                        bookClubPurposeElement.textContent = updatedPost.bookClubPurpose || '';
                    }

                    // **更新標籤（tags）**
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
                console.log('Received unknown post event type:', postEvent.type);
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
        console.log('Fetching posts from URL:', apiUrl);

        const [likedAndBookmarkedData, postResponse] = await Promise.all([
            fetchLikedAndBookmarkedPosts(userId),
            fetch(apiUrl, { credentials: 'include' })
        ]);

        console.log('Liked and Bookmarked data:', likedAndBookmarkedData);
        console.log('Post response status:', postResponse.status);
        console.log('Post response headers:', Object.fromEntries(postResponse.headers.entries()));

        if (!postResponse.ok) {
            console.error('Error response from server:', await postResponse.text());
            throw new Error(`HTTP error! status: ${postResponse.status}`);
        }

        const posts = await postResponse.json();
        console.log('Fetched posts:', posts);

        const { likedPosts, bookmarkedPosts } = likedAndBookmarkedData;
        const postsList = document.getElementById('posts-list');

        if (page === 0) {
            postsList.innerHTML = '';
            console.log('Cleared existing posts');
        }

        if (posts.length === 0) {
            console.log('No posts received from server');
            postsList.innerHTML += '<p>No posts found</p>';
        } else {
            console.log('Rendering posts');
            await renderPosts(posts, userId, postsList, likedPosts, bookmarkedPosts);
        }

        console.log('Finished processing posts');
        return { likedPosts, bookmarkedPosts, hasMore: posts.length === size };
    } catch (error) {
        // console.error('Error in fetchAndDisplayPosts:', error);
        // alert('獲取貼文失敗，請稍後再試。');
        // return { likedPosts: [], bookmarkedPosts: [], hasMore: false };
    }
}

function setupSearchAndFilter(userId) {
    const searchInput = document.querySelector('.search-input');

    // 偵測使用者按下 Enter 鍵來觸發搜尋
    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // 防止預設的 Enter 行為 (例如表單提交)
            const searchKeyword = event.target.value.trim();
            updateURLAndFetchPosts(userId, searchKeyword);
        }
    });

    // 讓熱門標籤點擊時也能觸發搜尋
    document.querySelectorAll('.popular-tags li').forEach(tag => {
        tag.addEventListener('click', (event) => {
            const searchKeyword = event.target.innerText.replace('#', '').trim();
            updateURLAndFetchPosts(userId, searchKeyword);
        });
    });
}


async function updateURLAndFetchPosts(userId, searchKeyword = null) {
    currentSearchKeyword = searchKeyword;  // 更新全域的搜尋關鍵字
    currentPage = 0;  // 重置頁碼
    hasMorePosts = true;  // 重置是否有更多貼文的標誌
    isLoading = false;  // 確保加載狀態正確
    let newUrl = '/index.html';
    if (searchKeyword) {
        newUrl += `?search=${encodeURIComponent(searchKeyword)}`;
    }
    window.history.pushState({}, '', newUrl);

    const postTitle = document.querySelector('#posts h2');
    postTitle.textContent = searchKeyword ? decodeURIComponent(searchKeyword) : '所有文章';

    const postsList = document.getElementById('posts-list');
    postsList.innerHTML = ''; // 清空現有的帖子

    // 加載第一頁的搜尋結果
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
        console.log(`Post with ID ${postId} successfully removed from UI`);
    } else {
        console.warn(`Post element with ID ${postId} not found in the DOM`);
    }
}


function setupScrollListener(userId) {
    window.addEventListener('scroll', async () => {
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;

        // 如果滾動接近底部且不是正在加載，則加載下一頁資料
        if (scrollTop + clientHeight >= scrollHeight - 50 && !isLoading && hasMorePosts) {
            isLoading = true;
            currentPage++;

            const { hasMore } = await fetchAndDisplayPosts(userId, currentSearchKeyword, currentPage);
            hasMorePosts = hasMore;  // 如果返回的資料小於 size，表示沒有更多資料了
            isLoading = false;
        }
    });
}



export async function fetchPopularTags() {
    try {
        const response = await fetch('/api/1.0/post/tags/popular');
        const popularTags = await response.json();
        const popularTagsList = document.querySelector('.popular-tags');
        popularTagsList.innerHTML = ''; // 清空現有的標籤

        popularTags.forEach(tagObj => {
            const li = document.createElement('li');
            li.textContent = `#${tagObj.tag}`;  // 加上 # 符號
            popularTagsList.appendChild(li);
        });

        // 添加點擊事件監聽器
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
