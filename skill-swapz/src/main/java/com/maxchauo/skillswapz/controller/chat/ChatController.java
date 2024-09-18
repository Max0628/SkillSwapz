package com.maxchauo.skillswapz.controller.chat;

import com.maxchauo.skillswapz.service.chat.ChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/1.0/chat")
public class ChatController {
    private final ChatService chatService;

    @Autowired
    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping("/channel")
    public ResponseEntity<Map<String, Object>> createOrGetChannel(@RequestBody Map<String, Integer> request) {
        Integer userId1 = request.get("user_id_1");
        Integer userId2 = request.get("user_id_2");

        String chatUuid = chatService.createOrGetChatChannel(userId1, userId2);
        Map<String, Object> response = new HashMap<>();
        response.put("chat_uuid", chatUuid);

        return ResponseEntity.ok(response);
    }


    @PostMapping("/sendMessage")
    public ResponseEntity<Map<String, Object>> sendMessage(@RequestBody Map<String, Object> request) {
        String chatUuid = (String) request.get("chat_uuid");
        Integer senderId = (Integer) request.get("sender_id");
        Integer receiverId = (Integer) request.get("receiver_id");
        String content = (String) request.get("content");

        Integer messageId = chatService.sendMessage(chatUuid, senderId, receiverId, content);
        Map<String, Object> response = new HashMap<>();
        response.put("message_id", messageId);
        response.put("status", "Message sent");

        return ResponseEntity.ok(response);
    }


    @GetMapping("/messages")
    public ResponseEntity<List<Map<String, Object>>> getMessages(@RequestParam String chat_uuid) {
        List<Map<String, Object>> messages = chatService.getMessages(chat_uuid);
        return ResponseEntity.ok(messages);
    }
}
