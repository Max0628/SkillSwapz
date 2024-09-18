// // utils.js
//
// /**
//  * 獲取已登入用戶的 ID
//  * @returns {Promise<Number|null>} - 返回用戶的 user_id 或 null
//  */
// export async function getUserId() {
//     try {
//         const response = await fetch('api/1.0/auth/me', {
//             method: 'POST',
//             credentials: 'include',  // 確保發送 cookies 進行認證
//         });
//
//         const data = await response.json();
//
//         if (response.ok) {
//             return data.user_id;
//         } else {
//             console.error('Error fetching user ID:', data.message);
//             return null;
//         }
//     } catch (error) {
//         console.error('Error fetching user ID:', error);
//         return null;
//     }
// }
//
// /**
//  * 使用 UUID 連接 WebSocket
//  * @param {Number} userId - 當前登入用戶的 ID
//  * @param {String} chatUuid - 聊天頻道的 UUID
//  * @param {Function} onMessageReceived - 收到訊息的回調函數
//  */
// export function connectWebSocket(userId, chatUuid, onMessageReceived) {
//     const socket = new SockJS(`/ws?user_id=${encodeURIComponent(userId)}`);
//     const stompClient = Stomp.over(socket);
//
//     stompClient.connect({}, () => {
//         console.log(`Connected to WebSocket with chat UUID: ${chatUuid}`);
//         stompClient.subscribe(`/queue/private/${chatUuid}`, (message) => {
//             onMessageReceived(JSON.parse(message.body));
//         });
//     }, (error) => {
//         console.error('WebSocket connection error:', error);
//     });
//
//     return stompClient;
// }
