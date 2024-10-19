package com.maxchauo.skillswapz.controller.chat;

import com.maxchauo.skillswapz.data.dto.chat.ChatMessage;
import com.maxchauo.skillswapz.data.dto.chat.ReadMessage;
import com.maxchauo.skillswapz.service.chat.ChatService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.InvalidDataAccessApiUsageException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/1.0/chat")
public class ChatController {
    private static final Logger log = LoggerFactory.getLogger(ChatController.class);
    @Autowired
    private final ChatService chatService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;


    @Autowired
    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping("/channel")
    public ResponseEntity<Map<String, Object>> createOrGetChannel(@RequestBody Map<String, Integer> request) {
        Map<String, Object> response = new HashMap<>();
        try {
            Integer userId1 = request.get("userId1");
            Integer userId2 = request.get("userId2");

            if (userId1 == null || userId2 == null) {
                log.error("Invalid userId1 or userId2: {}", request);
                response.put("error", "Invalid userId1 or userId2 provided");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }

            log.info("createOrGetChannel called with request: {}", request);
            String chatUuid = chatService.createOrGetChatChannel(userId1, userId2);

            response.put("chatUuid", chatUuid);

            Map<String, Object> notification = new HashMap<>();
            notification.put("chatUuid", chatUuid);
            notification.put("sender", userId1);
            log.info("Sending notification to user {}: {}", userId2, notification);
            messagingTemplate.convertAndSendToUser(
                    userId2.toString(), "/queue/subscribe", notification);
            log.info("createOrGetChannel completed. Response: {}", response);

            return ResponseEntity.ok(response);
        } catch (InvalidDataAccessApiUsageException e) {
            log.error("Database error while creating or fetching chat channel", e);
            response.put("error", "Database error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        } catch (Exception e) {
            log.error("Unexpected error occurred", e);
            e.printStackTrace();
            response.put("error", "An unexpected error occurred: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }


    @PostMapping("/sendMessage")
    public ResponseEntity<Map<String, Object>> sendMessage(@RequestBody Map<String, Object> request) {
        try {
            String chatUuid = (String) request.get("chatUuid");
            Integer senderId = Integer.valueOf(String.valueOf(request.get("senderId")));
            Integer receiverId = Integer.valueOf(String.valueOf(request.get("receiverId")));
            String content = (String) request.get("content");

            if (chatUuid == null || senderId == null || receiverId == null || content == null) {
                throw new IllegalArgumentException("Missing required fields");
            }

            Integer messageId = chatService.sendMessage(chatUuid, senderId, receiverId, content);
            Map<String, Object> response = new HashMap<>();
            response.put("message_id", messageId);
            response.put("status", "Message sent");

            // 更新未讀消息計數
            int unreadCount = chatService.getUnreadMessageCountForUser(receiverId);
            messagingTemplate.convertAndSendToUser(
                    receiverId.toString(),
                    "/queue/unreadCount",
                    unreadCount
            );

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to send message: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        }
    }

    @GetMapping("/messages")
    public ResponseEntity<List<Map<String, Object>>> getMessages(@RequestParam String chatUuid) {
        List<Map<String, Object>> messages = chatService.getMessages(chatUuid);
        try{
            return ResponseEntity.ok(messages);
        }catch (Exception e){
            e.printStackTrace();
        }
        return null;
    }

    @MessageMapping("/startChat")
    public void startChat(@Payload ChatMessage chatMessage) {
        log.info("startChat called with message: {}", chatMessage);
        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "newChat");
        notification.put("senderId", chatMessage.getSenderId());
        notification.put("chatUuid", chatMessage.getChatUuid());
        log.info("Sending newChat notification: {}", notification);
        messagingTemplate.convertAndSendToUser(
                chatMessage.getReceiverId().toString(),
                "/queue/notifications",
                notification
        );
    }

    @GetMapping("/list")
    public ResponseEntity<?> getChatList(@RequestParam Integer userId, Principal principal) {
        try {
            if (principal != null && !userId.toString().equals(principal.getName())) {
                log.warn("Attempted to access chat list with mismatched user ID");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied");
            }

            log.info("Fetching chat list for user ID: {}", userId);
            List<Map<String, Object>> chatList = chatService.getChatListForUser(userId);
            return ResponseEntity.ok(chatList);
        } catch (Exception e) {
            log.error("Error fetching chat list: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("An error occurred while fetching the chat list");
        }
    }

    @MessageMapping("/markAsRead")
    public void markAsRead(@Payload ReadMessage readMessage) {
        chatService.markMessagesAsRead(readMessage.getChatUuid(), readMessage.getUserId());

        // 發送更新的未讀消息計數
        int unreadCount = chatService.getUnreadMessageCountForUser(readMessage.getUserId());
        messagingTemplate.convertAndSendToUser(
                readMessage.getUserId().toString(),
                "/queue/unreadCount",
                unreadCount
        );

        // 發送特定聊天的未讀消息計數
        int chatUnreadCount = chatService.getUnreadMessageCountForChat(readMessage.getChatUuid(), readMessage.getUserId());
        messagingTemplate.convertAndSendToUser(
                readMessage.getUserId().toString(),
                "/queue/chatUnreadCount",
                Map.of("chatUuid", readMessage.getChatUuid(), "unreadCount", chatUnreadCount)
        );
    }

    @GetMapping("/unreadCounts")
    public ResponseEntity<Map<String, Integer>> getUnreadCounts(@RequestParam int userId) {
        Map<String, Integer> unreadCounts = chatService.getUnreadMessageCountsForUser(userId);
        return ResponseEntity.ok(unreadCounts);
    }
}
