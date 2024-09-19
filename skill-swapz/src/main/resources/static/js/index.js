// index.js
import { getUserId, fetchLikedAndBookmarkedPosts, displayPost, startChat, connectWebSocket } from './combinedUtils.js';
import { createNavbar, addNavbarStyles } from './navbar.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 添加導航欄
    const navbar = createNavbar();
    document.body.insertBefore(navbar, document.body.firstChild);
    addNavbarStyles();

    const userId = await getUserId();
    if (userId) {
        console.log('Login User Id:', userId);
        await fetchAndDisplayPosts(userId);

        // 連接 WebSocket 並訂閱通知
        const stompClient = await connectWebSocket(userId);
        stompClient.subscribe('/user/queue/notifications', onNotificationReceived);
    } else {
        console.log('User not logged in');
        return null;
    }

    function onNotificationReceived(notification) {
        const data = JSON.parse(notification.body);
        if (data.type === 'newChat') {
            showNotification(`New chat request from User ${data.senderId}`);
            // 如果用戶當前在聊天頁面，可以直接添加新的聊天用戶到列表
            if (window.location.pathname.includes('/chat.html')) {
                const userList = document.getElementById('user-list');
                if (userList) {
                    const userItem = document.createElement('li');
                    userItem.classList.add('user-item');
                    userItem.setAttribute('data-user-id', data.senderId);
                    userItem.innerHTML = `<div class="user-details"><span class="username">User ${data.senderId}</span></div>`;
                    userItem.addEventListener('click', () => openChat(data.senderId, data.chatUuid, `User ${data.senderId}`));
                    userList.appendChild(userItem);
                }
            }
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

    async function fetchAndDisplayPosts(userId) {
        try {
            const { likedPosts, bookmarkedPosts } = await fetchLikedAndBookmarkedPosts(userId);
            const response = await fetch('api/1.0/post', { credentials: 'include' });
            const posts = await response.json();
            const postsList = document.getElementById('posts-list');
            postsList.innerHTML = '';
            posts.forEach(post => {
                displayPost(post, userId, postsList, likedPosts, bookmarkedPosts);
            });

            // 為所有聊天按鈕添加事件監聽器
            document.querySelectorAll('.chat-btn').forEach(button => {
                button.addEventListener('click', async (event) => {
                    event.preventDefault();
                    const postId = event.target.id.split('-')[2];
                    const post = posts.find(p => p.id.toString() === postId);
                    if (post) {
                        try {
                            const chatUuid = await startChat(post.userId, userId);
                            window.location.href = `/chat.html?chatUuid=${chatUuid}&receiverId=${post.userId}&username=User ${post.userId}`;
                        } catch (error) {
                            console.error('Error starting chat:', error);
                            alert('無法啟動聊天，請稍後再試。');
                        }
                    }
                });
            });
        } catch (error) {
            console.error('Error fetching posts:', error);
        }
    }
});