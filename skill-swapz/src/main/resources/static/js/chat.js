//chat.js
import { getUserId, connectWebSocket, startChat } from './combinedUtils.js';
import { createNavbar, addNavbarStyles } from './navbar.js';

let stompClient = null;
let currentUserId = null;
let currentChatUuid = null;
let receiverId = null;
let subscribedChats = new Set();  // 新增：用來追蹤已訂閱的聊天

document.addEventListener('DOMContentLoaded', async () => {

    const navbarContainer = document.querySelector('.navbar');
    navbarContainer.appendChild(createNavbar());
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

    // 初始化 WebSocket 連接
    try {
        stompClient = await connectWebSocket(currentUserId);
        subscribeToNotifications();
    } catch (error) {
        console.error('Failed to connect WebSocket:', error);
    }

    // 檢查 URL 中是否有 chatUuid、receiverId 和 username
    const urlParams = new URLSearchParams(window.location.search);
    const chatUuidFromUrl = urlParams.get('chatUuid');
    const receiverIdFromUrl = urlParams.get('receiverId');
    const usernameFromUrl = urlParams.get('username') || `User ${receiverIdFromUrl}`;

    if (receiverIdFromUrl && chatUuidFromUrl) {
        openChat(receiverIdFromUrl, chatUuidFromUrl, usernameFromUrl);
    }

    function addUserToList(userId, username, chatUuid, lastMessage) {
        const userItem = document.createElement('li');
        userItem.classList.add('user-item');
        userItem.setAttribute('data-user-id', userId);
        userItem.setAttribute('data-chat-uuid', chatUuid);
        userItem.innerHTML = `
        <div class="user-details">
            <span class="username">${username}</span>
            <span class="last-message">${lastMessage || ''}</span>
        </div>
    `;
        userItem.addEventListener('click', () => openChat(userId, chatUuid, username));
        userList.appendChild(userItem);
    }

    loadChatList();

    function subscribeToPrivateChat(chatUuid) {
        // 檢查是否已經訂閱該 chatUuid
        if (subscribedChats.has(chatUuid)) {
            console.log(`Already subscribed to private chat: ${chatUuid}`);
            return;
        }

        if (stompClient && stompClient.connected) {
            stompClient.subscribe(`/user/queue/private/${chatUuid}`, onMessageReceived);
            subscribedChats.add(chatUuid);  // 訂閱後將 chatUuid 加入集合
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

    function onNotificationReceived(notification) {
        console.log('Received notification:', notification);
        const data = JSON.parse(notification.body);
        console.log('Parsed notification data:', data);
        if (data.type === 'newChat') {
            addUserToList(data.senderId, `User ${data.senderId}`);
            showNotification(`New chat request from User ${data.senderId}`);
            // 自動打開新的聊天窗口
            openChat(data.senderId, data.chatUuid, `User ${data.senderId}`);
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
            chatContent.innerHTML = ''; // 清空現有的聊天內容

            messages.forEach(message => {
                const type = message.sender_id.toString() === currentUserId ? 'sent' : 'received';
                const messageElement = createMessageElement(message.content, type);
                chatContent.appendChild(messageElement);
            });

            chatContent.scrollTop = chatContent.scrollHeight;
        } catch (error) {
            console.error('Error loading chat history:', error);
            alert('無法加載聊天記錄，請刷新頁面重試。');
        }
    }


    function onMessageReceived(message) {
        const parsedMessage = JSON.parse(message.body);
        if (parsedMessage.content && parsedMessage.sender_id.toString() !== currentUserId) {
            const messageElement = createMessageElement(parsedMessage.content, 'received');
            chatContent.appendChild(messageElement);
            chatContent.scrollTop = chatContent.scrollHeight;

            // 如果是新的聊天，添加發送者到用戶列表
            addUserToList(parsedMessage.sender_id, `User ${parsedMessage.sender_id}`);
        }
    }

    function createMessageElement(text, messageType) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', messageType);
        messageElement.innerHTML = `
            <span class="message-text">${text}</span>
            <span class="message-time">${new Date().toLocaleString()}</span>
        `;
        return messageElement;
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
        loadChatHistory(chatUuid);
        subscribeToPrivateChat(chatUuid);

        // 激活當前聊天
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

        const chatMessage = {
            sender_id: parseInt(currentUserId, 10),
            receiver_id: parseInt(receiverId, 10),
            content: messageText,
            chatUuid: currentChatUuid
        };


        try {
            const response = await fetch('/api/1.0/chat/sendMessage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(chatMessage),
                credentials: 'include'
            });

            console.log('Response status:', response.status);
            console.log('Response statusText:', response.statusText);
            console.log("chatMessage.chatUuid",chatMessage.chatUuid)
            const responseText = await response.text();
            console.log('Response text:', responseText);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, message: ${responseText}`);
            }

            const data = JSON.parse(responseText);
            console.log('Message saved:', data);

            // 在聊天界面上顯示新發送的消息
            const messageElement = createMessageElement(messageText, 'sent');
            chatContent.appendChild(messageElement);
            messageInput.value = '';
            chatContent.scrollTop = chatContent.scrollHeight;

            // WebSocket 發送邏輯
            if (stompClient && stompClient.connected) {
                stompClient.send("/app/sendMessage", {}, JSON.stringify(chatMessage));
                console.log(JSON.stringify(chatMessage));
            } else {
                console.warn('WebSocket is not connected. Message sent via HTTP only.');
            }

        } catch (error) {
            console.error('Error sending/saving message:', error);
            alert('發送消息失敗，請稍後再試。錯誤詳情：' + error.message);
        }
    }


    function createMessageElement(text, type) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', type);
        messageElement.innerHTML = `
        <span class="message-text">${text}</span>
        <span class="message-time">${new Date().toLocaleTimeString()}</span>
    `;
        return messageElement;
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
            displayChatList(chatList);
        } catch (error) {
            console.error('Error loading chat list:', error);
        }
    }
    function displayChatList(chatList) {
        userList.innerHTML = ''; // 清空現有的用戶列表
        chatList.forEach(chat => {
            addUserToList(chat.other_user_id, `User ${chat.other_user_id}`, chat.chat_uuid, chat.last_message);
        });
    }

});
