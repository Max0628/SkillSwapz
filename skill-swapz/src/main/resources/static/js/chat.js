//chat.js
import { getUserId, connectWebSocket } from './utils.js';

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
    const usernameFromUrl = urlParams.get('username');

    // 如果有來自 URL 的 receiverId，動態新增到左側列表
    if (receiverIdFromUrl && usernameFromUrl) {
        addUserToList(receiverIdFromUrl, usernameFromUrl);
        currentChatUuid = chatUuidFromUrl;
        receiverId = receiverIdFromUrl;

        // 加載聊天記錄
        loadChatHistory(currentChatUuid);
        // 初始化 WebSocket 連接
        stompClient = connectWebSocket(userId, currentChatUuid, onMessageReceived);
    }

    // 動態將用戶添加到左側列表
    function addUserToList(userId, username) {
        const userItem = document.createElement('li');
        userItem.classList.add('user-item');
        userItem.innerHTML = `<div class="user-details"><span class="username">${username}</span></div>`;
        userItem.addEventListener('click', () => switchChat(userId));
        userList.appendChild(userItem);
    }

    // 切換聊天
    async function switchChat(selectedReceiverId) {
        receiverId = selectedReceiverId;

        // Fetch Chat UUID from server
        const response = await fetch('/api/1.0/chat/channel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id_1: userId, user_id_2: receiverId }),
            credentials: 'include'
        });

        const data = await response.json();
        if (response.ok && data.chat_uuid) {
            currentChatUuid = data.chat_uuid;

            // 更新URL
            window.history.pushState({}, '', `?chatUuid=${currentChatUuid}&receiverId=${receiverId}&username=User${receiverId}`);

            // 連接WebSocket
            if (stompClient) stompClient.disconnect();  // 切換聊天室時斷開之前的連接
            stompClient = connectWebSocket(userId, currentChatUuid, onMessageReceived);

            // 加載歷史聊天記錄
            loadChatHistory(currentChatUuid);

            // 更新聊天室標題
            updateChatHeader(receiverId);
        } else {
            console.error('Error fetching chat UUID:', data.message);
        }
    }

    // 加載聊天記錄
    async function loadChatHistory(chatUuid) {
        const response = await fetch(`/api/1.0/messages?chat_uuid=${chatUuid}`);
        const messages = await response.json();
        chatContent.innerHTML = ''; // 清空現有聊天記錄
        messages.forEach(message => {
            const messageElement = createMessageElement(message.content, message.sender_id === userId ? 'sent' : 'received');
            chatContent.appendChild(messageElement);
        });
        chatContent.scrollTop = chatContent.scrollHeight;
    }

    function onMessageReceived(message) {
        const messageElement = createMessageElement(message.content, message.sender_id === userId ? 'sent' : 'received');
        chatContent.appendChild(messageElement);
        chatContent.scrollTop = chatContent.scrollHeight;
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

    function updateChatHeader(receiverId) {
        const receiver = users.find(user => user.id === receiverId);
        if (receiver) {
            document.querySelector('.chat-username').textContent = `User ${receiverId}`;
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
