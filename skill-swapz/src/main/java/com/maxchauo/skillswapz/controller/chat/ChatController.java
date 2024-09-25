package com.maxchauo.skillswapz.controller.chat;

import com.maxchauo.skillswapz.data.dto.chat.ChatMessage;
import com.maxchauo.skillswapz.service.chat.ChatService;

import lombok.extern.log4j.Log4j2;

import org.springframework.beans.factory.annotation.Autowired;
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

@Log4j2
@RestController
@RequestMapping("/api/1.0/chat")
public class ChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    @Autowired
    public ChatController(ChatService chatService, SimpMessagingTemplate messagingTemplate) {
        this.chatService = chatService;
        this.messagingTemplate = messagingTemplate;
    }

    @PostMapping("/channel")
    public ResponseEntity<Map<String, Object>> createOrGetChannel(@RequestBody Map<String, Integer> request) {
        Integer userId1 = request.get("user_id_1");
        Integer userId2 = request.get("user_id_2");
        log.info("createOrGetChannel called with request: {}", request);
        String chatUuid = chatService.createOrGetChatChannel(userId1, userId2);
        Map<String, Object> response = new HashMap<>();
        response.put("chat_uuid", chatUuid);

        Map<String, Object> notification = new HashMap<>();
        notification.put("chatUuid", chatUuid);
        notification.put("sender", userId1);
        log.info("Sending notification to user {}: {}", userId2, notification);
        messagingTemplate.convertAndSendToUser(
                userId2.toString(), "/queue/subscribe", notification);
        log.info("createOrGetChannel completed. Response: {}", response);
        return ResponseEntity.ok(response);
    }


    @PostMapping("/sendMessage")
    public ResponseEntity<Map<String, Object>> sendMessage(@RequestBody Map<String, Object> request) {
        try {
            String chatUuid = (String) request.get("chatUuid");
            Integer senderId = Integer.valueOf(String.valueOf(request.get("sender_id")));
            Integer receiverId = Integer.valueOf(String.valueOf(request.get("receiver_id")));
            String content = (String) request.get("content");

            if (chatUuid == null || senderId == null || receiverId == null || content == null) {
                throw new IllegalArgumentException("Missing required fields");
            }

            Integer messageId = chatService.sendMessage(chatUuid, senderId, receiverId, content);
            Map<String, Object> response = new HashMap<>();
            response.put("message_id", messageId);
            response.put("status", "Message sent");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to send message: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        }
    }

    //@RequestMapping("/api/1.0/chat")
    @GetMapping("/messages")
    public ResponseEntity<List<Map<String, Object>>> getMessages(@RequestParam String chat_uuid) {
        List<Map<String, Object>> messages = chatService.getMessages(chat_uuid);
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
        notification.put("senderId", chatMessage.getSender_id());
        notification.put("chatUuid", chatMessage.getChatUuid());
        log.info("Sending newChat notification: {}", notification);

        messagingTemplate.convertAndSendToUser(
                chatMessage.getReceiver_id().toString(), "/queue/notifications", notification);
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
}
