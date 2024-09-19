package com.maxchauo.skillswapz.controller.chat;

import com.maxchauo.skillswapz.data.dto.chat.ChatMessage;
import com.maxchauo.skillswapz.service.chat.ChatService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

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
        Integer userId1 = request.get("user_id_1");
        Integer userId2 = request.get("user_id_2");

        String chatUuid = chatService.createOrGetChatChannel(userId1, userId2); // 創建user1 user2 共同為一聊天室uuid,
        Map<String, Object> response = new HashMap<>(); //把uuid放到response物件中
        response.put("chat_uuid", chatUuid);

        // 推送事件給 B，讓 B 知道有新的聊天
        Map<String, Object> notification = new HashMap<>();
        notification.put("chatUuid", chatUuid);  //把uuid 還有信息發送者的資訊放入 notification 物件
        notification.put("sender", userId1);
        messagingTemplate.convertAndSendToUser(
                userId2.toString(), "/queue/subscribe", notification);//把創建好的房間uuid資訊跟發送者id送到對方的頻道
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
        System.out.println(messageId);
        System.out.println(response);
        return ResponseEntity.ok(response);
    }


    @GetMapping("/messages")
    public ResponseEntity<List<Map<String, Object>>> getMessages(@RequestParam String chat_uuid) {
        List<Map<String, Object>> messages = chatService.getMessages(chat_uuid);
        return ResponseEntity.ok(messages);
    }

    @MessageMapping("/startChat")
    public void startChat(@Payload ChatMessage chatMessage) {
        // 發送通知給接收者
        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "newChat");
        notification.put("senderId", chatMessage.getSender_id());
        notification.put("chatUuid", chatMessage.getChatUuid());

        messagingTemplate.convertAndSendToUser(
                chatMessage.getReceiver_id().toString(),
                "/queue/notifications",
                notification
        );
    }
}
