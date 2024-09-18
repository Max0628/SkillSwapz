// chat.js
import { getUserId, connectWebSocket } from './combinedUtils.js';

document.addEventListener('DOMContentLoaded', async () => {
    const userId = await getUserId();
    if (!userId) {
        console.log('User not logged in');
        return;
    }

    let stompClient = null;
    let currentChatUuid = null;
    let receiverId = null;
    const chatContent = document.getElementById('chat-content');
    const sendButton = document.getElementById('send-button');
    const messageInput = document.getElementById('message-input');
    const userList = document.getElementById('user-list');

    // 檢查 URL 中是否有 chatUuid、receiverId 和 username
    const urlParams = new URLSearchParams(window.location.search);
    const chatUuidFromUrl = urlParams.get('chatUuid');
    const receiverIdFromUrl = urlParams.get('receiverId');
    const usernameFromUrl = urlParams.get('username') || `User ${receiverIdFromUrl}`;

    if (receiverIdFromUrl && chatUuidFromUrl) {
        addUserToList(receiverIdFromUrl, usernameFromUrl);
        currentChatUuid = chatUuidFromUrl;
        receiverId = receiverIdFromUrl;

        // 初始化 WebSocket 連接
        try {
            stompClient = await connectWebSocket(userId);
            stompClient.connect({}, function(frame) {
                console.log('Connected: ' + frame);
                subscribeToPrivateChat(currentChatUuid);
                // 加載聊天記錄
                loadChatHistory(currentChatUuid);
            }, function(error) {
                console.error('STOMP protocol error: ' + error);
                // 添加重連邏輯
                setTimeout(() => connectWebSocket(userId), 5000);
            });
        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
        }
    }

    function addUserToList(userId, username) {
        const userItem = document.createElement('li');
        userItem.classList.add('user-item', 'active');
        userItem.setAttribute('data-user-id', userId);
        userItem.innerHTML = `<div class="user-details"><span class="username">${username}</span></div>`;
        userList.appendChild(userItem);

        // 更新聊天標題
        document.querySelector('.chat-username').textContent = username;
    }

    function subscribeToPrivateChat(chatUuid) {
        if (stompClient && stompClient.connected) {
            stompClient.subscribe(`/user/queue/private/${chatUuid}`, onMessageReceived);
            console.log(`Subscribed to private chat: ${chatUuid}`);
        } else {
            console.error('STOMP client is not connected');
        }
    }

    async function loadChatHistory(chatUuid) {
        try {
            const response = await fetch(`/api/1.0/chat/messages?chat_uuid=${chatUuid}`, {
                credentials: 'include'  // 添加這行來包含 cookies
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
                const messageElement = createMessageElement(message.content, message.sender_id.toString() === userId ? 'sent' : 'received');
                chatContent.appendChild(messageElement);
            });
            chatContent.scrollTop = chatContent.scrollHeight;
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    }

    function onMessageReceived(message) {
        const parsedMessage = JSON.parse(message.body);
        if (parsedMessage.content && parsedMessage.sender_id.toString() !== userId) {
            const messageElement = createMessageElement(parsedMessage.content, 'received');
            chatContent.appendChild(messageElement);
            chatContent.scrollTop = chatContent.scrollHeight;
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
            sender_id: userId,
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
});