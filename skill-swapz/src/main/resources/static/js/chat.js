// chat.js
import { getUserId, connectWebSocket, startChat } from './combinedUtils.js';

let stompClient = null;
let currentUserId = null;
let currentChatUuid = null;
let receiverId = null;

document.addEventListener('DOMContentLoaded', async () => {
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

    function addUserToList(userId, username) {
        const existingUser = userList.querySelector(`[data-user-id="${userId}"]`);
        if (existingUser) return;

        const userItem = document.createElement('li');
        userItem.classList.add('user-item');
        userItem.setAttribute('data-user-id', userId);
        userItem.innerHTML = `<div class="user-details"><span class="username">${username}</span></div>`;
        userItem.addEventListener('click', () => openChat(userId, null, username));
        userList.appendChild(userItem);
    }

    function subscribeToPrivateChat(chatUuid) {
        if (stompClient && stompClient.connected) {
            stompClient.subscribe(`/user/queue/private/${chatUuid}`, onMessageReceived);
            console.log(`Subscribed to private chat: ${chatUuid}`);
        } else {
            console.error('STOMP client is not connected');
        }
    }

    function subscribeToNotifications() {
        if (stompClient && stompClient.connected) {
            stompClient.subscribe('/user/queue/notifications', onNotificationReceived);
            console.log('Subscribed to notifications');
        } else {
            console.error('STOMP client is not connected');
        }
    }

    function onNotificationReceived(notification) {
        const data = JSON.parse(notification.body);
        if (data.type === 'newChat') {
            addUserToList(data.senderId, `User ${data.senderId}`);
            showNotification(`New chat request from User ${data.senderId}`);
            // 自動打開新的聊天窗口
            openChat(data.senderId, data.chatUuid, `User ${data.senderId}`);
        }
    }

    async function loadChatHistory(chatUuid) {
        try {
            const response = await fetch(`/api/1.0/chat/messages?chat_uuid=${chatUuid}`, {
                credentials: 'include'
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const messages = await response.json();
            if (!Array.isArray(messages)) {
                throw new Error('Received data is not an array');
            }
            chatContent.innerHTML = '';
            messages.forEach(message => {
                const messageElement = createMessageElement(message.content, message.sender_id.toString() === currentUserId ? 'sent' : 'received');
                chatContent.appendChild(messageElement);
            });
            chatContent.scrollTop = chatContent.scrollHeight;
        } catch (error) {
            console.error('Error loading chat history:', error);
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
        receiverId = userId;
        if (!chatUuid) {
            try {
                chatUuid = await startChat(userId, currentUserId);
                if (stompClient && stompClient.connected) {
                    stompClient.send("/app/startChat", {}, JSON.stringify({
                        sender_id: currentUserId,
                        receiver_id: userId,
                        chatUuid: chatUuid
                    }));
                }
            } catch (error) {
                console.error('Error starting new chat:', error);
                return;
            }
        }
        currentChatUuid = chatUuid;
        history.pushState(null, '', `/chat.html?chatUuid=${chatUuid}&receiverId=${userId}&username=${encodeURIComponent(username)}`);
        document.querySelector('.chat-username').textContent = username;
        addUserToList(userId, username);
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

    function sendMessage() {
        const messageText = messageInput.value.trim();
        if (!messageText) {
            alert('請輸入訊息');
            return;
        }

        const chatMessage = {
            sender_id: currentUserId,
            receiver_id: receiverId,
            content: messageText,
            chatUuid: currentChatUuid
        };

        if (stompClient && stompClient.connected) {
            stompClient.send("/app/sendMessage", {}, JSON.stringify(chatMessage));
            const messageElement = createMessageElement(messageText, 'sent');
            chatContent.appendChild(messageElement);
            messageInput.value = '';
            chatContent.scrollTop = chatContent.scrollHeight;
        } else {
            console.error('WebSocket is not connected.');
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
});

// 用於開始新聊天的函數
export async function startNewChat(receiverId) {
    try {
        const chatUuid = await startChat(receiverId, currentUserId);
        if (stompClient && stompClient.connected) {
            stompClient.send("/app/startChat", {}, JSON.stringify({
                sender_id: currentUserId,
                receiver_id: receiverId,
                chatUuid: chatUuid
            }));
        }
        openChat(receiverId, chatUuid, `User ${receiverId}`);
    } catch (error) {
        console.error('Error starting new chat:', error);
    }
}