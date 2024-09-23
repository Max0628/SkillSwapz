//chat.js
import { getUserId, connectWebSocket, startChat } from './combinedUtils.js';
import { createNavbar, addNavbarStyles } from './navbar.js';
const localTime = new Date();
console.log(localTime);  // 會顯示當前本地時區的時間
const utcTime = new Date().toISOString();
console.log(utcTime);  // 會顯示UTC時間，比如：2024-09-23T08:12:32.122Z


let stompClient = null;
let currentUserId = null;
let currentChatUuid = null;
let receiverId = null;
let subscribedChats = new Set();
let userCache = new Map();
const DEFAULT_AVATAR_URL = "https://maxchauo-stylish-bucket.s3.ap-northeast-1.amazonaws.com/0_OtvYrwTXmO0Atzj5.webp";

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Page loaded at:', new Date().toISOString(), 'Local timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
    const navbarContainer = document.querySelector('.navbar');
    await navbarContainer.appendChild(await createNavbar());
    addNavbarStyles();

    currentUserId = await getUserId();
    if (!currentUserId) {
        console.log('User not logged in');
        return;
    }

    const chatContent = document.getElementById('chat-content');
    const sendButton = document.getElementById('send-button');
    const messageInput = document.getElementById('message-input');
    const userList = document.getElementById('user-list');

    try {
        stompClient = await connectWebSocket(currentUserId);
        subscribeToNotifications();
    } catch (error) {
        console.error('Failed to connect WebSocket:', error);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const chatUuidFromUrl = urlParams.get('chatUuid');
    const receiverIdFromUrl = urlParams.get('receiverId');
    const usernameFromUrl = urlParams.get('username') || `User ${receiverIdFromUrl}`;

    if (receiverIdFromUrl && chatUuidFromUrl) {
        await openChat(receiverIdFromUrl, chatUuidFromUrl, usernameFromUrl);
    }

    function addUserToList(userId, username, chatUuid, lastMessage, avatarUrl) {
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
        </div>
    `;
        userItem.addEventListener('click', () => openChat(userId, chatUuid, username));
        userList.appendChild(userItem);
    }

    await loadChatList();

    function subscribeToPrivateChat(chatUuid) {
        if (subscribedChats.has(chatUuid)) {
            console.log(`Already subscribed to private chat: ${chatUuid}`);
            return;
        }

        if (stompClient && stompClient.connected) {
            stompClient.subscribe(`/user/queue/private/${chatUuid}`, onMessageReceived);
            subscribedChats.add(chatUuid);
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

    async function onMessageReceived(message) {
        const parsedMessage = JSON.parse(message.body);
        if (parsedMessage.content && parsedMessage.sender_id.toString() !== currentUserId) {
            const messageElement = createMessageElement(parsedMessage.content, 'received', parsedMessage.created_at);
            chatContent.appendChild(messageElement);
            chatContent.scrollTop = chatContent.scrollHeight;

            const userInfo = await fetchUserDetails(parsedMessage.sender_id);
            updateLastMessage(parsedMessage.sender_id, parsedMessage.content, userInfo.username, userInfo.avatarUrl);
        }
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

    async function openChat(userId, chatUuid, username) {
        console.log('Opening chat:', { userId, chatUuid, username });
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
        currentChatUuid = chatUuid;
        history.pushState(null, '', `/chat.html?chatUuid=${chatUuid}&receiverId=${userId}&username=${encodeURIComponent(username)}`);
        document.querySelector('.chat-username').textContent = username;
        await loadChatHistory(chatUuid);
        subscribeToPrivateChat(chatUuid);

        const userItems = userList.querySelectorAll('.user-item');
        userItems.forEach(item => item.classList.remove('active'));
        const currentUserItem = userList.querySelector(`[data-user-id="${userId}"]`);
        if (currentUserItem) {
            currentUserItem.classList.add('active');
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
        const localTimestamp = new Date();  // 使用本地時間
        const chatMessage = {
            sender_id: parseInt(currentUserId, 10),
            receiver_id: parseInt(receiverId, 10),
            content: messageText,
            chatUuid: currentChatUuid,
            created_at: new Date().toISOString()  // 使用 UTC 時間並添加 'Z' 後綴
        };

        console.log('Chat message object:', chatMessage);

        // 在聊天界面上顯示新發送的消息（使用本地時間戳）
        // const messageElement = createMessageElement(messageText, 'sent', localTimestamp, true);
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

            // WebSocket 發送邏輯
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
        console.log('Creating message element with time:', createdAt, 'isLocal:', isLocal);
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
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone  // 使用用戶的本地時區
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
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const chatList = await response.json();
            await Promise.all(chatList.map(async (chat) => {
                const userInfo = await fetchUserDetails(chat.other_user_id);
                chat.username = userInfo.username;
                chat.avatarUrl = userInfo.avatarUrl;
            }));
            const filteredChatList = chatList.filter(chat => chat.other_user_id.toString() !== currentUserId.toString());
            displayChatList(filteredChatList);
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