//chat.js
import {connectWebSocket, getUserId, markMessagesAsRead} from './combinedUtils.js';
import {addNavbarStyles, createNavbar} from './navbar.js';

const localTime = new Date();
const utcTime = new Date().toISOString();

let stompClient = null;
let currentUserId = null;
let currentChatUuid = null;
let receiverId = null;
let subscribedChats = new Set();
let userCache = new Map();
let userList = null;  // 將 userList 定義為全局變數
const DEFAULT_AVATAR_URL = "https://maxchauo-stylish-bucket.s3.ap-northeast-1.amazonaws.com/0_OtvYrwTXmO0Atzj5.webp";

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Page loaded at:', new Date().toISOString(), 'Local timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
    const navbarContainer = document.querySelector('.navbar');
    await navbarContainer.appendChild(await createNavbar());
    await addNavbarStyles();


    window.addEventListener('unreadCountUpdated', (event) => {
        const unreadCounts = event.detail;
        Object.entries(unreadCounts).forEach(([chatUuid, count]) => {
            updateUnreadCountUI(chatUuid, count);
        });
    });

    currentUserId = await getUserId();  // 確保獲取當前用戶 ID
    if (!currentUserId) {
        window.location.href = "auth.html";
        console.log('User not logged in');
        return;
    }

    userList = document.getElementById('user-list');  // 初始化全局變數 userList

    const chatContent = document.getElementById('chat-content');
    const sendButton = document.getElementById('send-button');
    const messageInput = document.getElementById('message-input');

    try {
        stompClient = await connectWebSocket(currentUserId);  // 先連接 WebSocket
        console.log('WebSocket connected successfully');  // 確認連接成功

        subscribeToNotifications();  // 連接成功後訂閱通知
        await loadChatList();  // 等 WebSocket 連接成功後再加載聊天列表

    } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        return;  // 如果 WebSocket 連接失敗，不繼續執行後續邏輯
    }

    const urlParams = new URLSearchParams(window.location.search);
    const chatUuidFromUrl = urlParams.get('chatUuid');
    const receiverIdFromUrl = urlParams.get('receiverId');
    let usernameFromUrl = urlParams.get('username') || `User ${receiverIdFromUrl}`;

    if (receiverIdFromUrl && chatUuidFromUrl) {
        // 檢查用戶名是否為 "User X" 格式
        if (usernameFromUrl && usernameFromUrl.startsWith('User ')) {
            // 如果是，獲取正確的用戶名
            const userInfo = await fetchUserDetails(receiverIdFromUrl);
            usernameFromUrl = userInfo.username;

            // 更新 URL 中的用戶名
            const newUrl = `/chat.html?chatUuid=${chatUuidFromUrl}&receiverId=${receiverIdFromUrl}&username=${encodeURIComponent(usernameFromUrl)}`;
            history.replaceState(null, '', newUrl);
        }

        // 打開聊天並顯示正確的用戶名
        await openChat(receiverIdFromUrl, chatUuidFromUrl, decodeURIComponent(usernameFromUrl));
    } else {
        // 如果 URL 中沒有指定聊天，加載第一個聊天（如果有的話）
        const firstChat = await loadFirstChat();
        if (firstChat) {
            await openChat(firstChat.other_user_id, firstChat.chat_uuid, firstChat.username);
        }
    }

    async function loadFirstChat() {
        try {
            const response = await fetch(`/api/1.0/chat/list?userId=${currentUserId}`, {
                method: 'GET',
                credentials: 'include',
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const chatList = await response.json();
            const filteredChatList = chatList.filter(chat => chat.other_user_id.toString() !== currentUserId.toString());
            if (filteredChatList.length > 0) {
                const firstChat = filteredChatList[0];
                const userInfo = await fetchUserDetails(firstChat.other_user_id);
                return {
                    other_user_id: firstChat.other_user_id,
                    chat_uuid: firstChat.chat_uuid,
                    username: userInfo.username
                };
            }
            return null;
        } catch (error) {
            console.error('Error loading first chat:', error);
            return null;
        }
    }

    function addUserToList(userId, username, chatUuid, lastMessage, avatarUrl, unreadCount = 0) {
        if (userId.toString() === currentUserId.toString()) {
            return;
        }
        const userItem = document.createElement('li');
        userItem.classList.add('user-item');
        userItem.setAttribute('data-user-id', userId);
        userItem.setAttribute('data-chat-uuid', chatUuid);
        userItem.innerHTML = `
    <img src="${avatarUrl || DEFAULT_AVATAR_URL}" alt="${username}" class="user-avatar">
    <div class="user-details">
        <span class="username">${username}</span>
        <span class="last-message">${lastMessage || ''}</span>
        ${unreadCount > 0 ? `<span class="unread-badge">${unreadCount}</span>` : ''}
    </div>
    `;
        userItem.addEventListener('click', () => openChat(userId, chatUuid, username));
        userList.appendChild(userItem);
    }


    // await loadChatList();

    function subscribeToPrivateChat(chatUuid) {
        if (subscribedChats.has(chatUuid)) {
            console.log(`Already subscribed to private chat: ${chatUuid}`);
            return;
        }

        if (stompClient && stompClient.connected) {
            // 訂閱該聊天頻道，並在接收到消息時執行處理
            stompClient.subscribe(`/user/queue/private/${chatUuid}`, message => onMessageReceived(message, chatUuid));
            subscribedChats.add(chatUuid);  // 添加到已訂閱的列表中
            console.log(`Subscribed to private chat: ${chatUuid}`);
        } else {
            console.error('STOMP client is not connected');
        }
    }


    function subscribeToNotifications() {
        console.log('Subscribing to notifications, STOMP client status:', stompClient.connected);
        if (stompClient && stompClient.connected) {
            stompClient.subscribe('/user/queue/notifications', onNotificationReceived);
            console.log('Subscribed to notifications');
        } else {
            console.error('STOMP client is not connected');
        }
    }

    async function onNotificationReceived(notification) {
        console.log('Received notification:', notification);
        const data = JSON.parse(notification.body);
        console.log('Parsed notification data:', data);
        if (data.type === 'newChat' && data.senderId.toString() !== currentUserId.toString()) {
            const userInfo = await fetchUserDetails(data.senderId);
            addUserToList(data.senderId, userInfo.username, data.chatUuid, '', userInfo.avatarUrl);
            showNotification(`New chat request from ${userInfo.username}`);
            await openChat(data.senderId, data.chatUuid, userInfo.username);
        }
    }

    async function loadChatHistory() {
        try {
            const response = await fetch(`/api/1.0/chat/messages?chat_uuid=${currentChatUuid}`, {
                method: 'GET',
                credentials: 'include'
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const messages = await response.json();
            chatContent.innerHTML = '';

            messages.forEach(message => {
                const type = message.sender_id.toString() === currentUserId ? 'sent' : 'received';
                const messageElement = createMessageElement(message.content, type, message.created_at);
                chatContent.appendChild(messageElement);
            });
            chatContent.scrollTop = chatContent.scrollHeight;
        } catch (error) {
            console.error('Error loading chat history:', error);
            alert('無法加載聊天記錄，請刷新頁面重試。');
        }
    }

    async function onMessageReceived(message, chatUuid) {
        const parsedMessage = JSON.parse(message.body);
        if (parsedMessage.content && parsedMessage.sender_id.toString() !== currentUserId) {
            console.log("Received message for chat:", chatUuid);

            if (chatUuid === currentChatUuid) {
                // 消息屬於當前聊天室，直接顯示
                console.log("Displaying message in current chat");
                const adjustedTime = adjustReceivedTime(parsedMessage.created_at);
                const messageElement = createMessageElement(parsedMessage.content, 'received', adjustedTime);
                chatContent.appendChild(messageElement);
                chatContent.scrollTop = chatContent.scrollHeight;

                // 標記消息為已讀
                await markMessagesAsRead(chatUuid, currentUserId);
                updateUnreadCountUI(chatUuid, 0);
            } else {
                // 消息不屬於當前聊天室，更新未讀計數
                console.log("Updating unread count for chat:", chatUuid);
                // 從後端獲取最新的未讀消息數量
                const response = await fetch(`/api/1.0/chat/unreadCounts?userId=${currentUserId}`, {
                    method: 'GET',
                    credentials: 'include'
                });
                const unreadCounts = await response.json();
                const unreadCount = unreadCounts[chatUuid] || 0;
                updateUnreadCountUI(chatUuid, unreadCount);
            }

            const userInfo = await fetchUserDetails(parsedMessage.sender_id);
            updateLastMessage(parsedMessage.sender_id, parsedMessage.content, userInfo.username, userInfo.avatarUrl);
        }
    }



    function adjustReceivedTime(timeString) {
        const date = new Date(timeString);
        date.setHours(date.getHours() + 8);
        return date;
    }

    function updateLastMessage(userId, lastMessage, username, avatarUrl) {
        if (userId.toString() === currentUserId.toString()) {
            return;
        }
        const userItem = userList.querySelector(`[data-user-id="${userId}"]`);
        if (userItem) {
            userItem.querySelector('.last-message').textContent = lastMessage;
            userItem.querySelector('.user-avatar').src = avatarUrl || DEFAULT_AVATAR_URL;
        } else {
            addUserToList(userId, username, '', lastMessage, avatarUrl);
        }
    }


    function clearCurrentChat() {
        // 清理当前聊天的逻辑，例如清空聊天内容等
        chatContent.innerHTML = '';
        // 可能还需要取消之前的WebSocket订阅
    }


    async function openChat(userId, chatUuid, username) {
        console.log('Opening chat:', { userId, chatUuid, username });

        // 如果已經打開該聊天，直接返回，避免重複打開
        if (currentChatUuid === chatUuid) {
            console.log(`Already opened chat: ${chatUuid}`);
            return;
        }

        if (currentChatUuid) {
            // 如果之前有打開的聊天，先清理
            clearCurrentChat();
        }

        receiverId = userId;
        if (!chatUuid) {
            try {
                const response = await fetch('/api/1.0/chat/channel', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ user_id_1: currentUserId, user_id_2: userId }),
                    credentials: 'include'
                });
                const data = await response.json();
                chatUuid = data.chat_uuid;
            } catch (error) {
                console.error('Error starting new chat:', error);
                return;
            }
        }

        // 設定當前聊天的 chatUuid，避免重複打開相同聊天
        currentChatUuid = chatUuid;

        history.pushState(null, '', `/chat.html?chatUuid=${chatUuid}&receiverId=${userId}&username=${encodeURIComponent(username)}`);
        document.querySelector('.chat-username').textContent = username;
        await loadChatHistory(chatUuid);

        // 確保只訂閱一次該聊天頻道
        subscribeToPrivateChat(chatUuid);

        selectUserInList(userId);

        // 標記消息為已讀
        await markMessagesAsRead(chatUuid, currentUserId);
        updateUnreadCountUI(chatUuid, 0);
    }

    function updateUnreadCountUI(chatUuid, unreadCount) {
        const chatItem = document.querySelector(`[data-chat-uuid="${chatUuid}"]`);
        if (chatItem) {
            let unreadBadge = chatItem.querySelector('.unread-badge');

            if (unreadCount > 0) {
                if (unreadBadge) {
                    unreadBadge.textContent = unreadCount;
                } else {
                    unreadBadge = document.createElement('span');
                    unreadBadge.className = 'unread-badge';
                    unreadBadge.textContent = unreadCount;
                    chatItem.querySelector('.user-details').appendChild(unreadBadge);
                }
            } else if (unreadBadge) {
                unreadBadge.remove();
            }
        }

        // 更新總的未讀消息計數
        const totalUnreadCount = Array.from(document.querySelectorAll('.unread-badge'))
            .reduce((total, badge) => total + parseInt(badge.textContent), 0);
        updateTotalUnreadCount(totalUnreadCount);
    }


    function updateTotalUnreadCount(count) {
        const totalUnreadBadge = document.getElementById('total-unread-badge');
        if (count > 0) {
            if (totalUnreadBadge) {
                totalUnreadBadge.textContent = count;
            } else {
                const badge = document.createElement('span');
                badge.id = 'total-unread-badge';
                badge.className = 'total-unread-badge';
                badge.textContent = count;
                document.querySelector('.navbar-right').appendChild(badge);
            }
        } else if (totalUnreadBadge) {
            totalUnreadBadge.remove();
        }
    }

    function selectUserInList(userId) {
        const userItems = userList.querySelectorAll('.user-item');
        userItems.forEach(item => item.classList.remove('active'));
        const currentUserItem = userList.querySelector(`[data-user-id="${userId}"]`);
        if (currentUserItem) {
            currentUserItem.classList.add('active');
            currentUserItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    });

    async function sendMessage() {
        const messageText = messageInput.value.trim();
        if (!messageText) {
            alert('請輸入訊息');
            return;
        }
        const localTimestamp = new Date();
        const chatMessage = {
            sender_id: parseInt(currentUserId, 10),
            receiver_id: parseInt(receiverId, 10),
            content: messageText,
            chatUuid: currentChatUuid,
            created_at: new Date().toISOString()
        };

        console.log('Chat message object:', chatMessage);

        const messageElement = createMessageElement(messageText, 'sent', chatMessage.created_at, false);  // isLocal 設為 false
        chatContent.appendChild(messageElement);
        messageInput.value = '';
        chatContent.scrollTop = chatContent.scrollHeight;

        try {
            const response = await fetch('/api/1.0/chat/sendMessage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(chatMessage),
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Message saved:', data);

            if (stompClient && stompClient.connected) {
                stompClient.send("/app/sendMessage", {}, JSON.stringify(chatMessage));
            } else {
                console.warn('WebSocket is not connected. Message sent via HTTP only.');
            }

        } catch (error) {
            console.error('Error sending/saving message:', error);
            alert('發送消息失敗，請稍後再試。錯誤詳情：' + error.message);
        }
    }

    function createMessageElement(text, messageType, createdAt, isLocal = false) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', messageType);
        messageElement.innerHTML = `
        <span class="message-text">${text}</span>
        <span class="message-time">${formatTime(createdAt)}</span>
    `;
        return messageElement;
    }

    function formatTime(timeString) {
        const date = new Date(timeString);
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
        return new Intl.DateTimeFormat('zh-TW', options).format(date);
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

    async function fetchUserDetails(userId) {
        if (userCache.has(userId)) {
            return userCache.get(userId);
        }
        try {
            const response = await fetch(`/api/1.0/user/profile?userId=${userId}`, {
                method: 'GET',
                credentials: 'include'
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const userInfo = await response.json();
            userInfo.avatarUrl = userInfo.avatarUrl || DEFAULT_AVATAR_URL;
            userCache.set(userId, userInfo);
            return userInfo;
        } catch (error) {
            console.error(`Error fetching user details for ID ${userId}:`, error);
            return { username: `User ${userId}`, avatarUrl: DEFAULT_AVATAR_URL };
        }
    }

    async function loadChatList() {
        try {
            const response = await fetch(`/api/1.0/chat/list?userId=${currentUserId}`, {
                method: 'GET',
                credentials: 'include',
            });
            const chatList = await response.json();

            await Promise.all(chatList.map(async (chat) => {
                const userInfo = await fetchUserDetails(chat.other_user_id);
                chat.username = userInfo.username;
                chat.avatarUrl = userInfo.avatarUrl;

                // 傳遞未讀消息數量
                addUserToList(
                    chat.other_user_id,
                    chat.username,
                    chat.chat_uuid,
                    chat.last_message,
                    chat.avatarUrl,
                    chat.unread_count  // 新增
                );

                // 訂閱每個聊天頻道
                subscribeToPrivateChat(chat.chat_uuid);
            }));

        } catch (error) {
            console.error('Error loading chat list:', error);
        }
    }


    function displayChatList(chatList) {
        userList.innerHTML = '';
        chatList.forEach(chat => {
            addUserToList(chat.other_user_id, chat.username, chat.chat_uuid, chat.last_message, chat.avatarUrl);
        });
    }
});